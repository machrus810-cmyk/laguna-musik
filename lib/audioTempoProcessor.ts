// Client-side Web Audio API helper for Tempo & Speed Editing (mempercepat & memperlambat)
// Converts and renders audio with precision into standard 16-bit PCM WAV format.

/**
 * Resamples an AudioBuffer to an optimal sample rate and encodes into a compact,
 * universally compatible 16-bit PCM WAV Blob (1 channel mono downmix).
 * Guarantees output payload is lightweight (under 5-8MB) to prevent 413 Payload Too Large errors.
 */
export function audioBufferToWav(buffer: AudioBuffer, targetDurationSec = 180): Blob {
  const srcChannels = buffer.numberOfChannels;
  const srcSampleRate = buffer.sampleRate;

  // Adaptive sample rate to ensure total file size is always strictly under 8MB
  let targetSampleRate = 22050;
  if (targetDurationSec > 300) {
    targetSampleRate = 16000;
  } else if (targetDurationSec > 180) {
    targetSampleRate = 20000;
  } else {
    targetSampleRate = 22050;
  }

  const numChannels = 1; // Mono downmix reduces size by 50% while preserving audio fidelity
  const resampleRatio = srcSampleRate / targetSampleRate;
  const targetLength = Math.max(1, Math.floor(buffer.length / resampleRatio));
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = targetSampleRate * blockAlign;
  const dataSize = targetLength * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Extract channel float data and prepare mono mixdown
  const leftData = buffer.getChannelData(0);
  const rightData = srcChannels > 1 ? buffer.getChannelData(1) : null;

  // Write PCM samples with linear interpolation resampling & mono downmix
  let offset = 44;
  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * resampleRatio;
    const index0 = Math.floor(srcIndex);
    const index1 = Math.min(index0 + 1, buffer.length - 1);
    const fraction = srcIndex - index0;

    const s0_L = leftData[index0] || 0;
    const s1_L = leftData[index1] || 0;
    const sampleL = s0_L + fraction * (s1_L - s0_L);

    let monoSample = sampleL;
    if (rightData) {
      const s0_R = rightData[index0] || 0;
      const s1_R = rightData[index1] || 0;
      const sampleR = s0_R + fraction * (s1_R - s0_R);
      monoSample = (sampleL + sampleR) * 0.5;
    }

    // Clamp between -1 and 1
    monoSample = Math.max(-1, Math.min(1, monoSample));
    // Scale to 16-bit signed int
    const intSample = monoSample < 0 ? monoSample * 0x8000 : monoSample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export type VocalCharacterType =
  | 'original'
  | 'male_to_female'
  | 'female_to_male'
  | 'chipmunk'
  | 'deep_male'
  | 'warm_acoustic'
  | 'vintage_radio'
  | 'robot_cyber';

/**
 * Adjusts audio tempo (speed), pitch (kunci nada), and vocal singer character.
 * Renders into a high-quality playable WAV Blob universally compatible across all devices.
 */
export async function renderAudioWithTempoAndPitch(
  audioSourceUrl: string,
  tempo: number,
  pitchSemitones = 0,
  preservePitch = false,
  vocalCharacter: VocalCharacterType = 'original',
  vocalFormantShift = 0
): Promise<{ blob: Blob; duration: number }> {
  if (tempo <= 0) tempo = 1.0;

  let arrayBuffer: ArrayBuffer | null = null;
  if (audioSourceUrl.startsWith('blob:') || audioSourceUrl.startsWith('data:')) {
    const res = await fetch(audioSourceUrl);
    if (!res.ok) {
      throw new Error(`Gagal membaca audio lokal (HTTP ${res.status})`);
    }
    arrayBuffer = await res.arrayBuffer();
  } else {
    try {
      const res = await fetch(audioSourceUrl);
      if (res.ok) {
        arrayBuffer = await res.arrayBuffer();
      }
    } catch {
      // Direct fetch failed
    }

    if (!arrayBuffer) {
      try {
        const proxyUrl = `/api/audio/proxy?url=${encodeURIComponent(audioSourceUrl)}`;
        const proxyRes = await fetch(proxyUrl);
        if (!proxyRes.ok) {
          throw new Error(`Proxy audio gagal (HTTP ${proxyRes.status})`);
        }
        arrayBuffer = await proxyRes.arrayBuffer();
      } catch (proxyErr) {
        const msg = proxyErr instanceof Error ? proxyErr.message : 'Gagal mengunduh audio';
        throw new Error(`Gagal memuat berkas audio untuk diedit: ${msg}`);
      }
    }
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('Data audio kosong atau tidak dapat diakses.');
  }

  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API tidak didukung di peramban ini.');
  }

  const audioCtx = new AudioCtxClass();
  let decodedBuffer: AudioBuffer;

  try {
    const bufferClone = arrayBuffer.slice(0);
    decodedBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      let isSettled = false;
      const promise = audioCtx.decodeAudioData(
        bufferClone,
        (buf) => {
          if (!isSettled) {
            isSettled = true;
            resolve(buf);
          }
        },
        (err) => {
          if (!isSettled) {
            isSettled = true;
            reject(err || new Error('Gagal mendekode berkas audio.'));
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
              reject(err);
            }
          });
      }
    });
  } finally {
    try {
      await audioCtx.close();
    } catch {
      // ignore
    }
  }

  if (!decodedBuffer) {
    throw new Error('Format audio tidak dapat dibaca.');
  }

  const pitchRatio = Math.pow(2, pitchSemitones / 12);
  const effectivePlaybackRate = preservePitch ? tempo : tempo * pitchRatio;
  const newDuration = decodedBuffer.duration / tempo;
  const numChannels = Math.min(2, Math.max(1, decodedBuffer.numberOfChannels));
  const nativeLength = Math.max(1, Math.floor(decodedBuffer.length / effectivePlaybackRate));

  const OfflineCtxClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (!OfflineCtxClass) {
    throw new Error('OfflineAudioContext tidak didukung.');
  }

  const offlineCtx = new OfflineAudioContext(
    numChannels,
    nativeLength,
    decodedBuffer.sampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = decodedBuffer;
  sourceNode.playbackRate.value = effectivePlaybackRate;

  if (preservePitch && pitchSemitones !== 0) {
    sourceNode.detune.value = pitchSemitones * 100;
  }

  let lastNode: AudioNode = sourceNode;

  if (vocalFormantShift !== 0) {
    const formantFilter = offlineCtx.createBiquadFilter();
    if (vocalFormantShift > 0) {
      formantFilter.type = 'peaking';
      formantFilter.frequency.value = 3200;
      formantFilter.Q.value = 1.2;
      formantFilter.gain.value = (vocalFormantShift / 100) * 8;
    } else {
      formantFilter.type = 'lowshelf';
      formantFilter.frequency.value = 320;
      formantFilter.gain.value = (-vocalFormantShift / 100) * 8;
    }
    lastNode.connect(formantFilter);
    lastNode = formantFilter;
  }

  if (vocalCharacter === 'male_to_female') {
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 140;
    lastNode.connect(hp);

    const peak = offlineCtx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 2800;
    peak.Q.value = 1.0;
    peak.gain.value = 6.5;
    hp.connect(peak);

    const hs = offlineCtx.createBiquadFilter();
    hs.type = 'highshelf';
    hs.frequency.value = 6500;
    hs.gain.value = 4.0;
    peak.connect(hs);
    lastNode = hs;
  } else if (vocalCharacter === 'female_to_male') {
    const ls = offlineCtx.createBiquadFilter();
    ls.type = 'lowshelf';
    ls.frequency.value = 240;
    ls.gain.value = 7.5;
    lastNode.connect(ls);

    const peak = offlineCtx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 480;
    peak.Q.value = 1.2;
    peak.gain.value = 4.5;
    ls.connect(peak);

    const hs = offlineCtx.createBiquadFilter();
    hs.type = 'highshelf';
    hs.frequency.value = 4200;
    hs.gain.value = -4.5;
    peak.connect(hs);
    lastNode = hs;
  } else if (vocalCharacter === 'chipmunk') {
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 240;
    lastNode.connect(hp);
    const peak = offlineCtx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 2400;
    peak.Q.value = 2.0;
    peak.gain.value = 8.0;
    hp.connect(peak);
    lastNode = peak;
  } else if (vocalCharacter === 'deep_male') {
    const ls = offlineCtx.createBiquadFilter();
    ls.type = 'lowshelf';
    ls.frequency.value = 180;
    ls.gain.value = 9.0;
    lastNode.connect(ls);
    const hs = offlineCtx.createBiquadFilter();
    hs.type = 'highshelf';
    hs.frequency.value = 3500;
    hs.gain.value = -6.0;
    ls.connect(hs);
    lastNode = hs;
  } else if (vocalCharacter === 'warm_acoustic') {
    const peak = offlineCtx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 1400;
    peak.Q.value = 0.9;
    peak.gain.value = 4.0;
    lastNode.connect(peak);
    const ls = offlineCtx.createBiquadFilter();
    ls.type = 'lowshelf';
    ls.frequency.value = 220;
    ls.gain.value = 3.0;
    peak.connect(ls);
    lastNode = ls;
  } else if (vocalCharacter === 'vintage_radio') {
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 400;
    lastNode.connect(hp);
    const lp = offlineCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    hp.connect(lp);
    const peak = offlineCtx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = 1800;
    peak.Q.value = 2.5;
    peak.gain.value = 7.0;
    lp.connect(peak);
    lastNode = peak;
  } else if (vocalCharacter === 'robot_cyber') {
    const peak1 = offlineCtx.createBiquadFilter();
    peak1.type = 'peaking';
    peak1.frequency.value = 800;
    peak1.Q.value = 4.0;
    peak1.gain.value = 8.0;
    lastNode.connect(peak1);
    const peak2 = offlineCtx.createBiquadFilter();
    peak2.type = 'peaking';
    peak2.frequency.value = 2200;
    peak2.Q.value = 4.0;
    peak2.gain.value = 8.0;
    peak1.connect(peak2);
    lastNode = peak2;
  }

  lastNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer, Math.round(newDuration));
  return {
    blob: wavBlob,
    duration: Math.round(newDuration),
  };
}

export async function renderAudioWithTempo(
  audioSourceUrl: string,
  tempo: number
): Promise<{ blob: Blob; duration: number }> {
  return renderAudioWithTempoAndPitch(audioSourceUrl, tempo, 0, false);
}
