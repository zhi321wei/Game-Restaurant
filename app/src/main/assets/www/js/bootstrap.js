/* 模块加载器 + 全局命名空间 RR */
window.__modules = {};
window.define = function (name, factory) {
  var m = { exports: {} };
  factory(m, m.exports, window.require);
  window.__modules[name] = m.exports;
};
window.require = function (path) {
  var key = String(path).split('/').pop().replace(/\.js$/, '');
  if (!(key in window.__modules)) throw new Error('module not found: ' + key + ' (from ' + path + ')');
  return window.__modules[key];
};

/* RR：路由与页面注册
 * 页面契约：每个 page-*.js 赋值 RR.pages.<name> = {
 *   el:        页面容器（#screen-<name>，框架在 init 前注入）
 *   init():    首次进入时调用一次（渲染静态结构、绑定事件）
 *   onShow():  每次切到该页时调用（刷新数据）
 *   onHide():  切走时调用（停计时器等，可选）
 * }
 * tab 页：game / decor / album（互相切换，栈式回退）
 * overlay 页：story（盖在当前 tab 上，返回时底下的 tab 刷新）
 */
window.RR = {
  pages: {},
  current: null,      // 当前 tab 页名
  overlay: null,      // 当前覆盖页（story）
  _stack: [],         // tab 回退栈
  OVERLAYS: ['story'],

  // 兼容 wx 的跳转：'/pages/decor/decor' -> 'decor'
  go: function (url) {
    var name = String(url).split('?')[0].split('/').pop();
    if (!RR.pages[name]) return;

    if (RR.OVERLAYS.indexOf(name) >= 0) {
      RR.overlay = name;
      RR._show(name);
      return;
    }
    if (RR.current === name) {
      RR.pages[name].onShow && RR.pages[name].onShow();
      return;
    }
    if (RR.current) RR._stack.push(RR.current);
    RR._hide(RR.current);
    RR.current = name;
    RR._show(name);
  },

  back: function () {
    // 覆盖页（剧情）：收起来，底下的 tab 刷新一次
    if (RR.overlay) {
      var op = RR.pages[RR.overlay];
      op && op.onHide && op.onHide();
      document.getElementById('screen-' + RR.overlay).classList.remove('active');
      RR.overlay = null;
      var cur = RR.pages[RR.current];
      cur && cur.onShow && cur.onShow();
      return;
    }
    // tab 页：回到上一层，没有上一层就回经营页
    var prev = RR._stack.pop() || 'game';
    if (prev === RR.current) prev = 'game';
    RR._hide(RR.current);
    RR.current = prev;
    RR._show(prev);
  },

  _show: function (name) {
    var p = RR.pages[name];
    if (!p) return;
    var el = document.getElementById('screen-' + name);
    if (!p._inited) {
      p.el = el;
      if (p.init) p.init();
      p._inited = true;
    }
    el.classList.add('active');
    p.onShow && p.onShow();
  },

  _hide: function (name) {
    if (!name) return;
    var p = RR.pages[name];
    p && p.onHide && p.onHide();
    var el = document.getElementById('screen-' + name);
    if (el) el.classList.remove('active');
  },

  // 首次触摸解锁音频（iOS / 安卓 WebView 的自动播放限制）
  unlockAudio: function () {
    try { window.require('audio').play(); } catch (e) {}
  }
};

document.addEventListener('touchstart', function once() {
  document.removeEventListener('touchstart', once);
  RR.unlockAudio();
}, { passive: true });
