// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Main Game Loop
// ═══════════════════════════════════════════════════════════════

import { CFG } from './config.js';
import { input } from './input.js';
import { GameState, campaign, nightStats, resetNightStats, resetCampaign,
         WHISPER_FRAGMENTS, saveCampaign, loadCampaign, clearSave } from './state.js';
import { lighthouse, beam, renderLighthouse, lighthouseState, updateLighthouseDamage } from './entities/lighthouse.js';
import { ships, clearShips, spawnShip, updateShips, renderShips, getActiveShipCount } from './entities/ships.js';
import { creatures, clearCreatures, spawnCreature, updateCreatures, renderCreatures } from './entities/creatures.js';
import { ease, noise2d, spawnParticle, updateParticles, renderParticles, clearParticles } from './utils.js';
import { playSound, startAmbient, setAmbientGain, updateAmbientForEvent } from './systems/audio.js';
import { renderWater, renderHarbor, renderVignette, renderWreckage } from './rendering/water.js';
import { renderHUD, renderPause, renderCursor } from './rendering/hud.js';
import {
    renderTitle, renderNightIntro, renderDawn,
    renderUpgrade, renderFinaleDark, renderFinaleChoice, renderFinaleEnd, renderKeepersRecord,
    upgradeChoices, upgradeSelected, setUpgradeChoices, setUpgradeSelected,
    getUpgradeChoices, finaleChoiceHover,
} from './rendering/screens.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// roundRect polyfill
if (!ctx.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        r = Math.min(r, w/2, h/2);
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
    };
}

let W, H;
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    input.updateDimensions(W, H);
}
window.addEventListener('resize', resize);
resize();

// ── Game State ──
let state = GameState.TITLE;
let stateTimer = 0;
let transitionFrom = 0, transitionTo = 0, transitionDuration = 0;
let time = 0;
let nightNum = 0;
let nightTimer = 0;
let activeEvent = null;
let finaleTriggered = false;
let harborGlow = { value: 0.1 };
let wreckage = [];
let pausedFromState = GameState.PLAYING;

// Whisper state
let activeWhispers = [];
let whisperNextIndex = 0;

// Ability state
let fogHornCooldown = 0;
let fogHornActive = 0;
let spyglassCooldown = 0;
let spyglassActive = 0;
const FOG_HORN_COOLDOWN = 45;
const FOG_HORN_DURATION = 2;
const SPYGLASS_COOLDOWN = 20;
const SPYGLASS_DURATION = 2;

// Ambient events
let lightningTimer = 15 + Math.random() * 30;
let lightningFlash = 0;

// Spawn manager
let spawnTimer = 0;
let spawnQueue = [];

// T1: Pause debounce
let pauseDebounce = 0;

// ── Init ──
input.init(canvas);
lighthouse.x = W / 2;
lighthouse.y = H * 0.82;

function applyUpgrades() {
    let lensCount = campaign.upgrades.filter(u => u === 'lensPolish').length;
    let oilCount = campaign.upgrades.filter(u => u === 'oilReserve').length;
    let shutterCount = campaign.upgrades.filter(u => u === 'stormShutters').length;
    CFG.beam.coneAngle = 0.38 * (1 + lensCount * 0.1);
    CFG.beam.fuelMax = 100 * (1 + oilCount * 0.15);
    CFG.creatures.shadeSpeed = 25 * Math.pow(0.7, shutterCount);
}

function changeState(to, duration = 0.8) {
    transitionFrom = state;
    transitionTo = to;
    transitionDuration = duration;
    stateTimer = 0;
    state = GameState.TRANSITION;
}

function onStateEnter(s) {
    stateTimer = 0;
    if (s === GameState.NIGHT_INTRO) {
        startNight();
    }
}

function buildSpawnQueue(nightCfg) {
    const q = [];
    for (let i = 0; i < (nightCfg.skiffs || 0); i++) q.push({ type: 'skiff', entity: 'ship' });
    for (let i = 0; i < (nightCfg.merchants || 0); i++) q.push({ type: 'merchant', entity: 'ship' });
    for (let i = 0; i < (nightCfg.passengers || 0); i++) q.push({ type: 'passenger', entity: 'ship' });
    for (let i = 0; i < (nightCfg.ghostShips || 0); i++) q.push({ type: 'ghostShip', entity: 'ship' });
    for (let i = 0; i < (nightCfg.lurkers || 0); i++) q.push({ type: 'lurker', entity: 'creature' });
    for (let i = 0; i < (nightCfg.flinches || 0); i++) q.push({ type: 'flinch', entity: 'creature' });
    for (let i = 0; i < (nightCfg.mimics || 0); i++) q.push({ type: 'mimic', entity: 'creature' });
    for (let i = 0; i < (nightCfg.abyssals || 0); i++) q.push({ type: 'abyssal', entity: 'creature' });
    for (let i = 0; i < (nightCfg.shades || 0); i++) q.push({ type: 'shade', entity: 'creature' });
    for (let i = q.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q[i], q[j]] = [q[j], q[i]];
    }
    return q;
}

function startNight() {
    const cfg = CFG.nights[nightNum];
    clearShips();
    clearCreatures();
    clearParticles();
    wreckage = [];
    beam.reset();
    harborGlow.value = 0.1;
    nightTimer = 0;
    lighthouseState.damage = 0;
    lighthouseState.damageTimer = 0;
    activeEvent = cfg.event || null;
    activeWhispers = [];
    finaleTriggered = false;
    resetNightStats();
    spawnQueue = buildSpawnQueue(cfg);
    spawnTimer = 3;
    startAmbient();
    updateAmbientForEvent(activeEvent);
}

function endNight() {
    campaign.nightResults[nightNum] = {
        saved: nightStats.saved,
        lost: nightStats.lost,
        passengersLost: nightStats.passengersLost,
    };
    campaign.totalSaved += nightStats.saved;
    campaign.totalLost += nightStats.lost;
    nightNum++;
    playSound('dawn');
    changeState(GameState.DAWN, 1.5);

    if (nightNum >= CFG.nights.length) {
        clearSave();
    } else {
        saveCampaign(nightNum);
    }
}

// ── Whisper System ──
function updateWhispers(dt) {
    if (nightNum < 7) return;

    if (whisperNextIndex < WHISPER_FRAGMENTS.length && Math.random() < 0.008) {
        const checkDist = beam.getLength(activeEvent) * (0.3 + Math.random() * 0.5);
        const checkX = lighthouse.lightX + Math.cos(beam.angle) * checkDist;
        const checkY = lighthouse.lightY + Math.sin(beam.angle) * checkDist;

        let nearEntity = false;
        for (const s of ships) {
            if (Math.sqrt((s.x - checkX) ** 2 + (s.y - checkY) ** 2) < 80) { nearEntity = true; break; }
        }
        for (const c of creatures) {
            if (Math.sqrt((c.x - checkX) ** 2 + (c.y - checkY) ** 2) < 80) { nearEntity = true; break; }
        }

        if (!nearEntity && activeWhispers.length < 3) {
            activeWhispers.push({
                x: checkX + (Math.random() - 0.5) * 40,
                y: checkY + (Math.random() - 0.5) * 20,
                text: WHISPER_FRAGMENTS[whisperNextIndex],
                life: 5.0,
                maxLife: 5.0,
                collected: false,
                index: whisperNextIndex,
            });
            whisperNextIndex++;
        }
    }

    for (let i = activeWhispers.length - 1; i >= 0; i--) {
        const w = activeWhispers[i];
        w.life -= dt;
        w.y -= 8 * dt;

        if (!w.collected && beam.isPointIlluminated(w.x, w.y, activeEvent, fogHornActive, spyglassActive) > 0.15) {
            w.collected = true;
            if (!campaign.whispersCollected.includes(w.text)) {
                campaign.whispersCollected.push(w.text);
            }
        }

        if (w.life <= 0) {
            activeWhispers.splice(i, 1);
        }
    }
}

function renderWhispers() {
    for (const w of activeWhispers) {
        const ill = beam.isPointIlluminated(w.x, w.y, activeEvent, fogHornActive, spyglassActive);
        const lifeAlpha = w.life > 3 ? (w.maxLife - w.life) / 2 : w.life > 1 ? 1 : w.life;
        const alpha = Math.max(0.02, ill * 0.6) * lifeAlpha;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = w.collected ? '#9988bb' : '#665588';
        ctx.font = `italic ${Math.min(14, W * 0.02)}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(w.text, w.x, w.y);
        ctx.restore();
    }
}

// ── Click Handler ──
input.onClick(() => {
    if (state === GameState.TITLE) {
        const hasSave = renderTitle._hoverContinue !== undefined;

        if (renderTitle._hoverContinue) {
            // Continue from save
            const savedNight = loadCampaign();
            if (savedNight !== null) {
                nightNum = savedNight;
                applyUpgrades();
                changeState(GameState.NIGHT_INTRO, 1.0);
                return;
            }
        }

        if (renderTitle._hoverNew || !renderTitle._hoverContinue) {
            // New game
            nightNum = 0;
            resetCampaign();
            CFG.beam.coneAngle = 0.38;
            CFG.beam.fuelMax = 100;
            CFG.creatures.shadeSpeed = 25;
            clearSave();
            changeState(GameState.NIGHT_INTRO, 1.0);
        }
    } else if (state === GameState.DAWN) {
        if (stateTimer > 2.0) {
            if (nightNum < CFG.nights.length) {
                setUpgradeChoices(getUpgradeChoices(nightNum));
                changeState(GameState.UPGRADE, 0.8);
            } else {
                changeState(GameState.KEEPERS_RECORD, 2.0);
            }
        }
    } else if (state === GameState.UPGRADE) {
        if (upgradeSelected >= 0 && stateTimer > 0.5) {
            const chosen = upgradeChoices[upgradeSelected];
            campaign.upgrades.push(chosen);
            applyUpgrades();
            changeState(GameState.NIGHT_INTRO, 1.0);
        } else {
            const optionH = 60;
            const startY = H * 0.35;
            for (let i = 0; i < upgradeChoices.length; i++) {
                const y = startY + i * (optionH + 15);
                if (input.my >= y && input.my <= y + optionH &&
                    input.mx >= W * 0.2 && input.mx <= W * 0.8) {
                    setUpgradeSelected(i);
                }
            }
        }
    } else if (state === GameState.FINALE_CHOICE) {
        if (finaleChoiceHover === 0) {
            campaign.finalChoice = 'relight';
            state = GameState.FINALE_END;
            stateTimer = 0;
        } else if (finaleChoiceHover === 1) {
            campaign.finalChoice = 'leave';
            state = GameState.FINALE_END;
            stateTimer = 0;
        }
    } else if (state === GameState.KEEPERS_RECORD) {
        if (stateTimer > 3.0) {
            changeState(GameState.TITLE, 2.0);
        }
    }
});

// ── Ambient Events ──
function updateAmbient(dt) {
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
        lightningFlash = 0.15;
        lightningTimer = 20 + Math.random() * 40;
    }
    if (lightningFlash > 0) lightningFlash -= dt;

    if (Math.random() < 0.005) {
        const px = Math.random() * W;
        const py = H * 0.4 + Math.random() * H * 0.5;
        for (let i = 0; i < 3; i++) {
            spawnParticle(px + (Math.random() - 0.5) * 20, py + (Math.random() - 0.5) * 10, {
                speed: 3, color: '#44aaaa', life: 1 + Math.random(), size: 1, gravity: 0,
            });
        }
    }
}

// ── Gameplay Update ──
function updateGameplay(dt) {
    nightTimer += dt;
    beam.update(dt, time, activeEvent, fogHornActive, spyglassActive);
    updateShips(dt, time, activeEvent, harborGlow, fogHornActive, spyglassActive);
    updateCreatures(dt, time, activeEvent, fogHornActive, spyglassActive);
    updateParticles(dt);
    updateAmbient(dt);
    updateWhispers(dt);
    updateLighthouseDamage(dt);

    // Ability cooldowns
    if (fogHornCooldown > 0) fogHornCooldown -= dt;
    if (spyglassCooldown > 0) spyglassCooldown -= dt;
    if (fogHornActive > 0) fogHornActive -= dt;
    if (spyglassActive > 0) spyglassActive -= dt;

    if (input.fogHornKey && fogHornCooldown <= 0 && campaign.upgrades.includes('fogHorn')) {
        fogHornActive = FOG_HORN_DURATION;
        fogHornCooldown = FOG_HORN_COOLDOWN;
        playSound('foghorn_blast');
    }
    if (input.spyglassKey && spyglassCooldown <= 0 && campaign.upgrades.includes('spyglass')) {
        spyglassActive = SPYGLASS_DURATION;
        spyglassCooldown = SPYGLASS_COOLDOWN;
    }

    // Spawn logic
    const cfg = CFG.nights[nightNum];
    if (spawnQueue.length > 0) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            const next = spawnQueue.shift();
            if (next.entity === 'ship') spawnShip(next.type);
            else spawnCreature(next.type);
            const [minI, maxI] = cfg.spawnInterval;
            spawnTimer = minI + Math.random() * (maxI - minI);
        }
    }

    const nightDuration = cfg.duration || CFG.night.duration;

    // Finale trigger
    if (cfg.finale && nightTimer >= nightDuration * 0.6 && !finaleTriggered) {
        finaleTriggered = true;
        state = GameState.FINALE_DARK;
        stateTimer = 0;
        setAmbientGain(0);
        return;
    }

    // Night end
    const activeShips = ships.filter(s => s.type !== 'ghostShip');
    if (spawnQueue.length === 0 && activeShips.length === 0 && nightTimer > 10) {
        endNight();
    }
    if (nightTimer >= nightDuration) {
        endNight();
    }
}

// ── Gameplay Render ──
function renderGameplay() {
    renderWater(ctx, W, H, time);

    // Environmental overlays
    if (activeEvent === 'fog') {
        // Fog: layered particle fog
        const fogGrad = ctx.createRadialGradient(W * 0.3, H * 0.3, 50, W * 0.3, H * 0.3, H * 0.5);
        fogGrad.addColorStop(0, 'rgba(140,150,160,0.12)');
        fogGrad.addColorStop(1, 'rgba(140,150,160,0)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, W, H);
        // Second fog bank
        const fogGrad2 = ctx.createRadialGradient(W * 0.7, H * 0.4, 30, W * 0.7, H * 0.4, H * 0.4);
        fogGrad2.addColorStop(0, 'rgba(130,140,150,0.08)');
        fogGrad2.addColorStop(1, 'rgba(130,140,150,0)');
        ctx.fillStyle = fogGrad2;
        ctx.fillRect(0, 0, W, H);
    }
    if (activeEvent === 'redTide') {
        ctx.fillStyle = 'rgba(60,120,80,0.04)';
        ctx.fillRect(0, H * 0.35, W, H * 0.65);
        if (Math.random() < 0.06) {
            spawnParticle(Math.random() * W, H * 0.4 + Math.random() * H * 0.5, {
                speed: 2, color: '#55bbaa', life: 1.5, size: 1.2, gravity: 0,
            });
        }
    }
    if (activeEvent === 'newMoon') {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 0, W, H);
    }

    if (lightningFlash > 0) {
        ctx.fillStyle = `rgba(150,160,180,${lightningFlash})`;
        ctx.fillRect(0, 0, W, H);
    }

    lighthouse.x = W / 2;
    lighthouse.y = H * 0.82;

    renderHarbor(ctx, W, H, time, harborGlow.value);
    renderWreckage(ctx, wreckage);
    renderCreatures(ctx, time, activeEvent, fogHornActive, spyglassActive);
    renderShips(ctx, time, activeEvent, fogHornActive, spyglassActive);

    // Beam (with damage flicker)
    if (lighthouseState.damage > 0) {
        if (Math.random() >= 0.3) {
            beam.render(ctx, time, activeEvent);
        }
    } else {
        beam.render(ctx, time, activeEvent);
    }

    // T2: Entities rendered on top of beam for readability
    // (Already handled by render order: creatures+ships before beam, but
    // we re-render lanterns/eyes on top)

    renderLighthouse(ctx, time);
    renderParticles(ctx);
    renderWhispers();
    renderVignette(ctx, W, H);

    // Night timer urgency glow
    const nightDuration = CFG.nights[nightNum] ? CFG.nights[nightNum].duration || CFG.night.duration : CFG.night.duration;
    if (nightTimer > 0) {
        const remaining = Math.max(0, nightDuration - nightTimer);
        if (remaining < 20) {
            const urgency = 1 - remaining / 20;
            ctx.fillStyle = `rgba(255,200,100,${urgency * 0.05})`;
            ctx.fillRect(0, 0, W, H);
        }
    }

    // Lighthouse damage indicator
    if (lighthouseState.damage > 0) {
        ctx.fillStyle = `rgba(80,30,100,${lighthouseState.damage * 0.1 * (0.5 + Math.random() * 0.5)})`;
        ctx.fillRect(0, 0, W, H);
    }

    // Fog horn flash
    if (fogHornActive > 0) {
        const pulse = fogHornActive / FOG_HORN_DURATION;
        const grad = ctx.createRadialGradient(lighthouse.lightX, lighthouse.lightY, 10, lighthouse.lightX, lighthouse.lightY, Math.max(W, H) * 0.7);
        grad.addColorStop(0, `rgba(255,248,224,${pulse * 0.08})`);
        grad.addColorStop(1, 'rgba(255,248,224,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    // Spyglass indicator
    if (spyglassActive > 0) {
        ctx.strokeStyle = `rgba(255,204,68,${0.2 * (spyglassActive / SPYGLASS_DURATION)})`;
        ctx.lineWidth = 1;
        const sLen = beam.getLength(activeEvent) * 1.5;
        const sCone = beam.getConeAngle() * 0.3;
        ctx.beginPath();
        ctx.moveTo(lighthouse.lightX, lighthouse.lightY);
        ctx.arc(lighthouse.lightX, lighthouse.lightY, sLen, beam.angle - sCone, beam.angle + sCone);
        ctx.closePath();
        ctx.stroke();
    }

    // In-game tutorial (Night 1 only)
    if (nightNum === 0 && nightTimer < 12) {
        const hintAlpha = nightTimer < 2 ? nightTimer / 2 : nightTimer > 9 ? (12 - nightTimer) / 3 : 1;
        ctx.globalAlpha = hintAlpha * 0.5;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcc44';
        ctx.font = `${Math.min(12, W * 0.016)}px Georgia, serif`;
        if (nightTimer < 6) {
            ctx.fillText('Sweep the beam across the water to find ships', W / 2, H * 0.06);
        } else {
            ctx.fillText('Hold the light on a ship to guide it to the harbor below', W / 2, H * 0.06);
        }
        ctx.globalAlpha = 1;
    }

    // HUD
    renderHUD(ctx, W, H, time, nightNum, nightTimer, nightStats, fogHornCooldown, fogHornActive, spyglassCooldown, spyglassActive);
}

// ── Render State ──
function renderState(s) {
    switch (s) {
        case GameState.TITLE: renderTitle(ctx, W, H, time); break;
        case GameState.PLAYING: renderGameplay(); break;
        case GameState.DAWN: renderDawn(ctx, W, H, time, stateTimer, nightNum); break;
        case GameState.NIGHT_INTRO: {
            const done = renderNightIntro(ctx, W, H, time, stateTimer, nightNum);
            if (done) {
                state = GameState.PLAYING;
                onStateEnter(GameState.PLAYING);
            }
            break;
        }
        case GameState.UPGRADE: renderUpgrade(ctx, W, H, time, stateTimer); break;
        case GameState.KEEPERS_RECORD: renderKeepersRecord(ctx, W, H, time, stateTimer); break;
        case GameState.FINALE_DARK: {
            const done = renderFinaleDark(ctx, W, H, stateTimer);
            if (done) {
                state = GameState.FINALE_CHOICE;
                stateTimer = 0;
            }
            break;
        }
        case GameState.FINALE_CHOICE: renderFinaleChoice(ctx, W, H, time, stateTimer); break;
        case GameState.FINALE_END: {
            const result = renderFinaleEnd(ctx, W, H, time, stateTimer, campaign.finalChoice);
            if (result && campaign.finalChoice === 'relight') {
                beam.fuel = CFG.beam.fuelMax * 0.5;
                state = GameState.PLAYING;
                setAmbientGain(0.04);
            } else if (result && campaign.finalChoice === 'leave') {
                nightNum = CFG.nights.length;
                endNight();
            }
            break;
        }
        case GameState.PAUSED: break; // handled separately
    }
}

// ── Game Loop ──
const TICK = 1 / 60;
let acc = 0;
let prevTime = 0;

function loop(ts) {
    requestAnimationFrame(loop);

    const dt = Math.min((ts - prevTime) / 1000, 0.1);
    prevTime = ts;
    time += dt;
    stateTimer += dt;

    // T1: Pause handling
    if (pauseDebounce > 0) pauseDebounce -= dt;
    if (input.pauseKey && pauseDebounce <= 0) {
        pauseDebounce = 0.3;
        if (state === GameState.PLAYING) {
            pausedFromState = state;
            state = GameState.PAUSED;
            playSound('pause');
        } else if (state === GameState.PAUSED) {
            state = pausedFromState;
            playSound('pause');
        }
    }

    // Update
    if (state === GameState.PLAYING) {
        acc += dt;
        while (acc >= TICK) {
            updateGameplay(TICK);
            acc -= TICK;
        }
    }

    // Render
    ctx.clearRect(0, 0, W, H);

    if (state === GameState.PAUSED) {
        // Render gameplay underneath pause overlay
        renderGameplay();
        renderPause(ctx, W, H, time);
    } else if (state === GameState.TRANSITION) {
        const progress = Math.min(1, stateTimer / transitionDuration);
        if (progress < 0.5) {
            renderState(transitionFrom);
            ctx.fillStyle = `rgba(0,0,0,${ease.inQuad(progress * 2)})`;
            ctx.fillRect(0, 0, W, H);
        } else {
            const savedTimer = stateTimer;
            stateTimer = 0;
            renderState(transitionTo);
            stateTimer = savedTimer;
            ctx.fillStyle = `rgba(0,0,0,${1 - ease.outCubic((progress - 0.5) * 2)})`;
            ctx.fillRect(0, 0, W, H);
        }
        if (progress >= 1) {
            state = transitionTo;
            onStateEnter(transitionTo);
        }
    } else {
        renderState(state);
    }

    // Custom cursor
    if (state === GameState.PLAYING || state === GameState.PAUSED) {
        renderCursor(ctx, time);
    }
}

requestAnimationFrame(loop);
