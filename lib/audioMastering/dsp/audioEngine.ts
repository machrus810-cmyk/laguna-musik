import { MasteringSettings, AudioFileInfo, ExportConfig } from '../types';

function makeSaturationCurve(type: 'tube' | 'tape' | 'analog' | 'exciter', drive: number, samples = 4096): Float32Array {
  const curve = new Float32Array(samples);
  const normalizedDrive = Math.max(0, Math.min(100, drive)) / 100;
  const d = 1.0 + normalizedDrive * 1.5;
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / samples - 1;
    if (type === 'tube') {
      const y = x * d;
      const asym = y >= 0 ? Math.tanh(y) : Math.tanh(y * 0.92) + 0.08 * y * y;
      curve[i] = asym / (Math.tanh(d) || 1);
    } else if (type === 'tape') {
      const y = x * d;
      curve[i] = Math.tanh(y) / (Math.tanh(d) || 1);
    } else if (type === 'analog') {
      const y = x * d;
      const poly = (1.5 * y - 0.5 * Math.pow(y, 3)) / (1.5 * d - 0.5 * Math.pow(Math.min(d, 1.15), 3) || 1);
      curve[i] = Math.max(-1, Math.min(1, poly));
    } else {
      const y = x * d;
      curve[i] = (Math.tanh(y) + 0.05 * Math.sin(x * Math.PI)) / (Math.tanh(d) || 1);
    }
  }
  return curve;
}

function generateImpulseResponse(ctx: BaseAudioContext, duration: number, decay: number, dampingHz: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * Math.max(0.2, duration));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  const dampingFactor = Math.max(0.1, Math.min(0.95, dampingHz / 20000));
  let prevL = 0;
  let prevR = 0;
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.exp(-t * (decay * 3));
    const whiteL = (Math.random() * 2 - 1) * env;
    const whiteR = (Math.random() * 2 - 1) * env;
    prevL = prevL + dampingFactor * (whiteL - prevL);
    prevR = prevR + dampingFactor * (whiteR - prevR);
    left[i] = prevL;
    right[i] = prevR;
  }
  return impulse;
}

export class MasterwaveAudioEngine {
  private ctx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private playbackRate = 1.0;
  private volume = 1.0;
  private isMuted = false;

  private activeMode: 'original' | 'mastered' = 'mastered';
  private volumeMatchEnabled = true;
  private volumeMatchGain = 1.0;

  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  private fftAnalyser: AnalyserNode | null = null;
  private timeAnalyser: AnalyserNode | null = null;
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;

  private rumbleFilter: BiquadFilterNode | null = null;
  private eqNodes: BiquadFilterNode[] = [];
  private bassPunchNode: BiquadFilterNode | null = null;
  private bassTightNode: BiquadFilterNode | null = null;
  private subBassNode: BiquadFilterNode | null = null;
  private vocalClarityNode: BiquadFilterNode | null = null;
  private warmthNode: BiquadFilterNode | null = null;
  private harshnessNode: BiquadFilterNode | null = null;
  private highBoostNode: BiquadFilterNode | null = null;
  private deEsserNode: BiquadFilterNode | null = null;
  private airNode: BiquadFilterNode | null = null;
  private saturationNode: WaveShaperNode | null = null;
  private satDryGain: GainNode | null = null;
  private satWetGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private compMakeupGain: GainNode | null = null;

  private stereoMidGain: GainNode | null = null;
  private stereoSideGain: GainNode | null = null;

  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;

  private convolverNode: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;

  private limiterComp: DynamicsCompressorNode | null = null;
  private limiterClipper: WaveShaperNode | null = null;
  private normalizerGain: GainNode | null = null;

  public onPlaybackEnd?: () => void;
  public onTimeUpdate?: (currentTime: number) => void;

  constructor() {}

  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  public getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  public getCurrentTime(): number {
    if (!this.ctx || !this.isPlaying) {
      return this.pauseOffset;
    }
    const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    const duration = this.getDuration();
    if (duration > 0 && elapsed + this.pauseOffset >= duration) {
      return duration;
    }
    return (this.pauseOffset + elapsed) % (duration || 1);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getActiveMode(): 'original' | 'mastered' {
    return this.activeMode;
  }

  public async loadAudioFile(file: File): Promise<{ buffer: AudioBuffer; info: AudioFileInfo }> {
    const ctx = this.initContext();
    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.audioBuffer = decodedBuffer;
    this.pauseOffset = 0;
    this.isPlaying = false;
    const info: AudioFileInfo = {
      name: file.name,
      size: file.size,
      duration: decodedBuffer.duration,
      sampleRate: decodedBuffer.sampleRate,
      numberOfChannels: decodedBuffer.numberOfChannels,
      format: file.name.split('.').pop()?.toLowerCase() || 'wav',
      bitrate: Math.round((file.size * 8) / decodedBuffer.duration / 1000),
    };
    return { buffer: decodedBuffer, info };
  }

  public async loadAudioFromUrl(url: string, name = 'Track.mp3'): Promise<{ buffer: AudioBuffer; info: AudioFileInfo }> {
    const ctx = this.initContext();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load audio from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    this.audioBuffer = decodedBuffer;
    this.pauseOffset = 0;
    this.isPlaying = false;
    const info: AudioFileInfo = {
      name,
      size: arrayBuffer.byteLength,
      duration: decodedBuffer.duration,
      sampleRate: decodedBuffer.sampleRate,
      numberOfChannels: decodedBuffer.numberOfChannels,
      format: name.split('.').pop()?.toLowerCase() || 'mp3',
      bitrate: Math.round((arrayBuffer.byteLength * 8) / decodedBuffer.duration / 1000),
    };
    return { buffer: decodedBuffer, info };
  }

  public async generateDemoTrack(): Promise<{ buffer: AudioBuffer; info: AudioFileInfo }> {
    const ctx = this.initContext();
    const sampleRate = ctx.sampleRate;
    const duration = 16.0;
    const buffer = ctx.createBuffer(2, Math.floor(sampleRate * duration), sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const bpm = 120;
    const beatSec = 60 / bpm;
    const totalBeats = Math.floor(duration / beatSec);

    const chords = [
      [220, 261.63, 329.63, 440],
      [174.61, 220, 261.63, 349.23],
      [130.81, 164.81, 196, 261.63],
      [196, 246.94, 293.66, 392],
    ];

    for (let b = 0; b < totalBeats; b++) {
      const beatStartTime = b * beatSec;
      const beatStartSample = Math.floor(beatStartTime * sampleRate);
      const chordIndex = Math.floor(b / 4) % chords.length;
      const currentChord = chords[chordIndex];

      const kickLength = Math.floor(sampleRate * 0.4);
      for (let i = 0; i < kickLength && beatStartSample + i < left.length; i++) {
        const t = i / sampleRate;
        const freq = 50 + 110 * Math.exp(-t * 22);
        const env = Math.exp(-t * 9);
        const kickSample = Math.sin(2 * Math.PI * freq * t) * env * 0.65;
        left[beatStartSample + i] += kickSample;
        right[beatStartSample + i] += kickSample;
      }

      if (b % 2 === 1) {
        const snareLength = Math.floor(sampleRate * 0.28);
        for (let i = 0; i < snareLength && beatStartSample + i < left.length; i++) {
          const t = i / sampleRate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 16) * 0.35;
          const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 25) * 0.3;
          left[beatStartSample + i] += noise + tone;
          right[beatStartSample + i] += noise + tone;
        }
      }

      for (let sub = 0; sub < 2; sub++) {
        const hatStartSample = beatStartSample + Math.floor(sub * 0.5 * beatSec * sampleRate);
        const hatLength = Math.floor(sampleRate * 0.06);
        for (let i = 0; i < hatLength && hatStartSample + i < left.length; i++) {
          const t = i / sampleRate;
          const hatNoise = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.16;
          left[hatStartSample + i] += hatNoise * 0.8;
          right[hatStartSample + i] += hatNoise * 1.2;
        }
      }

      const rootFreq = currentChord[0] / 2;
      const bassLength = Math.floor(sampleRate * beatSec * 0.9);
      for (let i = 0; i < bassLength && beatStartSample + i < left.length; i++) {
        const t = i / sampleRate;
        const bassSample = (Math.sin(2 * Math.PI * rootFreq * t) + 0.25 * Math.sin(2 * Math.PI * rootFreq * 2 * t)) * Math.exp(-t * 2.5) * 0.45;
        left[beatStartSample + i] += bassSample;
        right[beatStartSample + i] += bassSample;
      }

      const note = currentChord[b % 4];
      const synthLength = Math.floor(sampleRate * beatSec);
      for (let i = 0; i < synthLength && beatStartSample + i < left.length; i++) {
        const t = i / sampleRate;
        const synthSample = (Math.sin(2 * Math.PI * note * t) + 0.3 * Math.sin(2 * Math.PI * (note * 1.5) * t)) * Math.exp(-t * 1.5) * 0.18;
        left[beatStartSample + i] += synthSample * 0.9;
        right[beatStartSample + i] += synthSample * 0.7;
      }
    }

    let maxVal = 0;
    for (let i = 0; i < left.length; i++) {
      if (Math.abs(left[i]) > maxVal) maxVal = Math.abs(left[i]);
      if (Math.abs(right[i]) > maxVal) maxVal = Math.abs(right[i]);
    }
    if (maxVal > 0.9) {
      const scale = 0.85 / maxVal;
      for (let i = 0; i < left.length; i++) {
        left[i] *= scale;
        right[i] *= scale;
      }
    }

    this.audioBuffer = buffer;
    this.pauseOffset = 0;
    this.isPlaying = false;
    const info: AudioFileInfo = {
      name: 'Laguna_Demo_Groove.wav',
      size: buffer.length * 4,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      numberOfChannels: 2,
      format: 'wav',
      bitrate: 1411,
    };
    return { buffer, info };
  }

  public setupGraph(settings: MasteringSettings) {
    const ctx = this.initContext();

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch (_) {}
    }

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();

    if (this.activeMode === 'original') {
      this.dryGain.gain.value = this.volumeMatchEnabled ? this.volumeMatchGain : 1.0;
      this.wetGain.gain.value = 0.0;
    } else {
      this.dryGain.gain.value = 0.0;
      this.wetGain.gain.value = 1.0;
    }

    this.fftAnalyser = ctx.createAnalyser();
    this.fftAnalyser.fftSize = 2048;
    this.fftAnalyser.smoothingTimeConstant = 0.8;
    this.timeAnalyser = ctx.createAnalyser();
    this.timeAnalyser.fftSize = 2048;

    const stereoSplitter = ctx.createChannelSplitter(2);
    this.leftAnalyser = ctx.createAnalyser();
    this.rightAnalyser = ctx.createAnalyser();
    this.leftAnalyser.fftSize = 512;
    this.rightAnalyser.fftSize = 512;
    stereoSplitter.connect(this.leftAnalyser, 0);
    stereoSplitter.connect(this.rightAnalyser, 1);

    this.masterGain.connect(this.fftAnalyser);
    this.fftAnalyser.connect(this.timeAnalyser);
    this.timeAnalyser.connect(stereoSplitter);
    this.masterGain.connect(ctx.destination);

    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);

    const dsp = this.buildDspNodes(ctx, settings);
    dsp.output.connect(this.wetGain);
  }

  private buildDspNodes(ctx: BaseAudioContext, settings: MasteringSettings): { input: AudioNode; output: AudioNode } {
    this.rumbleFilter = ctx.createBiquadFilter();
    this.rumbleFilter.type = 'highpass';
    this.rumbleFilter.frequency.value = settings.bassControl.lowCutHz || 30;
    this.rumbleFilter.Q.value = 0.707;
    let currentNode: AudioNode = this.rumbleFilter;

    this.eqNodes = settings.eqBands.map((band) => {
      const node = ctx.createBiquadFilter();
      node.type = band.type;
      node.frequency.value = band.freq;
      node.gain.value = settings.eqBypassed ? 0 : band.gain;
      node.Q.value = band.q;
      return node;
    });

    for (const eqNode of this.eqNodes) {
      currentNode.connect(eqNode);
      currentNode = eqNode;
    }

    this.subBassNode = ctx.createBiquadFilter();
    this.subBassNode.type = 'lowshelf';
    this.subBassNode.frequency.value = 50;
    this.subBassNode.gain.value = settings.bassControl.bypassed ? 0 : (settings.bassControl.subBassAmount / 100) * 3.5;

    this.bassPunchNode = ctx.createBiquadFilter();
    this.bassPunchNode.type = 'peaking';
    this.bassPunchNode.frequency.value = 85;
    this.bassPunchNode.Q.value = 1.4;
    this.bassPunchNode.gain.value = settings.bassControl.bypassed ? 0 : (settings.bassControl.bassPunch / 100) * 3.2;

    this.bassTightNode = ctx.createBiquadFilter();
    this.bassTightNode.type = 'peaking';
    this.bassTightNode.frequency.value = 220;
    this.bassTightNode.Q.value = 1.2;
    this.bassTightNode.gain.value = settings.bassControl.bypassed ? 0 : -(settings.bassControl.bassTightness / 100) * 2.2;

    currentNode.connect(this.subBassNode);
    this.subBassNode.connect(this.bassPunchNode);
    this.bassPunchNode.connect(this.bassTightNode);
    currentNode = this.bassTightNode;

    this.vocalClarityNode = ctx.createBiquadFilter();
    this.vocalClarityNode.type = 'peaking';
    this.vocalClarityNode.frequency.value = 2800;
    this.vocalClarityNode.Q.value = 1.2;
    this.vocalClarityNode.gain.value = settings.midControl.bypassed ? 0 : (settings.midControl.vocalClarity / 100) * 3.2;

    this.warmthNode = ctx.createBiquadFilter();
    this.warmthNode.type = 'peaking';
    this.warmthNode.frequency.value = 350;
    this.warmthNode.Q.value = 1.0;
    this.warmthNode.gain.value = settings.midControl.bypassed ? 0 : (settings.midControl.warmth / 100) * 2.0;

    this.harshnessNode = ctx.createBiquadFilter();
    this.harshnessNode.type = 'peaking';
    this.harshnessNode.frequency.value = 3800;
    this.harshnessNode.Q.value = 1.8;
    this.harshnessNode.gain.value = settings.midControl.bypassed ? 0 : -(settings.midControl.harshnessReduction / 100) * 2.0;

    currentNode.connect(this.vocalClarityNode);
    this.vocalClarityNode.connect(this.warmthNode);
    this.warmthNode.connect(this.harshnessNode);
    currentNode = this.harshnessNode;

    this.highBoostNode = ctx.createBiquadFilter();
    this.highBoostNode.type = 'peaking';
    this.highBoostNode.frequency.value = 8500;
    this.highBoostNode.Q.value = 1.0;
    this.highBoostNode.gain.value = settings.trebleControl.bypassed ? 0 : (settings.trebleControl.highBoost / 100) * 3.4;

    this.deEsserNode = ctx.createBiquadFilter();
    this.deEsserNode.type = 'peaking';
    this.deEsserNode.frequency.value = 6500;
    this.deEsserNode.Q.value = 2.0;
    this.deEsserNode.gain.value = settings.trebleControl.bypassed ? 0 : -(settings.trebleControl.deEsser / 100) * 2.0;

    this.airNode = ctx.createBiquadFilter();
    this.airNode.type = 'highshelf';
    this.airNode.frequency.value = 14000;
    this.airNode.gain.value = settings.trebleControl.bypassed ? 0 : (settings.trebleControl.air || 0) + (settings.trebleControl.highBoost / 100) * 2.5;

    currentNode.connect(this.highBoostNode);
    this.highBoostNode.connect(this.deEsserNode);
    this.deEsserNode.connect(this.airNode);
    currentNode = this.airNode;

    const satInput = ctx.createGain();
    const satDry = ctx.createGain();
    const satWet = ctx.createGain();
    const satOutput = ctx.createGain();
    const satCurve = makeSaturationCurve(settings.saturation.type, settings.saturation.drive);
    this.saturationNode = ctx.createWaveShaper();
    this.saturationNode.curve = satCurve as any;
    this.saturationNode.oversample = '4x';
    const wetRatio = settings.saturation.bypassed ? 0 : (settings.saturation.mix / 100) * 0.25;
    satDry.gain.value = 1.0;
    satWet.gain.value = wetRatio;
    this.satDryGain = satDry;
    this.satWetGain = satWet;
    satInput.connect(satDry);
    satInput.connect(this.saturationNode);
    this.saturationNode.connect(satWet);
    satDry.connect(satOutput);
    satWet.connect(satOutput);
    currentNode.connect(satInput);
    currentNode = satOutput;

    this.masterCompressor = ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = settings.compressor.bypassed ? 0 : settings.compressor.threshold;
    this.masterCompressor.knee.value = settings.compressor.knee || 16;
    this.masterCompressor.ratio.value = settings.compressor.bypassed ? 1 : settings.compressor.ratio;
    this.masterCompressor.attack.value = settings.compressor.attack || 0.035;
    this.masterCompressor.release.value = settings.compressor.release || 0.15;
    this.compMakeupGain = ctx.createGain();
    const makeupDb = settings.compressor.bypassed ? 0 : Math.min(2.0, settings.compressor.makeupGain);
    this.compMakeupGain.gain.value = Math.pow(10, makeupDb / 20);
    currentNode.connect(this.masterCompressor);
    this.masterCompressor.connect(this.compMakeupGain);
    currentNode = this.compMakeupGain;

    const stereoSplitter = ctx.createChannelSplitter(2);
    const stereoMerger = ctx.createChannelMerger(2);
    const midGain = ctx.createGain();
    const sideGain = ctx.createGain();
    const widthVal = settings.stereo.bypassed ? 1.0 : settings.stereo.width;
    midGain.gain.value = 1.0;
    sideGain.gain.value = widthVal;
    this.stereoMidGain = midGain;
    this.stereoSideGain = sideGain;

    const leftInGain = ctx.createGain();
    const rightInGain = ctx.createGain();
    currentNode.connect(stereoSplitter);
    stereoSplitter.connect(leftInGain, 0);
    stereoSplitter.connect(rightInGain, 1);

    const midSumL = ctx.createGain();
    const midSumR = ctx.createGain();
    midSumL.gain.value = 0.5;
    midSumR.gain.value = 0.5;
    leftInGain.connect(midSumL);
    rightInGain.connect(midSumR);
    midSumL.connect(midGain);
    midSumR.connect(midGain);

    const sideDiffL = ctx.createGain();
    const sideDiffR = ctx.createGain();
    sideDiffL.gain.value = 0.5;
    sideDiffR.gain.value = -0.5;
    leftInGain.connect(sideDiffL);
    rightInGain.connect(sideDiffR);
    sideDiffL.connect(sideGain);
    sideDiffR.connect(sideGain);

    const outLeftMid = ctx.createGain();
    const outLeftSide = ctx.createGain();
    const outRightMid = ctx.createGain();
    const outRightSide = ctx.createGain();
    outLeftMid.gain.value = 1.0;
    outLeftSide.gain.value = 1.0;
    outRightMid.gain.value = 1.0;
    outRightSide.gain.value = -1.0;

    midGain.connect(outLeftMid);
    sideGain.connect(outLeftSide);
    outLeftMid.connect(stereoMerger, 0, 0);
    outLeftSide.connect(stereoMerger, 0, 0);
    midGain.connect(outRightMid);
    sideGain.connect(outRightSide);
    outRightMid.connect(stereoMerger, 0, 1);
    outRightSide.connect(stereoMerger, 0, 1);
    currentNode = stereoMerger;

    const delayInput = ctx.createGain();
    const delayDry = ctx.createGain();
    const delayWet = ctx.createGain();
    const delayOutput = ctx.createGain();
    const delayNode = ctx.createDelay(2.0);
    const delayFeedback = ctx.createGain();
    const delayFilter = ctx.createBiquadFilter();
    delayNode.delayTime.value = Math.max(0.05, Math.min(1.0, settings.delay.time || 0.22));
    delayFeedback.gain.value = Math.min(0.5, settings.delay.feedback || 0.2);
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 3800;
    const delayMix = settings.delay.enabled ? Math.min(0.38, settings.delay.mix) : 0;
    delayDry.gain.value = 1.0;
    delayWet.gain.value = delayMix;
    this.delayDryGain = delayDry;
    this.delayWetGain = delayWet;
    this.delayNode = delayNode;
    this.delayFeedbackGain = delayFeedback;
    delayInput.connect(delayDry);
    delayDry.connect(delayOutput);
    delayInput.connect(delayNode);
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(delayWet);
    delayWet.connect(delayOutput);
    currentNode.connect(delayInput);
    currentNode = delayOutput;

    const reverbInput = ctx.createGain();
    const reverbDry = ctx.createGain();
    const reverbWet = ctx.createGain();
    const reverbOutput = ctx.createGain();
    const reverbBuffer = generateImpulseResponse(ctx, settings.reverb.decay || 1.8, 1.5, settings.reverb.damping || 8000);
    this.convolverNode = ctx.createConvolver();
    this.convolverNode.buffer = reverbBuffer;
    const revMix = settings.reverb.enabled ? settings.reverb.mix / 100 : 0;
    reverbDry.gain.value = 1.0 - revMix * 0.3;
    reverbWet.gain.value = revMix;
    this.reverbDryGain = reverbDry;
    this.reverbWetGain = reverbWet;
    reverbInput.connect(reverbDry);
    reverbInput.connect(this.convolverNode);
    this.convolverNode.connect(reverbWet);
    reverbDry.connect(reverbOutput);
    reverbWet.connect(reverbOutput);
    currentNode.connect(reverbInput);
    currentNode = reverbOutput;

    this.limiterComp = ctx.createDynamicsCompressor();
    this.limiterComp.threshold.value = settings.limiter.bypassed ? 0 : settings.limiter.threshold;
    this.limiterComp.knee.value = 8.0;
    this.limiterComp.ratio.value = 10.0;
    this.limiterComp.attack.value = 0.003;
    this.limiterComp.release.value = Math.max(0.05, settings.limiter.release);

    const ceilingLinear = Math.pow(10, settings.limiter.ceiling / 20);
    const clipperSamples = 2048;
    const clipperCurve = new Float32Array(clipperSamples);
    const softThreshold = 0.88 * ceilingLinear;
    for (let i = 0; i < clipperSamples; i++) {
      const x = (i * 2) / clipperSamples - 1;
      const absX = Math.abs(x);
      if (absX <= softThreshold) {
        clipperCurve[i] = x;
      } else {
        const excess = absX - softThreshold;
        const maxExcess = 1.0 - softThreshold;
        const norm = Math.min(1.0, excess / (maxExcess || 0.001));
        const compressed = (norm - (norm * norm) * 0.5) * (ceilingLinear - softThreshold);
        clipperCurve[i] = Math.sign(x) * (softThreshold + compressed);
      }
    }
    this.limiterClipper = ctx.createWaveShaper();
    this.limiterClipper.curve = clipperCurve as any;
    currentNode.connect(this.limiterComp);
    this.limiterComp.connect(this.limiterClipper);
    currentNode = this.limiterClipper;

    this.normalizerGain = ctx.createGain();
    const targetGainDb = settings.normalizeLoudness ? settings.outputGain : 0;
    this.normalizerGain.gain.value = Math.pow(10, targetGainDb / 20);
    currentNode.connect(this.normalizerGain);
    currentNode = this.normalizerGain;

    return { input: this.rumbleFilter, output: currentNode };
  }

  public play(settings: MasteringSettings) {
    if (this.isPlaying || !this.audioBuffer) return;
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    this.setupGraph(settings);
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.value = this.playbackRate;
    if (this.dryGain && this.rumbleFilter) {
      this.sourceNode.connect(this.dryGain);
      this.sourceNode.connect(this.rumbleFilter);
    }
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        if (this.onPlaybackEnd) this.onPlaybackEnd();
      }
    };
    const offset = Math.min(this.pauseOffset, this.audioBuffer.duration);
    this.startTime = ctx.currentTime;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;
  }

  public pause() {
    if (!this.isPlaying || !this.sourceNode || !this.ctx) return;
    const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    this.pauseOffset = (this.pauseOffset + elapsed) % (this.getDuration() || 1);
    this.isPlaying = false;
    try {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    } catch (_) {}
    this.sourceNode = null;
  }

  public stop() {
    this.pause();
    this.pauseOffset = 0;
  }

  public seek(timeSeconds: number, settings: MasteringSettings) {
    const wasPlaying = this.isPlaying;
    if (this.isPlaying) {
      this.pause();
    }
    this.pauseOffset = Math.max(0, Math.min(timeSeconds, this.getDuration()));
    if (wasPlaying) {
      this.play(settings);
    }
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.sourceNode && this.ctx) {
      this.sourceNode.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public setABMode(mode: 'original' | 'mastered') {
    this.activeMode = mode;
    if (!this.ctx || !this.dryGain || !this.wetGain) return;
    const now = this.ctx.currentTime;
    const fadeTime = 0.015;
    if (mode === 'original') {
      const targetDry = this.volumeMatchEnabled ? this.volumeMatchGain : 1.0;
      this.dryGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.cancelScheduledValues(now);
      this.dryGain.gain.linearRampToValueAtTime(targetDry, now + fadeTime);
      this.wetGain.gain.linearRampToValueAtTime(0, now + fadeTime);
    } else {
      this.dryGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.cancelScheduledValues(now);
      this.dryGain.gain.linearRampToValueAtTime(0, now + fadeTime);
      this.wetGain.gain.linearRampToValueAtTime(1.0, now + fadeTime);
    }
  }

  public setVolumeMatch(enabled: boolean, gainFactor = 1.0) {
    this.volumeMatchEnabled = enabled;
    this.volumeMatchGain = gainFactor;
    if (this.activeMode === 'original' && this.dryGain && this.ctx) {
      this.dryGain.gain.setValueAtTime(enabled ? gainFactor : 1.0, this.ctx.currentTime);
    }
  }

  public updateParameters(settings: MasteringSettings) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.eqNodes.length === settings.eqBands.length) {
      settings.eqBands.forEach((band, idx) => {
        const node = this.eqNodes[idx];
        node.gain.setValueAtTime(settings.eqBypassed ? 0 : band.gain, now);
        node.frequency.setValueAtTime(band.freq, now);
        node.Q.setValueAtTime(band.q, now);
      });
    }

    if (this.rumbleFilter) {
      this.rumbleFilter.frequency.setValueAtTime(settings.bassControl.lowCutHz || 28, now);
    }
    if (this.subBassNode) {
      const g = settings.bassControl.bypassed ? 0 : (settings.bassControl.subBassAmount / 100) * 3.5;
      this.subBassNode.gain.setValueAtTime(g, now);
    }
    if (this.bassPunchNode) {
      const g = settings.bassControl.bypassed ? 0 : (settings.bassControl.bassPunch / 100) * 3.2;
      this.bassPunchNode.gain.setValueAtTime(g, now);
    }
    if (this.bassTightNode) {
      const g = settings.bassControl.bypassed ? 0 : -(settings.bassControl.bassTightness / 100) * 2.2;
      this.bassTightNode.gain.setValueAtTime(g, now);
    }

    if (this.vocalClarityNode) {
      const g = settings.midControl.bypassed ? 0 : (settings.midControl.vocalClarity / 100) * 3.2;
      this.vocalClarityNode.gain.setValueAtTime(g, now);
    }
    if (this.warmthNode) {
      const g = settings.midControl.bypassed ? 0 : (settings.midControl.warmth / 100) * 2.0;
      this.warmthNode.gain.setValueAtTime(g, now);
    }
    if (this.harshnessNode) {
      const g = settings.midControl.bypassed ? 0 : -(settings.midControl.harshnessReduction / 100) * 2.0;
      this.harshnessNode.gain.setValueAtTime(g, now);
    }

    if (this.highBoostNode) {
      const g = settings.trebleControl.bypassed ? 0 : (settings.trebleControl.highBoost / 100) * 3.4;
      this.highBoostNode.gain.setValueAtTime(g, now);
    }
    if (this.deEsserNode) {
      const g = settings.trebleControl.bypassed ? 0 : -(settings.trebleControl.deEsser / 100) * 2.0;
      this.deEsserNode.gain.setValueAtTime(g, now);
    }
    if (this.airNode) {
      const g = settings.trebleControl.bypassed ? 0 : (settings.trebleControl.air || 0) + (settings.trebleControl.highBoost / 100) * 2.5;
      this.airNode.gain.setValueAtTime(g, now);
    }

    if (this.saturationNode) {
      this.saturationNode.curve = makeSaturationCurve(settings.saturation.type, settings.saturation.drive) as any;
    }
    if (this.satWetGain && this.satDryGain) {
      const wetRatio = settings.saturation.bypassed ? 0 : (settings.saturation.mix / 100) * 0.25;
      this.satDryGain.gain.setValueAtTime(1.0, now);
      this.satWetGain.gain.setValueAtTime(wetRatio, now);
    }

    if (this.masterCompressor) {
      this.masterCompressor.threshold.setValueAtTime(settings.compressor.bypassed ? 0 : settings.compressor.threshold, now);
      this.masterCompressor.ratio.setValueAtTime(settings.compressor.bypassed ? 1 : settings.compressor.ratio, now);
      this.masterCompressor.attack.setValueAtTime(settings.compressor.attack || 0.035, now);
      this.masterCompressor.release.setValueAtTime(settings.compressor.release || 0.15, now);
    }
    if (this.compMakeupGain) {
      const makeupDb = settings.compressor.bypassed ? 0 : Math.min(3.0, settings.compressor.makeupGain);
      this.compMakeupGain.gain.setValueAtTime(Math.pow(10, makeupDb / 20), now);
    }

    if (this.stereoSideGain) {
      const widthVal = settings.stereo.bypassed ? 1.0 : settings.stereo.width;
      this.stereoSideGain.gain.setValueAtTime(widthVal, now);
    }

    if (this.delayNode && this.delayFeedbackGain && this.delayDryGain && this.delayWetGain) {
      this.delayNode.delayTime.setValueAtTime(Math.max(0.05, Math.min(1.0, settings.delay.time || 0.22)), now);
      this.delayFeedbackGain.gain.setValueAtTime(Math.min(0.5, settings.delay.feedback || 0.2), now);
      const delayMix = settings.delay.enabled ? Math.min(0.38, settings.delay.mix) : 0;
      this.delayDryGain.gain.setValueAtTime(1.0, now);
      this.delayWetGain.gain.setValueAtTime(delayMix, now);
    }

    if (this.reverbWetGain && this.reverbDryGain) {
      const revMix = settings.reverb.enabled ? settings.reverb.mix / 100 : 0;
      this.reverbDryGain.gain.setValueAtTime(1.0 - revMix * 0.3, now);
      this.reverbWetGain.gain.setValueAtTime(revMix, now);
    }

    if (this.limiterComp) {
      this.limiterComp.threshold.setValueAtTime(settings.limiter.bypassed ? 0 : settings.limiter.threshold, now);
      this.limiterComp.release.setValueAtTime(settings.limiter.release, now);
    }

    if (this.normalizerGain) {
      const targetGainDb = settings.normalizeLoudness ? settings.outputGain : 0;
      this.normalizerGain.gain.setValueAtTime(Math.pow(10, targetGainDb / 20), now);
    }
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.fftAnalyser) {
      this.fftAnalyser.getByteFrequencyData(array as any);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.timeAnalyser) {
      this.timeAnalyser.getByteTimeDomainData(array as any);
    }
  }

  public getGainReduction(): number {
    if (!this.masterCompressor) return 0;
    return this.masterCompressor.reduction || 0;
  }

  public getStereoMetrics(): { correlation: number; leftRms: number; rightRms: number; balance: number } {
    if (!this.leftAnalyser || !this.rightAnalyser) {
      return { correlation: 1, leftRms: 0, rightRms: 0, balance: 0 };
    }
    const size = this.leftAnalyser.fftSize;
    const lData = new Float32Array(size);
    const rData = new Float32Array(size);
    this.leftAnalyser.getFloatTimeDomainData(lData as any);
    this.rightAnalyser.getFloatTimeDomainData(rData as any);

    let sumL2 = 0;
    let sumR2 = 0;
    let sumLR = 0;
    for (let i = 0; i < size; i++) {
      const l = lData[i];
      const r = rData[i];
      sumL2 += l * l;
      sumR2 += r * r;
      sumLR += l * r;
    }
    const denom = Math.sqrt(sumL2 * sumR2);
    const correlation = denom > 1e-6 ? Math.max(-1, Math.min(1, sumLR / denom)) : 1;
    const leftRms = Math.sqrt(sumL2 / size);
    const rightRms = Math.sqrt(sumR2 / size);
    const balance = (rightRms - leftRms) / (leftRms + rightRms + 1e-5);
    return {
      correlation,
      leftRms: 20 * Math.log10(Math.max(1e-5, leftRms)),
      rightRms: 20 * Math.log10(Math.max(1e-5, rightRms)),
      balance: Math.max(-1, Math.min(1, balance)),
    };
  }

  public getLevels(): { peakRms: number; leftRms: number; rightRms: number } {
    if (!this.leftAnalyser || !this.rightAnalyser || !this.isPlaying) {
      return { peakRms: -60, leftRms: -60, rightRms: -60 };
    }
    const metrics = this.getStereoMetrics();
    const peak = Math.max(metrics.leftRms, metrics.rightRms);
    return {
      peakRms: Number.isFinite(peak) ? peak : -60,
      leftRms: Number.isFinite(metrics.leftRms) ? metrics.leftRms : -60,
      rightRms: Number.isFinite(metrics.rightRms) ? metrics.rightRms : -60,
    };
  }

  public async renderMaster(
    settings: MasteringSettings,
    config: ExportConfig,
    onProgress?: (pct: number) => void
  ): Promise<Blob> {
    if (!this.audioBuffer) {
      throw new Error('No audio buffer to render');
    }
    const sampleRate = config.sampleRate || this.audioBuffer.sampleRate;
    const duration = this.audioBuffer.duration;
    const length = Math.floor(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
    const offlineSource = offlineCtx.createBufferSource();
    offlineSource.buffer = this.audioBuffer;
    const { input, output } = this.buildDspNodes(offlineCtx, settings);
    offlineSource.connect(input);
    output.connect(offlineCtx.destination);
    offlineSource.start(0);

    const interval = setInterval(() => {
      if (onProgress && offlineCtx.currentTime < duration) {
        onProgress(Math.min(95, Math.round((offlineCtx.currentTime / duration) * 100)));
      }
    }, 150);

    const renderedBuffer = await offlineCtx.startRendering();
    clearInterval(interval);
    if (onProgress) onProgress(100);
    return encodeWav(renderedBuffer, config.bitDepth);
  }
}

export function encodeWav(audioBuffer: AudioBuffer, bitDepth: 16 | 24 | 32 = 16): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, bitDepth === 32 ? 3 : 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      sample = Math.max(-1, Math.min(1, sample));
      if (bitDepth === 16) {
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      } else if (bitDepth === 24) {
        const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      } else {
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
