use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::fs_atomic;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Song {
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UploadedEntry {
    pub title: String,
    pub remote_id: u64,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Manifest {
    pub group_title: String,
    pub songs: Vec<Song>,
    #[serde(default)]
    pub uploaded: Vec<UploadedEntry>,
}

impl Manifest {
    pub fn load(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let bytes = fs::read(path)?;
        let m: Manifest = serde_json::from_slice(&bytes)?;
        if m.group_title.trim().is_empty() {
            return Err("manifest group_title is empty".into());
        }
        Ok(m)
    }

    pub fn save_atomic(&self, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        let bytes = serde_json::to_vec_pretty(self)?;
        fs_atomic::write_atomic(path, &bytes)?;
        Ok(())
    }
}

/// `<YYYYMMDDHHMMSS>_<random_8_alnum>.json`
pub fn is_manifest_filename(name: &str) -> bool {
    let stem = match name.strip_suffix(".json") {
        Some(s) => s,
        None => return false,
    };
    if stem.len() != 23 {
        return false;
    }
    let b = stem.as_bytes();
    if !b[..14].iter().all(|c| c.is_ascii_digit()) {
        return false;
    }
    if b[14] != b'_' {
        return false;
    }
    if !b[15..].iter().all(|c| c.is_ascii_alphanumeric()) {
        return false;
    }
    let year: u32 = std::str::from_utf8(&b[0..4]).unwrap().parse().unwrap();
    let month: u32 = std::str::from_utf8(&b[4..6]).unwrap().parse().unwrap();
    let day: u32 = std::str::from_utf8(&b[6..8]).unwrap().parse().unwrap();
    let hour: u32 = std::str::from_utf8(&b[8..10]).unwrap().parse().unwrap();
    let minute: u32 = std::str::from_utf8(&b[10..12]).unwrap().parse().unwrap();
    let second: u32 = std::str::from_utf8(&b[12..14]).unwrap().parse().unwrap();
    (1970..=9999).contains(&year)
        && (1..=12).contains(&month)
        && (1..=31).contains(&day)
        && hour < 24
        && minute < 60
        && second < 60
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_filenames() {
        assert!(is_manifest_filename("20260422120000_abcd1234.json"));
        assert!(is_manifest_filename("20260101000000_ZZZZZZZZ.json"));
        assert!(is_manifest_filename("19991231235959_00000000.json"));
    }

    #[test]
    fn invalid_filenames() {
        assert!(!is_manifest_filename("20260422120000_abcd1234.txt"));
        assert!(!is_manifest_filename("20260422120000-abcd1234.json"));
        assert!(!is_manifest_filename("2026042212000_abcd1234.json"));
        assert!(!is_manifest_filename("20260422120000_abcd123.json"));
        assert!(!is_manifest_filename("20260422120000_abcd123$.json"));
        assert!(!is_manifest_filename("20261322120000_abcd1234.json"));
        assert!(!is_manifest_filename("20260422250000_abcd1234.json"));
        assert!(!is_manifest_filename(".json"));
        assert!(!is_manifest_filename(""));
    }
}
