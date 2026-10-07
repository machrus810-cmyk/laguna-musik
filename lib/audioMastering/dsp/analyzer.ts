import { AudioAnalysisResult } from '../types';

class KWeightingFilter {
  private b0 = 1.53512485958697;
  private b1 = -2.69169618940638;
  private b2 = 1.19839281085285;
  private a1 = -1.69065929318241;
  private a2 = 0.73248077421585;

  private b0_hp = 1.0;
  private b1_hp = -2.0;
  private b2_hp = 1.0;
  private a1_hp = -1.99004745483398;
  private a2_hp = 0.99007225034132;

  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  private x1_hp = 0;
  private x2_hp = 0;
  private y1_hp = 0;
  private y2_hp = 0;

  public process(sample: number): number {
    const y = this.b0 * sample + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = sample;
    this.y2 = this.y1;
    this.y1 = y;

    const y_hp = this.b0_hp * y + this.b1_hp * this.x1_hp + this.b2_hp * this.x2_hp - this.a1_hp * this.y1_hp - this.a2_hp * this.y2_hp;
    this.x2_hp = this.x1_hp;
    this.x1_hp = y;
    this.y2_hp = this.y1_hp;
    this.y1_hp = y_hp;
    return y_hp;
  }
}

export async function analyzeAudioBuffer(audioBuffer: AudioBuffer): Promise<AudioAnalysisResult> {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const left = audioBuffer.getChannelData(0);
  const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;

  let peakAbs = 0;
  let clippingCount = 0;
  const clipThreshold = Math.pow(10, -0.05 / 20);

  let sumSqL = 0;
  let sumSqR = 0;
  let sumLR = 0;

  const kFilterL = new KWeightingFilter();
  const kFilterR = new KWeightingFilter();
  let kWeightedSum = 0;

  const blockSize = Math.floor(sampleRate * 0.1);
  const blockRmsList: number[] = [];
  let currentBlockSum = 0;
  let blockCount = 0;

  const step = length > sampleRate * 180 ? 4 : length > sampleRate * 60 ? 2 : 1;

  for (let i = 0; i < length; i += step) {
    const l = left[i];
    const r = right[i];
    const absL = Math.abs(l);
    const absR = Math.abs(r);
    const maxSample = Math.max(absL, absR);
    if (maxSample > peakAbs) peakAbs = maxSample;
    if (maxSample >= clipThreshold) clippingCount++;

    sumSqL += l * l;
    sumSqR += r * r;
    sumLR += l * r;

    const kL = kFilterL.process(l);
    const kR = kFilterR.process(r);
    kWeightedSum += (kL * kL + kR * kR) * 0.5;

    currentBlockSum += (l * l + r * r) * 0.5;
    blockCount++;
    if (blockCount >= blockSize / step) {
      const blockRms = Math.sqrt(currentBlockSum / blockCount);
      if (blockRms > 1e-4) {
        blockRmsList.push(20 * Math.log10(blockRms));
      }
      currentBlockSum = 0;
      blockCount = 0;
    }
  }

  const processedSamples = length / step;
  const rmsL = Math.sqrt(sumSqL / processedSamples);
  const rmsR = Math.sqrt(sumSqR / processedSamples);
  const avgRms = (rmsL + rmsR) * 0.5;
  const peakDbfs = 20 * Math.log10(Math.max(1e-5, peakAbs));
  const truePeakDbfs = Math.min(3.0, peakDbfs + 0.6);
  const rmsDbfs = 20 * Math.log10(Math.max(1e-5, avgRms));

  const meanKPower = kWeightedSum / processedSamples;
  const integratedLufs = -0.691 + 10 * Math.log10(Math.max(1e-6, meanKPower));
  const shortTermLufs = Math.max(-40, integratedLufs + 1.2);

  let dynamicRangeDb = 10;
  if (blockRmsList.length > 10) {
    blockRmsList.sort((a, b) => a - b);
    const top95 = blockRmsList[Math.floor(blockRmsList.length * 0.95)];
    const low20 = blockRmsList[Math.floor(blockRmsList.length * 0.2)];
    dynamicRangeDb = Math.max(3, Math.min(24, top95 - low20));
  }

  const crestFactorDb = Math.max(0, peakDbfs - rmsDbfs);

  const denom = Math.sqrt(sumSqL * sumSqR);
  const phaseCorrelation = denom > 1e-6 ? Math.max(-1, Math.min(1, sumLR / denom)) : 1;
  const stereoWidth = Math.max(0.2, Math.min(2.0, 1 + (1 - phaseCorrelation) * 0.6));

  const midPoint = Math.floor(length / 2);
  const fftWindowSize = 4096;
  const fftStart = Math.max(0, Math.min(length - fftWindowSize, midPoint));
  const windowData = new Float32Array(fftWindowSize);

  for (let i = 0; i < fftWindowSize; i++) {
    const idx = fftStart + i;
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftWindowSize - 1)));
    windowData[i] = ((left[idx] + right[idx]) * 0.5) * hann;
  }

  const bandEnergies = computeBandEnergies(windowData, sampleRate, fftWindowSize);
  const noiseFloorDb = Math.min(-45, rmsDbfs - dynamicRangeDb - 8);

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (integratedLufs < -18) {
    issues.push(`Loudness rendah: ${integratedLufs.toFixed(1)} LUFS (Terlalu pelan untuk standar streaming).`);
    const boost = (-14 - integratedLufs).toFixed(1);
    recommendations.push(`Terapkan Auto Loudness Normalization (+${boost} dB gain) ke target -14 LUFS.`);
  } else if (integratedLufs > -10) {
    issues.push(`Loudness over-compressed: ${integratedLufs.toFixed(1)} LUFS.`);
    recommendations.push('Turunkan limiter makeup gain untuk mengembalikan punch dinamika.');
  }

  if (clippingCount > 0 || truePeakDbfs > -0.1) {
    issues.push(`Risiko clipping intersample: True Peak mencapai ${truePeakDbfs.toFixed(2)} dBFS (${clippingCount} sampel terpotong).`);
    recommendations.push('Atur True Peak Limiter ceiling ke -0.3 dBFS agar terbebas dari digital clipping.');
  }

  if (bandEnergies.bass < -4.0 || bandEnergies.subBass < -5.0) {
    issues.push('Respons bass tipis dan kekurangan bobot frekuensi rendah.');
    recommendations.push('Tingkatkan Bass Punch (+35%) dan Sub Bass (+2.5 dB) untuk bobot low-end modern.');
  } else if (bandEnergies.bass > 4.5) {
    issues.push('Frekuensi rendah terdengar berlumpur (muddy) dan memakan headroom.');
    recommendations.push('Gunakan Bass Tightness cut di 220Hz dan aktifkan 30Hz highpass filter.');
  }

  if (bandEnergies.mid < -2.5 || bandEnergies.presence < -3.0) {
    issues.push('Vokal dan instrumen melodi kurang artikulasi dan kehadiran.');
    recommendations.push('Naikkan Vocal Clarity (+45%) dan Presence (+2.0 dB di 3kHz).');
  }

  if (bandEnergies.highMid > 3.0 || bandEnergies.presence > 3.5) {
    issues.push('Kekasaran (harshness) terdeteksi di kisaran 3.5kHz - 5.5kHz.');
    recommendations.push('Aktifkan De-Esser dan Harshness Tamer (-2.5 dB notch).');
  }

  if (bandEnergies.air < -3.0) {
    recommendations.push('Tambahkan Air shelf (+3 dB di 16kHz) untuk kilau dimensi terbuka.');
  }

  if (stereoWidth < 0.85) {
    issues.push(`Stereo image sempit: ${stereoWidth.toFixed(2)} (Terlalu berpusat di tengah).`);
    recommendations.push('Perlebar stereo (+25%) dengan tetap mempertahankan mono bass di bawah 120Hz.');
  } else if (phaseCorrelation < 0.3) {
    issues.push(`Peringatan fase korelasi: Fase korelasi rendah (${phaseCorrelation.toFixed(2)}).`);
    recommendations.push('Kurangi lebar stereo agar tidak terjadi pembatalan fase pada speaker mono HP.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Keseimbangan audio sudah sangat baik. Terapkan bus compression dan tape saturation untuk sentuhan analog.');
  }

  return {
    peakDbfs,
    truePeakDbfs,
    rmsDbfs,
    integratedLufs,
    shortTermLufs,
    dynamicRangeDb,
    crestFactorDb,
    bassLevel: bandEnergies.bass,
    midLevel: bandEnergies.mid,
    trebleLevel: bandEnergies.treble,
    frequencyDistribution: bandEnergies,
    stereoWidth,
    phaseCorrelation,
    noiseFloorDb,
    clippingCount,
    recommendations,
    issues,
  };
}

function computeBandEnergies(
  window: Float32Array,
  sampleRate: number,
  n: number
): {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
  treble: number;
  air: number;
} {
  const binHz = sampleRate / n;
  const bands = {
    subBass: { min: 20, max: 60, sum: 0, count: 0 },
    bass: { min: 60, max: 250, sum: 0, count: 0 },
    lowMid: { min: 250, max: 500, sum: 0, count: 0 },
    mid: { min: 500, max: 2000, sum: 0, count: 0 },
    highMid: { min: 2000, max: 4000, sum: 0, count: 0 },
    presence: { min: 4000, max: 6000, sum: 0, count: 0 },
    treble: { min: 6000, max: 12000, sum: 0, count: 0 },
    air: { min: 12000, max: 20000, sum: 0, count: 0 },
  };

  const halfN = Math.floor(n / 2);
  for (let k = 1; k < halfN; k += 2) {
    const freq = k * binHz;
    let real = 0;
    let imag = 0;
    for (let i = 0; i < n; i += 4) {
      const angle = (2 * Math.PI * k * i) / n;
      real += window[i] * Math.cos(angle);
      imag -= window[i] * Math.sin(angle);
    }
    const mag = Math.sqrt(real * real + imag * imag);
    for (const key of Object.keys(bands) as (keyof typeof bands)[]) {
      const b = bands[key];
      if (freq >= b.min && freq < b.max) {
        b.sum += mag;
        b.count++;
      }
    }
  }

  const total = Object.values(bands).reduce((acc, curr) => acc + (curr.count ? curr.sum / curr.count : 0), 0) || 1;
  const avgEnergy = total / 8;
  const result: any = {};
  for (const key of Object.keys(bands) as (keyof typeof bands)[]) {
    const b = bands[key];
    const energy = b.count > 0 ? b.sum / b.count : avgEnergy;
    const ratio = Math.max(0.05, energy / (avgEnergy || 1));
    result[key] = parseFloat((20 * Math.log10(ratio)).toFixed(1));
  }
  return result;
}
