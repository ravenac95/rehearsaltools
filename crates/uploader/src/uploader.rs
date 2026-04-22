use std::fmt;
use std::path::Path;
use std::sync::Mutex;

#[derive(Debug)]
pub enum UploadError {
    Io(std::io::Error),
    BadRequest(String),
    Auth(String),
    Server(String),
    Network(String),
    Other(String),
}

impl fmt::Display for UploadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UploadError::Io(e) => write!(f, "io: {e}"),
            UploadError::BadRequest(s) => write!(f, "bad request: {s}"),
            UploadError::Auth(s) => write!(f, "auth: {s}"),
            UploadError::Server(s) => write!(f, "server: {s}"),
            UploadError::Network(s) => write!(f, "network: {s}"),
            UploadError::Other(s) => write!(f, "other: {s}"),
        }
    }
}

impl std::error::Error for UploadError {}

impl From<std::io::Error> for UploadError {
    fn from(e: std::io::Error) -> Self {
        UploadError::Io(e)
    }
}

impl UploadError {
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            UploadError::Server(_) | UploadError::Network(_) | UploadError::Io(_)
        )
    }
}

pub struct UploadRequest<'a> {
    pub title: &'a str,
    pub description: Option<&'a str>,
    pub wav_path: &'a Path,
    pub private: bool,
}

#[derive(Debug, Clone)]
pub struct UploadedTrack {
    pub remote_id: u64,
    pub url: String,
}

pub struct GroupRequest<'a> {
    pub title: &'a str,
    pub track_ids: &'a [u64],
    pub private: bool,
}

#[derive(Debug, Clone)]
pub struct UploadedGroup {
    pub url: String,
}

pub trait Uploader {
    fn upload(&self, req: &UploadRequest<'_>) -> Result<UploadedTrack, UploadError>;
    fn create_group(&self, req: &GroupRequest<'_>) -> Result<UploadedGroup, UploadError>;
}

/// In-memory uploader used for `UPLOAD_MOCK=1` smoke tests and unit tests.
/// Track IDs are assigned sequentially starting at 1.
pub struct LogUploader {
    #[allow(clippy::type_complexity)]
    policy: Box<dyn Fn(&UploadRequest<'_>) -> Result<(), UploadError> + Send + Sync>,
    #[allow(clippy::type_complexity)]
    group_policy:
        Box<dyn Fn(&GroupRequest<'_>) -> Result<(), UploadError> + Send + Sync>,
    state: Mutex<LogUploaderState>,
}

#[derive(Default)]
struct LogUploaderState {
    next_id: u64,
    pub uploads: Vec<(String, u64)>,
    pub groups: Vec<(String, Vec<u64>)>,
}

impl LogUploader {
    pub fn always_ok() -> Self {
        Self::new(|_| Ok(()), |_| Ok(()))
    }

    pub fn new(
        policy: impl Fn(&UploadRequest<'_>) -> Result<(), UploadError> + Send + Sync + 'static,
        group_policy: impl Fn(&GroupRequest<'_>) -> Result<(), UploadError> + Send + Sync + 'static,
    ) -> Self {
        Self {
            policy: Box::new(policy),
            group_policy: Box::new(group_policy),
            state: Mutex::new(LogUploaderState {
                next_id: 1,
                ..Default::default()
            }),
        }
    }

    pub fn uploads(&self) -> Vec<(String, u64)> {
        self.state.lock().unwrap().uploads.clone()
    }

    pub fn groups(&self) -> Vec<(String, Vec<u64>)> {
        self.state.lock().unwrap().groups.clone()
    }
}

impl Uploader for LogUploader {
    fn upload(&self, req: &UploadRequest<'_>) -> Result<UploadedTrack, UploadError> {
        (self.policy)(req)?;
        if !req.wav_path.exists() {
            return Err(UploadError::BadRequest(format!(
                "wav file missing: {}",
                req.wav_path.display()
            )));
        }
        let mut st = self.state.lock().unwrap();
        let id = st.next_id;
        st.next_id += 1;
        st.uploads.push((req.title.to_string(), id));
        eprintln!(
            "[mock] uploaded \"{}\" -> id={} private={}",
            req.title, id, req.private
        );
        Ok(UploadedTrack {
            remote_id: id,
            url: format!("https://mock.local/tracks/{id}"),
        })
    }

    fn create_group(&self, req: &GroupRequest<'_>) -> Result<UploadedGroup, UploadError> {
        (self.group_policy)(req)?;
        let mut st = self.state.lock().unwrap();
        st.groups.push((req.title.to_string(), req.track_ids.to_vec()));
        eprintln!(
            "[mock] created playlist \"{}\" with {} tracks (private={})",
            req.title,
            req.track_ids.len(),
            req.private
        );
        Ok(UploadedGroup {
            url: format!("https://mock.local/playlists/{}", req.title),
        })
    }
}
