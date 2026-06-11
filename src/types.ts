export interface SourceSong {
  Name: string;
  Artist: string;
  File: string;
  OriginalBPM: number;
  BPM: number;
  Length: number;
  PlayheadPosition: number;
  PlaybackSpeed: number;
  KeySemitoneOffset: number;
  KeyCentOffset: number;
  SyncToHost: boolean;
  BpmMultiplier: number;
  Key: string;
  Analysis: number;
  GlideDuration: number;
  GlideMode: string;
  TempoMap: string;
  DownbeatIndex: number;
  SampleRegions: string;
}

export interface SlicePad {
  Favourite: boolean;
  slice?: {
    StartPosition: number;
    EndPosition: number;
    Color: string;
    KeySemitoneOffset: number;
    PlaybackSpeed: number;
    Level: number;
    Attack: number;
    Release: number;
    FilterFrequency: number;
    Reverse: boolean;
    OutputChannel: number;
    Name: string;
  };
}

export interface SeratoProject {
  Version: number;
  VaporwaveWaveformsActive: boolean;
  VelocitySensitive: boolean;
  Quantize: boolean;
  sourceSong?: SourceSong;
  slicePalette?: {
    Momentary: boolean;
    PolyphonicMode: boolean;
    AutoSetModeState: string;
    SlicerSliceLength: string;
    CurrentSlicerSlicePositions: number[];
    KeyboardModeIndex: number;
    SelectedParameterTab: number;
    slicePad: SlicePad[];
  };
  SelectedStems?: string[];
  StemsFormatVersion?: number;
  StemsAlgorithmVersion?: number;
  ViewPosition?: number;
  ViewDetail?: number;
  metronome?: { Enabled: boolean };
}

export interface Stem {
  index: number;
  assignment: string;
  offset: number;
  size: number;
  data: Uint8Array;
}

export interface SeratoStemsFile {
  version: string;
  totalStems: number;
  sampleRate: number;
  totalSamples: number;
  durationSeconds: number;
  stems: Stem[];
}

export const STEM_MAPPING: Record<number, string> = {
  1: 'drums',
  2: 'bass',
  3: 'other',
  4: 'vocals',
};
