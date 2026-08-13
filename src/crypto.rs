use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit},
};
use zeroize::{Zeroize, ZeroizeOnDrop};

const ENCRYPTION_PREFIX: &str = "hamd:enc:v1:";

#[derive(Zeroize, ZeroizeOnDrop)]
pub(crate) struct EncryptionKey {
    key_bytes: [u8; 32],
}

impl EncryptionKey {
    pub(crate) fn new(key_bytes: [u8; 32]) -> Self {
        Self { key_bytes }
    }

    pub(crate) fn bytes(&self) -> &[u8; 32] {
        &self.key_bytes
    }
}

pub(crate) fn generate_key() -> Result<Vec<u8>, String> {
    let mut key = [0u8; 32];
    getrandom::fill(&mut key).map_err(|e| format!("random key generation failed: {e}"))?;
    Ok(key.to_vec())
}

pub(crate) fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; 12];
    getrandom::fill(&mut nonce_bytes).map_err(|e| format!("rng failed: {e}"))?;
    let nonce = Nonce::from(nonce_bytes);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| format!("encryption failed: {e}"))?;

    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(format!("{ENCRYPTION_PREFIX}{}", hex::encode(combined)))
}

pub(crate) fn decrypt(key: &[u8; 32], stored: &str) -> Result<String, String> {
    // Unprefixed hexadecimal ciphertext was produced before the payload format was versioned.
    let hex_data = stored.strip_prefix(ENCRYPTION_PREFIX).unwrap_or(stored);
    let data = hex::decode(hex_data).map_err(|e| format!("hex decode: {e}"))?;
    // 12-byte nonce + 16-byte GCM tag = 28 bytes minimum.
    if data.len() < 28 {
        return Err("ciphertext too short".into());
    }

    let nonce_bytes: [u8; 12] = data[..12].try_into().unwrap();
    let ciphertext = &data[12..];
    let nonce = Nonce::from(nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;

    let plaintext = cipher
        .decrypt(&nonce, ciphertext)
        .map_err(|_| "decryption failed: wrong key or corrupted data".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("utf-8 decode: {e}"))
}

pub(crate) fn looks_encrypted(value: &str) -> bool {
    value.starts_with(ENCRYPTION_PREFIX)
        || (value.len() >= 56
            && value.len().is_multiple_of(2)
            && value.as_bytes().iter().all(u8::is_ascii_hexdigit))
}
