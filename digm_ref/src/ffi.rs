// C FFI for a few simple operations
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use std::path::Path;
use std::slice;
use anyhow::Result;

use crate::writer_stream;
use crate::reader;
use crate::verify;

#[no_mangle]
pub extern "C" fn digm_encode_from_raw(
    input_path: *const c_char,
    out_path: *const c_char,
    sig_ptr: *const u8,
    sig_len: usize,
    pubkey_ptr: *const u8,
    pubkey_len: usize,
) -> c_int {
    if input_path.is_null() || out_path.is_null() { 
        return -1; 
    }
    
    let in_c = unsafe { CStr::from_ptr(input_path) };
    let out_c = unsafe { CStr::from_ptr(out_path) };
    let in_path = Path::new(in_c.to_str().unwrap());
    let out_path = Path::new(out_c.to_str().unwrap());

    let file = std::fs::File::open(in_path);
    if file.is_err() { 
        return -2; 
    }
    let file = file.unwrap();

    let header = crate::format::Header {
        sample_rate: 48000,
        channels: 1,
        bit_depth: 16,
        encoding: "pcm16le".to_string(),
        duration_ms: None,
        nonce: Some(uuid::Uuid::new_v4().to_string()),
        created_iso8601: Some(chrono::Utc::now().to_rfc3339()),
        app: Some("digm-ffi".to_string()),
        device_model: None,
        canonicalization: Some("pcm16le,48kHz,mono".to_string()),
    };

    let sig_slice = unsafe { slice::from_raw_parts(sig_ptr, sig_len) };
    let pub_slice = unsafe { slice::from_raw_parts(pubkey_ptr, pubkey_len) };

    let res = writer_stream::write_digm_stream(
        file, 
        out_path, 
        &header, 
        sig_slice, 
        pub_slice, 
        None, 
        None
    );
    
    match res {
        Ok(_) => 0,
        Err(_) => -3,
    }
}

#[no_mangle]
pub extern "C" fn digm_verify_full(path: *const c_char) -> c_int {
    if path.is_null() { 
        return -1; 
    }
    
    let c = unsafe { CStr::from_ptr(path) };
    let p = Path::new(c.to_str().unwrap());
    
    match reader::read_digm(p) {
        Ok(df) => {
            if let Err(_) = verify::verify_audio_signature(&df) { 
                return 2; 
            }
            if let Err(_) = verify::verify_file_hash(p) { 
                return 3; 
            }
            0
        }
        Err(_) => 1
    }
}

