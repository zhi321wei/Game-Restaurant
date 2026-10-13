define("audio", function (module, exports, require) {
/**
 * 浪漫餐厅 · 背景音乐
 *
 * 单例 InnerAudioContext，循环播放 bg.mp3。
 * 开关 / 音量 / 静音三项设置持久化到 Storage（rr_audio_v1），下次进游戏自动恢复。
 *
 * 用法：
 *   const audio = require('../../utils/audio.js');
 *   audio.init();                 // 全局调一次（app.js onLaunch）
 *   audio.play();                 // 页面 onShow 里调，兼作自动播放被拦截后的重试
 *   audio.setVolume(0.6);
 *   audio.setOn(false);
 */
const KEY = 'rr_audio_v1';

// 音乐文件放在 miniprogram/assets/audio/bg.mp3（1.86 MB，占主包 2 MB 限额的大头）。
// 如果后续主包超 2 MB：把 mp3 传到自己的 CDN / 云存储，把这里改成 https 地址即可，其余代码不用动。
const SRC = 'assets/audio/bg.mp3';

// 音效：合成成功 / 交付订单。短 WAV（16kHz 单声道，共约 20 KB），随用随播。
const SFX = {
  merge: 'assets/audio/sfx_merge.wav',
  deliver: 'assets/audio/sfx_deliver.wav'
};

let ctx = null;
let loaded = false;
let playing = false;
const sfxCtx = {};
const settings = { on: true, muted: false, volume: 0.6, sfx: true };

// ---------------------------------------------------------------- 设置存取
function loadSettings() {
  if (loaded) return;
  loaded = true;
  try {
    const r = wx.getStorageSync(KEY);
    if (r && typeof r === 'object') {
      if (typeof r.on === 'boolean') settings.on = r.on;
      if (typeof r.muted === 'boolean') settings.muted = r.muted;
      if (typeof r.sfx === 'boolean') settings.sfx = r.sfx;
      if (typeof r.volume === 'number' && !isNaN(r.volume)) {
        settings.volume = Math.max(0, Math.min(1, r.volume));
      }
    }
  } catch (e) {}
}

function persist() {
  try {
    wx.setStorageSync(KEY, {
      on: settings.on,
      muted: settings.muted,
      volume: settings.volume,
      sfx: settings.sfx
    });
  } catch (e) {}
}

/** 当前应有的音量（关 / 静音 时为 0） */
function effVolume() {
  if (!settings.on || settings.muted) return 0;
  return settings.volume;
}

/** 当前是否应该出声 */
function shouldPlay() {
  return settings.on && !settings.muted;
}

// ---------------------------------------------------------------- 播放器
function ensure() {
  loadSettings();
  if (ctx) return ctx;
  try {
    // iOS：不跟随物理静音键，否则拨了静音就没声音
    wx.setInnerAudioOption({ obeyMuteSwitch: false });
  } catch (e) {}
  try {
    ctx = wx.createInnerAudioContext();
  } catch (e) {
    ctx = null;
    return null;
  }
  ctx.src = SRC;
  ctx.loop = true;
  ctx.volume = effVolume();
  ctx.onPlay(() => { playing = true; });
  ctx.onPause(() => { playing = false; });
  ctx.onStop(() => { playing = false; });
  ctx.onEnded(() => { playing = false; });
  ctx.onError(() => { playing = false; });
  return ctx;
}

/** 初始化：建好播放器并按要求起播。整个小程序生命周期调一次即可 */
function init() {
  const c = ensure();
  if (!c) return false;
  if (shouldPlay()) {
    c.volume = effVolume();
    try { c.play(); } catch (e) {}
  }
  return true;
}

/**
 * 播放。重复调用是安全的——
 * 部分机型（尤其 iOS）冷启动会拦截自动播放，可在页面 onShow / 用户首次交互后再调一次。
 */
function play() {
  const c = ensure();
  if (!c) return false;
  if (!shouldPlay()) return false;
  c.volume = effVolume();
  if (!playing) {
    try { c.play(); } catch (e) {}
  }
  return true;
}

function pause() {
  if (!ctx) return;
  try { ctx.pause(); } catch (e) {}
}

/** 按当前设置同步播放/暂停与音量 */
function apply() {
  const c = ensure();
  if (!c) return;
  c.volume = effVolume();
  if (shouldPlay()) {
    if (!playing) {
      try { c.play(); } catch (e) {}
    }
  } else if (playing) {
    try { c.pause(); } catch (e) {}
  }
}

// ---------------------------------------------------------------- 对外设置接口
function setOn(v) {
  settings.on = !!v;
  persist();
  apply();
  return settings.on;
}

function toggleOn() {
  return setOn(!settings.on);
}

function setMuted(v) {
  settings.muted = !!v;
  persist();
  apply();
  return settings.muted;
}

function toggleMuted() {
  return setMuted(!settings.muted);
}

function setVolume(v) {
  const n = Number(v);
  if (isNaN(n)) return settings.volume;
  settings.volume = Math.max(0, Math.min(1, n));
  persist();
  const c = ensure();
  if (c) c.volume = effVolume();
  return settings.volume;
}

/** 拖动音量条时的实时预览：不落盘，只改音量 */
function previewVolume(v) {
  const n = Number(v);
  if (isNaN(n)) return;
  const vol = Math.max(0, Math.min(1, n));
  const c = ensure();
  if (c) c.volume = settings.on && !settings.muted ? vol : 0;
}

function get() {
  loadSettings();
  return {
    on: settings.on,
    muted: settings.muted,
    volume: settings.volume,
    sfx: settings.sfx
  };
}

// ---------------------------------------------------------------- 音效
/** 音效音量：跟着总音量走，静音时为 0 */
function sfxVolume() {
  loadSettings();
  if (settings.muted) return 0;
  return settings.volume;
}

/** 每种音效一个常驻播放器，避免频繁创建销毁 */
function ensureSfx(name) {
  const src = SFX[name];
  if (!src) return null;
  if (sfxCtx[name]) return sfxCtx[name];
  try {
    const c = wx.createInnerAudioContext();
    c.src = src;
    c.loop = false;
    c.volume = sfxVolume();
    sfxCtx[name] = c;
    return c;
  } catch (e) {
    return null;
  }
}

/**
 * 播一个音效。可传 'merge'（合成）/ 'deliver'（交付）。
 * 连点时先 stop 再 play，保证每次都从头出声。
 */
function playSfx(name) {
  loadSettings();
  if (!settings.sfx || settings.muted) return false;
  const c = ensureSfx(name);
  if (!c) return false;
  c.volume = sfxVolume();
  try {
    c.stop();
    c.play();
  } catch (e) {}
  return true;
}

function setSfx(v) {
  settings.sfx = !!v;
  persist();
  return settings.sfx;
}

function toggleSfx() {
  return setSfx(!settings.sfx);
}

function isPlaying() {
  return playing;
}

module.exports = {
  KEY, SRC, SFX,
  init, play, pause, apply,
  setOn, toggleOn, setMuted, toggleMuted,
  setVolume, previewVolume,
  playSfx, setSfx, toggleSfx,
  get, isPlaying
};

});
