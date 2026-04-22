use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use rehearsal_uploader::manifest::{Manifest, Song};
use rehearsal_uploader::uploader::{
    GroupRequest, LogUploader, UploadError, UploadRequest, Uploader,
};
use rehearsal_uploader::watcher::run_once;

fn unique_tempdir(label: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "uploader-watcher-tests-{}-{}-{}",
        label,
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn write_manifest(dir: &PathBuf, filename: &str, m: &Manifest) -> PathBuf {
    let path = dir.join(filename);
    m.save_atomic(&path).unwrap();
    path
}

fn write_wav(dir: &PathBuf, name: &str) -> PathBuf {
    let p = dir.join(name);
    std::fs::write(&p, b"fake wav bytes").unwrap();
    p
}

#[test]
fn happy_path_all_songs_succeed() {
    let dir = unique_tempdir("happy");
    let wavs = ["a.wav", "b.wav", "c.wav"];
    for w in &wavs {
        write_wav(&dir, w);
    }
    let m = Manifest {
        group_title: "Rehearsal".to_string(),
        songs: wavs
            .iter()
            .map(|w| Song {
                title: format!("Track-{w}"),
                description: None,
                file: (*w).to_string(),
            })
            .collect(),
        uploaded: vec![],
    };
    let manifest_path = write_manifest(&dir, "20260422120000_abcd1234.json", &m);

    let uploader = LogUploader::always_ok();
    run_once(&dir, &uploader as &dyn Uploader).unwrap();

    for w in &wavs {
        assert!(!dir.join(w).exists(), "wav {} should have been deleted", w);
    }
    assert!(!manifest_path.exists(), "manifest should be deleted after group creation");

    let groups = uploader.groups();
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].0, "Rehearsal");
    assert_eq!(groups[0].1.len(), 3);
    // Track IDs are assigned 1..=3 in insertion order.
    assert_eq!(groups[0].1, vec![1, 2, 3]);

    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn partial_failure_keeps_failed_song_and_skips_group() {
    let dir = unique_tempdir("partial");
    for w in &["a.wav", "b.wav", "c.wav"] {
        write_wav(&dir, w);
    }
    let m = Manifest {
        group_title: "PartialGroup".to_string(),
        songs: vec![
            Song { title: "One".into(),   description: None, file: "a.wav".into() },
            Song { title: "Two".into(),   description: None, file: "b.wav".into() },
            Song { title: "Three".into(), description: None, file: "c.wav".into() },
        ],
        uploaded: vec![],
    };
    let manifest_path = write_manifest(&dir, "20260422120000_abcd1234.json", &m);

    let uploader = LogUploader::new(
        |req: &UploadRequest<'_>| {
            if req.title == "Two" {
                Err(UploadError::BadRequest("rejected".into()))
            } else {
                Ok(())
            }
        },
        |_: &GroupRequest<'_>| Ok(()),
    );
    run_once(&dir, &uploader as &dyn Uploader).unwrap();

    assert!(!dir.join("a.wav").exists());
    assert!(dir.join("b.wav").exists(), "failed song's wav stays");
    assert!(!dir.join("c.wav").exists());
    assert!(manifest_path.exists(), "manifest persists because not complete");

    let remaining = Manifest::load(&manifest_path).unwrap();
    assert_eq!(remaining.songs.len(), 1);
    assert_eq!(remaining.songs[0].title, "Two");
    assert_eq!(remaining.uploaded.len(), 2);
    let uploaded_titles: Vec<_> = remaining.uploaded.iter().map(|u| u.title.clone()).collect();
    assert_eq!(uploaded_titles, vec!["One", "Three"]);

    assert_eq!(uploader.groups().len(), 0, "no group should be created on partial failure");

    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn transient_server_errors_retry_then_succeed() {
    let dir = unique_tempdir("retry");
    write_wav(&dir, "a.wav");
    let m = Manifest {
        group_title: "RetryGroup".to_string(),
        songs: vec![Song { title: "Retries".into(), description: None, file: "a.wav".into() }],
        uploaded: vec![],
    };
    let manifest_path = write_manifest(&dir, "20260422120000_abcd1234.json", &m);

    let calls = Arc::new(AtomicUsize::new(0));
    let calls2 = Arc::clone(&calls);

    let uploader = LogUploader::new(
        move |_: &UploadRequest<'_>| {
            let n = calls2.fetch_add(1, Ordering::SeqCst);
            if n < 2 { Err(UploadError::Server("flaky".into())) } else { Ok(()) }
        },
        |_: &GroupRequest<'_>| Ok(()),
    );
    run_once(&dir, &uploader as &dyn Uploader).unwrap();

    assert_eq!(calls.load(Ordering::SeqCst), 3, "should have retried twice then succeeded");
    assert!(!manifest_path.exists());
    assert!(!dir.join("a.wav").exists());
    assert_eq!(uploader.groups().len(), 1);

    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn group_creation_failure_leaves_manifest_for_retry() {
    let dir = unique_tempdir("group-fail");
    write_wav(&dir, "a.wav");
    let m = Manifest {
        group_title: "GroupFailGroup".to_string(),
        songs: vec![Song { title: "Only".into(), description: None, file: "a.wav".into() }],
        uploaded: vec![],
    };
    let manifest_path = write_manifest(&dir, "20260422120000_abcd1234.json", &m);

    // First pass: upload succeeds, group creation fails.
    let fail_once = Arc::new(AtomicUsize::new(0));
    let fail_once2 = Arc::clone(&fail_once);
    let uploader = LogUploader::new(
        |_: &UploadRequest<'_>| Ok(()),
        move |_: &GroupRequest<'_>| {
            let n = fail_once2.fetch_add(1, Ordering::SeqCst);
            if n == 0 { Err(UploadError::Server("oops".into())) } else { Ok(()) }
        },
    );
    run_once(&dir, &uploader as &dyn Uploader).unwrap();

    assert!(manifest_path.exists(), "manifest must remain when group creation fails");
    let mid = Manifest::load(&manifest_path).unwrap();
    assert!(mid.songs.is_empty());
    assert_eq!(mid.uploaded.len(), 1);
    assert!(!dir.join("a.wav").exists());

    // Second pass: no upload call should happen; only group creation.
    run_once(&dir, &uploader as &dyn Uploader).unwrap();
    assert!(!manifest_path.exists());
    assert_eq!(uploader.uploads().len(), 1, "no re-upload on second pass");
    assert_eq!(uploader.groups().len(), 1);

    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn manifests_processed_oldest_first() {
    let dir = unique_tempdir("order");
    write_wav(&dir, "old.wav");
    write_wav(&dir, "new.wav");
    let old = Manifest {
        group_title: "Old".into(),
        songs: vec![Song { title: "O".into(), description: None, file: "old.wav".into() }],
        uploaded: vec![],
    };
    let new = Manifest {
        group_title: "New".into(),
        songs: vec![Song { title: "N".into(), description: None, file: "new.wav".into() }],
        uploaded: vec![],
    };
    write_manifest(&dir, "20260101000000_aaaaaaaa.json", &old);
    write_manifest(&dir, "20260501000000_bbbbbbbb.json", &new);

    let uploader = LogUploader::always_ok();
    run_once(&dir, &uploader as &dyn Uploader).unwrap();

    let groups = uploader.groups();
    assert_eq!(groups.len(), 2);
    assert_eq!(groups[0].0, "Old", "older manifest processed first");
    assert_eq!(groups[1].0, "New");

    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn non_manifest_files_ignored() {
    let dir = unique_tempdir("ignore");
    std::fs::write(dir.join("readme.txt"), b"hi").unwrap();
    std::fs::write(dir.join("stray.json"), b"{}").unwrap();
    write_wav(&dir, "a.wav");

    let uploader = LogUploader::always_ok();
    run_once(&dir, &uploader as &dyn Uploader).unwrap();

    assert!(dir.join("readme.txt").exists());
    assert!(dir.join("stray.json").exists());
    assert!(dir.join("a.wav").exists());
    assert_eq!(uploader.uploads().len(), 0);

    std::fs::remove_dir_all(&dir).ok();
}
