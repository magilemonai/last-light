// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Utilities (noise, easing, particles)
// ═══════════════════════════════════════════════════════════════

// ── Perlin-ish Noise ──
const perm = new Uint8Array(512);
(function initNoise() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

export function lerp(a, b, t) { return a + t * (b - a); }

function grad(hash, x, y) {
    const h = hash & 3;
    return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
}

export function noise2d(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
                lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
}

// ── Easing ──
export const ease = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2,
    outBack: t => { const c = 1.70158; return 1 + (c+1)*Math.pow(t-1,3) + c*Math.pow(t-1,2); },
    inQuad: t => t * t,
};

// ── Particle System ──
const particles = [];
const MAX_PARTICLES = 400;

export function spawnParticle(x, y, opts = {}) {
    if (particles.length >= MAX_PARTICLES) return;
    const angle = opts.angle ?? Math.random() * Math.PI * 2;
    const speed = opts.speed ?? (20 + Math.random() * 60);
    particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: opts.life ?? (0.3 + Math.random() * 0.5),
        maxLife: opts.life ?? (0.3 + Math.random() * 0.5),
        size: opts.size ?? (1 + Math.random() * 3),
        color: opts.color ?? '#ffcc44',
        gravity: opts.gravity ?? 0,
        friction: opts.friction ?? 0.98,
    });
}

export function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }
}

export function renderParticles(ctx) {
    for (const p of particles) {
        const a = p.life / p.maxLife;
        const s = p.size * a;
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export function clearParticles() {
    particles.length = 0;
}

// ── T4: Screen Shake System ──
const shake = {
    x: 0,
    y: 0,
    intensity: 0,
    decay: 0.92,
};

export function triggerShake(intensity) {
    shake.intensity = Math.max(shake.intensity, intensity);
}

export function updateShake(dt) {
    if (shake.intensity > 0.1) {
        shake.x = (Math.random() - 0.5) * shake.intensity * 2;
        shake.y = (Math.random() - 0.5) * shake.intensity * 2;
        shake.intensity *= shake.decay;
    } else {
        shake.x = 0;
        shake.y = 0;
        shake.intensity = 0;
    }
}

export function applyShake(ctx) {
    if (shake.x !== 0 || shake.y !== 0) {
        ctx.translate(shake.x, shake.y);
    }
}

export function getShakeOffset() {
    return { x: shake.x, y: shake.y };
}

// ── T4: Harbor Arrival Tally ──
const tallyFlashes = [];

export function addTallyFlash(x, y, text) {
    tallyFlashes.push({ x, y, text, life: 2.0, maxLife: 2.0 });
}

export function updateTallyFlashes(dt) {
    for (let i = tallyFlashes.length - 1; i >= 0; i--) {
        tallyFlashes[i].life -= dt;
        tallyFlashes[i].y -= 15 * dt;
        if (tallyFlashes[i].life <= 0) tallyFlashes.splice(i, 1);
    }
}

export function renderTallyFlashes(ctx) {
    for (const f of tallyFlashes) {
        const alpha = f.life > 1.5 ? (f.maxLife - f.life) / 0.5 : f.life > 0.5 ? 1 : f.life / 0.5;
        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#ffcc44';
        ctx.font = `bold ${14}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
    }
}
