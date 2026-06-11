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
  triggerCtx: null,
  cursorActive: false,
  cursorTime: 0,
  cursorBase: 0,
  cursorAnimId: null,
};

export function getCurrentTime() {
  if (state.cursorActive) return state.cursorTime;
  return state.stemsMode ? state.stemsCurrentTime : audioPlayer.currentTime;
}
