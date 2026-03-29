// ═══════════════════════════════════════════════════════════════
// LAST LIGHT — Audio System (T2: reverb, layering, spatial cues)
// ═══════════════════════════════════════════════════════════════

let audioCtx = null;
let masterGain = null;
let musicGain = null;
let reverbNode = null;
let reverbGain = null;
let ambientNode = null;
let windNode = null;
let creakNode = null;
let droneNodes = null;

function getAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.8;
        masterGain.connect(audioCtx.destination);

        // Music bus (separate gain for volume control)
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.5;
        musicGain.connect(audioCtx.destination);

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

// ── T3: Sparse Between-Night Piano ──
// Procedurally generated piano-like tones using detuned sine pairs + fast decay

let pianoSequenceTimer = null;

export function playPianoSequence() {
    try {
        const ac = getAudio();
        const now = ac.currentTime;

        // A minor pentatonic in different octaves — sparse, 3-5 notes
        const scales = [
            [220, 261.6, 329.6, 392, 440],    // A3 C4 E4 G4 A4
            [164.8, 196, 220, 261.6, 329.6],   // E3 G3 A3 C4 E4
            [130.8, 164.8, 196, 261.6, 392],   // C3 E3 G3 C4 G4
        ];
        const scale = scales[Math.floor(Math.random() * scales.length)];
        const noteCount = 3 + Math.floor(Math.random() * 2); // 3-4 notes

        for (let i = 0; i < noteCount; i++) {
            const freq = scale[Math.floor(Math.random() * scale.length)];
            const startTime = now + i * (0.8 + Math.random() * 0.6); // 0.8-1.4s apart

            // Fundamental sine
            const osc1 = ac.createOscillator();
            const osc2 = ac.createOscillator();
            const gain = ac.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, startTime);
            // Slight detune for warmth
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 1.002, startTime);

            osc1.connect(gain);
            osc2.connect(gain);

            // Route through music gain bus if available
            if (musicGain) {
                gain.connect(musicGain);
            } else {
                gain.connect(masterGain);
            }

            // Piano-like envelope: quick attack, fast initial decay, slow release
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.035, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.015, startTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.5);

            osc1.start(startTime);
            osc1.stop(startTime + 2.5);
            osc2.start(startTime);
            osc2.stop(startTime + 2.5);
        }
    } catch(e) {}
}

export function stopPianoSequence() {
    if (pianoSequenceTimer) {
        clearTimeout(pianoSequenceTimer);
        pianoSequenceTimer = null;
    }
}

let beamHissNode = null;

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
        windNode = { source: windSrc, gain: windGain, filter: windFilter };

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

        // Beam hiss — warm filtered noise that follows fuel level
        const hissBufSize = ac.sampleRate * 2;
        const hissBuf = ac.createBuffer(1, hissBufSize, ac.sampleRate);
        const hissData = hissBuf.getChannelData(0);
        let hLast = 0;
        for (let i = 0; i < hissBufSize; i++) {
            const w = Math.random() * 2 - 1;
            hLast = (hLast + (0.03 * w)) / 1.03;
            hissData[i] = hLast * 2.5;
        }
        const hissSrc = ac.createBufferSource();
        hissSrc.buffer = hissBuf;
        hissSrc.loop = true;
        const hissGain = ac.createGain();
        hissGain.gain.value = 0;
        const hissFilter = ac.createBiquadFilter();
        hissFilter.type = 'bandpass';
        hissFilter.frequency.value = 250;
        hissFilter.Q.value = 0.4;
        hissSrc.connect(hissFilter);
        hissFilter.connect(hissGain);
        hissGain.connect(masterGain);
        hissSrc.start();
        beamHissNode = { source: hissSrc, gain: hissGain, filter: hissFilter };

    } catch(e) {}
}

// Update beam hiss based on fuel ratio (called per-frame from game loop)
export function updateBeamHiss(fuelRatio) {
    if (!beamHissNode || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        // Warm hiss proportional to fuel — louder when full, fades when depleted
        const targetGain = fuelRatio * 0.025;
        beamHissNode.gain.gain.linearRampToValueAtTime(targetGain, now + 0.1);
        // Shift filter warmth — higher fuel = warmer (lower center freq)
        const targetFreq = 180 + (1 - fuelRatio) * 200;
        beamHissNode.filter.frequency.linearRampToValueAtTime(targetFreq, now + 0.1);
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
            if (windNode) {
                windNode.gain.gain.linearRampToValueAtTime(0.06, now + 0.5);
                windNode.filter.frequency.linearRampToValueAtTime(900, now + 0.5);
            }
            if (creakNode) creakNode.gain.gain.linearRampToValueAtTime(0.04, now + 0.5);
        } else if (event === 'fog') {
            ambientNode.gain.gain.linearRampToValueAtTime(0.04, now + 0.5);
            ambientNode.filter.frequency.linearRampToValueAtTime(250, now + 0.5);
            if (windNode) {
                windNode.gain.gain.linearRampToValueAtTime(0.005, now + 0.5);
                windNode.filter.frequency.linearRampToValueAtTime(300, now + 0.5);
            }
            if (creakNode) creakNode.gain.gain.linearRampToValueAtTime(0.02, now + 0.5);
        } else if (event === 'redTide') {
            ambientNode.gain.gain.linearRampToValueAtTime(0.06, now + 0.5);
            ambientNode.filter.frequency.linearRampToValueAtTime(400, now + 0.5);
            if (windNode) {
                windNode.gain.gain.linearRampToValueAtTime(0.015, now + 0.5);
                windNode.filter.frequency.linearRampToValueAtTime(500, now + 0.5);
            }
        } else if (event === 'newMoon') {
            ambientNode.gain.gain.linearRampToValueAtTime(0.04, now + 0.5);
            if (windNode) {
                windNode.gain.gain.linearRampToValueAtTime(0.03, now + 0.5);
                windNode.filter.frequency.linearRampToValueAtTime(700, now + 0.5);
            }
        } else if (event === 'deadCalm') {
            ambientNode.gain.gain.linearRampToValueAtTime(0.01, now + 1.0);
            ambientNode.filter.frequency.linearRampToValueAtTime(150, now + 1.0);
            if (windNode) windNode.gain.gain.linearRampToValueAtTime(0.0, now + 0.5);
            if (creakNode) creakNode.gain.gain.linearRampToValueAtTime(0.005, now + 0.5);
        } else {
            ambientNode.gain.gain.linearRampToValueAtTime(0.05, now + 0.5);
            ambientNode.filter.frequency.linearRampToValueAtTime(350, now + 0.5);
            if (windNode) {
                windNode.gain.gain.linearRampToValueAtTime(0.02, now + 0.5);
                windNode.filter.frequency.linearRampToValueAtTime(600, now + 0.5);
            }
        }
    } catch(e) {}
}

// ── T3: Creature Proximity Audio ──
// Continuous tones that intensify as creatures approach
let creatureAudioNodes = {};
const CREATURE_AUDIO_CONFIGS = {
    lurker:  { freq: 45,  type: 'sine',     maxGain: 0.04, filterFreq: 200 },
    flinch:  { freq: 180, type: 'triangle', maxGain: 0.02, filterFreq: 800 },
    abyssal: { freq: 25,  type: 'sine',     maxGain: 0.08, filterFreq: 120 },
    shade:   { freq: 2200,type: 'sawtooth', maxGain: 0.015, filterFreq: 3000 },
    mimic:   { freq: 60,  type: 'sine',     maxGain: 0.02, filterFreq: 300 },
};

export function updateCreatureAudio(creaturesByType) {
    try {
        const ac = getAudio();
        const now = ac.currentTime;

        for (const [type, config] of Object.entries(CREATURE_AUDIO_CONFIGS)) {
            const proximity = creaturesByType[type] || 0; // 0-1 normalized

            if (proximity > 0 && !creatureAudioNodes[type]) {
                // Start this creature's ambient tone
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                const filter = ac.createBiquadFilter();
                osc.type = config.type;
                osc.frequency.value = config.freq;
                filter.type = type === 'shade' ? 'highpass' : 'lowpass';
                filter.frequency.value = config.filterFreq;
                filter.Q.value = type === 'shade' ? 1 : 0.7;
                osc.connect(filter);
                filter.connect(gain);
                gain.gain.value = 0;
                gain.connect(masterGain);
                osc.start();
                creatureAudioNodes[type] = { osc, gain, filter };
            }

            if (creatureAudioNodes[type]) {
                const target = proximity * config.maxGain;
                creatureAudioNodes[type].gain.gain.linearRampToValueAtTime(target, now + 0.1);
                // Modulate filter based on proximity for shade whisper effect
                if (type === 'shade') {
                    creatureAudioNodes[type].filter.frequency.linearRampToValueAtTime(
                        1500 + proximity * 1500, now + 0.1
                    );
                }
            }
        }
    } catch(e) {}
}

// ── T2: Generative Drone Music ──
// 4 slow sine oscillators with LFO-modulated frequencies, crossfaded by game phase

export function startDroneMusic() {
    try {
        const ac = getAudio();
        if (droneNodes) return;

        // Base frequencies: A minor chord spread across octaves
        const baseFreqs = [55, 82.5, 110, 165]; // A1, E2, A2, E3
        const oscs = [];
        const gains = [];
        const lfos = [];
        const lfoGains = [];

        for (let i = 0; i < baseFreqs.length; i++) {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            const lfo = ac.createOscillator();
            const lfoGain = ac.createGain();

            osc.type = 'sine';
            osc.frequency.value = baseFreqs[i];

            // LFO modulates pitch slightly for organic drift
            lfo.type = 'sine';
            lfo.frequency.value = 0.05 + i * 0.02; // very slow: 0.05-0.11 Hz
            lfoGain.gain.value = baseFreqs[i] * 0.008; // ~0.8% pitch drift

            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(gain);
            gain.gain.value = 0;
            gain.connect(musicGain);

            osc.start();
            lfo.start();

            oscs.push(osc);
            gains.push(gain);
            lfos.push(lfo);
            lfoGains.push(lfoGain);
        }

        droneNodes = { oscs, gains, lfos, lfoGains, baseFreqs };
    } catch(e) {}
}

// Update drone based on game phase: nightProgress 0-1, creatureDensity 0-1
export function updateDroneMusic(nightProgress, creatureDensity, isDeadCalm) {
    if (!droneNodes || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const { oscs, gains, baseFreqs } = droneNodes;

        if (isDeadCalm) {
            // Near silence — only the lowest drone, very quiet
            for (let i = 0; i < gains.length; i++) {
                const target = i === 0 ? 0.008 : 0;
                gains[i].gain.linearRampToValueAtTime(target, now + 2.0);
            }
            return;
        }

        for (let i = 0; i < oscs.length; i++) {
            // Base volume: lower drones always present, higher ones fade in with tension
            const baseVol = [0.025, 0.015, 0.012, 0.008][i];

            // Creature density adds dissonance: shift frequencies slightly sharp
            const detune = creatureDensity * 3; // up to 3 Hz sharp
            oscs[i].frequency.linearRampToValueAtTime(baseFreqs[i] + detune * (i + 1), now + 0.5);

            // Night progress swells mid-range tones
            const progressBoost = Math.sin(nightProgress * Math.PI) * 0.01; // peaks at midnight

            // Creature density swells upper harmonics
            const tensionBoost = creatureDensity * [0.005, 0.01, 0.015, 0.02][i];

            const targetVol = baseVol + progressBoost + tensionBoost;
            gains[i].gain.linearRampToValueAtTime(Math.min(0.06, targetVol), now + 0.3);
        }
    } catch(e) {}
}

export function stopDroneMusic() {
    if (!droneNodes || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        for (const g of droneNodes.gains) {
            g.gain.linearRampToValueAtTime(0, now + 1.0);
        }
    } catch(e) {}
}

export function setMusicVolume(value) {
    if (musicGain) {
        try { musicGain.gain.setValueAtTime(value, audioCtx.currentTime); } catch(e) {}
    }
}

export function setMasterVolume(value) {
    if (masterGain) {
        try { masterGain.gain.setValueAtTime(value, audioCtx.currentTime); } catch(e) {}
    }
}
