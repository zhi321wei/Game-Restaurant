/* wx API 的 Web 端 shim：让小程序业务代码（store.js / audio.js / 页面逻辑）几乎不改就能跑 */
(function () {
  function audioCtx() {
    var a = new Audio();
    a.preload = 'auto';
    return {
      _a: a,
      obeyMuteSwitch: false,
      set src(v) { a.src = v; },
      get src() { return a.src; },
      set loop(v) { a.loop = !!v; },
      get loop() { return a.loop; },
      set volume(v) { try { a.volume = Math.max(0, Math.min(1, v)); } catch (e) {} },
      get volume() { return a.volume; },
      autoplay: false,
      play: function () { var p = a.play(); if (p && p.catch) p.catch(function () {}); },
      pause: function () { a.pause(); },
      stop: function () { a.pause(); try { a.currentTime = 0; } catch (e) {} },
      seek: function (t) { try { a.currentTime = t; } catch (e) {} },
      onCanplay: function (cb) { a.addEventListener('canplay', cb); },
      onPlay: function (cb) { a.addEventListener('play', cb); },
      onPause: function (cb) { a.addEventListener('pause', cb); },
      onStop: function (cb) { a.addEventListener('pause', cb); },
      onWaiting: function (cb) { a.addEventListener('waiting', cb); },
      onSeeked: function (cb) { a.addEventListener('seeked', cb); },
      offCanplay: function () {},
      offPlay: function () {},
      offPause: function () {},
      offStop: function () {},
      offError: function () {},
      offEnded: function () {},
      onError: function (cb) { a.addEventListener('error', function () { cb({ errMsg: 'audio error' }); }); },
      onEnded: function (cb) { a.addEventListener('ended', cb); },
      onTimeUpdate: function (cb) { a.addEventListener('timeupdate', cb); },
      offCanplay: function () {},
      destroy: function () { a.pause(); a.removeAttribute('src'); }
    };
  }

  /* 存档：优先 localStorage；某些 WebView 对 file:// 源禁用 localStorage，
     此时退回内存存储（本局游戏照常，关掉 App 后丢失，但不至于崩溃）。 */
  var mem = {};
  var canUseLocal = (function () {
    try {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      return true;
    } catch (e) { return false; }
  })();

  window.wx = {
    getStorageSync: function (k) {
      if (!canUseLocal) return k in mem ? mem[k] : '';
      try {
        var v = localStorage.getItem(k);
        return v == null ? '' : JSON.parse(v);
      } catch (e) { return ''; }
    },
    setStorageSync: function (k, v) {
      if (!canUseLocal) { mem[k] = v; return; }
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; }
    },
    removeStorageSync: function (k) {
      if (!canUseLocal) { delete mem[k]; return; }
      try { localStorage.removeItem(k); } catch (e) {}
    },

    getSystemInfoSync: function () {
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        statusBarHeight: 0,
        safeArea: { top: 0, bottom: window.innerHeight, height: window.innerHeight, left: 0, right: window.innerWidth },
        pixelRatio: window.devicePixelRatio || 1,
        platform: 'android'
      };
    },

    createInnerAudioContext: audioCtx,
    setInnerAudioOption: function () {},

    vibrateShort: function () { if (navigator.vibrate) navigator.vibrate(15); },
    vibrateLong: function () { if (navigator.vibrate) navigator.vibrate(60); },

    navigateTo: function (o) { RR.go(o.url); },
    redirectTo: function (o) { RR.go(o.url); },
    switchTab: function (o) { RR.go(o.url); },
    navigateBack: function () { RR.back(); },

    showToast: function (o) {
      var t = document.getElementById('wx-toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'wx-toast';
        document.body.appendChild(t);
      }
      t.textContent = (o && o.title) || '';
      t.className = 'show';
      clearTimeout(t._tm);
      t._tm = setTimeout(function () { t.className = ''; }, (o && o.duration) || 1800);
    },

    setClipboardData: function (o) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String((o && o.data) || '')).catch(function () {});
      }
      o && o.success && o.success();
    },

    nextTick: function (cb) { setTimeout(cb, 0); }
  };
})();
