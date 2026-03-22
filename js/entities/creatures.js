// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Creatures (T2: ghost ship attraction visuals)
// ═══════════════════════════════════════════════════════════════

import { CFG } from '../config.js';
import { lighthouse, beam, setLighthouseDamage } from './lighthouse.js';
import { ships } from './ships.js';
import { nightStats } from '../state.js';
import { spawnParticle, triggerShake } from '../utils.js';
import { playSound } from '../systems/audio.js';

export let creatures = [];

export function clearCreatures() { creatures = []; }

export function spawnCreature(type) {
    const W = window.innerWidth || 1920;
    const H = window.innerHeight || 1080;
    const angle = -Math.PI * (0.1 + Math.random() * 0.8);
    const dist = Math.max(W, H) * 0.6 + Math.random() * 200;
    const x = lighthouse.x + Math.cos(angle) * dist;
    const y = lighthouse.y + Math.sin(angle) * dist;

    const sizes = { lurker: 12 + Math.random() * 6, flinch: 8 + Math.random() * 4,
                    mimic: 10, abyssal: CFG.creatures.abyssalSize, shade: 10 + Math.random() * 4 };
    const speeds = { lurker: CFG.creatures.lurkerSpeed, flinch: CFG.creatures.flinchSpeed,
                     mimic: CFG.creatures.mimicSpeed, abyssal: CFG.creatures.abyssalSpeed,
                     shade: CFG.creatures.shadeSpeed };

    creatures.push({
        type,
        x, y,
        vx: 0, vy: 0,
        speed: speeds[type] || 30,
        fleeing: false,
        fleeTimer: 0,
        alive: true,
        phase: Math.random() * Math.PI * 2,
        size: sizes[type] || 12,
        targetShip: null,
        frozen: false,
        frozenTimer: 0,
        bolting: false,
        boltTimer: 0,
        boltAngle: 0,
        disguised: type === 'mimic',
        mimicRevealed: false,
        abyssalSoundTimer: type === 'abyssal' ? 3 : 0,
        reachedLighthouse: false,
        luredByGhost: false,
        // T1: Mimic behavioral tell — stutter timer
        mimicStutterTimer: type === 'mimic' ? 1.5 + Math.random() * 2 : 0,
    });
}

export function updateCreatures(dt, time, activeEvent, fogHornActive, spyglassActive) {
    const W = window.innerWidth || 1920;
    const H = window.innerHeight || 1080;
    const aggressionMult = activeEvent === 'redTide' ? 1.5 : 1.0;

    for (const c of creatures) {
        c.phase += dt * 3;
        const ill = beam.isPointIlluminated(c.x, c.y, activeEvent, fogHornActive, spyglassActive);
        const distToLighthouse = Math.sqrt((c.x - lighthouse.x) ** 2 + (c.y - lighthouse.y) ** 2);

        // ── SHADE ──
        if (c.type === 'shade') {
            if (ill > 0.2 && !c.fleeing) {
                c.fleeing = true;
                c.fleeTimer = 1.5;
                const awayAngle = Math.atan2(c.y - lighthouse.y, c.x - lighthouse.x);
                c.vx = Math.cos(awayAngle) * 60;
                c.vy = Math.sin(awayAngle) * 60;
                playSound('repel');
                for (let i = 0; i < 4; i++) {
                    spawnParticle(c.x, c.y, {
                        speed: 20 + Math.random() * 30,
                        angle: awayAngle + (Math.random() - 0.5) * 1,
                        color: '#6633aa', life: 0.4, size: 2,
                    });
                }
            }
            if (c.fleeing) {
                c.fleeTimer -= dt;
                c.x += c.vx * dt; c.y += c.vy * dt;
                c.vx *= 0.96; c.vy *= 0.96;
                if (c.fleeTimer <= 0) c.fleeing = false;
            } else {
                const dx = lighthouse.x - c.x;
                const dy = lighthouse.y - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    c.x += (dx / dist) * c.speed * aggressionMult * dt;
                    c.y += (dy / dist) * c.speed * aggressionMult * dt;
                }
                c.x += Math.sin(c.phase * 1.3) * 12 * dt;
                c.y += Math.cos(c.phase * 0.9) * 8 * dt;
            }
            if (distToLighthouse < 40 && !c.reachedLighthouse) {
                c.reachedLighthouse = true;
                setLighthouseDamage(0.4, CFG.creatures.shadeDamageTime);
                c.alive = false;
                playSound('shadeHit');
                triggerShake(12); // T4: heavy screen shake
                for (let i = 0; i < 10; i++) {
                    spawnParticle(lighthouse.x, lighthouse.y, {
                        speed: 15 + Math.random() * 30,
                        color: '#442266', life: 0.6, size: 3,
                    });
                }
            }
            if (c.x < -200 || c.x > W + 200 || c.y < -200 || c.y > H + 200) c.alive = false;
            continue;
        }

        // ── ABYSSAL ──
        if (c.type === 'abyssal') {
            c.abyssalSoundTimer -= dt;
            if (c.abyssalSoundTimer <= 0) {
                c.abyssalSoundTimer = 5 + Math.random() * 4;
                playSound('abyssal');
            }
            if (beam.overdriveActive && ill > 0.3 && !c.fleeing) {
                c.fleeing = true;
                c.fleeTimer = 3.0;
                const awayAngle = Math.atan2(c.y - lighthouse.y, c.x - lighthouse.x);
                c.vx = Math.cos(awayAngle) * CFG.creatures.abyssalPushback;
                c.vy = Math.sin(awayAngle) * CFG.creatures.abyssalPushback;
                playSound('overdrive');
                nightStats.creaturesRepelled++;
                for (let i = 0; i < 8; i++) {
                    spawnParticle(c.x, c.y, {
                        speed: 40 + Math.random() * 50,
                        angle: awayAngle + (Math.random() - 0.5) * 0.8,
                        color: '#aa66dd', life: 0.5, size: 3,
                    });
                }
            }
            if (c.fleeing) {
                c.fleeTimer -= dt;
                c.x += c.vx * dt; c.y += c.vy * dt;
                c.vx *= 0.97; c.vy *= 0.97;
                if (c.fleeTimer <= 0) c.fleeing = false;
            } else {
                let tx = lighthouse.x, ty = lighthouse.y;
                let nearestDist = Infinity;
                for (const s of ships) {
                    if (s.sinking || s.type === 'ghostShip') continue;
                    const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
                    if (d < nearestDist) { nearestDist = d; tx = s.x; ty = s.y; }
                }
                const dx = tx - c.x, dy = ty - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    c.x += (dx / dist) * c.speed * aggressionMult * dt;
                    c.y += (dy / dist) * c.speed * aggressionMult * dt;
                }
                c.x += Math.sin(c.phase * 0.5) * 15 * dt;
                c.y += Math.cos(c.phase * 0.3) * 10 * dt;
            }
            for (const s of ships) {
                if (s.sinking || s.type === 'ghostShip') continue;
                const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
                if (d < c.size + s.size) {
                    s.health -= dt * 1.0;
                    s.angle += (Math.random() - 0.5) * 3 * dt;
                }
            }
            if (c.x < -300 || c.x > W + 300 || c.y < -300 || c.y > H + 300) c.alive = false;
            continue;
        }

        // ── FLINCH ──
        if (c.type === 'flinch') {
            if (c.bolting) {
                c.boltTimer -= dt;
                c.x += Math.cos(c.boltAngle) * CFG.creatures.flinchBoltSpeed * dt;
                c.y += Math.sin(c.boltAngle) * CFG.creatures.flinchBoltSpeed * dt;
                if (c.boltTimer <= 0) c.bolting = false;
            } else if (c.frozen) {
                if (ill < 0.1) {
                    c.frozen = false;
                    c.bolting = true;
                    c.boltTimer = CFG.creatures.flinchBoltDuration;
                    let tx = lighthouse.x, ty = lighthouse.y;
                    for (const s of ships) {
                        if (s.sinking || s.type === 'ghostShip') continue;
                        const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
                        const d2 = Math.sqrt((tx - c.x) ** 2 + (ty - c.y) ** 2);
                        if (d < d2) { tx = s.x; ty = s.y; }
                    }
                    c.boltAngle = Math.atan2(ty - c.y, tx - c.x);
                    playSound('flinch');
                }
                c.frozenTimer -= dt;
                if (c.frozenTimer <= 0) {
                    c.frozen = false;
                    c.bolting = true;
                    c.boltTimer = CFG.creatures.flinchBoltDuration;
                    c.boltAngle = Math.atan2(lighthouse.y - c.y, lighthouse.x - c.x);
                }
            } else {
                if (ill > 0.2) {
                    c.frozen = true;
                    c.frozenTimer = CFG.creatures.flinchFreezeTime;
                    playSound('repel');
                    nightStats.creaturesRepelled++;
                } else {
                    let nearestDist = Infinity;
                    c.targetShip = null;
                    for (const s of ships) {
                        if (s.sinking || s.type === 'ghostShip') continue;
                        const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
                        if (d < nearestDist) { nearestDist = d; c.targetShip = s; }
                    }
                    if (c.targetShip) {
                        const dx = c.targetShip.x - c.x, dy = c.targetShip.y - c.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            c.x += (dx / dist) * c.speed * aggressionMult * dt;
                            c.y += (dy / dist) * c.speed * aggressionMult * dt;
                        }
                        if (nearestDist < c.size + c.targetShip.size) {
                            c.targetShip.health -= dt * 0.4;
                            c.targetShip.angle += (Math.random() - 0.5) * 2 * dt;
                        }
                    }
                    c.x += Math.sin(c.phase * 2) * 20 * dt;
                    c.y += Math.cos(c.phase * 1.5) * 15 * dt;
                }
            }
            if (c.x < -200 || c.x > W + 200 || c.y < -200 || c.y > H + 200) c.alive = false;
            continue;
        }

        // ── MIMIC ──
        if (c.type === 'mimic') {
            if (ill > 0.3 && distToLighthouse < beam.getLength(activeEvent) * CFG.creatures.mimicRevealDist && c.disguised) {
                c.disguised = false;
                c.mimicRevealed = true;
                playSound('repel');
                for (let i = 0; i < 6; i++) {
                    spawnParticle(c.x, c.y, {
                        speed: 25 + Math.random() * 35,
                        color: '#8844aa', life: 0.4, size: 2,
                    });
                }
            }
            if (c.disguised) {
                // T1: Mimic behavioral tell — stutter pause every ~2s
                c.mimicStutterTimer -= dt;
                const stuttering = c.mimicStutterTimer > 0 && c.mimicStutterTimer < 0.3;
                if (c.mimicStutterTimer <= 0) c.mimicStutterTimer = 1.5 + Math.random() * 2;

                const dx = lighthouse.x + (Math.sin(c.phase * 0.2) * 100) - c.x;
                const dy = lighthouse.y - 50 - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0 && !stuttering) {
                    c.x += (dx / dist) * c.speed * 0.7 * dt;
                    c.y += (dy / dist) * c.speed * 0.7 * dt;
                }
                c.x += Math.sin(c.phase) * 5 * dt;
            } else {
                if (ill > 0.2 && !c.fleeing) {
                    c.fleeing = true;
                    c.fleeTimer = CFG.creatures.lurkerFleeDuration;
                    const awayAngle = Math.atan2(c.y - lighthouse.y, c.x - lighthouse.x);
                    c.vx = Math.cos(awayAngle) * CFG.creatures.lurkerFleeSpeed;
                    c.vy = Math.sin(awayAngle) * CFG.creatures.lurkerFleeSpeed;
                    nightStats.creaturesRepelled++;
                }
                if (c.fleeing) {
                    c.fleeTimer -= dt;
                    c.x += c.vx * dt; c.y += c.vy * dt;
                    c.vx *= 0.97; c.vy *= 0.97;
                    if (c.fleeTimer <= 0) c.fleeing = false;
                } else {
                    let nearestDist = Infinity;
                    for (const s of ships) {
                        if (s.sinking || s.type === 'ghostShip') continue;
                        const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
                        if (d < nearestDist) { nearestDist = d; c.targetShip = s; }
                    }
                    if (c.targetShip) {
                        const dx = c.targetShip.x - c.x, dy = c.targetShip.y - c.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            c.x += (dx / dist) * c.speed * aggressionMult * dt;
                            c.y += (dy / dist) * c.speed * aggressionMult * dt;
                        }
                        if (nearestDist < c.size + c.targetShip.size) {
                            c.targetShip.health -= dt * 0.4;
                        }
                    }
                    c.x += Math.sin(c.phase) * 8 * dt;
                    c.y += Math.cos(c.phase * 0.7) * 5 * dt;
                }
            }
            if (c.x < -200 || c.x > W + 200 || c.y < -200 || c.y > H + 200) c.alive = false;
            continue;
        }

        // ── LURKER ──
        if (ill > 0.2 && !c.fleeing) {
            c.fleeing = true;
            c.fleeTimer = CFG.creatures.lurkerFleeDuration;
            const awayAngle = Math.atan2(c.y - lighthouse.y, c.x - lighthouse.x);
            c.vx = Math.cos(awayAngle) * CFG.creatures.lurkerFleeSpeed;
            c.vy = Math.sin(awayAngle) * CFG.creatures.lurkerFleeSpeed;
            playSound('repel');
            nightStats.creaturesRepelled++;
            for (let i = 0; i < 5; i++) {
                spawnParticle(c.x, c.y, {
                    speed: 30 + Math.random() * 40,
                    angle: awayAngle + (Math.random() - 0.5) * 1,
                    color: '#8844aa', life: 0.3, size: 2,
                });
            }
        }

        if (c.fleeing) {
            c.fleeTimer -= dt;
            c.x += c.vx * dt; c.y += c.vy * dt;
            c.vx *= 0.97; c.vy *= 0.97;
            if (c.fleeTimer <= 0) c.fleeing = false;
        } else {
            let targetX = null, targetY = null;
            let nearestDist = Infinity;
            c.luredByGhost = false;

            // T2: Ghost ship lure with tracking
            for (const s of ships) {
                if (s.type === 'ghostShip') {
                    const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
                    if (d < CFG.ships.ghostShipLureRadius && d < nearestDist) {
                        nearestDist = d; targetX = s.x; targetY = s.y;
                        c.luredByGhost = true;
                    }
                }
            }

            if (!targetX) {
                for (const s of ships) {
                    if (s.sinking || s.type === 'ghostShip') continue;
                    const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
                    if (d < nearestDist) { nearestDist = d; targetX = s.x; targetY = s.y; c.targetShip = s; }
                }
            }

            if (targetX !== null) {
                const dx = targetX - c.x, dy = targetY - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    c.x += (dx / dist) * c.speed * aggressionMult * dt;
                    c.y += (dy / dist) * c.speed * aggressionMult * dt;
                }
                if (c.targetShip && !c.luredByGhost && nearestDist < c.size + c.targetShip.size) {
                    c.targetShip.health -= dt * 0.5;
                    c.targetShip.angle += (Math.random() - 0.5) * 2 * dt;
                }
            } else {
                const dx = lighthouse.x - c.x, dy = lighthouse.y - c.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    c.x += (dx / dist) * c.speed * 0.5 * dt;
                    c.y += (dy / dist) * c.speed * 0.5 * dt;
                }
            }
            c.x += Math.sin(c.phase) * 8 * dt;
            c.y += Math.cos(c.phase * 0.7) * 5 * dt;
        }

        if (c.x < -200 || c.x > W + 200 || c.y < -200 || c.y > H + 200) c.alive = false;
    }

    creatures = creatures.filter(c => c.alive);
}

export function renderCreatures(ctx, time, activeEvent, fogHornActive, spyglassActive) {
    // T2: Ghost ship attraction lines — draw before creatures
    for (const s of ships) {
        if (s.type !== 'ghostShip') continue;
        for (const c of creatures) {
            if (!c.luredByGhost || c.fleeing) continue;
            const d = Math.sqrt((c.x - s.x) ** 2 + (c.y - s.y) ** 2);
            if (d > CFG.ships.ghostShipLureRadius) continue;

            const alpha = 0.08 * (1 - d / CFG.ships.ghostShipLureRadius);
            ctx.save();
            ctx.strokeStyle = `rgba(100,150,180,${alpha})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 8]);
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // T2: Ghost ship pulsing aura showing lure radius
        if (s.revealed) {
            const pulse = 0.03 + Math.sin(time * 2) * 0.015;
            ctx.save();
            ctx.strokeStyle = `rgba(100,150,180,${pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(s.x, s.y, CFG.ships.ghostShipLureRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    for (const c of creatures) {
        const ill = beam.isPointIlluminated(c.x, c.y, activeEvent, fogHornActive, spyglassActive);
        const undulate = Math.sin(c.phase) * 3;

        // ── MIMIC disguised — T1: faster bobbing + stutter freeze ──
        if (c.type === 'mimic' && c.disguised) {
            const vis = Math.max(0.08, ill * 0.7 + 0.15);
            // 1.7x bob speed vs real ships (2.0), with stutter freeze
            const stuttering = c.mimicStutterTimer > 0 && c.mimicStutterTimer < 0.3;
            const mimicBob = stuttering ? 0 : Math.sin(c.phase * 1.36) * 2.5;
            ctx.save();
            ctx.translate(c.x, c.y + mimicBob);
            ctx.globalAlpha = vis;
            ctx.fillStyle = `rgba(90,80,60,${vis})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 4, 0, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = `rgba(70,60,45,${vis})`;
            ctx.fillRect(-1, -5, 2, 4);
            const fakeLantern = 0.6 + Math.sin(time * 2.5 + c.phase) * 0.2;
            ctx.fillStyle = `rgba(240,160,40,${fakeLantern * vis})`;
            ctx.beginPath();
            ctx.arc(0, -5, 2, 0, Math.PI * 2);
            ctx.fill();
            // Fake lantern glow (same as ships for consistency)
            ctx.fillStyle = `rgba(255,170,50,${Math.max(0.06, fakeLantern * vis * 0.15)})`;
            ctx.beginPath();
            ctx.arc(0, -5, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
        }

        const vis = Math.max(0.03, ill * 0.7);

        ctx.save();
        ctx.translate(c.x, c.y + undulate);

        // ── ABYSSAL ──
        if (c.type === 'abyssal') {
            ctx.globalAlpha = Math.max(0.06, ill * 0.5);
            ctx.fillStyle = '#0c0515';
            ctx.beginPath();
            const segs = 12;
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const a = t * Math.PI * 2;
                const r = c.size * (0.85 + Math.sin(a * 2 + c.phase * 0.5) * 0.15);
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r * 0.6;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            if (ill > 0.2) {
                ctx.fillStyle = `rgba(100,40,120,${ill * 0.15})`;
                ctx.beginPath();
                ctx.arc(0, 0, c.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
            if (ill > 0.3) {
                ctx.fillStyle = CFG.colors.creatureEye;
                ctx.globalAlpha = ill * 0.6;
                for (let e = 0; e < 4; e++) {
                    const ex = (e - 1.5) * 8;
                    const ey = -5 + Math.sin(c.phase + e) * 2;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
            continue;
        }

        // ── SHADE ──
        if (c.type === 'shade') {
            ctx.globalAlpha = Math.max(0.04, ill * 0.5);
            ctx.fillStyle = '#1a0825';
            ctx.beginPath();
            const segs = 10;
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const a = t * Math.PI * 2;
                const r = c.size * (0.6 + Math.sin(a * 2 + c.phase * 1.5) * 0.4);
                const px = Math.cos(a) * r * 0.7;
                const py = Math.sin(a) * r * 1.3;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            if (ill > 0.25) {
                ctx.fillStyle = `rgba(130,80,160,${ill * 0.4})`;
                ctx.beginPath();
                ctx.arc(-2, -3, 1.5, 0, Math.PI * 2);
                ctx.arc(2, -3, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            continue;
        }

        // ── FLINCH ──
        if (c.type === 'flinch') {
            ctx.globalAlpha = c.frozen ? Math.max(0.15, ill * 0.8) : vis;
            ctx.fillStyle = c.frozen ? '#1a0a22' : CFG.colors.creature;
            ctx.beginPath();
            const segs = 6;
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const a = t * Math.PI * 2;
                const spike = i % 2 === 0 ? 1.3 : 0.7;
                const r = c.size * spike * (c.frozen ? 0.9 : (0.8 + Math.sin(c.phase * 4 + a * 2) * 0.3));
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            if (ill > 0.3) {
                ctx.fillStyle = '#cc4466';
                ctx.globalAlpha = ill * 0.8;
                ctx.beginPath();
                ctx.arc(-2, -1, 1.5, 0, Math.PI * 2);
                ctx.arc(2, -1, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            continue;
        }

        // ── LURKER + revealed MIMIC ──
        ctx.globalAlpha = vis;
        ctx.fillStyle = c.mimicRevealed ? '#160a20' : CFG.colors.creature;
        ctx.beginPath();
        const segments = 8;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const a = t * Math.PI * 2;
            const r = c.size * (0.8 + Math.sin(a * 3 + c.phase) * 0.2);
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        if (ill > 0.3) {
            ctx.fillStyle = c.mimicRevealed ? '#aa3366' : CFG.colors.creatureEye;
            ctx.globalAlpha = ill * 0.8;
            ctx.beginPath();
            ctx.arc(-3, -2, 2, 0, Math.PI * 2);
            ctx.arc(3, -2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
