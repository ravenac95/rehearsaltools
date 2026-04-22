use std::env;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct Config {
    pub watch_dir: PathBuf,
    pub poll_secs: u64,
    pub mock: bool,
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    pub token_cache: PathBuf,
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let watch_dir = PathBuf::from(
            env::var("UPLOAD_WATCH_DIR").map_err(|_| "UPLOAD_WATCH_DIR is required")?,
        );
        if !watch_dir.is_dir() {
            return Err(format!(
                "UPLOAD_WATCH_DIR={} is not a directory",
                watch_dir.display()
            )
            .into());
        }
        let poll_secs: u64 = match env::var("UPLOAD_POLL_SECS") {
            Ok(s) => s.parse().map_err(|e| format!("UPLOAD_POLL_SECS: {e}"))?,
            Err(_) => 60,
        };
        let mock = env::var("UPLOAD_MOCK").is_ok();
        let client_id = env::var("SOUNDCLOUD_CLIENT_ID").ok();
        let client_secret = env::var("SOUNDCLOUD_CLIENT_SECRET").ok();
        let token_cache = match env::var("SOUNDCLOUD_TOKEN_CACHE") {
            Ok(s) => PathBuf::from(s),
            Err(_) => default_token_cache(&watch_dir),
        };
        Ok(Self {
            watch_dir,
            poll_secs,
            mock,
            client_id,
            client_secret,
            token_cache,
        })
    }
}

fn default_token_cache(watch_dir: &Path) -> PathBuf {
    if let Some(parent) = watch_dir.parent() {
        if !parent.as_os_str().is_empty() && parent.is_dir() {
            return parent.join(".soundcloud_token.json");
        }
    }
    watch_dir.join(".soundcloud_token.json")
}
