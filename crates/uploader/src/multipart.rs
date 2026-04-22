use std::fs;
use std::io;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub enum PartData<'a> {
    Text(&'a str),
    File(&'a Path),
}

pub struct Part<'a> {
    pub name: &'a str,
    pub filename: Option<&'a str>,
    pub content_type: Option<&'a str>,
    pub data: PartData<'a>,
}

pub fn generate_boundary() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("----rehearsaltools-{nanos:x}")
}

pub fn build(boundary: &str, parts: &[Part<'_>]) -> io::Result<Vec<u8>> {
    let mut out: Vec<u8> = Vec::new();
    for p in parts {
        out.extend_from_slice(b"--");
        out.extend_from_slice(boundary.as_bytes());
        out.extend_from_slice(b"\r\n");

        out.extend_from_slice(b"Content-Disposition: form-data; name=\"");
        out.extend_from_slice(p.name.as_bytes());
        out.extend_from_slice(b"\"");
        if let Some(fname) = p.filename {
            out.extend_from_slice(b"; filename=\"");
            out.extend_from_slice(fname.as_bytes());
            out.extend_from_slice(b"\"");
        }
        out.extend_from_slice(b"\r\n");

        if let Some(ct) = p.content_type {
            out.extend_from_slice(b"Content-Type: ");
            out.extend_from_slice(ct.as_bytes());
            out.extend_from_slice(b"\r\n");
        }
        out.extend_from_slice(b"\r\n");

        match p.data {
            PartData::Text(s) => out.extend_from_slice(s.as_bytes()),
            PartData::File(path) => {
                let bytes = fs::read(path)?;
                out.extend_from_slice(&bytes);
            }
        }
        out.extend_from_slice(b"\r\n");
    }
    out.extend_from_slice(b"--");
    out.extend_from_slice(boundary.as_bytes());
    out.extend_from_slice(b"--\r\n");
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_text_parts() {
        let body = build(
            "BOUNDARY",
            &[Part {
                name: "title",
                filename: None,
                content_type: None,
                data: PartData::Text("hello"),
            }],
        )
        .unwrap();
        let s = String::from_utf8(body).unwrap();
        assert_eq!(
            s,
            "--BOUNDARY\r\n\
             Content-Disposition: form-data; name=\"title\"\r\n\
             \r\n\
             hello\r\n\
             --BOUNDARY--\r\n"
        );
    }

    #[test]
    fn builds_file_part_with_content_type() {
        let dir = std::env::temp_dir().join(format!("mp-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("a.wav");
        std::fs::write(&path, b"WAVDATA").unwrap();

        let body = build(
            "B",
            &[Part {
                name: "track[asset_data]",
                filename: Some("a.wav"),
                content_type: Some("audio/wav"),
                data: PartData::File(&path),
            }],
        )
        .unwrap();
        let s = String::from_utf8(body).unwrap();
        assert!(s.contains("Content-Disposition: form-data; name=\"track[asset_data]\"; filename=\"a.wav\"\r\n"));
        assert!(s.contains("Content-Type: audio/wav\r\n"));
        assert!(s.contains("\r\nWAVDATA\r\n"));
        assert!(s.ends_with("--B--\r\n"));

        std::fs::remove_file(&path).ok();
        std::fs::remove_dir(&dir).ok();
    }
}
