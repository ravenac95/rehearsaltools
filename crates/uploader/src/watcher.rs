use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;

use crate::config::Config;
use crate::fs_atomic;
use crate::manifest::{is_manifest_filename, Manifest, Song, UploadedEntry};
use crate::uploader::{GroupRequest, UploadError, UploadRequest, Uploader};

const RETRY_BACKOFFS: &[Duration] = &[
    Duration::from_secs(1),
    Duration::from_secs(2),
    Duration::from_secs(4),
];

pub fn run_forever(cfg: &Config, uploader: &dyn Uploader) -> Result<(), Box<dyn std::error::Error>> {
    let poll = Duration::from_secs(cfg.poll_secs);
    loop {
        if let Err(e) = run_once(&cfg.watch_dir, uploader) {
            eprintln!("[uploader] pass failed: {e}");
        }
        thread::sleep(poll);
    }
}

pub fn run_once(watch_dir: &Path, uploader: &dyn Uploader) -> Result<(), Box<dyn std::error::Error>> {
    let manifests = list_manifests(watch_dir)?;
    for path in manifests {
        if let Err(e) = process_manifest(&path, uploader) {
            eprintln!(
                "[uploader] manifest {} error: {e}",
                path.display()
            );
        }
    }
    Ok(())
}

fn list_manifests(dir: &Path) -> std::io::Result<Vec<PathBuf>> {
    let mut out = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let name = match entry.file_name().into_string() {
            Ok(n) => n,
            Err(_) => continue,
        };
        if is_manifest_filename(&name) {
            out.push(entry.path());
        }
    }
    out.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
    Ok(out)
}

fn process_manifest(
    path: &Path,
    uploader: &dyn Uploader,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut manifest = match Manifest::load(path) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("[uploader] skipping unparseable manifest {}: {e}", path.display());
            return Ok(());
        }
    };
    let dir = path.parent().unwrap_or_else(|| Path::new("."));

    let pending: Vec<Song> = std::mem::take(&mut manifest.songs);
    let mut remaining: Vec<Song> = Vec::new();

    for song in pending {
        let wav = dir.join(&song.file);
        let req = UploadRequest {
            title: &song.title,
            description: song.description.as_deref(),
            wav_path: &wav,
            private: true,
        };
        match upload_with_retry(uploader, &req) {
            Ok(track) => {
                eprintln!(
                    "[uploader] uploaded \"{}\" -> {} (id={})",
                    song.title, track.url, track.remote_id
                );
                manifest.uploaded.push(UploadedEntry {
                    title: song.title.clone(),
                    remote_id: track.remote_id,
                    url: track.url,
                });
                // Persist progress BEFORE deleting the WAV so a crash after
                // this save/before the delete cannot cause a re-upload.
                manifest.songs = remaining.clone();
                manifest.save_atomic(path)?;
                if let Err(e) = fs_atomic::remove_if_exists(&wav) {
                    eprintln!(
                        "[uploader] warn: could not delete wav {}: {e}",
                        wav.display()
                    );
                }
            }
            Err(e) => {
                eprintln!(
                    "[uploader] failed \"{}\" ({e}); keeping for next pass",
                    song.title
                );
                remaining.push(song);
                manifest.songs = remaining.clone();
                manifest.save_atomic(path)?;
            }
        }
    }

    manifest.songs = remaining;
    manifest.save_atomic(path)?;

    if manifest.songs.is_empty() {
        let ids: Vec<u64> = manifest.uploaded.iter().map(|u| u.remote_id).collect();
        if ids.is_empty() {
            // Nothing to group and nothing pending — remove the manifest.
            fs_atomic::remove_if_exists(path)?;
            return Ok(());
        }
        let gr = GroupRequest {
            title: &manifest.group_title,
            track_ids: &ids,
            private: true,
        };
        match uploader.create_group(&gr) {
            Ok(g) => {
                eprintln!(
                    "[uploader] created group \"{}\" -> {} (tracks={})",
                    manifest.group_title,
                    g.url,
                    ids.len()
                );
                fs_atomic::remove_if_exists(path)?;
            }
            Err(e) => {
                eprintln!(
                    "[uploader] failed group \"{}\" ({e}); will retry next pass",
                    manifest.group_title
                );
            }
        }
    }
    Ok(())
}

fn upload_with_retry(
    uploader: &dyn Uploader,
    req: &UploadRequest<'_>,
) -> Result<crate::uploader::UploadedTrack, UploadError> {
    let mut attempt: usize = 0;
    loop {
        if attempt > 0 {
            let delay = RETRY_BACKOFFS
                .get(attempt - 1)
                .copied()
                .unwrap_or(Duration::from_secs(4));
            thread::sleep(delay);
        }
        match uploader.upload(req) {
            Ok(t) => return Ok(t),
            Err(e) => {
                if e.is_retryable() && attempt < RETRY_BACKOFFS.len() {
                    eprintln!(
                        "[uploader] retryable error on \"{}\" (attempt {}): {e}",
                        req.title,
                        attempt + 1
                    );
                    attempt += 1;
                    continue;
                }
                return Err(e);
            }
        }
    }
}
