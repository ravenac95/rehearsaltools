fn main() {
    if let Err(e) = rehearsal_uploader::run() {
        eprintln!("[uploader] fatal: {e}");
        std::process::exit(1);
    }
}
