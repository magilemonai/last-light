// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Screen Renders (title, dawn, upgrade, finale, record)
// ═══════════════════════════════════════════════════════════════

import { CFG, UPGRADES, DIFFICULTY } from '../config.js';
import { input } from '../input.js';
import { campaign, nightStats, getJournalEntry, hasSavedCampaign } from '../state.js';
import { lighthouse, beam, renderLighthouse } from '../entities/lighthouse.js';
import { renderWater, renderVignette } from './water.js';
import { lerp, noise2d } from '../utils.js';
import { fontSize, hitSize, uiScale } from '../scaling.js';

// ── Title Screen (T2: Continue option) ──
export function renderTitle(ctx, W, H, time) {
    renderWater(ctx, W, H, time);

    lighthouse.x = W / 2;
    lighthouse.y = H * 0.72;
    renderLighthouse(ctx, time);

    // Dim beam sweep
    const sweepAngle = -Math.PI / 2 + Math.sin(time * 0.4) * 0.6;
    ctx.save();
    ctx.translate(lighthouse.lightX, lighthouse.lightY);
    const tGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, H * 0.5);
    tGrad.addColorStop(0, 'rgba(255,204,68,0.06)');
    tGrad.addColorStop(1, 'rgba(255,204,68,0)');
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, H * 0.5, sweepAngle - 0.25, sweepAngle + 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Title text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleY = H * 0.28;
    const pulse = 1 + Math.sin(time * 1.5) * 0.02;

    ctx.save();
    ctx.translate(W / 2, titleY);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#ffcc44';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${fontSize(72, 0.08, 'hero')}px Georgia, serif`;
    ctx.fillText('LAST LIGHT', 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff8e0';
    ctx.fillText('LAST LIGHT', 0, 0);
    ctx.restore();

    // Subtitle
    const subtitleFs = fontSize(18, 0.025, 'heading');
    ctx.fillStyle = `rgba(180,170,150,${0.5 + Math.sin(time * 2) * 0.2})`;
    ctx.font = `${subtitleFs}px Georgia, serif`;
    ctx.fillText('A lighthouse keeper\u2019s vigil against the dark', W / 2, titleY + subtitleFs * 2.8);

    // Brief premise
    const premiseFs = fontSize(13, 0.018, 'small');
    ctx.fillStyle = 'rgba(150,145,135,0.35)';
    ctx.font = `italic ${premiseFs}px Georgia, serif`;
    ctx.fillText('Guide ships to harbor. Keep the light burning.', W / 2, titleY + subtitleFs * 2.8 + premiseFs * 2.2);

    // T2: Start / Continue options
    const hasSave = hasSavedCampaign();
    const promptAlpha = 0.3 + Math.sin(time * 3) * 0.3;

    const menuHit = hitSize(14);
    if (hasSave) {
        // Continue option
        const contY = H * 0.56;
        const newY = H * 0.63;
        const hoverCont = Math.abs(input.my - contY) < menuHit && Math.abs(input.mx - W / 2) < W * 0.25;
        const hoverNew = Math.abs(input.my - newY) < menuHit && Math.abs(input.mx - W / 2) < W * 0.25;

        ctx.fillStyle = hoverCont ? `rgba(255,204,68,${promptAlpha + 0.3})` : `rgba(255,248,224,${promptAlpha})`;
        ctx.font = `${fontSize(16, 0.022, 'body')}px Georgia, serif`;
        ctx.fillText('Continue', W / 2, contY);

        ctx.fillStyle = hoverNew ? `rgba(255,204,68,${promptAlpha + 0.3})` : `rgba(180,170,150,${promptAlpha * 0.7})`;
        ctx.font = `${fontSize(14, 0.019, 'body')}px Georgia, serif`;
        ctx.fillText('New Game', W / 2, newY);

        // Store hover state for click handling
        renderTitle._hoverContinue = hoverCont;
        renderTitle._hoverNew = hoverNew;
    } else {
        ctx.fillStyle = `rgba(255,248,224,${promptAlpha})`;
        ctx.font = `${fontSize(16, 0.022, 'body')}px Georgia, serif`;
        ctx.fillText(input.touched ? 'Tap to begin' : 'Click or press Enter to begin', W / 2, H * 0.6);
        renderTitle._hoverContinue = false;
        renderTitle._hoverNew = false;
    }

    // Difficulty selector
    const diffY = H * 0.72;
    const diffs = ['easy', 'normal', 'hard'];
    const diffSpacing = Math.min(80, W * 0.12);
    const diffHit = hitSize(10);
    ctx.font = `${fontSize(11, 0.015, 'small')}px Georgia, serif`;
    renderTitle._diffHovers = {};
    for (let i = 0; i < diffs.length; i++) {
        const dx = W / 2 + (i - 1) * diffSpacing;
        const d = diffs[i];
        const isActive = campaign.difficulty === d;
        const hover = Math.abs(input.my - diffY) < diffHit && Math.abs(input.mx - dx) < diffSpacing * 0.4;
        renderTitle._diffHovers[d] = hover;
        ctx.fillStyle = isActive ? '#ffcc44' : hover ? 'rgba(255,204,68,0.6)' : 'rgba(150,145,135,0.3)';
        ctx.fillText(DIFFICULTY[d].label, dx, diffY);
    }

    renderVignette(ctx, W, H);
}
// Static properties for click detection
renderTitle._hoverContinue = false;
renderTitle._hoverNew = false;
renderTitle._diffHovers = {};

// ── Night Intro ──
export function renderNightIntro(ctx, W, H, time, stateTimer, nightNum) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const cfg = CFG.nights[nightNum];
    const introDuration = nightNum === 0 ? 5.5 : 3.0;
    const alpha = stateTimer < 0.5 ? stateTimer / 0.5 : stateTimer > introDuration - 0.5 ? 1 - (stateTimer - (introDuration - 0.5)) / 0.5 : 1;

    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${fontSize(36, 0.05, 'title')}px Georgia, serif`;
    ctx.fillText(`Night ${nightNum + 1}`, W / 2, H * 0.35);

    ctx.fillStyle = '#aaa8a0';
    ctx.font = `${fontSize(16, 0.022, 'body')}px Georgia, serif`;
    ctx.fillText(cfg.desc || '', W / 2, H * 0.45);

    // Tutorial on Night 1
    if (nightNum === 0) {
        const tutAlpha = stateTimer < 1.5 ? Math.max(0, (stateTimer - 0.8) / 0.7) : alpha;
        ctx.globalAlpha = Math.max(0, tutAlpha) * 0.7;
        const small = fontSize(13, 0.018, 'small');
        ctx.font = `${small}px Georgia, serif`;
        ctx.fillStyle = '#887858';
        const controlY = H * 0.58;
        const lineH = small * 1.8;
        const controls = input.touched ? [
            'Drag to aim the beam',
            'Illuminate ships to guide them to harbor',
            'Two-finger tap to focus the beam (uses fuel)',
        ] : [
            'Move the mouse to aim the beam',
            'Illuminate ships to guide them to harbor',
            'Hold SPACE to focus the beam (uses fuel)',
            'Press ESCAPE to pause',
        ];
        for (let i = 0; i < controls.length; i++) {
            ctx.fillText(controls[i], W / 2, controlY + i * lineH);
        }
    }

    ctx.globalAlpha = 1;
    return stateTimer > introDuration;
}

// ── Dawn Debrief ──
export function renderDawn(ctx, W, H, time, stateTimer, nightNum) {
    const dawnProgress = Math.min(1, stateTimer / 3);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const r = Math.floor(lerp(6, 60, dawnProgress));
    const g = Math.floor(lerp(13, 40, dawnProgress));
    const b = Math.floor(lerp(26, 50, dawnProgress));
    const r2 = Math.floor(lerp(10, 180, dawnProgress));
    const g2 = Math.floor(lerp(24, 120, dawnProgress));
    const b2 = Math.floor(lerp(48, 80, dawnProgress));
    grad.addColorStop(0, `rgb(${r},${g},${b})`);
    grad.addColorStop(0.5, `rgb(${r2},${g2},${b2})`);
    grad.addColorStop(1, `rgb(${Math.floor(r2*0.7)},${Math.floor(g2*0.6)},${Math.floor(b2*0.5)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sun
    if (dawnProgress > 0.3) {
        const sunAlpha = (dawnProgress - 0.3) / 0.7;
        const sunY = H * 0.45 - sunAlpha * H * 0.05;
        ctx.fillStyle = `rgba(255,200,100,${sunAlpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(W / 2, sunY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,220,150,${sunAlpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(W / 2, sunY, 100, 0, Math.PI * 2);
        ctx.fill();
    }

    renderLighthouse(ctx, time);

    // Saved ships
    for (let i = 0; i < nightStats.saved; i++) {
        const sx = lighthouse.x - 60 + i * 25 + Math.sin(i * 1.3) * 10;
        const sy = lighthouse.y + 20 + Math.sin(time + i) * 2;
        ctx.fillStyle = `rgba(80,70,55,${0.6 * dawnProgress})`;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 8, 3, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(sx - 0.5, sy - 8, 1, 8);
    }

    // Wrecks
    for (let i = 0; i < nightStats.lost; i++) {
        const wx = lighthouse.x + (i % 2 === 0 ? -1 : 1) * (80 + i * 20);
        const wy = lighthouse.y + 10 + Math.sin(i * 2) * 5;
        ctx.fillStyle = `rgba(74,56,40,${0.5 * dawnProgress})`;
        ctx.fillRect(wx - 5, wy - 2, 10, 4);
        ctx.fillRect(wx - 1, wy - 7, 2, 8);
    }

    // Stats
    if (stateTimer > 1.5) {
        const textAlpha = Math.min(1, (stateTimer - 1.5) / 1.0);
        ctx.globalAlpha = textAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#3a3530';
        ctx.font = `italic ${fontSize(16, 0.022, 'body')}px Georgia, serif`;
        ctx.fillText(`Night ${nightNum}`, W / 2, H * 0.15);

        const total = nightStats.saved + nightStats.lost;
        let summary;
        if (nightStats.lost === 0) {
            summary = `All ${total} vessels found harbor. A perfect night.`;
        } else if (nightStats.saved === 0) {
            summary = `${total} vessels sought the light. None found harbor.`;
        } else {
            summary = `Of ${total} vessels that sought the light, ${nightStats.saved} found harbor.`;
        }

        ctx.fillStyle = '#2a2520';
        ctx.font = `${fontSize(18, 0.025, 'heading')}px Georgia, serif`;
        ctx.fillText(summary, W / 2, H * 0.22);

        if (nightStats.lost > 0) {
            ctx.fillStyle = '#5a4838';
            ctx.font = `italic ${fontSize(14, 0.02, 'body')}px Georgia, serif`;
            ctx.fillText(`${nightStats.lost} met the rocks.`, W / 2, H * 0.28);
        }

        // Journal entry
        const journalEntry = getJournalEntry(nightNum - 1);
        if (journalEntry) {
            ctx.fillStyle = '#4a4538';
            ctx.font = `italic ${fontSize(13, 0.018, 'small')}px Georgia, serif`;
            const maxWidth = W * 0.7;
            const words = journalEntry.split(' ');
            let line = '';
            let journalY = H * 0.35;
            for (const word of words) {
                const testLine = line + (line ? ' ' : '') + word;
                if (ctx.measureText(testLine).width > maxWidth) {
                    ctx.fillText(line, W / 2, journalY);
                    line = word;
                    journalY += 18;
                } else {
                    line = testLine;
                }
            }
            if (line) ctx.fillText(line, W / 2, journalY);
        }

        ctx.globalAlpha = 1;
    }

    if (stateTimer > 2.0) {
        const pa = 0.3 + Math.sin(time * 3) * 0.2;
        ctx.fillStyle = `rgba(58,53,48,${pa})`;
        ctx.textAlign = 'center';
        ctx.font = `${fontSize(14, 0.02, 'body')}px Georgia, serif`;
        const nextText = nightNum < CFG.nights.length ? (input.touched ? 'Tap to continue' : 'Click to continue') : (input.touched ? 'Tap to return' : 'Click to return');
        ctx.fillText(nextText, W / 2, H * 0.88);
    }

    renderVignette(ctx, W, H);
}

// ── Upgrade Screen ──
export let upgradeChoices = [];
export let upgradeSelected = -1;

export function setUpgradeChoices(choices) { upgradeChoices = choices; upgradeSelected = -1; }
export function setUpgradeSelected(idx) { upgradeSelected = idx; }

export function getUpgradeChoices(night) {
    const all = Object.keys(UPGRADES);
    const owned = campaign.upgrades;

    const available = all.filter(u => {
        const up = UPGRADES[u];
        // Abilities can only be picked once
        if (up.ability && owned.includes(u)) return false;
        // Exclude mutually exclusive upgrades
        if (up.excludes && owned.includes(up.excludes)) return false;
        return true;
    });

    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    // Pick choices: ensure at least one from each available path when possible
    const count = night < 5 ? 2 : 3;
    const result = [];
    const paths = ['keeper', 'watcher', 'neutral'];

    for (const path of paths) {
        if (result.length >= count) break;
        const pathPick = available.find(u => UPGRADES[u].path === path && !result.includes(u));
        if (pathPick) result.push(pathPick);
    }

    // Fill remaining slots
    for (const u of available) {
        if (result.length >= count) break;
        if (!result.includes(u)) result.push(u);
    }

    return result;
}

export function renderUpgrade(ctx, W, H, time, stateTimer) {
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, W, H);

    lighthouse.x = W / 2;
    lighthouse.y = H * 0.82;

    ctx.globalAlpha = 0.15;
    renderLighthouse(ctx, time);
    ctx.globalAlpha = 1;

    const fadeIn = Math.min(1, stateTimer / 1.0);
    ctx.globalAlpha = fadeIn;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#aaa8a0';
    ctx.font = `italic ${fontSize(16, 0.022, 'body')}px Georgia, serif`;
    ctx.fillText('Preparations for the coming night', W / 2, H * 0.15);

    ctx.fillStyle = '#ffcc44';
    ctx.font = `bold ${fontSize(22, 0.03, 'heading')}px Georgia, serif`;
    ctx.fillText('Choose one:', W / 2, H * 0.25);

    const sc = uiScale();
    const optionW = Math.min(W * 0.85, W * 0.6 * sc);
    const optionH = 60 * sc;
    const startX = (W - optionW) / 2;
    const startY = H * 0.35;

    const optionGap = 15 * sc;
    for (let i = 0; i < upgradeChoices.length; i++) {
        const key = upgradeChoices[i];
        const up = UPGRADES[key];
        const y = startY + i * (optionH + optionGap);
        const selected = upgradeSelected === i;
        const hover = input.my >= y && input.my <= y + optionH &&
                      input.mx >= startX && input.mx <= startX + optionW;

        ctx.fillStyle = selected ? 'rgba(255,204,68,0.15)' : hover ? 'rgba(255,248,224,0.06)' : 'rgba(255,248,224,0.03)';
        ctx.strokeStyle = selected ? '#ffcc44' : hover ? 'rgba(255,248,224,0.3)' : 'rgba(255,248,224,0.1)';
        ctx.lineWidth = selected ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(startX, y, optionW, optionH, 4);
        ctx.fill();
        ctx.stroke();

        // T3: Path label badge
        const pathColors = { keeper: '#668844', watcher: '#446688', neutral: '#666655' };
        const pathLabels = { keeper: 'KEEPER', watcher: 'WATCHER', neutral: '' };
        if (up.path && pathLabels[up.path]) {
            ctx.textAlign = 'right';
            ctx.fillStyle = selected ? pathColors[up.path] : `${pathColors[up.path]}88`;
            ctx.font = `bold ${fontSize(9, 0.012, 'tiny')}px Georgia, serif`;
            ctx.fillText(pathLabels[up.path], startX + optionW - 10, y + 14 * sc);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? '#ffcc44' : '#ccc8b8';
        ctx.font = `${fontSize(16, 0.022, 'body')}px Georgia, serif`;
        ctx.fillText(up.prompt, startX + 15, y + optionH * 0.35);

        ctx.fillStyle = selected ? '#ddd8c8' : '#888580';
        ctx.font = `italic ${fontSize(13, 0.018, 'small')}px Georgia, serif`;
        ctx.fillText(up.desc.split('. ').slice(1).join('. '), startX + 15, y + optionH * 0.68);

        ctx.textAlign = 'center';
    }

    if (upgradeSelected >= 0) {
        const pa = 0.4 + Math.sin(time * 3) * 0.2;
        ctx.fillStyle = `rgba(255,204,68,${pa})`;
        ctx.font = `${fontSize(14, 0.02, 'body')}px Georgia, serif`;
        ctx.fillText(input.touched ? 'Tap again to confirm' : 'Click again to confirm', W / 2, H * 0.88);
    }

    if (campaign.upgrades.includes('fogHorn') || campaign.upgrades.includes('spyglass')) {
        ctx.fillStyle = 'rgba(150,145,135,0.5)';
        ctx.font = `${fontSize(12, 0.016, 'small')}px Georgia, serif`;
        let hints = [];
        if (campaign.upgrades.includes('fogHorn')) hints.push('F \u2014 Fog Horn');
        if (campaign.upgrades.includes('spyglass')) hints.push('G \u2014 Spyglass');
        ctx.fillText(hints.join('    '), W / 2, H * 0.94);
    }

    // Log Book wreck map — show on upgrade screen for strategic planning
    if (campaign.upgrades.includes('logBook') && campaign.wreckPositions.length > 0) {
        const mapW = Math.min(100, W * 0.15);
        const mapH = mapW * 0.7;
        const mapX = W - mapW - 15;
        const mapY = H - mapH - 15;
        ctx.fillStyle = 'rgba(10,14,20,0.5)';
        ctx.fillRect(mapX - 2, mapY - 2, mapW + 4, mapH + 4);
        ctx.strokeStyle = 'rgba(255,100,60,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX - 2, mapY - 2, mapW + 4, mapH + 4);
        // Wreck markers
        for (const wp of campaign.wreckPositions) {
            const wx = mapX + wp.x * mapW;
            const wy = mapY + wp.y * mapH;
            ctx.strokeStyle = 'rgba(255,100,60,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(wx - 3, wy - 3); ctx.lineTo(wx + 3, wy + 3);
            ctx.moveTo(wx + 3, wy - 3); ctx.lineTo(wx - 3, wy + 3);
            ctx.stroke();
        }
        // Lighthouse marker
        ctx.fillStyle = 'rgba(255,204,68,0.5)';
        ctx.beginPath();
        ctx.arc(mapX + 0.5 * mapW, mapY + 0.82 * mapH, 2, 0, Math.PI * 2);
        ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(255,100,60,0.3)';
        ctx.font = `${fontSize(8, 0.01, 'tiny')}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Wrecks', mapX + mapW / 2, mapY - 6);
    }

    ctx.globalAlpha = 1;
    renderVignette(ctx, W, H);
}

// ── Finale Screens ──
export let finaleChoiceHover = -1;

export function renderFinaleDark(ctx, W, H, stateTimer) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    return stateTimer > 4.0;
}

export function renderFinaleChoice(ctx, W, H, time, stateTimer) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.02;
    for (let x = 0; x < W; x += 30) {
        const n = noise2d(x * 0.005 + time * 0.1, time * 0.05);
        ctx.fillStyle = `rgba(100,140,180,${(n + 1) * 0.5})`;
        ctx.fillRect(x, H * 0.7 + n * 20, 30, 4);
    }
    ctx.globalAlpha = 1;

    const fadeIn = Math.min(1, stateTimer / 2.0);
    ctx.globalAlpha = fadeIn;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // T1: Third option gated on whisper collection (12+)
    const hasWhisperTruth = campaign.whispersCollected.length >= 12;

    const choiceHit = hitSize(16);
    const choice1Y = H * 0.38;
    const choice2Y = H * 0.50;
    const choice3Y = H * 0.62;

    const hover1 = Math.abs(input.my - choice1Y) < choiceHit && Math.abs(input.mx - W / 2) < W * 0.4;
    const hover2 = Math.abs(input.my - choice2Y) < choiceHit && Math.abs(input.mx - W / 2) < W * 0.4;
    const hover3 = hasWhisperTruth && Math.abs(input.my - choice3Y) < choiceHit && Math.abs(input.mx - W / 2) < W * 0.4;
    finaleChoiceHover = hover1 ? 0 : hover2 ? 1 : hover3 ? 2 : -1;

    const choiceFs = fontSize(18, 0.025, 'heading');
    ctx.fillStyle = hover1 ? '#ffcc44' : 'rgba(255,248,224,0.6)';
    ctx.font = `italic ${choiceFs}px Georgia, serif`;
    ctx.fillText('Relight the beam. Continue the watch.', W / 2, choice1Y);

    ctx.fillStyle = hover2 ? '#ffcc44' : 'rgba(255,248,224,0.6)';
    ctx.fillText('Leave the lighthouse. Walk down to the shore.', W / 2, choice2Y);

    // Third option — only if whispers collected
    if (hasWhisperTruth) {
        ctx.fillStyle = hover3 ? '#9988bb' : 'rgba(130,110,180,0.6)';
        ctx.font = `italic ${choiceFs}px Georgia, serif`;
        ctx.fillText('Answer the dark. Speak the words back.', W / 2, choice3Y);
        // Subtle whisper hint
        ctx.fillStyle = 'rgba(100,80,140,0.25)';
        ctx.font = `italic ${fontSize(11, 0.015, 'small')}px Georgia, serif`;
        ctx.fillText('You heard enough to understand', W / 2, choice3Y + choiceFs * 1.3);
    }

    ctx.globalAlpha = 1;
}

export function renderFinaleEnd(ctx, W, H, time, stateTimer, finalChoice) {
    const fadeIn = Math.min(1, stateTimer / 2.0);
    const hasKeeperPath = campaign.upgrades.some(u => ['lensPolish','oilReserve','stormShutters','fogHorn'].includes(u));
    const hasWatcherPath = campaign.upgrades.some(u => ['prismFocus','phosphorOil','wardStone','spyglass'].includes(u));
    const lossRatio = campaign.totalLost / Math.max(1, campaign.totalSaved + campaign.totalLost);

    if (finalChoice === 'relight') {
        if (stateTimer < 2.0) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = fadeIn;
            ctx.fillStyle = '#ffcc44';
            ctx.textAlign = 'center';
            ctx.font = `italic ${fontSize(16, 0.022, 'body')}px Georgia, serif`;
            // Path-based relight text
            const relightText = hasWatcherPath && !hasKeeperPath
                ? 'The beam narrows. It burns brighter than before.'
                : hasKeeperPath && !hasWatcherPath
                ? 'The old light returns. Steady. Familiar.'
                : 'The light returns.';
            ctx.fillText(relightText, W / 2, H / 2);
            // Loss-scaled warning
            if (lossRatio > 0.4) {
                ctx.fillStyle = 'rgba(255,100,80,0.4)';
                ctx.font = `italic ${fontSize(12, 0.016, 'small')}px Georgia, serif`;
                ctx.fillText('But the flame is guttering.', W / 2, H / 2 + 25);
            }
            ctx.globalAlpha = 1;
            return false;
        }
        return 'resume';
    } else if (finalChoice === 'embrace') {
        // T1: Third ending — spoke the words back
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // Expanding purple glow from lighthouse
        const expand = Math.min(1, stateTimer / 4.0);
        const glowR = expand * Math.max(W, H) * 0.6;
        const grad = ctx.createRadialGradient(W / 2, H * 0.3, 5, W / 2, H * 0.3, glowR);
        grad.addColorStop(0, `rgba(100,60,140,${0.3 * (1 - expand * 0.5)})`);
        grad.addColorStop(1, 'rgba(100,60,140,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        if (stateTimer > 2.0) {
            const textAlpha = Math.min(1, (stateTimer - 2.0) / 2.0);
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#9988bb';
            ctx.textAlign = 'center';
            ctx.font = `italic ${fontSize(16, 0.022, 'body')}px Georgia, serif`;
            ctx.fillText('You speak into the dark. The dark answers.', W / 2, H * 0.45);
        }
        if (stateTimer > 4.0) {
            const textAlpha = Math.min(1, (stateTimer - 4.0) / 2.0);
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#bbaadd';
            ctx.font = `italic ${fontSize(14, 0.02, 'body')}px Georgia, serif`;
            ctx.fillText('The bargain is remade. The light changes.', W / 2, H * 0.55);
            ctx.fillText('You are the keeper, and the kept.', W / 2, H * 0.60);
        }
        if (stateTimer > 7.0) {
            const textAlpha = Math.min(1, (stateTimer - 7.0) / 1.5);
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#fff8e0';
            ctx.font = `${fontSize(14, 0.02, 'body')}px Georgia, serif`;
            ctx.fillText('The beam burns violet at the edges now.', W / 2, H * 0.72);
        }
        ctx.globalAlpha = 1;

        return stateTimer > 10.0 ? 'end' : false;
    } else {
        // "Leave" ending
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        const lightSize = Math.max(1, 8 - stateTimer * 0.8);
        const lightAlpha = Math.max(0, 0.5 - stateTimer * 0.05);
        ctx.fillStyle = `rgba(255,204,68,${lightAlpha})`;
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.3, lightSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,204,68,${lightAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.3, lightSize * 3, 0, Math.PI * 2);
        ctx.fill();

        if (stateTimer > 3.0) {
            const textAlpha = Math.min(1, (stateTimer - 3.0) / 2.0);
            ctx.globalAlpha = textAlpha;
            ctx.fillStyle = '#aaa8a0';
            ctx.textAlign = 'center';
            ctx.font = `italic ${fontSize(16, 0.022, 'body')}px Georgia, serif`;
            // Path-based leave text
            if (hasWatcherPath && !hasKeeperPath) {
                ctx.fillText('You saw too much. The dark showed you things the light never could.', W / 2, H * 0.6);
                ctx.fillText('You take the spyglass. You do not look back.', W / 2, H * 0.65);
            } else if (hasKeeperPath && !hasWatcherPath) {
                ctx.fillText('The sound of waves on stone. The cold air on your face.', W / 2, H * 0.6);
                ctx.fillText('You leave the oil burning. Someone else will tend it.', W / 2, H * 0.65);
            } else {
                ctx.fillText('The sound of waves on stone. The cold air on your face.', W / 2, H * 0.6);
                ctx.fillText('Behind you, the beam is dark.', W / 2, H * 0.65);
            }
            ctx.globalAlpha = 1;
        }

        return stateTimer > 8.0 ? 'end' : false;
    }
}

// ── Keeper's Record ──
export function renderKeepersRecord(ctx, W, H, time, stateTimer, endlessHighScore) {
    ctx.fillStyle = '#1a1610';
    ctx.fillRect(0, 0, W, H);

    const fadeIn = Math.min(1, stateTimer / 2.0);
    ctx.globalAlpha = fadeIn;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const paperW = Math.min(W * 0.9, 600);
    const paperH = H * 0.8;
    const paperX = (W - paperW) / 2;
    const paperY = H * 0.1;
    ctx.fillStyle = '#2a2418';
    ctx.fillRect(paperX, paperY, paperW, paperH);
    ctx.strokeStyle = '#3a3428';
    ctx.lineWidth = 2;
    ctx.strokeRect(paperX, paperY, paperW, paperH);

    ctx.fillStyle = '#aa9870';
    ctx.font = `bold ${fontSize(24, 0.035, 'heading')}px Georgia, serif`;
    ctx.fillText('THE KEEPER\'S RECORD', W / 2, paperY + 40);

    ctx.fillStyle = '#887858';
    ctx.font = `italic ${fontSize(14, 0.02, 'body')}px Georgia, serif`;
    ctx.fillText('Nights 1 through 15', W / 2, paperY + 65);

    const totalShips = campaign.totalSaved + campaign.totalLost;
    ctx.fillStyle = '#ccb888';
    ctx.font = `${fontSize(16, 0.022, 'body')}px Georgia, serif`;
    if (campaign.totalLost === 0) {
        ctx.fillText(`All ${totalShips} vessels found harbor.`, W / 2, paperY + 110);
    } else {
        ctx.fillText(`Of ${totalShips} vessels that sought the light, ${campaign.totalSaved} found harbor.`, W / 2, paperY + 110);
    }

    // Night map
    const cellSize = Math.min(20, (paperW - 60) / 15);
    const mapX = W / 2 - (15 * cellSize) / 2;
    const mapY = paperY + 150;

    for (let i = 0; i < 15; i++) {
        const result = campaign.nightResults[i];
        let ratio = 1;
        if (result) {
            const total = result.saved + result.lost;
            ratio = total > 0 ? result.saved / total : 1;
        }
        const cr = Math.floor(lerp(80, 255, ratio));
        const cg = Math.floor(lerp(20, 200, ratio));
        const cb = Math.floor(lerp(20, 68, ratio));
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(mapX + i * cellSize, mapY, cellSize - 2, cellSize - 2);

        if ((i + 1) % 5 === 0 || i === 0) {
            ctx.fillStyle = '#665840';
            ctx.font = `${fontSize(10, 0.013, 'tiny')}px Georgia, serif`;
            ctx.fillText(`${i + 1}`, mapX + i * cellSize + cellSize / 2 - 1, mapY + cellSize + 12);
        }
    }

    // Week labels (fixed: correct positioning)
    ctx.fillStyle = '#665840';
    ctx.font = `italic ${fontSize(11, 0.015, 'tiny')}px Georgia, serif`;
    ctx.fillText('The Routine', mapX + 2.5 * cellSize, mapY + cellSize + 28);
    ctx.fillText('The Deterioration', mapX + 7.5 * cellSize, mapY + cellSize + 28);
    ctx.fillText('The Reckoning', mapX + 12.5 * cellSize, mapY + cellSize + 28);

    // Whispers
    const whisperY = mapY + cellSize + 60;
    ctx.fillStyle = '#8878a8';
    ctx.font = `italic ${fontSize(14, 0.02, 'body')}px Georgia, serif`;
    if (campaign.whispersCollected.length >= 12) {
        ctx.fillText('"' + campaign.whispersCollected.join(' ') + '"', W / 2, whisperY);
    } else if (campaign.whispersCollected.length > 0) {
        ctx.fillText('"' + campaign.whispersCollected.join(' ') + '..."', W / 2, whisperY);
        ctx.fillStyle = '#665850';
        ctx.fillText('Something spoke from the water. You did not hear it all.', W / 2, whisperY + 22);
    } else {
        ctx.fillStyle = '#665850';
        ctx.fillText('Something spoke from the water. You did not hear it all.', W / 2, whisperY);
    }

    // Final line
    const finalY = paperY + paperH - 50;
    ctx.fillStyle = '#ccb888';
    ctx.font = `${fontSize(16, 0.022, 'body')}px Georgia, serif`;
    const ratio = campaign.totalSaved / Math.max(1, campaign.totalSaved + campaign.totalLost);
    let finalLine;
    if (campaign.finalChoice === 'embrace') {
        finalLine = 'The bargain was remade. The light burns a different color now.';
    } else if (campaign.finalChoice === 'relight') {
        finalLine = ratio > 0.7 ? 'The light held. The coast remembers.' :
                    ratio > 0.4 ? 'The light held, though the cost was heavy.' :
                    'The light held. But the dark took its share.';
    } else if (campaign.finalChoice === 'leave') {
        finalLine = ratio > 0.7 ? 'They found their way. You found the shore.' :
                    ratio > 0.4 ? 'Some found harbor. You found the shore.' :
                    'The dark claimed its due. You chose the shore.';
    } else {
        finalLine = ratio > 0.7 ? 'The light held. The coast remembers.' :
                    'The night passes. The sea endures.';
    }
    ctx.fillText(finalLine, W / 2, finalY);

    ctx.globalAlpha = 1;

    if (stateTimer > 3.0) {
        const pa = 0.3 + Math.sin(time * 3) * 0.2;

        const btnHit = hitSize(12);
        // T2: Endless high score
        if (endlessHighScore > 0) {
            ctx.fillStyle = 'rgba(150,140,120,0.3)';
            ctx.font = `${fontSize(11, 0.015, 'small')}px Georgia, serif`;
            ctx.fillText(`Endless record: ${endlessHighScore} night${endlessHighScore !== 1 ? 's' : ''}`, W / 2, H * 0.86);
        }

        // T3: "One More Night" endless mode option
        const endlessHover = Math.abs(input.my - H * 0.91) < btnHit && Math.abs(input.mx - W / 2) < W * 0.25;
        ctx.fillStyle = endlessHover ? `rgba(255,204,68,${pa + 0.3})` : `rgba(255,204,68,${pa})`;
        ctx.font = `${fontSize(14, 0.02, 'body')}px Georgia, serif`;
        ctx.fillText('One more night', W / 2, H * 0.91);

        ctx.fillStyle = `rgba(170,152,112,${pa * 0.7})`;
        ctx.font = `${fontSize(12, 0.016, 'small')}px Georgia, serif`;
        ctx.fillText('Return to title', W / 2, H * 0.95);

        // T3: Save Record button
        const saveHover = Math.abs(input.my - (paperY + paperH - 15)) < btnHit
                       && Math.abs(input.mx - (W / 2 + paperW / 2 - 50)) < Math.max(40, W * 0.1);
        ctx.fillStyle = saveHover ? `rgba(255,204,68,${pa + 0.2})` : `rgba(150,140,120,${pa * 0.5})`;
        ctx.font = `${fontSize(11, 0.015, 'small')}px Georgia, serif`;
        ctx.textAlign = 'right';
        ctx.fillText('Save Record', W / 2 + paperW / 2 - 15, paperY + paperH - 15);
        ctx.textAlign = 'center';
    }
}

// T3: Export shareable image of Keeper's Record
export function saveKeepersRecordImage(canvas) {
    try {
        const link = document.createElement('a');
        link.download = 'last-light-keepers-record.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch(e) {}
}
