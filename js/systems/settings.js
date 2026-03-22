// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Settings / Accessibility
// ═══════════════════════════════════════════════════════════════

// Persistent settings with localStorage
const DEFAULTS = {
    masterVolume: 0.8,
    musicVolume: 0.5,
    screenShake: true,
    highContrast: false,
};

let settings = { ...DEFAULTS };

export function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem('lastLight_settings'));
        if (saved) Object.assign(settings, saved);
    } catch(e) {}
    return settings;
}

export function saveSettings() {
    try {
        localStorage.setItem('lastLight_settings', JSON.stringify(settings));
    } catch(e) {}
}

export function getSetting(key) { return settings[key]; }

export function setSetting(key, value) {
    settings[key] = value;
    saveSettings();
}

export function getSettings() { return settings; }
