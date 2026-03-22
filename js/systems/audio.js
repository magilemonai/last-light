// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Audio System (T2: reverb, layering, spatial cues)
// ═══════════════════════════════════════════════════════════════

let audioCtx = null;
let masterGain = null;
let reverbNode = null;
let reverbGain = null;
let ambientNode = null;
let windNode = null;
let creakNode = null;

function getAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.8;
        masterGain.connect(audioCtx.destination);

        // Build convolution reverb (synthetic impulse response)
        buildReverb();
    }
    return audioCtx;
}

function buildReverb() {
    const ac = audioCtx;
    const length = ac.sampleRate * 1.8;
    const impulse = ac.createBuffer(2, length, ac.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            const t = i / length;
            // Exponential decay with diffusion
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5) * 0.6;
            // Early reflections
            if (i < ac.sampleRate * 0.05) {
                data[i] += (Math.random() * 2 - 1) * 0.3;
            }
        }
    }

    reverbNode = ac.createConvolver();
    reverbNode.buffer = impulse;
    reverbGain = ac.createGain();
    reverbGain.gain.value = 0.25;
    reverbNode.connect(reverbGain);
    reverbGain.connect(masterGain);
}

function createSend(node) {
    // Connect to both dry (master) and wet (reverb) paths
    node.connect(masterGain);
    if (reverbNode) {
        node.connect(reverbNode);
    }
}

export function playSound(type) {
    try {
        const ac = getAudio();
        const now = ac.currentTime;

        switch (type) {
            case 'chime': {
                // Ship guided — layered bell-like tone
                const osc = ac.createOscillator();
                const osc2 = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); osc2.connect(gain);
                createSend(gain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
                osc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1200, now);
                osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
                osc2.start(now); osc2.stop(now + 0.35);
                break;
            }
            case 'arrive': {
                // Ship safe — warm ascending triad
                const osc = ac.createOscillator();
                const osc2 = ac.createOscillator();
                const osc3 = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); osc2.connect(gain); osc3.connect(gain);
                createSend(gain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(554, now + 0.1);
                osc3.type = 'sine';
                osc3.frequency.setValueAtTime(660, now + 0.2);
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.setValueAtTime(0.09, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                osc.start(now); osc.stop(now + 0.8);
                osc2.start(now + 0.1); osc2.stop(now + 0.7);
                osc3.start(now + 0.2); osc3.stop(now + 0.8);
                break;
            }
            case 'repel': {
                // Creature hit — distorted burst
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                const distortion = ac.createWaveShaper();
                const curve = new Float32Array(256);
                for (let i = 0; i < 256; i++) {
                    const x = (i / 128) - 1;
                    curve[i] = (Math.PI + 4) * x / (Math.PI + 4 * Math.abs(x));
                }
                distortion.curve = curve;
                osc.connect(distortion); distortion.connect(gain);
                createSend(gain);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.start(now); osc.stop(now + 0.18);
                break;
            }
            case 'sink': {
                // Ship lost — mournful descending tone with noise
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain);
                createSend(gain);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 1.2);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc.start(now); osc.stop(now + 1.2);
                // Splash noise layer
                const bufSize = ac.sampleRate * 0.4;
                const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < bufSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
                }
                const noise = ac.createBufferSource();
                noise.buffer = buf;
                const nGain = ac.createGain();
                const nFilter = ac.createBiquadFilter();
                nFilter.type = 'bandpass';
                nFilter.frequency.value = 800;
                nFilter.Q.value = 0.8;
                noise.connect(nFilter); nFilter.connect(nGain);
                createSend(nGain);
                nGain.gain.setValueAtTime(0.08, now);
                nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                noise.start(now); noise.stop(now + 0.5);
                break;
            }
            case 'horn': {
                // Merchant horn — deep foghorn with harmonics
                const osc = ac.createOscillator();
                const osc2 = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); osc2.connect(gain);
                createSend(gain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(110, now);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(165, now); // 5th harmonic
                gain.gain.setValueAtTime(0.0, now);
                gain.gain.linearRampToValueAtTime(0.07, now + 0.15);
                gain.gain.setValueAtTime(0.07, now + 0.5);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc.start(now); osc.stop(now + 1.2);
                osc2.start(now); osc2.stop(now + 1.0);
                break;
            }
            case 'bell': {
                // Skiff bell — metallic ring
                const osc = ac.createOscillator();
                const osc2 = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); osc2.connect(gain);
                createSend(gain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(2400, now);
                osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now); osc.stop(now + 0.35);
                osc2.start(now); osc2.stop(now + 0.25);
                break;
            }
            case 'whistle': {
                // Passenger vessel — steam whistle with vibrato
                const osc = ac.createOscillator();
                const vibrato = ac.createOscillator();
                const vibratoGain = ac.createGain();
                const gain = ac.createGain();
                vibrato.connect(vibratoGain);
                vibratoGain.connect(osc.frequency);
                osc.connect(gain);
                createSend(gain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(550, now);
                osc.frequency.linearRampToValueAtTime(700, now + 0.15);
                osc.frequency.linearRampToValueAtTime(550, now + 0.4);
                vibrato.type = 'sine';
                vibrato.frequency.value = 6;
                vibratoGain.gain.value = 8;
                gain.gain.setValueAtTime(0.0, now);
                gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
                gain.gain.setValueAtTime(0.06, now + 0.35);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                osc.start(now); osc.stop(now + 0.8);
                vibrato.start(now); vibrato.stop(now + 0.8);
                break;
            }
            case 'abyssal': {
                // Deep sub-bass rumble with overtones
                const osc = ac.createOscillator();
                const osc2 = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); osc2.connect(gain);
                createSend(gain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(35, now);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(70, now);
                osc2.frequency.linearRampToValueAtTime(55, now + 1.5);
                gain.gain.setValueAtTime(0.0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
                osc.start(now); osc.stop(now + 2.0);
                osc2.start(now); osc2.stop(now + 1.8);
                break;
            }
            case 'shade': {
                // Whisper-like hiss — filtered noise + tone
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain);
                createSend(gain);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(3000, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
                gain.gain.setValueAtTime(0.03, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.start(now); osc.stop(now + 0.6);
                // Breathy noise layer
                const bufSize = ac.sampleRate * 0.5;
                const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < bufSize; i++) {
                    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2) * 0.5;
                }
                const ns = ac.createBufferSource();
                ns.buffer = buf;
                const nf = ac.createBiquadFilter();
                nf.type = 'highpass'; nf.frequency.value = 2000;
                const ng = ac.createGain();
                ns.connect(nf); nf.connect(ng);
                createSend(ng);
                ng.gain.setValueAtTime(0.04, now);
                ng.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                ns.start(now); ns.stop(now + 0.5);
                break;
            }
            case 'flinch': {
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain);
                createSend(gain);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;
            }
            case 'shadeHit': {
                // Shade reaches lighthouse — deep impact + crackling
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain);
                createSend(gain);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
                osc.start(now); osc.stop(now + 1.2);
                // Crackle
                const bufSize = ac.sampleRate * 0.6;
                const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < bufSize; i++) {
                    d[i] = (Math.random() < 0.05 ? (Math.random() * 2 - 1) : 0) * (1 - i / bufSize);
                }
                const ns = ac.createBufferSource();
                ns.buffer = buf;
                const ng = ac.createGain();
                ns.connect(ng);
                createSend(ng);
                ng.gain.setValueAtTime(0.1, now);
                ng.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                ns.start(now); ns.stop(now + 0.6);
                break;
            }
            case 'overdrive': {
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain);
                createSend(gain);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.04, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
                break;
            }
            case 'dawn': {
                // Sunrise — warm swelling chord
                const notes = [330, 440, 554];
                notes.forEach((freq, idx) => {
                    const osc = ac.createOscillator();
                    const gain = ac.createGain();
                    osc.connect(gain);
                    createSend(gain);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.4);
                    gain.gain.setValueAtTime(0.0, now + idx * 0.4);
                    gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.4 + 0.5);
                    gain.gain.linearRampToValueAtTime(0.0, now + idx * 0.4 + 2.5);
                    osc.start(now + idx * 0.4);
                    osc.stop(now + idx * 0.4 + 2.5);
                });
                break;
            }
            case 'foghorn_blast': {
                // Fog Horn ability — massive low blast
                const osc = ac.createOscillator();
                const osc2 = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain); osc2.connect(gain);
                createSend(gain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(85, now);
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(86, now); // slight detune
                gain.gain.setValueAtTime(0.0, now);
                gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
                gain.gain.setValueAtTime(0.12, now + 1.0);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
                osc.start(now); osc.stop(now + 2.0);
                osc2.start(now); osc2.stop(now + 1.8);
                break;
            }
            case 'ghost_reveal': {
                // Ghost ship revealed — eerie dissonant chord
                const freqs = [200, 253, 301];
                freqs.forEach(freq => {
                    const osc = ac.createOscillator();
                    const gain = ac.createGain();
                    osc.connect(gain);
                    createSend(gain);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    osc.frequency.linearRampToValueAtTime(freq * 0.9, now + 1.0);
                    gain.gain.setValueAtTime(0.04, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                    osc.start(now); osc.stop(now + 1.5);
                });
                break;
            }
            case 'pause': {
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.connect(gain);
                gain.connect(masterGain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
                break;
            }
        }
    } catch(e) {}
}

// ── Ambient Layers ──

export function startAmbient() {
    try {
        const ac = getAudio();
        if (ambientNode) return;

        // Brown noise ocean base
        const bufSize = ac.sampleRate * 2;
        const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
        const data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < bufSize; i++) {
            const white = Math.random() * 2 - 1;
            last = (last + (0.02 * white)) / 1.02;
            data[i] = last * 3.5;
        }
        const source = ac.createBufferSource();
        source.buffer = buf;
        source.loop = true;
        const gain = ac.createGain();
        gain.gain.value = 0.05;
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();
        ambientNode = { source, gain, filter };

        // Wind layer — higher-frequency filtered noise
        const windBufSize = ac.sampleRate * 3;
        const windBuf = ac.createBuffer(1, windBufSize, ac.sampleRate);
        const windData = windBuf.getChannelData(0);
        let wLast = 0;
        for (let i = 0; i < windBufSize; i++) {
            const w = Math.random() * 2 - 1;
            wLast = (wLast + (0.04 * w)) / 1.04;
            // Modulate amplitude to create gusts
            const gust = 0.5 + 0.5 * Math.sin(i / ac.sampleRate * 0.3 * Math.PI * 2);
            windData[i] = wLast * 2.0 * gust;
        }
        const windSrc = ac.createBufferSource();
        windSrc.buffer = windBuf;
        windSrc.loop = true;
        const windGain = ac.createGain();
        windGain.gain.value = 0.02;
        const windFilter = ac.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 600;
        windFilter.Q.value = 0.5;
        windSrc.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);
        windSrc.start();
        windNode = { source: windSrc, gain: windGain };

        // Creaking wood — periodic noise bursts
        const creakBufSize = ac.sampleRate * 4;
        const creakBuf = ac.createBuffer(1, creakBufSize, ac.sampleRate);
        const creakData = creakBuf.getChannelData(0);
        for (let i = 0; i < creakBufSize; i++) {
            const t = i / ac.sampleRate;
            // Periodic creaks every ~1.5 seconds
            const period = t % 1.5;
            const env = period < 0.1 ? Math.sin(period / 0.1 * Math.PI) : 0;
            creakData[i] = (Math.random() * 2 - 1) * env * 0.3;
        }
        const creakSrc = ac.createBufferSource();
        creakSrc.buffer = creakBuf;
        creakSrc.loop = true;
        const creakGain = ac.createGain();
        creakGain.gain.value = 0.015;
        const creakFilter = ac.createBiquadFilter();
        creakFilter.type = 'bandpass';
        creakFilter.frequency.value = 400;
        creakFilter.Q.value = 3;
        creakSrc.connect(creakFilter);
        creakFilter.connect(creakGain);
        creakGain.connect(masterGain);
        creakSrc.start();
        creakNode = { source: creakSrc, gain: creakGain };

    } catch(e) {}
}

export function setAmbientGain(value) {
    if (ambientNode) {
        try {
            ambientNode.gain.gain.setValueAtTime(value, audioCtx.currentTime);
        } catch(e) {}
    }
}

export function updateAmbientForEvent(event) {
    if (!ambientNode) return;
    try {
        const now = audioCtx.currentTime;
        if (event === 'storm') {
            ambientNode.gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
            ambientNode.filter.frequency.linearRampToValueAtTime(500, now + 0.5);
            if (windNode) windNode.gain.gain.linearRampToValueAtTime(0.05, now + 0.5);
        } else if (event === 'fog') {
            if (windNode) windNode.gain.gain.linearRampToValueAtTime(0.005, now + 0.5);
        } else {
            ambientNode.gain.gain.linearRampToValueAtTime(0.05, now + 0.5);
            ambientNode.filter.frequency.linearRampToValueAtTime(350, now + 0.5);
            if (windNode) windNode.gain.gain.linearRampToValueAtTime(0.02, now + 0.5);
        }
    } catch(e) {}
}
