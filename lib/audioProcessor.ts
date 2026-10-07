// High-Performance Client-Side Web Audio DSP Processor for LAGUNA MUSIK
// Supports: Time-Stretching (Tempo speed-up/slow-down with Pitch Lock), Pitch Transposition, EQ, and WAV rendering

export interface AudioEditOptions {
  speed: number; // 0.5 to 2.5
  preservePitch: boolean;
  pitchSemitones: number; // -12 to +12
  bassGain: number; // dB (-10 to +10)
  trebleGain: number; // dB (-10 to +10)
  filterMode?: 'normal' | 'bandpass' | 'robotic';
  reverbLevel?: number; // 0.0 to 1.0
}

/**
 * Safely decodes an ArrayBuffer to AudioBuffer with cross-browser compatibility and error guards
 */
export async function decodeAudioBufferSafely(
  arrayBuffer: ArrayBuffer,
  AudioCtxClass: typeof AudioContext
): Promise<AudioBuffer> {
  if (!arrayBuffer || arrayBuffer.byteLength < 64) {
    throw new Error('Data audio terlalu kecil atau tidak lengkap.');
  }

  // Check first 16 bytes for HTML/JSON error response signatures
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 16));
  const headerStr = String.fromCharCode(...Array.from(headerBytes)).toLowerCase();
  if (
    headerStr.startsWith('<!doctype') ||
    headerStr.startsWith('<html') ||
    headerStr.startsWith('{"error') ||
    headerStr.startsWith('{"message')
  ) {
    throw new Error('Respons dari server bukan berkas audio valid (kemungkinan tautan kedaluwarsa).');
  }

  const ctx = new AudioCtxClass();
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      let isSettled = false;
      try {
        const promise = ctx.decodeAudioData(
          arrayBuffer.slice(0),
          (buf) => {
            if (!isSettled) {
              isSettled = true;
              resolve(buf);
            }
          },
          (err) => {
            if (!isSettled) {
              isSettled = true;
              reject(err || new Error('Gagal mengurai format data audio.'));
            }
          }
        );
        if (promise && typeof promise.then === 'function') {
          promise
            .then((buf) => {
              if (!isSettled) {
                isSettled = true;
                resolve(buf);
              }
            })
            .catch((err) => {
              if (!isSettled) {
                isSettled = true;
                reject(err || new Error('Gagal mengurai format data audio.'));
              }
            });
        }
      } catch (err) {
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      }
    });
    return decoded;
  } finally {
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  }
}

/**
 * Fetch and decode an audio source safely, automatically bypassing CORS using the server proxy if needed
 */
export async function fetchAndDecodeAudio(audioUrl: string): Promise<AudioBuffer> {
  if (!audioUrl) {
    throw new Error('URL audio tidak valid atau kosong.');
  }

  const AudioCtx =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      : null;

  if (!AudioCtx) {
    throw new Error('Web Audio API tidak didukung di peramban ini.');
  }

  let arrayBuffer: ArrayBuffer | null = null;
  let lastError: string = '';

  // 1. Try local/relative paths directly
  if (audioUrl.startsWith('data:') || audioUrl.startsWith('/api/audio/')) {
    try {
      const res = await fetch(audioUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 100) {
          arrayBuffer = buf;
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  // 2. For external or CDN URLs, use the proxy route to guarantee CORS compliance
  if (!arrayBuffer) {
    try {
      const proxyUrl = audioUrl.startsWith('http')
        ? `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`
        : audioUrl;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('application/json')) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 100) {
            arrayBuffer = buf;
          }
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  // 3. Fallback direct fetch with CORS mode
  if (!arrayBuffer) {
    try {
      const res = await fetch(audioUrl, { mode: 'cors' });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 100) {
          arrayBuffer = buf;
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error(
      `Berkas audio gagal diunduh (${lastError || 'Tautan audio mungkin kedaluwarsa atau diblokir'}).`
    );
  }

  return await decodeAudioBufferSafely(arrayBuffer, AudioCtx);
}

/**
 * High-quality WSOLA (Waveform Similarity Overlap-Add) Time-Stretching
 * Changes tempo/speed without changing pitch, with multi-channel stereo phase coherence
 */
export function timeStretchAudioBuffer(
  input: AudioBuffer,
  speedRatio: number,
  audioCtx: AudioContext | OfflineAudioContext
): AudioBuffer {
  if (Math.abs(speedRatio - 1.0) < 0.005) {
    return input;
  }

  const numChannels = input.numberOfChannels;
  const sampleRate = input.sampleRate;
  const inLength = input.length;
  const outLength = Math.max(1, Math.round(inLength / speedRatio));

  const windowSize = 2048; // Frame window size
  const hopOut = Math.round(windowSize / 2); // Synthesis hop: 1024
  const hopIn = Math.round(hopOut * speedRatio); // Analysis hop
  const searchRadius = Math.min(384, Math.max(64, Math.round(hopIn / 2)));

  // Create Hann Window
  const window = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  const output = audioCtx.createBuffer(numChannels, outLength, sampleRate);
  const normBuffer = new Float32Array(outLength);

  const inChannels: Float32Array[] = [];
  const outChannels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    inChannels.push(input.getChannelData(c));
    outChannels.push(output.getChannelData(c));
  }

  let inPos = 0;
  let outPos = 0;
  const primaryIn = inChannels[0];
  const primaryOut = outChannels[0];

  while (outPos + windowSize <= outLength && inPos + windowSize + searchRadius < inLength) {
    let bestOffset = 0;
    let maxCorr = -Infinity;

    if (outPos > 0 && searchRadius > 0) {
      for (let offset = -searchRadius; offset <= searchRadius; offset++) {
        const candidatePos = inPos + offset;
        if (candidatePos < 0 || candidatePos + windowSize >= inLength) continue;

        let corr = 0;
        const step = 4; // Sub-sample step for high rendering speed
        for (let i = 0; i < windowSize; i += step) {
          corr += primaryIn[candidatePos + i] * primaryOut[outPos + i - hopOut];
        }
        if (corr > maxCorr) {
          maxCorr = corr;
          bestOffset = offset;
        }
      }
    }

    const matchPos = Math.max(0, Math.min(inLength - windowSize, inPos + bestOffset));

    for (let i = 0; i < windowSize; i++) {
      const outIdx = outPos + i;
      if (outIdx < outLength) {
        const w = window[i];
        for (let c = 0; c < numChannels; c++) {
          outChannels[c][outIdx] += inChannels[c][matchPos + i] * w;
        }
        normBuffer[outIdx] += w;
      }
    }

    inPos += hopIn;
    outPos += hopOut;
  }

  for (let i = 0; i < outLength; i++) {
    const norm = normBuffer[i];
    if (norm > 0.001) {
      const invNorm = 1 / Math.max(0.5, norm);
      for (let c = 0; c < numChannels; c++) {
        outChannels[c][i] *= invNorm;
      }
    }
  }

  return output;
}

/**
 * Resample / Pitch-Shift an AudioBuffer via playbackRate using native browser OfflineAudioContext
 */
export async function resampleAudioBuffer(
  input: AudioBuffer,
  rateRatio: number
): Promise<AudioBuffer> {
  if (Math.abs(rateRatio - 1.0) < 0.005) {
    return input;
  }

  const numChannels = input.numberOfChannels;
  const sampleRate = input.sampleRate;
  const outLength = Math.max(1, Math.round(input.length / rateRatio));

  const offlineCtx = new OfflineAudioContext(numChannels, outLength, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = input;
  source.playbackRate.value = rateRatio;
  source.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Full DSP Rendering Pipeline
 * Applies Tempo Time-Stretch + Pitch Shift + Filters (EQ, Robotic, Radio, Reverb)
 */
export async function processAndRenderAudio(
  originalBuffer: AudioBuffer,
  options: AudioEditOptions
): Promise<AudioBuffer> {
  const {
    speed = 1.0,
    preservePitch = true,
    pitchSemitones = 0,
    bassGain = 0,
    trebleGain = 0,
    filterMode = 'normal',
    reverbLevel = 0.1,
  } = options;

  let currentBuffer = originalBuffer;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const tempCtx = new AudioCtx();

  try {
    if (preservePitch) {
      if (Math.abs(speed - 1.0) >= 0.005) {
        currentBuffer = timeStretchAudioBuffer(currentBuffer, speed, tempCtx);
      }
      if (pitchSemitones !== 0) {
        const pitchRatio = Math.pow(2, pitchSemitones / 12);
        const stretchedForPitch = timeStretchAudioBuffer(currentBuffer, 1 / pitchRatio, tempCtx);
        currentBuffer = await resampleAudioBuffer(stretchedForPitch, pitchRatio);
      }
    } else {
      const pitchRatio = Math.pow(2, pitchSemitones / 12);
      const combinedRate = Math.max(0.25, Math.min(4.0, speed * pitchRatio));
      if (Math.abs(combinedRate - 1.0) >= 0.005) {
        currentBuffer = await resampleAudioBuffer(currentBuffer, combinedRate);
      }
    }

    const offlineCtx = new OfflineAudioContext(
      currentBuffer.numberOfChannels,
      currentBuffer.length,
      currentBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = currentBuffer;

    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 250;
    bass.gain.value = bassGain;

    const treble = offlineCtx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 3500;
    treble.gain.value = trebleGain;

    source.connect(bass);
    bass.connect(treble);

    let lastNode: AudioNode = treble;

    if (filterMode === 'bandpass') {
      const bandpass = offlineCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1400;
      bandpass.Q.value = 1.8;
      lastNode.connect(bandpass);
      lastNode = bandpass;
    } else if (filterMode === 'robotic') {
      const robotic = offlineCtx.createBiquadFilter();
      robotic.type = 'peaking';
      robotic.frequency.value = 2400;
      robotic.Q.value = 4.0;
      robotic.gain.value = 9;
      lastNode.connect(robotic);
      lastNode = robotic;
    }

    if (reverbLevel > 0.3) {
      const convolver = offlineCtx.createConvolver();
      const reverbLen = Math.round(offlineCtx.sampleRate * (reverbLevel * 1.2));
      const impulse = offlineCtx.createBuffer(2, reverbLen, offlineCtx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = impulse.getChannelData(c);
        for (let i = 0; i < reverbLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5) * reverbLevel;
        }
      }
      convolver.buffer = impulse;
      lastNode.connect(convolver);
      convolver.connect(offlineCtx.destination);
    } else {
      lastNode.connect(offlineCtx.destination);
    }

    source.start(0);
    const finalBuffer = await offlineCtx.startRendering();
    return finalBuffer;
  } finally {
    if (tempCtx.state !== 'closed') {
      tempCtx.close().catch(() => {});
    }
  }
}

/**
 * Encode an AudioBuffer to standard 16-bit PCM RIFF WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length * blockAlign;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
}
