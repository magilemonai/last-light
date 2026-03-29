// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Scaling & DPI-Aware Layout System
// ═══════════════════════════════════════════════════════════════

// Device pixel ratio — cached on resize
let dpr = 1;

// Logical (CSS) viewport dimensions
let logicalW = window.innerWidth;
let logicalH = window.innerHeight;

// Whether we're on a touch/mobile device
let isMobile = false;

export function updateScaling(w, h, touch) {
    dpr = window.devicePixelRatio || 1;
    logicalW = w;
    logicalH = h;
    isMobile = touch || w < 600;
}

export function getDPR() { return dpr; }
export function getLogicalSize() { return { w: logicalW, h: logicalH }; }
export function getIsMobile() { return isMobile; }

// ── Font Sizing ──
// Replaces raw `Math.min(base, W * pct)` with a mobile-aware version
// that enforces minimum readable sizes on small screens.

// Category minimums (in logical/CSS pixels)
const MOBILE_MINS = {
    tiny:    10,  // path badges, small labels
    small:   12,  // captions, hints, secondary text
    body:    14,  // primary body text, descriptions
    heading: 18,  // section headings, prompts
    title:   28,  // screen titles (Night X, PAUSED)
    hero:    42,  // main title (LAST LIGHT)
};

const DESKTOP_MINS = {
    tiny:    0,
    small:   0,
    body:    0,
    heading: 0,
    title:   0,
    hero:    0,
};

/**
 * Calculate a responsive font size with mobile floor.
 * @param {number} base - Maximum font size (desktop cap)
 * @param {number} pct - Percentage of viewport width (e.g. 0.022)
 * @param {string} category - One of: tiny, small, body, heading, title, hero
 * @returns {number} Font size in logical pixels
 */
export function fontSize(base, pct, category = 'body') {
    const mins = isMobile ? MOBILE_MINS : DESKTOP_MINS;
    const floor = mins[category] || mins.body;
    return Math.max(floor, Math.min(base, logicalW * pct));
}

// ── Tap Target Sizing ──
// Returns a hit-test tolerance in logical pixels, enforcing 22px minimum on mobile
// (half of 44px tap target — used as ± radius around center)
export function hitSize(desktopHalf) {
    return isMobile ? Math.max(desktopHalf, 22) : desktopHalf;
}

// ── Entity Scaling ──
// Returns a multiplier for entity sizes based on viewport
// Desktop at 1080p = 1.0, scales proportionally
const REFERENCE_HEIGHT = 900;

export function entityScale() {
    const base = logicalH / REFERENCE_HEIGHT;
    // On mobile, bump entities up so they're visible
    return isMobile ? Math.max(base, 1.0) * 1.15 : Math.max(base, 0.7);
}

// ── Bar/UI Element Scaling ──
export function uiScale() {
    return isMobile ? Math.max(1.0, logicalH / REFERENCE_HEIGHT) * 1.3 : 1.0;
}
