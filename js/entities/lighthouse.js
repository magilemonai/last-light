// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Lighthouse & Beam
// ═══════════════════════════════════════════════════════════════

import { CFG } from '../config.js';
import { input } from '../input.js';
import { spawnParticle } from '../utils.js';

export const lighthouse = {
    x: 0, y: 0,
    width: 28,
    height: 90,
    get lightX() { return this.x; },
    get lightY() { return this.y - this.height - 5; },
};

// Shade damage to lighthouse — use object for mutable shared state
export const lighthouseState = {
    damage: 0,
    damageTimer: 0,
};

export function setLighthouseDamage(dmg, timer) {
    lighthouseState.damage = dmg;
    lighthouseState.damageTimer = timer;
}

export function updateLighthouseDamage(dt) {
    if (lighthouseState.damageTimer > 0) {
        lighthouseState.damageTimer -= dt;
        if (lighthouseState.damageTimer <= 0) {
            lighthouseState.damage = 0;
            lighthouseState.damageTimer = 0;
        }
    }
}

// Convenience accessor
export function getLighthouseDamage() { return lighthouseState.damage; }

// ── Beam ──
export const beam = {
    angle: -Math.PI / 2,
    angularVel: 0,
    fuel: CFG.beam.fuelMax,
    overdrive: false,
    overdriveActive: false,
    overdriveFlash: 0,

    update(dt, time, activeEvent, fogHornActive, spyglassActive) {
        const dx = input.mx - lighthouse.lightX;
        const dy = input.my - lighthouse.lightY;
        let targetAngle = Math.atan2(dy, dx);

        if (targetAngle > 0.15) targetAngle = 0.15;
        if (targetAngle < -Math.PI - 0.15) targetAngle = -Math.PI - 0.15;

        let diff = targetAngle - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        this.angularVel += diff * CFG.beam.angularAccel * dt;
        this.angularVel *= CFG.beam.angularDamping;
        this.angularVel = Math.max(-CFG.beam.maxAngularVel, Math.min(CFG.beam.maxAngularVel, this.angularVel));
        this.angle += this.angularVel * dt;

        this.overdriveActive = input.overdrive && this.fuel > 5;
        if (this.overdriveActive) {
            this.fuel -= CFG.beam.overdriveDrain * dt;
            this.overdriveFlash = 0.3;
        } else {
            this.fuel -= CFG.beam.fuelDrain * dt;
        }
        this.fuel = Math.max(0, Math.min(CFG.beam.fuelMax, this.fuel));
        this.fuel += CFG.beam.fuelRegen * dt;
        this.fuel = Math.min(CFG.beam.fuelMax, this.fuel);

        if (this.overdriveFlash > 0) this.overdriveFlash -= dt;

        // Beam particles
        if (Math.random() < 0.3) {
            const dist = 60 + Math.random() * this.getLength(activeEvent) * 0.6;
            const spread = (Math.random() - 0.5) * this.getConeAngle() * 0.5;
            const px = lighthouse.lightX + Math.cos(this.angle + spread) * dist;
            const py = lighthouse.lightY + Math.sin(this.angle + spread) * dist;
            spawnParticle(px, py, {
                speed: 5 + Math.random() * 10,
                angle: Math.random() * Math.PI * 2,
                life: 0.3 + Math.random() * 0.4,
                size: 0.5 + Math.random() * 1.5,
                color: this.fuelRatio > 0.5 ? '#fff8e0' : '#ccaa66',
                gravity: 5,
            });
        }
    },

    get fuelRatio() { return this.fuel / CFG.beam.fuelMax; },

    get effectivePower() {
        return lighthouseState.damage > 0 ? (1 - lighthouseState.damage) : 1;
    },

    getConeAngle() {
        const base = CFG.beam.coneAngle * (0.7 + this.fuelRatio * 0.3) * this.effectivePower;
        return this.overdriveActive ? base * CFG.beam.overdriveMultiplier : base;
    },

    getLength(activeEvent) {
        let base = (window.innerHeight || 800) * CFG.beam.coneLength * (0.6 + this.fuelRatio * 0.4) * this.effectivePower;
        if (activeEvent === 'fog') base *= 0.6;
        if (activeEvent === 'newMoon') base *= 0.7;
        return this.overdriveActive ? base * 1.3 : base;
    },

    isPointIlluminated(px, py, activeEvent, fogHornActive, spyglassActive) {
        const W = window.innerWidth || 1920;
        const H = window.innerHeight || 1080;

        if (fogHornActive > 0) {
            const dx = px - lighthouse.lightX;
            const dy = py - lighthouse.lightY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < Math.max(W, H) * 0.8) return 0.4;
        }

        const dx = px - lighthouse.lightX;
        const dy = py - lighthouse.lightY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let len = this.getLength(activeEvent);

        if (spyglassActive > 0) len *= 1.5;
        if (dist > len) return 0;

        let angleToPoint = Math.atan2(dy, dx);
        let diff = angleToPoint - this.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        let cone = this.getConeAngle();
        if (spyglassActive > 0) cone *= 0.3;
        if (Math.abs(diff) > cone) return 0;

        const angleFactor = 1 - Math.abs(diff) / cone;
        const distFactor = 1 - (dist / len);
        return angleFactor * distFactor * this.fuelRatio;
    },

    // T2: Improved beam render with reduced self-occlusion + beam-end indicator
    render(ctx, time, activeEvent) {
        const H = ctx.canvas.height;
        const len = this.getLength(activeEvent);
        const cone = this.getConeAngle();
        const fr = this.fuelRatio;

        let flickerAlpha = 1;
        if (fr < 0.25) {
            flickerAlpha = 0.5 + Math.random() * 0.5;
        } else if (fr < 0.5) {
            flickerAlpha = 0.8 + Math.sin(time * 12) * 0.1;
        }

        ctx.save();
        ctx.translate(lighthouse.lightX, lighthouse.lightY);

        // T2: Reduced volumetric layers (2 instead of 4) with lower alpha
        for (let layer = 1; layer >= 0; layer--) {
            const layerCone = cone * (1 + layer * 0.1);
            const layerLen = len * (1 - layer * 0.05);
            const alpha = (0.025 + layer * 0.015) * flickerAlpha * (0.5 + fr * 0.5);

            const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, layerLen);
            grad.addColorStop(0, `rgba(255,204,68,${alpha * 2})`);
            grad.addColorStop(0.3, `rgba(255,240,200,${alpha * 0.8})`);
            grad.addColorStop(1, `rgba(255,240,200,0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, layerLen, this.angle - layerCone, this.angle + layerCone);
            ctx.closePath();
            ctx.fill();
        }

        // Bright center line (thinner)
        ctx.strokeStyle = `rgba(255,248,224,${0.1 * flickerAlpha * fr})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(this.angle) * len * 0.9, Math.sin(this.angle) * len * 0.9);
        ctx.stroke();

        // T2: Beam-end indicator — subtle ring where beam meets water
        const endX = Math.cos(this.angle) * len * 0.85;
        const endY = Math.sin(this.angle) * len * 0.85;
        const endRadius = 15 + cone * 80;
        ctx.strokeStyle = `rgba(255,220,120,${0.08 * flickerAlpha * fr})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(endX, endY, endRadius, endRadius * 0.4, this.angle, 0, Math.PI * 2);
        ctx.stroke();

        // Water caustic at beam end (smaller, subtler)
        ctx.fillStyle = `rgba(255,220,120,${0.02 * flickerAlpha * fr})`;
        ctx.beginPath();
        ctx.ellipse(endX, endY, 30 + cone * 80, 12, this.angle, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Overdrive flash
        if (this.overdriveFlash > 0) {
            const W = ctx.canvas.width;
            ctx.fillStyle = `rgba(255,248,224,${this.overdriveFlash * 0.08})`;
            ctx.fillRect(0, 0, W, H);
        }
    },

    reset() {
        this.fuel = CFG.beam.fuelMax;
        this.angle = -Math.PI / 2;
        this.angularVel = 0;
        this.overdriveFlash = 0;
        this.overdriveActive = false;
    },
};

export function renderLighthouse(ctx, time) {
    const lx = lighthouse.x;
    const ly = lighthouse.y;
    const lw = lighthouse.width;
    const lh = lighthouse.height;

    ctx.save();
    ctx.translate(lx, ly);

    // Tower body
    const stoneGrad = ctx.createLinearGradient(-lw/2, -lh, lw/2, 0);
    stoneGrad.addColorStop(0, CFG.colors.stoneLight);
    stoneGrad.addColorStop(0.5, CFG.colors.stone);
    stoneGrad.addColorStop(1, '#2a2520');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.moveTo(-lw / 2, 0);
    ctx.lineTo(-lw / 2.5, -lh);
    ctx.lineTo(lw / 2.5, -lh);
    ctx.lineTo(lw / 2, 0);
    ctx.closePath();
    ctx.fill();

    // Stripes
    ctx.fillStyle = 'rgba(180,40,40,0.4)';
    for (let i = 0; i < 3; i++) {
        const sy = -lh * (0.2 + i * 0.25);
        const sw = lw * (0.85 - i * 0.05);
        ctx.fillRect(-sw / 2, sy, sw, lh * 0.08);
    }

    // Lantern room
    ctx.fillStyle = '#555045';
    ctx.fillRect(-lw / 3, -lh - 12, lw / 1.5, 14);

    // Light source glow
    const glowSize = 12 + Math.sin(time * 2) * 2;
    const fr = beam.fuelRatio;
    ctx.fillStyle = `rgba(255,204,68,${0.6 * fr})`;
    ctx.beginPath();
    ctx.arc(0, -lh - 5, glowSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,248,224,${0.3 * fr})`;
    ctx.beginPath();
    ctx.arc(0, -lh - 5, glowSize * 2, 0, Math.PI * 2);
    ctx.fill();

    // Base rocks
    ctx.fillStyle = '#1a1a18';
    for (let i = -3; i <= 3; i++) {
        const rx = i * 12 + Math.sin(i * 2) * 4;
        const ry = 5 + Math.abs(i) * 3;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 10 + Math.abs(i) * 2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
