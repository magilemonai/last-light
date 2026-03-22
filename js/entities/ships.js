// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Ships (T1: improved visibility, wakes, lanterns)
// ═══════════════════════════════════════════════════════════════

import { CFG } from '../config.js';
import { lighthouse, beam } from './lighthouse.js';
import { nightStats } from '../state.js';
import { spawnParticle, triggerShake, addTallyFlash } from '../utils.js';
import { playSound } from '../systems/audio.js';

export let ships = [];

export function clearShips() { ships = []; }

export function spawnShip(type) {
    const W = window.innerWidth || 1920;
    const H = window.innerHeight || 1080;
    const side = Math.random() < 0.5 ? -1 : 1;
    const edge = Math.random();
    let x, y, targetAngle;

    if (edge < 0.6) {
        x = side > 0 ? W + 20 : -20;
        y = H * (0.22 + Math.random() * 0.35);
        targetAngle = side > 0 ? Math.PI + (Math.random() - 0.5) * 0.6 : (Math.random() - 0.5) * 0.6;
    } else {
        x = W * (0.15 + Math.random() * 0.7);
        y = H * 0.12;
        targetAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    }

    const speeds = { skiff: CFG.ships.skiffSpeed, merchant: CFG.ships.merchantSpeed,
                     passenger: CFG.ships.passengerSpeed, ghostShip: CFG.ships.ghostShipSpeed };
    const sizes = { skiff: 10, merchant: 18, passenger: 20, ghostShip: 16 };

    const ship = {
        type,
        x, y,
        angle: targetAngle,
        speed: speeds[type] || CFG.ships.merchantSpeed,
        guided: false,
        guidedTimer: 0,
        driftTimer: 0,
        progress: 0,
        health: 1.0,
        lanternBright: type === 'ghostShip' ? 0.15 : 1.0,
        hornTimer: type === 'skiff' ? 3 + Math.random() * 4 : 5 + Math.random() * 5,
        sinking: false,
        sinkTimer: 0,
        alive: true,
        saved: false,
        bobPhase: Math.random() * Math.PI * 2,
        size: sizes[type] || 14,
        revealed: type !== 'ghostShip',
        revealProgress: type === 'ghostShip' ? 0 : 1,
        // T1: Wake trail
        wakeTrail: [],
        wakeTimer: 0,
    };

    if (type !== 'skiff') {
        ship.targetX = lighthouse.x + (Math.random() - 0.5) * 80;
        ship.targetY = lighthouse.y + 10;
    }

    ships.push(ship);
}

export function updateShips(dt, time, activeEvent, harborGlowRef, fogHornActive, spyglassActive) {
    const W = window.innerWidth || 1920;
    const H = window.innerHeight || 1080;

    for (const s of ships) {
        // Update wake trail
        s.wakeTimer += dt;
        if (s.wakeTimer > 0.1 && !s.sinking) {
            s.wakeTimer = 0;
            s.wakeTrail.push({ x: s.x, y: s.y, age: 0 });
            if (s.wakeTrail.length > 12) s.wakeTrail.shift();
        }
        for (const w of s.wakeTrail) w.age += dt;

        if (s.sinking) {
            s.sinkTimer += dt;
            s.y += 3 * dt;
            s.lanternBright *= 0.97;
            if (s.sinkTimer > 3) s.alive = false;
            continue;
        }

        const illumination = beam.isPointIlluminated(s.x, s.y, activeEvent, fogHornActive, spyglassActive);
        s.bobPhase += dt * 2;

        // Ghost ship logic
        if (s.type === 'ghostShip') {
            const distToLighthouse = Math.sqrt((s.x - lighthouse.x) ** 2 + (s.y - lighthouse.y) ** 2);
            const revealThreshold = beam.getLength(activeEvent) * CFG.ships.ghostShipRevealDist;
            if (illumination > 0.3 && distToLighthouse < revealThreshold) {
                s.revealProgress = Math.min(1, s.revealProgress + dt * 1.5);
                if (s.revealProgress > 0.5 && !s.revealed) {
                    s.revealed = true;
                    playSound('ghost_reveal');
                }
            }
            s.angle += Math.sin(time * 0.3 + s.bobPhase) * 0.15 * dt;
            s.x += Math.cos(s.angle) * s.speed * dt;
            s.y += Math.sin(s.angle) * s.speed * dt;
            s.lanternBright = 0.05 + Math.sin(time * 4 + s.bobPhase) * 0.05;
            if (s.x < -80 || s.x > W + 80 || s.y > H + 80 || s.y < -80) s.alive = false;
            continue;
        }

        const isHeavy = s.type === 'merchant' || s.type === 'passenger';

        if (illumination > 0.1) {
            s.guided = true;
            s.guidedTimer += dt;
            s.driftTimer = 0;
            s.lanternBright = Math.min(1, s.lanternBright + dt * 2);

            if (isHeavy) {
                s.progress += CFG.ships.merchantGuideRate * dt * illumination * 3;
                const dx = s.targetX - s.x;
                const dy = s.targetY - s.y;
                const targetA = Math.atan2(dy, dx);
                let aDiff = targetA - s.angle;
                while (aDiff > Math.PI) aDiff -= Math.PI * 2;
                while (aDiff < -Math.PI) aDiff += Math.PI * 2;
                s.angle += aDiff * 0.5 * dt;
            } else {
                if (s.guidedTimer > CFG.ships.skiffFlashNeed) {
                    const dx = lighthouse.x - s.x;
                    const dy = lighthouse.y + 20 - s.y;
                    const targetA = Math.atan2(dy, dx);
                    let aDiff = targetA - s.angle;
                    while (aDiff > Math.PI) aDiff -= Math.PI * 2;
                    while (aDiff < -Math.PI) aDiff += Math.PI * 2;
                    s.angle += aDiff * 1.5 * dt;
                }
            }

            if (s.guidedTimer < dt * 2 && s.guidedTimer > 0) {
                playSound('chime');
            }
        } else {
            s.driftTimer += dt;
            if (isHeavy) {
                s.progress += CFG.ships.merchantDriftRate * dt;
                s.progress = Math.max(0, s.progress);
                s.angle += (Math.random() - 0.5) * 0.3 * dt;
            } else {
                if (s.driftTimer > CFG.ships.skiffDriftTime) {
                    s.guidedTimer = 0;
                    s.angle += (Math.random() - 0.5) * 0.4 * dt;
                }
            }
            s.lanternBright = Math.max(0.2, s.lanternBright - dt * 0.5);
        }

        if (activeEvent === 'storm') {
            if (Math.random() < 0.02) {
                s.angle += (Math.random() - 0.5) * 0.8;
            }
        }

        s.x += Math.cos(s.angle) * s.speed * dt;
        s.y += Math.sin(s.angle) * s.speed * dt;

        // Horn/bell timer
        s.hornTimer -= dt;
        if (s.hornTimer <= 0) {
            if (s.type === 'skiff') {
                s.hornTimer = 4 + Math.random() * 3;
                playSound('bell');
            } else if (s.type === 'passenger') {
                s.hornTimer = 5 + Math.random() * 4;
                playSound('whistle');
            } else {
                s.hornTimer = 6 + Math.random() * 4;
                playSound('horn');
            }
        }

        // Harbor arrival
        const distToHarbor = Math.sqrt((s.x - lighthouse.x) ** 2 + (s.y - lighthouse.y) ** 2);
        if (distToHarbor < 50 && s.y > lighthouse.y - 30) {
            s.saved = true;
            s.alive = false;
            nightStats.saved++;
            if (s.type === 'merchant') nightStats.merchantsSaved++;
            if (s.type === 'passenger') nightStats.passengersSaved++;
            harborGlowRef.value += 0.15;
            playSound('arrive');
            // T4: tally flash
            const label = s.type === 'passenger' ? 'Passengers safe' : s.type === 'merchant' ? 'Merchant safe' : 'Safe harbor';
            addTallyFlash(s.x, s.y - 20, label);
            for (let i = 0; i < 8; i++) {
                spawnParticle(s.x, s.y, {
                    speed: 20 + Math.random() * 40,
                    color: '#ffcc44',
                    life: 0.5 + Math.random() * 0.5,
                    gravity: -10,
                });
            }
        }

        // Out of bounds
        if (s.x < -60 || s.x > W + 60 || s.y > H + 60) {
            if (!s.saved) {
                s.alive = false;
                nightStats.lost++;
                if (s.type === 'passenger') nightStats.passengersLost++;
                playSound('sink');
            }
        }

        // Sinking from damage
        if (s.health <= 0 && !s.sinking) {
            s.sinking = true;
            s.speed = 0;
            nightStats.lost++;
            if (s.type === 'passenger') nightStats.passengersLost++;
            playSound('sink');
            triggerShake(s.type === 'passenger' ? 8 : 5); // T4: screen shake
        }
    }

    ships = ships.filter(s => s.alive);
}

// T1: Improved ship rendering — larger lanterns, wake trails, silhouettes against stars
export function renderShips(ctx, time, activeEvent, fogHornActive, spyglassActive) {
    for (const s of ships) {
        const ill = beam.isPointIlluminated(s.x, s.y, activeEvent, fogHornActive, spyglassActive);
        const vis = Math.max(0.08, ill * 0.8 + 0.2 * s.lanternBright);
        const bob = Math.sin(s.bobPhase) * 2;

        // T1: Wake trail — visible even when ship is dark
        if (s.wakeTrail.length > 1 && !s.sinking) {
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.strokeStyle = 'rgba(120,150,180,0.3)';
            ctx.lineWidth = s.type === 'skiff' ? 1 : 2;
            ctx.beginPath();
            ctx.moveTo(s.wakeTrail[0].x, s.wakeTrail[0].y);
            for (let i = 1; i < s.wakeTrail.length; i++) {
                const w = s.wakeTrail[i];
                const alpha = 1 - w.age / 2;
                if (alpha > 0) {
                    ctx.lineTo(w.x, w.y);
                }
            }
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(s.x, s.y + bob);
        ctx.rotate(s.angle + Math.sin(s.bobPhase * 0.7) * 0.05);
        ctx.globalAlpha = s.sinking ? Math.max(0, 1 - s.sinkTimer / 3) : 1;

        if (s.type === 'ghostShip') {
            const ghostAlpha = vis * (s.revealed ? 0.5 : 0.9);
            ctx.fillStyle = `rgba(${s.revealed ? '50,50,60' : '80,70,55'},${ghostAlpha})`;
            ctx.beginPath();
            ctx.moveTo(-s.size, 0);
            ctx.lineTo(-s.size * 0.8, s.size * 0.5);
            ctx.lineTo(s.size * 0.8, s.size * 0.5);
            ctx.lineTo(s.size, 0);
            ctx.lineTo(s.size * 0.7, -s.size * 0.3);
            ctx.lineTo(-s.size * 0.7, -s.size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = `rgba(70,65,55,${ghostAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -s.size * 0.3);
            ctx.lineTo(s.revealed ? 3 : 0, -s.size * (s.revealed ? 0.7 : 1.2));
            ctx.stroke();
            if (s.revealed && ill > 0.3) {
                ctx.fillStyle = `rgba(90,85,75,${vis * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(2, -s.size * 0.65);
                ctx.lineTo(s.size * 0.4, -s.size * 0.4);
                ctx.lineTo(1, -s.size * 0.35);
                ctx.closePath();
                ctx.fill();
            }
        } else if (s.type === 'merchant' || s.type === 'passenger') {
            const hullColor = s.type === 'passenger' ? `rgba(85,65,50,${vis})` : `rgba(80,70,55,${vis})`;
            ctx.fillStyle = hullColor;
            ctx.beginPath();
            ctx.moveTo(-s.size, 0);
            ctx.lineTo(-s.size * 0.8, s.size * 0.5);
            ctx.lineTo(s.size * 0.8, s.size * 0.5);
            ctx.lineTo(s.size, 0);
            ctx.lineTo(s.size * 0.7, -s.size * 0.3);
            ctx.lineTo(-s.size * 0.7, -s.size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = `rgba(100,90,70,${vis})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -s.size * 0.3);
            ctx.lineTo(0, -s.size * 1.2);
            ctx.stroke();
            ctx.fillStyle = `rgba(180,170,150,${vis * 0.6})`;
            ctx.beginPath();
            ctx.moveTo(0, -s.size * 1.1);
            ctx.lineTo(s.size * 0.6, -s.size * 0.5);
            ctx.lineTo(0, -s.size * 0.4);
            ctx.closePath();
            ctx.fill();
            if (s.type === 'passenger' && ill > 0.3) {
                ctx.fillStyle = `rgba(255,200,100,${vis * 0.3})`;
                for (let p = -2; p <= 2; p++) {
                    ctx.beginPath();
                    ctx.arc(p * s.size * 0.2, -s.size * 0.1, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            // Skiff
            ctx.fillStyle = `rgba(90,80,60,${vis})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, s.size, s.size * 0.4, 0, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = `rgba(70,60,45,${vis})`;
            ctx.fillRect(-1, -s.size * 0.5, 2, s.size * 0.4);
        }

        // T1: Larger lantern with wider glow — always visible
        const lanternGlow = s.lanternBright * (0.8 + Math.sin(time * 3 + s.bobPhase) * 0.2);
        const isHeavy = s.type !== 'skiff';
        const lanternY = -s.size * (isHeavy ? 0.3 : 0.5);

        if (s.type === 'ghostShip' && s.revealed) {
            ctx.fillStyle = `rgba(100,150,180,${lanternGlow * vis * 0.5})`;
            ctx.beginPath();
            ctx.arc(0, lanternY, 3 + lanternGlow, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(100,150,180,${lanternGlow * vis * 0.08})`;
            ctx.beginPath();
            ctx.arc(0, lanternY, 15 + lanternGlow * 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // T1: Core lantern — larger
            ctx.fillStyle = `rgba(255,180,50,${Math.max(0.3, lanternGlow * vis)})`;
            ctx.beginPath();
            ctx.arc(0, lanternY, 3 + lanternGlow * 0.5, 0, Math.PI * 2);
            ctx.fill();
            // T1: Inner glow halo — always somewhat visible
            ctx.fillStyle = `rgba(255,170,50,${Math.max(0.08, lanternGlow * vis * 0.2)})`;
            ctx.beginPath();
            ctx.arc(0, lanternY, 12 + lanternGlow * 4, 0, Math.PI * 2);
            ctx.fill();
            // T1: Outer soft glow — visible in darkness
            ctx.fillStyle = `rgba(255,160,40,${Math.max(0.03, lanternGlow * vis * 0.05)})`;
            ctx.beginPath();
            ctx.arc(0, lanternY, 25 + lanternGlow * 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Distress indicator
        if (s.driftTimer > 3 && !s.sinking && (s.type === 'merchant' || s.type === 'passenger')) {
            const blink = Math.sin(time * 8) > 0;
            if (blink) {
                ctx.fillStyle = s.type === 'passenger' ? 'rgba(255,120,60,0.8)' : 'rgba(255,80,80,0.7)';
                ctx.beginPath();
                ctx.arc(s.x, s.y - 25 + bob, 4, 0, Math.PI * 2);
                ctx.fill();
                // T1: Distress glow halo
                ctx.fillStyle = s.type === 'passenger' ? 'rgba(255,120,60,0.15)' : 'rgba(255,80,80,0.12)';
                ctx.beginPath();
                ctx.arc(s.x, s.y - 25 + bob, 12, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

export function getActiveShipCount() {
    return ships.filter(s => s.type !== 'ghostShip' && !s.sinking).length;
}

export function getTotalActiveShips() {
    return ships.filter(s => s.type !== 'ghostShip').length;
}
