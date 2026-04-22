use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::fs_atomic;
use crate::multipart::{self, Part, PartData};
use crate::uploader::{
    GroupRequest, UploadError, UploadRequest, UploadedGroup, UploadedTrack, Uploader,
};

const TOKEN_URL: &str = "https://secure.soundcloud.com/oauth/token";
const TRACKS_URL: &str = "https://api.soundcloud.com/tracks";
const PLAYLISTS_URL: &str = "https://api.soundcloud.com/playlists";
const EXPIRY_SKEW_SECS: u64 = 60;
const UPLOAD_TIMEOUT_SECS: u64 = 300;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TokenCache {
    access_token: String,
    expires_at_epoch_secs: u64,
}

pub struct SoundCloudUploader {
    client_id: String,
    client_secret: String,
    token_cache_path: PathBuf,
    token: Mutex<Option<TokenCache>>,
    agent: ureq::Agent,
}

impl SoundCloudUploader {
    pub fn new(client_id: String, client_secret: String, token_cache_path: PathBuf) -> Self {
        let agent = ureq::AgentBuilder::new()
            .timeout_connect(Duration::from_secs(30))
            .timeout(Duration::from_secs(UPLOAD_TIMEOUT_SECS))
            .build();
        let cached = load_cached_token(&token_cache_path);
        Self {
            client_id,
            client_secret,
            token_cache_path,
            token: Mutex::new(cached),
            agent,
        }
    }

    fn now() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    }

    fn current_token(&self) -> Result<String, UploadError> {
        {
            let guard = self.token.lock().unwrap();
            if let Some(t) = guard.as_ref() {
                if t.expires_at_epoch_secs > Self::now() + EXPIRY_SKEW_SECS {
                    return Ok(t.access_token.clone());
                }
            }
        }
        self.refresh_token()
    }

    fn refresh_token(&self) -> Result<String, UploadError> {
        let body = format!(
            "grant_type=client_credentials&client_id={}&client_secret={}",
            urlencode(&self.client_id),
            urlencode(&self.client_secret)
        );
        let resp = self
            .agent
            .post(TOKEN_URL)
            .set("Content-Type", "application/x-www-form-urlencoded")
            .set("Accept", "application/json; charset=utf-8")
            .send_string(&body);
        let json: serde_json::Value = match resp {
            Ok(r) => read_json(r)?,
            Err(e) => return Err(classify_error(e)),
        };
        let access_token = json
            .get("access_token")
            .and_then(|v| v.as_str())
            .ok_or_else(|| UploadError::Other("oauth response missing access_token".into()))?
            .to_string();
        let expires_in = json
            .get("expires_in")
            .and_then(|v| v.as_u64())
            .unwrap_or(3600);
        let cache = TokenCache {
            access_token: access_token.clone(),
            expires_at_epoch_secs: Self::now() + expires_in,
        };
        if let Err(e) = save_cached_token(&self.token_cache_path, &cache) {
            eprintln!(
                "[uploader] warn: could not write token cache to {}: {e}",
                self.token_cache_path.display()
            );
        }
        *self.token.lock().unwrap() = Some(cache);
        Ok(access_token)
    }

    fn force_refresh(&self) -> Result<String, UploadError> {
        *self.token.lock().unwrap() = None;
        self.refresh_token()
    }

    fn upload_once(
        &self,
        req: &UploadRequest<'_>,
        token: &str,
    ) -> Result<UploadedTrack, UploadError> {
        let boundary = multipart::generate_boundary();
        let sharing = if req.private { "private" } else { "public" };

        let mut parts: Vec<Part<'_>> = vec![
            Part {
                name: "track[title]",
                filename: None,
                content_type: None,
                data: PartData::Text(req.title),
            },
            Part {
                name: "track[sharing]",
                filename: None,
                content_type: None,
                data: PartData::Text(sharing),
            },
        ];
        if let Some(desc) = req.description {
            parts.push(Part {
                name: "track[description]",
                filename: None,
                content_type: None,
                data: PartData::Text(desc),
            });
        }
        let wav_filename = req
            .wav_path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("track.wav");
        parts.push(Part {
            name: "track[asset_data]",
            filename: Some(wav_filename),
            content_type: Some("audio/wav"),
            data: PartData::File(req.wav_path),
        });

        let body = multipart::build(&boundary, &parts)?;
        let ct = format!("multipart/form-data; boundary={boundary}");
        let auth = format!("OAuth {token}");
        let resp = self
            .agent
            .post(TRACKS_URL)
            .set("Authorization", &auth)
            .set("Content-Type", &ct)
            .set("Accept", "application/json; charset=utf-8")
            .send_bytes(&body);
        let json: serde_json::Value = match resp {
            Ok(r) => read_json(r)?,
            Err(e) => return Err(classify_error(e)),
        };
        let remote_id = json
            .get("id")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| UploadError::Other("track response missing id".into()))?;
        let url = json
            .get("permalink_url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        Ok(UploadedTrack { remote_id, url })
    }

    fn create_group_once(
        &self,
        req: &GroupRequest<'_>,
        token: &str,
    ) -> Result<UploadedGroup, UploadError> {
        let sharing = if req.private { "private" } else { "public" };
        let tracks: Vec<_> = req
            .track_ids
            .iter()
            .map(|id| serde_json::json!({ "id": id }))
            .collect();
        let payload = serde_json::json!({
            "playlist": {
                "title": req.title,
                "sharing": sharing,
                "tracks": tracks,
            }
        });
        let auth = format!("OAuth {token}");
        let resp = self
            .agent
            .post(PLAYLISTS_URL)
            .set("Authorization", &auth)
            .set("Content-Type", "application/json")
            .set("Accept", "application/json; charset=utf-8")
            .send_string(&payload.to_string());
        let json: serde_json::Value = match resp {
            Ok(r) => read_json(r)?,
            Err(e) => return Err(classify_error(e)),
        };
        let url = json
            .get("permalink_url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        Ok(UploadedGroup { url })
    }
}

impl Uploader for SoundCloudUploader {
    fn upload(&self, req: &UploadRequest<'_>) -> Result<UploadedTrack, UploadError> {
        let token = self.current_token()?;
        match self.upload_once(req, &token) {
            Err(UploadError::Auth(_)) => {
                let token = self.force_refresh()?;
                self.upload_once(req, &token)
            }
            other => other,
        }
    }

    fn create_group(&self, req: &GroupRequest<'_>) -> Result<UploadedGroup, UploadError> {
        let token = self.current_token()?;
        match self.create_group_once(req, &token) {
            Err(UploadError::Auth(_)) => {
                let token = self.force_refresh()?;
                self.create_group_once(req, &token)
            }
            other => other,
        }
    }
}

fn load_cached_token(path: &Path) -> Option<TokenCache> {
    let bytes = std::fs::read(path).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn save_cached_token(path: &Path, cache: &TokenCache) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).ok();
        }
    }
    let bytes = serde_json::to_vec(cache)?;
    fs_atomic::write_atomic(path, &bytes)?;
    Ok(())
}

fn classify_error(e: ureq::Error) -> UploadError {
    match e {
        ureq::Error::Status(code, resp) => {
            let body = response_body_string(resp);
            if code == 401 || code == 403 {
                UploadError::Auth(format!("{code}: {body}"))
            } else if (400..500).contains(&code) {
                UploadError::BadRequest(format!("{code}: {body}"))
            } else if (500..600).contains(&code) {
                UploadError::Server(format!("{code}: {body}"))
            } else {
                UploadError::Other(format!("{code}: {body}"))
            }
        }
        ureq::Error::Transport(t) => UploadError::Network(t.to_string()),
    }
}

fn read_json(resp: ureq::Response) -> Result<serde_json::Value, UploadError> {
    let mut body = String::new();
    resp.into_reader()
        .take(10 * 1024 * 1024)
        .read_to_string(&mut body)
        .map_err(UploadError::Io)?;
    serde_json::from_str(&body)
        .map_err(|e| UploadError::Other(format!("json parse: {e}; body: {body}")))
}

fn response_body_string(resp: ureq::Response) -> String {
    let mut body = String::new();
    let _ = resp
        .into_reader()
        .take(4096)
        .read_to_string(&mut body);
    body
}

fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}
