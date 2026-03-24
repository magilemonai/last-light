// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Water, Horizon, Environment (T1: horizon line)
// ═══════════════════════════════════════════════════════════════

import { CFG } from '../config.js';
import { noise2d } from '../utils.js';
import { lighthouse } from '../entities/lighthouse.js';

export function renderWater(ctx, W, H, time) {
    // Deep gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, CFG.colors.deepSky);
    grad.addColorStop(0.12, '#091428');
    grad.addColorStop(0.18, CFG.colors.horizon);
    grad.addColorStop(1, CFG.colors.darkWater);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // T1: Horizon line — visible edge between sky and sea
    const horizonY = H * 0.17;
    ctx.save();
    // Horizon glow band
    const hGrad = ctx.createLinearGradient(0, horizonY - 8, 0, horizonY + 12);
    hGrad.addColorStop(0, 'rgba(25,40,65,0)');
    hGrad.addColorStop(0.4, 'rgba(30,50,80,0.25)');
    hGrad.addColorStop(0.5, 'rgba(40,60,90,0.35)');
    hGrad.addColorStop(0.6, 'rgba(25,45,70,0.2)');
    hGrad.addColorStop(1, 'rgba(15,30,55,0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, horizonY - 8, W, 20);
    // Crisp horizon line
    ctx.strokeStyle = 'rgba(40,60,90,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(W, horizonY);
    ctx.stroke();
    ctx.restore();

    // Animated noise on water surface (below horizon only)
    ctx.globalAlpha = 0.04;
    const scale = 0.008;
    const t = time * 0.15;
    for (let x = 0; x < W; x += 20) {
        for (let y = horizonY; y < H; y += 20) {
            const n = noise2d(x * scale + t, y * scale + t * 0.5);
            const brightness = (n + 1) * 0.5;
            ctx.fillStyle = `rgba(100,140,180,${brightness})`;
            ctx.fillRect(x, y, 20, 20);
        }
    }
    ctx.globalAlpha = 1;

    // Faint stars (above horizon only)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        const sx = ((i * 137.5) % W);
        const sy = ((i * 97.3) % (horizonY - 10));
        const twinkle = 0.2 + Math.sin(time * (1 + i * 0.1) + i) * 0.15;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.5 + (i % 3) * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// T1: Harbor/dock indicator
export function renderHarbor(ctx, W, H, time, harborGlow) {
    const lx = lighthouse.x;
    const ly = lighthouse.y;

    // Dock structure
    ctx.save();
    ctx.fillStyle = 'rgba(40,35,28,0.5)';
    // Simple dock planks
    ctx.fillRect(lx - 35, ly + 15, 70, 4);
    ctx.fillRect(lx - 30, ly + 20, 60, 3);
    // Dock posts
    ctx.fillStyle = 'rgba(50,42,32,0.4)';
    ctx.fillRect(lx - 30, ly + 10, 3, 15);
    ctx.fillRect(lx + 27, ly + 10, 3, 15);
    ctx.restore();

    // Harbor glow (warm light at base)
    const glow = Math.min(1, harborGlow) * (0.8 + Math.sin(time * 0.5) * 0.2);
    const grad = ctx.createRadialGradient(lx, ly + 20, 5, lx, ly + 20, 120);
    grad.addColorStop(0, `rgba(255,204,68,${glow * 0.12})`);
    grad.addColorStop(0.5, `rgba(255,180,50,${glow * 0.05})`);
    grad.addColorStop(1, 'rgba(255,204,68,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(lx - 130, ly - 80, 260, 200);

    // Small harbor lanterns on dock posts
    const lanternFlicker = 0.4 + Math.sin(time * 2.5) * 0.1;
    ctx.fillStyle = `rgba(255,180,60,${lanternFlicker})`;
    ctx.beginPath();
    ctx.arc(lx - 29, ly + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx + 28, ly + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    // Lantern glow
    ctx.fillStyle = `rgba(255,180,60,${lanternFlicker * 0.1})`;
    ctx.beginPath();
    ctx.arc(lx - 29, ly + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx + 28, ly + 10, 10, 0, Math.PI * 2);
    ctx.fill();
}

export function renderVignette(ctx, W, H) {
    const grad = ctx.createRadialGradient(W/2, H/2, H * 0.3, W/2, H/2, H * 0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

// T3: Enhanced wreckage rendering with varied debris shapes
export function renderWreckage(ctx, wreckage) {
    for (const w of wreckage) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.rot || 0);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = CFG.colors.wreckage;

        if (w.type === 0) {
            // Plank — long thin rectangle
            ctx.fillRect(-w.size, -1, w.size * 2, 2.5);
        } else if (w.type === 1) {
            // Beam — thicker, shorter
            ctx.fillRect(-w.size * 0.6, -2, w.size * 1.2, 4);
            // Cross brace
            ctx.fillRect(-1, -w.size * 0.4, 2, w.size * 0.8);
        } else {
            // Fragment — irregular polygon
            ctx.beginPath();
            ctx.moveTo(-w.size * 0.3, -w.size * 0.4);
            ctx.lineTo(w.size * 0.5, -w.size * 0.2);
            ctx.lineTo(w.size * 0.3, w.size * 0.4);
            ctx.lineTo(-w.size * 0.4, w.size * 0.3);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}
