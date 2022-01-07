use std::cmp::min;

use sha2::{Digest, Sha256, Sha512};

pub fn bitsequence(bs: Option<&[u8]>) -> (*const u8, u64) {
    let (cust_ptr, cust_len) = if let Some(n) = bs { (n.as_ptr(), 8 * n.len()) } else { ([].as_ptr(), 0) };
    (cust_ptr, cust_len as u64)
}

pub fn check_output(name: &str, out: i32) {
    if out != 0 {
        panic!("Failed {}", name);
    }
}

pub fn random(start: u8, len: usize) -> Vec<u8> {
    let mut out = Vec::with_capacity(len);

    while out.len() < len {
        let mut hasher = Sha256::new();
        hasher.update(&[start]);
        let result = hasher.finalize();
        out.extend_from_slice(&result[..min(result.len(), len - out.len())]);
    }
    return out;
}
