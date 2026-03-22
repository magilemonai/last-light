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
