use rehearsal_uploader::manifest::{is_manifest_filename, Manifest, Song, UploadedEntry};

fn unique_tempdir(label: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "uploader-tests-{}-{}-{}",
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

#[test]
fn filename_validation_matrix() {
    assert!(is_manifest_filename("20260422120000_abcd1234.json"));
    assert!(is_manifest_filename("20260101000000_AAAAAAAA.json"));

    assert!(!is_manifest_filename("hello.json"));
    assert!(!is_manifest_filename("20260422120000_abcd1234.txt"));
    assert!(!is_manifest_filename("20260422120000-abcd1234.json"));
    assert!(!is_manifest_filename("202604221200_abcd1234.json"));
    assert!(!is_manifest_filename("20260422120000_abcd123.json"));
    assert!(!is_manifest_filename("20260422120000_abcd1234-.json"));
    assert!(!is_manifest_filename("20260000120000_abcd1234.json"));
}

#[test]
fn manifest_roundtrip_preserves_order_and_uploaded() {
    let dir = unique_tempdir("roundtrip");
    let path = dir.join("20260422120000_abcd1234.json");
    let m = Manifest {
        group_title: "Test Group".to_string(),
        songs: vec![
            Song {
                title: "One".into(),
                description: None,
                file: "a.wav".into(),
            },
            Song {
                title: "Two".into(),
                description: Some("desc".into()),
                file: "b.wav".into(),
            },
        ],
        uploaded: vec![UploadedEntry {
            title: "Zero".into(),
            remote_id: 42,
            url: "https://ex/0".into(),
        }],
    };
    m.save_atomic(&path).unwrap();
    let back = Manifest::load(&path).unwrap();
    assert_eq!(back, m);

    std::fs::remove_file(&path).ok();
    std::fs::remove_dir(&dir).ok();
}

#[test]
fn manifest_load_rejects_empty_group_title() {
    let dir = unique_tempdir("empty-group");
    let path = dir.join("20260422120000_abcd1234.json");
    std::fs::write(
        &path,
        br#"{"group_title":"","songs":[]}"#,
    )
    .unwrap();
    assert!(Manifest::load(&path).is_err());

    std::fs::remove_file(&path).ok();
    std::fs::remove_dir(&dir).ok();
}

#[test]
fn manifest_load_accepts_missing_uploaded_field() {
    let dir = unique_tempdir("missing-uploaded");
    let path = dir.join("20260422120000_abcd1234.json");
    std::fs::write(
        &path,
        br#"{"group_title":"G","songs":[{"title":"a","file":"a.wav"}]}"#,
    )
    .unwrap();
    let m = Manifest::load(&path).unwrap();
    assert!(m.uploaded.is_empty());
    assert_eq!(m.songs.len(), 1);

    std::fs::remove_file(&path).ok();
    std::fs::remove_dir(&dir).ok();
}
