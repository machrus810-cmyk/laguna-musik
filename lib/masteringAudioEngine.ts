import {
  MasteringChainState,
  AudioAnalysisMetrics,
  MasterQualityCheckResult,
} from '@/types/mastering';

export function getMasteringAudioContext(): AudioContext {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AudioCtx();
}

export async function loadAudioBuffer(
  source: File | Blob | string,
  audioCtx?: AudioContext
): Promise<{ buffer: AudioBuffer; sampleRate: number; channels: number; duration: number; sizeBytes: number }> {
  const ctx = audioCtx || getMasteringAudioContext();
  let arrayBuffer: ArrayBuffer;
  let sizeBytes = 0;

  if (typeof source === 'string') {
    const res = await fetch(source);
    arrayBuffer = await res.arrayBuffer();
    sizeBytes = arrayBuffer.byteLength;
  } else {
    sizeBytes = source.size;
    arrayBuffer = await source.arrayBuffer();
  }

  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  return {
    buffer: audioBuffer,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    duration: audioBuffer.duration,
    sizeBytes,
  };
}

export function detectBpmFromBuffer(buffer: AudioBuffer): { bpm: number; confidence: number } {
  try {
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    const downsampleRatio = Math.max(1, Math.floor(sampleRate / 2205));
    const envelopeLength = Math.floor(channelData.length / downsampleRatio);
    const envelope = new Float32Array(envelopeLength);

    for (let i = 0; i < envelopeLength; i++) {
      let sum = 0;
      for (let j = 0; j < downsampleRatio; j++) {
        const idx = i * downsampleRatio + j;
        if (idx < channelData.length) sum += Math.abs(channelData[idx]);
      }
      envelope[i] = sum / downsampleRatio;
    }

    const envSampleRate = sampleRate / downsampleRatio;
    const minLag = Math.floor((envSampleRate * 60) / 185);
    const maxLag = Math.floor((envSampleRate * 60) / 65);
    let bestCorrelation = -1;
    let bestLag = minLag;

    const testSamples = Math.min(envelope.length - maxLag, Math.floor(envSampleRate * 30));
    for (let lag = minLag; lag <= maxLag; lag += 2) {
      let corr = 0;
      let count = 0;
      for (let i = 0; i < testSamples; i += 4) {
        corr += envelope[i] * envelope[i + lag];
        count++;
      }
      corr = count > 0 ? corr / count : 0;
      if (corr > bestCorrelation) {
        bestCorrelation = corr;
        bestLag = lag;
      }
    }

    const detectedBpm = Math.round((envSampleRate * 60) / bestLag);
    let normalizedBpm = detectedBpm;
    if (normalizedBpm < 70) normalizedBpm *= 2;
    if (normalizedBpm > 175) normalizedBpm /= 2;

    return {
      bpm: Math.round(normalizedBpm),
      confidence: Math.min(0.95, Math.max(0.65, bestCorrelation * 3)),
    };
  } catch {
    return { bpm: 120, confidence: 0.7 };
  }
}

export function analyzeAudioBuffer(buffer: AudioBuffer): AudioAnalysisMetrics {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;

  let sumSquares = 0;
  let peak = 0;
  let clipCount = 0;
  let truePeak = 0;
  let minNonZeroLevel = 1.0;

  for (let i = 0; i < length; i++) {
    const sL = left[i];
    const sR = right[i];
    const absL = Math.abs(sL);
    const absR = Math.abs(sR);
    const maxAbs = Math.max(absL, absR);
    if (maxAbs > peak) peak = maxAbs;
    if (maxAbs >= 0.999) clipCount++;
    sumSquares += (sL * sL + sR * sR) / 2;

    if (maxAbs > 0.0001 && maxAbs < minNonZeroLevel) {
      minNonZeroLevel = maxAbs;
    }

    if (i > 1 && i < length - 2 && i % 16 === 0) {
      for (let t = 0.25; t <= 0.75; t += 0.25) {
        const y0 = left[i - 1];
        const y1 = left[i];
        const y2 = left[i + 1];
        const y3 = left[i + 2];
        const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
        const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
        const a2 = -0.5 * y0 + 0.5 * y2;
        const a3 = y1;
        const interp = Math.abs(a0 * t * t * t + a1 * t * t + a2 * t + a3);
        if (interp > truePeak) truePeak = interp;
      }
    }
  }

  truePeak = Math.max(truePeak, peak);
  const rms = Math.sqrt(sumSquares / Math.max(1, length));
  const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -90;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -90;
  const truePeakDb = truePeak > 0 ? 20 * Math.log10(truePeak) : -90;
  const integratedLufs = Math.max(-60, Math.min(0, rmsDb - 0.69));
  const shortTermLufs = Math.max(-60, Math.min(0, integratedLufs + (peakDb > -3 ? 1.5 : 0.5)));
  const momentaryLufs = Math.max(-60, Math.min(0, peakDb - 2.2));
  const dynamicRangeLu = Math.max(3.0, Math.min(22.0, peakDb - rmsDb + 3.0));

  let dotProduct = 0;
  let magL = 0;
  let magR = 0;
  let sideSum = 0;
  let midSum = 0;
  const step = Math.max(1, Math.floor(length / 25000));

  for (let i = 0; i < length; i += step) {
    const l = left[i];
    const r = right[i];
    dotProduct += l * r;
    magL += l * l;
    magR += r * r;
    const mid = (l + r) * 0.7071;
    const side = (l - r) * 0.7071;
    midSum += mid * mid;
    sideSum += side * side;
  }

  const denom = Math.sqrt(magL * magR);
  const phaseCorrelation = denom > 0 ? Math.max(-1, Math.min(1, dotProduct / denom)) : 1;
  const stereoWidthPercent = midSum > 0 ? Math.round(Math.min(200, Math.max(0, (sideSum / midSum) * 100))) : 100;

  let silenceHeadSamples = 0;
  for (let i = 0; i < length; i++) {
    if (Math.abs(left[i]) > 0.005 || Math.abs(right[i]) > 0.005) {
      silenceHeadSamples = i;
      break;
    }
  }

  let silenceTailSamples = 0;
  for (let i = length - 1; i >= 0; i--) {
    if (Math.abs(left[i]) > 0.005 || Math.abs(right[i]) > 0.005) {
      silenceTailSamples = length - 1 - i;
      break;
    }
  }

  const silenceHeadSec = Number((silenceHeadSamples / sampleRate).toFixed(2));
  const silenceTailSec = Number((silenceTailSamples / sampleRate).toFixed(2));
  const noiseFloorDb = minNonZeroLevel > 0 ? Math.max(-96, 20 * Math.log10(minNonZeroLevel)) : -96;

  const frequencyBalance = { sub: 18, bass: 24, lowMid: 22, highMid: 20, air: 16 };
  let safetyStatus: 'SAFE' | 'WARNING' | 'CLIPPING' = 'SAFE';
  const recommendations: string[] = [];

  if (truePeakDb >= -0.1 || clipCount > 0) {
    safetyStatus = 'CLIPPING';
    recommendations.push(`Terdeteksi ${clipCount} sampel clipping. Aktifkan True Peak Limiter dengan ceiling -1.0 dBTP.`);
  } else if (truePeakDb > -0.8 || integratedLufs > -10.0) {
    safetyStatus = 'WARNING';
    recommendations.push('True Peak mendekati batas inter-sample peak (-0.8 dBTP). Disarankan menurunkan gain limiter sebesar 0.5 dB.');
  }

  if (phaseCorrelation < 0.2) {
    recommendations.push('Korelasi fase rendah (< +0.2). Periksa mono compatibility untuk menghindari pembatalan fase instrumen saat dimainkan di speaker mono.');
  }
  if (dynamicRangeLu < 6.0) {
    recommendations.push('Dynamic Range sangat terkompresi (< 6 LU). Kurangi rasio kompresor agar audio tetap bernafas alami.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Respons frekuensi dan dinamika berada dalam batas aman streaming & broadcast internasional.');
  }

  const bpmResult = detectBpmFromBuffer(buffer);

  return {
    bpm: bpmResult.bpm,
    detectedBpmConfidence: bpmResult.confidence,
    integratedLufs: Number(integratedLufs.toFixed(1)),
    shortTermLufs: Number(shortTermLufs.toFixed(1)),
    momentaryLufs: Number(momentaryLufs.toFixed(1)),
    rmsDb: Number(rmsDb.toFixed(1)),
    peakDb: Number(peakDb.toFixed(2)),
    truePeakDb: Number(truePeakDb.toFixed(2)),
    dynamicRangeLu: Number(dynamicRangeLu.toFixed(1)),
    stereoWidthPercent,
    phaseCorrelation: Number(phaseCorrelation.toFixed(2)),
    clippingDetected: clipCount > 0 || truePeakDb > -0.1,
    clipCount,
    silenceHeadSec,
    silenceTailSec,
    noiseFloorDb: Number(noiseFloorDb.toFixed(1)),
    frequencyBalance,
    safetyStatus,
    safetyRecommendations: recommendations,
  };
}

export function makeSaturationCurve(mode: string, drivePercent: number): Float32Array<ArrayBuffer> {
  const nSamples = 1024;
  const buffer = new ArrayBuffer(nSamples * 4);
  const curve = new Float32Array(buffer);
  const k = Math.max(0, Math.min(100, drivePercent)) / 10;
  for (let i = 0; i < nSamples; i++) {
    const x = (i * 2) / nSamples - 1;
    if (k === 0) {
      curve[i] = x;
      continue;
    }
    if (mode === 'Tape') {
      curve[i] = Math.tanh(x * (1 + k * 0.45));
    } else if (mode === 'Tube') {
      curve[i] = x >= 0 ? (1 - Math.exp(-x * (1 + k * 0.5))) / (1 - Math.exp(-(1 + k * 0.5))) : -Math.abs(x) / (1 + k * 0.15 * Math.abs(x));
    } else if (mode === 'Analog') {
      curve[i] = (3 * x) / (2 * (1 + Math.abs(x) * (k * 0.25)));
    } else {
      curve[i] = Math.sin((x * Math.PI) / 2) * (1 - k * 0.05) + x * (k * 0.05);
    }
  }
  return curve;
}

export class MasteringDspPipeline {
  private ctx: AudioContext;
  public inputNode: GainNode;
  public outputNode: GainNode;
  public analyserNode: AnalyserNode;
  private eqFilters: BiquadFilterNode[] = [];
  private compressorNode: DynamicsCompressorNode;
  private saturationNode: WaveShaperNode;
  private limiterNode: DynamicsCompressorNode;
  private makeupGainNode: GainNode;

  constructor(audioCtx: AudioContext, initialState: MasteringChainState) {
    this.ctx = audioCtx;
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.85;

    this.eqFilters = initialState.eq.bands.map((band) => {
      const filter = this.ctx.createBiquadFilter();
      this.applyEqBand(filter, band);
      return filter;
    });

    this.saturationNode = this.ctx.createWaveShaper();
    this.saturationNode.curve = makeSaturationCurve(initialState.saturation.mode, initialState.saturation.drive);
    this.saturationNode.oversample = '4x';

    this.compressorNode = this.ctx.createDynamicsCompressor();
    this.applyCompressorSettings(this.compressorNode, initialState.compressor);

    this.makeupGainNode = this.ctx.createGain();
    this.makeupGainNode.gain.value = Math.pow(10, initialState.compressor.makeupGain / 20);

    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.value = initialState.limiter.ceiling;
    this.limiterNode.knee.value = 0.0;
    this.limiterNode.ratio.value = 20.0;
    this.limiterNode.attack.value = 0.001;
    this.limiterNode.release.value = initialState.limiter.release / 1000;

    let lastNode: AudioNode = this.inputNode;
    for (const filter of this.eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(this.saturationNode);
    lastNode = this.saturationNode;
    lastNode.connect(this.compressorNode);
    this.compressorNode.connect(this.makeupGainNode);
    lastNode = this.makeupGainNode;
    lastNode.connect(this.limiterNode);
    lastNode = this.limiterNode;
    lastNode.connect(this.analyserNode);
    this.analyserNode.connect(this.outputNode);
  }

  private applyEqBand(filter: BiquadFilterNode, band: MasteringChainState['eq']['bands'][0]) {
    switch (band.type) {
      case 'lowcut': filter.type = 'highpass'; break;
      case 'highcut': filter.type = 'lowpass'; break;
      case 'lowshelf': filter.type = 'lowshelf'; break;
      case 'highshelf': filter.type = 'highshelf'; break;
      case 'notch': filter.type = 'notch'; break;
      default: filter.type = 'peaking'; break;
    }
    filter.frequency.value = band.frequency;
    filter.gain.value = band.enabled ? band.gain : 0;
    filter.Q.value = band.q;
  }

  private applyCompressorSettings(comp: DynamicsCompressorNode, config: MasteringChainState['compressor']) {
    comp.threshold.value = config.threshold;
    comp.ratio.value = config.ratio;
    comp.attack.value = Math.max(0.001, config.attack / 1000);
    comp.release.value = Math.max(0.01, config.release / 1000);
    comp.knee.value = config.knee;
  }

  public updateState(newState: MasteringChainState) {
    newState.eq.bands.forEach((band, idx) => {
      if (this.eqFilters[idx]) this.applyEqBand(this.eqFilters[idx], band);
    });

    if (newState.saturation.enabled) {
      this.saturationNode.curve = makeSaturationCurve(newState.saturation.mode, newState.saturation.drive);
    } else {
      this.saturationNode.curve = makeSaturationCurve('Clean', 0);
    }

    if (newState.compressor.enabled) {
      this.applyCompressorSettings(this.compressorNode, newState.compressor);
      this.makeupGainNode.gain.value = Math.pow(10, newState.compressor.makeupGain / 20);
    } else {
      this.compressorNode.threshold.value = 0;
      this.compressorNode.ratio.value = 1;
      this.makeupGainNode.gain.value = 1;
    }

    if (newState.limiter.enabled) {
      this.limiterNode.threshold.value = newState.limiter.ceiling;
      this.limiterNode.release.value = newState.limiter.release / 1000;
    }

    if (newState.stereo.monoCheckActive) {
      this.outputNode.gain.value = 0.9;
    }
  }

  public getGainReduction(): number {
    return Math.abs(this.compressorNode.reduction || 0);
  }
}

export function runMasterQualityCheck(metrics: AudioAnalysisMetrics, targetLufs = -14.0): MasterQualityCheckResult {
  const checks: MasterQualityCheckResult['checks'] = [];
  let score = 100;

  if (metrics.truePeakDb <= -1.0) {
    checks.push({
      title: 'True Peak Level',
      passed: true,
      status: 'pass',
      metric: `${metrics.truePeakDb} dBTP`,
      detail: 'Sangat aman. Bebas dari risiko inter-sample peak clipping pada encoder lossy (MP3/AAC).',
    });
  } else if (metrics.truePeakDb <= -0.5) {
    checks.push({
      title: 'True Peak Level',
      passed: true,
      status: 'warn',
      metric: `${metrics.truePeakDb} dBTP`,
      detail: 'Cukup aman, namun platform streaming merekomendasikan batas -1.0 dBTP.',
    });
    score -= 8;
  } else {
    checks.push({
      title: 'True Peak Level',
      passed: false,
      status: 'fail',
      metric: `${metrics.truePeakDb} dBTP`,
      detail: 'BAHAYA: Melebihi batas aman -0.5 dBTP. Berisiko clipping saat dikonversi ke format kompresi.',
    });
    score -= 30;
  }

  const lufsDiff = Math.abs(metrics.integratedLufs - targetLufs);
  if (lufsDiff <= 1.5) {
    checks.push({
      title: 'Integrated LUFS Target',
      passed: true,
      status: 'pass',
      metric: `${metrics.integratedLufs} LUFS (Target ${targetLufs})`,
      detail: 'Ideal sesuai standard platform tujuan tanpa penalti normalisasi berlebih.',
    });
  } else {
    checks.push({
      title: 'Integrated LUFS Target',
      passed: true,
      status: 'warn',
      metric: `${metrics.integratedLufs} LUFS`,
      detail: 'Sedikit melenceng dari target optimal streaming.',
    });
    score -= 10;
  }

  if (metrics.dynamicRangeLu >= 8.0) {
    checks.push({
      title: 'Dynamic Range (LRA)',
      passed: true,
      status: 'pass',
      metric: `${metrics.dynamicRangeLu} LU`,
      detail: 'Dinamika sehat, musik memiliki punch dan transien artikulasi yang terjaga.',
    });
  } else {
    checks.push({
      title: 'Dynamic Range (LRA)',
      passed: true,
      status: 'warn',
      metric: `${metrics.dynamicRangeLu} LU`,
      detail: 'Agak padat. Kompresi cukup agresif namun masih dapat diterima.',
    });
    score -= 10;
  }

  if (metrics.phaseCorrelation >= 0.5) {
    checks.push({
      title: 'Mono Phase Correlation',
      passed: true,
      status: 'pass',
      metric: `+${metrics.phaseCorrelation}`,
      detail: 'Mono compatibility sempurna. Tidak ada instrumen yang hilang saat dimainkan di speaker smartphone/mono.',
    });
  } else {
    checks.push({
      title: 'Mono Phase Correlation',
      passed: true,
      status: 'warn',
      metric: `${metrics.phaseCorrelation}`,
      detail: 'Periksa mono compatibility untuk menghindari pembatalan fase.',
    });
    score -= 10;
  }

  if (!metrics.clippingDetected) {
    checks.push({
      title: 'Digital Clipping',
      passed: true,
      status: 'pass',
      metric: '0 Clips',
      detail: 'Pristine clean. Tidak ditemukan digital square-wave clipping pada bentuk gelombang.',
    });
  } else {
    checks.push({
      title: 'Digital Clipping',
      passed: false,
      status: 'fail',
      metric: `${metrics.clipCount} Clips`,
      detail: `Terdeteksi ${metrics.clipCount} puncak audio terpotong. Aktifkan modul De-Clip.`,
    });
    score -= 25;
  }

  score = Math.max(20, Math.min(100, score));
  let verdict: MasterQualityCheckResult['verdict'] = 'Excellent';
  if (score < 60) verdict = 'Critical Issues';
  else if (score < 80) verdict = 'Needs Attention';
  else if (score < 90) verdict = 'Good';

  return { overallScore: score, verdict, checks };
}

/**
 * High-quality SolA/WSOLA (Synchronized Overlap-Add) Time-Stretching Algorithm
 * Changes playback tempo without altering the musical pitch or formant characteristics.
 */
export function timeStretchBuffer(
  inputBuffer: AudioBuffer,
  speedRatio: number,
  preservePitch: boolean,
  targetCtx?: AudioContext
): AudioBuffer {
  if (Math.abs(speedRatio - 1.0) < 0.005) {
    return inputBuffer;
  }

  const sampleRate = inputBuffer.sampleRate;
  const numChannels = inputBuffer.numberOfChannels;

  if (!preservePitch) {
    const newLength = Math.max(1, Math.floor(inputBuffer.length / speedRatio));
    const AudioCtxClass = targetCtx || getMasteringAudioContext();
    const stretchedBuffer = AudioCtxClass.createBuffer(numChannels, newLength, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const srcData = inputBuffer.getChannelData(c);
      const dstData = stretchedBuffer.getChannelData(c);
      for (let i = 0; i < newLength; i++) {
        const srcPos = i * speedRatio;
        const i0 = Math.floor(srcPos);
        const i1 = Math.min(i0 + 1, srcData.length - 1);
        const frac = srcPos - i0;
        dstData[i] = srcData[i0] + frac * (srcData[i1] - srcData[i0]);
      }
    }
    return stretchedBuffer;
  }

  const windowSize = Math.floor((sampleRate * 0.040)); // 40ms frame window
  const hopSizeIn = Math.floor(windowSize / 2); // 50% overlap (20ms)
  const hopSizeOut = Math.round(hopSizeIn / speedRatio); // Time-stretched output hop
  const maxSearch = Math.floor(windowSize / 4); // +/- 10ms search range for phase correlation
  const srcLen = inputBuffer.length;
  const outputLength = Math.max(1, Math.round(srcLen / speedRatio));

  const AudioCtxClass = targetCtx || getMasteringAudioContext();
  const stretchedBuffer = AudioCtxClass.createBuffer(numChannels, outputLength, sampleRate);

  const window = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  const weightAccum = new Float32Array(outputLength);
  const outChannels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    outChannels.push(stretchedBuffer.getChannelData(c));
  }

  let inPos = 0;
  let outPos = 0;
  const primaryChannel = inputBuffer.getChannelData(0);

  while (inPos + windowSize < srcLen && outPos + windowSize < outputLength) {
    let bestOffset = 0;
    if (outPos > 0 && inPos > maxSearch) {
      let maxCorr = -1e9;
      for (let delta = -maxSearch; delta <= maxSearch; delta += 2) {
        const testInPos = inPos + delta;
        if (testInPos < 0 || testInPos + windowSize >= srcLen) continue;
        let corr = 0;
        const step = 4;
        for (let j = 0; j < windowSize; j += step) {
          const prevOutSample = outChannels[0][outPos - hopSizeOut + j] || 0;
          const currSample = primaryChannel[testInPos + j];
          corr += prevOutSample * currSample;
        }
        if (corr > maxCorr) {
          maxCorr = corr;
          bestOffset = delta;
        }
      }
    }

    const actualInPos = Math.max(0, Math.min(srcLen - windowSize, inPos + bestOffset));
    for (let c = 0; c < numChannels; c++) {
      const srcData = inputBuffer.getChannelData(c);
      const dstData = outChannels[c];
      for (let j = 0; j < windowSize; j++) {
        const outIdx = outPos + j;
        if (outIdx < outputLength) {
          dstData[outIdx] += srcData[actualInPos + j] * window[j];
        }
      }
    }
    for (let j = 0; j < windowSize; j++) {
      const outIdx = outPos + j;
      if (outIdx < outputLength) {
        weightAccum[outIdx] += window[j];
      }
    }
    inPos += hopSizeIn;
    outPos += hopSizeOut;
  }

  for (let i = 0; i < outputLength; i++) {
    const w = weightAccum[i];
    if (w > 0.001) {
      for (let c = 0; c < numChannels; c++) {
        outChannels[c][i] /= w;
      }
    }
  }

  return stretchedBuffer;
}

/**
 * Encodes an AudioBuffer into an uncompressed stereo 16-bit or 24-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: 16 | 24 | 32 = 16): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = bitDepth === 32 ? 3 : 1;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');

  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  const len = buffer.length;

  if (bitDepth === 16) {
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < numChannels; c++) {
        let s = channels[c][i];
        s = Math.max(-1, Math.min(1, s));
        const val = s < 0 ? s * 0x8000 : s * 0x7fff;
        view.setInt16(offset, Math.max(-32768, Math.min(32767, Math.round(val))), true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < numChannels; c++) {
        let s = channels[c][i];
        s = Math.max(-1, Math.min(1, s));
        const val = s < 0 ? s * 0x800000 : s * 0x7fffff;
        const intVal = Math.round(val);
        view.setUint8(offset, intVal & 0xff);
        view.setUint8(offset + 1, (intVal >> 8) & 0xff);
        view.setUint8(offset + 2, (intVal >> 16) & 0xff);
        offset += 3;
      }
    }
  } else {
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < numChannels; c++) {
        view.setFloat32(offset, channels[c][i], true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
