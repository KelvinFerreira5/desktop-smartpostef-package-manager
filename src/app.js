// SmartPosTEF Package Manager - Tauri Edition v2.0.6
// Comprehensive package detection and Electron-style UI

// SmartPosTEF Package Manager v3.3.4
// Built-in client mappings — always present, always locked, cannot be edited or removed
const BUILTIN_CLIENT_MAPPINGS = [
  { number: '788', name: 'Lyra', builtin: true },
  { number: '877', name: 'Unica', builtin: true },
  { number: '6649', name: 'B1', builtin: true },
  { number: '867', name: 'Valori', builtin: true },
  { number: '677', name: 'Bin', builtin: true },
  { number: '668', name: 'Basa', builtin: true },
];

// State
let packages = [];
let releases = [];
let settings = { jfrogApiKey: '', clientMappings: [], portalSettings: {} };
let uploadedUrls = {};
let currentDeployMode = 'folder';
let currentDeployPurpose = null;
let currentReleaseFilter = 'all';
let currentReleaseSort = 'created-desc';
let kebabCloseListenerAdded = false;

// Contextual Help Content — keyed by page/sub-state
const HELP_CONTENT = {
  'deploy-purpose': {
    title: 'New Deploy — Choose Your Flow',
    sections: [
      { heading: 'Purpose', body: 'This is the starting screen for all deployment operations. Choose how you want to proceed based on your goal.' },
      {
        heading: 'Options', body: `
        <table class="help-table">
          <tr><td><strong>Release from Scratch</strong></td><td>Upload packages to JFrog and create a full release with version, date, release notes, and an SPF manifest file.</td></tr>
          <tr><td><strong>Upload Only</strong></td><td>Just upload packages to JFrog without creating a formal release. Useful for quick deploys or hotfixes.</td></tr>
          <tr><td><strong>Import Release</strong></td><td>Import an existing <code>.spf</code> file to edit, manage, or update a previously created release.</td></tr>
        </table>
      ` },
      { heading: 'Workflow', body: '<ol><li>Click one of the three option cards</li><li>You\'ll be taken to the corresponding form</li><li>Use the ← back arrow (top-left) to return here</li></ol>' },
    ]
  },
  'deploy-release': {
    title: 'New Deploy — Release from Scratch',
    sections: [
      { heading: 'Purpose', body: 'Create a full release: define version info, upload packages, write release notes, and generate an SPF manifest.' },
      {
        heading: 'Workflow', body: `
        <ol>
          <li>Fill in <strong>Main Version</strong> (e.g., 2.5.1) and <strong>Release Date</strong></li>
          <li>Select <strong>Type</strong> (Production or Development)</li>
          <li>Add packages via <strong>Drag & Drop</strong> or <strong>Select Folder</strong></li>
          <li>Packages are auto-detected with platform, device, and signature</li>
          <li>Write optional <strong>Release Notes</strong> (Markdown supported)</li>
          <li>Click <strong>Generate SPF</strong> to finalize and save the release</li>
        </ol>
      ` },
      {
        heading: 'Icons & Indicators', body: `
        <table class="help-table">
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Green checkmark</td><td>Package uploaded successfully</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Red X</td><td>Upload failed</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Spinner</td><td>Upload in progress</td></tr>
          <tr><td><strong>Platform badges</strong></td><td>Windows, Linux, Embedded, STA, A2A — auto-detected from filename/URL</td></tr>
        </table>
      ` },
      {
        heading: 'Actions', body: `
        <table class="help-table">
          <tr><td><strong>Select Folder</strong></td><td>Pick a folder; all supported files inside are added as packages</td></tr>
          <tr><td><strong>Upload All</strong></td><td>Starts uploading all pending packages to JFrog</td></tr>
          <tr><td><strong>Retry All</strong></td><td>Re-attempts all failed uploads</td></tr>
          <tr><td><strong>Generate SPF</strong></td><td>Creates the release, saves it locally, and generates the SPF file</td></tr>
          <tr><td><strong>← Back</strong></td><td>Return to purpose selection (packages are preserved)</td></tr>
        </table>
      ` },
    ]
  },
  'deploy-upload': {
    title: 'New Deploy — Upload Only (Deploy Only)',
    sections: [
      { heading: 'Purpose', body: 'Upload packages directly to JFrog without creating a formal release. The result is a lightweight "deploy-only" record.' },
      {
        heading: 'Workflow', body: `
        <ol>
          <li>Enter a <strong>Version</strong> identifier</li>
          <li>Optionally add a <strong>Description</strong></li>
          <li>Add packages via Drag & Drop or Select Folder</li>
          <li>Upload packages to JFrog</li>
          <li>Click <strong>Save Deploy</strong> to finalize</li>
        </ol>
      ` },
      {
        heading: 'Actions', body: `
        <table class="help-table">
          <tr><td><strong>Upload All</strong></td><td>Upload all pending packages</td></tr>
          <tr><td><strong>Save Deploy</strong></td><td>Saves the deploy-only record locally</td></tr>
          <tr><td><strong>← Back</strong></td><td>Return to purpose selection</td></tr>
        </table>
      ` },
    ]
  },
  'releases': {
    title: 'Releases — Manage Your Releases',
    sections: [
      { heading: 'Purpose', body: 'View, search, filter, and manage all saved releases (both full releases and deploy-only records).' },
      {
        heading: 'Icons & Indicators', body: `
        <table class="help-table">
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Blue upload arrow</td><td>Deploy Only — upload-only release</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" width="16" height="16"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Green package</td><td>Production release</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" width="16" height="16"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> Amber code brackets</td><td>Development release</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Green lock</td><td>All packages are signed</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Red open lock</td><td>Contains unsigned packages</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg> Calendar</td><td>Release date</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg> Clock</td><td>Creation timestamp</td></tr>
        </table>
      ` },
      {
        heading: 'Card Actions', body: `
        <table class="help-table">
          <tr><td><strong>Generate HTML</strong></td><td>Export a formatted HTML report of the release</td></tr>
          <tr><td><strong>Edit</strong></td><td>Open the release in the import/edit form to modify it</td></tr>
          <tr><td><strong>⋮ (More)</strong></td><td>Opens overflow menu with: Export SPF, Purge, Delete</td></tr>
          <tr><td><strong>▾ Chevron</strong></td><td>Expand/collapse the release summary with package details</td></tr>
        </table>
      ` },
      {
        heading: 'Overflow Menu', body: `
        <table class="help-table">
          <tr><td><strong>Export SPF</strong></td><td>Save the release as an <code>.spf</code> file for sharing</td></tr>
          <tr><td><strong>Purge</strong> (amber)</td><td>Delete packages from JFrog, then delete the release locally</td></tr>
          <tr><td><strong>Delete</strong> (red)</td><td>Delete the release locally only (packages remain on JFrog)</td></tr>
        </table>
      ` },
      { heading: 'Search & Filters', body: 'Use the search bar to filter by version. Use filter dropdowns to narrow by signature status, client, platform, device, or STA/A2A presence.' },
    ]
  },
  'settings': {
    title: 'Settings — Application Configuration',
    sections: [
      { heading: 'Purpose', body: 'Configure all application preferences. Use the <strong>sidebar tabs</strong> on the left to switch between sections: Preferences, JFrog, Client Mappings, HTML Settings, Data Export/Import, and Paths & Logs.' },
      {
        heading: 'Preferences (Theme)', body: `
        <p>Choose a visual theme for the application. 8 themes are available (4 dark, 4 light). Click any theme card to apply it instantly.</p>
        <table class="help-table">
          <tr><td><strong>Dark themes</strong></td><td>Purple Night, Ocean Storm, Rose Gold, Emerald Shadow</td></tr>
          <tr><td><strong>Light themes</strong></td><td>Teal Glow, Lavender Breeze, Sunrise Warm, Arctic Blue</td></tr>
        </table>
        <p>The selected theme is saved to localStorage and persists across sessions.</p>
      ` },
      {
        heading: 'JFrog Configuration', body: `
        <table class="help-table">
          <tr><td><strong>API Key</strong></td><td>Authentication key for JFrog API access. Stored encrypted locally (AES-256-GCM). Use the <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> eye button to toggle visibility.</td></tr>
          <tr><td><strong>Base URL</strong></td><td>The base URL of your JFrog Artifactory instance (e.g., <code>https://artifactory.example.com/artifactory</code>)</td></tr>
          <tr><td><strong>Default Repository</strong></td><td>The default repository path used when building upload destinations</td></tr>
        </table>
      ` },
      {
        heading: 'Client Mappings', body: `
        <p>Map client names to numeric codes used in version strings and SPF file paths.</p>
        <table class="help-table">
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> <strong>Locked rows</strong></td><td>Built-in mappings (Lyra, Unica, B1, Valori, Bin, Basa) — cannot be edited or removed</td></tr>
          <tr><td><strong>Custom rows</strong></td><td>Your own mappings — editable and removable via the <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> delete button</td></tr>
          <tr><td><strong>+ Add Mapping</strong></td><td>Add a new custom client name → code mapping</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg> <strong>Generate</strong></td><td>Auto-generate a unique 3-digit code from the client name using DJB2 hash</td></tr>
        </table>
      ` },
      {
        heading: 'HTML Generation Settings', body: `
        <p>Customize the appearance of generated HTML release reports.</p>
        <table class="help-table">
          <tr><td><strong>Page Title</strong></td><td>Title displayed at the top of the generated HTML page</td></tr>
          <tr><td><strong>Subtitle</strong></td><td>Secondary text below the title (e.g., company name)</td></tr>
          <tr><td><strong>Primary Color</strong></td><td>Main accent color for headers and links. Use the color picker or type a hex value.</td></tr>
          <tr><td><strong>Secondary Color</strong></td><td>Secondary accent color for gradients and highlights. Use the color picker or type a hex value.</td></tr>
        </table>
      ` },
      {
        heading: 'Data Export / Import', body: `
        <p>Backup or restore your application data selectively by category.</p>
        <table class="help-table">
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> <strong>Export</strong></td><td>Choose which categories to save to a JSON file</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> <strong>Import</strong></td><td>Restore data from a backup file; only selected categories are overwritten</td></tr>
        </table>
        <p><strong>Available categories:</strong> Releases, Theme, JFrog Settings (API key encrypted), Client Mappings, HTML Settings.</p>
      ` },
      {
        heading: 'Paths & Logs', body: `
        <p>View and open the application\'s data directories, and inspect runtime logs.</p>
        <table class="help-table">
          <tr><td><strong>User Data</strong></td><td>Root directory for all app settings and data files</td></tr>
          <tr><td><strong>Releases</strong></td><td>Where release JSON records are stored</td></tr>
          <tr><td><strong>HTML Output</strong></td><td>Where generated HTML reports are saved</td></tr>
          <tr><td><strong>Logs</strong></td><td>Application log files location</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> <strong>Open</strong></td><td>Opens the directory in your system file manager</td></tr>
          <tr><td><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> <strong>View Logs</strong></td><td>Opens a modal with recent application log entries</td></tr>
        </table>
      ` },
      { heading: 'Save Settings', body: 'Click the <strong>Save Settings</strong> button in the action bar at the bottom to persist all changes across all tabs (JFrog, Client Mappings, HTML Settings). Theme and Data operations save immediately without this button.' },
    ]
  },
  'tools': {
    title: 'Tools — Utilities',
    sections: [
      { heading: 'Purpose', body: 'Access utility tools for day-to-day operations.' },
      {
        heading: 'Daily Password Generator', body: `
        <p>Generates a time-based daily password using the v3.1 algorithm (hash-based mixing).</p>
        <table class="help-table">
          <tr><td><strong>Date selector</strong></td><td>Pick any date to generate its corresponding password</td></tr>
          <tr><td><strong>Copy button</strong></td><td>Copy the generated password to clipboard</td></tr>
        </table>
      ` },
    ]
  },
  'advanced': {
    title: 'Advanced Options — Custom Devices & Platforms',
    sections: [
      { heading: 'Purpose', body: 'Define custom device models and platform configurations that extend the built-in detection rules.' },
      {
        heading: 'Custom Devices', body: `
        <table class="help-table">
          <tr><td><strong>Add Device</strong></td><td>Create a new custom device entry with name and detection pattern</td></tr>
          <tr><td><strong>Edit</strong></td><td>Modify an existing custom device</td></tr>
          <tr><td><strong>Delete</strong></td><td>Remove a custom device</td></tr>
        </table>
        <p>Custom devices are used during package filename detection to identify hardware targets.</p>
      ` },
    ]
  },
  'import-release': {
    title: 'Import / Edit Release',
    sections: [
      { heading: 'Purpose', body: 'Import an SPF file to view, edit, or update an existing release. Also used when clicking "Edit" on a release card.' },
      {
        heading: 'Workflow', body: `
        <ol>
          <li>The release data is loaded (from file or existing record)</li>
          <li>Review and modify version, date, type, packages, and release notes</li>
          <li>Add or remove packages as needed</li>
          <li>Click <strong>Update Release</strong> (or <strong>Save Deploy</strong> for deploy-only) to save changes</li>
        </ol>
      ` },
      {
        heading: 'Actions', body: `
        <table class="help-table">
          <tr><td><strong>Update/Save Release</strong></td><td>Save all modifications to the release</td></tr>
          <tr><td><strong>Upload All</strong></td><td>Upload new packages that haven\'t been deployed yet</td></tr>
          <tr><td><strong>Release Notes</strong></td><td>Edit Markdown release notes (hidden for deploy-only releases)</td></tr>
        </table>
      ` },
    ]
  },
};

// Show contextual help for the current screen
function showHelp() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const pageId = activePage.id.replace('page-', '');
  let helpKey = pageId;

  // Deploy page sub-state detection
  if (pageId === 'deploy') {
    const purposeSelection = document.getElementById('deploy-purpose-selection');
    const uploadOnlyCard = document.getElementById('upload-only-info-card');
    if (purposeSelection && purposeSelection.style.display !== 'none') {
      helpKey = 'deploy-purpose';
    } else if (uploadOnlyCard && uploadOnlyCard.style.display !== 'none') {
      helpKey = 'deploy-upload';
    } else {
      helpKey = 'deploy-release';
    }
  }

  const content = HELP_CONTENT[helpKey];
  if (!content) {
    showModal('Help', '<p>No help content available for this screen.</p>');
    return;
  }

  const sectionsHtml = content.sections.map(s => `
    <details class="help-section" open>
      <summary>${s.heading}</summary>
      <div class="help-section-body">${s.body}</div>
    </details>
  `).join('');

  showModal(content.title, `<div class="help-content-wrapper">${sectionsHtml}</div>`);
  frontendLog('INFO', 'HELP: Contextual help shown', `Key: ${helpKey}`);
}

let currentReleaseSearch = '';
let currentReleaseFilters = { signature: 'all', client: 'all', platform: 'all', device: 'all', hasSta: false, hasA2a: false };
let releaseSearchDebounceTimer = null;
let selectedFolderPath = null;

// DOM Elements
let pages, navItems;

// Tauri API references (set after initialization)
let invoke, dialogOpen, dialogSave, dialogMessage, dialogAsk;

// Frontend logging helper - sends logs to backend log file
function frontendLog(level, message, details) {
  console.log(`[${level}] ${message}${details ? ' | ' + details : ''}`);
  if (invoke) {
    invoke('log_from_frontend', { level, message, details: details || null }).catch(() => { });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, setting up event handlers...');

  pages = document.querySelectorAll('.page');
  navItems = document.querySelectorAll('.nav-item');

  // Set up all event handlers immediately (no Tauri required)
  initNavigation();
  initDeployPage();
  initReleasesPage();
  initSettingsPage();
  initThemeToggle();

  // Contextual help button
  const helpBtn = document.getElementById('btn-help');
  if (helpBtn) helpBtn.addEventListener('click', showHelp);

  console.log('Event handlers set up, waiting for Tauri...');

  // Wait for Tauri to be available, then load data
  waitForTauri();
});

// Log unhandled errors
window.addEventListener('error', (event) => {
  frontendLog('ERROR', 'Unhandled error', `${event.message} at ${event.filename}:${event.lineno}`);
});
window.addEventListener('unhandledrejection', (event) => {
  frontendLog('ERROR', 'Unhandled promise rejection', String(event.reason));
});

// Wait for Tauri APIs to be available
function waitForTauri() {
  if (window.__TAURI__) {
    console.log('Tauri is available, initializing APIs...');
    initTauriApis();
  } else {
    console.log('Waiting for Tauri...');
    setTimeout(waitForTauri, 100);
  }
}

// Initialize Tauri APIs
async function initTauriApis() {
  try {
    // Get API references
    invoke = window.__TAURI__.core.invoke;

    // Dialog plugin
    if (window.__TAURI__.dialog) {
      dialogOpen = window.__TAURI__.dialog.open;
      dialogSave = window.__TAURI__.dialog.save;
      dialogMessage = window.__TAURI__.dialog.message;
      dialogAsk = window.__TAURI__.dialog.ask;
    }

    console.log('Tauri APIs initialized');
    frontendLog('INFO', 'APPLICATION: Tauri APIs initialized successfully');

    // Tauri native drag & drop for SPF import
    if (window.__TAURI__.event) {
      const listen = window.__TAURI__.event.listen;

      listen('tauri://drag-enter', () => {
        const dropZone = document.getElementById('spf-drop-zone');
        if (dropZone) dropZone.classList.add('drag-over');
      });

      listen('tauri://drag-leave', () => {
        const dropZone = document.getElementById('spf-drop-zone');
        if (dropZone) dropZone.classList.remove('drag-over');
      });

      listen('tauri://drag-drop', async (event) => {
        const dropZone = document.getElementById('spf-drop-zone');
        if (dropZone) dropZone.classList.remove('drag-over');

        const paths = event.payload?.paths;
        if (!paths || paths.length === 0 || !dropZone) return;

        const spfPath = paths.find(p => p.endsWith('.spf'));
        if (!spfPath) {
          showToast('error', 'Please drop a valid .spf file');
          return;
        }

        const fileName = spfPath.split(/[\/\\]/).pop();
        frontendLog('INFO', 'IMPORT: SPF file dropped via Tauri drag-drop', `File: ${fileName}`);
        try {
          const content = await invoke('read_file_content', { filePath: spfPath });
          handleSpfImport(content, fileName);
        } catch (err) {
          frontendLog('ERROR', 'IMPORT: Failed to read dropped SPF file', err.toString());
          showToast('error', 'Failed to read file: ' + err);
        }
      });

      frontendLog('INFO', 'APPLICATION: Tauri drag-drop listeners registered');
    }

    // Set footer version from backend
    try {
      const version = await invoke('get_app_version');
      const versionEl = document.getElementById('app-version');
      if (versionEl) versionEl.textContent = `v${version}`;
    } catch (e) {
      console.warn('Could not get app version:', e);
    }

    // Load initial data
    await loadInitialData();
  } catch (error) {
    console.error('Failed to initialize Tauri APIs:', error);
    frontendLog('ERROR', 'APPLICATION: Failed to initialize Tauri APIs', error.message);
    showToast('error', 'Failed to initialize: ' + error.message);
  }
}

// Ensure built-in mappings are always present and authoritative at the top of the list
function ensureBuiltinMappings() {
  if (!settings.clientMappings) settings.clientMappings = [];
  // Remove any stale built-in copies (matched by name, case-insensitive) stored from previous runs
  const builtinNames = BUILTIN_CLIENT_MAPPINGS.map(m => m.name.toLowerCase());
  settings.clientMappings = settings.clientMappings.filter(m => !builtinNames.includes((m.name || '').toLowerCase()));
  // Prepend fresh built-in objects
  settings.clientMappings.unshift(...BUILTIN_CLIENT_MAPPINGS.map(m => ({ ...m })));
}

// Load initial data from backend
async function loadInitialData() {
  try {
    frontendLog('INFO', 'APPLICATION: Loading initial data');
    settings = await invoke('get_settings');
    ensureBuiltinMappings();
    frontendLog('INFO', 'APPLICATION: Settings loaded', `API key: ${settings.jfrogApiKey ? 'configured' : 'not set'}, Mappings: ${(settings.clientMappings || []).length}`);
    populateSettings();

    releases = await invoke('get_releases');
    frontendLog('INFO', 'APPLICATION: Releases loaded', `Count: ${releases.length}`);
    renderReleases();
    populateHtmlReleaseSelect();
    populateReleaseFilterOptions();

    const paths = await invoke('get_app_paths');
    frontendLog('INFO', 'APPLICATION: App paths loaded');

    const userDataEl = document.getElementById('path-user-data');
    const releasesEl = document.getElementById('path-releases');
    const htmlEl = document.getElementById('path-html');
    const logsEl = document.getElementById('path-logs');

    if (userDataEl) userDataEl.textContent = paths.userData || paths.user_data || 'Not set';
    if (releasesEl) releasesEl.textContent = paths.releases || 'Not set';
    if (htmlEl) htmlEl.textContent = paths.html || 'Not set';
    if (logsEl) logsEl.textContent = paths.logs || 'Not set';

    showToast('success', 'Application loaded successfully');
  } catch (error) {
    console.error('Failed to load initial data:', error);
    showToast('error', 'Failed to load settings: ' + error);
  }
}

// Theme System
function initThemeToggle() {
  var THEMES = [
    { id: 'purple-night', name: 'Purple Night', type: 'Dark', preview: 'linear-gradient(135deg, #180e38, #a064ff, #e040a0)' },
    { id: 'ocean-storm', name: 'Ocean Storm', type: 'Dark', preview: 'linear-gradient(135deg, #0c1a30, #38bdf8, #2dd4bf)' },
    { id: 'rose-gold', name: 'Rose Gold', type: 'Dark', preview: 'linear-gradient(135deg, #30181f, #f47a8a, #f5c542)' },
    { id: 'emerald-shadow', name: 'Emerald Shadow', type: 'Dark', preview: 'linear-gradient(135deg, #0c1f14, #34d399, #a3e635)' },
    { id: 'teal-glow-light', name: 'Teal Glow', type: 'Light', preview: 'linear-gradient(135deg, #b8dde8, #00a896, #00695c)' },
    { id: 'lavender-breeze', name: 'Lavender Breeze', type: 'Light', preview: 'linear-gradient(135deg, #d8cef0, #7c3aed, #c026d3)' },
    { id: 'sunrise-warm', name: 'Sunrise Warm', type: 'Light', preview: 'linear-gradient(135deg, #f8d8c0, #ea580c, #dc2626)' },
    { id: 'arctic-blue', name: 'Arctic Blue', type: 'Light', preview: 'linear-gradient(135deg, #c0dce8, #0284c7, #7c3aed)' }
  ];

  function setTheme(id) {
    document.body.setAttribute('data-theme', id);
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem('spm-theme', id);
    renderThemeGrid();
    frontendLog('INFO', 'UI: Theme changed', 'Theme: ' + id);
  }

  function renderThemeGrid() {
    var grid = document.getElementById('themeGrid');
    if (!grid) return;
    var current = document.body.getAttribute('data-theme') || 'purple-night';
    grid.innerHTML = THEMES.map(function (t) {
      return '<div class="theme-card' + (t.id === current ? ' active' : '') + '" data-theme-id="' + t.id + '">'
        + '<div class="theme-preview" style="background: ' + t.preview + ';"></div>'
        + '<div class="theme-name">' + t.name + '</div>'
        + '<div class="theme-type">' + t.type + '</div>'
        + '</div>';
    }).join('');
    grid.querySelectorAll('.theme-card').forEach(function (card) {
      card.addEventListener('click', function () {
        setTheme(this.getAttribute('data-theme-id'));
      });
    });
  }

  // Apply saved theme
  var savedTheme = localStorage.getItem('spm-theme') || 'purple-night';
  setTheme(savedTheme);

  // Expose renderThemeGrid for when settings page opens
  window._renderThemeGrid = renderThemeGrid;
}

// Format helpers
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDateForDisplay(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Get full version string for SPF header from package data
// Builds the full version with hash (e.g., "2.5.1.289844" or "2.4.1.A2A.99807")
// Falls back to the user-entered version if no package version+hash is available
function getFullVersionForSpf(pkgs, fallbackVersion) {
  // Look for the first package that has both version and hash
  for (const pkg of pkgs) {
    const ver = pkg.version;
    const hash = pkg.hash;
    if (ver && hash) {
      // Check if this is a v2 hex hash (contains a-f characters)
      const isHexHash = /[a-fA-F]/.test(hash);
      if (isHexHash) {
        // v2 format for both A2A and STA/TEF: X.X.X+HEXHASH
        return `${ver}+${hash}`;
      }

      // Check if this is an A2A package
      const platform = pkg.platform || '';
      const category = pkg.category || '';
      const isA2A = platform === 'A2A' || category === 'A2A';

      if (isA2A) {
        // A2A version format: X.X.X.A2A.HASH
        return `${ver}.A2A.${hash}`;
      } else {
        // STA/TEF version format: X.X.X.HASH
        return `${ver}.${hash}`;
      }
    }
  }
  // Fallback to user-entered version
  return fallbackVersion;
}

// Initialize date picker
let datePickerInitialized = false;
function initializeDatePicker() {
  const dateInput = document.getElementById('deploy-date');
  const datePickerBtn = document.getElementById('btn-date-picker');

  if (!dateInput || !datePickerBtn) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}`;

  if (!datePickerInitialized) {
    datePickerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dateInput.showPicker();
    });
    datePickerInitialized = true;
  }
}

// Navigation
function initNavigation() {
  if (!navItems) return;

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = item.dataset.page;
      if (pageName) switchPage(pageName);
    });
  });
}

function switchPage(pageName) {
  if (!navItems || !pages) return;
  frontendLog('INFO', 'NAVIGATION: Page switched', `Page: ${pageName}`);
  navItems.forEach(item => item.classList.toggle('active', item.dataset.page === pageName));
  pages.forEach(page => page.classList.toggle('active', page.id === `page-${pageName}`));

  // Initialize page-specific logic
  if (pageName === 'tools') initToolsPage();
  if (pageName === 'advanced') initAdvancedOptionsPage();
  if (pageName === 'settings' && window._renderThemeGrid) window._renderThemeGrid();
}

// Deploy Page
function initDeployPage() {
  console.log('Initializing deploy page...');

  // Purpose selection
  const purposeBtns = document.querySelectorAll('.deploy-purpose-btn');
  purposeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      currentDeployPurpose = btn.dataset.purpose;
      frontendLog('INFO', 'DEPLOY: Purpose selected', `Purpose: ${currentDeployPurpose}`);
      const purposeSelection = document.getElementById('deploy-purpose-selection');
      const deployContent = document.getElementById('deploy-content');

      if (purposeSelection) purposeSelection.style.display = 'none';
      if (deployContent) deployContent.style.display = 'block';
      const backBtn = document.getElementById('btn-back-to-purpose');
      if (backBtn) backBtn.style.display = '';

      const releaseInfoCard = document.getElementById('release-info-card');
      const uploadOnlyCard = document.getElementById('upload-only-info-card');
      const btnGenerateSpf = document.getElementById('btn-generate-spf');

      if (currentDeployPurpose === 'import') {
        // Navigate to the Import Release page
        if (purposeSelection) purposeSelection.style.display = 'block';
        if (deployContent) deployContent.style.display = 'none';
        currentDeployPurpose = null;
        switchPage('import-release');
        initImportReleasePage();
        return;
      }

      if (currentDeployPurpose === 'release') {
        if (releaseInfoCard) releaseInfoCard.style.display = 'block';
        if (uploadOnlyCard) uploadOnlyCard.style.display = 'none';
        if (btnGenerateSpf) btnGenerateSpf.style.display = 'inline-flex';
        initializeDatePicker();
      } else {
        if (releaseInfoCard) releaseInfoCard.style.display = 'none';
        if (uploadOnlyCard) uploadOnlyCard.style.display = 'block';
        if (btnGenerateSpf) btnGenerateSpf.style.display = 'none';
      }
    });
  });

  // Back to purpose button (in page header)
  const btnBackToPurpose = document.getElementById('btn-back-to-purpose');
  if (btnBackToPurpose) {
    btnBackToPurpose.addEventListener('click', (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Back to purpose clicked');
      currentDeployPurpose = null;
      clearPackages();
      const purposeSelection = document.getElementById('deploy-purpose-selection');
      const deployContent = document.getElementById('deploy-content');
      if (purposeSelection) purposeSelection.style.display = 'block';
      if (deployContent) deployContent.style.display = 'none';
      btnBackToPurpose.style.display = 'none';
    });
  }

  // Version inputs (version is now auto-detected from scanned packages)
  const deployVersionInput = document.getElementById('deploy-version');
  const uploadVersionInput = document.getElementById('upload-version');

  // Deploy mode buttons (Scan Folder / Add Manually)
  const deployModeBtns = document.querySelectorAll('.deploy-mode-btn');
  deployModeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const mode = btn.dataset.mode;
      currentDeployMode = mode;
      frontendLog('INFO', 'DEPLOY: Deploy mode changed', `Mode: ${mode}`);
      deployModeBtns.forEach(b => b.classList.toggle('active', b === btn));

      const folderContent = document.getElementById('deploy-mode-folder');
      const manualContent = document.getElementById('deploy-mode-manual');

      if (mode === 'folder') {
        if (folderContent) folderContent.classList.add('active');
        if (manualContent) manualContent.classList.remove('active');
      } else {
        if (folderContent) folderContent.classList.remove('active');
        if (manualContent) manualContent.classList.add('active');
      }
    });
  });

  // Select folder button
  const btnSelectFolder = document.getElementById('btn-select-folder');
  if (btnSelectFolder) {
    btnSelectFolder.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Select folder button clicked');
      await handleSelectFolder();
    });
  }

  // Cancel folder button
  const btnCancelFolder = document.getElementById('btn-cancel-folder');
  if (btnCancelFolder) {
    btnCancelFolder.addEventListener('click', (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Cancel folder selection clicked');
      selectedFolderPath = null;
      packages = [];
      renderPackages();
      updateSummary();
      updateActionButtons();

      const selectedFolderDiv = document.querySelector('.selected-folder');
      if (selectedFolderDiv) selectedFolderDiv.style.display = 'none';
      if (btnCancelFolder) btnCancelFolder.style.display = 'none';
    });
  }

  // Add package button (manual mode)
  const btnAddPackage = document.getElementById('btn-add-package');
  if (btnAddPackage) {
    btnAddPackage.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Add package manually button clicked');
      await handleAddManual();
    });
  }

  // Upload all button
  const btnUploadAll = document.getElementById('btn-upload-all');
  if (btnUploadAll) {
    btnUploadAll.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Upload all button clicked');
      await handleUploadAll();
    });
  }

  // Retry all failed button
  const btnRetryAll = document.getElementById('btn-retry-all');
  if (btnRetryAll) {
    btnRetryAll.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Retry all failed button clicked');
      await handleRetryAll();
    });
  }

  // Generate SPF button (kept for backward compatibility, but hidden in new flow)
  const btnGenerateSpf = document.getElementById('btn-generate-spf');
  if (btnGenerateSpf) {
    btnGenerateSpf.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Generate SPF button clicked');
      await handleGenerateSpf();
    });
  }

  // Finalize Release button (shown after all uploads complete)
  const btnFinalizeRelease = document.getElementById('btn-finalize-release');
  if (btnFinalizeRelease) {
    btnFinalizeRelease.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Finalize Release button clicked');
      await handleFinalizeRelease();
    });
  }

  // Finalize Deploy Only button (shown after all uploads complete in upload-only mode)
  const btnFinalizeDeployOnly = document.getElementById('btn-finalize-deploy-only');
  if (btnFinalizeDeployOnly) {
    btnFinalizeDeployOnly.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Finalize Deploy Only button clicked');
      await handleFinalizeDeployOnly();
    });
  }

  // Clear all button
  const btnClearAll = document.getElementById('btn-clear-all');
  if (btnClearAll) {
    btnClearAll.addEventListener('click', (e) => {
      e.preventDefault();
      frontendLog('INFO', 'DEPLOY: Clear all packages button clicked');
      clearPackages();
    });
  }

  // Release notes tabs (Edit/Preview)
  const noteTabs = document.querySelectorAll('.tab-btn');
  noteTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.dataset.tab;

      noteTabs.forEach(t => t.classList.toggle('active', t === tab));

      const editor = document.getElementById('deploy-notes');
      const preview = document.getElementById('deploy-notes-preview');

      if (tabName === 'edit') {
        if (editor) editor.classList.add('active');
        if (preview) preview.classList.remove('active');
      } else {
        if (editor) editor.classList.remove('active');
        if (preview) {
          preview.classList.add('active');
          const notesText = editor ? editor.value : '';
          if (typeof marked !== 'undefined') {
            preview.innerHTML = marked.parse(notesText || '*No release notes*');
          } else {
            preview.innerHTML = notesText.replace(/\n/g, '<br>') || '<em>No release notes</em>';
          }
        }
      }
    });
  });

  console.log('Deploy page initialized');
}

// Handle folder selection
async function handleSelectFolder() {
  frontendLog('INFO', 'FOLDER: Opening folder selection dialog');
  if (!dialogOpen) {
    frontendLog('ERROR', 'FOLDER: File dialog not available');
    showToast('error', 'File dialog not available');
    return;
  }

  try {
    const selected = await dialogOpen({
      directory: true,
      multiple: false,
      title: 'Select Packages Folder'
    });

    if (selected) {
      selectedFolderPath = selected;
      frontendLog('INFO', 'FOLDER: Folder selected', `Path: ${selected}`);

      const selectedFolderSpan = document.getElementById('selected-folder');
      const selectedFolderDiv = document.querySelector('.selected-folder');
      const btnCancelFolder = document.getElementById('btn-cancel-folder');

      if (selectedFolderSpan) selectedFolderSpan.textContent = selected;
      if (selectedFolderDiv) selectedFolderDiv.style.display = 'flex';
      if (btnCancelFolder) btnCancelFolder.style.display = 'inline-flex';

      showToast('info', 'Scanning folder for packages...');
      await scanSelectedFolder();
    } else {
      frontendLog('INFO', 'FOLDER: Folder selection cancelled by user');
    }
  } catch (error) {
    console.error('Failed to open folder dialog:', error);
    frontendLog('ERROR', 'FOLDER: Failed to open folder dialog', error.toString());
    showToast('error', 'Failed to open folder dialog: ' + error);
  }
}

// Scan the selected folder for packages
async function scanSelectedFolder() {
  if (!selectedFolderPath || !invoke) {
    showToast('warning', 'Please select a folder first');
    return;
  }

  try {
    frontendLog('INFO', 'SCAN: Starting folder scan', `Path: ${selectedFolderPath}`);
    const scanResult = await invoke('scan_folder', { folderPath: selectedFolderPath });

    // Check for version error (multiple different versions in folder)
    if (scanResult.versionError) {
      showToast('error', scanResult.versionError);
      // Clear packages and don't proceed
      packages = [];
      renderPackages();
      updateSummary();
      updateActionButtons();
      return;
    }

    // Set packages from scan result
    packages = scanResult.packages || [];

    // Restore upload state from previous uploads
    for (const pkg of packages) {
      const fileName = pkg.fileName || pkg.file_name;
      if (fileName && uploadedUrls[fileName]) {
        pkg.uploaded = true;
        pkg.url = uploadedUrls[fileName];
      }
    }

    // Show companion file warnings
    if (scanResult.companionWarnings && scanResult.companionWarnings.length > 0) {
      for (const warning of scanResult.companionWarnings) {
        showToast('warning', warning);
      }
    }

    // Auto-fill version if detected
    if (scanResult.detectedVersion) {
      const deployVersionInput = document.getElementById('deploy-version');
      const uploadVersionInput = document.getElementById('upload-version');

      if (deployVersionInput) {
        deployVersionInput.value = scanResult.detectedVersion;
      }
      if (uploadVersionInput) {
        uploadVersionInput.value = scanResult.detectedVersion;
      }

      console.log('Auto-detected version:', scanResult.detectedVersion);
    }

    renderPackages();
    updateSummary();
    updateActionButtons();
    autoDetectReleaseType();

    if (packages.length > 0) {
      frontendLog('INFO', 'SCAN: Folder scan completed', `Packages found: ${packages.length}`);
      showToast('success', `Found ${packages.length} packages`);
    } else {
      frontendLog('WARNING', 'SCAN: No packages found in folder');
      showToast('warning', 'No recognized packages found in the selected folder');
    }
  } catch (error) {
    console.error('Failed to scan folder:', error);
    frontendLog('ERROR', 'SCAN: Failed to scan folder', error.toString());
    showToast('error', 'Failed to scan folder: ' + error);
  }
}

// Auto-detect release type based on packages
function autoDetectReleaseType() {
  if (packages.length === 0) return;

  const devCount = packages.filter(p => p.isDev || p.is_dev).length;
  const prodCount = packages.filter(p => !(p.isDev || p.is_dev)).length;
  frontendLog('INFO', 'AUTO_DETECT: Detecting release type', `Dev packages: ${devCount}, Prod packages: ${prodCount}`);

  const typeSelect = document.getElementById('deploy-type');
  if (typeSelect) {
    if (devCount > 0 && prodCount === 0) {
      typeSelect.value = 'Development';
      frontendLog('INFO', 'AUTO_DETECT: Release type detected', 'Type: Development');
      showToast('info', 'Auto-detected: Development release');
    } else if (prodCount > 0 && devCount === 0) {
      typeSelect.value = 'Production';
      frontendLog('INFO', 'AUTO_DETECT: Release type detected', 'Type: Production');
      showToast('info', 'Auto-detected: Production release');
    } else if (devCount > 0 && prodCount > 0) {
      frontendLog('WARNING', 'AUTO_DETECT: Mixed package types detected');
      showToast('warning', 'Mixed package types detected (both Production and Development). Please verify.');
    }
  }
}

// Handle add manual
async function handleAddManual() {
  frontendLog('INFO', 'MANUAL_ADD: Opening file selection dialog');
  if (!dialogOpen) {
    frontendLog('ERROR', 'MANUAL_ADD: File dialog not available');
    showToast('error', 'File dialog not available');
    return;
  }

  try {
    const selected = await dialogOpen({
      multiple: true,
      filters: [
        { name: 'Package Files', extensions: ['apk', 'zip', 'aar', 'so', 'dll', 'lib', 'exe', 'deb', 'rpm', 'tar', 'gz', 'sh', 'run'] }
      ],
      title: 'Select Package Files'
    });

    if (selected) {
      const files = Array.isArray(selected) ? selected : [selected];

      if (files.length > 0 && invoke) {
        frontendLog('INFO', 'MANUAL_ADD: Scanning selected files', `Files: ${files.length}`);
        const scannedPackages = await invoke('scan_files', { filePaths: files });
        packages = [...packages, ...scannedPackages];
        renderPackages();
        updateSummary();
        updateActionButtons();

        // In "New Release" mode, auto-detect version from added files
        if (currentDeployPurpose === 'release') {
          autoDetectVersionFromPackages();
        }

        frontendLog('INFO', 'MANUAL_ADD: Packages added', `Count: ${scannedPackages.length}`);
        showToast('success', `Added ${scannedPackages.length} packages`);
      }
    }
  } catch (error) {
    console.error('Failed to add files:', error);
    frontendLog('ERROR', 'MANUAL_ADD: Failed to add files', error.toString());
    showToast('error', 'Failed to add files: ' + error);
  }
}

// Extract base version from full version string
function extractBaseVersion(version) {
  if (!version) return null;

  // Handle v2 versions with hex hash: X.X.X+HEXHASH -> X.X.X
  if (version.includes('+')) {
    return version.split('+')[0];
  }

  // Handle A2A versions: X.X.X.A2A.HASH -> X.X.X
  if (version.includes('.A2A.')) {
    const parts = version.split('.A2A.');
    if (parts.length > 0) {
      return parts[0];
    }
  }

  // Handle STA/TEF versions: X.X.X.HASH or X.X.X -> X.X.X
  const parts = version.split('.');
  if (parts.length >= 3) {
    // Check if first 3 parts are numeric
    if (!isNaN(parts[0]) && !isNaN(parts[1]) && /^\d+$/.test(parts[2])) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
  }

  return null;
}

// Auto-detect version from current packages
function autoDetectVersionFromPackages() {
  const baseVersions = new Set();

  for (const pkg of packages) {
    // Skip companion files (but not S920 unsigned which have extract-s920-root)
    const handling = pkg.specialHandling || pkg.special_handling || '';
    if (handling && handling !== 'extract-s920-root') continue;

    const version = pkg.version;
    if (version) {
      const baseVersion = extractBaseVersion(version);
      if (baseVersion) {
        baseVersions.add(baseVersion);
      }
    }
  }

  if (baseVersions.size === 1) {
    const detectedVersion = [...baseVersions][0];
    const deployVersionInput = document.getElementById('deploy-version');
    const uploadVersionInput = document.getElementById('upload-version');

    // Only auto-fill if the field is empty
    if (deployVersionInput && !deployVersionInput.value) {
      deployVersionInput.value = detectedVersion;
    }
    if (uploadVersionInput && !uploadVersionInput.value) {
      uploadVersionInput.value = detectedVersion;
    }

    frontendLog('INFO', 'AUTO_DETECT: Version detected from packages', `Version: ${detectedVersion}`);
  } else if (baseVersions.size > 1) {
    frontendLog('WARNING', 'AUTO_DETECT: Multiple versions detected', `Versions: ${[...baseVersions].join(', ')}`);
    showToast('warning', `Multiple versions detected: ${[...baseVersions].join(', ')}. Please verify the version field.`);
  }
}

// Validate that the entered version matches detected package versions
async function validateVersionMatch(enteredVersion) {
  if (!enteredVersion || packages.length === 0) return null;

  const detectedVersions = new Set();

  for (const pkg of packages) {
    // Skip companion files (but not S920 unsigned which have extract-s920-root)
    const handling = pkg.specialHandling || pkg.special_handling || '';
    if (handling && handling !== 'extract-s920-root') continue;

    const version = pkg.version;
    if (version) {
      const baseVersion = extractBaseVersion(version);
      if (baseVersion) {
        detectedVersions.add(baseVersion);
      }
    }
  }

  if (detectedVersions.size === 0) return null;

  // Check if entered version matches any detected version
  const enteredBase = extractBaseVersion(enteredVersion) || enteredVersion;

  if (!detectedVersions.has(enteredBase)) {
    const detectedList = [...detectedVersions].join(', ');
    return `The entered version "${enteredVersion}" does not match the detected package version(s): ${detectedList}`;
  }

  return null;
}

// Show a confirmation dialog and return true if user confirms
function showConfirmDialog(title, message, options = {}) {
  const okLabel = options.okLabel || 'Confirm';
  const cancelLabel = options.cancelLabel || 'Cancel';
  const kind = options.kind || 'info'; // 'info', 'warning', 'error'
  const isDelete = kind === 'error' || title.toLowerCase().includes('delete');

  // Determine button style based on kind
  const okBtnClass = isDelete ? 'btn btn-danger' : 'btn btn-primary';

  // Icon SVGs
  const icons = {
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`
  };

  const iconSvg = isDelete ? icons.delete : (kind === 'warning' ? icons.warning : icons.info);
  const gradientClass = isDelete ? 'confirm-header-danger' : (kind === 'warning' ? 'confirm-header-warning' : 'confirm-header-info');

  frontendLog('INFO', 'UI: Confirm dialog shown', `Title: ${title}, Kind: ${kind}`);

  return new Promise((resolve) => {
    // Create modal overlay using the existing .modal CSS class system
    const overlay = document.createElement('div');
    overlay.className = 'modal active';
    overlay.style.zIndex = '2000';

    overlay.innerHTML = `
      <div class="modal-content confirm-dialog" style="max-width: 420px; padding: 0;">
        <div class="confirm-header ${gradientClass}">
          <div class="confirm-icon">${iconSvg}</div>
          <h3 class="confirm-title">${title}</h3>
        </div>
        <div class="confirm-body">
          ${message}
        </div>
        <div class="confirm-footer">
          <button class="btn btn-secondary" id="confirm-cancel">${cancelLabel}</button>
          <button class="${okBtnClass}" id="confirm-ok">${okLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('#confirm-cancel');
    const okBtn = overlay.querySelector('#confirm-ok');

    const cleanup = (result) => {
      frontendLog('INFO', 'UI: Confirm dialog result', `Title: ${title}, Result: ${result ? 'confirmed' : 'cancelled'}`);
      overlay.remove();
      resolve(result);
    };

    cancelBtn.addEventListener('click', () => cleanup(false));
    okBtn.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

// Get status class for package
function getStatusClass(pkg) {
  if (pkg.uploaded) return 'status-success';
  if (pkg.uploading) return 'status-uploading';
  if (pkg.error) return 'status-error';
  return 'status-pending';
}

// Get status text for package
function getStatusText(pkg) {
  if (pkg.uploaded) return 'Uploaded';
  if (pkg.uploading) return 'Uploading...';
  if (pkg.error) return 'Failed';
  return 'Pending';
}

// Render signature field
function renderSignatureField(pkg, index) {
  if (pkg.signature) {
    return `<input type="text" class="package-field-input filled" placeholder="Signature" value="${pkg.signature}" data-field="signature" data-index="${index}">`;
  } else {
    return `<button class="add-field-btn" data-field="signature" data-index="${index}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Signature
    </button>`;
  }
}

// Render client field
function renderClientField(pkg, index) {
  if (pkg.client) {
    return `<input type="text" class="package-field-input filled" placeholder="Client" value="${pkg.client}" data-field="client" data-index="${index}">`;
  } else {
    return `<button class="add-field-btn" data-field="client" data-index="${index}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Client
    </button>`;
  }
}

// Sort packages: Library -> Installer -> STA (Launcher then App), alphabetically
function sortPackages() {
  const categoryOrder = {
    'Library': 1,
    'Installer': 2,
    'Launcher': 3,
    'App': 4,
    'SDK': 5,
    'Documentation': 6,
    'Unknown': 99
  };

  const platformOrder = {
    'Windows': 1,
    'Linux32': 2,
    'Linux64': 3,
    'Android': 4,
    'Unknown': 99
  };

  packages.sort((a, b) => {
    const catA = a.category || 'Unknown';
    const catB = b.category || 'Unknown';
    const platA = a.platform || 'Unknown';
    const platB = b.platform || 'Unknown';

    // First sort by category
    const catOrderA = categoryOrder[catA] || 99;
    const catOrderB = categoryOrder[catB] || 99;
    if (catOrderA !== catOrderB) return catOrderA - catOrderB;

    // Then by platform within same category
    const platOrderA = platformOrder[platA] || 99;
    const platOrderB = platformOrder[platB] || 99;
    if (platOrderA !== platOrderB) return platOrderA - platOrderB;

    // Then alphabetically by filename
    const nameA = (a.fileName || a.file_name || a.name || '').toLowerCase();
    const nameB = (b.fileName || b.file_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

// Render packages - Electron-style layout
function renderPackages() {
  const container = document.getElementById('packages-list');
  if (!container) return;

  // Sort packages before rendering
  sortPackages();

  if (packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <p>Select a folder to scan for packages or add them manually</p>
      </div>
    `;
    return;
  }

  container.innerHTML = packages.map((pkg, index) => {
    const fileName = pkg.fileName || pkg.file_name || pkg.name || 'Unknown';
    const platform = pkg.platform || 'Unknown';
    const device = pkg.device || 'Unknown';
    const category = pkg.category;
    const jfrogPath = pkg.jfrogPath || pkg.jfrog_path || 'Path not determined';
    const isManualPath = (!pkg.jfrogPath && !pkg.jfrog_path) || pkg._manualPath;
    if (isManualPath) pkg._manualPath = true;
    const size = pkg.size || 0;
    const isSigned = pkg.isSigned || pkg.is_signed;
    const isDev = pkg.isDev || pkg.is_dev;
    const specialHandling = pkg.specialHandling || pkg.special_handling || '';
    const extractFolder = pkg.extractFolder || pkg.extract_folder || '';
    const isS920Extract = specialHandling === 'extract-s920-root';
    const isCompanionExtract = specialHandling && !isS920Extract;

    return `
    <div class="package-item ${isDev ? 'dev-package' : ''}" data-index="${index}">
      <div class="package-info">
        <div class="package-name">${fileName}</div>
        <div class="package-details">
          <span class="package-tag platform">${platform}</span>
          <span class="package-tag device">${displayDeviceName(device)}</span>
          ${category ? `<span class="package-tag category">${category}</span>` : ''}
          ${isSigned === false ? `<span class="package-tag unsigned">Unsigned</span>` : ''}
          ${isSigned === true ? `<span class="package-tag signed">Signed</span>` : ''}
          ${isDev ? `<span class="package-tag dev">Dev</span>` : ''}
          ${isCompanionExtract ? `<span class="package-tag special">Extract</span>` : ''}
          ${isS920Extract ? `<span class="package-tag special">Extract → ${extractFolder}/</span>` : ''}
          <span class="package-tag size">${formatFileSize(size)}</span>
        </div>
        <div class="package-path">${isManualPath
        ? `→ <input type="text" class="package-path-input" data-index="${index}" placeholder="Enter JFrog path (e.g., packages/app-to-app/apk/pax/a910/)" value="${jfrogPath === 'Path not determined' ? '' : jfrogPath}" />`
        : `→ ${isS920Extract ? jfrogPath + extractFolder + '/' : jfrogPath}`
      }</div>
        <div class="package-fields">
          ${renderSignatureField(pkg, index)}
          ${renderClientField(pkg, index)}
        </div>
      </div>
      <div class="package-actions">
        <span class="status-badge ${getStatusClass(pkg)}">${getStatusText(pkg)}</span>
        ${pkg.error ? `<button class="btn btn-sm btn-secondary btn-retry" data-index="${index}">Retry</button>` : ''}
        <button class="btn-remove-package" data-index="${index}" title="Remove package">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  }).join('');

  // Attach event listeners for remove buttons
  container.querySelectorAll('.btn-remove-package').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(btn.dataset.index);
      const removedPkg = packages[index];
      frontendLog('INFO', 'DEPLOY: Package removed', `Index: ${index}, File: ${removedPkg ? (removedPkg.fileName || removedPkg.file_name) : 'unknown'}`);
      packages.splice(index, 1);
      renderPackages();
      updateSummary();
      updateActionButtons();
    });
  });

  // Attach event listeners for retry buttons
  container.querySelectorAll('.btn-retry').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const index = parseInt(btn.dataset.index);
      frontendLog('INFO', 'DEPLOY: Retry upload clicked', `Index: ${index}`);
      await retryUpload(index);
    });
  });

  // Attach event listeners for manual JFrog path inputs
  container.querySelectorAll('.package-path-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      let value = e.target.value.trim();
      if (value && !value.endsWith('/')) value += '/';
      packages[index].jfrogPath = value || undefined;
      packages[index].jfrog_path = value || undefined;
      packages[index]._manualPath = true;
      frontendLog('INFO', 'DEPLOY: Manual JFrog path set', `Index: ${index}, Path: ${value || '(cleared)'}`);
    });
  });

  // Attach event listeners for field inputs
  container.querySelectorAll('.package-field-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      packages[index][field] = e.target.value;
    });
  });

  // Attach event listeners for add field buttons
  container.querySelectorAll('.add-field-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(btn.dataset.index);
      const field = btn.dataset.field;
      frontendLog('INFO', `DEPLOY: Add ${field} button clicked`, `Package index: ${index}`);
      showAddFieldModal(index, field);
    });
  });
}

// Show add field modal
function showAddFieldModal(index, field) {
  const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
  showModal(`Add ${fieldName}`, `
    <div class="form-group">
      <label for="modal-field-value">${fieldName}</label>
      <input type="text" id="modal-field-value" placeholder="Enter ${field}">
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-save">Save</button>
    </div>
  `);

  const modalInput = document.getElementById('modal-field-value');
  const modalSave = document.getElementById('modal-save');
  const modalCancel = document.getElementById('modal-cancel');

  if (modalInput) modalInput.focus();

  if (modalSave) {
    modalSave.addEventListener('click', () => {
      const value = modalInput ? modalInput.value : '';
      if (value) {
        frontendLog('INFO', `DEPLOY: ${field} value saved`, `Package index: ${index}, Value: ${value}`);
        packages[index][field] = value;

        // If client field was added, update the JFrog path to include client name
        if (field === 'client') {
          const pkg = packages[index];
          const currentPath = pkg.jfrogPath || pkg.jfrog_path || '';
          // Add client name in lowercase to the path if not already present
          const clientLower = value.toLowerCase();
          if (currentPath && !currentPath.includes(clientLower)) {
            // Insert client name before the last segment (e.g., launcher/ or app/)
            const pathParts = currentPath.split('/');
            if (pathParts.length >= 2) {
              pathParts.splice(pathParts.length - 1, 0, clientLower);
              pkg.jfrogPath = pathParts.join('/');
              pkg.jfrog_path = pkg.jfrogPath;
            }
          }
        }

        renderPackages();
        closeModal();
      }
    });
  }

  if (modalCancel) {
    modalCancel.addEventListener('click', closeModal);
  }
}

// Show modal
function showModal(title, content) {
  frontendLog('INFO', 'UI: Modal shown', `Title: ${title}`);
  // Remove existing modal to ensure fresh event listeners
  let existingModal = document.getElementById('modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'modal';
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modal-title">${title}</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body" id="modal-body">${content}</div>
    </div>
  `;
  document.body.appendChild(modal);

  // Attach event listeners
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  modal.querySelector('#modal-close-btn').addEventListener('click', closeModal);
}

// Close modal
function closeModal() {
  frontendLog('INFO', 'UI: Modal closed');
  const modal = document.getElementById('modal');
  if (modal) modal.classList.remove('active');
}

// Update summary section
function updateSummary() {
  const summary = document.getElementById('release-summary');
  const content = document.getElementById('summary-content');

  if (!summary || !content) return;

  if (packages.length === 0) {
    summary.style.display = 'none';
    return;
  }

  summary.style.display = 'block';

  // Count by platform
  const platforms = {};
  packages.forEach(pkg => {
    const platform = pkg.platform || 'Unknown';
    platforms[platform] = (platforms[platform] || 0) + 1;
  });

  // Calculate total size
  const totalSize = packages.reduce((sum, pkg) => sum + (pkg.size || 0), 0);

  content.innerHTML = `
    <div class="summary-item">
      <h4>Total Packages</h4>
      <div class="value">${packages.length}</div>
    </div>
    <div class="summary-item">
      <h4>Total Size</h4>
      <div class="value">${formatFileSize(totalSize)}</div>
    </div>
    ${Object.entries(platforms).map(([platform, count]) => `
      <div class="summary-item">
        <h4>${platform}</h4>
        <div class="value">${count}</div>
      </div>
    `).join('')}
  `;
}

// Update action buttons state
function updateActionButtons() {
  const hasPackages = packages.length > 0;
  const allUploaded = hasPackages && packages.every(p => p.uploaded);

  const btnUploadAll = document.getElementById('btn-upload-all');
  const btnRetryAll = document.getElementById('btn-retry-all');
  const btnGenerateSpf = document.getElementById('btn-generate-spf');
  const btnFinalizeRelease = document.getElementById('btn-finalize-release');
  const btnFinalizeDeployOnly = document.getElementById('btn-finalize-deploy-only');
  const btnClearAll = document.getElementById('btn-clear-all');

  if (btnUploadAll) btnUploadAll.disabled = !hasPackages || allUploaded;
  if (btnClearAll) btnClearAll.style.display = hasPackages ? 'inline-flex' : 'none';

  // Show "Retry All Failed" when there are failed packages
  const hasFailed = hasPackages && packages.some(p => p.error);
  if (btnRetryAll) btnRetryAll.style.display = hasFailed ? 'inline-flex' : 'none';

  // In "New Release" mode: Generate SPF is always hidden; show "Finalize Release" after all uploads
  if (currentDeployPurpose === 'release') {
    if (btnGenerateSpf) btnGenerateSpf.style.display = 'none';
    if (btnFinalizeDeployOnly) btnFinalizeDeployOnly.style.display = 'none';
    if (allUploaded) {
      if (btnFinalizeRelease) btnFinalizeRelease.style.display = 'inline-flex';
    } else {
      if (btnFinalizeRelease) btnFinalizeRelease.style.display = 'none';
    }
  } else {
    // Upload Only mode: no SPF or finalize buttons, show "Done" after all uploads
    if (btnGenerateSpf) btnGenerateSpf.style.display = 'none';
    if (btnFinalizeRelease) btnFinalizeRelease.style.display = 'none';
    if (allUploaded) {
      if (btnFinalizeDeployOnly) btnFinalizeDeployOnly.style.display = 'inline-flex';
    } else {
      if (btnFinalizeDeployOnly) btnFinalizeDeployOnly.style.display = 'none';
    }
  }
}

// Finalize deploy-only upload
async function handleFinalizeDeployOnly() {
  frontendLog('INFO', 'DEPLOY_ONLY: Starting deploy-only finalization');
  const versionInput = document.getElementById('upload-version');
  const descriptionInput = document.getElementById('upload-description');
  const version = versionInput ? versionInput.value.trim() : '';

  if (!version) {
    showToast('error', 'Please fill in the version');
    return;
  }

  if (!invoke) {
    showToast('error', 'Backend not available');
    return;
  }

  // Disable the button to prevent double-click
  const btnFinalizeDeployOnly = document.getElementById('btn-finalize-deploy-only');
  if (btnFinalizeDeployOnly) btnFinalizeDeployOnly.disabled = true;

  // Filter out online companion packages
  const spfPackages = packages.filter(pkg => {
    const fileName = pkg.fileName || pkg.file_name || '';
    const handling = pkg.specialHandling || pkg.special_handling || '';
    const isOnlineCompanion = fileName === 'Linux_64-Gui-Installer.zip' ||
      fileName === 'Linux_i386-Installer.zip' ||
      fileName === 'x86.zip' ||
      (handling && handling !== 'extract-s920-root');
    return !isOnlineCompanion;
  });

  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const spfVersion = getFullVersionForSpf(spfPackages, version);

  const releaseData = {
    id: `${version}-deploy-only-${Date.now()}`,
    version: spfVersion,
    date,
    type: 'deploy-only',
    releaseType: 'deploy-only',
    description: descriptionInput ? descriptionInput.value.trim() : '',
    releaseNotes: '',
    packages: spfPackages.map(pkg => ({
      platform: pkg.platform || 'Unknown',
      device: pkg.device || '',
      category: pkg.category || '',
      signature: pkg.signature || '',
      client: pkg.client || '',
      url: pkg.url || uploadedUrls[pkg.fileName || pkg.file_name] || ''
    })),
    createdAt: new Date().toISOString()
  };

  try {
    // Step 1: Save release
    frontendLog('INFO', 'DEPLOY_ONLY: Step 1 - Saving release');
    await invoke('save_release', { release: releaseData });
    frontendLog('INFO', 'DEPLOY_ONLY: Release saved', `Version: ${spfVersion}`);

    // Step 2: Generate and auto-save SPF file
    frontendLog('INFO', 'DEPLOY_ONLY: Step 2 - Generating SPF file');
    try {
      const spfContent = await invoke('generate_spf_content', { release: releaseData });
      const spfFileName = `release_${spfVersion}-${date}-deploy.spf`;
      const paths = await invoke('get_app_paths');
      const spfSavePath = `${paths.userData}/${spfFileName}`;
      await invoke('save_spf_file', { content: spfContent, filePath: spfSavePath });
      frontendLog('INFO', 'DEPLOY_ONLY: SPF file auto-saved', `Path: ${spfSavePath}`);
    } catch (spfError) {
      frontendLog('ERROR', 'DEPLOY_ONLY: Failed to generate/save SPF', spfError.toString());
      showToast('warning', 'Release saved but SPF generation failed: ' + spfError);
    }

    // Step 3: Refresh releases list (NO HTML generation for deploy-only)
    frontendLog('INFO', 'DEPLOY_ONLY: Step 3 - Refreshing releases list');
    releases = await invoke('get_releases');
    renderReleases();
    populateHtmlReleaseSelect();
    populateReleaseFilterOptions();

    // Step 4: Clear deploy screen
    frontendLog('INFO', 'DEPLOY_ONLY: Step 4 - Clearing deploy screen');
    clearPackages();
    if (versionInput) versionInput.value = '';
    if (descriptionInput) descriptionInput.value = '';

    // Reset purpose selection
    currentDeployPurpose = null;
    const purposeSelection = document.getElementById('deploy-purpose-selection');
    const deployContent = document.getElementById('deploy-content');
    if (purposeSelection) purposeSelection.style.display = 'block';
    if (deployContent) deployContent.style.display = 'none';

    // Step 5: Navigate to Releases page
    frontendLog('INFO', 'DEPLOY_ONLY: Step 5 - Navigating to Releases page');
    switchPage('releases');

    showToast('success', `Deploy ${spfVersion} saved successfully! SPF file generated.`);
    frontendLog('INFO', 'DEPLOY_ONLY: Finalization completed', `Version: ${spfVersion}`);

  } catch (error) {
    console.error('Failed to finalize deploy-only:', error);
    frontendLog('ERROR', 'DEPLOY_ONLY: Failed to finalize', error.toString());
    showToast('error', 'Failed to finalize deploy: ' + error);
    if (btnFinalizeDeployOnly) btnFinalizeDeployOnly.disabled = false;
  }
}

// Clear packages
function clearPackages() {
  frontendLog('INFO', 'DEPLOY: Clearing all packages', `Previous count: ${packages.length}`);
  packages = [];
  uploadedUrls = {};
  selectedFolderPath = null;

  const selectedFolderDiv = document.querySelector('.selected-folder');
  const btnCancelFolder = document.getElementById('btn-cancel-folder');
  const selectedFolderSpan = document.getElementById('selected-folder');

  if (selectedFolderDiv) selectedFolderDiv.style.display = 'none';
  if (btnCancelFolder) btnCancelFolder.style.display = 'none';
  if (selectedFolderSpan) selectedFolderSpan.textContent = 'No folder selected';

  renderPackages();
  updateSummary();
  updateActionButtons();
}

// Handle upload all
async function handleUploadAll() {
  frontendLog('INFO', 'UPLOAD: Starting upload all operation', `Packages: ${packages.length}`);
  if (packages.length === 0) {
    frontendLog('WARNING', 'UPLOAD: No packages to upload');
    showToast('warning', 'No packages to upload');
    return;
  }

  if (!invoke) {
    frontendLog('ERROR', 'UPLOAD: Backend not available');
    showToast('error', 'Backend not available');
    return;
  }

  if (!settings.jfrogApiKey) {
    frontendLog('ERROR', 'UPLOAD: JFrog API key not configured');
    showToast('error', 'Please configure JFrog API key in Settings');
    return;
  }

  const btnUploadAll = document.getElementById('btn-upload-all');
  if (btnUploadAll) btnUploadAll.disabled = true;

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    if (pkg.uploaded) {
      successCount++;
      continue;
    }

    pkg.uploading = true;
    pkg.error = null;
    renderPackages();

    try {
      const filePath = pkg.filePath || pkg.file_path;
      const jfrogPath = pkg.jfrogPath || pkg.jfrog_path || '';
      const specialHandling = pkg.specialHandling || pkg.special_handling;
      const extractFolder = pkg.extractFolder || pkg.extract_folder;

      let result;

      // Check if this package needs special handling (extract ZIP and upload folder)
      if (specialHandling === 'extract-s920-root' && extractFolder) {
        // S920 unsigned: extract ZIP root to named folder and upload folder
        result = await invoke('extract_root_and_upload_to_jfrog', {
          zipPath: filePath,
          folderName: extractFolder,
          jfrogPath: jfrogPath,
          apiKey: settings.jfrogApiKey,
          baseUrl: settings.jfrogBaseUrl || null
        });
      } else if (specialHandling && extractFolder) {
        // Use extract_and_upload_to_jfrog for ZIP files that need subfolder extraction (e.g., online companions)
        result = await invoke('extract_and_upload_to_jfrog', {
          zipPath: filePath,
          extractFolder: extractFolder,
          jfrogPath: jfrogPath,
          apiKey: settings.jfrogApiKey,
          baseUrl: settings.jfrogBaseUrl || null
        });
      } else {
        // Regular file upload — check APK zip rule first
        let uploadPath = filePath;
        let uploadName = pkg.fileName || pkg.file_name;
        const deployType = document.getElementById('deploy-type');
        const currentReleaseType = deployType ? deployType.value : 'Production';
        if (shouldZipApk(pkg, currentReleaseType) && filePath) {
          frontendLog('INFO', 'UPLOAD: Zipping APK for STA upload', `File: ${uploadName}`);
          const zipResult = await invoke('create_zip_from_file', { filePath: filePath });
          if (zipResult.success) {
            uploadPath = zipResult.zipPath;
            uploadName = zipResult.zipFileName;
            frontendLog('INFO', 'UPLOAD: APK zipped successfully', `ZIP: ${uploadName}`);
          } else {
            throw new Error(`Failed to zip APK: ${zipResult.message}`);
          }
        }
        result = await invoke('upload_to_jfrog', {
          filePath: uploadPath,
          jfrogPath: jfrogPath,
          apiKey: settings.jfrogApiKey,
          baseUrl: settings.jfrogBaseUrl || null
        });
      }

      if (result.success) {
        pkg.uploaded = true;
        pkg.url = result.url;
        uploadedUrls[pkg.fileName || pkg.file_name] = result.url;
        successCount++;
        showToast('success', `Uploaded: ${pkg.fileName || pkg.file_name}`);
      } else {
        pkg.error = result.message;
        failCount++;
        showToast('error', `Failed: ${pkg.fileName || pkg.file_name} - ${result.message}`);
      }
    } catch (error) {
      pkg.error = error.toString();
      failCount++;
      showToast('error', `Failed: ${pkg.fileName || pkg.file_name} - ${error}`);
    }

    pkg.uploading = false;
    renderPackages();
  }

  updateActionButtons();

  if (failCount === 0) {
    frontendLog('INFO', 'UPLOAD: All packages uploaded successfully', `Count: ${successCount}`);
    showToast('success', `All ${successCount} packages uploaded successfully!`);
  } else {
    frontendLog('WARNING', 'UPLOAD: Upload completed with failures', `Success: ${successCount}, Failed: ${failCount}`);
    showToast('warning', `Uploaded ${successCount} packages, ${failCount} failed`);
  }
}

// Retry all failed uploads sequentially
async function handleRetryAll() {
  const failedIndexes = packages.reduce((acc, pkg, i) => {
    if (pkg.error) acc.push(i);
    return acc;
  }, []);

  if (failedIndexes.length === 0) {
    showToast('info', 'No failed packages to retry');
    return;
  }

  frontendLog('INFO', 'UPLOAD: Retrying all failed uploads', `Count: ${failedIndexes.length}`);

  const btnRetryAll = document.getElementById('btn-retry-all');
  if (btnRetryAll) btnRetryAll.disabled = true;

  let successCount = 0;
  let failCount = 0;

  for (const index of failedIndexes) {
    const pkg = packages[index];
    if (!pkg || !invoke) continue;

    pkg.uploading = true;
    pkg.error = null;
    renderPackages();

    try {
      const filePath = pkg.filePath || pkg.file_path;
      const jfrogPath = pkg.jfrogPath || pkg.jfrog_path || '';
      const specialHandling = pkg.specialHandling || pkg.special_handling;
      const extractFolder = pkg.extractFolder || pkg.extract_folder;

      let result;

      if (specialHandling === 'extract-s920-root' && extractFolder) {
        result = await invoke('extract_root_and_upload_to_jfrog', {
          zipPath: filePath,
          folderName: extractFolder,
          jfrogPath: jfrogPath,
          apiKey: settings.jfrogApiKey,
          baseUrl: settings.jfrogBaseUrl || null
        });
      } else if (specialHandling && extractFolder) {
        result = await invoke('extract_and_upload_to_jfrog', {
          zipPath: filePath,
          extractFolder: extractFolder,
          jfrogPath: jfrogPath,
          apiKey: settings.jfrogApiKey,
          baseUrl: settings.jfrogBaseUrl || null
        });
      } else {
        let uploadPath = filePath;
        let uploadName = pkg.fileName || pkg.file_name;
        const deployType = document.getElementById('deploy-type');
        const currentReleaseType = deployType ? deployType.value : 'Production';
        if (shouldZipApk(pkg, currentReleaseType) && filePath) {
          const zipResult = await invoke('create_zip_from_file', { filePath: filePath });
          if (zipResult.success) {
            uploadPath = zipResult.zipPath;
            uploadName = zipResult.zipFileName;
          } else {
            throw new Error(`Failed to zip APK: ${zipResult.message}`);
          }
        }
        result = await invoke('upload_to_jfrog', {
          filePath: uploadPath,
          jfrogPath: jfrogPath,
          apiKey: settings.jfrogApiKey,
          baseUrl: settings.jfrogBaseUrl || null
        });
      }

      if (result.success) {
        pkg.uploaded = true;
        pkg.url = result.url;
        uploadedUrls[pkg.fileName || pkg.file_name] = result.url;
        successCount++;
        showToast('success', `Uploaded: ${pkg.fileName || pkg.file_name}`);
      } else {
        pkg.error = result.message;
        failCount++;
        showToast('error', `Failed: ${pkg.fileName || pkg.file_name} - ${result.message}`);
      }
    } catch (error) {
      pkg.error = error.toString();
      failCount++;
      showToast('error', `Failed: ${pkg.fileName || pkg.file_name} - ${error}`);
    }

    pkg.uploading = false;
    renderPackages();
  }

  if (btnRetryAll) btnRetryAll.disabled = false;
  updateActionButtons();

  if (failCount === 0) {
    frontendLog('INFO', 'UPLOAD: All retries succeeded', `Count: ${successCount}`);
    showToast('success', `All ${successCount} failed packages uploaded successfully!`);
  } else {
    frontendLog('WARNING', 'UPLOAD: Retry completed with failures', `Success: ${successCount}, Failed: ${failCount}`);
    showToast('warning', `Retried: ${successCount} succeeded, ${failCount} still failed`);
  }
}

// Retry upload for a single package
async function retryUpload(index) {
  const pkg = packages[index];
  if (!pkg || !invoke) return;
  frontendLog('INFO', 'UPLOAD: Retrying upload', `Package: ${pkg.fileName || pkg.file_name}, Index: ${index}`);

  pkg.uploading = true;
  pkg.error = null;
  renderPackages();

  try {
    const filePath = pkg.filePath || pkg.file_path;
    const jfrogPath = pkg.jfrogPath || pkg.jfrog_path || '';
    const specialHandling = pkg.specialHandling || pkg.special_handling;
    const extractFolder = pkg.extractFolder || pkg.extract_folder;

    let result;

    // Check if this package needs special handling (extract ZIP and upload folder)
    if (specialHandling === 'extract-s920-root' && extractFolder) {
      // S920 unsigned: extract ZIP root to named folder and upload folder
      result = await invoke('extract_root_and_upload_to_jfrog', {
        zipPath: filePath,
        folderName: extractFolder,
        jfrogPath: jfrogPath,
        apiKey: settings.jfrogApiKey,
        baseUrl: settings.jfrogBaseUrl || null
      });
    } else if (specialHandling && extractFolder) {
      // Use extract_and_upload_to_jfrog for ZIP files that need subfolder extraction (e.g., online companions)
      result = await invoke('extract_and_upload_to_jfrog', {
        zipPath: filePath,
        extractFolder: extractFolder,
        jfrogPath: jfrogPath,
        apiKey: settings.jfrogApiKey,
        baseUrl: settings.jfrogBaseUrl || null
      });
    } else {
      // Regular file upload — check APK zip rule first
      let uploadPath = filePath;
      let uploadName = pkg.fileName || pkg.file_name;
      const deployType = document.getElementById('deploy-type');
      const currentReleaseType = deployType ? deployType.value : 'Production';
      if (shouldZipApk(pkg, currentReleaseType) && filePath) {
        frontendLog('INFO', 'UPLOAD: Zipping APK for STA retry upload', `File: ${uploadName}`);
        const zipResult = await invoke('create_zip_from_file', { filePath: filePath });
        if (zipResult.success) {
          uploadPath = zipResult.zipPath;
          uploadName = zipResult.zipFileName;
          frontendLog('INFO', 'UPLOAD: APK zipped successfully', `ZIP: ${uploadName}`);
        } else {
          throw new Error(`Failed to zip APK: ${zipResult.message}`);
        }
      }
      result = await invoke('upload_to_jfrog', {
        filePath: uploadPath,
        jfrogPath: jfrogPath,
        apiKey: settings.jfrogApiKey,
        baseUrl: settings.jfrogBaseUrl || null
      });
    }

    if (result.success) {
      pkg.uploaded = true;
      pkg.url = result.url;
      uploadedUrls[pkg.fileName || pkg.file_name] = result.url;
      showToast('success', `Uploaded: ${pkg.fileName || pkg.file_name}`);
    } else {
      pkg.error = result.message;
      showToast('error', `Failed: ${pkg.fileName || pkg.file_name} - ${result.message}`);
    }
  } catch (error) {
    pkg.error = error.toString();
    showToast('error', `Failed: ${pkg.fileName || pkg.file_name} - ${error}`);
  }

  pkg.uploading = false;
  renderPackages();
  updateActionButtons();
}

// Handle generate SPF
async function handleGenerateSpf() {
  frontendLog('INFO', 'SPF: Starting SPF generation');
  const versionInput = document.getElementById('deploy-version');
  const dateInput = document.getElementById('deploy-date');
  const typeSelect = document.getElementById('deploy-type');
  const notesInput = document.getElementById('deploy-notes');
  const descInput = document.getElementById('deploy-description');

  const version = versionInput ? versionInput.value.trim() : '';
  const date = dateInput ? dateInput.value : '';
  const type = typeSelect ? typeSelect.value : 'Production';
  const releaseNotes = notesInput ? notesInput.value : '';
  const description = descInput ? descInput.value.trim() : '';

  if (!version || !date) {
    frontendLog('WARNING', 'SPF: Missing version or date');
    showToast('error', 'Please fill in version and date');
    return;
  }
  frontendLog('INFO', 'SPF: Generating SPF', `Version: ${version}, Date: ${date}, Type: ${type}, Packages: ${packages.length}`);

  // Validate version matches detected package versions
  const versionMismatch = await validateVersionMatch(version);
  if (versionMismatch) {
    const continueAnyway = await showConfirmDialog(
      'Version Mismatch Warning',
      `${versionMismatch}\n\nDo you want to continue anyway?`,
      { okLabel: 'Continue Anyway', kind: 'warning' }
    );
    if (!continueAnyway) {
      frontendLog('INFO', 'SPF: User cancelled due to version mismatch');
      return;
    }
    frontendLog('INFO', 'SPF: User chose to continue despite version mismatch');
  }

  if (!invoke) {
    showToast('error', 'Backend not available');
    return;
  }

  // Filter out online companion packages (they shouldn't be in SPF)
  // Online companions are: Linux_64-Gui-Installer.zip, Linux_i386-Installer.zip, x86.zip
  // Note: S920 unsigned packages have specialHandling='extract-s920-root' but should NOT be filtered out
  const spfPackages = packages.filter(pkg => {
    const fileName = pkg.fileName || pkg.file_name || '';
    const handling = pkg.specialHandling || pkg.special_handling || '';
    const isOnlineCompanion = fileName === 'Linux_64-Gui-Installer.zip' ||
      fileName === 'Linux_i386-Installer.zip' ||
      fileName === 'x86.zip' ||
      (handling && handling !== 'extract-s920-root');
    return !isOnlineCompanion;
  });

  // Build the full version for SPF header from package data
  // SPF version should include the full version with hash (e.g., "2.5.1.289844" or "2.4.1.A2A.99807")
  const spfVersion = getFullVersionForSpf(spfPackages, version);

  const releaseData = {
    id: `${version}-${type.toLowerCase()}-${Date.now()}`,
    version: spfVersion,
    date,
    type: type,
    description,
    releaseNotes,
    packages: spfPackages.map(pkg => ({
      platform: pkg.platform || 'Unknown',
      device: pkg.device || '',
      category: pkg.category || '',
      signature: pkg.signature || '',
      client: pkg.client || '',
      url: pkg.url || uploadedUrls[pkg.fileName || pkg.file_name] || ''
    })),
    createdAt: new Date().toISOString()
  };

  try {
    // Generate SPF content
    const spfContent = await invoke('generate_spf_content', { release: releaseData });

    // Generate filename: release_<fullversion>-YYYY-MM-DD-<type>.spf
    const typeShort = getTypeShort(releaseData);
    const spfFileName = `release_${spfVersion}-${date}-${typeShort}.spf`;

    // Ask user where to save
    if (dialogSave) {
      const savePath = await dialogSave({
        defaultPath: spfFileName,
        filters: [{ name: 'SPF Files', extensions: ['spf'] }]
      });

      if (savePath) {
        await invoke('save_spf_file', { content: spfContent, filePath: savePath });
        frontendLog('INFO', 'SPF: SPF file saved', `Path: ${savePath}`);
        showToast('success', `SPF file saved: ${savePath}`);
      } else {
        frontendLog('INFO', 'SPF: User cancelled save dialog');
      }
    }

    // Save release to local storage
    frontendLog('INFO', 'SPF: Saving release to local storage');
    await invoke('save_release', { release: releaseData });
    releases = await invoke('get_releases');
    renderReleases();
    populateHtmlReleaseSelect();
    populateReleaseFilterOptions();

    frontendLog('INFO', 'SPF: Release saved successfully', `Version: ${spfVersion}`);
    showToast('success', 'Release saved successfully');
  } catch (error) {
    console.error('Failed to generate SPF:', error);
    frontendLog('ERROR', 'SPF: Failed to generate SPF', error.toString());
    showToast('error', 'Failed to generate SPF: ' + error);
  }
}

// Handle Finalize Release - creates release, exports SPF, generates HTML, clears deploy, navigates to releases
async function handleFinalizeRelease() {
  frontendLog('INFO', 'FINALIZE: Starting release finalization');
  const versionInput = document.getElementById('deploy-version');
  const dateInput = document.getElementById('deploy-date');
  const typeSelect = document.getElementById('deploy-type');
  const notesInput = document.getElementById('deploy-notes');
  const descInput = document.getElementById('deploy-description');

  const version = versionInput ? versionInput.value.trim() : '';
  const date = dateInput ? dateInput.value : '';
  const type = typeSelect ? typeSelect.value : 'Production';
  const releaseNotes = notesInput ? notesInput.value : '';
  const description = descInput ? descInput.value.trim() : '';

  if (!version || !date) {
    frontendLog('WARNING', 'FINALIZE: Missing version or date');
    showToast('error', 'Please fill in version and date');
    return;
  }

  if (!invoke) {
    showToast('error', 'Backend not available');
    return;
  }

  // Validate version matches detected package versions
  const versionMismatch = await validateVersionMatch(version);
  if (versionMismatch) {
    const continueAnyway = await showConfirmDialog(
      'Version Mismatch Warning',
      `${versionMismatch}\n\nDo you want to continue anyway?`,
      { okLabel: 'Continue Anyway', kind: 'warning' }
    );
    if (!continueAnyway) {
      frontendLog('INFO', 'FINALIZE: User cancelled due to version mismatch');
      return;
    }
    frontendLog('INFO', 'FINALIZE: User chose to continue despite version mismatch');
  }

  // Disable the button to prevent double-click
  const btnFinalizeRelease = document.getElementById('btn-finalize-release');
  if (btnFinalizeRelease) btnFinalizeRelease.disabled = true;

  // Filter out online companion packages
  // Note: S920 unsigned packages have specialHandling='extract-s920-root' but should NOT be filtered out
  const spfPackages = packages.filter(pkg => {
    const fileName = pkg.fileName || pkg.file_name || '';
    const handling = pkg.specialHandling || pkg.special_handling || '';
    const isOnlineCompanion = fileName === 'Linux_64-Gui-Installer.zip' ||
      fileName === 'Linux_i386-Installer.zip' ||
      fileName === 'x86.zip' ||
      (handling && handling !== 'extract-s920-root');
    return !isOnlineCompanion;
  });

  // Build the full version for SPF header from package data
  const spfVersion = getFullVersionForSpf(spfPackages, version);

  const releaseData = {
    id: `${version}-${type.toLowerCase()}-${Date.now()}`,
    version: spfVersion,
    date,
    type: type,
    releaseType: type,
    description,
    releaseNotes,
    packages: spfPackages.map(pkg => ({
      platform: pkg.platform || 'Unknown',
      device: pkg.device || '',
      category: pkg.category || '',
      signature: pkg.signature || '',
      client: pkg.client || '',
      url: pkg.url || uploadedUrls[pkg.fileName || pkg.file_name] || ''
    })),
    createdAt: new Date().toISOString()
  };

  try {
    // Step 1: Save release to local storage
    frontendLog('INFO', 'FINALIZE: Step 1 - Saving release');
    await invoke('save_release', { release: releaseData });
    frontendLog('INFO', 'FINALIZE: Release saved successfully', `Version: ${spfVersion}`);

    // Step 2: Generate and auto-save SPF file
    frontendLog('INFO', 'FINALIZE: Step 2 - Generating SPF file');
    try {
      const spfContent = await invoke('generate_spf_content', { release: releaseData });
      const typeShort = getTypeShort(releaseData);
      const spfFileName = `release_${spfVersion}-${date}-${typeShort}.spf`;

      // Auto-save to app's data folder
      const paths = await invoke('get_app_paths');
      const spfSavePath = `${paths.userData}/${spfFileName}`;
      await invoke('save_spf_file', { content: spfContent, filePath: spfSavePath });
      frontendLog('INFO', 'FINALIZE: SPF file auto-saved', `Path: ${spfSavePath}`);
    } catch (spfError) {
      frontendLog('ERROR', 'FINALIZE: Failed to generate/save SPF', spfError.toString());
      showToast('warning', 'Release saved but SPF generation failed: ' + spfError);
    }

    // Step 3: Generate HTML file
    frontendLog('INFO', 'FINALIZE: Step 3 - Generating HTML file');
    try {
      const htmlResult = await invoke('generate_html', { release: releaseData });
      frontendLog('INFO', 'FINALIZE: HTML generated successfully', `Output: ${htmlResult}`);
    } catch (htmlError) {
      frontendLog('ERROR', 'FINALIZE: Failed to generate HTML', htmlError.toString());
      showToast('warning', 'Release saved but HTML generation failed: ' + htmlError);
    }

    // Step 4: Refresh releases list
    frontendLog('INFO', 'FINALIZE: Step 4 - Refreshing releases list');
    releases = await invoke('get_releases');
    renderReleases();
    populateHtmlReleaseSelect();
    populateReleaseFilterOptions();

    // Step 5: Clear deploy screen
    frontendLog('INFO', 'FINALIZE: Step 5 - Clearing deploy screen');
    clearPackages();
    // Reset form fields
    if (versionInput) versionInput.value = '';
    if (dateInput) dateInput.value = '';
    if (typeSelect) typeSelect.value = 'Production';
    if (notesInput) notesInput.value = '';
    // Also clear the release notes preview
    const notesPreview = document.getElementById('deploy-notes-preview');
    if (notesPreview) notesPreview.innerHTML = '';

    // Reset purpose selection
    currentDeployPurpose = null;
    const purposeSelection = document.getElementById('deploy-purpose-selection');
    const deployContent = document.getElementById('deploy-content');
    if (purposeSelection) purposeSelection.style.display = 'block';
    if (deployContent) deployContent.style.display = 'none';

    // Step 6: Navigate to Releases page
    frontendLog('INFO', 'FINALIZE: Step 6 - Navigating to Releases page');
    switchPage('releases');

    showToast('success', `Release ${spfVersion} finalized successfully! SPF and HTML files generated.`);
    frontendLog('INFO', 'FINALIZE: Release finalization completed', `Version: ${spfVersion}`);

  } catch (error) {
    console.error('Failed to finalize release:', error);
    frontendLog('ERROR', 'FINALIZE: Failed to finalize release', error.toString());
    showToast('error', 'Failed to finalize release: ' + error);
    if (btnFinalizeRelease) btnFinalizeRelease.disabled = false;
  }
}

// Releases Page
function isReleaseUnsigned(release) {
  const pkgs = release.packages || [];

  // Legacy check: any package URL contains /unsigned/
  if (pkgs.some(p => (p.url || '').includes('/unsigned/'))) {
    return true;
  }

  // Android check: for STA/A2A packages, check if ANY lacks _sign in filename
  // (applies to .apk, .zip, or extensionless files)
  const androidPkgs = pkgs.filter(p => {
    const platform = (p.platform || '').toUpperCase();
    return platform === 'STA' || platform === 'A2A';
  });

  if (androidPkgs.length > 0) {
    return androidPkgs.some(p => {
      const fileName = (p.url || '').split('/').filter(s => s.length > 0).pop() || '';
      return !fileName.toLowerCase().includes('_sign');
    });
  }

  return false;
}

function getTypeShort(release) {
  const type = (release.releaseType || release.type || 'development').toLowerCase();
  if (type === 'production') return isReleaseUnsigned(release) ? 'unsigned' : 'prod';
  if (type === 'deploy-only') return 'deploy';
  return 'dev';
}

function getFilteredAndSortedReleases() {
  let result = releases.slice();

  // Tab filter
  if (currentReleaseFilter === 'deploy-only') {
    result = result.filter(r => (r.releaseType || r.type || '').toLowerCase() === 'deploy-only');
  } else if (currentReleaseFilter === 'development') {
    result = result.filter(r => (r.releaseType || r.type || '').toLowerCase() === 'development');
  } else if (currentReleaseFilter === 'production') {
    result = result.filter(r => (r.releaseType || r.type || '').toLowerCase() === 'production');
  }

  // Search filter
  const q = currentReleaseSearch.toLowerCase().trim();
  if (q) {
    result = result.filter(r => {
      if ((r.version || '').toLowerCase().includes(q)) return true;
      if ((r.releaseNotes || '').toLowerCase().includes(q)) return true;
      if ((r.description || '').toLowerCase().includes(q)) return true;
      return (r.packages || []).some(p => {
        const fileName = (p.url || '').split('/').pop() || '';
        return fileName.toLowerCase().includes(q);
      });
    });
  }

  // Advanced filters
  const f = currentReleaseFilters;
  if (f.signature !== 'all') {
    result = result.filter(r => f.signature === 'unsigned' ? isReleaseUnsigned(r) : !isReleaseUnsigned(r));
  }
  if (f.client !== 'all') {
    result = result.filter(r => (r.packages || []).some(p => (p.client || '') === f.client));
  }
  if (f.platform !== 'all') {
    result = result.filter(r => (r.packages || []).some(p => (p.platform || '') === f.platform));
  }
  if (f.device !== 'all') {
    result = result.filter(r => (r.packages || []).some(p => (p.device || '') === f.device));
  }
  if (f.hasSta) {
    result = result.filter(r => (r.packages || []).some(p => (p.platform || '') === 'STA'));
  }
  if (f.hasA2a) {
    result = result.filter(r => (r.packages || []).some(p => (p.platform || '') === 'A2A' || (p.category || '') === 'A2A'));
  }

  // Sort
  result.sort((a, b) => {
    switch (currentReleaseSort) {
      case 'created-desc': return (b.createdAt || '').localeCompare(a.createdAt || '');
      case 'created-asc': return (a.createdAt || '').localeCompare(b.createdAt || '');
      case 'version-desc': return (b.version || '').localeCompare(a.version || '', undefined, { numeric: true });
      case 'version-asc': return (a.version || '').localeCompare(b.version || '', undefined, { numeric: true });
      case 'date-desc': return (b.date || '').localeCompare(a.date || '');
      case 'date-asc': return (a.date || '').localeCompare(b.date || '');
      default: return 0;
    }
  });

  return result;
}

function populateReleaseFilterOptions() {
  const clients = new Set();
  const platforms = new Set();
  const devices = new Set();

  (releases || []).forEach(r => {
    (r.packages || []).forEach(p => {
      if (p.client) clients.add(p.client);
      if (p.platform) platforms.add(p.platform);
      if (p.device) devices.add(p.device);
    });
  });

  const populateSelect = (id, values, displayFn) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="all">All</option>' +
      [...values].sort().map(v => `<option value="${v}">${displayFn ? displayFn(v) : v}</option>`).join('');
    el.value = current && [...values].includes(current) ? current : 'all';
  };

  populateSelect('filter-client', clients);
  populateSelect('filter-platform', platforms);
  populateSelect('filter-device', devices, displayDeviceName);
}

function updateFilterToggleIndicator() {
  const btn = document.getElementById('btn-toggle-filters');
  if (!btn) return;
  const f = currentReleaseFilters;
  const hasActive = f.signature !== 'all' || f.client !== 'all' || f.platform !== 'all' || f.device !== 'all' || f.hasSta || f.hasA2a;
  btn.classList.toggle('has-active-filters', hasActive);
}

function initReleasesPage() {
  // Tab filters
  const tabs = document.querySelectorAll('.releases-filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      currentReleaseFilter = tab.dataset.filter;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      renderReleases();
    });
  });

  // Search
  const searchInput = document.getElementById('releases-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(releaseSearchDebounceTimer);
      releaseSearchDebounceTimer = setTimeout(() => {
        currentReleaseSearch = searchInput.value;
        renderReleases();
      }, 300);
    });
  }

  // Sort
  const sortSelect = document.getElementById('releases-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentReleaseSort = sortSelect.value;
      renderReleases();
    });
  }

  // Filter toggle
  const btnToggle = document.getElementById('btn-toggle-filters');
  const filtersPanel = document.getElementById('releases-advanced-filters');
  if (btnToggle && filtersPanel) {
    btnToggle.addEventListener('click', (e) => {
      e.preventDefault();
      filtersPanel.classList.toggle('active');
    });
  }

  // Advanced filter dropdowns
  const filterIds = [
    { id: 'filter-signature', key: 'signature' },
    { id: 'filter-client', key: 'client' },
    { id: 'filter-platform', key: 'platform' },
    { id: 'filter-device', key: 'device' }
  ];
  filterIds.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        currentReleaseFilters[key] = el.value;
        updateFilterToggleIndicator();
        renderReleases();
      });
    }
  });

  // Advanced filter checkboxes
  const cbSta = document.getElementById('filter-has-sta');
  const cbA2a = document.getElementById('filter-has-a2a');
  if (cbSta) {
    cbSta.addEventListener('change', () => {
      if (cbSta.checked && cbA2a) { cbA2a.checked = false; currentReleaseFilters.hasA2a = false; }
      currentReleaseFilters.hasSta = cbSta.checked;
      updateFilterToggleIndicator();
      renderReleases();
    });
  }
  if (cbA2a) {
    cbA2a.addEventListener('change', () => {
      if (cbA2a.checked && cbSta) { cbSta.checked = false; currentReleaseFilters.hasSta = false; }
      currentReleaseFilters.hasA2a = cbA2a.checked;
      updateFilterToggleIndicator();
      renderReleases();
    });
  }
}

function renderReleases() {
  const container = document.getElementById('releases-list');
  if (!container) return;

  if (!releases || releases.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No releases found</p>
      </div>
    `;
    return;
  }

  const filtered = getFilteredAndSortedReleases();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No releases match this filter</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(release => {
    const releaseType = (release.releaseType || release.type || 'Unknown').toLowerCase().replace('-', '-');
    const releaseTypeDisplay = releaseType === 'production' ? 'Production' : releaseType === 'deploy-only' ? 'Deploy Only' : 'Development';
    const pkgCount = (release.packages || []).length;
    const createdAt = release.createdAt ? new Date(release.createdAt).toLocaleString() : '';

    // Check if release contains unsigned packages
    const hasUnsigned = isReleaseUnsigned(release);

    // Count unique platforms
    const platforms = new Set((release.packages || []).map(p => p.platform));
    const platformCount = platforms.size;

    // Status icons — environment type (Material Icons)
    const typeIcon = releaseType === 'deploy-only' ? 'publish' : releaseType === 'production' ? 'storefront' : 'science';
    const typeColor = releaseType === 'deploy-only' ? '#3b82f6' : releaseType === 'production' ? '#06b6d4' : '#f59e0b';
    const typeTooltip = releaseType === 'deploy-only' ? 'Deploy Only' : releaseType === 'production' ? 'Production' : 'Development';
    // Status icons — signature (Material Icons)
    const sigIcon = hasUnsigned ? 'encrypted_off' : 'encrypted';
    const sigColor = hasUnsigned ? '#ef4444' : '#22c55e';
    const sigTooltip = hasUnsigned ? 'Unsigned' : 'Signed';

    return `
    <div class="release-card-expandable" data-id="${release.id}">
      <div class="release-card-header">
        <div class="release-card-info">
          <div class="release-card-title">
            <span class="release-version-text">Version ${release.version}</span>
            <span class="release-status-icons">
              <span class="material-symbols-outlined release-category-icon" style="color:${typeColor}" title="${typeTooltip}">${typeIcon}</span>
              <span class="material-symbols-outlined release-category-icon" style="color:${sigColor}" title="${sigTooltip}">${sigIcon}</span>
            </span>
          </div>
          ${release.description ? `<div class="release-card-description">${release.description}</div>` : ''}
          <div class="release-card-meta">
            <span class="meta-item"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg> Release: ${release.date}</span>
            ${createdAt ? `<span class="meta-sep">•</span><span class="meta-item"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg> Created: ${createdAt}</span>` : ''}
            <span class="meta-sep">•</span>
            <span class="meta-item platforms-badge">${platformCount} platform${platformCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="release-card-actions">
          <button class="btn btn-sm btn-outline btn-generate-html" data-id="${release.id}" title="Generate HTML">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Generate HTML
          </button>
          <button class="btn btn-sm btn-outline btn-edit-release" data-id="${release.id}" title="Edit Release">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <div class="release-kebab-wrapper">
            <button class="btn btn-sm btn-outline btn-kebab" data-id="${release.id}" title="More actions">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            <div class="release-kebab-menu">
              <button class="kebab-item btn-overflow-spf" data-id="${release.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export SPF
              </button>
              <button class="kebab-item btn-overflow-purge" data-id="${release.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 23c-3.6 0-8-2.4-8-7.6C4 10 12 1 12 1s8 9 8 14.4c0 5.2-4.4 7.6-8 7.6z"/><path d="M12 23c-1.8 0-4-1.2-4-3.8C8 16 12 11 12 11s4 5 4 8.2c0 2.6-2.2 3.8-4 3.8z"/></svg>
                Purge
              </button>
              <button class="kebab-item btn-overflow-delete" data-id="${release.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete
              </button>
            </div>
          </div>
          <button class="btn btn-sm btn-outline btn-toggle-expand" data-id="${release.id}" title="Expand/Collapse">
            <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="release-card-body" style="display: none;">
        <div class="release-summary-section">
          <div class="release-summary-header">
            <h4>Release Summary</h4>
            ${release.releaseNotes ? `<button class="btn btn-sm btn-outline btn-view-notes" data-id="${release.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              View Release Notes
            </button>` : ''}
          </div>
          ${renderReleaseSummary(release)}
        </div>
      </div>
    </div>
  `;
  }).join('');

  // Attach event listeners
  attachReleaseEventListeners(container);
}

function renderReleaseSummary(release) {
  const pkgs = release.packages || [];
  if (pkgs.length === 0) return '<p class="no-packages">No packages in this release</p>';

  // Group packages by platform
  const platformGroups = {};
  pkgs.forEach(pkg => {
    const platform = pkg.platform || 'Unknown';
    if (!platformGroups[platform]) platformGroups[platform] = [];
    platformGroups[platform].push(pkg);
  });

  // Icon map - use new platform SVG icons
  const getPlatformIcon = (platform, pkg) => {
    // Handle A2A types
    if (platform === 'A2A') {
      const device = (pkg.device || '').toLowerCase();
      const cat = (pkg.category || '').toLowerCase();
      if (device === 'aar' || cat.includes('sdk')) return 'assets/images/aar.svg';
      if (device === 'doc' || cat === 'documentation') return 'assets/images/doc-integration.svg';
      if (cat.includes('example')) return 'assets/images/payexample.svg';
      return 'assets/images/a2a.svg';
    }
    // Handle Windows device types
    if (platform === 'Windows') {
      const device = (pkg.device || '').toLowerCase();
      if (device === 'tef library' || device.includes('dll') || device === 'dll') {
        return 'assets/images/dll.svg';
      }
      return 'assets/images/windows.svg';
    }
    // Handle Linux device types
    if (platform === 'Linux64' || platform === 'Linux32') {
      const device = (pkg.device || '').toLowerCase();
      if (device === 'tef library' || device.includes('library')) {
        return 'assets/images/lib.svg';
      }
      return `assets/images/${platform === 'Linux64' ? 'linux64.svg' : 'linux32.svg'}`;
    }
    // Handle STA (use Android icon)
    if (platform === 'STA') {
      return 'assets/images/android.svg';
    }
    const iconMap = {
      'Embedded': 'embedded.svg',
    };
    return `assets/images/${iconMap[platform] || 'platform-pkgs.svg'}`;
  };

  // Helper to create a tag badge
  const makeTag = (text, color) => {
    if (!text) return '';
    return `<span class="summary-tag summary-tag-${color}">${text}</span>`;
  };

  // Helper to create copy URL button
  const copyUrlBtn = (url) => {
    if (!url) return '';
    const safeUrl = url.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const displayPath = url.replace('https://artifactory.aditum.com.br/artifactory/', '').replace(/"/g, '&quot;');
    return `<button class="btn-copy-url" title="${displayPath}" onclick="copyPkgUrl(this, '${safeUrl}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>`;
  };

  let html = '<div class="release-summary-content">';

  // ---- PLATFORM PACKAGES (Windows, Linux, Embedded, A2A) ----
  const platformTypes = ['Windows', 'Linux64', 'Linux32', 'Embedded', 'A2A'];
  const hasPlatformPkgs = platformTypes.some(p => platformGroups[p] && platformGroups[p].length > 0);

  if (hasPlatformPkgs) {
    html += '<h5 class="platform-packages-title">PLATFORM PACKAGES</h5>';

    // Windows packages
    if (platformGroups['Windows']) {
      platformGroups['Windows'].forEach(pkg => {
        const icon = getPlatformIcon('Windows', pkg);
        const cat = (pkg.category || '').toLowerCase();
        let name = '';
        if (pkg.device === 'TEF Library' || pkg.device === 'DLL') {
          name = 'Windows DLL';
        } else if (pkg.device === 'TEF Installer') {
          // Include Online/Offline in the title
          if (cat === 'online') {
            name = 'Windows Online Installer';
          } else if (cat === 'offline') {
            name = 'Windows Offline Installer';
          } else {
            name = 'Windows Installer';
          }
        } else {
          name = `Windows ${pkg.device}`;
        }
        html += `
          <div class="platform-package-item">
            <img src="${icon}" alt="Windows" class="platform-icon" onerror="this.style.display='none'" />
            <span class="package-name">${name}</span>
            ${copyUrlBtn(pkg.url)}
          </div>`;
      });
    }

    // Linux64 packages
    if (platformGroups['Linux64']) {
      platformGroups['Linux64'].forEach(pkg => {
        const icon = getPlatformIcon('Linux64', pkg);
        const cat64 = (pkg.category || '').toLowerCase();
        let name = '';
        if (pkg.device === 'TEF Library') {
          name = 'Linux 64-bit Library';
        } else if (pkg.device === 'TEF Installer') {
          // Include Online/Offline in the title
          if (cat64 === 'online') {
            name = 'Linux 64-bit Online Installer';
          } else if (cat64 === 'offline') {
            name = 'Linux 64-bit Offline Installer';
          } else {
            name = 'Linux 64-bit Installer';
          }
        } else {
          name = `Linux 64-bit ${pkg.device}`;
        }
        html += `
          <div class="platform-package-item">
            <img src="${icon}" alt="Linux64" class="platform-icon" onerror="this.style.display='none'" />
            <span class="package-name">${name}</span>
            ${copyUrlBtn(pkg.url)}
          </div>`;
      });
    }

    // Linux32 packages
    if (platformGroups['Linux32']) {
      platformGroups['Linux32'].forEach(pkg => {
        const icon = getPlatformIcon('Linux32', pkg);
        const cat32 = (pkg.category || '').toLowerCase();
        let name = '';
        if (pkg.device === 'TEF Library') {
          name = 'Linux 32-bit Library';
        } else if (pkg.device === 'TEF Installer') {
          // Include Online/Offline in the title
          if (cat32 === 'online') {
            name = 'Linux 32-bit Online Installer';
          } else if (cat32 === 'offline') {
            name = 'Linux 32-bit Offline Installer';
          } else {
            name = 'Linux 32-bit Installer';
          }
        } else {
          name = `Linux 32-bit ${pkg.device}`;
        }
        html += `
          <div class="platform-package-item">
            <img src="${icon}" alt="Linux32" class="platform-icon" onerror="this.style.display='none'" />
            <span class="package-name">${name}</span>
            ${copyUrlBtn(pkg.url)}
          </div>`;
      });
    }

    // Embedded packages
    if (platformGroups['Embedded']) {
      platformGroups['Embedded'].forEach(pkg => {
        const icon = getPlatformIcon('Embedded', pkg);
        const name = pkg.device ? `${displayDeviceName(pkg.device)} Package` : 'S920 Package';
        html += `
          <div class="platform-package-item">
            <img src="${icon}" alt="Embedded" class="platform-icon" onerror="this.style.display='none'" />
            <span class="package-name">${name}</span>
            ${copyUrlBtn(pkg.url)}
          </div>`;
      });
    }

    // A2A packages - Group into SDK/Doc, Device APKs, and Examples
    if (platformGroups['A2A']) {
      const a2aPkgs = platformGroups['A2A'];

      // Classify A2A packages
      const sdkDocs = a2aPkgs.filter(p => ['Doc', 'AAR', 'SDK', 'Documentation', 'SDK Integration'].includes(p.device) ||
        p.category?.toLowerCase()?.includes('sdk') ||
        p.category === 'AAR' || p.category === 'Documentation');
      const examples = a2aPkgs.filter(p => p.category?.toLowerCase()?.includes('example') ||
        p.device?.toLowerCase()?.includes('example'));
      const deviceApks = a2aPkgs.filter(p => !sdkDocs.includes(p) && !examples.includes(p) && p.device);

      // SDK/Documentation
      if (sdkDocs.length > 0) {
        sdkDocs.forEach(pkg => {
          const icon = getPlatformIcon('A2A', pkg);
          let name = '';
          if (pkg.category === 'Documentation' || pkg.device === 'Doc' || pkg.device === 'Documentation') {
            name = 'SDK Documentation';
          } else if (pkg.category === 'AAR' || pkg.device === 'AAR') {
            name = 'SDK Integration';
          } else {
            name = pkg.device || 'SDK';
          }
          html += `
          <div class="platform-package-item">
            <img src="${icon}" alt="A2A" class="platform-icon" onerror="this.style.display='none'" />
            <span class="package-name">${name}</span>
            ${copyUrlBtn(pkg.url)}
          </div>`;
        });
      }

      // Examples - extract device name from URL
      if (examples.length > 0) {
        examples.forEach(pkg => {
          const icon = getPlatformIcon('A2A', pkg);
          // Extract device from URL (e.g., PaymentExample-A910-D-2.3.9...)
          let deviceName = '';
          if (pkg.url) {
            const urlFileName = pkg.url.split('/').filter(s => s.length > 0).pop() || '';
            const deviceMatch = urlFileName.match(/PaymentExample-([A-Za-z0-9_]+)-/i);
            if (deviceMatch) deviceName = deviceMatch[1];
          }
          const name = deviceName ? `PaymentExample (${normalizeA2ADisplayName(deviceName)})` : 'PaymentExample';
          html += `
          <div class="platform-package-item">
            <img src="${icon}" alt="A2A" class="platform-icon" onerror="this.style.display='none'" />
            <span class="package-name">${name}</span>
            ${copyUrlBtn(pkg.url)}
          </div>`;
        });
      }

      // Device APKs - list each device individually
      if (deviceApks.length > 0) {
        deviceApks.forEach(pkg => {
          const icon = getPlatformIcon('A2A', pkg);
          const deviceName = pkg.device || 'Device';
          const sigTag = pkg.signature ? makeTag(pkg.signature, 'blue') : '';
          const clientTag = pkg.client ? makeTag(pkg.client, 'green') : '';
          html += `
          <div class="platform-package-item">
            <img src="${icon}" alt="A2A" class="platform-icon" onerror="this.style.display='none'" />
            <span class="package-name">${normalizeA2ADisplayName(deviceName)}</span>
            ${sigTag}
            ${clientTag}
            ${copyUrlBtn(pkg.url)}
          </div>`;
        });
      }
    }
  }

  // ---- STA DEVICES ----
  if (platformGroups['STA'] && platformGroups['STA'].length > 0) {
    html += '<h5 class="platform-packages-title sta-title">STA DEVICES</h5>';

    // Group STA packages by device
    const staDevices = {};
    platformGroups['STA'].forEach(pkg => {
      const device = pkg.device || 'Unknown';
      if (!staDevices[device]) staDevices[device] = [];
      staDevices[device].push(pkg);
    });

    for (const [device, devicePkgs] of Object.entries(staDevices)) {
      const icon = getPlatformIcon('STA', devicePkgs[0]);
      html += `
        <div class="sta-device-group">
          <div class="sta-device-header">
            <img src="${icon}" alt="STA" class="platform-icon" onerror="this.style.display='none'" />
            <span class="sta-device-name">${displayDeviceName(device)}</span>
          </div>
          <div class="sta-device-variants">`;

      // Group variants by category (Launcher, App)
      devicePkgs.forEach(pkg => {
        const category = pkg.category || 'Package';
        const categoryTag = makeTag(category, 'gray');
        const sigTag = pkg.signature ? makeTag(pkg.signature, 'blue') : '';
        const clientTag = pkg.client ? makeTag(pkg.client, 'green') : '';

        html += `
            <div class="sta-variant-row">
              ${categoryTag}
              ${sigTag}
              ${clientTag}
              ${copyUrlBtn(pkg.url)}
            </div>`;
      });

      html += `
          </div>
        </div>`;
    }
  }

  // ---- Other platforms not covered above ----
  const handledPlatforms = ['Windows', 'Linux64', 'Linux32', 'Embedded', 'A2A', 'STA'];
  for (const [platform, platformPkgs] of Object.entries(platformGroups)) {
    if (handledPlatforms.includes(platform)) continue;
    html += `<h5 class="platform-packages-title">${platform.toUpperCase()}</h5>`;
    platformPkgs.forEach(pkg => {
      const name = `${displayDeviceName(pkg.device || '')} ${pkg.category || ''}`.trim() || platform;
      html += `
        <div class="platform-package-item">
          <img src="assets/images/platform-pkgs.svg" alt="${platform}" class="platform-icon" onerror="this.style.display='none'" />
          <span class="package-name">${name}</span>
        </div>`;
    });
  }

  html += '</div>';
  return html;
}

function attachReleaseEventListeners(container) {
  // Global document listener to close open kebab menus (added once per session)
  if (!kebabCloseListenerAdded) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.release-kebab-wrapper')) {
        document.querySelectorAll('.release-kebab-menu.open').forEach(m => m.classList.remove('open'));
      }
    });
    kebabCloseListenerAdded = true;
  }

  // Toggle expand/collapse (chevron-only button)
  container.querySelectorAll('.btn-toggle-expand').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.release-card-expandable');
      const body = card.querySelector('.release-card-body');
      const isExpanded = body.style.display !== 'none';
      body.style.display = isExpanded ? 'none' : 'block';
      const chevron = btn.querySelector('.chevron-icon');
      if (chevron) chevron.classList.toggle('rotated', !isExpanded);
      frontendLog('INFO', 'RELEASES: Release card toggled', `ID: ${btn.dataset.id}, Action: ${isExpanded ? 'collapsed' : 'expanded'}`);
    });
  });

  // Kebab menu toggle
  container.querySelectorAll('.btn-kebab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = btn.closest('.release-kebab-wrapper');
      const menu = wrapper.querySelector('.release-kebab-menu');
      const isOpen = menu.classList.contains('open');
      document.querySelectorAll('.release-kebab-menu.open').forEach(m => m.classList.remove('open'));
      if (!isOpen) menu.classList.add('open');
    });
  });

  // Generate HTML
  container.querySelectorAll('.btn-generate-html').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      frontendLog('INFO', 'RELEASES: Generate HTML button clicked', `Release ID: ${id}`);
      await generateHtmlForRelease(id);
    });
  });

  // Export SPF (overflow menu)
  container.querySelectorAll('.btn-overflow-spf').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      document.querySelectorAll('.release-kebab-menu.open').forEach(m => m.classList.remove('open'));
      frontendLog('INFO', 'RELEASES: Export SPF clicked', `Release ID: ${id}`);
      await exportSpfForRelease(id);
    });
  });

  // View release notes
  container.querySelectorAll('.btn-view-notes').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      frontendLog('INFO', 'RELEASES: View release notes clicked', `Release ID: ${id}`);
      viewReleaseNotes(id);
    });
  });

  // Edit release
  container.querySelectorAll('.btn-edit-release').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      frontendLog('INFO', 'RELEASES: Edit release button clicked', `Release ID: ${id}`);
      const release = releases.find(r => r.id === id);
      if (release) {
        switchPage('import-release');
        initImportReleasePage(release);
      }
    });
  });

  // Purge release (overflow menu)
  container.querySelectorAll('.btn-overflow-purge').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      document.querySelectorAll('.release-kebab-menu.open').forEach(m => m.classList.remove('open'));
      frontendLog('INFO', 'RELEASES: Purge release clicked', `Release ID: ${id}`);
      await purgeRelease(id);
    });
  });

  // Delete release (overflow menu)
  container.querySelectorAll('.btn-overflow-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      document.querySelectorAll('.release-kebab-menu.open').forEach(m => m.classList.remove('open'));
      frontendLog('INFO', 'RELEASES: Delete release clicked', `Release ID: ${id}`);
      await deleteRelease(id);
    });
  });
}

// Generate HTML for a specific release
async function generateHtmlForRelease(id) {
  const release = releases.find(r => r.id === id);
  if (!release || !invoke) return;

  frontendLog('INFO', 'HTML_GEN: Generating HTML for release', `Version: ${release.version}, ID: ${id}`);
  try {
    const result = await invoke('generate_html', { release });
    frontendLog('INFO', 'HTML_GEN: HTML generated successfully', `Output: ${result}`);
    showToast('success', `HTML generated: ${result}`, { filePath: result });
  } catch (error) {
    frontendLog('ERROR', 'HTML_GEN: Failed to generate HTML', error.toString());
    showToast('error', 'Failed to generate HTML: ' + error);
  }
}

// Export SPF for a specific release
async function exportSpfForRelease(id) {
  const release = releases.find(r => r.id === id);
  if (!release || !invoke) return;
  frontendLog('INFO', 'SPF_EXPORT: Exporting SPF for release', `Version: ${release.version}, ID: ${id}`);

  try {
    // Filter out online companion packages
    // Note: S920 unsigned packages have specialHandling='extract-s920-root' but should NOT be filtered out
    const spfPackages = (release.packages || []).filter(pkg => {
      const handling = pkg.specialHandling || pkg.special_handling || '';
      const isOnlineCompanion = handling && handling !== 'extract-s920-root';
      return !isOnlineCompanion;
    });

    const spfRelease = {
      ...release,
      packages: spfPackages
    };

    const spfContent = await invoke('generate_spf_content', { release: spfRelease });

    // Generate filename: release_<version>-YYYY-MM-DD-<type>.spf
    const typeShort = getTypeShort(release);
    const spfFileName = `release_${release.version}-${release.date}-${typeShort}.spf`;

    if (dialogSave) {
      const savePath = await dialogSave({
        defaultPath: spfFileName,
        filters: [{ name: 'SPF Files', extensions: ['spf'] }]
      });

      if (savePath) {
        await invoke('save_spf_file', { content: spfContent, filePath: savePath });
        frontendLog('INFO', 'SPF_EXPORT: SPF file saved', `Path: ${savePath}`);
        showToast('success', `SPF file saved: ${savePath}`, { filePath: savePath });
      } else {
        frontendLog('INFO', 'SPF_EXPORT: User cancelled save dialog');
      }
    }
  } catch (error) {
    frontendLog('ERROR', 'SPF_EXPORT: Failed to export SPF', error.toString());
    showToast('error', 'Failed to export SPF: ' + error);
  }
}

// View release notes in modal
function viewReleaseNotes(id) {
  const release = releases.find(r => r.id === id);
  if (!release) return;
  frontendLog('INFO', 'RELEASES: Viewing release notes', `Version: ${release.version}`);

  const rawNotes = release.releaseNotes || '*No release notes available.*';
  let renderedNotes;
  if (typeof marked !== 'undefined') {
    renderedNotes = marked.parse(rawNotes);
  } else {
    // Fallback: basic newline-to-br conversion
    renderedNotes = rawNotes.replace(/\n/g, '<br>');
  }

  showModal(`Release Notes - ${release.version}`, `
    <div class="release-notes-content">
      <div class="markdown-content">${renderedNotes}</div>
    </div>
  `);
}

// Legacy viewRelease function (kept for compatibility)
async function viewRelease(id) {
  const release = releases.find(r => r.id === id);
  if (!release) return;

  const packagesHtml = (release.packages || []).map(pkg => `
    <div class="release-package-item">
      <span class="platform">${pkg.platform}</span>
      <span class="device">${displayDeviceName(pkg.device)}</span>
      ${pkg.category ? `<span class="category">${pkg.category}</span>` : ''}
      ${pkg.url ? `<a href="${pkg.url}" target="_blank" class="url download-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </a>` : ''}
    </div>
  `).join('');

  showModal(`Release ${release.version}`, `
    <div class="release-details">
      <p><strong>Date:</strong> ${release.date}</p>
      <p><strong>Type:</strong> ${release.releaseType || release.type}</p>
      <p><strong>Packages:</strong> ${(release.packages || []).length}</p>
      ${release.releaseNotes ? `<div class="release-notes"><strong>Notes:</strong><br>${release.releaseNotes}</div>` : ''}
      <div class="release-packages-list">
        <h4>Packages</h4>
        ${packagesHtml || '<p>No packages</p>'}
      </div>
    </div>
  `);
}

async function deleteRelease(id) {
  if (!invoke) return;
  frontendLog('INFO', 'RELEASES: Delete release requested', `Release ID: ${id}`);

  const confirmed = await showConfirmDialog(
    'Confirm Delete',
    'Are you sure you want to delete this release?\n\nThis action cannot be undone.',
    { okLabel: 'Delete', kind: 'error' }
  );

  if (confirmed) {
    frontendLog('INFO', 'RELEASES: Delete confirmed', `Release ID: ${id}`);
    try {
      await invoke('delete_release', { id });
      releases = await invoke('get_releases');
      renderReleases();
      populateHtmlReleaseSelect();
      populateReleaseFilterOptions();
      frontendLog('INFO', 'RELEASES: Release deleted successfully', `ID: ${id}`);
      showToast('success', 'Release deleted');
    } catch (error) {
      frontendLog('ERROR', 'RELEASES: Failed to delete release', error.toString());
      showToast('error', 'Failed to delete release: ' + error);
    }
  } else {
    frontendLog('INFO', 'RELEASES: Delete cancelled by user', `Release ID: ${id}`);
  }
}

async function purgeRelease(id) {
  if (!invoke) return;
  const release = releases.find(r => r.id === id);
  if (!release) return;

  frontendLog('INFO', 'RELEASES: Purge release requested', `Release ID: ${id}, Version: ${release.version}`);

  const pkgCount = (release.packages || []).filter(p => p.url).length;
  const confirmed = await showConfirmDialog(
    'Confirm Purge',
    `Are you sure you want to PURGE this release?\n\nThis will delete ${pkgCount} package(s) from JFrog and remove the release.\n\nVersion: ${release.version}\n\nThis action cannot be undone.`,
    { okLabel: 'Purge All', kind: 'error' }
  );

  if (!confirmed) {
    frontendLog('INFO', 'RELEASES: Purge cancelled by user', `Release ID: ${id}`);
    return;
  }

  if (!settings.jfrogApiKey) {
    showToast('error', 'JFrog API key not configured. Go to Settings.');
    return;
  }

  const packagesWithUrl = (release.packages || []).filter(p => p.url);
  let successCount = 0;
  let failCount = 0;
  let notFoundCount = 0;

  showLoadingModal(`Purging release ${release.version}... (0/${packagesWithUrl.length})`);

  for (let i = 0; i < packagesWithUrl.length; i++) {
    const pkg = packagesWithUrl[i];
    const fileName = pkg.url.split('/').filter(s => s.length > 0).pop() || 'Unknown';

    const loadingMsg = document.getElementById('loading-modal-message');
    if (loadingMsg) loadingMsg.textContent = `Deleting from JFrog... (${i + 1}/${packagesWithUrl.length})\n${fileName}`;

    try {
      const result = await invoke('delete_from_jfrog', {
        url: pkg.url,
        apiKey: settings.jfrogApiKey
      });

      if (result.success) {
        successCount++;
        frontendLog('INFO', 'RELEASES: Purge - package deleted', `URL: ${pkg.url}`);
      } else if (result.not_found) {
        notFoundCount++;
        frontendLog('WARNING', 'RELEASES: Purge - package not found', `URL: ${pkg.url}`);
      } else {
        failCount++;
        frontendLog('ERROR', 'RELEASES: Purge - delete failed', `URL: ${pkg.url}, Error: ${result.message}`);
      }
    } catch (err) {
      failCount++;
      frontendLog('ERROR', 'RELEASES: Purge - delete error', `URL: ${pkg.url}, Error: ${err}`);
    }
  }

  try {
    const loadingMsg = document.getElementById('loading-modal-message');
    if (loadingMsg) loadingMsg.textContent = 'Removing release...';

    await invoke('delete_release', { id });
    releases = await invoke('get_releases');
    renderReleases();
    populateHtmlReleaseSelect();
    populateReleaseFilterOptions();

    hideLoadingModal();

    let summary = `Purge complete: ${successCount} deleted`;
    if (notFoundCount > 0) summary += `, ${notFoundCount} not found`;
    if (failCount > 0) summary += `, ${failCount} failed`;

    showToast(failCount > 0 ? 'warning' : 'success', summary);
    frontendLog('INFO', 'RELEASES: Purge complete', summary);
  } catch (error) {
    hideLoadingModal();
    frontendLog('ERROR', 'RELEASES: Purge - failed to delete release', error.toString());
    showToast('error', 'Failed to delete release after purging packages: ' + error);
  }
}

// HTML Generation Page
function initHtmlGenPage() {
  const selectEl = document.getElementById('html-release-select');
  const btnGenerate = document.getElementById('btn-generate-html');
  const btnOpenFolder = document.getElementById('btn-open-html-folder');

  if (selectEl) {
    selectEl.addEventListener('change', () => {
      if (btnGenerate) btnGenerate.disabled = !selectEl.value;
    });
  }

  if (btnGenerate) {
    btnGenerate.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'HTML_PAGE: Generate HTML button clicked');
      await generateHtml();
    });
  }

  if (btnOpenFolder) {
    btnOpenFolder.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'HTML_PAGE: Open HTML folder button clicked');
      await openHtmlFolder();
    });
  }
}

function populateHtmlReleaseSelect() {
  const selectEl = document.getElementById('html-release-select');
  if (!selectEl) return;

  selectEl.innerHTML = '<option value="">-- Select a release --</option>' +
    releases.map(r => `<option value="${r.id}">${r.version} (${r.releaseType || r.type})</option>`).join('');
}

async function generateHtml() {
  const selectEl = document.getElementById('html-release-select');
  if (!selectEl || !selectEl.value) {
    showToast('warning', 'Please select a release');
    return;
  }

  const release = releases.find(r => r.id === selectEl.value);
  if (!release) {
    showToast('error', 'Release not found');
    return;
  }

  if (!invoke) {
    showToast('error', 'Tauri invoke not available');
    return;
  }

  frontendLog('INFO', 'HTML_PAGE: Generating HTML', `Version: ${release.version}`);
  showToast('info', 'Generating HTML...');

  try {
    const result = await invoke('generate_html', { release });
    frontendLog('INFO', 'HTML_PAGE: HTML generated successfully', `Output: ${result}`);
    showToast('success', `HTML generated: ${result}`, { filePath: result });
  } catch (error) {
    frontendLog('ERROR', 'HTML_PAGE: Failed to generate HTML', error.toString());
    showToast('error', 'Failed to generate HTML: ' + error);
  }
}

async function openHtmlFolder() {
  if (!invoke) return;
  frontendLog('INFO', 'HTML_PAGE: Opening HTML folder');

  try {
    const paths = await invoke('get_app_paths');
    await invoke('open_path', { path: paths.html });
  } catch (error) {
    frontendLog('ERROR', 'HTML_PAGE: Failed to open HTML folder', error.toString());
    showToast('error', 'Failed to open HTML folder: ' + error);
  }
}

// Settings Page
function initSettingsPage() {
  // Tab navigation
  const settingsTabs = document.querySelectorAll('.settings-tab');
  const settingsPanels = document.querySelectorAll('.settings-content');

  settingsTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.dataset.tab;

      frontendLog('INFO', 'SETTINGS: Tab switched', `Tab: ${tabName}`);
      settingsTabs.forEach(t => t.classList.toggle('active', t === tab));
      settingsPanels.forEach(p => p.classList.toggle('active', p.id === `settings-${tabName}`));
    });
  });

  // Save settings button
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'SETTINGS: Save settings button clicked');
      await saveSettings();
    });
  }

  // Add mapping button
  const btnAddMapping = document.getElementById('btn-add-mapping');
  if (btnAddMapping) {
    btnAddMapping.addEventListener('click', (e) => {
      e.preventDefault();
      frontendLog('INFO', 'SETTINGS: Add client mapping button clicked');
      addClientMapping();
    });
  }

  // View logs button
  const btnViewLogs = document.getElementById('btn-view-logs');
  if (btnViewLogs) {
    btnViewLogs.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'SETTINGS: View logs button clicked');
      await viewLogs();
    });
  }

  // Export data button
  const btnExportData = document.getElementById('btn-export-data');
  if (btnExportData) {
    btnExportData.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'SETTINGS: Export data button clicked');
      await exportData();
    });
  }

  // Import data button
  const btnImportData = document.getElementById('btn-import-data');
  if (btnImportData) {
    btnImportData.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'SETTINGS: Import data button clicked');
      await importData();
    });
  }

  // Open path buttons
  document.querySelectorAll('.btn-open-path').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const pathId = btn.dataset.pathId;
      const codeEl = document.getElementById(pathId);
      if (codeEl && codeEl.textContent) {
        const folderPath = codeEl.textContent.trim();
        frontendLog('INFO', 'SETTINGS: Open folder button clicked', `Path: ${folderPath}`);
        try {
          await invoke('open_path', { path: folderPath });
        } catch (err) {
          frontendLog('ERROR', 'SETTINGS: Failed to open folder', err.toString());
          showToast('error', `Failed to open folder: ${err}`);
        }
      }
    });
  });

  // Color picker sync (swatch <-> text)
  document.querySelectorAll('.color-input').forEach(wrapper => {
    const swatch = wrapper.querySelector('.color-swatch');
    const colorInput = wrapper.querySelector('input[type="color"]');
    const textInput = wrapper.querySelector('input[type="text"]');
    if (!swatch || !colorInput || !textInput) return;

    colorInput.addEventListener('input', () => {
      const val = colorInput.value;
      textInput.value = val;
      swatch.style.backgroundColor = val;
    });

    textInput.addEventListener('input', () => {
      const val = textInput.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        colorInput.value = val;
        swatch.style.backgroundColor = val;
      }
    });
  });

  // API Key toggle visibility
  const btnToggleApiKey = document.getElementById('btn-toggle-api-key');
  if (btnToggleApiKey) {
    btnToggleApiKey.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btnToggleApiKey.dataset.target;
      const input = document.getElementById(targetId);
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btnToggleApiKey.classList.add('visible');
          frontendLog('INFO', 'SETTINGS: API key visibility toggled', 'Visible');
        } else {
          input.type = 'password';
          btnToggleApiKey.classList.remove('visible');
          frontendLog('INFO', 'SETTINGS: API key visibility toggled', 'Hidden');
        }
      }
    });
  }
}

function populateSettings() {
  // JFrog API Key
  const apiKeyInput = document.getElementById('jfrog-api-key');
  if (apiKeyInput && settings.jfrogApiKey) {
    apiKeyInput.value = settings.jfrogApiKey;
  }

  // JFrog Base URL and Default Repo
  const baseUrlInput = document.getElementById('jfrog-base-url');
  const defaultRepoInput = document.getElementById('jfrog-default-repo');
  if (baseUrlInput && settings.jfrogBaseUrl) {
    baseUrlInput.value = settings.jfrogBaseUrl;
  }
  if (defaultRepoInput && settings.jfrogDefaultRepo) {
    defaultRepoInput.value = settings.jfrogDefaultRepo;
  }

  // Portal settings
  const portalTitleInput = document.getElementById('portal-title');
  const companyNameInput = document.getElementById('company-name');

  if (portalTitleInput && settings.portalSettings?.portalTitle) {
    portalTitleInput.value = settings.portalSettings.portalTitle;
  }
  if (companyNameInput && settings.portalSettings?.companyName) {
    companyNameInput.value = settings.portalSettings.companyName;
  }

  // Client mappings
  renderClientMappings();
}

// Generate a deterministic 3-digit decimal code from a client name using DJB2 hash.
// The name is uppercased before hashing to ensure case-insensitivity.
// If the result collides with an existing mapping (excluding the one at excludeIndex),
// it increments until a free slot is found.
function generateClientNumber(name, excludeIndex) {
  const upper = name.toUpperCase();
  let hash = 5381;
  for (let i = 0; i < upper.length; i++) {
    hash = (Math.imul(hash, 33) + upper.charCodeAt(i)) >>> 0;
  }
  const base = hash % 1000;
  const usedNumbers = (settings.clientMappings || [])
    .filter((_, i) => i !== excludeIndex)
    .map(m => m.number);
  let candidate = base;
  for (let attempt = 0; attempt < 1000; attempt++) {
    const padded = String((base + attempt) % 1000).padStart(3, '0');
    if (!usedNumbers.includes(padded)) return padded;
    candidate = (base + attempt + 1) % 1000;
  }
  return String(candidate).padStart(3, '0');
}

function renderClientMappings() {
  const container = document.getElementById('client-mappings-list');
  if (!container) return;

  const mappings = settings.clientMappings || [];

  if (mappings.length === 0) {
    container.innerHTML = '<p class="empty-text">No client mappings configured. Add mappings to automatically detect client names from version numbers.</p>';
    return;
  }

  container.innerHTML = mappings.map((mapping, index) => {
    if (mapping.builtin) {
      return `
        <div class="mapping-item mapping-item--builtin">
          <input type="text" class="mapping-name" value="${mapping.name}" disabled>
          <span class="mapping-lock-icon" title="Built-in mapping — cannot be changed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input type="text" class="mapping-number" value="${mapping.number}" disabled>
        </div>
      `;
    }
    return `
    <div class="mapping-item">
      <input type="text" class="mapping-name" value="${mapping.name}" placeholder="Client Name" data-index="${index}" data-field="name">
      <button class="btn-generate-mapping" data-index="${index}" title="Generate code from name">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>
        </svg>
      </button>
      <input type="text" class="mapping-number" value="${mapping.number}" placeholder="000" data-index="${index}" data-field="number">
      <button class="btn-remove-mapping" data-index="${index}" title="Remove mapping">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
  }).join('');

  // Attach change listeners
  container.querySelectorAll('.mapping-number, .mapping-name').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      if (settings.clientMappings[index]) {
        settings.clientMappings[index][field] = e.target.value;
      }
    });
  });

  // Generate button
  container.querySelectorAll('.btn-generate-mapping').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(btn.dataset.index);
      const nameInput = container.querySelector(`.mapping-name[data-index="${index}"]`);
      const numberInput = container.querySelector(`.mapping-number[data-index="${index}"]`);
      if (!nameInput || !nameInput.value.trim()) {
        showToast('warning', 'Enter a client name first');
        return;
      }
      const generated = generateClientNumber(nameInput.value.trim(), index);
      numberInput.value = generated;
      if (settings.clientMappings[index]) {
        settings.clientMappings[index].number = generated;
      }
      frontendLog('INFO', 'SETTINGS: Client number generated', `Name: ${nameInput.value.trim()}, Code: ${generated}`);
    });
  });

  container.querySelectorAll('.btn-remove-mapping').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(btn.dataset.index);
      frontendLog('INFO', 'SETTINGS: Client mapping removed', `Index: ${index}`);
      settings.clientMappings.splice(index, 1);
      renderClientMappings();
    });
  });
}

function addClientMapping() {
  if (!settings.clientMappings) {
    settings.clientMappings = [];
  }
  frontendLog('INFO', 'SETTINGS: New client mapping added', `Total: ${settings.clientMappings.length + 1}`);
  settings.clientMappings.push({ number: '', name: '' });
  renderClientMappings();
}

async function saveSettings() {
  frontendLog('INFO', 'SETTINGS: Saving settings');
  if (!invoke) {
    frontendLog('ERROR', 'SETTINGS: Backend not available');
    showToast('error', 'Backend not available');
    return;
  }

  // Gather settings from form
  const apiKeyInput = document.getElementById('jfrog-api-key');
  const portalTitleInput = document.getElementById('portal-title');
  const companyNameInput = document.getElementById('company-name');

  const baseUrlInput = document.getElementById('jfrog-base-url');
  const defaultRepoInput = document.getElementById('jfrog-default-repo');

  settings.jfrogApiKey = apiKeyInput ? apiKeyInput.value : '';
  settings.jfrogBaseUrl = baseUrlInput ? baseUrlInput.value : '';
  settings.jfrogDefaultRepo = defaultRepoInput ? defaultRepoInput.value : '';
  settings.portalSettings = {
    portalTitle: portalTitleInput ? portalTitleInput.value : '',
    companyName: companyNameInput ? companyNameInput.value : ''
  };

  // Filter out empty mappings
  settings.clientMappings = (settings.clientMappings || []).filter(m => m.number && m.name);

  // Remove any custom mappings whose name duplicates a built-in (case-insensitive)
  const builtinNames = BUILTIN_CLIENT_MAPPINGS.map(m => m.name.toLowerCase());
  const dupNames = settings.clientMappings
    .filter(m => !m.builtin && builtinNames.includes((m.name || '').toLowerCase()))
    .map(m => m.name);
  if (dupNames.length > 0) {
    settings.clientMappings = settings.clientMappings.filter(m => m.builtin || !builtinNames.includes((m.name || '').toLowerCase()));
    showToast('warning', `Duplicate built-in mapping(s) removed: ${dupNames.join(', ')}`);
  }

  // Re-inject built-ins so Rust backend always sees them in the saved file
  ensureBuiltinMappings();

  try {
    await invoke('save_settings', { settings });
    frontendLog('INFO', 'SETTINGS: Settings saved successfully');
    showToast('success', 'Settings saved successfully');
  } catch (error) {
    frontendLog('ERROR', 'SETTINGS: Failed to save settings', error.toString());
    showToast('error', 'Failed to save settings: ' + error);
  }
}

async function viewLogs() {
  if (!invoke) return;
  frontendLog('INFO', 'SETTINGS: Opening log viewer');

  try {
    const paths = await invoke('get_app_paths');
    const logsPath = paths.logs;

    // Try to read log files from the logs directory
    let logContent = '';
    try {
      const logFiles = await invoke('list_log_files', { logsPath });
      if (logFiles && logFiles.length > 0) {
        // Read the most recent log file
        logContent = await invoke('read_file_content', { filePath: logFiles[0] });
      } else {
        logContent = 'No log files found.';
      }
    } catch (e) {
      logContent = 'No log files found or unable to read logs.';
    }

    // Show log viewer modal
    showModal('Application Logs', `
      <div class="log-viewer">
        <div class="log-path">Logs folder: <code>${logsPath}</code></div>
        <pre class="log-content">${logContent || 'No logs available'}</pre>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="btn-open-logs-folder">Open Folder</button>
          <button class="btn btn-primary" id="btn-close-logs">Close</button>
        </div>
      </div>
    `);

    document.getElementById('btn-close-logs')?.addEventListener('click', closeModal);
    document.getElementById('btn-open-logs-folder')?.addEventListener('click', async () => {
      try {
        await invoke('open_path', { path: logsPath });
      } catch (e) {
        showToast('error', 'Failed to open logs folder: ' + e);
      }
    });
  } catch (error) {
    showToast('error', 'Failed to view logs: ' + error);
  }
}

function showExportImportDialog(mode, availableCategories = null) {
  const isExport = mode === 'export';
  const title = isExport ? 'Export Data' : 'Import Data';
  const subtitle = isExport
    ? 'Select which data categories to include in the export file.'
    : 'Select which data categories to restore from the backup file.';
  const confirmLabel = isExport ? 'Export' : 'Import';

  const categories = [
    { key: 'releases', label: 'Releases', desc: 'All releases and their SPF files', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
    { key: 'defaultTheme', label: 'Default Theme', desc: 'Your selected color theme', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' },
    { key: 'jfrogSettings', label: 'JFrog Settings', desc: 'Encrypted API key', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
    { key: 'clientMappings', label: 'Client Mappings', desc: 'Client number-to-name mappings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { key: 'htmlSettings', label: 'HTML Settings', desc: 'Portal title and company name', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
  ];

  frontendLog('INFO', `UI: ${title} dialog shown`);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal active';
    overlay.style.zIndex = '2000';

    const categoryRows = categories.map(cat => {
      const available = !availableCategories || availableCategories[cat.key];
      const disabledClass = available ? '' : ' category-item-disabled';
      const disabledAttr = available ? '' : ' disabled';
      const checked = available ? ' checked' : '';
      return `
        <label class="category-item${disabledClass}">
          <div class="category-item-info">
            <span class="category-item-icon">${cat.icon}</span>
            <div>
              <span class="category-item-label">${cat.label}</span>
              <span class="category-item-desc">${cat.desc}${!available ? ' (not in file)' : ''}</span>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" data-category="${cat.key}"${checked}${disabledAttr}>
            <span class="toggle-slider"></span>
          </label>
        </label>`;
    }).join('');

    overlay.innerHTML = `
      <div class="modal-content confirm-dialog export-import-dialog" style="max-width: 480px; padding: 0;">
        <div class="confirm-header confirm-header-info">
          <div class="confirm-icon">
            ${isExport
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
      }
          </div>
          <h3 class="confirm-title">${title}</h3>
        </div>
        <div class="export-import-dialog-body">
          <p class="export-import-dialog-subtitle">${subtitle}</p>
          <div class="export-import-select-all">
            <button class="btn btn-sm btn-outline" id="eid-toggle-all">Select All</button>
          </div>
          <div class="category-checkbox-list">
            ${categoryRows}
          </div>
        </div>
        <div class="confirm-footer">
          <button class="btn btn-secondary" id="eid-cancel">Cancel</button>
          <button class="btn btn-primary" id="eid-confirm">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const toggleAllBtn = overlay.querySelector('#eid-toggle-all');
    const checkboxes = overlay.querySelectorAll('.category-checkbox-list input[type="checkbox"]:not(:disabled)');

    const updateToggleAllLabel = () => {
      const allChecked = [...checkboxes].every(cb => cb.checked);
      toggleAllBtn.textContent = allChecked ? 'Deselect All' : 'Select All';
    };

    toggleAllBtn.addEventListener('click', () => {
      const allChecked = [...checkboxes].every(cb => cb.checked);
      checkboxes.forEach(cb => { cb.checked = !allChecked; });
      updateToggleAllLabel();
    });

    checkboxes.forEach(cb => cb.addEventListener('change', updateToggleAllLabel));

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('#eid-cancel').addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });
    overlay.querySelector('#eid-confirm').addEventListener('click', () => {
      const opts = {};
      categories.forEach(cat => {
        const cb = overlay.querySelector(`input[data-category="${cat.key}"]`);
        opts[cat.key] = cb ? cb.checked : false;
      });
      frontendLog('INFO', `UI: ${title} dialog confirmed`, JSON.stringify(opts));
      cleanup(opts);
    });
  });
}

async function exportData() {
  if (!invoke) return;
  frontendLog('INFO', 'SETTINGS: Starting data export');

  try {
    const options = await showExportImportDialog('export');
    if (!options) return; // cancelled

    const theme = localStorage.getItem('spm-theme') || 'purple-night';
    const data = await invoke('export_data', { options, theme });

    if (dialogSave) {
      const savePath = await dialogSave({
        defaultPath: `smartpostef-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });

      if (savePath) {
        await invoke('write_file_content', { filePath: savePath, content: data });
        frontendLog('INFO', 'SETTINGS: Data exported successfully', `Path: ${savePath}`);
        showToast('success', `Data exported successfully: ${savePath}`, { filePath: savePath });
      }
    }
  } catch (error) {
    frontendLog('ERROR', 'SETTINGS: Failed to export data', error.toString());
    showToast('error', 'Failed to export data: ' + error);
  }
}

async function importData() {
  if (!invoke || !dialogOpen) return;
  frontendLog('INFO', 'SETTINGS: Starting data import');

  try {
    const selected = await dialogOpen({
      multiple: false,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      title: 'Select Backup File'
    });

    if (!selected) return;

    const content = await invoke('read_file_content', { filePath: selected });

    // Detect available categories in the file
    let parsed;
    try { parsed = JSON.parse(content); } catch { showToast('error', 'Invalid JSON file'); return; }

    const isV3 = parsed.version === 3;
    const settingsObj = parsed.settings || {};
    const availableCategories = {
      releases: !!parsed.releases,
      defaultTheme: isV3 ? !!parsed.theme : false,
      jfrogSettings: !!settingsObj.jfrogApiKey,
      clientMappings: !!settingsObj.clientMappings,
      htmlSettings: !!settingsObj.portalSettings,
    };

    const options = await showExportImportDialog('import', availableCategories);
    if (!options) return; // cancelled

    const summary = await invoke('import_data', { data: content, options });

    // Apply theme if imported
    if (summary.theme) {
      document.body.setAttribute('data-theme', summary.theme);
      document.documentElement.setAttribute('data-theme', summary.theme);
      localStorage.setItem('spm-theme', summary.theme);
      if (window._renderThemeGrid) window._renderThemeGrid();
    }

    // Selectively reload affected data
    if (options.jfrogSettings || options.clientMappings || options.htmlSettings) {
      settings = await invoke('get_settings');
      populateSettings();
    }
    if (options.releases) {
      releases = await invoke('get_releases');
      renderReleases();
      populateHtmlReleaseSelect();
    }

    const importedList = summary.imported.join(', ') || 'none';
    const msg = summary.releaseCount > 0
      ? `Imported: ${importedList} (${summary.releaseCount} releases)`
      : `Imported: ${importedList}`;
    frontendLog('INFO', 'SETTINGS: Data imported successfully', msg);
    showToast('success', msg);
  } catch (error) {
    frontendLog('ERROR', 'SETTINGS: Failed to import data', error.toString());
    showToast('error', 'Failed to import data: ' + error);
  }
}

// Toast notifications with enhanced visibility
// options: { filePath: string } - if provided, adds Open and Find buttons
function showToast(type, message, options = {}) {
  // Log warnings and errors via the logging system
  if (type === 'warning' || type === 'error') {
    frontendLog(type.toUpperCase(), `TOAST: ${message}`);
  }
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  const titles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info'
  };

  // Build action buttons HTML if filePath is provided
  let actionsHtml = '';
  if (options.filePath) {
    actionsHtml = `
      <div class="toast-actions">
        <button class="toast-action-btn toast-btn-open" title="Open in default application">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10 8 16 12 10 16 10 8"/>
          </svg>
          Open
        </button>
        <button class="toast-action-btn toast-btn-find" title="Show in folder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Find
        </button>
      </div>
    `;
  }

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-content">
      <span class="toast-title">${titles[type] || 'Notification'}</span>
      <span class="toast-message">${message}</span>
      ${actionsHtml}
    </div>
    <button class="toast-close" aria-label="Close notification">&times;</button>
    <div class="toast-progress"></div>
  `;

  // Add to container at the top (newest first)
  container.insertBefore(toast, container.firstChild);

  // Play notification sound for errors and warnings
  if (type === 'error' || type === 'warning') {
    playNotificationSound(type);
  }

  // Auto remove: 10 seconds for toasts with action buttons, 6 seconds for regular
  const dismissTime = options.filePath ? 10000 : 6000;
  const autoRemoveTimeout = setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, dismissTime);

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(autoRemoveTimeout);
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  });

  // Action buttons (Open / Find)
  if (options.filePath) {
    const openBtn = toast.querySelector('.toast-btn-open');
    const findBtn = toast.querySelector('.toast-btn-find');

    if (openBtn) {
      openBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        frontendLog('INFO', 'TOAST: Open file clicked', `Path: ${options.filePath}`);
        try {
          await invoke('open_file_in_default_app', { filePath: options.filePath });
        } catch (err) {
          frontendLog('ERROR', 'TOAST: Failed to open file', err.toString());
        }
      });
    }

    if (findBtn) {
      findBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        frontendLog('INFO', 'TOAST: Show in folder clicked', `Path: ${options.filePath}`);
        try {
          await invoke('show_in_folder', { filePath: options.filePath });
        } catch (err) {
          frontendLog('ERROR', 'TOAST: Failed to show in folder', err.toString());
        }
      });
    }
  }

  // Pause auto-dismiss on hover
  let remainingTime = dismissTime;
  let startTime = Date.now();

  toast.addEventListener('mouseenter', () => {
    remainingTime -= (Date.now() - startTime);
    clearTimeout(autoRemoveTimeout);
    toast.querySelector('.toast-progress').style.animationPlayState = 'paused';
  });

  toast.addEventListener('mouseleave', () => {
    startTime = Date.now();
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, remainingTime);
    toast.querySelector('.toast-progress').style.animationPlayState = 'running';
  });
}

// Play a simple notification sound using Web Audio API
function playNotificationSound(type) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different sounds for different types
    if (type === 'error') {
      oscillator.frequency.value = 200;
      oscillator.type = 'square';
      gainNode.gain.value = 0.1;
    } else if (type === 'warning') {
      oscillator.frequency.value = 400;
      oscillator.type = 'triangle';
      gainNode.gain.value = 0.08;
    } else {
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.05;
    }

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Silently fail if audio is not available
    console.log('Audio notification not available');
  }
}

// ============================================================
// Import Release Page
// ============================================================

// State for import release
let importReleaseState = {
  release: null,
  originalRelease: null,
  packages: [],
  newPackages: [],
  isEditing: false,
  spfContent: null
};

function initImportReleasePage(existingRelease) {
  const content = document.getElementById('import-release-content');
  if (!content) return;

  // Reset state
  importReleaseState = {
    release: null,
    originalRelease: existingRelease || null,
    packages: [],
    newPackages: [],
    isEditing: !!existingRelease,
    spfContent: null
  };

  if (existingRelease) {
    // Editing an existing release — populate directly
    frontendLog('INFO', 'IMPORT: Editing existing release', `Version: ${existingRelease.version}, ID: ${existingRelease.id}`);
    importReleaseState.release = { ...existingRelease };
    // Normalize: backend sends "type" but frontend uses "releaseType"
    if (!importReleaseState.release.releaseType && importReleaseState.release.type) {
      importReleaseState.release.releaseType = importReleaseState.release.type;
    }
    importReleaseState.packages = [...(existingRelease.packages || [])];
    renderImportReleasePage();
  } else {
    // Fresh import — show drag & drop
    frontendLog('INFO', 'IMPORT: Showing SPF import interface');
    renderSpfDropZone(content);
  }
}

function renderSpfDropZone(container) {
  container.innerHTML = `
    <div class="card spf-drop-zone" id="spf-drop-zone">
      <div class="drop-zone-content">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <polyline points="9 15 12 12 15 15"/>
        </svg>
        <h3>Import SPF File</h3>
        <p>Drag and drop an .spf file here, or click to browse</p>
        <button class="btn btn-secondary" id="btn-browse-spf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Browse Files
        </button>
      </div>
    </div>
  `;

  // Browse button
  const btnBrowse = document.getElementById('btn-browse-spf');
  if (btnBrowse) {
    btnBrowse.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!dialogOpen) {
        showToast('error', 'File dialog not available');
        return;
      }
      const selected = await dialogOpen({
        multiple: false,
        filters: [{ name: 'SPF Files', extensions: ['spf'] }]
      });
      if (selected) {
        try {
          const content = await invoke('read_file_content', { filePath: selected });
          handleSpfImport(content, selected.split(/[/\\]/).pop());
        } catch (err) {
          frontendLog('ERROR', 'IMPORT: Failed to read SPF file', err.toString());
          showToast('error', 'Failed to read SPF file: ' + err);
        }
      }
    });
  }
}

function handleSpfImport(spfContent, fileName) {
  frontendLog('INFO', 'IMPORT: Processing SPF file', `File: ${fileName}`);
  importReleaseState.spfContent = spfContent;

  // Parse SPF content
  const parsed = parseSpfContent(spfContent);
  if (!parsed) {
    showToast('error', 'Failed to parse SPF file. Invalid format.');
    return;
  }

  importReleaseState.release = parsed.release;
  importReleaseState.packages = parsed.packages;
  importReleaseState.isEditing = true;

  // Check if this release already exists locally (match version + type + signed/unsigned)
  const parsedType = (parsed.release.releaseType || parsed.release.type || '').toLowerCase();
  const parsedUnsigned = isReleaseUnsigned({ packages: parsed.packages });
  const existingRelease = releases.find(r => {
    if (r.version !== parsed.release.version) return false;
    const rType = (r.releaseType || r.type || '').toLowerCase();
    if (rType !== parsedType) return false;
    if (rType === 'production') return isReleaseUnsigned(r) === parsedUnsigned;
    return true;
  });
  if (existingRelease) {
    importReleaseState.originalRelease = existingRelease;
    frontendLog('INFO', 'IMPORT: Found existing local release', `Version: ${existingRelease.version}, Type: ${existingRelease.releaseType || existingRelease.type}, Unsigned: ${isReleaseUnsigned(existingRelease)}`);
  }

  renderImportReleasePage();
  showToast('success', `SPF file imported: ${fileName}`);
}

function parseSpfContent(content) {
  // SPF parser — handles both old (flat CSV) and new (sectioned) formats
  try {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;

    let release = { version: '', date: '', releaseType: 'Production', description: '', releaseNotes: '' };
    let packages = [];

    // Check for sectioned format
    const hasReleaseInfo = lines.some(l => l === '<release_info>');

    if (hasReleaseInfo) {
      // New sectioned format
      let currentSection = null;
      let releaseNotesLines = [];

      for (const line of lines) {
        if (line.startsWith('<') && line.endsWith('>') && !line.startsWith('</')) {
          currentSection = line.replace(/[<>]/g, '');
          continue;
        }
        if (line.startsWith('</')) {
          if (currentSection === 'release_notes') {
            release.releaseNotes = releaseNotesLines.join('\n');
          }
          currentSection = null;
          continue;
        }

        if (currentSection === 'release_info') {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();
          if (key.trim() === 'version') release.version = value;
          else if (key.trim() === 'date') release.date = value;
          else if (key.trim() === 'type') {
            const t = value.toLowerCase();
            release.releaseType = t === 'deploy-only' ? 'deploy-only' : t === 'development' ? 'Development' : 'Production';
          }
          else if (key.trim() === 'description') release.description = value;
        } else if (currentSection === 'release_notes') {
          releaseNotesLines.push(line);
        } else if (currentSection === 'release_pkgs') {
          // Skip header row (Platform;Device/Type;Category;Signature;Client;URL)
          if (line.toLowerCase().startsWith('platform;') || line.toLowerCase().startsWith('platform,')) {
            continue;
          }
          // CSV format: platform;device;category;signature;client;url (semicolon-separated)
          const parts = line.split(';');
          if (parts.length >= 6) {
            packages.push({
              platform: parts[0].trim(),
              device: parts[1].trim(),
              category: parts[2].trim(),
              signature: parts[3].trim(),
              client: parts[4].trim(),
              url: parts.slice(5).join(';').trim()
            });
          }
        }
      }
    } else {
      // Old flat format — each line is a URL
      for (const line of lines) {
        if (line.startsWith('http')) {
          const pkg = detectPackageFromUrl(line);
          packages.push(pkg);
        }
      }
      // Try to extract version from first package URL (v2 hex hash, A2A v1, STA v1)
      if (packages.length > 0) {
        let versionMatch = packages[0].url.match(/(\d+\.\d+\.\d+\+[0-9a-fA-F]+)/);
        if (!versionMatch) versionMatch = packages[0].url.match(/(\d+\.\d+\.\d+\.A2A\.\d+)/);
        if (!versionMatch) versionMatch = packages[0].url.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (versionMatch) release.version = versionMatch[1];
      }
      release.date = new Date().toLocaleDateString('en-CA');
    }

    return { release, packages };
  } catch (err) {
    frontendLog('ERROR', 'IMPORT: SPF parse error', err.toString());
    return null;
  }
}

function detectPackageFromUrl(url) {
  // Detect platform, device, category, signature, client from URL
  const fileName = url.split('/').filter(s => s.length > 0).pop() || '';
  const lowerUrl = url.toLowerCase();
  const lowerName = fileName.toLowerCase();

  let platform = 'Unknown', device = '', category = '', signature = '', client = '';

  // Detect signature
  if (lowerName.includes('_sign.') || lowerName.includes('_sign/')) {
    signature = 'Signed';
  }

  // Detect unsigned
  const isUnsigned = lowerUrl.includes('/unsigned/');

  // Platform detection
  if (lowerUrl.includes('/windows/') || lowerName.includes('windows') || lowerName.endsWith('.exe') || lowerName.endsWith('.dll')) {
    platform = 'Windows';
    device = 'Windows';
    if (lowerName.includes('dll')) category = 'DLL';
    else if (lowerName.includes('online')) category = 'Online';
    else if (lowerName.includes('offline')) category = 'Offline';
    else category = 'Installer';
  } else if (lowerUrl.includes('/linux/') || lowerName.includes('linux')) {
    platform = 'Linux';
    if (lowerName.includes('x64') || lowerName.includes('64')) {
      device = 'Linux 64-bit';
    } else {
      device = 'Linux 32-bit';
    }
    if (lowerName.includes('online')) category = 'Online';
    else if (lowerName.includes('offline')) category = 'Offline';
    else category = 'Installer';
  } else if (lowerUrl.includes('/s920/') || lowerName.includes('s920')) {
    platform = 'Embedded';
    device = 'S920';
    category = 'Package';
  } else if (lowerName.includes('.a2a') || lowerUrl.includes('/a2a/')) {
    platform = 'A2A';
    device = 'Android';
    if (lowerName.includes('.aar')) category = 'AAR';
    else if (lowerName.includes('doc') || lowerName.includes('integration')) category = 'Documentation';
    else if (lowerName.includes('possdk') || lowerName.includes('pos-sdk')) category = 'POS SDK';
    else if (lowerName.includes('tefsdk') || lowerName.includes('tef-sdk') || lowerName.includes('androidtefsdk')) category = 'Android TEF SDK';
    else if (lowerName.includes('tefexample') || lowerName.includes('tef-example')) category = 'TEF Example';
    else if (lowerName.includes('posexample') || lowerName.includes('pos-example')) category = 'POS Example';
    else category = 'Package';
  } else if (lowerUrl.includes('/android/') || lowerName.endsWith('.apk') || lowerName.endsWith('.zip')) {
    platform = 'STA';
    // Try to detect device from URL path or filename
    const deviceMatch = fileName.match(/(?:SmartPosTef|SmartPosTEF)-(?:AP|LP)-([A-Za-z0-9_]+)-/i);
    if (deviceMatch) {
      device = deviceMatch[1].toUpperCase();
    } else {
      device = 'Unknown';
    }
    // Detect category from AP/LP prefix
    const typeMatch = fileName.match(/(?:SmartPosTef|SmartPosTEF)-(AP|LP)-/i);
    if (typeMatch) {
      category = typeMatch[1].toUpperCase() === 'LP' ? 'Launcher' : 'App';
    }
  }

  // Detect client from client mappings
  if (settings.clientMappings && settings.clientMappings.length > 0) {
    for (const mapping of settings.clientMappings) {
      if (lowerName.includes(mapping.number) || lowerUrl.includes(`/${mapping.number}/`) || lowerUrl.includes(`-${mapping.number}-`) || lowerUrl.includes(`-${mapping.number}/`)) {
        client = mapping.name;
        break;
      }
    }
  }

  return { platform, device, category, signature, client, url };
}

function renderImportReleasePage() {
  const content = document.getElementById('import-release-content');
  if (!content) return;

  const rel = importReleaseState.release;
  if (!rel) return;

  content.innerHTML = `
    <!-- Basic Information -->
    <div class="card">
      <h3>Basic Information</h3>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label>Version *</label>
          <input type="text" id="import-version" value="${rel.version || ''}">
        </div>
        <div class="form-group">
          <label>Release Date *</label>
          <div class="date-field-wrapper">
            <input type="date" id="import-date" value="${rel.date || ''}">
          </div>
        </div>
        ${rel.releaseType === 'deploy-only' ? '' : `<div class="form-group">
          <label>Release Type *</label>
          <select id="import-type">
            <option value="Production" ${rel.releaseType === 'Production' ? 'selected' : ''}>Production</option>
            <option value="Development" ${rel.releaseType === 'Development' ? 'selected' : ''}>Development</option>
          </select>
        </div>`}
      </div>
      <div class="form-group" style="margin-top: 12px;">
        <label>Description</label>
        <input type="text" id="import-description" value="${rel.description || ''}" placeholder="Brief description of this release...">
      </div>
    </div>
    
    <!-- Release Notes (hidden for deploy-only) -->
    ${rel.releaseType === 'deploy-only' ? '' : `
    <div class="card">
      <h3>Release Notes</h3>
      <div class="release-notes-tabs">
        <button class="notes-tab active" data-tab="edit">Write</button>
        <button class="notes-tab" data-tab="preview">Preview</button>
      </div>
      <div class="notes-content active">
        <div id="import-notes-edit" class="tab-content active">
          <textarea id="import-release-notes" rows="10" placeholder="Write release notes in Markdown...">${rel.releaseNotes || ''}</textarea>
        </div>
        <div id="import-notes-preview" class="tab-content">
          <div id="import-notes-preview-content" class="markdown-preview"></div>
        </div>
      </div>
    </div>
    `}
    
    <!-- Release Summary -->
    <div class="card">
      <div class="release-summary-header">
        <h3>Release Summary</h3>
        <span class="summary-subtitle">Overview of the release package</span>
      </div>
      <div id="import-release-summary">
        ${renderReleaseSummary({ packages: importReleaseState.packages })}
      </div>
    </div>
    
    <!-- Package Management Accordions -->
    <div class="card">
      <h3>Package Management</h3>
      <p class="card-description">Manage packages for different platforms and devices</p>
      <div id="import-accordions">
        <!-- Rendered by renderImportAccordions() -->
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="action-bar import-action-bar">
      <button class="btn btn-secondary" id="btn-import-cancel">
        Cancel
      </button>
      <button class="btn btn-secondary" id="btn-import-add-packages">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Packages
      </button>
      <button class="btn btn-primary" id="btn-import-update-release">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        ${rel.releaseType === 'deploy-only'
      ? (importReleaseState.originalRelease ? 'Update Deploy' : 'Save Deploy')
      : (importReleaseState.originalRelease ? 'Update Release' : 'Save Release')}
      </button>
    </div>
  `;

  // Attach event listeners
  attachImportPageEventListeners();

  // Render package accordions
  renderImportAccordions();
}

function attachImportPageEventListeners() {
  // Warn when editing critical fields on an existing release
  if (importReleaseState.isEditing) {
    const orig = importReleaseState.originalRelease || {};
    const fieldLabels = { 'import-version': 'version', 'import-date': 'release date', 'import-type': 'release type' };
    ['import-version', 'import-date', 'import-type'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        showToast('warning', `You changed the ${fieldLabels[id]}. Make sure this is intentional.`);
      });
    });
  }

  // Release notes tabs
  document.querySelectorAll('.notes-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.notes-tab').forEach(t => t.classList.toggle('active', t === tab));

      const editPane = document.getElementById('import-notes-edit');
      const previewPane = document.getElementById('import-notes-preview');

      if (tabName === 'edit') {
        if (editPane) editPane.classList.add('active');
        if (previewPane) previewPane.classList.remove('active');
      } else {
        if (editPane) editPane.classList.remove('active');
        if (previewPane) previewPane.classList.add('active');
        // Render markdown preview
        const textarea = document.getElementById('import-release-notes');
        const previewContent = document.getElementById('import-notes-preview-content');
        if (textarea && previewContent && window.marked) {
          previewContent.innerHTML = window.marked.parse(textarea.value || '');
        }
      }
    });
  });

  // Cancel button
  const btnCancel = document.getElementById('btn-import-cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', (e) => {
      e.preventDefault();
      frontendLog('INFO', 'IMPORT: Cancel button clicked');
      // Reset state and go back to releases
      importReleaseState = { release: null, originalRelease: null, packages: [], newPackages: [], isEditing: false, spfContent: null };
      switchPage('releases');
    });
  }

  // Add Packages button
  const btnAddPkgs = document.getElementById('btn-import-add-packages');
  if (btnAddPkgs) {
    btnAddPkgs.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'IMPORT: Add packages button clicked');
      await handleImportAddPackages();
    });
  }

  // Update/Save Release button
  const btnUpdate = document.getElementById('btn-import-update-release');
  if (btnUpdate) {
    btnUpdate.addEventListener('click', async (e) => {
      e.preventDefault();
      frontendLog('INFO', 'IMPORT: Update release button clicked');
      await handleUpdateRelease();
    });
  }
}

// ============================================================
// Phase 3: Package Management Actions
// ============================================================

// Show/hide loading modal
function showLoadingModal(message) {
  let overlay = document.getElementById('loading-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-modal-overlay';
    overlay.className = 'modal active';
    overlay.style.zIndex = '3000';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 400px; text-align: center; padding: 32px;">
        <div class="loading-spinner"></div>
        <p id="loading-modal-message" style="margin-top: 16px; color: var(--text-secondary);">${message || 'Processing...'}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.classList.add('active');
    const msg = overlay.querySelector('#loading-modal-message');
    if (msg) msg.textContent = message || 'Processing...';
  }
}

function hideLoadingModal() {
  const overlay = document.getElementById('loading-modal-overlay');
  if (overlay) overlay.remove();
}

// Delete a package from JFrog and from the import release
async function handleDeleteFromJfrog(packageIndex) {
  const pkg = importReleaseState.packages[packageIndex];
  if (!pkg) return;

  const fileName = pkg.url ? pkg.url.split('/').filter(s => s.length > 0).pop() : 'Unknown';
  frontendLog('INFO', 'IMPORT: Delete requested', `Package: ${fileName}, URL: ${pkg.url}`);

  // Confirm with user
  const confirmed = await showConfirmDialog(
    'Delete Package from JFrog',
    `Are you sure you want to delete this package from JFrog?\n\n${fileName}\n\nThis action cannot be undone.`,
    { okLabel: 'Delete', kind: 'error' }
  );

  if (!confirmed) {
    frontendLog('INFO', 'IMPORT: Delete cancelled by user');
    return;
  }

  if (!pkg.url) {
    frontendLog('WARNING', 'IMPORT: Package has no URL, removing from list only');
    // Also remove from newPackages if it's there
    const newPkgIndex = importReleaseState.newPackages.findIndex(p => p === pkg || p.filePath === pkg.filePath);
    if (newPkgIndex !== -1) {
      importReleaseState.newPackages.splice(newPkgIndex, 1);
    }
    importReleaseState.packages.splice(packageIndex, 1);
    renderImportReleasePage();
    showToast('success', 'Package removed from release');
    return;
  }

  // Verify URL before sending delete command
  if (!settings.jfrogApiKey) {
    showToast('error', 'JFrog API key not configured. Go to Settings.');
    return;
  }

  showLoadingModal('Deleting package from JFrog...');

  try {
    const result = await invoke('delete_from_jfrog', {
      url: pkg.url,
      apiKey: settings.jfrogApiKey
    });

    hideLoadingModal();

    if (result.success) {
      frontendLog('INFO', 'IMPORT: Package deleted successfully', `URL: ${pkg.url}`);
      // Also remove from newPackages if it's there
      const newPkgIndex = importReleaseState.newPackages.findIndex(p => p === pkg || p.filePath === pkg.filePath || p.url === pkg.url);
      if (newPkgIndex !== -1) {
        importReleaseState.newPackages.splice(newPkgIndex, 1);
      }
      importReleaseState.packages.splice(packageIndex, 1);
      renderImportReleasePage();
      showToast('success', `Deleted: ${fileName}`);
    } else if (result.not_found) {
      // 404 — package doesn't exist on JFrog, inform user and remove from list
      frontendLog('WARNING', 'IMPORT: Package not found on JFrog (404)', `URL: ${pkg.url}`);
      // Also remove from newPackages if it's there
      const newPkgIndex = importReleaseState.newPackages.findIndex(p => p === pkg || p.filePath === pkg.filePath || p.url === pkg.url);
      if (newPkgIndex !== -1) {
        importReleaseState.newPackages.splice(newPkgIndex, 1);
      }
      importReleaseState.packages.splice(packageIndex, 1);
      renderImportReleasePage();
      showToast('warning', `Package not found on JFrog (already deleted?). Removed from release.`);
    } else {
      frontendLog('ERROR', 'IMPORT: Delete failed', `URL: ${pkg.url}, Error: ${result.message}`);
      showToast('error', `Failed to delete: ${result.message}`);
    }
  } catch (err) {
    hideLoadingModal();
    frontendLog('ERROR', 'IMPORT: Delete error', err.toString());
    showToast('error', `Delete failed: ${err}`);
  }
}

// Add new packages to the import release
async function handleImportAddPackages() {
  if (!dialogOpen) {
    showToast('error', 'File dialog not available');
    return;
  }

  const selected = await dialogOpen({
    multiple: true
  });

  if (!selected || (Array.isArray(selected) && selected.length === 0)) return;

  const files = Array.isArray(selected) ? selected : [selected];
  frontendLog('INFO', 'IMPORT: Adding packages', `Count: ${files.length}`);

  // Get the current release base version (Major.Minor.Medium without Patch)
  const releaseVersion = importReleaseState.release ? importReleaseState.release.version : '';
  const releaseBaseVersion = extractBaseVersion(releaseVersion);

  for (const filePath of files) {
    const fileName = filePath.split(/[/\\]/).pop() || '';

    // Detect package info from filename
    const pkg = detectPackageFromFileName(fileName, filePath);

    // Version validation: compare package version with release version
    if (releaseBaseVersion && pkg.version) {
      const pkgBaseVersion = extractBaseVersion(pkg.version);
      if (pkgBaseVersion && pkgBaseVersion !== releaseBaseVersion) {
        const continueAnyway = await showConfirmDialog(
          'Version Mismatch',
          `The package version (${pkgBaseVersion}) does not match the release version (${releaseBaseVersion}).\n\nPackage: ${fileName}\n\nDo you want to add it anyway?`,
          { okLabel: 'Continue', cancelLabel: 'Skip', kind: 'warning' }
        );
        if (!continueAnyway) {
          frontendLog('INFO', 'IMPORT: Skipped package due to version mismatch', `File: ${fileName}`);
          continue;
        }
      }
    }

    // Mark as new (needs upload)
    pkg.isNew = true;
    pkg.filePath = filePath;
    pkg.fileName = fileName;
    pkg.jfrogPath = buildJfrogPath(pkg, fileName);

    importReleaseState.newPackages.push(pkg);
    importReleaseState.packages.push(pkg);
    frontendLog('INFO', 'IMPORT: Package added', `File: ${fileName}, Platform: ${pkg.platform}, Device: ${pkg.device}`);
  }

  renderImportReleasePage();
  showToast('success', `Added ${files.length} package(s)`);
}

// Device map matching Rust DEVICE_MAP (src-tauri/src/lib.rs)
const DEVICE_MAP = {
  'A910': { manufacturer: 'pax', path: 'a910' },
  'S920': { manufacturer: 'pax', path: 's920' },
  'P2': { manufacturer: 'sunmi', path: 'p2' },
  'P2_LITE_SE': { manufacturer: 'sunmi', path: 'p2litese' },
  'P2LITESE': { manufacturer: 'sunmi', path: 'p2litese' },
  'P2_MINI': { manufacturer: 'sunmi', path: 'p2_mini' },
  'L3': { manufacturer: 'positivo', path: 'l3' },
  'L3_2024': { manufacturer: 'positivo', path: 'l3_2024' },
  'L300': { manufacturer: 'positivo', path: 'l300' },
  'L400': { manufacturer: 'positivo', path: 'l400' },
  'GPOS700': { manufacturer: 'gertec', path: 'gpos700' },
  'GPOS720': { manufacturer: 'gertec', path: 'gpos720' },
  'GPOS760': { manufacturer: 'gertec', path: 'gpos760' },
  'DX8000': { manufacturer: 'ingenico', path: 'dx8000' },
  'DX4000': { manufacturer: 'ingenico', path: 'dx4000' },
  'EX4000': { manufacturer: 'ingenico', path: 'ex4000' },
  'X990_PRO': { manufacturer: 'verifone', path: 'x990_pro' },
  'X990_UX': { manufacturer: 'verifone', path: 'x990_ux' },
};

// Display-only device name normalization (just replace _ with space, keep casing)
function displayDeviceName(name) {
  return (name || '').replace(/_/g, ' ');
}

// Normalize device names for display (used by A2A and STA packages)
function normalizeDeviceName(deviceRaw) {
  if (!deviceRaw) return '';
  const upper = deviceRaw.toUpperCase();

  // Known device name mappings
  const mappings = {
    'P2LITESE': 'P2 Lite',
    'P2LITE': 'P2 Lite',
    'P2_LITE': 'P2 Lite',
    'L3_2024': 'L3 2024',
    'DX4000': 'DX4000',
    'DX8000': 'DX8000',
    'GPOS720': 'GPOS720',
    'GPOS760': 'GPOS760',
    'A910': 'A910',
    'A920': 'A920',
    'P2': 'P2',
    'L3': 'L3',
    'S920': 'S920'
  };

  if (mappings[upper]) return mappings[upper];

  // Default: replace underscores with spaces
  return deviceRaw.replace(/_/g, ' ');
}

// Normalize A2A device names for display (preserves SE suffix etc.)
function normalizeA2ADisplayName(name) {
  if (!name) return '';
  const map = {
    'P2_LITE_SE': 'P2 Lite SE', 'P2LITESE': 'P2 Lite SE',
    'X990_PRO': 'X990 Pro', 'X990_UX': 'X990 UX',
    'L3_2024': 'L3 2024', 'DX4000': 'DX4000', 'DX8000': 'DX8000',
    'GPOS720': 'GPOS720', 'GPOS760': 'GPOS760',
  };
  return map[name.toUpperCase()] || name.replace(/_/g, ' ');
}

// Detect package info from filename (for locally added files)
function detectPackageFromFileName(fileName, filePath) {
  const lowerName = fileName.toLowerCase();

  let platform = 'Unknown', device = '', category = '', signature = '', client = '', version = '', isDev = false;

  // Detect signature
  if (lowerName.includes('_sign.')) {
    signature = 'Signed';
  }

  // Extract version from filename (try v2 hex hash first, then A2A v1, then STA v1)
  let versionMatch = fileName.match(/(\d+\.\d+\.\d+\+[0-9a-fA-F]+)/);
  if (!versionMatch) versionMatch = fileName.match(/(\d+\.\d+\.\d+\.A2A\.\d+)/);
  if (!versionMatch) versionMatch = fileName.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (versionMatch) version = versionMatch[1];

  // Platform detection
  // Windows TEF Library: AditumTefLibrary-{P|D}-{version}-{hash}.zip
  if (lowerName.startsWith('aditumteflibrary-') && lowerName.endsWith('.zip')) {
    platform = 'Windows';
    device = 'TEF Library';
    category = '';
    // Windows: must have .exe/.dll extension or contain 'windows'
  } else if (lowerName.endsWith('.exe') || lowerName.endsWith('.dll') || lowerName.includes('windows')) {
    platform = 'Windows';
    if (lowerName.includes('dll') || lowerName.endsWith('.dll')) {
      device = 'TEF Library';
      category = 'DLL';
    } else {
      device = 'TEF Installer';
      if (lowerName.includes('online')) category = 'Online';
      else if (lowerName.includes('offline')) category = 'Offline';
      else category = 'Installer';
    }
    // Linux 64-bit: detect by architecture pattern (x86_64, amd64) - covers files without extension
  } else if (lowerName.includes('x86_64') || lowerName.includes('amd64')) {
    platform = 'Linux64';
    const isLibrary64 = lowerName.includes('lib') || lowerName.includes('.so');
    device = isLibrary64 ? 'TEF Library' : 'TEF Installer';
    if (isLibrary64) {
      category = '';
    } else if (lowerName.includes('online')) {
      category = 'Online';
    } else if (lowerName.includes('offline')) {
      category = 'Offline';
    } else {
      category = 'Installer';
    }
    // Linux 32-bit: detect by architecture pattern (i386)
  } else if (lowerName.includes('i386')) {
    platform = 'Linux32';
    const isLibrary32 = lowerName.includes('lib') || lowerName.includes('.so');
    device = isLibrary32 ? 'TEF Library' : 'TEF Installer';
    if (isLibrary32) {
      category = '';
    } else if (lowerName.includes('online')) {
      category = 'Online';
    } else if (lowerName.includes('offline')) {
      category = 'Offline';
    } else {
      category = 'Installer';
    }
    // Linux fallback: detect by 'linux' keyword or Linux-specific extensions
  } else if (lowerName.includes('linux') || lowerName.endsWith('.deb') || lowerName.endsWith('.rpm') || lowerName.endsWith('.sh') || lowerName.endsWith('.run')) {
    if (lowerName.includes('x64') || lowerName.includes('64')) {
      platform = 'Linux64';
    } else {
      platform = 'Linux32';
    }
    const isLibraryFallback = lowerName.includes('lib') || lowerName.includes('.so');
    device = isLibraryFallback ? 'TEF Library' : 'TEF Installer';
    if (isLibraryFallback) {
      category = '';
    } else if (lowerName.includes('online')) {
      category = 'Online';
    } else if (lowerName.includes('offline')) {
      category = 'Offline';
    } else {
      category = 'Installer';
    }
  } else if (lowerName.includes('s920')) {
    platform = 'Embedded';
    device = 'S920';
    category = 'Package';
    // A2A: packages with .A2A. pattern in filename
  } else if (lowerName.includes('.a2a.')) {
    platform = 'A2A';

    // .aar files are SDK Integration libraries
    if (lowerName.endsWith('.aar')) {
      device = 'AAR';
      category = '';
    }
    // Doc-*.zip files are SDK documentation
    else if (lowerName.startsWith('doc-') && lowerName.endsWith('.zip')) {
      device = 'Doc';
      category = '';
    }
    // TefSdk APKs with architecture (v7a/v8a)
    else if (lowerName.includes('tefsdk')) {
      device = 'TefSdk';
      if (lowerName.includes('v7a') || lowerName.includes('armeabi-v7a')) {
        category = 'v7a';
      } else if (lowerName.includes('v8a') || lowerName.includes('arm64-v8a')) {
        category = 'v8a';
      }
    }
    // PaymentExample APKs
    else if (lowerName.includes('paymentexample')) {
      category = 'Example';
      // Extract device: PaymentExample-{Device}-P-... or PaymentExample-P-... (generic)
      const exampleMatch = fileName.match(/PaymentExample-([A-Za-z0-9_]+)-[PD]-/i);
      if (exampleMatch && exampleMatch[1].toUpperCase() !== 'P' && exampleMatch[1].toUpperCase() !== 'D') {
        device = exampleMatch[1];
      } else {
        device = 'Generic';
      }
    }
    // SmartPosTef APKs for specific devices
    else if (lowerName.includes('smartpostef') && lowerName.endsWith('.apk')) {
      // Extract device: SmartPosTef-{Device}-P-...
      const deviceMatch = fileName.match(/SmartPosTef-([A-Za-z0-9_]+)-[PD]-/i);
      if (deviceMatch) {
        device = deviceMatch[1];
      } else {
        device = 'Android';
      }
      category = '';
    }
    // Generic A2A APK
    else if (lowerName.endsWith('.apk')) {
      device = 'Android';
      category = 'APK';
    }
    // Other A2A packages
    else {
      device = 'Android';
      category = 'Package';
    }

    // Extract signature from filename (e.g., TecToy, Entrepay before -release)
    const sigMatch = fileName.match(/-([A-Za-z]+)-release/i);
    if (sigMatch && !['P', 'D', 'sign'].includes(sigMatch[1].toUpperCase())) {
      signature = sigMatch[1];
    }
  } else if (lowerName.endsWith('.apk') || lowerName.endsWith('.zip')) {
    platform = 'STA';
    const deviceMatch = fileName.match(/(?:SmartPosTef|SmartPosTEF|AditumTef|AditumTEF)-(?:AP|LP|AD|LD)-([A-Za-z0-9_]+)-/i);
    if (deviceMatch) device = deviceMatch[1];
    else device = 'Unknown';
    const typeMatch = fileName.match(/(?:SmartPosTef|SmartPosTEF|AditumTef|AditumTEF)-(AP|LP|AD|LD)-/i);
    if (typeMatch) {
      const prefix = typeMatch[1].toUpperCase();
      category = (prefix === 'LP' || prefix === 'LD') ? 'Launcher' : 'App';
      isDev = (prefix === 'LD' || prefix === 'AD');
    }
  }

  // Detect client from client mappings
  if (settings.clientMappings && settings.clientMappings.length > 0) {
    for (const mapping of settings.clientMappings) {
      if (lowerName.includes(mapping.number)) {
        client = mapping.name;
        break;
      }
    }
  }

  return { platform, device, category, signature, client, url: '', version, filePath, isDev };
}

// Handle Update/Save Release
async function handleUpdateRelease() {
  const rel = importReleaseState.release;
  if (!rel) {
    showToast('error', 'No release data available');
    return;
  }

  // Gather updated fields
  const versionInput = document.getElementById('import-version');
  const dateInput = document.getElementById('import-date');
  const typeInput = document.getElementById('import-type');
  const notesInput = document.getElementById('import-release-notes');

  if (versionInput) rel.version = versionInput.value;
  if (dateInput) rel.date = dateInput.value;
  if (typeInput) rel.releaseType = typeInput.value;
  if (notesInput) rel.releaseNotes = notesInput.value;
  const descInput = document.getElementById('import-description');
  if (descInput) rel.description = descInput.value.trim();

  // Check if there are new packages to upload
  const newPkgs = importReleaseState.newPackages.filter(p => !p.uploaded);

  if (newPkgs.length > 0) {
    if (!settings.jfrogApiKey) {
      showToast('error', 'JFrog API key not configured. Go to Settings.');
      return;
    }

    showLoadingModal(`Uploading ${newPkgs.length} new package(s)...`);

    let successCount = 0;
    let failCount = 0;

    for (const pkg of newPkgs) {
      try {
        let filePath = pkg.filePath;
        let uploadFileName = pkg.fileName;

        // STA APK→ZIP rule: For STA dev or prod-signed, APK must be zipped
        const needsZip = shouldZipApk(pkg, importReleaseState.release ? importReleaseState.release.releaseType : 'Production');
        if (needsZip && filePath) {
          frontendLog('INFO', 'IMPORT: Zipping APK for STA upload', `File: ${pkg.fileName}`);
          const zipResult = await invoke('create_zip_from_file', { filePath: filePath });
          if (zipResult.success) {
            filePath = zipResult.zipPath;
            uploadFileName = zipResult.zipFileName;
            frontendLog('INFO', 'IMPORT: APK zipped successfully', `ZIP: ${uploadFileName}`);
          } else {
            throw new Error(`Failed to zip APK: ${zipResult.message}`);
          }
        }

        // Determine JFrog path
        const jfrogPath = buildJfrogPath(pkg, uploadFileName);

        const result = await invoke('upload_to_jfrog', {
          filePath: filePath,
          jfrogPath: jfrogPath,
          apiKey: settings.jfrogApiKey
        });

        if (result.success) {
          pkg.uploaded = true;
          pkg.url = result.url;
          successCount++;
        } else {
          pkg.error = result.message;
          failCount++;
        }
      } catch (err) {
        pkg.error = err.toString();
        failCount++;
        frontendLog('ERROR', 'IMPORT: Upload failed', `File: ${pkg.fileName}, Error: ${err}`);
      }
    }

    hideLoadingModal();

    if (failCount > 0) {
      showToast('warning', `Uploaded ${successCount}, failed ${failCount}. Fix errors and try again.`);
      renderImportReleasePage();
      return;
    }
  }

  // Build release data
  const releaseData = {
    id: importReleaseState.originalRelease ? importReleaseState.originalRelease.id : `${rel.version}-${(rel.releaseType || 'production').toLowerCase()}-${Date.now()}`,
    version: rel.version,
    date: rel.date,
    type: rel.releaseType || 'Production',
    description: rel.description || '',
    releaseNotes: rel.releaseNotes || '',
    packages: importReleaseState.packages.map(p => ({
      platform: p.platform || 'Unknown',
      device: p.device || '',
      category: p.category || '',
      signature: p.signature || '',
      client: p.client || '',
      url: p.url || ''
    })),
    createdAt: importReleaseState.originalRelease ? importReleaseState.originalRelease.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  showLoadingModal('Saving release...');

  try {
    // Generate SPF content and save internally
    const spfContent = await invoke('generate_spf_content', { release: releaseData });

    // Save SPF to internal releases folder
    const typeShort = getTypeShort(rel);
    const spfFileName = `release_${rel.version}-${rel.date}-${typeShort}.spf`;
    await invoke('save_internal_spf', { content: spfContent, fileName: spfFileName });

    // Save release to releases.json (cache/index)
    releaseData.spfFileName = spfFileName;
    await invoke('save_release', { release: releaseData });

    // Refresh releases list
    releases = await invoke('get_releases');
    renderReleases();
    populateHtmlReleaseSelect();
    populateReleaseFilterOptions();

    hideLoadingModal();

    // Reset state and navigate to releases
    importReleaseState = { release: null, originalRelease: null, packages: [], newPackages: [], isEditing: false, spfContent: null };
    switchPage('releases');

    showToast('success', `Release ${rel.version} saved successfully!`);
    frontendLog('INFO', 'IMPORT: Release saved', `Version: ${rel.version}`);
  } catch (err) {
    hideLoadingModal();
    frontendLog('ERROR', 'IMPORT: Save release failed', err.toString());
    showToast('error', `Failed to save release: ${err}`);
  }
}

// Determine if an APK needs to be zipped before upload
// Rule: STA dev and STA prod-signed APKs must be zipped. STA prod-unsigned APKs go as-is.
// A2A APKs always go as-is.
function shouldZipApk(pkg, releaseType) {
  const fileName = pkg.fileName || pkg.file_name || '';
  if (!fileName) return false;
  const lowerName = fileName.toLowerCase();
  if (!lowerName.endsWith('.apk')) return false;
  if (pkg.platform !== 'STA') return false;

  // Check if this is a prod-unsigned package
  const isSigned = pkg.signature === 'Signed' || lowerName.includes('_sign.');
  const isProd = (releaseType || 'Production').toLowerCase() !== 'development';

  // Prod unsigned APKs go as-is
  if (isProd && !isSigned) return false;

  // Dev APKs and Prod signed APKs must be zipped
  return true;
}

// Build JFrog path for a new package
function buildJfrogPath(pkg, fileName) {
  const baseUrl = settings.jfrogBaseUrl || 'https://artifactory.aditum.com.br/artifactory';
  const repo = settings.jfrogDefaultRepo || 'packages';

  // Check if this is a dev package (from filename or release type)
  const isDev = pkg.isDev || pkg.is_dev ||
    fileName.toLowerCase().includes('-d-') ||
    (importReleaseState.release && importReleaseState.release.releaseType === 'development');
  const devPrefix = isDev ? 'dev/' : '';

  // Return directory path only - the Rust backend appends the filename
  if (pkg.platform === 'Windows') {
    return `${repo}/${devPrefix}windows/`;
  } else if (pkg.platform === 'Linux64') {
    return `${repo}/${devPrefix}linux/64/`;
  } else if (pkg.platform === 'Linux32') {
    return `${repo}/${devPrefix}linux/32/`;
  } else if (pkg.platform === 'Linux') {
    return `${repo}/${devPrefix}linux/`;
  } else if (pkg.platform === 'Embedded') {
    return `${repo}/${devPrefix}pax/s920/`;
  } else if (pkg.platform === 'STA') {
    const deviceKey = (pkg.device || '').toUpperCase();
    const info = DEVICE_MAP[deviceKey];
    if (info) {
      let prefix;
      if (isDev) {
        prefix = 'dev/';
      } else if (pkg.signature === 'Signed' || fileName.toLowerCase().includes('_sign.')) {
        prefix = '';
      } else {
        prefix = 'unsigned/';
      }
      const catSegment = pkg.category === 'App' ? 'app' : 'launcher';
      const clientFolder = pkg.client ? `${pkg.client.toLowerCase()}/` : '';
      return `${repo}/${prefix}${info.manufacturer}/${info.path}/${catSegment}/${clientFolder}`;
    }
    const device = (pkg.device || 'unknown').toLowerCase();
    return `${repo}/${devPrefix}android/${device}/`;
  } else if (pkg.platform === 'A2A') {
    const lowerFile = fileName.toLowerCase();
    if (pkg.device === 'AAR' || lowerFile.endsWith('.aar')) {
      return `${repo}/${devPrefix}app-to-app/sdk_integration/`;
    } else if (pkg.device === 'Doc' || (lowerFile.startsWith('doc-') && lowerFile.endsWith('.zip'))) {
      return `${repo}/${devPrefix}app-to-app/sdk_integration/doc/`;
    } else if (pkg.device === 'TefSdk' || lowerFile.includes('tefsdk')) {
      const arch = (pkg.category === 'v7a' || lowerFile.includes('v7a')) ? 'v7a' : 'v8a';
      return `${repo}/${devPrefix}app-to-app/tef-android/${arch}/`;
    } else if (pkg.category === 'Example' || lowerFile.includes('paymentexample')) {
      if (pkg.device && pkg.device !== 'Generic') {
        const deviceKey = pkg.device.toUpperCase();
        const info = DEVICE_MAP[deviceKey];
        if (info) {
          const signPrefix = (!isDev && !lowerFile.includes('_sign.')) ? 'unsigned/' : (isDev ? 'dev/' : '');
          return `${repo}/${signPrefix}app-to-app/payment_example/${info.manufacturer}/${info.path}/`;
        }
      }
      return `${repo}/${devPrefix}app-to-app/payment_example/`;
    } else {
      const deviceKey = (pkg.device || '').toUpperCase();
      const info = DEVICE_MAP[deviceKey];
      if (info) {
        const signPrefix = (!isDev && !lowerFile.includes('_sign.')) ? 'unsigned/' : (isDev ? 'dev/' : '');
        return `${repo}/${signPrefix}app-to-app/apk/${info.manufacturer}/${info.path}/`;
      }
      return `${repo}/${devPrefix}app-to-app/`;
    }
  } else {
    return `${repo}/${devPrefix}other/`;
  }
}

// ============================================================
// Phase 4: Tools Page - Daily Password Generator
// ============================================================

function initToolsPage() {
  frontendLog('INFO', 'TOOLS: Initializing Tools page');

  // Set default date to today
  const dateInput = document.getElementById('pwd-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Version input - no default value, just placeholder guidance
  const versionInput = document.getElementById('pwd-app-version');
  // No default value - user must enter the portal version

  // Generate button
  const btnGenerate = document.getElementById('btn-generate-password');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', (e) => {
      e.preventDefault();
      const version = document.getElementById('pwd-app-version')?.value || '2.0.7';
      const dateStr = document.getElementById('pwd-date')?.value;

      let targetDate;
      if (dateStr) {
        const parts = dateStr.split('-');
        targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        targetDate = new Date();
      }

      const password = generateDailyPassword(version, targetDate);

      const resultDiv = document.getElementById('password-result');
      const valueSpan = document.getElementById('password-value');
      const metaDiv = document.getElementById('password-meta');

      if (resultDiv && valueSpan) {
        resultDiv.style.display = 'block';
        valueSpan.textContent = password;

        const dd = targetDate.getDate();
        const MM = targetDate.getMonth() + 1;
        const yyyy = targetDate.getFullYear();
        const versionInt = parseInt(version.replace(/\./g, ''), 10) || 1;

        if (metaDiv) {
          metaDiv.innerHTML = `Date: ${yyyy}-${String(MM).padStart(2, '0')}-${String(dd).padStart(2, '0')} &nbsp;|&nbsp; Version: ${version} (seed: ${versionInt}) &nbsp;|&nbsp; Algorithm: v3.1 Hash-based`;
        }
      }

      frontendLog('INFO', 'TOOLS: Password generated', `Version: ${version}, Date: ${dateStr}`);
    });
  }

  // Copy button
  const btnCopy = document.getElementById('btn-copy-password');
  if (btnCopy) {
    btnCopy.addEventListener('click', (e) => {
      e.preventDefault();
      const valueSpan = document.getElementById('password-value');
      if (valueSpan && valueSpan.textContent) {
        navigator.clipboard.writeText(valueSpan.textContent).then(() => {
          showToast('success', 'Password copied to clipboard');
        }).catch(() => {
          // Fallback for non-HTTPS contexts
          const textArea = document.createElement('textarea');
          textArea.value = valueSpan.textContent;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showToast('success', 'Password copied to clipboard');
        });
      }
    });
  }
}

// Password Algorithm v3.1 - Hash-based mixing
// Generates a 6-character uppercase hexadecimal password
function generateDailyPassword(appVersion, date) {
  const now = date || new Date();
  const dd = now.getDate();
  const MM = now.getMonth() + 1;
  const yyyy = now.getFullYear();

  const versionStr = appVersion.replace(/\./g, '');
  const version = parseInt(versionStr, 10) || 1;

  // Step 1: Create initial seed
  let hash = (dd * 13) + (MM * 397) + (yyyy * 7919) + (version * 2953);

  // Step 2: First mixing round
  hash = Math.imul(hash, 0x45d9f3b);
  hash = hash ^ (hash >>> 16);

  // Step 3: Date mixing
  const dateMix = (yyyy << 9) ^ (MM << 5) ^ dd;
  hash = hash ^ dateMix;

  // Step 4: Second mixing round
  hash = Math.imul(hash, 0x119de1f3);
  hash = hash ^ (hash >>> 15);

  // Step 5: Version mixing
  const versionMix = Math.imul(version, 0x85ebca6b) ^ Math.imul(dd * MM, 0x1b873593);
  hash = hash ^ versionMix;

  // Step 6: Final mixing
  hash = Math.imul(hash, 0xc2b2ae35);
  hash = hash ^ (hash >>> 13);
  hash = Math.imul(hash, 0x27d4eb2d);
  hash = hash ^ (hash >>> 15);

  // Step 7: Bound and convert
  const unsignedHash = hash >>> 0;
  const result = (unsignedHash % 0xF00000) + 0x100000;

  return result.toString(16).toUpperCase();
}

// ============================================================
// Phase 5: Advanced Options - Custom Devices CRUD
// ============================================================

function initAdvancedOptionsPage() {
  frontendLog('INFO', 'ADVANCED: Initializing Advanced Options page');

  // Ensure customPlatforms array exists in settings
  if (!settings.customPlatforms) {
    settings.customPlatforms = [];
  }

  renderCustomDevices();

  // Add device button
  const btnAdd = document.getElementById('btn-add-custom-device');
  if (btnAdd) {
    // Remove old listeners by cloning
    const newBtn = btnAdd.cloneNode(true);
    btnAdd.parentNode.replaceChild(newBtn, btnAdd);

    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleAddCustomDevice();
    });
  }
}

function renderCustomDevices() {
  const container = document.getElementById('custom-devices-list');
  if (!container) return;

  const devices = settings.customPlatforms || [];

  if (devices.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 2rem;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <p>No custom devices registered yet.</p>
        <p style="font-size: 0.8125rem; margin-top: 0.5rem;">Use the form above to add custom devices that will be recognized during package detection.</p>
      </div>
    `;
    return;
  }

  let html = '';
  devices.forEach((device, index) => {
    html += `
      <div class="custom-device-item">
        <div class="cd-info">
          <span class="cd-name">${escapeHtml(device.name)}</span>
          <span class="cd-type-badge ${device.type}">${device.type}</span>
          <span class="cd-identifier">${escapeHtml(device.identifier)}</span>
        </div>
        <div class="cd-actions">
          <button class="btn btn-sm btn-danger" onclick="handleDeleteCustomDevice(${index})" title="Delete device">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function handleAddCustomDevice() {
  const nameInput = document.getElementById('cd-name');
  const typeSelect = document.getElementById('cd-type');
  const identifierInput = document.getElementById('cd-identifier');

  const name = nameInput?.value?.trim() || '';
  const type = typeSelect?.value || 'Platform';
  const identifier = identifierInput?.value?.trim()?.toLowerCase() || '';

  // Validation
  if (!name) {
    showToast('error', 'Device name is required');
    nameInput?.focus();
    return;
  }

  if (!identifier) {
    showToast('error', 'URL identifier is required');
    identifierInput?.focus();
    return;
  }

  // Check for duplicates
  if (!settings.customPlatforms) settings.customPlatforms = [];

  const duplicate = settings.customPlatforms.find(
    d => d.identifier.toLowerCase() === identifier || d.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showToast('error', `A device with this name or identifier already exists: ${duplicate.name}`);
    return;
  }

  // Add to settings
  const newDevice = { name, type, identifier };
  settings.customPlatforms.push(newDevice);

  // Save settings
  try {
    await invoke('save_settings', { settings: settings });
    frontendLog('INFO', 'ADVANCED: Custom device added', `Name: ${name}, Type: ${type}, Identifier: ${identifier}`);
    showToast('success', `Custom device "${name}" added successfully`);

    // Clear form
    if (nameInput) nameInput.value = '';
    if (identifierInput) identifierInput.value = '';

    // Re-render list
    renderCustomDevices();
  } catch (err) {
    frontendLog('ERROR', 'ADVANCED: Failed to save custom device', err.toString());
    showToast('error', `Failed to save: ${err}`);
    // Rollback
    settings.customPlatforms.pop();
  }
}

async function handleDeleteCustomDevice(index) {
  const devices = settings.customPlatforms || [];
  if (index < 0 || index >= devices.length) return;

  const device = devices[index];

  const confirmed = await showConfirmDialog(
    'Delete Custom Device',
    `Are you sure you want to delete "${device.name}"?\n\nType: ${device.type}\nIdentifier: ${device.identifier}`,
    { okLabel: 'Delete', kind: 'error' }
  );

  if (!confirmed) return;

  devices.splice(index, 1);

  try {
    await invoke('save_settings', { settings: settings });
    frontendLog('INFO', 'ADVANCED: Custom device deleted', `Name: ${device.name}`);
    showToast('success', `Device "${device.name}" deleted`);
    renderCustomDevices();
  } catch (err) {
    frontendLog('ERROR', 'ADVANCED: Failed to delete custom device', err.toString());
    showToast('error', `Failed to delete: ${err}`);
    // Rollback
    devices.splice(index, 0, device);
    renderCustomDevices();
  }
}

// Utility: escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Utility: copy text to clipboard with visual feedback
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('success', 'URL copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('error', 'Failed to copy URL');
  });
}


// ============================================================
// Phase 10: Accordion Rendering System
// ============================================================

/**
 * Main function to render package management accordions.
 * Groups packages by platform and renders each as a collapsible accordion.
 */
function renderImportAccordions() {
  const container = document.getElementById('import-accordions');
  if (!container) return;

  const packages = importReleaseState.packages || [];
  if (packages.length === 0) {
    container.innerHTML = '<p class="accordion-empty">No packages yet. Use "Add Packages" to add files.</p>';
    return;
  }

  // Group packages by platform
  const groups = {};
  const platformOrder = ['Windows', 'Linux64', 'Linux32', 'Embedded', 'STA', 'A2A', 'Custom'];

  packages.forEach((pkg, idx) => {
    const platform = pkg.platform || 'Other';
    if (!groups[platform]) groups[platform] = [];
    groups[platform].push({ ...pkg, _index: idx });
  });

  // Sort platforms: known order first, then any extras
  const sortedPlatforms = Object.keys(groups).sort((a, b) => {
    const ia = platformOrder.indexOf(a);
    const ib = platformOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  // Platform display names, CSS classes, and SVG icons
  const platformMeta = {
    'Windows': { label: 'Windows (TEF)', icon: 'W', css: 'platform-windows', svg: 'assets/images/windows.svg' },
    'Linux64': { label: 'Linux 64-bit (TEF)', icon: 'L64', css: 'platform-linux64', svg: 'assets/images/linux64.svg' },
    'Linux32': { label: 'Linux 32-bit (TEF)', icon: 'L32', css: 'platform-linux32', svg: 'assets/images/linux32.svg' },
    'Embedded': { label: 'Embedded', icon: 'E', css: 'platform-embedded', svg: 'assets/images/embedded.svg' },
    'STA': { label: 'STA (Standalone)', icon: 'STA', css: 'platform-sta', svg: 'assets/images/sta.svg' },
    'A2A': { label: 'A2A (App to App)', icon: 'A2A', css: 'platform-a2a', svg: 'assets/images/a2a.svg' },
    'Custom': { label: 'Custom Platforms', icon: 'C', css: 'platform-custom', svg: null },
  };

  let html = '<div class="accordion-group">';

  sortedPlatforms.forEach(platform => {
    const pkgs = groups[platform];
    const meta = platformMeta[platform] || { label: platform, icon: platform.charAt(0), css: 'platform-custom', svg: null };

    // Count new packages (those in newPackages list)
    const newPkgUrls = new Set((importReleaseState.newPackages || []).map(p => p.url || p.filePath));
    const newCount = pkgs.filter(p => newPkgUrls.has(p.url) || newPkgUrls.has(p.filePath)).length;

    // Use SVG icon if available, otherwise fall back to text badge
    const iconHtml = meta.svg
      ? `<img src="${meta.svg}" alt="${escapeHtml(meta.label)}" class="accordion-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" /><div class="accordion-icon ${meta.css}" style="display:none">${meta.icon}</div>`
      : `<div class="accordion-icon ${meta.css}">${meta.icon}</div>`;

    html += `
      <div class="accordion-item" data-platform="${escapeHtml(platform)}">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <svg class="accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          ${iconHtml}
          <span class="accordion-title">${escapeHtml(meta.label)}</span>
          <span class="accordion-badge">${pkgs.length}</span>
          ${newCount > 0 ? `<span class="accordion-badge new-badge" title="${newCount} new package(s)">+${newCount}</span>` : ''}
        </div>
        <div class="accordion-body">
          ${renderAccordionContent(platform, pkgs)}
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Toggle accordion expand/collapse.
 */
function toggleAccordion(headerEl) {
  const item = headerEl.closest('.accordion-item');
  if (item) {
    item.classList.toggle('expanded');
  }
}

/**
 * Wrap packages in client group cards. Clientless packages render directly
 * via renderFn; packages with a client get grouped into labeled cards.
 */
function wrapWithClientGroups(pkgs, renderFn) {
  if (!pkgs || pkgs.length === 0) return renderFn(pkgs);

  const clientless = pkgs.filter(p => !p.client);
  const clientMap = {};
  pkgs.filter(p => p.client).forEach(p => {
    if (!clientMap[p.client]) clientMap[p.client] = [];
    clientMap[p.client].push(p);
  });

  const clients = Object.keys(clientMap);
  if (clients.length === 0) return renderFn(pkgs);

  let html = '';
  if (clientless.length > 0) {
    html += renderFn(clientless);
  }
  clients.sort().forEach(client => {
    html += `<div class="client-group">`;
    html += `<div class="client-group-header">${escapeHtml(client)}</div>`;
    html += renderFn(clientMap[client]);
    html += `</div>`;
  });
  return html;
}

/**
 * Route to the correct content renderer based on platform.
 */
function renderAccordionContent(platform, pkgs) {
  switch (platform) {
    case 'Windows':
    case 'Linux64':
    case 'Linux32':
      return wrapWithClientGroups(pkgs, p => renderPlatformTabs(platform, p));
    case 'STA':
      return wrapWithClientGroups(pkgs, renderSTADeviceList);
    case 'A2A':
      return wrapWithClientGroups(pkgs, renderA2ACards);
    case 'Embedded':
      return wrapWithClientGroups(pkgs, renderEmbeddedList);
    case 'Custom':
      return renderCustomPlatformAccordion(pkgs);
    default:
      return renderGenericPackageTable(pkgs);
  }
}

/**
 * Render TEF platform packages with tabs (Library, Installer, etc.).
 */
function renderPlatformTabs(platform, pkgs) {
  // Group by device (TEF Library, Installer, etc.)
  const deviceGroups = {};
  pkgs.forEach(pkg => {
    const device = pkg.device || 'Other';
    if (!deviceGroups[device]) deviceGroups[device] = [];
    deviceGroups[device].push(pkg);
  });

  const devices = Object.keys(deviceGroups);
  if (devices.length === 0) return '<p class="accordion-empty">No packages</p>';

  // If only one device, no tabs needed
  if (devices.length === 1) {
    return renderPackageTable(deviceGroups[devices[0]]);
  }

  const tabId = `tabs-${platform.toLowerCase()}-${Date.now()}`;
  let tabsHtml = `<div class="platform-tabs" id="${tabId}">`;
  let contentHtml = '';

  devices.forEach((device, i) => {
    const isActive = i === 0 ? ' active' : '';
    const tabContentId = `${tabId}-${i}`;
    tabsHtml += `<button class="platform-tab${isActive}" onclick="switchPlatformTab('${tabId}', ${i})">${escapeHtml(displayDeviceName(device))} (${deviceGroups[device].length})</button>`;
    contentHtml += `<div class="platform-tab-content${isActive}" data-tab-index="${i}">${renderPackageTable(deviceGroups[device])}</div>`;
  });

  tabsHtml += '</div>';
  return tabsHtml + contentHtml;
}

/**
 * Switch between platform tabs.
 */
function switchPlatformTab(tabContainerId, index) {
  const container = document.getElementById(tabContainerId);
  if (!container) return;
  const parent = container.parentElement;

  // Update tab buttons
  container.querySelectorAll('.platform-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  // Update tab content
  parent.querySelectorAll('.platform-tab-content').forEach((content, i) => {
    content.classList.toggle('active', i === index);
  });
}

/**
 * Render a standard package card grid (unified layout for all platforms).
 */
function renderPackageTable(pkgs) {
  if (!pkgs || pkgs.length === 0) return '<p class="accordion-empty">No packages</p>';

  let html = '<div class="pkg-cards">';

  pkgs.forEach(pkg => {
    const fileName = pkg.url ? pkg.url.split('/').filter(s => s.length > 0).pop() : 'N/A';
    const category = pkg.category || '';
    const device = pkg.device || '';
    const title = displayDeviceName(device) || category || fileName;

    // Build badges HTML
    let badgesHtml = '';
    // Skip category badge for Library packages or if category is None/empty
    const isLibrary = device === 'TEF Library' || category.toLowerCase() === 'dll';
    if (category && category.toLowerCase() !== 'none' && !isLibrary) {
      badgesHtml += `<span class="pkg-badge pkg-badge-category">${escapeHtml(category)}</span>`;
    }
    if (pkg.signature) {
      badgesHtml += `<span class="pkg-badge pkg-badge-signature">${escapeHtml(pkg.signature)}</span>`;
    }
    if (pkg.client) {
      badgesHtml += `<span class="pkg-badge pkg-badge-client">${escapeHtml(pkg.client)}</span>`;
    }

    // Extract JFrog path from URL for tooltip
    const jfrogPath = pkg.url ? pkg.url.replace('https://artifactory.aditum.com.br/artifactory/', '') : (pkg.jfrogPath || pkg.jfrog_path || (pkg.filePath ? `(pending upload: ${pkg.filePath.split('/').pop()})` : 'N/A'));

    html += `
      <div class="pkg-card">
        <div class="pkg-card-header">
          <span class="pkg-card-title">${escapeHtml(title)}</span>
          <div class="pkg-card-header-actions">
            <span class="btn-pkg-info" title="${escapeHtml(jfrogPath)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </span>
            <button class="btn-pkg-delete" title="Delete package" onclick="handleDeleteFromJfrog(${pkg._index})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        ${badgesHtml ? `<div class="pkg-card-badges">${badgesHtml}</div>` : ''}
        <div class="pkg-card-actions">
          ${pkg.url ? `
            <button class="btn-pkg-download" title="Download ${escapeHtml(fileName)}" onclick="window.open('${escapeHtml(pkg.url)}', '_blank')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
            <button class="btn-pkg-copy" title="Copy URL" onclick="copyToClipboard('${escapeHtml(pkg.url)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          ` : `<span class="pkg-badge-added"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Added</span>`}
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

/**
 * Render STA packages grouped by device using card grid.
 */
function renderSTADeviceList(pkgs) {
  const deviceGroups = {};
  pkgs.forEach(pkg => {
    const device = pkg.device || 'Unknown';
    if (!deviceGroups[device]) deviceGroups[device] = [];
    deviceGroups[device].push(pkg);
  });

  let html = '';
  Object.keys(deviceGroups).sort().forEach(device => {
    const devicePkgs = deviceGroups[device];
    html += `<div class="sta-device-group">`;
    html += `<div class="sta-device-name">${escapeHtml(displayDeviceName(device))} (${devicePkgs.length})</div>`;
    html += renderPackageTable(devicePkgs);
    html += `</div>`;
  });

  return html || '<p class="accordion-empty">No STA packages</p>';
}

/**
 * Render A2A packages as cards grouped by type (SDK, Device APKs, Examples).
 */
function renderA2ACards(pkgs) {
  if (!pkgs || pkgs.length === 0) return '<p class="accordion-empty">No A2A packages</p>';

  // Classify A2A packages
  const sdkDocs = pkgs.filter(p => ['Doc', 'AAR', 'SDK', 'Documentation', 'TefSdk'].includes(p.device) ||
    p.category?.toLowerCase()?.includes('sdk'));
  const examples = pkgs.filter(p => p.category?.toLowerCase()?.includes('example') ||
    p.device?.toLowerCase()?.includes('example'));
  const deviceApks = pkgs.filter(p => !sdkDocs.includes(p) && !examples.includes(p) && p.device);

  let html = '';

  // SDK/Documentation section
  if (sdkDocs.length > 0) {
    html += '<div class="a2a-section"><div class="a2a-section-title">SDK</div>';
    html += '<div class="pkg-cards">';
    sdkDocs.forEach(pkg => {
      const fileName = pkg.url ? pkg.url.split('/').filter(s => s.length > 0).pop() : 'N/A';
      let title = '';
      if (pkg.device === 'Doc' || pkg.device === 'Documentation') {
        title = 'Documentation';
      } else if (pkg.device === 'AAR') {
        title = 'SDK (AAR)';
      } else if (pkg.device === 'TefSdk') {
        // Include category (v7a/v8a) in title
        title = pkg.category ? `TefSdk ${pkg.category}` : 'TefSdk';
      } else {
        title = pkg.device || 'SDK';
      }
      html += renderA2ACardHtml(pkg, title, fileName);
    });
    html += '</div></div>';
  }

  // Device APKs section
  if (deviceApks.length > 0) {
    html += '<div class="a2a-section"><div class="a2a-section-title">A2A (Device APKs)</div>';
    html += '<div class="pkg-cards">';
    deviceApks.forEach(pkg => {
      const fileName = pkg.url ? pkg.url.split('/').filter(s => s.length > 0).pop() : 'N/A';
      const title = pkg.device || 'Device APK';
      html += renderA2ACardHtml(pkg, title, fileName);
    });
    html += '</div></div>';
  }

  // Examples section
  if (examples.length > 0) {
    html += '<div class="a2a-section"><div class="a2a-section-title">Examples</div>';
    html += '<div class="pkg-cards">';
    examples.forEach(pkg => {
      const fileName = pkg.url ? pkg.url.split('/').filter(s => s.length > 0).pop() : 'N/A';
      // Extract device from URL or filename for PaymentExample (e.g., PaymentExample-DX8000-P-...)
      let exampleDevice = '';
      const exampleMatch = fileName.match(/PaymentExample-([A-Za-z0-9_]+)-[PD]-/i);
      if (exampleMatch && !['P', 'D'].includes(exampleMatch[1].toUpperCase())) {
        exampleDevice = normalizeA2ADisplayName(exampleMatch[1]);
      }
      const title = exampleDevice ? `${exampleDevice} PaymentExample` : 'PaymentExample';
      html += renderA2ACardHtml(pkg, title, fileName);
    });
    html += '</div></div>';
  }

  return html || '<p class="accordion-empty">No A2A packages</p>';
}

/**
 * Helper function to render a single A2A card.
 */
function renderA2ACardHtml(pkg, title, fileName) {
  // Build badges HTML (exclude category since it's shown in section title)
  let badgesHtml = '';
  if (pkg.signature) {
    badgesHtml += `<span class="pkg-badge pkg-badge-signature">${escapeHtml(pkg.signature)}</span>`;
  }
  if (pkg.client) {
    badgesHtml += `<span class="pkg-badge pkg-badge-client">${escapeHtml(pkg.client)}</span>`;
  }

  // Extract JFrog path from URL for tooltip
  const jfrogPath = pkg.url ? pkg.url.replace('https://artifactory.aditum.com.br/artifactory/', '') : (pkg.jfrogPath || pkg.jfrog_path || (pkg.filePath ? `(pending upload: ${pkg.filePath.split('/').pop()})` : 'N/A'));

  return `
      <div class="pkg-card">
        <div class="pkg-card-header">
          <span class="pkg-card-title">${escapeHtml(title)}</span>
          <div class="pkg-card-header-actions">
            <span class="btn-pkg-info" title="${escapeHtml(jfrogPath)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </span>
            <button class="btn-pkg-delete" title="Delete package" onclick="handleDeleteFromJfrog(${pkg._index})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        ${badgesHtml ? `<div class="pkg-card-badges">${badgesHtml}</div>` : ''}
        <div class="pkg-card-actions">
          ${pkg.url ? `
            <button class="btn-pkg-download" title="Download ${escapeHtml(fileName)}" onclick="window.open('${escapeHtml(pkg.url)}', '_blank')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
            <button class="btn-pkg-copy" title="Copy URL" onclick="copyToClipboard('${escapeHtml(pkg.url)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          ` : `<span class="pkg-badge-added"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Added</span>`}
        </div>
      </div>
    `;
}

/**
 * Render Embedded packages as a simple table.
 */
function renderEmbeddedList(pkgs) {
  return renderPackageTable(pkgs);
}

/**
 * Render Custom platform packages.
 */
function renderCustomPlatformAccordion(pkgs) {
  if (!pkgs || pkgs.length === 0) return '<p class="accordion-empty">No custom packages</p>';

  let html = '';
  pkgs.forEach(pkg => {
    const fileName = pkg.url ? pkg.url.split('/').filter(s => s.length > 0).pop() : 'N/A';
    html += `
      <div class="custom-pkg-row">
        <span class="custom-pkg-name">${escapeHtml(pkg.device || 'Custom')}</span>
        <span class="custom-pkg-url" title="${escapeHtml(pkg.url || '')}">
          ${pkg.url ? `<a href="${escapeHtml(pkg.url)}" target="_blank" style="color: var(--primary);">${escapeHtml(fileName)}</a>` : '-'}
        </span>
        <button class="btn-pkg-delete" title="Delete package" onclick="handleDeleteFromJfrog(${pkg._index})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
  });

  return html;
}

/**
 * Generic fallback table for unknown platforms.
 */
function renderGenericPackageTable(pkgs) {
  return renderPackageTable(pkgs);
}

// Copy package JFrog URL to clipboard (called from Release Summary)
function copyPkgUrl(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    btn.classList.add('copied');
    const origSvg = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = origSvg;
    }, 1500);
  }).catch(() => {
    showToast('error', 'Failed to copy URL');
  });
}
