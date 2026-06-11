export const $ = id => document.getElementById(id);
export const audioPlayer = document.getElementById('audio-player');

export const state = {
  audioFile: null, audioUrl: null, audioBuffer: null,
  waveform: null,
  stemsData: null, projectData: null,
  regions: [], pads: null, currentBank: 0,
  activePadIdx: null, activeRegionIdx: null,
  activePad: null,
  syncActive: false,
  stemsMode: false,
  stemsBuffers: [],
  stemsGains: [],
  stemsMuted: [],
  stemsCtx: null,
  stemsSources: {},
  stemsCurrentTime: 0,
  stemsPlaying: false,
  stemsStartTime: 0,
  stemsAnimId: null,
};

export function getCurrentTime() {
  return state.stemsMode ? state.stemsCurrentTime : audioPlayer.currentTime;
}
