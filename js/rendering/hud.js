// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — HUD (T1: fuel bar, night progress, ship count)
// ═══════════════════════════════════════════════════════════════

import { CFG } from '../config.js';
import { beam } from '../entities/lighthouse.js';
import { input } from '../input.js';
import { campaign } from '../state.js';
import { ships } from '../entities/ships.js';

export function renderHUD(ctx, W, H, time, nightNum, nightTimer, nightStats, fogHornCooldown, fogHornActive, spyglassCooldown, spyglassActive) {
    const cfg = CFG.nights[nightNum];
    if (!cfg) return;
    const nightDuration = cfg.duration || CFG.night.duration;

    // ── Fuel Bar (bottom center) ──
    const fr = beam.fuelRatio;
    const barW = Math.min(180, W * 0.15);
    const barH = 4;
    const barX = (W - barW) / 2;
    const barY = H - 18;

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
    ctx.font = `${Math.min(9, W * 0.012)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OIL', W / 2, barY - 6);
    ctx.restore();

    // ── Night Progress (top center, very subtle) ──
    const progress = Math.min(1, nightTimer / nightDuration);
    const progBarW = Math.min(120, W * 0.1);
    const progBarX = (W - progBarW) / 2;
    const progBarY = 10;

    ctx.fillStyle = 'rgba(255,248,224,0.04)';
    ctx.fillRect(progBarX, progBarY, progBarW, 2);
    ctx.fillStyle = `rgba(255,248,224,${0.12 + (progress > 0.8 ? Math.sin(time * 4) * 0.08 : 0)})`;
    ctx.fillRect(progBarX, progBarY, progBarW * progress, 2);

    // Night label
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#fff8e0';
    ctx.font = `${Math.min(9, W * 0.012)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Night ${nightNum + 1}`, W / 2, progBarY + 5);
    ctx.restore();

    // ── Ship Count (top right, minimal) ──
    const activeShips = ships.filter(s => s.type !== 'ghostShip' && !s.sinking).length;
    if (activeShips > 0 || nightStats.saved > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff8e0';
        ctx.font = `${Math.min(10, W * 0.014)}px Georgia, serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        // Ships at sea
        if (activeShips > 0) {
            ctx.fillText(`${activeShips} at sea`, W - 14, 10);
        }
        // Ships saved
        ctx.fillStyle = '#ffcc44';
        ctx.fillText(`${nightStats.saved} safe`, W - 14, 22);
        ctx.restore();
    }

    // ── Ability Cooldowns (bottom-left) ──
    let abilityY = H - 20;
    ctx.textAlign = 'left';
    ctx.font = `${Math.min(11, W * 0.015)}px Georgia, serif`;
    if (campaign.upgrades.includes('fogHorn')) {
        const ready = fogHornCooldown <= 0;
        ctx.fillStyle = ready ? 'rgba(255,248,224,0.4)' : 'rgba(255,248,224,0.15)';
        ctx.fillText(`[F] Horn ${ready ? '\u2022' : Math.ceil(fogHornCooldown) + 's'}`, 10, abilityY);
        abilityY -= 16;
    }
    if (campaign.upgrades.includes('spyglass')) {
        const ready = spyglassCooldown <= 0;
        ctx.fillStyle = ready ? 'rgba(255,248,224,0.4)' : 'rgba(255,248,224,0.15)';
        ctx.fillText(`[G] Glass ${ready ? '\u2022' : Math.ceil(spyglassCooldown) + 's'}`, 10, abilityY);
    }
    ctx.textAlign = 'center';

    // ── Overdrive indicator ──
    if (beam.overdriveActive) {
        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(time * 10) * 0.05;
        ctx.fillStyle = '#ffcc44';
        ctx.font = `bold ${Math.min(10, W * 0.013)}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText('FOCUS', W / 2, barY - 16);
        ctx.restore();
    }
}

// T1: Pause overlay
export function renderPause(ctx, W, H, time) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${Math.min(36, W * 0.05)}px Georgia, serif`;
    ctx.fillText('PAUSED', W / 2, H * 0.42);

    const promptAlpha = 0.4 + Math.sin(time * 2) * 0.2;
    ctx.fillStyle = `rgba(255,248,224,${promptAlpha})`;
    ctx.font = `${Math.min(14, W * 0.02)}px Georgia, serif`;
    ctx.fillText('Press Escape to resume', W / 2, H * 0.52);

    // Controls reminder
    ctx.fillStyle = 'rgba(180,170,150,0.3)';
    ctx.font = `${Math.min(12, W * 0.016)}px Georgia, serif`;
    const controls = [
        'Mouse — aim beam',
        'Space — focus beam (uses fuel)',
    ];
    controls.forEach((line, i) => {
        ctx.fillText(line, W / 2, H * 0.62 + i * 18);
    });
}

// Custom cursor
export function renderCursor(ctx, time) {
    const fr = beam.fuelRatio;
    ctx.strokeStyle = `rgba(255,248,224,${0.3 + fr * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(input.mx, input.my, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(input.mx, input.my - 3);
    ctx.lineTo(input.mx, input.my + 3);
    ctx.moveTo(input.mx - 3, input.my);
    ctx.lineTo(input.mx + 3, input.my);
    ctx.stroke();
}
