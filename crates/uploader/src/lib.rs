pub mod config;
pub mod fs_atomic;
pub mod manifest;
pub mod multipart;
pub mod soundcloud;
pub mod uploader;
pub mod watcher;

use std::error::Error;

use crate::config::Config;
use crate::soundcloud::SoundCloudUploader;
use crate::uploader::{LogUploader, Uploader};
use crate::watcher::run_forever;

pub fn run() -> Result<(), Box<dyn Error>> {
    let cfg = Config::from_env()?;
    eprintln!(
        "[uploader] starting: watch={} poll={}s mock={}",
        cfg.watch_dir.display(),
        cfg.poll_secs,
        cfg.mock
    );

    if cfg.mock {
        let uploader = LogUploader::always_ok();
        run_forever(&cfg, &uploader as &dyn Uploader)
    } else {
        let uploader = SoundCloudUploader::new(
            cfg.client_id.clone().ok_or("SOUNDCLOUD_CLIENT_ID is required")?,
            cfg.client_secret.clone().ok_or("SOUNDCLOUD_CLIENT_SECRET is required")?,
            cfg.token_cache.clone(),
        );
        run_forever(&cfg, &uploader as &dyn Uploader)
    }
}
