use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use regex::Regex;
use walkdir::WalkDir;
use lazy_static::lazy_static;
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use aes_gcm::aead::generic_array::GenericArray;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

// Data structures
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    #[serde(rename = "jfrogApiKey")]
    pub jfrog_api_key: String,
    #[serde(rename = "clientMappings")]
    pub client_mappings: Vec<ClientMapping>,
    #[serde(rename = "portalSettings", default)]
    pub portal_settings: PortalSettings,
    #[serde(rename = "customPlatforms", default)]
    pub custom_platforms: Vec<CustomDevice>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientMapping {
    pub number: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct PortalSettings {
    #[serde(rename = "portalTitle", default)]
    pub portal_title: String,
    #[serde(rename = "companyName", default)]
    pub company_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomDevice {
    pub name: String,
    #[serde(rename = "type")]
    pub device_type: String,
    pub identifier: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportOptions {
    pub releases: bool,
    #[serde(rename = "defaultTheme")]
    pub default_theme: bool,
    #[serde(rename = "jfrogSettings")]
    pub jfrog_settings: bool,
    #[serde(rename = "clientMappings")]
    pub client_mappings: bool,
    #[serde(rename = "htmlSettings")]
    pub html_settings: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportOptions {
    pub releases: bool,
    #[serde(rename = "defaultTheme")]
    pub default_theme: bool,
    #[serde(rename = "jfrogSettings")]
    pub jfrog_settings: bool,
    #[serde(rename = "clientMappings")]
    pub client_mappings: bool,
    #[serde(rename = "htmlSettings")]
    pub html_settings: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportSummary {
    pub imported: Vec<String>,
    pub skipped: Vec<String>,
    #[serde(rename = "releaseCount")]
    pub release_count: usize,
    pub theme: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Release {
    pub id: String,
    pub version: String,
    pub date: String,
    #[serde(rename = "type")]
    pub release_type: String,
    #[serde(default)]
    pub description: String,
    #[serde(rename = "releaseNotes")]
    pub release_notes: String,
    pub packages: Vec<PackageData>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: Option<String>,
    #[serde(rename = "spfFileName", default)]
    pub spf_file_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackageData {
    pub platform: String,
    pub device: String,
    pub category: String,
    pub signature: String,
    pub client: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PackageInfo {
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub size: u64,
    pub platform: Option<String>,
    pub device: Option<String>,
    pub category: Option<String>,
    pub signature: Option<String>,
    pub client: Option<String>,
    #[serde(rename = "jfrogPath")]
    pub jfrog_path: Option<String>,
    pub version: Option<String>,
    pub hash: Option<String>,
    #[serde(rename = "isDev")]
    pub is_dev: bool,
    #[serde(rename = "isSigned")]
    pub is_signed: bool,
    #[serde(rename = "specialHandling")]
    pub special_handling: Option<String>,
    #[serde(rename = "extractFolder")]
    pub extract_folder: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppPaths {
    #[serde(rename = "userData")]
    pub user_data: String,
    pub releases: String,
    pub html: String,
    pub logs: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResult {
    pub success: bool,
    pub url: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub packages: Vec<PackageInfo>,
    #[serde(rename = "detectedVersion")]
    pub detected_version: Option<String>,
    #[serde(rename = "versionError")]
    pub version_error: Option<String>,
    #[serde(rename = "companionWarnings")]
    pub companion_warnings: Vec<String>,
    #[serde(rename = "isValid")]
    pub is_valid: bool,
}

// Device mapping structure
struct DeviceInfo {
    manufacturer: &'static str,
    path: &'static str,
}

// Log state for per-execution log files with rotation
struct LogState {
    log_file_path: PathBuf,
    execution_timestamp: String,
    execution_counter: u32,
    overflow_active: bool,
}

lazy_static! {
    static ref LOG_STATE: Mutex<Option<LogState>> = Mutex::new(None);
    static ref DEVICE_MAP: HashMap<&'static str, DeviceInfo> = {
        let mut m = HashMap::new();
        m.insert("A910", DeviceInfo { manufacturer: "pax", path: "a910" });
        m.insert("S920", DeviceInfo { manufacturer: "pax", path: "s920" });
        m.insert("P2", DeviceInfo { manufacturer: "sunmi", path: "p2" });
        m.insert("P2_LITE_SE", DeviceInfo { manufacturer: "sunmi", path: "p2litese" });
        m.insert("P2LITESE", DeviceInfo { manufacturer: "sunmi", path: "p2litese" });
        m.insert("L3", DeviceInfo { manufacturer: "positivo", path: "l3" });
        m.insert("L3_2024", DeviceInfo { manufacturer: "positivo", path: "l3_2024" });
        m.insert("L300", DeviceInfo { manufacturer: "positivo", path: "l300" });
        m.insert("L400", DeviceInfo { manufacturer: "positivo", path: "l400" });
        m.insert("GPOS700", DeviceInfo { manufacturer: "gertec", path: "gpos700" });
        m.insert("GPOS720", DeviceInfo { manufacturer: "gertec", path: "gpos720" });
        m.insert("GPOS760", DeviceInfo { manufacturer: "gertec", path: "gpos760" });
        m.insert("DX8000", DeviceInfo { manufacturer: "ingenico", path: "dx8000" });
        m.insert("DX4000", DeviceInfo { manufacturer: "ingenico", path: "dx4000" });
        m.insert("EX4000", DeviceInfo { manufacturer: "ingenico", path: "ex4000" });
        m.insert("X990_PRO", DeviceInfo { manufacturer: "verifone", path: "x990_pro" });
        m.insert("X990_UX", DeviceInfo { manufacturer: "verifone", path: "x990_ux" });
        m
    };
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            jfrog_api_key: String::new(),
            client_mappings: vec![],
            portal_settings: PortalSettings::default(),
            custom_platforms: vec![],
        }
    }
}

// Helper functions
fn get_app_data_dir() -> PathBuf {
    let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("smartpostef-package-manager")
}

fn get_type_short(release: &Release) -> &'static str {
    let rtype = release.release_type.to_lowercase();
    if rtype == "production" {
        let is_unsigned = release.packages.iter().any(|p| p.url.contains("/unsigned/"));
        if is_unsigned { "unsigned" } else { "prod" }
    } else if rtype == "deploy-only" {
        "deploy"
    } else {
        "dev"
    }
}

fn ensure_directories() {
    let app_dir = get_app_data_dir();
    let _ = fs::create_dir_all(app_dir.join("releases"));
    let _ = fs::create_dir_all(app_dir.join("html"));
    let _ = fs::create_dir_all(app_dir.join("logs"));
    let _ = fs::create_dir_all(app_dir.join("spf"));
}

/// Migrate existing releases to include spfFileName if missing.
/// This ensures backward compatibility when upgrading from older versions.
fn migrate_releases_to_spf() {
    let releases_path = get_app_data_dir().join("releases.json");
    if !releases_path.exists() {
        return;
    }
    
    let content = match fs::read_to_string(&releases_path) {
        Ok(c) => c,
        Err(_) => return,
    };
    
    // Parse as generic JSON to handle missing fields gracefully
    let mut releases: Vec<serde_json::Value> = match serde_json::from_str(&content) {
        Ok(r) => r,
        Err(_) => return,
    };
    
    let mut modified = false;
    for release in releases.iter_mut() {
        if let Some(obj) = release.as_object_mut() {
            // Add updatedAt if missing
            if !obj.contains_key("updatedAt") {
                obj.insert("updatedAt".to_string(), serde_json::Value::Null);
                modified = true;
            }
            // Add spfFileName if missing
            if !obj.contains_key("spfFileName") {
                obj.insert("spfFileName".to_string(), serde_json::Value::Null);
                modified = true;
            }
        }
    }
    
    if modified {
        if let Ok(new_content) = serde_json::to_string_pretty(&releases) {
            let _ = fs::write(&releases_path, new_content);
            log_to_file("INFO", "MIGRATION: Releases migrated to include spfFileName and updatedAt", None);
        }
    }
}

// Maximum log file size: 50MB
const MAX_LOG_FILE_SIZE: u64 = 50 * 1024 * 1024;

// Initialize the log state for this execution
fn init_log_state() {
    let logs_dir = get_app_data_dir().join("logs");
    let _ = fs::create_dir_all(&logs_dir);
    
    let now = chrono::Local::now();
    let execution_timestamp = now.format("%Y%m%d-%H%M%S").to_string();
    let today_prefix = now.format("%Y%m%d").to_string();
    
    // Count existing log files for today to determine the counter
    let mut counter: u32 = 1;
    if let Ok(entries) = fs::read_dir(&logs_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            // Match pattern: adtpkgmngr-YYYYMMDD-HHMMSS-N.log or adtpkgmngr-YYYYMMDD-HHMMSS-N-f.log
            if name.starts_with(&format!("adtpkgmngr-{}", today_prefix)) && name.ends_with(".log") {
                // Extract counter from filename: adtpkgmngr-YYYYMMDD-HHMMSS-N.log
                let stem = name.trim_end_matches(".log").trim_end_matches("-f");
                if let Some(last_dash) = stem.rfind('-') {
                    if let Ok(n) = stem[last_dash + 1..].parse::<u32>() {
                        if n >= counter {
                            counter = n + 1;
                        }
                    }
                }
            }
        }
    }
    
    let log_filename = format!("adtpkgmngr-{}-{}.log", execution_timestamp, counter);
    let log_file_path = logs_dir.join(&log_filename);
    
    let mut state = LOG_STATE.lock().unwrap();
    *state = Some(LogState {
        log_file_path,
        execution_timestamp,
        execution_counter: counter,
        overflow_active: false,
    });
}

// Get the current log file path, handling rotation if needed
fn get_log_file_path() -> PathBuf {
    let mut state = LOG_STATE.lock().unwrap();
    
    if state.is_none() {
        drop(state);
        init_log_state();
        state = LOG_STATE.lock().unwrap();
    }
    
    let log_state = state.as_mut().unwrap();
    
    // Check if current log file exceeds 50MB
    if log_state.log_file_path.exists() {
        if let Ok(metadata) = fs::metadata(&log_state.log_file_path) {
            if metadata.len() >= MAX_LOG_FILE_SIZE && !log_state.overflow_active {
                // Rename current file with -f suffix (overflow marker)
                let current_path = log_state.log_file_path.clone();
                let overflow_name = format!(
                    "adtpkgmngr-{}-{}-f.log",
                    log_state.execution_timestamp,
                    log_state.execution_counter
                );
                let overflow_path = current_path.parent().unwrap().join(&overflow_name);
                let _ = fs::rename(&current_path, &overflow_path);
                
                // Increment counter and create new log file
                log_state.execution_counter += 1;
                let new_name = format!(
                    "adtpkgmngr-{}-{}.log",
                    log_state.execution_timestamp,
                    log_state.execution_counter
                );
                log_state.log_file_path = current_path.parent().unwrap().join(&new_name);
                log_state.overflow_active = false;
            }
        }
    }
    
    log_state.log_file_path.clone()
}

// Logging function - writes to log file with detailed output
fn log_to_file(level: &str, message: &str, details: Option<&str>) {
    let logs_dir = get_app_data_dir().join("logs");
    let _ = fs::create_dir_all(&logs_dir);
    
    let log_file = get_log_file_path();
    
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let level_padded = format!("{:7}", level); // Pad level for alignment
    
    let separator = "─".repeat(80);
    let log_entry = match details {
        Some(d) => format!(
            "{}\n[{}] [{}]\n  MESSAGE: {}\n  DETAILS: {}\n",
            separator, timestamp, level_padded, message, d
        ),
        None => format!(
            "{}\n[{}] [{}]\n  MESSAGE: {}\n",
            separator, timestamp, level_padded, message
        ),
    };
    
    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
    {
        let _ = file.write_all(log_entry.as_bytes());
    }
}

// Encryption key derivation - uses a fixed app-specific key
// This provides obfuscation so the API key is not stored in plaintext in exported files
const ENCRYPTION_SALT: &[u8; 16] = b"SmPosTefPkgMgr!!"; // 16 bytes

fn derive_encryption_key() -> [u8; 32] {
    // Derive a 32-byte key from the salt using a simple but consistent method
    let mut key = [0u8; 32];
    for (i, byte) in key.iter_mut().enumerate() {
        *byte = ENCRYPTION_SALT[i % ENCRYPTION_SALT.len()] ^ (i as u8).wrapping_mul(0x5A).wrapping_add(0x3C);
    }
    key
}

fn encrypt_api_key(api_key: &str) -> Result<String, String> {
    if api_key.is_empty() {
        return Ok(String::new());
    }
    
    let key_bytes = derive_encryption_key();
    let key = GenericArray::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    // Generate a random 12-byte nonce
    use aes_gcm::aead::AeadCore;
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    
    let ciphertext = cipher.encrypt(&nonce, api_key.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    
    // Combine nonce + ciphertext and encode as base64
    let mut combined = nonce.to_vec();
    combined.extend_from_slice(&ciphertext);
    
    Ok(format!("ENC:{}", BASE64.encode(&combined)))
}

fn decrypt_api_key(encrypted: &str) -> Result<String, String> {
    if encrypted.is_empty() {
        return Ok(String::new());
    }
    
    // Check if the value is encrypted (has ENC: prefix)
    if !encrypted.starts_with("ENC:") {
        // Not encrypted, return as-is (backward compatibility with old exports)
        return Ok(encrypted.to_string());
    }
    
    let encoded = &encrypted[4..]; // Strip "ENC:" prefix
    let combined = BASE64.decode(encoded)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;
    
    if combined.len() < 12 {
        return Err("Invalid encrypted data: too short".to_string());
    }
    
    let key_bytes = derive_encryption_key();
    let key = GenericArray::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    let nonce = Nonce::from_slice(&combined[..12]);
    let ciphertext = &combined[12..];
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    
    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 decode failed: {}", e))
}

fn load_releases() -> Vec<Release> {
    let releases_path = get_app_data_dir().join("releases.json");
    if releases_path.exists() {
        if let Ok(content) = fs::read_to_string(&releases_path) {
            if let Ok(releases) = serde_json::from_str(&content) {
                return releases;
            }
        }
    }
    Vec::new()
}

fn load_settings() -> Settings {
    let settings_path = get_app_data_dir().join("settings.json");
    if settings_path.exists() {
        if let Ok(content) = fs::read_to_string(&settings_path) {
            if let Ok(settings) = serde_json::from_str(&content) {
                return settings;
            }
        }
    }
    Settings::default()
}

// Extract client number from version string
// Version format: X.X.XCLIENTNUM.HASH (e.g., 2.5.1877.851127 where 877 is client)
// or X.X.X.HASH (e.g., 2.5.1.289844 - no client)
fn extract_client_from_version(version_with_hash: &str, settings: &Settings) -> (String, Option<String>, Option<String>) {
    let parts: Vec<&str> = version_with_hash.split('.').collect();
    if parts.len() < 4 {
        return (version_with_hash.to_string(), None, None);
    }
    
    let third_part = parts[2];
    let hash = parts[3].to_string();
    
    let mut found_client: Option<String> = None;
    let mut base_version = format!("{}.{}.{}", parts[0], parts[1], third_part);
    
    if third_part.len() > 1 {
        for mapping in &settings.client_mappings {
            let client_num = &mapping.number;
            if third_part.ends_with(client_num) {
                let version_num = &third_part[..third_part.len() - client_num.len()];
                if !version_num.is_empty() {
                    base_version = format!("{}.{}.{}", parts[0], parts[1], version_num);
                    found_client = Some(mapping.name.clone());
                    break;
                }
            }
        }
    }
    
    (base_version, found_client, Some(hash))
}

// Extract signature from filename
fn extract_signature(file_name: &str) -> Option<String> {
    if !file_name.contains("_sign.") {
        return None;
    }
    
    // Try v2 format first: version+hexhash-SIGNATURE-release_sign.ext
    let re_v2 = Regex::new(r"\d+\.\d+\.\d+\+[0-9a-fA-F]+-([A-Za-z][A-Za-z0-9_]*)-(?:release|debug)_sign\.(?:zip|apk)$").ok()?;
    if let Some(caps) = re_v2.captures(file_name) {
        if let Some(sig) = caps.get(1) {
            let potential_sig = sig.as_str().to_lowercase();
            let excluded = ["release", "debug", "sign", "signed", "unsigned", "offline", "online"];
            if !excluded.contains(&potential_sig.as_str()) {
                return Some(sig.as_str().to_string());
            }
        }
    }

    // v1 format: version.hash-SIGNATURE-release_sign.ext or version.A2A.hash-SIGNATURE-release_sign.ext
    let re = Regex::new(r"\d+\.\d+\.\d+\.(?:A2A\.)?\d+-([A-Za-z][A-Za-z0-9_]*)-(?:release|debug)_sign\.(?:zip|apk)$").ok()?;
    if let Some(caps) = re.captures(file_name) {
        if let Some(sig) = caps.get(1) {
            let potential_sig = sig.as_str().to_lowercase();
            let excluded = ["release", "debug", "sign", "signed", "unsigned", "offline", "online"];
            if !excluded.contains(&potential_sig.as_str()) {
                return Some(sig.as_str().to_string());
            }
        }
    }
    None
}

// Extract base version (Major.Minor.Patch) from full version string
// "2.5.1.183749" -> "2.5.1"
// "2.4.1.A2A.96873" -> "2.4.1"
// "2.5.4+0d05ce0" -> "2.5.4"
// "0.16.1" -> "0.16.1"
fn extract_base_version(version: &str) -> Option<String> {
    // Handle v2 versions with hex hash: X.X.X+HEXHASH -> X.X.X
    if version.contains('+') {
        let parts: Vec<&str> = version.split('+').collect();
        if !parts.is_empty() {
            return Some(parts[0].to_string());
        }
    }

    // Handle A2A versions: X.X.X.A2A.HASH -> X.X.X
    if version.contains(".A2A.") {
        let parts: Vec<&str> = version.split(".A2A.").collect();
        if !parts.is_empty() {
            return Some(parts[0].to_string());
        }
    }
    
    // Handle STA/TEF versions: X.X.X.HASH or X.X.X -> X.X.X
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() >= 3 {
        // Check if parts[0], parts[1], parts[2] are all numeric
        if parts[0].parse::<u32>().is_ok() && 
           parts[1].parse::<u32>().is_ok() && 
           parts[2].chars().all(|c| c.is_ascii_digit()) {
            return Some(format!("{}.{}.{}", parts[0], parts[1], parts[2]));
        }
    }
    
    None
}

// Parse package filename - comprehensive detection based on Electron version
fn parse_package(file_name: &str, file_path: &str, settings: &Settings) -> PackageInfo {
    let path = Path::new(file_path);
    let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    
    let is_signed = file_name.contains("_sign.");
    let is_dev_pattern = Regex::new(r"-[LD]D?-|-D-").unwrap();
    let is_dev = is_dev_pattern.is_match(file_name);
    
    let mut pkg = PackageInfo {
        file_name: file_name.to_string(),
        file_path: file_path.to_string(),
        size,
        platform: None,
        device: None,
        category: None,
        signature: extract_signature(file_name),
        client: None,
        jfrog_path: None,
        version: None,
        hash: None,
        is_dev,
        is_signed,
        special_handling: None,
        extract_folder: None,
    };

    // ==================== WINDOWS PACKAGES ====================
    
    // Windows DLL v2: AditumTefLibrary-{P|D}-{version}+{hexhash}.zip
    let re = Regex::new(r"^AditumTefLibrary-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Windows".to_string());
        pkg.device = Some("TEF Library".to_string());
        pkg.category = Some("DLL".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/windows/dll/" } else { "packages/windows/dll/" }.to_string());
        return pkg;
    }

    // Windows Installer Online v2: AditumTEF-installer-{P|D}-{version}+{hexhash}-x86-online.exe
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-x86-online\.exe$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Windows".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Online".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/windows/" } else { "packages/windows/" }.to_string());
        return pkg;
    }

    // Windows Installer Offline v2: AditumTEF-installer-{P|D}-{version}+{hexhash}-x86-offline.exe
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-x86-offline\.exe$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Windows".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Offline".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/windows/" } else { "packages/windows/" }.to_string());
        return pkg;
    }

    // Windows DLL: AditumTefLibrary-{P|D}-{version}-{hash}.zip
    let re = Regex::new(r"^AditumTefLibrary-([PD])-(\d+\.\d+\.\d+)-(\d+)\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Windows".to_string());
        pkg.device = Some("TEF Library".to_string());
        pkg.category = Some("DLL".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/windows/dll/" } else { "packages/windows/dll/" }.to_string());
        return pkg;
    }

    // Windows Installer Online: AditumTEF-installer-{P|D}-{version}.{hash}-x86-online.exe
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\.(\d+)-x86-online\.exe$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Windows".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Online".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/windows/" } else { "packages/windows/" }.to_string());
        return pkg;
    }

    // Windows Installer Offline: AditumTEF-installer-{P|D}-{version}.{hash}-x86-offline.exe
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\.(\d+)-x86-offline\.exe$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Windows".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Offline".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/windows/" } else { "packages/windows/" }.to_string());
        return pkg;
    }

    // Windows Online Installer Companion: x86.zip
    let re = Regex::new(r"^x86\.zip$").unwrap();
    if re.is_match(file_name) {
        pkg.platform = Some("Windows".to_string());
        pkg.device = Some("x86 Installer".to_string());
        pkg.category = Some("Online Companion".to_string());
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/windows/" } else { "packages/windows/" }.to_string());
        pkg.special_handling = Some("extract-x86".to_string());
        pkg.extract_folder = Some("x86".to_string());
        return pkg;
    }

    // ==================== LINUX 64 PACKAGES ====================
    
    // Linux 64 Library v2: AditumTEFLib-{P|D}-amd64-{version}+{hexhash}(-{rev})?.(zip|tar)
    let re = Regex::new(r"^AditumTEFLib-([PD])-amd64-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)(?:-(\d+))?\.(zip|tar)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux64".to_string());
        pkg.device = Some("TEF Library".to_string());
        pkg.category = Some("Library".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/64/library/" } else { "packages/linux/64/library/" }.to_string());
        return pkg;
    }

    // Linux 64 Installer Online v2: AditumTEF-installer-{P|D}-{version}+{hexhash}-x86_64-online
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-x86_64-online$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux64".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Online".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/64/" } else { "packages/linux/64/" }.to_string());
        return pkg;
    }

    // Linux 64 Installer Offline v2: AditumTEF-installer-{P|D}-{version}+{hexhash}-x86_64-offline
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-x86_64-offline$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux64".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Offline".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/64/" } else { "packages/linux/64/" }.to_string());
        return pkg;
    }

    // Linux 64 Library: AditumTEFLib-{P|D}-amd64-{version}.{hash}(-{rev})?.zip
    let re = Regex::new(r"^AditumTEFLib-([PD])-amd64-(\d+\.\d+\.\d+)\.(\d+)(?:-(\d+))?\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux64".to_string());
        pkg.device = Some("TEF Library".to_string());
        pkg.category = Some("Library".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/64/library/" } else { "packages/linux/64/library/" }.to_string());
        return pkg;
    }

    // Linux 64 Installer Online: AditumTEF-installer-{P|D}-{version}.{hash}-x86_64-online
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\.(\d+)-x86_64-online$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux64".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Online".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/64/" } else { "packages/linux/64/" }.to_string());
        return pkg;
    }

    // Linux 64 Installer Offline: AditumTEF-installer-{P|D}-{version}.{hash}-x86_64-offline
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\.(\d+)-x86_64-offline$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux64".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Offline".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/64/" } else { "packages/linux/64/" }.to_string());
        return pkg;
    }

    // Linux 64 GUI Installer: Linux_64-Gui-Installer.zip
    let re = Regex::new(r"^Linux_64-Gui-Installer\.zip$").unwrap();
    if re.is_match(file_name) {
        pkg.platform = Some("Linux64".to_string());
        pkg.device = Some("GUI Installer".to_string());
        pkg.category = Some("Online Companion".to_string());
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/64/" } else { "packages/linux/64/" }.to_string());
        pkg.special_handling = Some("extract-x86_64".to_string());
        pkg.extract_folder = Some("x86_64".to_string());
        return pkg;
    }

    // ==================== LINUX 32 PACKAGES ====================
    
    // Linux 32 Library v2: AditumTEFLib-{P|D}-i386-{version}+{hexhash}(-{rev})?.(zip|tar)
    let re = Regex::new(r"^AditumTEFLib-([PD])-i386-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)(?:-(\d+))?\.(zip|tar)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux32".to_string());
        pkg.device = Some("TEF Library".to_string());
        pkg.category = Some("Library".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/32/library/" } else { "packages/linux/32/library/" }.to_string());
        return pkg;
    }

    // Linux 32 Installer Online v2: AditumTEF-installer-{P|D}-{version}+{hexhash}-i386-online
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-i386-online$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux32".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Online".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/32/" } else { "packages/linux/32/" }.to_string());
        return pkg;
    }

    // Linux 32 Installer Offline v2: AditumTEF-installer-{P|D}-{version}+{hexhash}-i386-offline
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-i386-offline$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux32".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Offline".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/32/" } else { "packages/linux/32/" }.to_string());
        return pkg;
    }

    // Linux 32 Library: AditumTEFLib-{P|D}-i386-{version}.{hash}(-{rev})?.zip
    let re = Regex::new(r"^AditumTEFLib-([PD])-i386-(\d+\.\d+\.\d+)\.(\d+)(?:-(\d+))?\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux32".to_string());
        pkg.device = Some("TEF Library".to_string());
        pkg.category = Some("Library".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/32/library/" } else { "packages/linux/32/library/" }.to_string());
        return pkg;
    }

    // Linux 32 Installer Online: AditumTEF-installer-{P|D}-{version}.{hash}-i386-online
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\.(\d+)-i386-online$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux32".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Online".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/32/" } else { "packages/linux/32/" }.to_string());
        return pkg;
    }

    // Linux 32 Installer Offline: AditumTEF-installer-{P|D}-{version}.{hash}-i386-offline
    let re = Regex::new(r"^AditumTEF-installer-([PD])-(\d+\.\d+\.\d+)\.(\d+)-i386-offline$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Linux32".to_string());
        pkg.device = Some("Installer".to_string());
        pkg.category = Some("Offline".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/32/" } else { "packages/linux/32/" }.to_string());
        return pkg;
    }

    // Linux 32 Installer ZIP: Linux_i386-Installer.zip
    let re = Regex::new(r"^Linux_i386-Installer\.zip$").unwrap();
    if re.is_match(file_name) {
        pkg.platform = Some("Linux32".to_string());
        pkg.device = Some("i386 Installer".to_string());
        pkg.category = Some("Online Companion".to_string());
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/linux/32/" } else { "packages/linux/32/" }.to_string());
        pkg.special_handling = Some("extract-i386".to_string());
        pkg.extract_folder = Some("i386".to_string());
        return pkg;
    }

    // ==================== EMBEDDED S920 PACKAGES ====================
    
    // Embedded S920 Signed v2: SmartPosTef-{P|D}-S920-{version}+{hexhash}_sign.zip
    let re = Regex::new(r"^SmartPosTef-([PD])-S920-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)_sign\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Embedded".to_string());
        pkg.device = Some("S920".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = true;
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/pax/s920/" } else { "packages/pax/s920/" }.to_string());
        return pkg;
    }

    // Embedded S920 Unsigned v2: SmartPosTef-{P|D}-S920-{version}+{hexhash}.zip
    let re = Regex::new(r"^SmartPosTef-([PD])-S920-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Embedded".to_string());
        pkg.device = Some("S920".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/pax/s920/" } else { "packages/unsigned/pax/s920/" }.to_string());
        if !pkg.is_dev {
            let folder_name = file_name.trim_end_matches(".zip").to_string();
            pkg.special_handling = Some("extract-s920-root".to_string());
            pkg.extract_folder = Some(folder_name);
        }
        return pkg;
    }

    // Embedded S920 Signed (new format): SmartPosTef-{P|D}-S920-{version}.{hash}_sign.zip
    let re = Regex::new(r"^SmartPosTef-([PD])-S920-(\d+\.\d+\.\d+)\.(\d+)_sign\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Embedded".to_string());
        pkg.device = Some("S920".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = true;
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/pax/s920/" } else { "packages/pax/s920/" }.to_string());
        return pkg;
    }

    // Embedded S920 Unsigned (new format): SmartPosTef-{P|D}-S920-{version}.{hash}.zip
    // Unsigned S920 packages must be extracted: ZIP root -> folder named after file (without .zip) -> upload folder
    let re = Regex::new(r"^SmartPosTef-([PD])-S920-(\d+\.\d+\.\d+)\.(\d+)\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Embedded".to_string());
        pkg.device = Some("S920".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/pax/s920/" } else { "packages/unsigned/pax/s920/" }.to_string());
        // Only extract for Production (P), Dev (D) is uploaded directly
        if !pkg.is_dev {
            let folder_name = file_name.trim_end_matches(".zip").to_string();
            pkg.special_handling = Some("extract-s920-root".to_string());
            pkg.extract_folder = Some(folder_name);
        }
        return pkg;
    }

    // Embedded S920 Signed (legacy format): SmartPosTef-{P|D}-{version}.{hash}_sign.zip
    let re = Regex::new(r"^SmartPosTef-([PD])-(\d+\.\d+\.\d+)\.(\d+)_sign\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Embedded".to_string());
        pkg.device = Some("S920".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = true;
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/pax/s920/" } else { "packages/pax/s920/" }.to_string());
        return pkg;
    }

    // Embedded S920 Unsigned (legacy format): SmartPosTef-{P|D}-{version}.{hash}.zip
    // Unsigned S920 packages must be extracted: ZIP root -> folder named after file (without .zip) -> upload folder
    let re = Regex::new(r"^SmartPosTef-([PD])-(\d+\.\d+\.\d+)\.(\d+)\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("Embedded".to_string());
        pkg.device = Some("S920".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/pax/s920/" } else { "packages/unsigned/pax/s920/" }.to_string());
        // Only extract for Production (P), Dev (D) is uploaded directly
        if !pkg.is_dev {
            let folder_name = file_name.trim_end_matches(".zip").to_string();
            pkg.special_handling = Some("extract-s920-root".to_string());
            pkg.extract_folder = Some(folder_name);
        }
        return pkg;
    }

    // ==================== STA LAUNCHER PACKAGES (LP) ====================
    
    // STA Launcher Production v2: SmartPosTef-LP-{device}-{version}+{hexhash}(-{signature})?-release(_sign)?.(zip|apk)
    let re = Regex::new(r"^SmartPosTef-LP-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release(_sign)?\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        let has_signed = caps.get(5).is_some();
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Launcher".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_signed = has_signed;
        pkg.is_dev = false;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = if has_signed {
                format!("packages/{}/{}/launcher/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/{}/{}/launcher/", info.manufacturer, info.path)
            };
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // STA Launcher Production: SmartPosTef-LP-{device}-{version}.{hash}(-{signature})?-release(_sign)?.(zip|apk)
    let re = Regex::new(r"^SmartPosTef-LP-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release(_sign)?\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        let has_signed = caps.get(5).is_some();
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Launcher".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_signed = has_signed;
        pkg.is_dev = false;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = if has_signed {
                format!("packages/{}/{}/launcher/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/{}/{}/launcher/", info.manufacturer, info.path)
            };
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // ==================== STA APP PACKAGES (AP) ====================
    
    // STA App Production v2: SmartPosTef-AP-{device}-{version}+{hexhash}(-{signature})?-release(_sign)?.(zip|apk)
    let re = Regex::new(r"^SmartPosTef-AP-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release(_sign)?\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        let has_signed = caps.get(5).is_some();
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("App".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_signed = has_signed;
        pkg.is_dev = false;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = if has_signed {
                format!("packages/{}/{}/app/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/{}/{}/app/", info.manufacturer, info.path)
            };
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // STA App Production: SmartPosTef-AP-{device}-{version}.{hash}(-{signature})?-release(_sign)?.(zip|apk)
    let re = Regex::new(r"^SmartPosTef-AP-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release(_sign)?\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        let has_signed = caps.get(5).is_some();
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("App".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_signed = has_signed;
        pkg.is_dev = false;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = if has_signed {
                format!("packages/{}/{}/app/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/{}/{}/app/", info.manufacturer, info.path)
            };
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // ==================== DEVELOPMENT STA PACKAGES (LD/AD) ====================
    
    // Dev Launcher v2 (LD): SmartPosTef-LD-{device}-{version}+{hexhash}...
    let re = Regex::new(r"^SmartPosTef-LD-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?.*\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Launcher".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = true;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = format!("packages/dev/{}/{}/launcher/", info.manufacturer, info.path);
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // Dev Launcher (LD): SmartPosTef-LD-{device}-{version}.{hash}...
    let re = Regex::new(r"^SmartPosTef-LD-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?.*\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Launcher".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = true;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = format!("packages/dev/{}/{}/launcher/", info.manufacturer, info.path);
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // Dev App v2 (AD): SmartPosTef-AD-{device}-{version}+{hexhash}...
    let re = Regex::new(r"^SmartPosTef-AD-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?.*\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("App".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = true;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = format!("packages/dev/{}/{}/app/", info.manufacturer, info.path);
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // Dev App (AD): SmartPosTef-AD-{device}-{version}.{hash}...
    let re = Regex::new(r"^SmartPosTef-AD-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+\d*)\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?.*\.(?:zip|apk)$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let version_with_client = caps.get(2).unwrap().as_str();
        let hash = caps.get(3).unwrap().as_str();
        let signature_from_name = caps.get(4).map(|m| m.as_str().to_string());
        
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("STA".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("App".to_string());
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = true;
        
        if let Some(sig) = signature_from_name {
            let sig_lower = sig.to_lowercase();
            if !["release", "debug"].contains(&sig_lower.as_str()) {
                pkg.signature = Some(sig);
            }
        }
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client.clone();
        
        if let Some(info) = device_info {
            let base_path = format!("packages/dev/{}/{}/app/", info.manufacturer, info.path);
            pkg.jfrog_path = Some(if let Some(ref c) = client {
                format!("{}{}/", base_path, c.to_lowercase())
            } else {
                base_path
            });
        }
        
        return pkg;
    }

    // ==================== A2A PACKAGES ====================
    
    // A2A AAR v2: AditumSdkIntegration-A2A-{P|D}-{version}+{hexhash}-release.aar
    let re = Regex::new(r"^AditumSdkIntegration-A2A-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-release\.aar$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("SDK Integration".to_string());
        pkg.category = Some("AAR".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/app-to-app/sdk_integration/" } else { "packages/app-to-app/sdk_integration/" }.to_string());
        return pkg;
    }

    // A2A Doc v2: Doc-AditumSdkIntegration-A2A-{P|D}-{version}+{hexhash}.zip
    let re = Regex::new(r"^Doc-AditumSdkIntegration-A2A-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("SDK Integration".to_string());
        pkg.category = Some("Documentation".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/app-to-app/sdk_integration/doc/" } else { "packages/app-to-app/sdk_integration/doc/" }.to_string());
        return pkg;
    }

    // A2A TefSdk v2: AditumSdkService-A2A-{P|D}-TefSdk-{arch}-{version}+{hexhash}-release.apk
    let re = Regex::new(r"^AditumSdkService-A2A-([PD])-TefSdk-(arm64-v8a|armeabi-v7a)-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let arch = caps.get(2).unwrap().as_str();
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("TefSdk".to_string());
        pkg.category = Some(if arch == "armeabi-v7a" { "v7a" } else { "v8a" }.to_string());
        pkg.version = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(4).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        let arch_path = if arch == "armeabi-v7a" { "v7a" } else { "v8a" };
        pkg.jfrog_path = Some(if pkg.is_dev { 
            format!("packages/dev/app-to-app/tef-android/{}/", arch_path) 
        } else { 
            format!("packages/app-to-app/tef-android/{}/", arch_path) 
        });
        return pkg;
    }

    // A2A Device APK Signed v2: SmartPosTef-A2A-{P|D}-{device}-{version}+{hexhash}[-{signature}]-release_sign.apk
    let re = Regex::new(r"^SmartPosTef-A2A-([PD])-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release_sign\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(2).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Device APK".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = true;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // A2A Device APK Unsigned v2: SmartPosTef-A2A-{P|D}-{device}-{version}+{hexhash}[-{signature}]-release.apk
    let re = Regex::new(r"^SmartPosTef-A2A-([PD])-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(2).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Device APK".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // A2A Payment Example Generic v2: PaymentExample-A2A-{P|D}-{version}+{hexhash}-release.apk
    let re = Regex::new(r"^PaymentExample-A2A-([PD])-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("Generic".to_string());
        pkg.category = Some("Payment Example".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        
        pkg.jfrog_path = Some(if pkg.is_dev {
            "packages/dev/app-to-app/payment_example/".to_string()
        } else {
            "packages/app-to-app/payment_example/".to_string()
        });
        
        return pkg;
    }

    // A2A Payment Example Signed v2: PaymentExample-A2A-{P|D}-{device}-{version}+{hexhash}[-{signature}]-release_sign.apk
    let re = Regex::new(r"^PaymentExample-A2A-([PD])-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release_sign\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(2).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Payment Example".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = true;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // A2A Payment Example Unsigned v2: PaymentExample-A2A-{P|D}-{device}-{version}+{hexhash}[-{signature}]-release.apk
    let re = Regex::new(r"^PaymentExample-A2A-([PD])-([A-Za-z0-9_]+)-(\d+\.\d+\.\d+)\+([0-9a-fA-F]+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(2).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Payment Example".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // A2A AAR: AditumSdkIntegration-{P|D}-{version}.A2A.{hash}-release.aar
    let re = Regex::new(r"^AditumSdkIntegration-([PD])-(\d+\.\d+\.\d+)\.A2A\.(\d+)-release\.aar$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("SDK Integration".to_string());
        pkg.category = Some("AAR".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/app-to-app/sdk_integration/" } else { "packages/app-to-app/sdk_integration/" }.to_string());
        return pkg;
    }

    // A2A Doc: Doc-AditumSdkIntegration-{P|D}-{version}.A2A.{hash}.zip
    let re = Regex::new(r"^Doc-AditumSdkIntegration-([PD])-(\d+\.\d+\.\d+)\.A2A\.(\d+)\.zip$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("SDK Integration".to_string());
        pkg.category = Some("Documentation".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.jfrog_path = Some(if pkg.is_dev { "packages/dev/app-to-app/sdk_integration/doc/" } else { "packages/app-to-app/sdk_integration/doc/" }.to_string());
        return pkg;
    }

    // A2A TefSdk: AditumSdkService-{P|D}-TefSdk-{arch}-{version}.A2A.{hash}-release.apk
    let re = Regex::new(r"^AditumSdkService-([PD])-TefSdk-(armeabi-v7a|arm64-v8a)-(\d+\.\d+\.\d+)\.A2A\.(\d+)-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let arch = caps.get(2).unwrap().as_str();
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("TefSdk".to_string());
        pkg.category = Some(if arch == "armeabi-v7a" { "v7a" } else { "v8a" }.to_string());
        pkg.version = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(4).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        let arch_path = if arch == "armeabi-v7a" { "v7a" } else { "v8a" };
        pkg.jfrog_path = Some(if pkg.is_dev { 
            format!("packages/dev/app-to-app/tef-android/{}/", arch_path) 
        } else { 
            format!("packages/app-to-app/tef-android/{}/", arch_path) 
        });
        return pkg;
    }

    // A2A Device APK Signed: SmartPosTef-{device}-{P|D}-{version}.A2A.{hash}[-{signature}]-release_sign.apk
    let re = Regex::new(r"^SmartPosTef-([A-Za-z0-9_]+)-([PD])-(\d+\.\d+\.\d+)\.A2A\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release_sign\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Device APK".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(2).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = true;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // A2A Device APK Unsigned: SmartPosTef-{device}-{P|D}-{version}.A2A.{hash}[-{signature}]-release.apk
    let re = Regex::new(r"^SmartPosTef-([A-Za-z0-9_]+)-([PD])-(\d+\.\d+\.\d+)\.A2A\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Device APK".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(2).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/app-to-app/apk/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // A2A Payment Example Generic (no device): PaymentExample-{P|D}-{version}.A2A.{hash}-release.apk
    let re = Regex::new(r"^PaymentExample-([PD])-(\d+\.\d+\.\d+)\.A2A\.(\d+)-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some("Generic".to_string());
        pkg.category = Some("Payment Example".to_string());
        pkg.version = Some(caps.get(2).unwrap().as_str().to_string());
        pkg.hash = Some(caps.get(3).unwrap().as_str().to_string());
        pkg.is_dev = caps.get(1).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        
        pkg.jfrog_path = Some(if pkg.is_dev {
            "packages/dev/app-to-app/payment_example/".to_string()
        } else {
            "packages/app-to-app/payment_example/".to_string()
        });
        
        return pkg;
    }

    // A2A Payment Example Signed: PaymentExample-{device}-{P|D}-{version}.A2A.{hash}[-{signature}]-release_sign.apk
    let re = Regex::new(r"^PaymentExample-([A-Za-z0-9_]+)-([PD])-(\d+\.\d+\.\d+)\.A2A\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release_sign\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Payment Example".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(2).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = true;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // A2A Payment Example Unsigned: PaymentExample-{device}-{P|D}-{version}.A2A.{hash}[-{signature}]-release.apk
    let re = Regex::new(r"^PaymentExample-([A-Za-z0-9_]+)-([PD])-(\d+\.\d+\.\d+)\.A2A\.(\d+)(?:-([A-Za-z][A-Za-z0-9_]*))?-release\.apk$").unwrap();
    if let Some(caps) = re.captures(file_name) {
        let device_name = caps.get(1).unwrap().as_str();
        let device_key = device_name.to_uppercase();
        let device_info = DEVICE_MAP.get(device_key.as_str());
        
        pkg.platform = Some("A2A".to_string());
        pkg.device = Some(device_name.to_string());
        pkg.category = Some("Payment Example".to_string());
        let version_with_client = caps.get(3).unwrap().as_str();
        let hash = caps.get(4).unwrap().as_str();
        pkg.hash = Some(hash.to_string());
        pkg.is_dev = caps.get(2).unwrap().as_str().to_uppercase() == "D";
        pkg.is_signed = false;
        pkg.signature = caps.get(5).map(|m| m.as_str().to_string());
        
        let (base_version, client, _) = extract_client_from_version(&format!("{}.{}", version_with_client, hash), settings);
        pkg.version = Some(base_version);
        pkg.client = client;
        
        if let Some(info) = device_info {
            pkg.jfrog_path = Some(if pkg.is_dev {
                format!("packages/dev/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            } else {
                format!("packages/unsigned/app-to-app/payment_example/{}/{}/", info.manufacturer, info.path)
            });
        }
        
        return pkg;
    }

    // Package not recognized - return as Unknown
    pkg
}

// Normalize device name for SPF output
// P2_LITE_SE -> "P2 Lite", P2LITESE -> "P2 Lite", other devices stay as-is
fn normalize_device_name_for_spf(device: &str) -> String {
    let upper = device.to_uppercase();
    match upper.as_str() {
        "P2_LITE_SE" | "P2LITESE" | "P2_LITE" | "P2LITE" => "P2 Lite".to_string(),
        "DX4000" => "Dx4000".to_string(),
        "DX8000" => "Dx8000".to_string(),
        "EX4000" => "Ex4000".to_string(),
        _ => device.to_string(),
    }
}

// Transform internal device/category values to SPF-spec format
// The internal values are descriptive (for UI), but SPF spec requires specific column values
fn transform_to_spf_format(platform: &str, device: &str, category: &str) -> (String, String) {
    match platform {
        "Windows" => {
            // Windows packages: device maps to "TEF Library" or "TEF Installer"
            // Category: "DLL" -> "None", "Online" -> "Online", "Offline" -> "Offline"
            let spf_device = match device {
                "TEF Library" => "TEF Library".to_string(),
                "Installer" => "TEF Installer".to_string(),
                _ => device.to_string(),
            };
            let spf_category = match category {
                "DLL" | "Library" => "None".to_string(),
                "Online" => "Online".to_string(),
                "Offline" => "Offline".to_string(),
                _ => category.to_string(),
            };
            (spf_device, spf_category)
        },
        "Linux64" | "Linux32" => {
            // Linux packages: same as Windows mapping
            let spf_device = match device {
                "TEF Library" => "TEF Library".to_string(),
                "Installer" => "TEF Installer".to_string(),
                _ => device.to_string(),
            };
            let spf_category = match category {
                "Library" => "None".to_string(),
                "Online" => "Online".to_string(),
                "Offline" => "Offline".to_string(),
                _ => category.to_string(),
            };
            (spf_device, spf_category)
        },
        "Embedded" => {
            // Embedded: device is "S920", category should be empty
            (device.to_string(), String::new())
        },
        "STA" => {
            // STA: device is the device name (normalized), category is "Launcher" or "App"
            let spf_device = normalize_device_name_for_spf(device);
            (spf_device, category.to_string())
        },
        "A2A" => {
            // A2A packages have specific SPF format:
            // AAR: Device/Type="AAR", Category=""
            // Doc: Device/Type="Doc", Category=""
            // TefSdk: Device/Type="TefSdk", Category="v7a"/"v8a"
            // PaymentExample generic: Device/Type="", Category="Example"
            // PaymentExample device: Device/Type=device, Category="Example"
            // Device APK: Device/Type=device, Category=""
            match category {
                "AAR" => ("AAR".to_string(), String::new()),
                "Documentation" => ("Doc".to_string(), String::new()),
                "v7a" | "v8a" => ("TefSdk".to_string(), category.to_string()),
                "Payment Example" | "Example" => {
                    if device == "Generic" || device.is_empty() {
                        // Generic PaymentExample: empty device, category="Example"
                        (String::new(), "Example".to_string())
                    } else {
                        // Device-specific PaymentExample: device name, category="Example"
                        (normalize_device_name_for_spf(device), "Example".to_string())
                    }
                },
                "Device APK" | _ if category == "Device APK" => {
                    // Device APK: device name, empty category
                    (normalize_device_name_for_spf(device), String::new())
                },
                _ => {
                    // Fallback: normalize device name
                    (normalize_device_name_for_spf(device), category.to_string())
                }
            }
        },
        _ => (device.to_string(), category.to_string()),
    }
}

/// Extract content between <tag> and </tag> from SPF text.
fn extract_section(content: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    let start = content.find(&open)? + open.len();
    let end = content.find(&close)?;
    if start > end { return None; }
    Some(content[start..end].to_string())
}

/// Reverse-transform SPF format back to internal format.
/// This is the inverse of transform_to_spf_format.
fn transform_from_spf_format(platform: &str, spf_device: &str, spf_category: &str) -> (String, String) {
    match platform {
        "Windows" => {
            let device = match spf_device {
                "TEF Library" => "TEF Library".to_string(),
                "TEF Installer" => "Installer".to_string(),
                _ => spf_device.to_string(),
            };
            let category = match spf_category {
                "None" | "" => "DLL".to_string(),
                "Online" => "Online".to_string(),
                "Offline" => "Offline".to_string(),
                _ => spf_category.to_string(),
            };
            (device, category)
        },
        "Linux64" | "Linux32" => {
            let device = match spf_device {
                "TEF Library" => "TEF Library".to_string(),
                "TEF Installer" => "Installer".to_string(),
                _ => spf_device.to_string(),
            };
            let category = match spf_category {
                "None" | "" => "Library".to_string(),
                "Online" => "Online".to_string(),
                "Offline" => "Offline".to_string(),
                _ => spf_category.to_string(),
            };
            (device, category)
        },
        "Embedded" => {
            (spf_device.to_string(), String::new())
        },
        "STA" => {
            // Reverse normalize: "P2 Lite" -> "P2_LITE_SE", etc.
            let device = denormalize_device_name(spf_device);
            (device, spf_category.to_string())
        },
        "A2A" => {
            match spf_device {
                "AAR" => ("Generic".to_string(), "AAR".to_string()),
                "Doc" => ("Generic".to_string(), "Documentation".to_string()),
                "TefSdk" => ("Generic".to_string(), spf_category.to_string()),
                _ if spf_category == "Example" => {
                    if spf_device.is_empty() {
                        ("Generic".to_string(), "Payment Example".to_string())
                    } else {
                        (denormalize_device_name(spf_device), "Payment Example".to_string())
                    }
                },
                _ => {
                    let device = if spf_device.is_empty() { "Generic".to_string() } else { denormalize_device_name(spf_device) };
                    let category = if spf_category.is_empty() { "Device APK".to_string() } else { spf_category.to_string() };
                    (device, category)
                }
            }
        },
        "Custom" => {
            // Custom platforms: device is the custom name, category is empty
            (spf_device.to_string(), spf_category.to_string())
        },
        _ => (spf_device.to_string(), spf_category.to_string()),
    }
}

/// Reverse of normalize_device_name_for_spf
fn denormalize_device_name(name: &str) -> String {
    match name {
        "P2 Lite" => "P2_LITE_SE".to_string(),
        "Dx4000" => "DX4000".to_string(),
        "Dx8000" => "DX8000".to_string(),
        "Ex4000" => "EX4000".to_string(),
        _ => name.to_string(),
    }
}

// Tauri commands module
mod commands {
    use super::*;

    #[tauri::command]
    pub fn get_app_version() -> String {
        let conf: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json"))
            .unwrap_or_default();
        conf.get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("0.0.0")
            .to_string()
    }

    #[tauri::command]
    pub fn get_app_paths() -> AppPaths {
        log_to_file("DEBUG", "APP_PATHS: Retrieving application paths", None);
        let app_dir = get_app_data_dir();
        let paths = AppPaths {
            user_data: app_dir.to_string_lossy().to_string(),
            releases: app_dir.join("releases").to_string_lossy().to_string(),
            html: app_dir.join("html").to_string_lossy().to_string(),
            logs: app_dir.join("logs").to_string_lossy().to_string(),
        };
        log_to_file("DEBUG", "APP_PATHS: Paths retrieved", Some(&format!(
            "User data: {}\n  Releases: {}\n  HTML: {}\n  Logs: {}",
            paths.user_data, paths.releases, paths.html, paths.logs
        )));
        paths
    }

    #[tauri::command]
    pub fn get_settings() -> Settings {
        log_to_file("DEBUG", "SETTINGS: Loading settings", None);
        let settings = load_settings();
        log_to_file("DEBUG", "SETTINGS: Settings loaded", Some(&format!(
            "API key configured: {}\n  Client mappings: {}\n  Portal title: {}",
            !settings.jfrog_api_key.is_empty(),
            settings.client_mappings.len(),
            settings.portal_settings.portal_title
        )));
        settings
    }

    #[tauri::command]
    pub fn save_settings(settings: Settings) -> Result<(), String> {
        log_to_file("INFO", "SETTINGS: Saving settings", Some(&format!(
            "API key configured: {}\n  Client mappings: {}\n  Custom platforms: {}\n  Portal title: {}\n  Company name: {}",
            !settings.jfrog_api_key.is_empty(),
            settings.client_mappings.len(),
            settings.custom_platforms.len(),
            settings.portal_settings.portal_title,
            settings.portal_settings.company_name
        )));
        ensure_directories();
        let settings_path = get_app_data_dir().join("settings.json");
        let content = serde_json::to_string_pretty(&settings).map_err(|e| {
            log_to_file("ERROR", "SETTINGS: Failed to serialize settings", Some(&e.to_string()));
            e.to_string()
        })?;
        fs::write(&settings_path, &content).map_err(|e| {
            log_to_file("ERROR", "SETTINGS: Failed to write settings file", Some(&e.to_string()));
            e.to_string()
        })?;
        log_to_file("INFO", "SETTINGS: Settings saved successfully", Some(&format!("Path: {}", settings_path.display())));
        Ok(())
    }

    #[tauri::command]
    pub fn get_releases() -> Vec<Release> {
        log_to_file("DEBUG", "RELEASES: Loading releases", None);
        let releases = load_releases();
        log_to_file("DEBUG", "RELEASES: Releases loaded", Some(&format!("Count: {}", releases.len())));
        releases
    }

    #[tauri::command]
    pub fn save_release(release: Release) -> Result<(), String> {
        log_to_file("INFO", "RELEASE: Starting save release operation", Some(&format!(
            "Release ID: {}\n  Version: {}\n  Date: {}\n  Type: {}\n  Packages count: {}\n  Timestamp: {}",
            release.id,
            release.version,
            release.date,
            release.release_type,
            release.packages.len(),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f")
        )));
        
        ensure_directories();
        let releases_path = get_app_data_dir().join("releases.json");
        let mut releases = load_releases();
        
        let is_update = releases.iter().any(|r| r.id == release.id);
        let version = release.version.clone();
        let release_type = release.release_type.clone();
        let packages_count = release.packages.len();
        
        // Log package details
        for (i, pkg) in release.packages.iter().enumerate() {
            log_to_file("DEBUG", &format!("RELEASE: Package {} of {}", i + 1, packages_count), Some(&format!(
                "Platform: {}\n  Device: {}\n  Category: {}\n  Signature: {}\n  Client: {}\n  URL: {}",
                pkg.platform,
                pkg.device,
                pkg.category,
                pkg.signature,
                pkg.client,
                pkg.url
            )));
        }
        
        if let Some(pos) = releases.iter().position(|r| r.id == release.id) {
            releases[pos] = release;
        } else {
            releases.push(release);
        }
        
        let content = serde_json::to_string_pretty(&releases).map_err(|e| {
            log_to_file("ERROR", "RELEASE: Failed to serialize releases", Some(&e.to_string()));
            e.to_string()
        })?;
        fs::write(&releases_path, &content).map_err(|e| {
            log_to_file("ERROR", "RELEASE: Failed to write releases file", Some(&format!(
                "Path: {}\n  Error: {}",
                releases_path.display(), e
            )));
            e.to_string()
        })?;
        
        if is_update {
            log_to_file("INFO", "RELEASE: Release updated successfully", Some(&format!(
                "Version: {}\n  Type: {}\n  Packages: {}\n  Total releases: {}\n  File: {}",
                version,
                release_type,
                packages_count,
                releases.len(),
                releases_path.display()
            )));
        } else {
            log_to_file("INFO", "RELEASE: Release created successfully", Some(&format!(
                "Version: {}\n  Type: {}\n  Packages: {}\n  Total releases: {}\n  File: {}",
                version,
                release_type,
                packages_count,
                releases.len(),
                releases_path.display()
            )));
        }
        Ok(())
    }

    #[tauri::command]
    pub fn delete_release(id: String) -> Result<(), String> {
        log_to_file("INFO", "RELEASE: Starting delete release operation", Some(&format!(
            "Release ID: {}\n  Timestamp: {}",
            id,
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f")
        )));
        
        let releases_path = get_app_data_dir().join("releases.json");
        let mut releases = load_releases();
        let original_count = releases.len();
        
        // Find the release to log its details before deletion
        if let Some(release) = releases.iter().find(|r| r.id == id) {
            log_to_file("DEBUG", "RELEASE: Found release to delete", Some(&format!(
                "Version: {}\n  Date: {}\n  Type: {}\n  Packages: {}",
                release.version,
                release.date,
                release.release_type,
                release.packages.len()
            )));
        } else {
            log_to_file("WARNING", "RELEASE: Release not found for deletion", Some(&format!(
                "ID: {}\n  Available releases: {}",
                id,
                releases.iter().map(|r| r.id.clone()).collect::<Vec<_>>().join(", ")
            )));
        }
        
        releases.retain(|r| r.id != id);
        let content = serde_json::to_string_pretty(&releases).map_err(|e| {
            log_to_file("ERROR", "RELEASE: Failed to serialize releases after deletion", Some(&e.to_string()));
            e.to_string()
        })?;
        fs::write(&releases_path, &content).map_err(|e| {
            log_to_file("ERROR", "RELEASE: Failed to write releases file after deletion", Some(&format!(
                "Path: {}\n  Error: {}",
                releases_path.display(), e
            )));
            e.to_string()
        })?;
        
        log_to_file("INFO", "RELEASE: Release deleted successfully", Some(&format!(
            "Deleted ID: {}\n  Releases before: {}\n  Releases after: {}\n  File: {}",
            id,
            original_count,
            releases.len(),
            releases_path.display()
        )));
        Ok(())
    }

    #[tauri::command]
    pub fn scan_folder(folder_path: String) -> Result<ScanResult, String> {
        log_to_file("INFO", "SCAN_FOLDER: Starting folder scan operation", Some(&format!(
            "Folder path: {}\n  Timestamp: {}\n  Operation: Scanning for package files",
            folder_path,
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f")
        )));
        
        let path = Path::new(&folder_path);
        if !path.exists() {
            log_to_file("ERROR", "SCAN_FOLDER: Folder does not exist", Some(&format!(
                "Attempted path: {}\n  Error: Directory not found on filesystem",
                folder_path
            )));
            return Err("Folder does not exist".to_string());
        }

        let settings = load_settings();
        log_to_file("DEBUG", "SCAN_FOLDER: Settings loaded", Some(&format!(
            "Client mappings count: {}\n  Mappings: {:?}",
            settings.client_mappings.len(),
            settings.client_mappings.iter().map(|m| format!("{}={}", m.number, m.name)).collect::<Vec<_>>().join(", ")
        )));
        
        let mut packages = Vec::new();
        let extensions = ["apk", "aar", "dll", "so", "zip", "lib", "exe"];
        let mut files_scanned = 0;
        let mut files_matched = 0;
        let mut files_skipped = Vec::new();

        for entry in WalkDir::new(path).max_depth(1).into_iter().filter_map(|e| e.ok()) {
            let file_path = entry.path();
            if file_path.is_file() {
                files_scanned += 1;
                let file_name = file_path.file_name().unwrap_or_default().to_string_lossy();
                
                // Check extension or special files without extension (Linux installers)
                let has_valid_ext = file_path.extension()
                    .map(|ext| extensions.contains(&ext.to_string_lossy().to_lowercase().as_str()))
                    .unwrap_or(false);
                
                let is_linux_installer = file_name.contains("-online") || file_name.contains("-offline");
                
                if has_valid_ext || is_linux_installer {
                    files_matched += 1;
                    let pkg_info = parse_package(
                        &file_name,
                        &file_path.to_string_lossy(),
                        &settings
                    );
                    
                    // Log each detected package with full details
                    log_to_file("DEBUG", &format!("SCAN_FOLDER: Package detected - {}", file_name), Some(&format!(
                        "File: {}\n  Size: {} bytes ({:.2} MB)\n  Platform: {}\n  Device: {}\n  Category: {}\n  Version: {}\n  Hash: {}\n  Is Dev: {}\n  Is Signed: {}\n  Client: {}\n  JFrog Path: {}\n  Special Handling: {}\n  Signature: {}",
                        pkg_info.file_path,
                        pkg_info.size,
                        pkg_info.size as f64 / 1_048_576.0,
                        pkg_info.platform.as_deref().unwrap_or("Unknown"),
                        pkg_info.device.as_deref().unwrap_or("Unknown"),
                        pkg_info.category.as_deref().unwrap_or("None"),
                        pkg_info.version.as_deref().unwrap_or("None"),
                        pkg_info.hash.as_deref().unwrap_or("None"),
                        pkg_info.is_dev,
                        pkg_info.is_signed,
                        pkg_info.client.as_deref().unwrap_or("None"),
                        pkg_info.jfrog_path.as_deref().unwrap_or("None"),
                        pkg_info.special_handling.as_deref().unwrap_or("None"),
                        pkg_info.signature.as_deref().unwrap_or("None")
                    )));
                    
                    packages.push(pkg_info);
                } else {
                    files_skipped.push(file_name.to_string());
                }
            }
        }

        // Log skipped files if any
        if !files_skipped.is_empty() {
            log_to_file("DEBUG", "SCAN_FOLDER: Files skipped (not matching package patterns)", Some(&format!(
                "Count: {}\n  Files: {}",
                files_skipped.len(),
                files_skipped.join(", ")
            )));
        }

        // Detect if folder contains dev or prod packages (excluding companion files)
        let main_packages: Vec<&PackageInfo> = packages.iter()
            .filter(|p| p.special_handling.is_none())
            .collect();
        
        let dev_count = main_packages.iter().filter(|p| p.is_dev).count();
        let prod_count = main_packages.iter().filter(|p| !p.is_dev).count();
        let folder_is_dev = dev_count > 0 && prod_count == 0;

        log_to_file("DEBUG", "SCAN_FOLDER: Package type analysis", Some(&format!(
            "Main packages: {}\n  Development packages: {}\n  Production packages: {}\n  Folder classified as: {}",
            main_packages.len(),
            dev_count,
            prod_count,
            if folder_is_dev { "DEVELOPMENT" } else { "PRODUCTION" }
        )));

        // Update companion files to inherit dev/prod
        for pkg in &mut packages {
            if pkg.special_handling.is_some() {
                pkg.is_dev = folder_is_dev;
                // Update jfrogPath based on detected dev/prod
                if let Some(ref handling) = pkg.special_handling {
                    let old_path = pkg.jfrog_path.clone().unwrap_or_default();
                    pkg.jfrog_path = Some(match handling.as_str() {
                        "extract-x86_64" => if folder_is_dev { "packages/dev/linux/64/" } else { "packages/linux/64/" }.to_string(),
                        "extract-i386" => if folder_is_dev { "packages/dev/linux/32/" } else { "packages/linux/32/" }.to_string(),
                        "extract-x86" => if folder_is_dev { "packages/dev/windows/" } else { "packages/windows/" }.to_string(),
                        _ => pkg.jfrog_path.clone().unwrap_or_default(),
                    });
                    log_to_file("DEBUG", &format!("SCAN_FOLDER: Companion file path updated - {}", pkg.file_name), Some(&format!(
                        "Special handling: {}\n  Old path: {}\n  New path: {}\n  Is Dev: {}",
                        handling,
                        old_path,
                        pkg.jfrog_path.as_deref().unwrap_or("None"),
                        pkg.is_dev
                    )));
                }
            }
        }

        // Calculate total size
        let total_size: u64 = packages.iter().map(|p| p.size).sum();
        
        // ==================== VERSION DETECTION ====================
        // Collect all versions from non-companion packages
        let mut base_versions: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut companion_warnings: Vec<String> = Vec::new();
        
        for pkg in &packages {
            // Skip companion files for version detection
            if pkg.special_handling.is_some() {
                continue;
            }
            
            // Extract base version from package version
            if let Some(ref version) = pkg.version {
                if let Some(base) = extract_base_version(version) {
                    base_versions.insert(base);
                }
            }
        }
        
        log_to_file("DEBUG", "SCAN_FOLDER: Version detection", Some(&format!(
            "Unique base versions found: {}\n  Versions: {:?}",
            base_versions.len(),
            base_versions
        )));
        
        // Determine detected version and any errors
        let (detected_version, version_error, is_valid) = if base_versions.is_empty() {
            // No versions detected (only companion files or unknown packages)
            (None, None, true)
        } else if base_versions.len() == 1 {
            // All packages have the same base version - auto-fill
            let version = base_versions.into_iter().next().unwrap();
            log_to_file("INFO", "SCAN_FOLDER: Single version detected", Some(&format!(
                "Auto-detected version: {}",
                version
            )));
            (Some(version), None, true)
        } else {
            // Multiple different base versions - error
            let versions_list: Vec<String> = base_versions.into_iter().collect();
            let error_msg = format!(
                "Multiple different versions detected in folder: {}. Please ensure all packages are from the same release.",
                versions_list.join(", ")
            );
            log_to_file("ERROR", "SCAN_FOLDER: Multiple versions detected", Some(&format!(
                "Versions found: {:?}\n  Error: Cannot auto-detect version with mixed versions",
                versions_list
            )));
            (None, Some(error_msg), false)
        };
        
        // ==================== COMPANION FILE VALIDATION ====================
        // Check if companion files have corresponding online installers
        // Note: device="Installer" and category="Online"/"Offline" for installer packages
        let has_linux64_online = packages.iter().any(|p| 
            p.platform.as_deref() == Some("Linux64") && 
            p.device.as_deref() == Some("Installer") &&
            p.category.as_deref() == Some("Online")
        );
        let has_linux32_online = packages.iter().any(|p| 
            p.platform.as_deref() == Some("Linux32") && 
            p.device.as_deref() == Some("Installer") &&
            p.category.as_deref() == Some("Online")
        );
        let has_windows_online = packages.iter().any(|p| 
            p.platform.as_deref() == Some("Windows") && 
            p.device.as_deref() == Some("Installer") &&
            p.category.as_deref() == Some("Online")
        );
        
        for pkg in &packages {
            if let Some(ref handling) = pkg.special_handling {
                match handling.as_str() {
                    "extract-x86_64" if !has_linux64_online => {
                        companion_warnings.push(format!(
                            "Linux_64-Gui-Installer.zip found but no Linux 64-bit online installer detected. Please add the corresponding online installer."
                        ));
                    },
                    "extract-i386" if !has_linux32_online => {
                        companion_warnings.push(format!(
                            "Linux_i386-Installer.zip found but no Linux 32-bit online installer detected. Please add the corresponding online installer."
                        ));
                    },
                    "extract-x86" if !has_windows_online => {
                        companion_warnings.push(format!(
                            "x86.zip found but no Windows online installer detected. Please add the corresponding online installer."
                        ));
                    },
                    _ => {}
                }
            }
        }
        
        if !companion_warnings.is_empty() {
            log_to_file("WARNING", "SCAN_FOLDER: Companion file warnings", Some(&format!(
                "Warnings: {:?}",
                companion_warnings
            )));
        }
        
        // Log comprehensive summary
        log_to_file("INFO", "SCAN_FOLDER: Scan completed successfully", Some(&format!(
            "Folder: {}\n  Total files scanned: {}\n  Packages matched: {}\n  Files skipped: {}\n  Total size: {} bytes ({:.2} MB)\n  Detected version: {}\n  Is valid: {}\n  Package breakdown:\n    - Windows: {}\n    - Linux64: {}\n    - Linux32: {}\n    - Android: {}\n    - Unknown: {}\n  Type breakdown:\n    - Development: {}\n    - Production: {}\n    - Signed: {}\n    - Unsigned: {}",
            folder_path,
            files_scanned,
            files_matched,
            files_skipped.len(),
            total_size,
            total_size as f64 / 1_048_576.0,
            detected_version.as_deref().unwrap_or("None"),
            is_valid,
            packages.iter().filter(|p| p.platform.as_deref() == Some("Windows")).count(),
            packages.iter().filter(|p| p.platform.as_deref() == Some("Linux64")).count(),
            packages.iter().filter(|p| p.platform.as_deref() == Some("Linux32")).count(),
            packages.iter().filter(|p| p.platform.as_deref() == Some("Android")).count(),
            packages.iter().filter(|p| p.platform.is_none()).count(),
            packages.iter().filter(|p| p.is_dev).count(),
            packages.iter().filter(|p| !p.is_dev).count(),
            packages.iter().filter(|p| p.is_signed).count(),
            packages.iter().filter(|p| !p.is_signed).count()
        )));
        
        Ok(ScanResult {
            packages,
            detected_version,
            version_error,
            companion_warnings,
            is_valid,
        })
    }

    #[tauri::command]
    pub fn scan_files(file_paths: Vec<String>) -> Result<Vec<PackageInfo>, String> {
        log_to_file("INFO", "SCAN_FILES: Starting manual file scan operation", Some(&format!(
            "Files to scan: {}\n  Timestamp: {}\n  File list: {:?}",
            file_paths.len(),
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
            file_paths
        )));
        
        let settings = load_settings();
        let mut packages = Vec::new();
        let mut files_not_found = Vec::new();
        
        for file_path in &file_paths {
            let path = Path::new(&file_path);
            if path.exists() && path.is_file() {
                let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                let pkg_info = parse_package(&file_name, file_path, &settings);
                
                // Log each detected package with full details
                log_to_file("DEBUG", &format!("SCAN_FILES: Package detected - {}", file_name), Some(&format!(
                    "File: {}\n  Size: {} bytes ({:.2} MB)\n  Platform: {}\n  Device: {}\n  Category: {}\n  Version: {}\n  Hash: {}\n  Is Dev: {}\n  Is Signed: {}\n  Client: {}\n  JFrog Path: {}\n  Special Handling: {}\n  Signature: {}",
                    pkg_info.file_path,
                    pkg_info.size,
                    pkg_info.size as f64 / 1_048_576.0,
                    pkg_info.platform.as_deref().unwrap_or("Unknown"),
                    pkg_info.device.as_deref().unwrap_or("Unknown"),
                    pkg_info.category.as_deref().unwrap_or("None"),
                    pkg_info.version.as_deref().unwrap_or("None"),
                    pkg_info.hash.as_deref().unwrap_or("None"),
                    pkg_info.is_dev,
                    pkg_info.is_signed,
                    pkg_info.client.as_deref().unwrap_or("None"),
                    pkg_info.jfrog_path.as_deref().unwrap_or("None"),
                    pkg_info.special_handling.as_deref().unwrap_or("None"),
                    pkg_info.signature.as_deref().unwrap_or("None")
                )));
                
                packages.push(pkg_info);
            } else {
                files_not_found.push(file_path.clone());
                log_to_file("WARNING", &format!("SCAN_FILES: File not found - {}", file_path), None);
            }
        }
        
        // Calculate total size
        let total_size: u64 = packages.iter().map(|p| p.size).sum();
        
        log_to_file("INFO", "SCAN_FILES: Manual scan completed", Some(&format!(
            "Files requested: {}\n  Packages found: {}\n  Files not found: {}\n  Total size: {} bytes ({:.2} MB)\n  Missing files: {:?}",
            file_paths.len(),
            packages.len(),
            files_not_found.len(),
            total_size,
            total_size as f64 / 1_048_576.0,
            files_not_found
        )));
        
        Ok(packages)
    }

    #[tauri::command]
    pub async fn upload_to_jfrog(
        file_path: String,
        jfrog_path: String,
        api_key: String,
        base_url: Option<String>,
    ) -> Result<UploadResult, String> {
        let base_url = base_url.unwrap_or_else(|| "https://artifactory.aditum.com.br/artifactory".to_string());
        let upload_start = std::time::Instant::now();
        let api_key_masked = if api_key.len() > 8 {
            format!("{}...{}", &api_key[..4], &api_key[api_key.len()-4..])
        } else {
            "****".to_string()
        };
        
        log_to_file("INFO", "UPLOAD: Starting JFrog upload operation", Some(&format!(
            "Timestamp: {}\n  File path: {}\n  JFrog path: {}\n  API key: {} (masked)\n  Operation: PUT request to JFrog Artifactory",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
            file_path,
            jfrog_path,
            api_key_masked
        )));
        
        let path = Path::new(&file_path);
        if !path.exists() {
            log_to_file("ERROR", "UPLOAD: File not found - upload aborted", Some(&format!(
                "Attempted file path: {}\n  Error: File does not exist on filesystem\n  Duration: {:?}",
                file_path,
                upload_start.elapsed()
            )));
            return Ok(UploadResult {
                success: false,
                url: String::new(),
                message: "File not found".to_string(),
            });
        }

        let file_name = path.file_name().unwrap().to_string_lossy().to_string();
        let file_size = fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);
        
        let url = format!(
            "{}/{}{}",
            base_url, jfrog_path, file_name
        );
        
        log_to_file("DEBUG", "UPLOAD: Preparing upload request", Some(&format!(
            "File name: {}\n  File size: {} bytes ({:.2} MB)\n  Target URL: {}\n  Transfer method: Chunked streaming\n  Timeout: 600 seconds",
            file_name,
            file_size,
            file_size as f64 / 1_048_576.0,
            url
        )));

        // Use streaming upload with file handle instead of loading entire file into memory
        let file = tokio::fs::File::open(&file_path).await.map_err(|e| {
            log_to_file("ERROR", "UPLOAD: Failed to open file for reading", Some(&format!(
                "File: {}\n  Error: {}",
                file_path, e
            )));
            e.to_string()
        })?;
        let stream = tokio_util::io::ReaderStream::new(file);
        let body = reqwest::Body::wrap_stream(stream);

        // Create client with longer timeout for large files
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(600)) // 10 minute timeout
            .build()
            .map_err(|e| {
                log_to_file("ERROR", "UPLOAD: Failed to create HTTP client", Some(&e.to_string()));
                e.to_string()
            })?;
        
        log_to_file("DEBUG", "UPLOAD: Sending HTTP PUT request", Some(&format!(
            "URL: {}\n  Headers:\n    - X-JFrog-Art-Api: {} (masked)\n    - Content-Type: application/octet-stream\n    - Transfer-Encoding: chunked",
            url,
            api_key_masked
        )));
            
        // Use chunked transfer encoding by NOT setting Content-Length
        // This may help bypass nginx's client_max_body_size limit
        let response = client
            .put(&url)
            .header("X-JFrog-Art-Api", &api_key)
            .header("Content-Type", "application/octet-stream")
            .header("Transfer-Encoding", "chunked")
            .body(body)
            .send()
            .await
            .map_err(|e| {
                let elapsed = upload_start.elapsed();
                log_to_file("ERROR", "UPLOAD: HTTP request failed", Some(&format!(
                    "File: {}\n  URL: {}\n  Error: {}\n  Duration: {:?}\n  Possible causes:\n    - Network connectivity issues\n    - Server unreachable\n    - Timeout exceeded\n    - SSL/TLS certificate error",
                    file_name, url, e, elapsed
                )));
                e.to_string()
            })?;

        let status = response.status();
        let status_code = status.as_u16();
        let status_text = response.text().await.unwrap_or_default();
        let elapsed = upload_start.elapsed();
        
        if status.is_success() {
            let upload_speed = if elapsed.as_secs() > 0 {
                file_size as f64 / elapsed.as_secs_f64() / 1_048_576.0
            } else {
                0.0
            };
            
            log_to_file("INFO", "UPLOAD: Upload completed successfully", Some(&format!(
                "File: {}\n  URL: {}\n  Status: {} {}\n  File size: {} bytes ({:.2} MB)\n  Duration: {:?}\n  Upload speed: {:.2} MB/s\n  Response: {}",
                file_name,
                url,
                status_code,
                status.canonical_reason().unwrap_or("OK"),
                file_size,
                file_size as f64 / 1_048_576.0,
                elapsed,
                upload_speed,
                if status_text.len() > 500 { format!("{}...", &status_text[..500]) } else { status_text.clone() }
            )));
            
            Ok(UploadResult {
                success: true,
                url: url.clone(),
                message: format!("Uploaded successfully to {}", url),
            })
        } else {
            let error_msg = format!("Upload failed: {} {}", status, status_text);
            
            log_to_file("ERROR", "UPLOAD: Upload failed - server returned error", Some(&format!(
                "File: {}\n  URL: {}\n  Status code: {}\n  Status text: {}\n  Duration: {:?}\n  Response body: {}\n  Troubleshooting:\n    - 401: Invalid or expired API key\n    - 403: Insufficient permissions\n    - 404: Repository or path not found\n    - 413: Payload too large (nginx limit)\n    - 500: Server internal error",
                file_name,
                url,
                status_code,
                status.canonical_reason().unwrap_or("Unknown"),
                elapsed,
                if status_text.len() > 1000 { format!("{}...", &status_text[..1000]) } else { status_text }
            )));
            
            Ok(UploadResult {
                success: false,
                url: String::new(),
                message: error_msg,
            })
        }
    }

    // Extract ZIP and upload a specific folder to JFrog (for online installer companions)
    #[tauri::command]
    pub async fn extract_and_upload_to_jfrog(
        zip_path: String,
        extract_folder: String,
        jfrog_path: String,
        api_key: String,
        base_url: Option<String>,
    ) -> Result<UploadResult, String> {
        let base_url = base_url.unwrap_or_else(|| "https://artifactory.aditum.com.br/artifactory".to_string());
        let operation_start = std::time::Instant::now();
        let api_key_masked = if api_key.len() > 8 {
            format!("{}...{}", &api_key[..4], &api_key[api_key.len()-4..])
        } else {
            "****".to_string()
        };
        
        log_to_file("INFO", "EXTRACT_UPLOAD: Starting ZIP extraction and folder upload", Some(&format!(
            "Timestamp: {}\n  ZIP path: {}\n  Extract folder: {}\n  JFrog path: {}\n  API key: {} (masked)",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
            zip_path,
            extract_folder,
            jfrog_path,
            api_key_masked
        )));
        
        let zip_file_path = Path::new(&zip_path);
        if !zip_file_path.exists() {
            log_to_file("ERROR", "EXTRACT_UPLOAD: ZIP file not found", Some(&format!("Path: {}", zip_path)));
            return Ok(UploadResult {
                success: false,
                url: String::new(),
                message: "ZIP file not found".to_string(),
            });
        }
        
        // Create temp directory for extraction
        let temp_dir = std::env::temp_dir().join(format!("smartpostef_extract_{}", chrono::Utc::now().timestamp_millis()));
        fs::create_dir_all(&temp_dir).map_err(|e| {
            log_to_file("ERROR", "EXTRACT_UPLOAD: Failed to create temp directory", Some(&e.to_string()));
            e.to_string()
        })?;
        
        log_to_file("DEBUG", "EXTRACT_UPLOAD: Extracting ZIP file", Some(&format!(
            "ZIP: {}\n  Temp dir: {}\n  Target folder: {}",
            zip_path,
            temp_dir.display(),
            extract_folder
        )));
        
        // Extract ZIP file
        let file = File::open(&zip_path).map_err(|e| {
            log_to_file("ERROR", "EXTRACT_UPLOAD: Failed to open ZIP file", Some(&e.to_string()));
            e.to_string()
        })?;
        
        let mut archive = zip::ZipArchive::new(file).map_err(|e| {
            log_to_file("ERROR", "EXTRACT_UPLOAD: Failed to read ZIP archive", Some(&e.to_string()));
            e.to_string()
        })?;
        
        let mut extracted_count = 0;
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = temp_dir.join(file.name());
            
            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath).ok();
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent).ok();
                }
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
                extracted_count += 1;
            }
        }
        
        log_to_file("DEBUG", "EXTRACT_UPLOAD: ZIP extraction complete", Some(&format!(
            "Files extracted: {}\n  Looking for folder: {}",
            extracted_count,
            extract_folder
        )));
        
        // Find the target folder - search recursively since ZIPs may have nested structures
        // e.g., Linux_64-Gui-Installer.zip contains Linux_64-Gui-Installer/x86_64/
        let mut target_folder: Option<PathBuf> = None;
        
        // First try direct path
        let direct_path = temp_dir.join(&extract_folder);
        if direct_path.exists() && direct_path.is_dir() {
            target_folder = Some(direct_path);
        } else {
            // Search recursively for the folder
            for entry in WalkDir::new(&temp_dir).into_iter().filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(folder_name) = path.file_name() {
                        if folder_name.to_string_lossy() == extract_folder {
                            target_folder = Some(path.to_path_buf());
                            break;
                        }
                    }
                }
            }
        }
        
        let target_folder = match target_folder {
            Some(folder) => folder,
            None => {
                // List what was extracted for debugging
                let extracted_items: Vec<String> = WalkDir::new(&temp_dir)
                    .max_depth(3)
                    .into_iter()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.path().is_dir())
                    .map(|e| e.path().strip_prefix(&temp_dir).unwrap_or(e.path()).to_string_lossy().to_string())
                    .collect();
                
                // Cleanup temp directory
                let _ = fs::remove_dir_all(&temp_dir);
                
                log_to_file("ERROR", "EXTRACT_UPLOAD: Target folder not found in ZIP", Some(&format!(
                    "Expected folder: {}\n  Extracted directories: {:?}",
                    extract_folder,
                    extracted_items
                )));
                return Ok(UploadResult {
                    success: false,
                    url: String::new(),
                    message: format!("Folder '{}' not found in ZIP file. Found directories: {:?}", extract_folder, extracted_items),
                });
            }
        };
        
        log_to_file("DEBUG", "EXTRACT_UPLOAD: Found target folder", Some(&format!(
            "Target folder: {}\n  Full path: {}",
            extract_folder,
            target_folder.display()
        )));
        
        // Collect all files in the target folder
        let mut files_to_upload: Vec<PathBuf> = Vec::new();
        let mut total_size: u64 = 0;
        for entry in WalkDir::new(&target_folder).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                files_to_upload.push(path.to_path_buf());
                total_size += fs::metadata(path).map(|m| m.len()).unwrap_or(0);
            }
        }
        
        log_to_file("DEBUG", "EXTRACT_UPLOAD: Files collected for upload", Some(&format!(
            "Folder: {}\n  Total files: {}\n  Total size: {} bytes ({:.2} MB)",
            extract_folder,
            files_to_upload.len(),
            total_size,
            total_size as f64 / 1_048_576.0
        )));
        
        // Create HTTP client
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(600))
            .build()
            .map_err(|e| {
                log_to_file("ERROR", "EXTRACT_UPLOAD: Failed to create HTTP client", Some(&e.to_string()));
                e.to_string()
            })?;
        
        let mut uploaded_files = Vec::new();
        let mut failed_files: Vec<(String, String)> = Vec::new();
        
        // Upload each file
        for file_path in &files_to_upload {
            let relative_path = file_path.strip_prefix(&target_folder).unwrap_or(file_path);
            let file_name = file_path.file_name().unwrap().to_string_lossy().to_string();
            
            // Build the JFrog URL: jfrog_path + extract_folder + relative_path
            let relative_str = relative_path.to_string_lossy().replace("\\", "/");
            let url = format!(
                "{}/{}{}/{}",
                base_url, jfrog_path, extract_folder, relative_str
            );
            
            log_to_file("DEBUG", &format!("EXTRACT_UPLOAD: Uploading file - {}", file_name), Some(&format!(
                "Local path: {}\n  Remote URL: {}",
                file_path.display(),
                url
            )));
            
            // Read and upload file
            match tokio::fs::File::open(&file_path).await {
                Ok(file) => {
                    let stream = tokio_util::io::ReaderStream::new(file);
                    let body = reqwest::Body::wrap_stream(stream);
                    
                    match client
                        .put(&url)
                        .header("X-JFrog-Art-Api", &api_key)
                        .header("Content-Type", "application/octet-stream")
                        .header("Transfer-Encoding", "chunked")
                        .body(body)
                        .send()
                        .await
                    {
                        Ok(response) => {
                            if response.status().is_success() {
                                uploaded_files.push(file_name.clone());
                                log_to_file("DEBUG", &format!("EXTRACT_UPLOAD: File uploaded successfully - {}", file_name), None);
                            } else {
                                let status = response.status();
                                let error_text = response.text().await.unwrap_or_default();
                                failed_files.push((file_name.clone(), format!("{}: {}", status, error_text)));
                                log_to_file("ERROR", &format!("EXTRACT_UPLOAD: File upload failed - {}", file_name), Some(&format!(
                                    "Status: {}\n  Error: {}",
                                    status, error_text
                                )));
                            }
                        }
                        Err(e) => {
                            failed_files.push((file_name.clone(), e.to_string()));
                            log_to_file("ERROR", &format!("EXTRACT_UPLOAD: Request failed - {}", file_name), Some(&e.to_string()));
                        }
                    }
                }
                Err(e) => {
                    failed_files.push((file_name.clone(), e.to_string()));
                    log_to_file("ERROR", &format!("EXTRACT_UPLOAD: Failed to open file - {}", file_name), Some(&e.to_string()));
                }
            }
        }
        
        // Cleanup temp directory
        let _ = fs::remove_dir_all(&temp_dir);
        
        let elapsed = operation_start.elapsed();
        let success = failed_files.is_empty() && !uploaded_files.is_empty();
        
        if success {
            log_to_file("INFO", "EXTRACT_UPLOAD: Folder upload completed successfully", Some(&format!(
                "Folder: {}\n  Files uploaded: {}\n  Total size: {:.2} MB\n  Duration: {:?}\n  JFrog path: {}{}/",
                extract_folder,
                uploaded_files.len(),
                total_size as f64 / 1_048_576.0,
                elapsed,
                jfrog_path,
                extract_folder
            )));
            
            Ok(UploadResult {
                success: true,
                url: format!("{}/{}{}/", base_url, jfrog_path, extract_folder),
                message: format!("Uploaded {} files from folder {}", uploaded_files.len(), extract_folder),
            })
        } else if uploaded_files.is_empty() && !failed_files.is_empty() {
            let error_summary: Vec<String> = failed_files.iter().map(|(f, e)| format!("{}: {}", f, e)).collect();
            log_to_file("ERROR", "EXTRACT_UPLOAD: All uploads failed", Some(&format!(
                "Folder: {}\n  Duration: {:?}\n  Errors:\n    {}",
                extract_folder,
                elapsed,
                error_summary.join("\n    ")
            )));
            
            Ok(UploadResult {
                success: false,
                url: String::new(),
                message: format!("All {} files failed to upload", failed_files.len()),
            })
        } else {
            // Partial success - some files uploaded, some failed
            // Mark as success since some files were uploaded, but include failed files in message
            let failed_file_names: Vec<String> = failed_files.iter().map(|(f, _)| f.clone()).collect();
            let error_summary: Vec<String> = failed_files.iter().map(|(f, e)| format!("{}: {}", f, e)).collect();
            log_to_file("WARNING", "EXTRACT_UPLOAD: Folder upload completed with partial success", Some(&format!(
                "Folder: {}\n  Successful: {}\n  Failed: {}\n  Duration: {:?}\n  Failed files: {:?}\n  Errors:\n    {}",
                extract_folder,
                uploaded_files.len(),
                failed_files.len(),
                elapsed,
                failed_file_names,
                error_summary.join("\n    ")
            )));
            
            // Return success=true since some files were uploaded
            // Include the list of failed files in the message for user information
            Ok(UploadResult {
                success: true,
                url: format!("{}/{}{}/", base_url, jfrog_path, extract_folder),
                message: format!("Uploaded {} files. Failed: {}", uploaded_files.len(), failed_file_names.join(", ")),
            })
        }
    }

    // Extract ZIP root contents into a named folder and upload all files to JFrog
    // Used for unsigned S920 packages: ZIP root -> folder named after ZIP (without .zip) -> upload folder
    #[tauri::command]
    pub async fn extract_root_and_upload_to_jfrog(
        zip_path: String,
        folder_name: String,
        jfrog_path: String,
        api_key: String,
        base_url: Option<String>,
    ) -> Result<UploadResult, String> {
        let base_url = base_url.unwrap_or_else(|| "https://artifactory.aditum.com.br/artifactory".to_string());
        let operation_start = std::time::Instant::now();
        let api_key_masked = if api_key.len() > 8 {
            format!("{}...{}", &api_key[..4], &api_key[api_key.len()-4..])
        } else {
            "****".to_string()
        };
        
        log_to_file("INFO", "EXTRACT_ROOT_UPLOAD: Starting ZIP root extraction and folder upload", Some(&format!(
            "Timestamp: {}\n  ZIP path: {}\n  Folder name: {}\n  JFrog path: {}\n  API key: {} (masked)",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
            zip_path,
            folder_name,
            jfrog_path,
            api_key_masked
        )));
        
        let zip_file_path = Path::new(&zip_path);
        if !zip_file_path.exists() {
            log_to_file("ERROR", "EXTRACT_ROOT_UPLOAD: ZIP file not found", Some(&format!("Path: {}", zip_path)));
            return Ok(UploadResult {
                success: false,
                url: String::new(),
                message: "ZIP file not found".to_string(),
            });
        }
        
        // Create temp directory for extraction
        let temp_dir = std::env::temp_dir().join(format!("smartpostef_s920_{}", chrono::Utc::now().timestamp_millis()));
        let target_dir = temp_dir.join(&folder_name);
        fs::create_dir_all(&target_dir).map_err(|e| {
            log_to_file("ERROR", "EXTRACT_ROOT_UPLOAD: Failed to create target directory", Some(&e.to_string()));
            e.to_string()
        })?;
        
        log_to_file("DEBUG", "EXTRACT_ROOT_UPLOAD: Extracting ZIP root to named folder", Some(&format!(
            "ZIP: {}\n  Target dir: {}",
            zip_path,
            target_dir.display()
        )));
        
        // Extract ZIP contents into target_dir as a flat folder (files only, no subdirectories).
        // The ZIP may contain files at root level OR inside a subfolder like PAX_S920/.
        // In either case, only the actual files are placed directly in target_dir.
        let file = File::open(&zip_path).map_err(|e| {
            log_to_file("ERROR", "EXTRACT_ROOT_UPLOAD: Failed to open ZIP file", Some(&e.to_string()));
            e.to_string()
        })?;
        
        let mut archive = zip::ZipArchive::new(file).map_err(|e| {
            log_to_file("ERROR", "EXTRACT_ROOT_UPLOAD: Failed to read ZIP archive", Some(&e.to_string()));
            e.to_string()
        })?;
        
        // Extract only files (skip directories), placing each file directly in target_dir
        // by using only the file_name() portion, stripping any directory paths.
        let mut extracted_count = 0;
        let mut skipped_dirs = Vec::new();
        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
            let entry_name = entry.name().to_string();
            
            // Skip directory entries
            if entry_name.ends_with('/') {
                skipped_dirs.push(entry_name);
                continue;
            }
            
            // Get just the file name, stripping any folder path (e.g., "PAX_S920/file.aup" -> "file.aup")
            let file_name_only = Path::new(&entry_name)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or(entry_name.clone());
            
            if file_name_only.is_empty() {
                continue;
            }
            
            let outpath = target_dir.join(&file_name_only);
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
            extracted_count += 1;
        }
        
        log_to_file("DEBUG", "EXTRACT_ROOT_UPLOAD: ZIP extraction complete (flat)", Some(&format!(
            "Files extracted: {}\n  Skipped directories: {:?}\n  Target folder: {}",
            extracted_count,
            skipped_dirs,
            target_dir.display()
        )));
        
        // Collect all files in the target folder
        let mut files_to_upload: Vec<PathBuf> = Vec::new();
        let mut total_size: u64 = 0;
        for entry in WalkDir::new(&target_dir).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                files_to_upload.push(path.to_path_buf());
                total_size += fs::metadata(path).map(|m| m.len()).unwrap_or(0);
            }
        }
        
        if files_to_upload.is_empty() {
            let _ = fs::remove_dir_all(&temp_dir);
            log_to_file("ERROR", "EXTRACT_ROOT_UPLOAD: No files found after extraction", None);
            return Ok(UploadResult {
                success: false,
                url: String::new(),
                message: "No files found in ZIP after extraction".to_string(),
            });
        }
        
        log_to_file("DEBUG", "EXTRACT_ROOT_UPLOAD: Files collected for upload", Some(&format!(
            "Folder: {}\n  Total files: {}\n  Total size: {} bytes ({:.2} MB)",
            folder_name,
            files_to_upload.len(),
            total_size,
            total_size as f64 / 1_048_576.0
        )));
        
        // Create HTTP client
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(600))
            .build()
            .map_err(|e| {
                log_to_file("ERROR", "EXTRACT_ROOT_UPLOAD: Failed to create HTTP client", Some(&e.to_string()));
                e.to_string()
            })?;
        
        let mut uploaded_files = Vec::new();
        let mut failed_files: Vec<(String, String)> = Vec::new();
        
        // Upload each file preserving folder structure under folder_name/
        for file_path in &files_to_upload {
            let relative_path = file_path.strip_prefix(&target_dir).unwrap_or(file_path);
            let file_name = file_path.file_name().unwrap().to_string_lossy().to_string();
            
            // Build the JFrog URL: jfrog_path + folder_name + / + relative_path
            let relative_str = relative_path.to_string_lossy().replace("\\", "/");
            let url = format!(
                "{}/{}{}/{}",
                base_url, jfrog_path, folder_name, relative_str
            );
            
            log_to_file("DEBUG", &format!("EXTRACT_ROOT_UPLOAD: Uploading file - {}", file_name), Some(&format!(
                "Local path: {}\n  Remote URL: {}",
                file_path.display(),
                url
            )));
            
            // Read and upload file
            match tokio::fs::File::open(&file_path).await {
                Ok(file) => {
                    let stream = tokio_util::io::ReaderStream::new(file);
                    let body = reqwest::Body::wrap_stream(stream);
                    
                    match client
                        .put(&url)
                        .header("X-JFrog-Art-Api", &api_key)
                        .header("Content-Type", "application/octet-stream")
                        .header("Transfer-Encoding", "chunked")
                        .body(body)
                        .send()
                        .await
                    {
                        Ok(response) => {
                            if response.status().is_success() {
                                uploaded_files.push(file_name.clone());
                                log_to_file("DEBUG", &format!("EXTRACT_ROOT_UPLOAD: File uploaded successfully - {}", file_name), None);
                            } else {
                                let status = response.status();
                                let error_text = response.text().await.unwrap_or_default();
                                failed_files.push((file_name.clone(), format!("{}: {}", status, error_text)));
                                log_to_file("ERROR", &format!("EXTRACT_ROOT_UPLOAD: File upload failed - {}", file_name), Some(&format!(
                                    "Status: {}\n  Error: {}",
                                    status, error_text
                                )));
                            }
                        }
                        Err(e) => {
                            failed_files.push((file_name.clone(), e.to_string()));
                            log_to_file("ERROR", &format!("EXTRACT_ROOT_UPLOAD: Request failed - {}", file_name), Some(&e.to_string()));
                        }
                    }
                }
                Err(e) => {
                    failed_files.push((file_name.clone(), e.to_string()));
                    log_to_file("ERROR", &format!("EXTRACT_ROOT_UPLOAD: Failed to open file - {}", file_name), Some(&e.to_string()));
                }
            }
        }
        
        // Cleanup temp directory
        let _ = fs::remove_dir_all(&temp_dir);
        
        let elapsed = operation_start.elapsed();
        let success = failed_files.is_empty() && !uploaded_files.is_empty();
        
        if success {
            log_to_file("INFO", "EXTRACT_ROOT_UPLOAD: Folder upload completed successfully", Some(&format!(
                "Folder: {}\n  Files uploaded: {}\n  Total size: {:.2} MB\n  Duration: {:?}\n  JFrog path: {}{}/",
                folder_name,
                uploaded_files.len(),
                total_size as f64 / 1_048_576.0,
                elapsed,
                jfrog_path,
                folder_name
            )));
            
            Ok(UploadResult {
                success: true,
                url: format!("{}/{}{}/", base_url, jfrog_path, folder_name),
                message: format!("Extracted and uploaded {} files to {}{}/", uploaded_files.len(), jfrog_path, folder_name),
            })
        } else if uploaded_files.is_empty() && !failed_files.is_empty() {
            let error_summary: Vec<String> = failed_files.iter().map(|(f, e)| format!("{}: {}", f, e)).collect();
            log_to_file("ERROR", "EXTRACT_ROOT_UPLOAD: All uploads failed", Some(&format!(
                "Failed files: {:?}",
                error_summary
            )));
            Ok(UploadResult {
                success: false,
                url: String::new(),
                message: format!("All {} uploads failed: {}", failed_files.len(), error_summary.join("; ")),
            })
        } else {
            let failed_file_names: Vec<String> = failed_files.iter().map(|(f, _)| f.clone()).collect();
            log_to_file("WARN", "EXTRACT_ROOT_UPLOAD: Partial upload success", Some(&format!(
                "Uploaded: {}\n  Failed: {}",
                uploaded_files.len(),
                failed_file_names.join(", ")
            )));
            Ok(UploadResult {
                success: true,
                url: format!("{}/{}{}/", base_url, jfrog_path, folder_name),
                message: format!("Uploaded {} files. Failed: {}", uploaded_files.len(), failed_file_names.join(", ")),
            })
        }
    }

    #[tauri::command]
    pub fn calculate_md5(file_path: String) -> Result<String, String> {
        log_to_file("DEBUG", "MD5: Calculating MD5 hash", Some(&format!("File: {}", file_path)));
        let mut file = File::open(&file_path).map_err(|e| {
            log_to_file("ERROR", "MD5: Failed to open file", Some(&format!("File: {}\n  Error: {}", file_path, e)));
            e.to_string()
        })?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        let digest = md5::compute(&buffer);
        let hash = format!("{:x}", digest);
        log_to_file("DEBUG", "MD5: Hash calculated", Some(&format!("File: {}\n  MD5: {}", file_path, hash)));
        Ok(hash)
    }

    #[tauri::command]
    pub fn create_zip(source_path: String, dest_path: String) -> Result<String, String> {
        log_to_file("INFO", "ZIP: Creating ZIP archive", Some(&format!("Source: {}\n  Destination: {}", source_path, dest_path)));
        let source = Path::new(&source_path);
        let dest = Path::new(&dest_path);
        
        let file = File::create(dest).map_err(|e| {
            log_to_file("ERROR", "ZIP: Failed to create ZIP file", Some(&e.to_string()));
            e.to_string()
        })?;
        let mut zip = zip::ZipWriter::new(file);
        
        let options = zip::write::FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        
        if source.is_file() {
            let file_name = source.file_name().unwrap().to_string_lossy().to_string();
            zip.start_file(&file_name, options).map_err(|e| e.to_string())?;
            let content = fs::read(source).map_err(|e| e.to_string())?;
            zip.write_all(&content).map_err(|e| e.to_string())?;
        }
        
        zip.finish().map_err(|e| e.to_string())?;
        log_to_file("INFO", "ZIP: ZIP archive created successfully", Some(&format!("Output: {}", dest_path)));
        Ok(dest_path)
    }

    #[tauri::command]
    pub fn generate_spf_content(release: Release) -> Result<String, String> {
        log_to_file("INFO", "SPF: Generating SPF content", Some(&format!(
            "Version: {}\n  Date: {}\n  Type: {}\n  Packages: {}",
            release.version, release.date, release.release_type, release.packages.len()
        )));
        // Generate SPF file in the correct format (NOT JSON)
        // SPF format has three sections: <release_info>, <release_notes>, <release_pkgs>
        
        let mut content = String::new();
        
        // Section 1: <release_info>
        content.push_str("<release_info>\n");
        content.push_str(&format!("version={}\n", release.version));
        content.push_str(&format!("date={}\n", release.date));
        // type should be lowercase: "production" or "development"
        let release_type_lower = release.release_type.to_lowercase();
        content.push_str(&format!("type={}\n", release_type_lower));
        if !release.description.is_empty() {
            content.push_str(&format!("description={}\n", release.description));
        }
        content.push_str("</release_info>\n\n");
        
        // Section 2: <release_notes>
        content.push_str("<release_notes>\n");
        if !release.release_notes.is_empty() {
            content.push_str(&release.release_notes);
            if !release.release_notes.ends_with('\n') {
                content.push('\n');
            }
        }
        content.push_str("</release_notes>\n\n");
        
        // Section 3: <release_pkgs>
        content.push_str("<release_pkgs>\n");
        // CSV header
        content.push_str("Platform;Device/Type;Category;Signature;Client;URL\n");
        
        // Add each package as a CSV row, transforming internal values to SPF-spec format
        for pkg in &release.packages {
            let platform = &pkg.platform;
            let (spf_device, spf_category) = transform_to_spf_format(platform, &pkg.device, &pkg.category);
            let signature = &pkg.signature;
            let client = &pkg.client;
            let url = &pkg.url;
            
            content.push_str(&format!(
                "{};{};{};{};{};{}\n",
                platform, spf_device, spf_category, signature, client, url
            ));
        }
        
        content.push_str("</release_pkgs>");
        
        log_to_file("INFO", "SPF: SPF content generated successfully", Some(&format!(
            "Content length: {} bytes\n  Packages included: {}",
            content.len(), release.packages.len()
        )));
        Ok(content)
    }

    #[tauri::command]
    pub fn save_spf_file(content: String, file_path: String) -> Result<(), String> {
        log_to_file("INFO", "SPF: Saving SPF file", Some(&format!("Path: {}\n  Content length: {} bytes", file_path, content.len())));
        fs::write(&file_path, &content).map_err(|e| {
            log_to_file("ERROR", "SPF: Failed to save SPF file", Some(&format!("Path: {}\n  Error: {}", file_path, e)));
            e.to_string()
        })?;
        log_to_file("INFO", "SPF: SPF file saved successfully", Some(&format!("Path: {}", file_path)));
        Ok(())
    }

    #[tauri::command]
    pub fn generate_html(release: Release) -> Result<String, String> {
        log_to_file("INFO", &format!("Generating HTML for release: {}", release.version), None);
        
        let html_dir = get_app_data_dir().join("html");
        fs::create_dir_all(&html_dir).map_err(|e| e.to_string())?;
        
        let type_short = get_type_short(&release);
        let filename = format!("release_{}-{}-{}.html", release.version, release.date, type_short);
        let html_path = html_dir.join(&filename);
        
        // Generate HTML content
        let html_content = generate_html_content(&release);
        
        fs::write(&html_path, html_content).map_err(|e| e.to_string())?;
        
        log_to_file("INFO", &format!("HTML generated: {}", html_path.display()), None);
        
        Ok(html_path.to_string_lossy().to_string())
    }

    fn generate_html_content(release: &Release) -> String {
        let release_type = &release.release_type;
        let packages = &release.packages;
        let release_notes = &release.release_notes;
        
        // Group packages by platform
        let mut windows_packages: Vec<&PackageData> = Vec::new();
        let mut linux64_packages: Vec<&PackageData> = Vec::new();
        let mut linux32_packages: Vec<&PackageData> = Vec::new();
        let mut sta_packages: Vec<&PackageData> = Vec::new();
        let mut a2a_packages: Vec<&PackageData> = Vec::new();
        let mut embedded_packages: Vec<&PackageData> = Vec::new();
        let mut other_packages: Vec<&PackageData> = Vec::new();
        
        for pkg in packages {
            let platform_lower = pkg.platform.to_lowercase();
            if platform_lower.contains("windows") {
                windows_packages.push(pkg);
            } else if platform_lower.contains("linux64") || platform_lower.contains("linux 64") {
                linux64_packages.push(pkg);
            } else if platform_lower.contains("linux32") || platform_lower.contains("linux 32") {
                linux32_packages.push(pkg);
            } else if platform_lower.contains("sta") || platform_lower.contains("standalone") || platform_lower.contains("smart pos") {
                sta_packages.push(pkg);
            } else if platform_lower.contains("a2a") || platform_lower.contains("app to app") {
                a2a_packages.push(pkg);
            } else if platform_lower.contains("embedded") || platform_lower.contains("s920") {
                embedded_packages.push(pkg);
            } else {
                other_packages.push(pkg);
            }
        }
        
        // Generate sections
        let mut sections_html = String::new();
        
        // TEF Section (Windows, Linux)
        if !windows_packages.is_empty() || !linux64_packages.is_empty() || !linux32_packages.is_empty() {
            sections_html.push_str(r#"
        <section class="mb-10">
            <h2 class="text-3xl font-bold text-primary dark:text-gray-300 mb-5 mt-8 pb-2 border-b-2 border-primary/50 dark:border-gray-600">
                TEF
            </h2>"#);
            
            if !windows_packages.is_empty() {
                sections_html.push_str(&generate_platform_section("Windows", &windows_packages));
            }
            if !linux64_packages.is_empty() {
                sections_html.push_str(&generate_platform_section("Linux 64bits", &linux64_packages));
            }
            if !linux32_packages.is_empty() {
                sections_html.push_str(&generate_platform_section("Linux 32bits", &linux32_packages));
            }
            
            sections_html.push_str("\n        </section>");
        }
        
        // Smart POS Section
        if !sta_packages.is_empty() {
            sections_html.push_str(&generate_sta_section(&sta_packages));
        }
        
        // A2A Section
        if !a2a_packages.is_empty() {
            sections_html.push_str(&generate_a2a_section(&a2a_packages));
        }
        
        // Embedded Section
        if !embedded_packages.is_empty() {
            sections_html.push_str(&generate_embedded_section(&embedded_packages));
        }
        
        // Other Packages
        if !other_packages.is_empty() {
            sections_html.push_str(&generate_other_section(&other_packages));
        }
        
        // Release notes section
        let release_notes_html = if !release_notes.is_empty() {
            // Escape backticks and backslashes for safe embedding in JS template literal
            let escaped_notes = release_notes
                .replace("\\", "\\\\")
                .replace("`", "\\`")
                .replace("${", "\\${");
            format!(r#"
        <section class="mb-10">
            <h2 class="text-3xl font-bold text-primary dark:text-gray-300 mb-5 mt-8 pb-2 border-b-2 border-primary/50 dark:border-gray-600">
                Release Notes
            </h2>
            <div id="release-notes-content" class="markdown-preview text-gray-700 dark:text-gray-300">
            </div>
            <script>
                (function() {{
                    const rawNotes = `{}`;
                    if (typeof marked !== 'undefined') {{
                        document.getElementById('release-notes-content').innerHTML = marked.parse(rawNotes);
                    }} else {{
                        document.getElementById('release-notes-content').innerHTML = rawNotes.replace(/\n/g, '<br>');
                    }}
                }})();
            </script>
        </section>"#, escaped_notes)
        } else {
            String::new()
        };
        
        format!(
            r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartPosTef Release {version}</title>
    <link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,AAABAAIAEBAAAAEAIAAoBAAAJgAAACAgAAABACAAKBAAAE4EAAAoAAAAEAAAACAAAAABACAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHUogj9zJ4WddSeJ3XQnjP9zJ5D/cyeU3XIll51xKJo/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHYoeZp1J33/dCeB/3QnhP90J4j/cyaM/3MmkP9yJpP/ciaX/3EmnJoAAAAAAAAAAAAAAAAAAAAAAAAAAHcocrh2KHb/did5/3Unff91J4H/dCeF/3QniP9zJ4z/cyeQ/3InlP9yJpf/ciWbuAAAAAAAAAAAAAAAAHcoapp3J27/didy/3Yndf91J3n/dSd9/3Qngf90JoT/cyaI/3MmjP9yJpD/ciaT/3Eml/9xJpqaAAAAAHkoYT94KGf/eChr/3cob/93KHL/dih2/3oufv93Kn//dSeB/3Qnhf90J4j/dCeM/3MnkP9zJ5T/ciaX/3Eomj94KV6deChj/3goZ/93KGv/dydu/49PjP/NsM3/i0mO/3Unff90J4H/jlCb/3QniP9zJoz/cyaQ/3Imk/9yJZedeShc3XkoYP95KGP/j02B/8Ccu//VvNL/rHyp/8Gewf92J3n/fjWF/9O61/+9mcX/i0uc/3MnjP9zJ5D/cieU3XkoWP95KFv/hz9w/+vf6P/Fo77/gjp2/4M6e//cx9v/k1WS/3Unef+AOIf/wJ3G/+nd7P+AOpP/cyaM/3ImkP97KVT/eilY/3opXP+reZv/3cjX/7mQsP96K23/soau/86xzP98MXz/upO8/9zI3v+od6//dCeF/3Qnif90J4z/eyhQ3XooVP96KFj/eShc/4pEdP+tfKD/eyxq/3wwcP/Zw9f/mFyV/6x9rP+HQor/dSd9/3Qngf90J4T/dSeI3XspTJ17KVH/eilU/3opWP95KFz/eShg/3koY/94KGf/n2aV/76Yuv93KHL/dih2/3Ynef91J33/dSeB/3MnhZ15KEk/eylN/3ooUP96KFT/eShY/3koXP95KF//eChj/34zbv+TVIj/dydu/3Yncv92J3X/dSd5/3Unff91KII/AAAAAHwpS5p8KU3/eylR/3spVP96KVj/eilc/3kpYP95KGP/eChn/3goa/93KG//dyhy/3Yodv92KHuaAAAAAAAAAAAAAAAAeypJuHspTf97KFD/eihU/3ooWP95KFz/eShf/3goY/94KGf/dyhr/3cnbv92J3K4AAAAAAAAAAAAAAAAAAAAAAAAAAB8KUmaeylN/3spUf96KVT/eilY/3koXP95KGD/eShj/3goZ/93KGyaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHkoST97KUydeihQ3XooVP95KFj/eShb3XgpXp15KGE/AAAAAAAAAAAAAAAAAAAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdieJGnMoh2Z1J4ekdCeL0XMnjO9zJ47/cyeQ/3Mnku9xJ5TRcieVpHMllmZ2J50aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcil/OHMngah0J4L/dCeF/3Qmhv90J4j/cyaK/3MnjP9zJo7/cyaQ/3Imkf9yJpP/ciaV/3Iml/9wJpmociSbOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf0B/BHYoe5N1J33/dSd//3Ungf91J4P/dCeF/3Qnh/90J4j/dCeK/3MnjP9zJ47/cyeQ/3Mnkv9yJpP/cieW/3Iml/9yJpn/cSaak39AfwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHQndC50J3fQdSd5/3Une/91J33/dCd//3Qngf90JoL/dCeE/3Mmhv9zJ4j/cyaK/3MmjP9yJo3/ciaQ/3Imkf9yJpP/cSaV/3Iml/9xJpn/cSaa0G8nmy4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB3JnM8dyh08HYodv92KHj/did6/3YofP91J33/dSd//3Ungf91J4P/dCeF/3Qnh/90J4j/dCeL/3MnjP9zJ47/cyeQ/3Mnkv9yJ5T/cieW/3Iml/9yJpn/cSab8HMmnTwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdCdvLnYncPB2J3L/did0/3Yndv91J3f/dSd5/3Une/91J33/dCd//3Qngf90J4L/dCeF/3Mmhv9zJ4j/cyaK/3MnjP9zJo3/cyaQ/3Imkf9yJpP/ciaV/3Iml/9xJpn/cSab8G8nmy4AAAAAAAAAAAAAAAAAAAAAAAAAAH9AfwR4KG3Qdyhu/3cocP93KHL/dyh0/3Yndv92KHj/did5/3YnfP91J33/dSd//3Ungf91J4P/dCeF/3Qnh/90J4j/dCeK/3MnjP9zJ47/cyeQ/3Mnkv9yJpP/ciaW/3Iml/9yJpn/cSaa0H9AfwQAAAAAAAAAAAAAAAAAAAAAeCZok3coav93J2z/dydu/3YncP92J3L/didz/3Yndf91J3f/dSd5/3Une/91J33/dCd//3Qngf90JoL/dCeE/3Mmhv9zJ4j/cyaK/3MmjP9yJo3/ciaQ/3Imkf9yJpP/cSaV/3Eml/9xJpn/cSaakwAAAAAAAAAAAAAAAHspZDh4KGf/eChp/3goa/94KG3/dyhv/3cocf93KHL/dyh0/3Yodv92KHj/did6/3YofP91J33/dSh//3Ungf91J4P/dCeF/3Qnh/90J4j/dCeL/3MnjP9zJ47/cyeQ/3Mnkv9yJ5T/cieW/3Iml/9yJ5n/ciSbOAAAAAAAAAAAeCdjqHgoZf94KGf/dyho/3coa/93J2z/dyhu/3YncP92J3L/did0/3Yndv91J3f/dSd5/3Une/91J33/dCd//3Qngf90J4L/dCeF/3Qmhv90J4j/cyaK/3MnjP9zJo7/cyaQ/3Imkf9yJpP/ciaV/3Iml/9wJpmoAAAAAHYnYhp5KGL/eShj/3koZf94KGf/eChp/3goa/94KG3/dyhu/3cocP93KHL/dyh0/30yff+OTY//did6/3YofP91J33/dSd//3Ungf91J4P/dCeF/3Qnh/90J4j/dCeK/3MnjP9zJ47/cyeQ/3Mnkv9yJpP/cieW/3Iml/92J50aeChcZnkoX/94KGH/eChj/3goZf94KGf/dydo/3coav93J2z/dydu/3cpcf94KnT/tYu0//r3+v+XXJj/dSd5/3Une/91J33/dCd//3Qngf93KoT/dSmF/3Mmhv9zJ4j/cyaK/3MmjP9yJo3/ciaQ/3Imkf9yJpP/cSaV/3MllmZ5KFykeile/3koYP95KWL/eShj/3koZf94KGf/eChp/3goa/+DOXj/toyy/8Shwf+qeKf/+vf6/86xzv96L3z/did6/3YofP91J33/fzeJ/8Sjyf+1i7z/gDqQ/3Qnh/90J4j/dCeL/3MnjP9zJ47/cyeQ/3Mnkv9yJ5T/cieVpHkoWtF5KFz/eShd/3koX/94KGH/eChj/3goZf94KGf/j02D/+rd6P/8+/z/8ejw/4Q9f//q3un/9e/1/45Mjv91J3f/dSd5/3Une/+FQIz/7+bw//z7/f/u5O//mF+l/3Mmhv9zJ4j/cyaK/3MnjP9zJo3/cyaQ/3Imkf9xJpLReidX73opWv95KFz/eSle/3koX/95KGL/hTtx/7qRsP/07fL/+PP3/9G2zf+JQ3//dyhu/5thlv/69/n/wZy//3Yndv92KHj/did5/3YnfP+HRI7/zbHR//bx9//59fn/xaXM/41Onf90J4j/dCeK/3MnjP9zJ47/cyeQ/3Mnku96KFb/eihY/3koWf95KFz/eShd/4hAcf/ey9n/+/j6/+vg6f+aX47/fC9u/3coav93J2z/eChv/9vG2f/17/T/hT6C/3Yndf91J3f/dSd5/3Une/96L4L/l12f/+nc6//8+/3/59rq/4VBlf9zJ4j/cyaK/3MmjP9yJo3/ciaQ/3spVP97KVf/eilY/3opWv96KFz/ikNy/+jb5P/8+/z/69/o/5tejP99MG3/eChp/3goa/94KG3/o26e//r3+v/KrMj/eCp1/3Yodv92KHj/did6/340g/+lcqr/9fD2//v4+//bxt7/gTuQ/3Qnh/90J4j/dCeL/3MnjP9zJ47/eidS73ooVP96KFb/eihY/3koWv95KFz/kEx4/8elvP/59fj/9vH1/86xx/+KRXv/dyho/3coa/+DOnn/5NXj/+3j7P+NS4r/did0/3Yndv+LSYz/1b7X//n2+f/z7PT/uJC9/385i/90J4L/dCeF/3Qmhv90J4j/cyaK/3MnjO97KVHReylT/3opVP96KVf/eihY/3opWv96KFz/eile/55ji//v5ez//fz9/+7j6/+EO3X/eChp/3goa/+2i7D//Pv8/66Aqv93KHL/hT6C//Lr8v/8+/z/6dzq/45Nk/91J33/dSd//3Ungf91J4P/dCeF/3Qnh/90J4j/dCeK0XsoTqR7KFD/eihS/3ooVP96KFb/eihY/3koWf95KFz/eShd/4U7bf+0iKj/v5q2/380bf94KGf/dydo/3wwcP/r3+n/6+Dq/3otdP9/NXv/wZ7A/7KGsv+AOIL/dSd5/3Une/91J33/dCd//3Qngf90JoL/dCeE/3Mmhv9zJ4ekeihNZnwpT/97KVH/eylT/3spVP97KVf/eilY/3opWv96KFz/eile/3opYf97LGT/eShj/3koZf94KGf/eChp/6dzn//7+fv/uI6z/3cocf95K3T/eCl1/3Yodv92KHj/did6/3YofP91J33/dSd//3Ungf91J4P/dCeF/3Moh2Z/J04aeylN/3soTv97KVH/eihS/3ooVP96KFb/eihY/3koWv95KFz/eShd/3koX/94KGH/eChj/3goZf94KGf/hkB5/+bY5P/x6fD/hD18/3YncP92J3L/did0/3Yndv91J3f/dSd5/3Une/91J33/dCd//3Qngf90J4L/dieJGgAAAAB8KUqoeylN/3spT/97KVH/eylT/3opVP96KVb/eihY/3opWv95KFz/eSle/3koX/95KGL/eShj/3koZf95Kmj/wZy6//38/f+ufqf/dyhu/3cocP93KHL/dyh0/3Yndv92KHj/did5/3YnfP91J33/dSd//3UngagAAAAAAAAAAHspSTh7KEv/eylN/3soTv97KFD/eihS/3ooVP96KFb/eihY/3koWf95KFz/eShd/3koX/94KGH/eChj/3gnZf+DOnT/xqXA/5NVif93J2z/dydu/3YncP92J3L/didz/3Yndf91J3f/dSd5/3Une/91J33/cil/OAAAAAAAAAAAAAAAAHsqSZN8KUv/fClN/3wpT/97KVH/eylT/3spVP97KVf/eilY/3opWv96KFz/eile/3koYP95KWL/eShj/3koZf94KGf/eChp/3goa/94KG3/dyhv/3cocf93KHL/dyh0/3Yodv92KHj/did6/3Yoe5MAAAAAAAAAAAAAAAAAAAAAf0BABHwoStB7KUv/eylN/3spTv97KVH/eihS/3ooVP96KFb/eihY/3koWv95KFz/eShd/3koX/94KGH/eChj/3goZf94KGf/dyho/3coa/93J2z/dyhu/3YncP92J3L/did0/3Yndv90J3fQf0B/BAAAAAAAAAAAAAAAAAAAAAAAAAAAeidILnwpSfB8KUv/eylN/3spT/97KVH/eylT/3opVP96KVf/eihY/3opWv96KFz/eile/3koX/95KGL/eShj/3koZf94KGf/eChp/3goa/94KG3/dyhu/3cocP93KHL/dyh08HQndC4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeypIPHwpSfB7KUv/eylN/3soTv97KFD/eihS/3ooVP96KFb/eihY/3koWf95KFz/eShd/3koX/94KGH/eChj/3goZf94KGf/dydo/3coav93J2z/dydu/3YncPB3JnM8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeidILnwoStB8KUv/eylN/3wpT/97KVH/eylT/3spVP97KVf/eilY/3opWv96KFz/eile/3koYP95KWL/eShj/3koZf94KGf/eChp/3goa/94KG3QdCdvLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf0BABHsqSZN7KUv/eylN/3soTv97KVH/eihS/3ooVP96KFb/eihY/3koWv95KFz/eShd/3koX/94KGH/eChj/3goZf94KGf/eCZok39AfwQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHspSTh8KUqoeylN/3spT/97KVH/eylT/3opVP96KVb/eihY/3opWv95KFz/eSle/3koX/95KGL/eSdjqHspZDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/J04aeihNZnsoTqR7KFHReidS73ooVP96KFb/eidX73koWdF5KFykeChcZnYnYhoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA">
    
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Load Marked.js for Markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {{
            darkMode: 'class', 
            theme: {{
                extend: {{
                    fontFamily: {{
                        sans: ['Inter', 'sans-serif'],
                    }},
                    colors: {{
                        'primary': '#48297c',
                        'secondary': '#9c2671',
                        'accent': '#6a1b9a',
                        'light-bg': '#F9FAFB',
                    }}
                }}
            }}
        }}
    </script>
    <style>
        body {{
            background: linear-gradient(135deg, #1a0b2e 0%, #16213e 100%);
            transition: background 300ms ease;
        }}
        body.light {{
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }}
        
        /* Markdown Styles */
        .markdown-preview h1 {{ font-size: 2em; font-weight: 700; margin-top: 0.67em; margin-bottom: 0.67em; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }}
        .dark .markdown-preview h1 {{ border-bottom-color: #374151; }}
        .markdown-preview h2 {{ font-size: 1.5em; font-weight: 700; margin-top: 0.83em; margin-bottom: 0.83em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }}
        .dark .markdown-preview h2 {{ border-bottom-color: #374151; }}
        .markdown-preview h3 {{ font-size: 1.25em; font-weight: 700; margin-top: 1em; margin-bottom: 1em; }}
        .markdown-preview p {{ margin-top: 0.5em; margin-bottom: 0.5em; line-height: 1.7; }}
        .markdown-preview ul, .markdown-preview ol {{ margin-top: 0.5em; margin-bottom: 0.5em; padding-left: 2em; }}
        .markdown-preview li {{ margin-top: 0.25em; margin-bottom: 0.25em; }}
        .markdown-preview code {{ background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; font-family: monospace; }}
        .dark .markdown-preview code {{ background-color: #374151; }}
        .markdown-preview a {{ color: #48297c; text-decoration: underline; }}
        .dark .markdown-preview a {{ color: #9c2671; }}
    </style>
</head>
<body class="font-sans p-4 md:p-8 min-h-screen transition duration-300">

    <div class="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 md:p-10 rounded-xl shadow-2xl transition duration-300">

        <!-- Main Title and Theme Toggle Button -->
        <header class="mb-8 pb-4 border-b-4 border-primary dark:border-gray-600 relative">
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-4 flex-1">
                    <div class="flex-1">
                        <h1 class="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
                            SmartPosTef Release
                        </h1>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">by Aditum Serviços Digitais LTDA</p>
                    </div>
                </div>
                <button id="theme-toggle" class="flex-shrink-0 p-2 rounded-full text-secondary hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition duration-300 ease-in-out">
                </button>
            </div>
        </header>
        
        <!-- Release Version Header -->
        <div class="mb-6">
            <h1 class="text-3xl md:text-4xl font-extrabold text-secondary dark:text-white tracking-tight">
                {version}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {release_type}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Release Date: {date}
            </p>
        </div>
{notes}
{sections}
    </div>

    <script>
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        const DARK_BG_COLOR = '#111827';
        const LIGHT_BG_COLOR = '#F9FAFB';
        const sunIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
        const moonIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

        function initTheme() {{
            const storedTheme = localStorage.getItem('theme');
            const isDarkDefault = (storedTheme === 'dark' || storedTheme === null);
            if (isDarkDefault) {{
                body.classList.add('dark');
                body.style.backgroundColor = DARK_BG_COLOR;
            }} else {{
                body.classList.remove('dark');
                body.style.backgroundColor = LIGHT_BG_COLOR;
            }}
            updateToggleIcon();
        }}

        function toggleTheme() {{
            body.classList.toggle('dark');
            const isDark = body.classList.contains('dark');
            if (isDark) {{
                body.style.backgroundColor = DARK_BG_COLOR;
            }} else {{
                body.style.backgroundColor = LIGHT_BG_COLOR;
            }}
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateToggleIcon();
        }}

        function updateToggleIcon() {{
            const isDark = body.classList.contains('dark');
            themeToggle.innerHTML = isDark ? sunIcon : moonIcon;
        }}

        initTheme();
        themeToggle.addEventListener('click', toggleTheme);
    </script>
</body>
</html>"#,
            version = release.version,
            release_type = release_type,
            date = release.date,
            sections = sections_html,
            notes = release_notes_html
        )
    }
    
    fn normalize_device_name(name: &str) -> String {
        name.replace("_", " ")
    }

    fn normalize_a2a_display_name(name: &str) -> String {
        match name.to_uppercase().as_str() {
            "P2_LITE_SE" | "P2LITESE" => "P2 Lite SE".to_string(),
            "X990_PRO" => "X990 Pro".to_string(),
            "X990_UX" => "X990 UX".to_string(),
            "L3_2024" => "L3 2024".to_string(),
            "DX4000" => "DX4000".to_string(),
            "DX8000" => "DX8000".to_string(),
            "GPOS720" => "GPOS720".to_string(),
            "GPOS760" => "GPOS760".to_string(),
            _ => name.replace("_", " ").to_string(),
        }
    }

    /// Split packages into (clientless, client_groups) where client_groups is a BTreeMap
    fn group_by_client<'a>(packages: &[&'a PackageData]) -> (Vec<&'a PackageData>, std::collections::BTreeMap<String, Vec<&'a PackageData>>) {
        let mut clientless: Vec<&PackageData> = Vec::new();
        let mut client_groups: std::collections::BTreeMap<String, Vec<&PackageData>> = std::collections::BTreeMap::new();
        for pkg in packages {
            if pkg.client.is_empty() {
                clientless.push(pkg);
            } else {
                client_groups.entry(pkg.client.clone()).or_insert_with(Vec::new).push(pkg);
            }
        }
        (clientless, client_groups)
    }

    fn client_card_open(client: &str) -> String {
        format!(r#"
            <div class="mt-6 p-4 border border-green-400/30 dark:border-green-500/30 rounded-lg bg-green-50/10 dark:bg-green-900/10">
                <h4 class="text-lg font-semibold text-green-700 dark:text-green-400 mb-3 pb-2 border-b border-green-400/30 dark:border-green-500/30">{}</h4>"#, client)
    }

    fn client_card_close() -> &'static str {
        r#"
            </div>"#
    }

    fn generate_platform_section(title: &str, packages: &[&PackageData]) -> String {
        let (clientless, client_groups) = group_by_client(packages);
        let mut html = String::new();

        // Render clientless packages
        if !clientless.is_empty() {
            html.push_str(&generate_platform_section_inner(title, &clientless));
        }

        // Render each client group
        for (client, pkgs) in &client_groups {
            html.push_str(&client_card_open(client));
            html.push_str(&generate_platform_section_inner(title, pkgs));
            html.push_str(client_card_close());
        }

        html
    }

    fn generate_platform_section_inner(title: &str, packages: &[&PackageData]) -> String {
        let mut html = format!(r#"
            
            <!-- {} Sub-section -->
            <div class="mb-6 p-4 bg-light-bg dark:bg-gray-700 rounded-lg transition duration-300">
                <h3 class="text-xl font-semibold text-secondary dark:text-gray-100 mb-3">
                    {}
                </h3>"#, title, title);
        
        // Group by device/category
        let mut dll_packages: Vec<&PackageData> = Vec::new();
        let mut lib_packages: Vec<&PackageData> = Vec::new();
        let mut installer_packages: Vec<&PackageData> = Vec::new();
        let mut other_pkgs: Vec<&PackageData> = Vec::new();
        
        for pkg in packages {
            let device_lower = pkg.device.to_lowercase();
            let _category_lower = pkg.category.to_lowercase();
            if device_lower.contains("dll") || device_lower.contains("library") {
                dll_packages.push(pkg);
            } else if device_lower.contains("biblioteca") || device_lower.contains("lib") {
                lib_packages.push(pkg);
            } else if device_lower.contains("installer") || device_lower.contains("instalador") {
                installer_packages.push(pkg);
            } else {
                other_pkgs.push(pkg);
            }
        }
        
        // DLL/Library section
        if !dll_packages.is_empty() || !lib_packages.is_empty() {
            html.push_str(r#"
                <ul class="list-none space-y-2 pl-0">"#);
            for pkg in dll_packages.iter().chain(lib_packages.iter()) {
                let label = if pkg.device.is_empty() { "Library".to_string() } else { normalize_device_name(&pkg.device) };
                html.push_str(&format!(r#"
                    <li class="flex items-start">
                        <span class="font-mono text-sm text-gray-600 dark:text-gray-400 w-20 shrink-0 pt-0.5">{}:</span>
                        <a href="{}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out underline break-all ml-2 dark:text-blue-400 dark:hover:text-blue-300">
                            {}
                        </a>
                    </li>"#, label, pkg.url, extract_filename(&pkg.url)));
            }
            html.push_str(r#"
                </ul>"#);
        }
        
        // Installer section
        if !installer_packages.is_empty() {
            html.push_str(r#"
                <h4 class="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2 border-l-4 border-primary/70 pl-2">
                    Instalador
                </h4>
                <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">"#);
            for pkg in &installer_packages {
                let category_label = if pkg.category.to_lowercase().contains("online") { "Online" } else if pkg.category.to_lowercase().contains("offline") { "Offline" } else { &pkg.category };
                html.push_str(&format!(r#"
                    <li>
                        <span class="font-mono text-sm text-gray-600 dark:text-gray-400 pr-1">{}:</span>
                        <a href="{}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out underline break-all dark:text-blue-400 dark:hover:text-blue-300">
                            {}
                        </a>
                    </li>"#, category_label, pkg.url, extract_filename(&pkg.url)));
            }
            html.push_str(r#"
                </ul>"#);
        }
        
        // Other packages
        if !other_pkgs.is_empty() {
            html.push_str(r#"
                <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">"#);
            for pkg in &other_pkgs {
                let label = if !pkg.device.is_empty() { normalize_device_name(&pkg.device) } else if !pkg.category.is_empty() { pkg.category.clone() } else { "Package".to_string() };
                html.push_str(&format!(r#"
                    <li>
                        <span class="font-mono text-sm text-gray-600 dark:text-gray-400 pr-1">{}:</span>
                        <a href="{}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out underline break-all dark:text-blue-400 dark:hover:text-blue-300">
                            {}
                        </a>
                    </li>"#, label, pkg.url, extract_filename(&pkg.url)));
            }
            html.push_str(r#"
                </ul>"#);
        }
        
        html.push_str(r#"
            </div>"#);
        
        html
    }
    
    fn generate_sta_section(packages: &[&PackageData]) -> String {
        let (clientless, client_groups) = group_by_client(packages);
        let mut html = String::from(r#"

        <section class="mb-10">
            <h2 class="text-3xl font-bold text-primary dark:text-gray-300 mb-5 mt-8 pb-2 border-b-2 border-primary/50 dark:border-gray-600">
                Smart POS (STA - Standalone)
            </h2>"#);

        // Render clientless packages
        if !clientless.is_empty() {
            html.push_str(&generate_sta_devices(&clientless));
        }

        // Render each client group
        for (client, pkgs) in &client_groups {
            html.push_str(&client_card_open(client));
            html.push_str(&generate_sta_devices(pkgs));
            html.push_str(client_card_close());
        }

        html.push_str(r#"
        </section>"#);

        html
    }

    fn generate_sta_devices(packages: &[&PackageData]) -> String {
        let mut html = String::from(r#"
            <div class="mb-6 p-4 bg-light-bg dark:bg-gray-700 rounded-lg transition duration-300">
                <ul class="list-none space-y-4 pl-0 text-gray-700 dark:text-gray-300">"#);
        
        // Group by device
        let mut devices: std::collections::HashMap<String, Vec<&PackageData>> = std::collections::HashMap::new();
        for pkg in packages {
            let device = if pkg.device.is_empty() { "Other".to_string() } else { pkg.device.clone() };
            devices.entry(device).or_insert_with(Vec::new).push(pkg);
        }
        
        let mut is_first = true;
        for (device, pkgs) in &devices {
            let border_class = if is_first { "" } else { " pt-4 border-t border-gray-300 dark:border-gray-600/50" };
            html.push_str(&format!(r#"
                    
                    <!-- {} -->
                    <li class="flex items-start flex-col{}">
                        <strong class="text-xl font-bold text-secondary dark:text-gray-100 w-full shrink-0 mb-2">{}</strong>
                        <ul class="list-disc list-inside space-y-2 ml-4 w-full">"#, device, border_class, normalize_device_name(device)));
            
            for pkg in pkgs {
                let label_parts: Vec<String> = vec![pkg.signature.clone(), pkg.client.clone(), pkg.category.clone()]
                    .into_iter()
                    .filter(|s| !s.is_empty())
                    .collect();
                let label = if label_parts.is_empty() { "Package".to_string() } else { label_parts.join(" - ") };
                html.push_str(&format!(r#"
                            <li>
                                <strong class="text-base font-semibold text-gray-700 dark:text-gray-200 pr-1">{}:</strong>
                                <a href="{}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out underline break-all dark:text-blue-400 dark:hover:text-blue-300">
                                    {}
                                </a>
                            </li>"#, label, pkg.url, extract_filename(&pkg.url)));
            }
            
            html.push_str(r#"
                        </ul>
                    </li>"#);
            is_first = false;
        }
        
        html.push_str(r#"
                </ul>
            </div>"#);
        
        html
    }
    
    fn generate_a2a_section(packages: &[&PackageData]) -> String {
        let (clientless, client_groups) = group_by_client(packages);
        let mut html = String::from(r#"

        <!-- A2A (App to App) Section -->
        <section class="mb-10">
            <h2 class="text-3xl font-bold text-primary dark:text-gray-300 mb-5 mt-8 pb-2 border-b-2 border-primary/50 dark:border-gray-600">
                App to App (A2A)
            </h2>"#);

        if !clientless.is_empty() {
            html.push_str(&generate_a2a_list(&clientless));
        }

        for (client, pkgs) in &client_groups {
            html.push_str(&client_card_open(client));
            html.push_str(&generate_a2a_list(pkgs));
            html.push_str(client_card_close());
        }

        html.push_str(r#"
        </section>"#);

        html
    }

    fn generate_a2a_list(packages: &[&PackageData]) -> String {
        let mut html = String::from(r#"
            <div class="mb-6 p-4 bg-light-bg dark:bg-gray-700 rounded-lg transition duration-300">
                <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">"#);
        
        for pkg in packages {
            let label = if !pkg.device.is_empty() { normalize_a2a_display_name(&pkg.device) } else if !pkg.category.is_empty() { pkg.category.clone() } else { "Package".to_string() };
            html.push_str(&format!(r#"
                    <li>
                        <span class="font-mono text-sm text-gray-600 dark:text-gray-400 pr-1">{}:</span>
                        <a href="{}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out underline break-all dark:text-blue-400 dark:hover:text-blue-300">
                            {}
                        </a>
                    </li>"#, label, pkg.url, extract_filename(&pkg.url)));
        }
        
        html.push_str(r#"
                </ul>
            </div>"#);
        
        html
    }
    
    fn generate_embedded_section(packages: &[&PackageData]) -> String {
        let (clientless, client_groups) = group_by_client(packages);
        let mut html = String::from(r#"

        <section class="mb-10">
            <h2 class="text-3xl font-bold text-primary dark:text-gray-300 mb-5 mt-8 pb-2 border-b-2 border-primary/50 dark:border-gray-600">
                Embedded Linux
            </h2>"#);

        if !clientless.is_empty() {
            html.push_str(&generate_embedded_list(&clientless));
        }

        for (client, pkgs) in &client_groups {
            html.push_str(&client_card_open(client));
            html.push_str(&generate_embedded_list(pkgs));
            html.push_str(client_card_close());
        }

        html.push_str(r#"
        </section>"#);

        html
    }

    fn generate_embedded_list(packages: &[&PackageData]) -> String {
        let mut html = String::from(r#"
            <div class="mb-6 p-4 bg-light-bg dark:bg-gray-700 rounded-lg transition duration-300">
                <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">"#);
        
        for pkg in packages {
            let label = if !pkg.device.is_empty() { normalize_device_name(&pkg.device) } else { "Package".to_string() };
            html.push_str(&format!(r#"
                    <li>
                        <span class="font-mono text-sm text-gray-600 dark:text-gray-400 pr-1">{}:</span>
                        <a href="{}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out underline break-all dark:text-blue-400 dark:hover:text-blue-300">
                            {}
                        </a>
                    </li>"#, label, pkg.url, extract_filename(&pkg.url)));
        }
        
        html.push_str(r#"
                </ul>
            </div>"#);
        
        html
    }
    
    fn generate_other_section(packages: &[&PackageData]) -> String {
        let (clientless, client_groups) = group_by_client(packages);
        let mut html = String::from(r#"

        <section class="mb-10">
            <h2 class="text-3xl font-bold text-primary dark:text-gray-300 mb-5 mt-8 pb-2 border-b-2 border-primary/50 dark:border-gray-600">
                Other Packages
            </h2>"#);

        if !clientless.is_empty() {
            html.push_str(&generate_other_list(&clientless));
        }

        for (client, pkgs) in &client_groups {
            html.push_str(&client_card_open(client));
            html.push_str(&generate_other_list(pkgs));
            html.push_str(client_card_close());
        }

        html.push_str(r#"
        </section>"#);

        html
    }

    fn generate_other_list(packages: &[&PackageData]) -> String {
        let mut html = String::from(r#"
            <div class="mb-6 p-4 bg-light-bg dark:bg-gray-700 rounded-lg transition duration-300">
                <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">"#);
        
        for pkg in packages {
            let label = if !pkg.platform.is_empty() { normalize_device_name(&pkg.platform) } else if !pkg.device.is_empty() { normalize_device_name(&pkg.device) } else { "Package".to_string() };
            html.push_str(&format!(r#"
                    <li>
                        <span class="font-mono text-sm text-gray-600 dark:text-gray-400 pr-1">{}:</span>
                        <a href="{}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out underline break-all dark:text-blue-400 dark:hover:text-blue-300">
                            {}
                        </a>
                    </li>"#, label, pkg.url, extract_filename(&pkg.url)));
        }
        
        html.push_str(r#"
                </ul>
            </div>"#);
        
        html
    }
    
    fn extract_filename(url: &str) -> String {
        // Strip trailing slash for folder URLs (e.g., S920 unsigned packages)
        let trimmed = url.trim_end_matches('/');
        if let Some(last_slash) = trimmed.rfind('/') {
            let name = &trimmed[last_slash + 1..];
            if name.is_empty() {
                trimmed.to_string()
            } else {
                // If original URL ended with /, append / to indicate it's a folder
                if url.ends_with('/') {
                    format!("{}/", name)
                } else {
                    name.to_string()
                }
            }
        } else {
            trimmed.to_string()
        }
    }

    #[tauri::command]
    pub fn export_data(options: ExportOptions, theme: String) -> Result<String, String> {
        log_to_file("INFO", "EXPORT: Exporting application data (v3 selective)", None);
        
        let settings = get_settings();
        let mut export_obj = serde_json::Map::new();

        export_obj.insert("version".to_string(), serde_json::json!(3));
        export_obj.insert("exportedAt".to_string(), serde_json::json!(chrono::Utc::now().to_rfc3339()));
        export_obj.insert("included".to_string(), serde_json::json!({
            "releases": options.releases,
            "defaultTheme": options.default_theme,
            "jfrogSettings": options.jfrog_settings,
            "clientMappings": options.client_mappings,
            "htmlSettings": options.html_settings,
        }));

        // Theme
        if options.default_theme && !theme.is_empty() {
            export_obj.insert("theme".to_string(), serde_json::json!(theme));
        }

        // Settings (selective)
        let mut settings_obj = serde_json::Map::new();
        if options.jfrog_settings && !settings.jfrog_api_key.is_empty() {
            let encrypted_key = encrypt_api_key(&settings.jfrog_api_key).map_err(|e| {
                log_to_file("ERROR", "EXPORT: Failed to encrypt API key", Some(&e));
                e
            })?;
            settings_obj.insert("jfrogApiKey".to_string(), serde_json::json!(encrypted_key));
            log_to_file("INFO", "EXPORT: API key encrypted for export", None);
        }
        if options.client_mappings {
            settings_obj.insert("clientMappings".to_string(), serde_json::to_value(&settings.client_mappings).unwrap_or_default());
        }
        if options.html_settings {
            settings_obj.insert("portalSettings".to_string(), serde_json::to_value(&settings.portal_settings).unwrap_or_default());
        }
        if options.releases {
            // customPlatforms are contextual to releases
            settings_obj.insert("customPlatforms".to_string(), serde_json::to_value(&settings.custom_platforms).unwrap_or_default());
        }
        if !settings_obj.is_empty() {
            export_obj.insert("settings".to_string(), serde_json::Value::Object(settings_obj));
        }

        // Releases + SPF files
        if options.releases {
            let releases = load_releases();
            let spf_dir = get_app_data_dir().join("spf");
            let mut spf_files: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
            for rel in &releases {
                if let Some(ref spf_name) = rel.spf_file_name {
                    let spf_path = spf_dir.join(spf_name);
                    if spf_path.exists() {
                        if let Ok(spf_content) = fs::read_to_string(&spf_path) {
                            spf_files.insert(spf_name.clone(), serde_json::Value::String(spf_content));
                        }
                    }
                }
            }
            export_obj.insert("releases".to_string(), serde_json::to_value(&releases).unwrap_or_default());
            export_obj.insert("spfFiles".to_string(), serde_json::Value::Object(spf_files.clone()));

            let result = serde_json::to_string_pretty(&serde_json::Value::Object(export_obj)).map_err(|e| {
                log_to_file("ERROR", "EXPORT: Failed to serialize export data", Some(&e.to_string()));
                e.to_string()
            })?;
            log_to_file("INFO", "EXPORT: Data exported successfully", Some(&format!(
                "Size: {} bytes, Releases: {}, SPF files: {}",
                result.len(), releases.len(), spf_files.len()
            )));
            Ok(result)
        } else {
            let result = serde_json::to_string_pretty(&serde_json::Value::Object(export_obj)).map_err(|e| {
                log_to_file("ERROR", "EXPORT: Failed to serialize export data", Some(&e.to_string()));
                e.to_string()
            })?;
            log_to_file("INFO", "EXPORT: Data exported successfully", Some(&format!(
                "Size: {} bytes (no releases)", result.len()
            )));
            Ok(result)
        }
    }

    #[tauri::command]
    pub fn import_data(data: String, options: ImportOptions) -> Result<ImportSummary, String> {
        log_to_file("INFO", "IMPORT: Importing application data (selective)", Some(&format!("Data size: {} bytes", data.len())));
        let parsed: serde_json::Value = serde_json::from_str(&data).map_err(|e| {
            log_to_file("ERROR", "IMPORT: Failed to parse import data", Some(&e.to_string()));
            e.to_string()
        })?;

        let mut imported: Vec<String> = Vec::new();
        let mut skipped: Vec<String> = Vec::new();
        let mut release_count: usize = 0;
        let mut theme_result: Option<String> = None;

        // Import theme
        if options.default_theme {
            if let Some(theme_val) = parsed.get("theme").and_then(|v| v.as_str()) {
                theme_result = Some(theme_val.to_string());
                imported.push("defaultTheme".to_string());
                log_to_file("INFO", "IMPORT: Theme imported", Some(theme_val));
            } else {
                skipped.push("defaultTheme".to_string());
            }
        } else {
            skipped.push("defaultTheme".to_string());
        }
        
        // Import settings (partial merge)
        let mut current_settings = get_settings();

        if options.jfrog_settings {
            if let Some(settings_val) = parsed.get("settings") {
                if let Some(api_key) = settings_val.get("jfrogApiKey").and_then(|v| v.as_str()) {
                    if !api_key.is_empty() {
                        let decrypted = decrypt_api_key(api_key).map_err(|e| {
                            log_to_file("ERROR", "IMPORT: Failed to decrypt API key", Some(&e));
                            e
                        })?;
                        current_settings.jfrog_api_key = decrypted;
                        imported.push("jfrogSettings".to_string());
                        log_to_file("INFO", "IMPORT: JFrog API key imported and decrypted", None);
                    } else {
                        skipped.push("jfrogSettings".to_string());
                    }
                } else {
                    skipped.push("jfrogSettings".to_string());
                }
            } else {
                skipped.push("jfrogSettings".to_string());
            }
        } else {
            skipped.push("jfrogSettings".to_string());
        }

        if options.client_mappings {
            if let Some(settings_val) = parsed.get("settings") {
                if let Some(mappings) = settings_val.get("clientMappings") {
                    if let Ok(m) = serde_json::from_value::<Vec<ClientMapping>>(mappings.clone()) {
                        current_settings.client_mappings = m;
                        imported.push("clientMappings".to_string());
                        log_to_file("INFO", "IMPORT: Client mappings imported", None);
                    } else {
                        skipped.push("clientMappings".to_string());
                    }
                } else {
                    skipped.push("clientMappings".to_string());
                }
            } else {
                skipped.push("clientMappings".to_string());
            }
        } else {
            skipped.push("clientMappings".to_string());
        }

        if options.html_settings {
            if let Some(settings_val) = parsed.get("settings") {
                if let Some(portal) = settings_val.get("portalSettings") {
                    if let Ok(p) = serde_json::from_value::<PortalSettings>(portal.clone()) {
                        current_settings.portal_settings = p;
                        imported.push("htmlSettings".to_string());
                        log_to_file("INFO", "IMPORT: HTML/Portal settings imported", None);
                    } else {
                        skipped.push("htmlSettings".to_string());
                    }
                } else {
                    skipped.push("htmlSettings".to_string());
                }
            } else {
                skipped.push("htmlSettings".to_string());
            }
        } else {
            skipped.push("htmlSettings".to_string());
        }

        // Import customPlatforms alongside releases
        if options.releases {
            if let Some(settings_val) = parsed.get("settings") {
                if let Some(platforms) = settings_val.get("customPlatforms") {
                    if let Ok(p) = serde_json::from_value::<Vec<CustomDevice>>(platforms.clone()) {
                        current_settings.custom_platforms = p;
                    }
                }
            }
        }

        save_settings(current_settings)?;
        
        // Import releases
        if options.releases {
            if let Some(releases_val) = parsed.get("releases") {
                let releases: Vec<Release> = serde_json::from_value(releases_val.clone()).map_err(|e| e.to_string())?;
                release_count = releases.len();
                log_to_file("INFO", "IMPORT: Importing releases", Some(&format!("Count: {}", releases.len())));
                let releases_path = get_app_data_dir().join("releases.json");
                let content = serde_json::to_string_pretty(&releases).map_err(|e| e.to_string())?;
                fs::write(&releases_path, content).map_err(|e| e.to_string())?;

                // Regenerate SPF files for releases that have spfFileName but no local SPF
                let spf_dir = get_app_data_dir().join("spf");
                let _ = fs::create_dir_all(&spf_dir);
                for rel in &releases {
                    if let Some(ref spf_name) = rel.spf_file_name {
                        let spf_path = spf_dir.join(spf_name);
                        if !spf_path.exists() {
                            // Try to get from exported spfFiles first
                            let mut restored = false;
                            if let Some(spf_files) = parsed.get("spfFiles") {
                                if let Some(spf_content) = spf_files.get(spf_name) {
                                    if let Some(content_str) = spf_content.as_str() {
                                        let _ = fs::write(&spf_path, content_str);
                                        restored = true;
                                        log_to_file("INFO", "IMPORT: Restored SPF from export", Some(&format!("File: {}", spf_name)));
                                    }
                                }
                            }
                            // If not in export, regenerate from release data
                            if !restored {
                                if let Ok(spf_content) = generate_spf_content(rel.clone()) {
                                    let _ = fs::write(&spf_path, &spf_content);
                                    log_to_file("INFO", "IMPORT: Regenerated SPF from release data", Some(&format!("File: {}", spf_name)));
                                }
                            }
                        }
                    }
                }
                imported.push("releases".to_string());
            } else {
                skipped.push("releases".to_string());
            }
        } else {
            skipped.push("releases".to_string());
        }
        
        log_to_file("INFO", "IMPORT: Data imported successfully", Some(&format!(
            "Imported: {:?}, Skipped: {:?}, Releases: {}", imported, skipped, release_count
        )));

        Ok(ImportSummary {
            imported,
            skipped,
            release_count,
            theme: theme_result,
        })
    }

    #[tauri::command]
    pub fn read_file_content(file_path: String) -> Result<String, String> {
        log_to_file("DEBUG", "FILE_READ: Reading file content", Some(&format!("Path: {}", file_path)));
        fs::read_to_string(&file_path).map_err(|e| {
            log_to_file("ERROR", "FILE_READ: Failed to read file", Some(&format!("Path: {}\n  Error: {}", file_path, e)));
            e.to_string()
        })
    }

    #[tauri::command]
    pub fn write_file_content(file_path: String, content: String) -> Result<(), String> {
        log_to_file("DEBUG", "FILE_WRITE: Writing file content", Some(&format!("Path: {}\n  Size: {} bytes", file_path, content.len())));
        if let Some(parent) = Path::new(&file_path).parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&file_path, &content).map_err(|e| {
            log_to_file("ERROR", "FILE_WRITE: Failed to write file", Some(&format!("Path: {}\n  Error: {}", file_path, e)));
            e.to_string()
        })
    }

    #[tauri::command]
    pub fn get_file_size(file_path: String) -> Result<u64, String> {
        log_to_file("DEBUG", "FILE_SIZE: Getting file size", Some(&format!("Path: {}", file_path)));
        let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;
        Ok(metadata.len())
    }

    #[tauri::command]
    pub fn list_log_files(logs_path: String) -> Result<Vec<String>, String> {
        let path = std::path::Path::new(&logs_path);
        if !path.exists() {
            return Ok(vec![]);
        }
        
        let mut files: Vec<(String, std::time::SystemTime)> = vec![];
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let file_path = entry.path();
                if file_path.is_file() {
                    if let Some(ext) = file_path.extension() {
                        if ext == "log" || ext == "txt" {
                            if let Ok(metadata) = file_path.metadata() {
                                if let Ok(modified) = metadata.modified() {
                                    files.push((file_path.to_string_lossy().to_string(), modified));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Sort by modification time, newest first
        files.sort_by(|a, b| b.1.cmp(&a.1));
        Ok(files.into_iter().map(|(p, _)| p).collect())
    }
    
    #[tauri::command]
    pub fn log_from_frontend(level: String, message: String, details: Option<String>) {
        log_to_file(&level, &format!("[FRONTEND] {}", message), details.as_deref());
    }

    #[tauri::command]
    pub fn open_path(path: String) -> Result<(), String> {
        log_to_file("INFO", "OPEN_PATH: Opening path in file manager", Some(&format!("Path: {}", path)));
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("explorer")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    #[tauri::command]
    pub fn open_file_in_default_app(file_path: String) -> Result<(), String> {
        log_to_file("INFO", "OPEN_FILE: Opening file in default application", Some(&format!("Path: {}", file_path)));
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(&file_path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", &file_path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(&file_path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    #[tauri::command]
    pub fn show_in_folder(file_path: String) -> Result<(), String> {
        log_to_file("INFO", "SHOW_IN_FOLDER: Revealing file in file manager", Some(&format!("Path: {}", file_path)));
        let path = std::path::Path::new(&file_path);
        let folder = path.parent().unwrap_or(path).to_string_lossy().to_string();
        
        #[cfg(target_os = "linux")]
        {
            // Try xdg-open on the parent folder
            std::process::Command::new("xdg-open")
                .arg(&folder)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "windows")]
        {
            // Use explorer /select to highlight the file
            std::process::Command::new("explorer")
                .args(["/select,", &file_path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .args(["-R", &file_path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    // ============================================================
    // Phase 3: Import Release - Package Management Commands
    // ============================================================

    #[derive(Debug, Serialize, Deserialize)]
    pub struct DeleteResult {
        pub success: bool,
        pub not_found: bool,
        pub message: String,
    }

    #[tauri::command]
    pub async fn delete_from_jfrog(url: String, api_key: String) -> Result<DeleteResult, String> {
        let operation_start = std::time::Instant::now();
        let api_key_masked = if api_key.len() > 8 {
            format!("{}...{}", &api_key[..4], &api_key[api_key.len()-4..])
        } else {
            "****".to_string()
        };

        log_to_file("INFO", "DELETE_JFROG: Starting delete operation", Some(&format!(
            "URL: {}\n  API key: {} (masked)\n  Timestamp: {}",
            url, api_key_masked, chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f")
        )));

        if url.is_empty() {
            return Ok(DeleteResult {
                success: false,
                not_found: false,
                message: "URL is empty".to_string(),
            });
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| {
                log_to_file("ERROR", "DELETE_JFROG: Failed to create HTTP client", Some(&e.to_string()));
                e.to_string()
            })?;

        // First, check if the artifact exists (HEAD request)
        log_to_file("DEBUG", "DELETE_JFROG: Checking if artifact exists (HEAD)", Some(&format!("URL: {}", url)));
        let head_response = client
            .head(&url)
            .header("X-JFrog-Art-Api", &api_key)
            .send()
            .await;

        match &head_response {
            Ok(resp) if resp.status().as_u16() == 404 => {
                let elapsed = operation_start.elapsed();
                log_to_file("WARNING", "DELETE_JFROG: Artifact not found (404) - treating as already deleted", Some(&format!(
                    "URL: {}\n  Duration: {:?}", url, elapsed
                )));
                return Ok(DeleteResult {
                    success: false,
                    not_found: true,
                    message: "Artifact not found on JFrog (already deleted?)".to_string(),
                });
            }
            Ok(resp) if !resp.status().is_success() && resp.status().as_u16() != 200 => {
                // Non-success, non-404: log but still attempt delete
                log_to_file("WARNING", "DELETE_JFROG: HEAD check returned non-success status", Some(&format!(
                    "URL: {}\n  Status: {}", url, resp.status()
                )));
            }
            Err(e) => {
                log_to_file("WARNING", "DELETE_JFROG: HEAD check failed, attempting delete anyway", Some(&format!(
                    "URL: {}\n  Error: {}", url, e
                )));
            }
            _ => {
                log_to_file("DEBUG", "DELETE_JFROG: Artifact exists, proceeding with delete", Some(&format!("URL: {}", url)));
            }
        }

        // Send DELETE request
        log_to_file("DEBUG", "DELETE_JFROG: Sending HTTP DELETE request", Some(&format!("URL: {}", url)));
        let response = client
            .delete(&url)
            .header("X-JFrog-Art-Api", &api_key)
            .send()
            .await
            .map_err(|e| {
                let elapsed = operation_start.elapsed();
                log_to_file("ERROR", "DELETE_JFROG: HTTP DELETE request failed", Some(&format!(
                    "URL: {}\n  Error: {}\n  Duration: {:?}", url, e, elapsed
                )));
                e.to_string()
            })?;

        let status = response.status();
        let status_code = status.as_u16();
        let response_text = response.text().await.unwrap_or_default();
        let elapsed = operation_start.elapsed();

        // 204 No Content = success, 200 = success, 404 = already deleted
        if status_code == 204 || status_code == 200 {
            log_to_file("INFO", "DELETE_JFROG: Delete completed successfully", Some(&format!(
                "URL: {}\n  Status: {}\n  Duration: {:?}", url, status_code, elapsed
            )));
            Ok(DeleteResult {
                success: true,
                not_found: false,
                message: format!("Deleted successfully ({})", status_code),
            })
        } else if status_code == 404 {
            log_to_file("WARNING", "DELETE_JFROG: Artifact not found during delete (404)", Some(&format!(
                "URL: {}\n  Duration: {:?}", url, elapsed
            )));
            Ok(DeleteResult {
                success: false,
                not_found: true,
                message: "Artifact not found on JFrog".to_string(),
            })
        } else {
            log_to_file("ERROR", "DELETE_JFROG: Delete failed", Some(&format!(
                "URL: {}\n  Status: {} {}\n  Response: {}\n  Duration: {:?}",
                url, status_code, status.canonical_reason().unwrap_or("Unknown"), response_text, elapsed
            )));
            Ok(DeleteResult {
                success: false,
                not_found: false,
                message: format!("Delete failed: {} {}", status_code, response_text),
            })
        }
    }

    #[derive(Debug, Serialize, Deserialize)]
    pub struct ZipResult {
        pub success: bool,
        #[serde(rename = "zipPath")]
        pub zip_path: String,
        #[serde(rename = "zipFileName")]
        pub zip_file_name: String,
        pub message: String,
    }

    #[tauri::command]
    pub fn create_zip_from_file(file_path: String) -> Result<ZipResult, String> {
        log_to_file("INFO", "ZIP_FROM_FILE: Creating ZIP from single file", Some(&format!("Source: {}", file_path)));

        let source = Path::new(&file_path);
        if !source.exists() {
            return Ok(ZipResult {
                success: false,
                zip_path: String::new(),
                zip_file_name: String::new(),
                message: "Source file not found".to_string(),
            });
        }

        let file_stem = source.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let zip_file_name = format!("{}.zip", file_stem);
        let zip_path = source.parent().unwrap_or(Path::new(".")).join(&zip_file_name);

        let file = File::create(&zip_path).map_err(|e| {
            log_to_file("ERROR", "ZIP_FROM_FILE: Failed to create ZIP file", Some(&e.to_string()));
            e.to_string()
        })?;
        let mut zip = zip::ZipWriter::new(file);
        let options = zip::write::FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        let original_name = source.file_name().unwrap_or_default().to_string_lossy().to_string();
        zip.start_file(&original_name, options).map_err(|e| e.to_string())?;
        let content = fs::read(source).map_err(|e| e.to_string())?;
        zip.write_all(&content).map_err(|e| e.to_string())?;
        zip.finish().map_err(|e| e.to_string())?;

        log_to_file("INFO", "ZIP_FROM_FILE: ZIP created successfully", Some(&format!(
            "Output: {}\n  Original file: {}", zip_path.display(), original_name
        )));

        Ok(ZipResult {
            success: true,
            zip_path: zip_path.to_string_lossy().to_string(),
            zip_file_name,
            message: "ZIP created successfully".to_string(),
        })
    }

    // ============================================================
    // Phase 8: SPF Logic - parse, save, load
    // ============================================================

    #[derive(Debug, Serialize, Deserialize)]
    pub struct ParsedSpf {
        pub version: String,
        pub date: String,
        #[serde(rename = "releaseType")]
        pub release_type: String,
        #[serde(default)]
        pub description: String,
        #[serde(rename = "releaseNotes")]
        pub release_notes: String,
        pub packages: Vec<PackageData>,
    }

    /// Parse SPF content string into structured data.
    /// SPF format: <release_info>, <release_notes>, <release_pkgs> sections.
    #[tauri::command]
    pub fn parse_spf_content(content: String) -> Result<ParsedSpf, String> {
        log_to_file("INFO", "SPF_PARSE: Parsing SPF content", Some(&format!("Content length: {} bytes", content.len())));

        // Extract <release_info> section
        let info_content = extract_section(&content, "release_info")
            .ok_or_else(|| "Missing <release_info> section".to_string())?;

        let mut version = String::new();
        let mut date = String::new();
        let mut release_type = String::from("Production");
        let mut description = String::new();

        for line in info_content.lines() {
            let line = line.trim();
            if let Some(val) = line.strip_prefix("version=") {
                version = val.trim().to_string();
            } else if let Some(val) = line.strip_prefix("date=") {
                date = val.trim().to_string();
            } else if let Some(val) = line.strip_prefix("type=") {
                let t = val.trim().to_lowercase();
                release_type = if t == "development" { "Development".to_string() } else { "Production".to_string() };
            } else if let Some(val) = line.strip_prefix("description=") {
                description = val.trim().to_string();
            }
        }

        if version.is_empty() {
            return Err("SPF missing version in <release_info>".to_string());
        }

        // Extract <release_notes> section (optional)
        let release_notes = extract_section(&content, "release_notes").unwrap_or_default().trim().to_string();

        // Extract <release_pkgs> section
        let pkgs_content = extract_section(&content, "release_pkgs")
            .ok_or_else(|| "Missing <release_pkgs> section".to_string())?;

        let mut packages: Vec<PackageData> = Vec::new();
        let mut is_header = true;

        for line in pkgs_content.lines() {
            let line = line.trim();
            if line.is_empty() { continue; }

            // Skip CSV header line
            if is_header {
                if line.to_lowercase().contains("platform") && line.contains(";") {
                    is_header = false;
                    continue;
                }
                is_header = false;
            }

            let parts: Vec<&str> = line.splitn(6, ';').collect();
            if parts.len() < 6 { continue; }

            let platform = parts[0].trim().to_string();
            let spf_device = parts[1].trim().to_string();
            let spf_category = parts[2].trim().to_string();
            let signature = parts[3].trim().to_string();
            let client = parts[4].trim().to_string();
            let url = parts[5].trim().to_string();

            // Transform SPF format back to internal format
            let (device, category) = transform_from_spf_format(&platform, &spf_device, &spf_category);

            packages.push(PackageData {
                platform,
                device,
                category,
                signature,
                client,
                url,
            });
        }

        log_to_file("INFO", "SPF_PARSE: SPF parsed successfully", Some(&format!(
            "Version: {}, Date: {}, Type: {}, Packages: {}",
            version, date, release_type, packages.len()
        )));

        Ok(ParsedSpf {
            version,
            date,
            release_type,
            description,
            release_notes,
            packages,
        })
    }

    /// Save a release along with its SPF file.
    #[tauri::command]
    pub fn save_release_with_spf(release: Release) -> Result<String, String> {
        log_to_file("INFO", "SAVE_RELEASE_SPF: Saving release with SPF", Some(&format!(
            "Version: {}, Packages: {}", release.version, release.packages.len()
        )));

        // 1. Generate SPF content
        let spf_content = generate_spf_content(release.clone())?;

        // 2. Determine SPF file name
        let type_short = get_type_short(&release);
        let spf_file_name = format!("release_{}-{}-{}.spf", release.version, release.date, type_short);

        // 3. Save SPF to spf directory
        let spf_dir = get_app_data_dir().join("spf");
        fs::create_dir_all(&spf_dir).map_err(|e| e.to_string())?;
        let spf_path = spf_dir.join(&spf_file_name);
        fs::write(&spf_path, &spf_content).map_err(|e| e.to_string())?;

        // 4. Update release with spfFileName and save to releases.json
        let mut updated_release = release;
        updated_release.spf_file_name = Some(spf_file_name.clone());
        updated_release.updated_at = Some(chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string());

        // Load existing releases
        let releases_path = get_app_data_dir().join("releases.json");
        let mut releases: Vec<Release> = if releases_path.exists() {
            let content = fs::read_to_string(&releases_path).map_err(|e| e.to_string())?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Vec::new()
        };

        // Replace or add
        if let Some(pos) = releases.iter().position(|r| r.id == updated_release.id) {
            releases[pos] = updated_release;
        } else {
            releases.push(updated_release);
        }

        let json = serde_json::to_string_pretty(&releases).map_err(|e| e.to_string())?;
        fs::write(&releases_path, json).map_err(|e| e.to_string())?;

        log_to_file("INFO", "SAVE_RELEASE_SPF: Release and SPF saved", Some(&format!(
            "SPF: {}", spf_path.display()
        )));

        Ok(spf_path.to_string_lossy().to_string())
    }

    /// Load a release from an SPF file on disk.
    #[tauri::command]
    pub fn load_release_from_spf(file_path: String) -> Result<ParsedSpf, String> {
        log_to_file("INFO", "LOAD_SPF: Loading release from SPF file", Some(&format!("Path: {}", file_path)));

        let content = fs::read_to_string(&file_path).map_err(|e| {
            log_to_file("ERROR", "LOAD_SPF: Failed to read SPF file", Some(&e.to_string()));
            format!("Failed to read SPF file: {}", e)
        })?;

        parse_spf_content(content)
    }

    // Password Algorithm v3.1 - Hash-based mixing
    // Generates a 6-character uppercase hexadecimal password
    #[tauri::command]
    pub fn generate_daily_password(app_version: String, dd: u32, mm: u32, yyyy: u32) -> Result<String, String> {
        log_to_file("INFO", "PASSWORD: Generating daily password", Some(&format!(
            "Version: {}, Date: {}/{}/{}", app_version, dd, mm, yyyy
        )));

        let version_str: String = app_version.chars().filter(|c| c.is_ascii_digit()).collect();
        let version: u32 = version_str.parse().unwrap_or(1);

        // Step 1: Create initial seed
        let mut hash: i32 = ((dd * 13) + (mm * 397) + (yyyy * 7919) + (version * 2953)) as i32;

        // Step 2: First mixing round (Math.imul equivalent = wrapping_mul)
        hash = hash.wrapping_mul(0x45d9f3b_i32);
        hash = hash ^ ((hash as u32 >> 16) as i32);

        // Step 3: Date mixing
        let date_mix = ((yyyy << 9) ^ (mm << 5) ^ dd) as i32;
        hash = hash ^ date_mix;

        // Step 4: Second mixing round
        hash = hash.wrapping_mul(0x119de1f3_i32);
        hash = hash ^ ((hash as u32 >> 15) as i32);

        // Step 5: Version mixing
        let version_mix = (version as i32).wrapping_mul(0x85ebca6b_u32 as i32)
            ^ ((dd * mm) as i32).wrapping_mul(0x1b873593_i32);
        hash = hash ^ version_mix;

        // Step 6: Final mixing
        hash = hash.wrapping_mul(0xc2b2ae35_u32 as i32);
        hash = hash ^ ((hash as u32 >> 13) as i32);
        hash = hash.wrapping_mul(0x27d4eb2d_i32);
        hash = hash ^ ((hash as u32 >> 15) as i32);

        // Step 7: Bound and convert (unsigned)
        let unsigned_hash = hash as u32;
        let result = (unsigned_hash % 0xF00000) + 0x100000;

        let password = format!("{:X}", result);
        log_to_file("INFO", "PASSWORD: Password generated", Some(&format!(
            "Password: {} (version={}, date={}/{}/{})", password, version, dd, mm, yyyy
        )));

        Ok(password)
    }

    #[tauri::command]
    pub fn save_internal_spf(content: String, file_name: String) -> Result<String, String> {
        log_to_file("INFO", "SAVE_SPF: Saving internal SPF file", Some(&format!(
            "File name: {}\n  Content length: {} bytes", file_name, content.len()
        )));

        let spf_dir = get_app_data_dir().join("spf");
        fs::create_dir_all(&spf_dir).map_err(|e| {
            log_to_file("ERROR", "SAVE_SPF: Failed to create SPF directory", Some(&e.to_string()));
            e.to_string()
        })?;

        let spf_path = spf_dir.join(&file_name);
        fs::write(&spf_path, &content).map_err(|e| {
            log_to_file("ERROR", "SAVE_SPF: Failed to write SPF file", Some(&format!(
                "Path: {}\n  Error: {}", spf_path.display(), e
            )));
            e.to_string()
        })?;

        log_to_file("INFO", "SAVE_SPF: SPF file saved successfully", Some(&format!(
            "Path: {}", spf_path.display()
        )));

        Ok(spf_path.to_string_lossy().to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_directories();
    init_log_state();
    migrate_releases_to_spf();
    log_to_file("INFO", "APPLICATION: SmartPosTef Package Manager starting", Some(&format!(
        "Timestamp: {}\n  Data directory: {}",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        get_app_data_dir().display()
    )));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())

        .invoke_handler(tauri::generate_handler![
            commands::get_app_version,
            commands::get_app_paths,
            commands::get_settings,
            commands::save_settings,
            commands::get_releases,
            commands::save_release,
            commands::delete_release,
            commands::scan_folder,
            commands::scan_files,
            commands::upload_to_jfrog,
            commands::extract_and_upload_to_jfrog,
            commands::extract_root_and_upload_to_jfrog,
            commands::calculate_md5,
            commands::create_zip,
            commands::generate_spf_content,
            commands::save_spf_file,
            commands::generate_html,
            commands::export_data,
            commands::import_data,
            commands::read_file_content,
            commands::write_file_content,
            commands::get_file_size,
            commands::open_path,
            commands::open_file_in_default_app,
            commands::show_in_folder,
            commands::list_log_files,
            commands::log_from_frontend,
            commands::delete_from_jfrog,
            commands::create_zip_from_file,
            commands::save_internal_spf,
            commands::generate_daily_password,
            commands::parse_spf_content,
            commands::save_release_with_spf,
            commands::load_release_from_spf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
