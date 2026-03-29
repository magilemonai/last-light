// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — HUD (T1: fuel bar, night progress, ship count)
// ═══════════════════════════════════════════════════════════════

import { CFG } from '../config.js';
import { beam } from '../entities/lighthouse.js';
import { input } from '../input.js';
import { campaign } from '../state.js';
import { ships } from '../entities/ships.js';
import { getSettings } from '../systems/settings.js';
import { fontSize, hitSize, uiScale } from '../scaling.js';

export function renderHUD(ctx, W, H, time, nightNum, nightTimer, nightStats, fogHornCooldown, fogHornActive, spyglassCooldown, spyglassActive) {
    const cfg = CFG.nights[nightNum];
    if (!cfg) return;
    const nightDuration = cfg.duration || CFG.night.duration;

    // ── Fuel Bar (bottom center) ──
    const fr = beam.fuelRatio;
    const sc = uiScale();
    const barW = Math.min(180, W * 0.15) * sc;
    const barH = 4 * sc;
    const barX = (W - barW) / 2;
    const barY = H - 18 * sc;

    // Background
    ctx.fillStyle = 'rgba(255,248,224,0.06)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Fuel level
    const fuelColor = fr > 0.5 ? `rgba(255,204,68,${0.4 + fr * 0.3})`
                    : fr > 0.25 ? `rgba(255,170,50,${0.5})`
                    : `rgba(255,100,50,${0.4 + Math.sin(time * 8) * 0.2})`;
    ctx.fillStyle = fuelColor;
    ctx.fillRect(barX, barY, barW * fr, barH);

    // "OIL" label
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff8e0';
    ctx.font = `${fontSize(9, 0.012, 'tiny')}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OIL', W / 2, barY - 6 * sc);
    ctx.restore();

    // ── Night Progress (top center, very subtle) ──
    const progress = Math.min(1, nightTimer / nightDuration);
    const progBarW = Math.min(120, W * 0.1) * sc;
    const progBarX = (W - progBarW) / 2;
    const progBarY = 10 * sc;

    ctx.fillStyle = 'rgba(255,248,224,0.04)';
    ctx.fillRect(progBarX, progBarY, progBarW, 2 * sc);
    ctx.fillStyle = `rgba(255,248,224,${0.12 + (progress > 0.8 ? Math.sin(time * 4) * 0.08 : 0)})`;
    ctx.fillRect(progBarX, progBarY, progBarW * progress, 2 * sc);

    // Night label
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#fff8e0';
    ctx.font = `${fontSize(9, 0.012, 'tiny')}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Night ${nightNum + 1}`, W / 2, progBarY + 5 * sc);
    ctx.restore();

    // ── Ship Count (top right, minimal) ──
    const activeShips = ships.filter(s => s.type !== 'ghostShip' && !s.sinking).length;
    if (activeShips > 0 || nightStats.saved > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff8e0';
        ctx.font = `${fontSize(10, 0.014, 'tiny')}px Georgia, serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        // Ships at sea
        if (activeShips > 0) {
            ctx.fillText(`${activeShips} at sea`, W - 14 * sc, 10 * sc);
        }
        // Ships saved
        ctx.fillStyle = '#ffcc44';
        ctx.fillText(`${nightStats.saved} safe`, W - 14 * sc, 24 * sc);
        ctx.restore();
    }

    // ── Ability Cooldowns (bottom-left) ──
    let abilityY = H - 20 * sc;
    ctx.textAlign = 'left';
    ctx.font = `${fontSize(11, 0.015, 'small')}px Georgia, serif`;
    if (campaign.upgrades.includes('fogHorn')) {
        const ready = fogHornCooldown <= 0;
        ctx.fillStyle = ready ? 'rgba(255,248,224,0.4)' : 'rgba(255,248,224,0.15)';
        ctx.fillText(`[F] Horn ${ready ? '\u2022' : Math.ceil(fogHornCooldown) + 's'}`, 10 * sc, abilityY);
        abilityY -= 18 * sc;
    }
    if (campaign.upgrades.includes('spyglass')) {
        const ready = spyglassCooldown <= 0;
        ctx.fillStyle = ready ? 'rgba(255,248,224,0.4)' : 'rgba(255,248,224,0.15)';
        ctx.fillText(`[G] Glass ${ready ? '\u2022' : Math.ceil(spyglassCooldown) + 's'}`, 10 * sc, abilityY);
    }
    ctx.textAlign = 'center';

    // ── Overdrive indicator ──
    if (beam.overdriveActive) {
        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(time * 10) * 0.05;
        ctx.fillStyle = '#ffcc44';
        ctx.font = `bold ${fontSize(10, 0.013, 'tiny')}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText('FOCUS', W / 2, barY - 16 * sc);
        ctx.restore();
    }
}

// T1: Pause overlay with T2: accessibility settings
// pauseMenuState tracks which setting is hovered
export let pauseMenuAction = null; // set by click handler in game.js

export function renderPause(ctx, W, H, time) {
    const s = getSettings();
    const sc = uiScale();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${fontSize(36, 0.05, 'title')}px Georgia, serif`;
    ctx.fillText('PAUSED', W / 2, H * 0.30);

    const promptAlpha = 0.4 + Math.sin(time * 2) * 0.2;
    ctx.fillStyle = `rgba(255,248,224,${promptAlpha})`;
    ctx.font = `${fontSize(14, 0.02, 'body')}px Georgia, serif`;
    ctx.fillText(input.touched ? 'Tap outside to resume' : 'Press Escape to resume', W / 2, H * 0.38);

    // Controls reminder
    ctx.fillStyle = 'rgba(180,170,150,0.3)';
    ctx.font = `${fontSize(12, 0.016, 'small')}px Georgia, serif`;
    ctx.fillText(input.touched ? 'Drag \u2014 aim beam    Two fingers \u2014 focus' : 'Mouse \u2014 aim beam    Space \u2014 focus beam', W / 2, H * 0.45);

    // ── T2: Accessibility Settings ──
    const settingsX = W / 2;
    const settingsY = H * 0.55;
    const lineH = 36 * sc;
    const small = fontSize(13, 0.018, 'small');
    ctx.font = `${small}px Georgia, serif`;

    // Master Volume
    const volY = settingsY;
    const volBarW = Math.min(160, W * 0.35);
    const volBarX = settingsX - volBarW / 2;
    const volBarH = 10 * sc;
    ctx.fillStyle = 'rgba(180,170,150,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('Volume', settingsX, volY - 14 * sc);
    // Bar background
    ctx.fillStyle = 'rgba(255,248,224,0.1)';
    ctx.fillRect(volBarX, volY - volBarH / 2, volBarW, volBarH);
    // Bar fill
    ctx.fillStyle = 'rgba(255,204,68,0.5)';
    ctx.fillRect(volBarX, volY - volBarH / 2, volBarW * s.masterVolume, volBarH);
    // Clickable region stored for game.js — enlarged for mobile
    const volHitH = Math.max(16, 32 * sc);
    renderPause._volBar = { x: volBarX, y: volY - volHitH / 2, w: volBarW, h: volHitH };

    // Music Volume
    const musY = settingsY + lineH;
    ctx.fillStyle = 'rgba(180,170,150,0.4)';
    ctx.fillText('Music', settingsX, musY - 14 * sc);
    ctx.fillStyle = 'rgba(255,248,224,0.1)';
    ctx.fillRect(volBarX, musY - volBarH / 2, volBarW, volBarH);
    ctx.fillStyle = 'rgba(200,180,255,0.4)';
    ctx.fillRect(volBarX, musY - volBarH / 2, volBarW * s.musicVolume, volBarH);
    renderPause._musBar = { x: volBarX, y: musY - volHitH / 2, w: volBarW, h: volHitH };

    // Screen Shake toggle
    const shakeY = settingsY + lineH * 2;
    const toggleHitR = hitSize(10);
    const shakeHover = Math.abs(input.my - shakeY) < toggleHitR && Math.abs(input.mx - settingsX) < Math.max(80, W * 0.2);
    ctx.textAlign = 'center';
    ctx.fillStyle = shakeHover ? '#ffcc44' : 'rgba(180,170,150,0.4)';
    ctx.fillText(`Screen Shake: ${s.screenShake ? 'ON' : 'OFF'}`, settingsX, shakeY);
    renderPause._shakeY = shakeY;

    // High Contrast toggle
    const contrastY = settingsY + lineH * 3;
    const contrastHover = Math.abs(input.my - contrastY) < toggleHitR && Math.abs(input.mx - settingsX) < Math.max(80, W * 0.2);
    ctx.fillStyle = contrastHover ? '#ffcc44' : 'rgba(180,170,150,0.4)';
    ctx.fillText(`High Contrast: ${s.highContrast ? 'ON' : 'OFF'}`, settingsX, contrastY);
    renderPause._contrastY = contrastY;

    ctx.textAlign = 'center';
}

// Check if a click in the pause menu hits a setting control
export function handlePauseClick(mx, my, settings, onSettingChanged) {
    // Volume bar
    const vb = renderPause._volBar;
    if (vb && my >= vb.y && my <= vb.y + vb.h && mx >= vb.x && mx <= vb.x + vb.w) {
        const val = Math.max(0, Math.min(1, (mx - vb.x) / vb.w));
        onSettingChanged('masterVolume', Math.round(val * 20) / 20);
        return true;
    }
    // Music bar
    const mb = renderPause._musBar;
    if (mb && my >= mb.y && my <= mb.y + mb.h && mx >= mb.x && mx <= mb.x + mb.w) {
        const val = Math.max(0, Math.min(1, (mx - mb.x) / mb.w));
        onSettingChanged('musicVolume', Math.round(val * 20) / 20);
        return true;
    }
    // Shake toggle
    const toggleHit = hitSize(10);
    if (renderPause._shakeY && Math.abs(my - renderPause._shakeY) < toggleHit) {
        onSettingChanged('screenShake', !settings.screenShake);
        return true;
    }
    // Contrast toggle
    if (renderPause._contrastY && Math.abs(my - renderPause._contrastY) < toggleHit) {
        onSettingChanged('highContrast', !settings.highContrast);
        return true;
    }
    return false;
}

// Custom cursor
export function renderCursor(ctx, time) {
    const fr = beam.fuelRatio;
    const sc = uiScale();
    const r = 8 * sc;
    const cross = 3 * sc;
    ctx.strokeStyle = `rgba(255,248,224,${0.3 + fr * 0.3})`;
    ctx.lineWidth = 1 * sc;
    ctx.beginPath();
    ctx.arc(input.mx, input.my, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(input.mx, input.my - cross);
    ctx.lineTo(input.mx, input.my + cross);
    ctx.moveTo(input.mx - cross, input.my);
    ctx.lineTo(input.mx + cross, input.my);
    ctx.stroke();
}
