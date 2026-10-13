/* 浪漫餐厅 · 经营主页（WebView 版）
 * 移植自 miniprogram/pages/game/game.js，功能与原版一致。
 * 差异：WXML 的 {{}} 绑定 / wx:if / wx:for 改为 JS DOM 渲染；
 *       slider / switch 组件改为 <input type="range"> / <input type="checkbox">。
 */
(function () {
'use strict';

var cfg = require('config');
var eng = require('engine');
var store = require('store');
var audio = require('audio');

RR.pages.game = {
  el: null,

  // 对应小程序 Page 的 data
  d: {
    // 布局
    cell: 47,
    boardW: 329,
    boardH: 423,
    padTop: 0,

    // 资源
    coin: 0,
    lv: 1,
    exp: 0,
    expNeed: 60,
    expPct: 0,
    stamina: 0,
    staminaMax: 60,
    staminaText: '00:00',

    // 棋盘
    cells: [],
    items: [],
    gens: [],

    // 订单
    orders: [],

    // 拖拽
    dragIdx: -1,
    dragX: 0,
    dragY: 0,
    dragScale: 1,
    flashIdx: -1,
    hintIdx: -1,

    // 设置（背景音乐 / 音效）
    showSettings: false,
    bgmOn: true,
    bgmMuted: false,
    sfxOn: true,
    volumePct: 60,

    // UI
    storyRed: false,
    toast: '',
    toastKey: 0,
    showSell: false,
    sellInfo: null,
    giftInfo: null
  },

  // ---------------------------------------------------------------- 生命周期
  init: function () {
    if (!this.el) this.el = document.getElementById('screen-game');
    store.load();
    this._buildSkeleton();
    this.initLayout();
    this._bindEvents();
    this.render();
    this.syncAudio();
  },

  onShow: function () {
    // 离线收益
    var ob = store.offlineBonus();
    this.startTimer();
    this.render();
    // 有些机型冷启动会拦掉自动播放，页面显示时再补一次
    audio.play();
    this.syncAudio();
    if (ob && ob.coin > 0) {
      this.pushFloat('+' + ob.coin, 'coin');
      this.showToast('离开的 ' + ob.mins + ' 分钟里，店里赚了 ' + ob.coin + ' 金币');
    }
    var c = this.checkStory();
    // 开场剧情：首次进入自动播放一次
    if (c && c.trigger.type === 'start' && !this._startPlayed) {
      this._startPlayed = true;
      setTimeout(function () {
        wx.setStorageSync('rr_pending_story', c.id);
        wx.navigateTo({ url: '/pages/story/story?id=' + c.id });
      }, 400);
      return;
    }
    // 只提示一次：设备可以拖动
    var stt = store.get();
    if (!stt.tipDragGen) {
      stt.tipDragGen = true;
      store.saveLazy();
      var self = this;
      setTimeout(function () { self.showToast('小提示：咖啡机这些设备也能拖动，按你的习惯摆'); }, 2600);
    }
  },

  onHide: function () {
    this.stopTimer();
    store.save();
  },

  // ---------------------------------------------------------------- 静态骨架
  _buildSkeleton: function () {
    this.el.innerHTML =
      '<div class="page" data-ref="page">' +
        '<!-- 顶部资源栏 -->' +
        '<div class="hud" data-ref="hud">' +
          '<div class="hud-row">' +
            '<div class="brand">' +
              '<span class="brand-icon">🍽️</span>' +
              '<span class="brand-text">浪漫餐厅</span>' +
            '</div>' +
            '<div class="res">' +
              '<div class="pill gear on" data-ref="gear"><span class="p-ico" data-ref="gearIco">🎵</span></div>' +
              '<div class="pill coin">' +
                '<span class="p-ico">🪙</span>' +
                '<span class="p-num" data-ref="coin">0</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<!-- 等级 + 体力 同一排 -->' +
          '<div class="lv-row">' +
            '<div class="lv-badge" data-ref="lv">Lv.1</div>' +
            '<div class="exp-bar"><div class="exp-fill" data-ref="expFill" style="width:0%"></div></div>' +
            '<div class="exp-text" data-ref="expText">0/60</div>' +
            '<div class="pill st" data-ref="stPill">' +
              '<span class="p-ico">⚡</span>' +
              '<span class="p-num" data-ref="stNum">0/60</span>' +
              '<span class="p-sub" data-ref="stText">00:00</span>' +
              '<span class="p-add" data-ref="stAdd">＋</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- 订单区 -->' +
        '<div class="orders" data-ref="orders"></div>' +

        '<!-- 自动合成 -->' +
        '<div class="autobar">' +
          '<div class="btn-auto" data-ref="autoMerge">' +
            '<span class="ba-ico">✨</span>' +
            '<span class="ba-txt">自动合成</span>' +
          '</div>' +
          '<div class="btn-auto all" data-ref="autoMergeAll">' +
            '<span class="ba-ico">⚡</span>' +
            '<span class="ba-txt">全自动合成</span>' +
          '</div>' +
        '</div>' +

        '<!-- 棋盘 -->' +
        '<div class="board-wrap">' +
          '<div class="board" data-ref="board"></div>' +
        '</div>' +

        '<!-- 底部栏 -->' +
        '<div class="tabbar safe-bottom">' +
          '<div class="tab" data-ref="goDecor">' +
            '<span class="tab-ico">🛋️</span>' +
            '<span class="tab-txt">装修</span>' +
          '</div>' +
          '<div class="tab" data-ref="openStory">' +
            '<span class="tab-ico">💌</span>' +
            '<span class="tab-txt">剧情</span>' +
            '<div class="dot" data-ref="storyDot" style="display:none"></div>' +
          '</div>' +
          '<div class="tab" data-ref="goAlbum">' +
            '<span class="tab-ico">📖</span>' +
            '<span class="tab-txt">图鉴</span>' +
          '</div>' +
        '</div>' +

        '<!-- 飘字 -->' +
        '<div class="floats" data-ref="floats"></div>' +

        '<!-- toast -->' +
        '<div class="toast" data-ref="toast" style="display:none"></div>' +

        '<!-- 出售弹窗 -->' +
        '<div class="mask" data-ref="sellMask" style="display:none"></div>' +
        '<div class="modal sell-modal" data-ref="sellModal" style="display:none">' +
          '<div class="sell-title">出售成功</div>' +
          '<div class="sell-icon" data-ref="sellIcon"></div>' +
          '<div class="sell-name" data-ref="sellName"></div>' +
          '<div class="sell-price" data-ref="sellPrice"></div>' +
          '<div class="btn-romantic" data-ref="sellOk">好的</div>' +
        '</div>' +

        '<!-- 设置：背景音乐 -->' +
        '<div class="mask" data-ref="setMask" style="display:none"></div>' +
        '<div class="modal set-modal" data-ref="setModal" style="display:none">' +
          '<div class="set-title">设置</div>' +
          '<div class="set-row">' +
            '<span class="set-label">🎵 背景音乐</span>' +
            '<label class="switch"><input type="checkbox" data-ref="swBgm"><span class="sw-track"></span></label>' +
          '</div>' +
          '<div class="set-row">' +
            '<span class="set-label">🔔 音效</span>' +
            '<label class="switch"><input type="checkbox" data-ref="swSfx"><span class="sw-track"></span></label>' +
          '</div>' +
          '<div class="set-sub">合成成功、交付订单时各有一声</div>' +
          '<div class="set-row">' +
            '<span class="set-label">🔇 静音</span>' +
            '<label class="switch"><input type="checkbox" data-ref="swMute"><span class="sw-track"></span></label>' +
          '</div>' +
          '<div class="set-vol">' +
            '<div class="set-vol-head">' +
              '<span class="set-label">🔊 总音量</span>' +
              '<span class="set-val" data-ref="volVal">60%</span>' +
            '</div>' +
            '<input type="range" class="set-slider" data-ref="volRange" min="0" max="100" step="1" value="60">' +
            '<div class="set-vol-ends"><span>0</span><span>100</span></div>' +
          '</div>' +
          '<div class="set-tip">设置会自动记住，下次进来接着用</div>' +
          '<div class="btn-romantic" data-ref="setDone">完成</div>' +
        '</div>' +
      '</div>';

    // 缓存元素引用
    this.$ = {};
    var nodes = this.el.querySelectorAll('[data-ref]');
    for (var i = 0; i < nodes.length; i++) {
      this.$[nodes[i].getAttribute('data-ref')] = nodes[i];
    }
  },

  // ---------------------------------------------------------------- 事件绑定
  _bindEvents: function () {
    var $ = this.$;
    var self = this;

    $.page.addEventListener('touchstart', function () { self.onFirstTouch(); }, { passive: true });
    $.gear.addEventListener('click', function () { self.openSettings(); });
    $.stAdd.addEventListener('click', function (e) { e.stopPropagation(); self.onAddStamina(); });
    $.autoMerge.addEventListener('click', function () { self.onAutoMerge(); });
    $.autoMergeAll.addEventListener('click', function () { self.onAutoMergeAll(); });

    // 订单卡「交付/备菜」按钮（事件委托，订单区每次 render 重建）
    $.orders.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.o-btn') : null;
      if (btn && $.orders.contains(btn)) self.onDeliver(btn.dataset.id);
    });

    $.goDecor.addEventListener('click', function () { self.goDecor(); });
    $.openStory.addEventListener('click', function () { self.openStory(); });
    $.goAlbum.addEventListener('click', function () { self.goAlbum(); });

    $.sellMask.addEventListener('click', function () { self.closeSell(); });
    $.sellOk.addEventListener('click', function () { self.closeSell(); });
    $.setMask.addEventListener('click', function () { self.closeSettings(); });
    $.setDone.addEventListener('click', function () { self.closeSettings(); });

    $.swBgm.addEventListener('change', function () { self.onToggleBgm(this.checked); });
    $.swSfx.addEventListener('change', function () { self.onToggleSfx(this.checked); });
    $.swMute.addEventListener('change', function () { self.onToggleMute(this.checked); });
    // 拖动中实时试听（bindchanging），松手落盘（bindchange）
    $.volRange.addEventListener('input', function () { self.onVolumeChanging(Number(this.value)); });
    $.volRange.addEventListener('change', function () { self.onVolumeChange(Number(this.value)); });

    // 拖拽 handler 预绑定（棋盘物品层重建时逐个挂到物品元素上）
    this._hStart = this.onItemStart.bind(this);
    this._hMove = this.onItemMove.bind(this);
    this._hEnd = this.onItemEnd.bind(this);
  },

  // ---------------------------------------------------------------- 布局
  initLayout: function () {
    var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    var W = info.windowWidth || 375;
    var H = info.windowHeight || 667;
    // WebView 端沉浸式全屏，shim 返回 0
    var statusBar = info.statusBarHeight || 0;

    // 预留：状态栏 + HUD + 订单区 + 自动合成条 34 + 底部栏 + 安全区
    var reserve = statusBar + 40 + 152 + 34 + 76 + 20;
    var availH = Math.max(240, H - reserve);
    var cellByW = Math.floor((W - 28) / eng.COLS);
    var cellByH = Math.floor(availH / eng.ROWS);
    var cell = Math.max(40, Math.min(cellByW, cellByH));

    var d = this.d;
    d.cell = cell;
    d.boardW = cell * eng.COLS;
    d.boardH = cell * eng.ROWS;
    d.padTop = statusBar;

    // 背景格子坐标
    var cells = [];
    for (var i = 0; i < eng.COLS * eng.ROWS; i++) {
      cells.push({
        i: i,
        x: eng.colOf(i) * cell,
        y: eng.rowOf(i) * cell,
        gen: eng.isGenSlot(i),
        dark: (eng.rowOf(i) + eng.colOf(i)) % 2 === 0
      });
    }
    d.cells = cells;

    // 应用到 DOM：HUD 顶部内边距 + 棋盘尺寸 + 背景格子
    this.$.hud.style.paddingTop = statusBar + 'px';
    var board = this.$.board;
    board.style.width = d.boardW + 'px';
    board.style.height = d.boardH + 'px';

    var html = '';
    for (var n = 0; n < cells.length; n++) {
      var c = cells[n];
      html += '<div class="cell' + (c.gen ? ' gen-cell' : '') + '" style="left:' + c.x + 'px;top:' + c.y +
        'px;width:' + cell + 'px;height:' + cell + 'px"></div>';
    }
    html += '<div class="items-layer" data-ref="itemsLayer"></div>';
    board.innerHTML = html;
    this.$.itemsLayer = board.querySelector('[data-ref="itemsLayer"]');
    this._cellEls = board.querySelectorAll('.cell');
    this._itemEls = {};
    this._dragEl = null;
    this._hintEl = null;
  },

  // ---------------------------------------------------------------- 状态同步（替代 setData）
  set: function (patch) {
    var d = this.d;
    for (var k in patch) d[k] = patch[k];
    // 轻量更新每次都跑（代价极小）
    this._syncHud();
    this._syncDrag();
    this._syncFlash();
    this._syncToast();
    this._syncSell();
    this._syncSettings();
    // 重建类更新按 key 触发
    if ('orders' in patch) this._buildOrders();
    if ('items' in patch || 'gens' in patch || 'cells' in patch) this._buildItems();
  },

  _syncHud: function () {
    var d = this.d, $ = this.$;
    $.coin.textContent = d.coin;
    $.lv.textContent = 'Lv.' + d.lv;
    $.expFill.style.width = d.expPct + '%';
    $.expText.textContent = d.exp + '/' + d.expNeed;
    $.stNum.textContent = d.stamina + '/' + d.staminaMax;
    $.stText.textContent = d.staminaText;
    $.stPill.classList.toggle('low', d.stamina < 10);
    // 设置齿轮：音乐开且未静音时亮
    var on = d.bgmOn && !d.bgmMuted;
    $.gear.classList.toggle('on', on);
    $.gear.classList.toggle('off', !on);
    $.gearIco.textContent = on ? '🎵' : '🔇';
    // 剧情红点
    $.storyDot.style.display = d.storyRed ? '' : 'none';
  },

  _syncDrag: function () {
    var d = this.d;
    // 拖拽结束：恢复上一个拖拽元素的原位样式（点击场景下没有后续 render）
    if (this._dragEl && d.dragIdx < 0) {
      var el = this._dragEl;
      var i = this._dragSlot;
      el.classList.remove('dragging');
      el.style.zIndex = 2;
      el.style.transform = 'scale(1)';
      el.style.left = eng.colOf(i) * d.cell + 'px';
      el.style.top = eng.rowOf(i) * d.cell + 'px';
      this._dragEl = null;
    }
    // 拖拽中：只动被拖元素，棋盘物品层不重建，拖拽不会被打断
    if (d.dragIdx >= 0) {
      var cur = this._itemEls[d.dragIdx];
      if (cur) {
        this._dragEl = cur;
        this._dragSlot = d.dragIdx;
        cur.style.left = d.dragX + 'px';
        cur.style.top = d.dragY + 'px';
        cur.style.zIndex = 99;
        cur.style.transform = 'scale(' + d.dragScale + ')';
        if (cur.classList.contains('gen')) cur.classList.add('dragging');
      }
    }
    // 落点高亮
    if (this._hintEl) {
      this._hintEl.classList.remove('hint');
      this._hintEl = null;
    }
    if (d.hintIdx >= 0 && this._cellEls[d.hintIdx]) {
      this._hintEl = this._cellEls[d.hintIdx];
      this._hintEl.classList.add('hint');
    }
  },

  _syncFlash: function () {
    var d = this.d;
    for (var i in this._itemEls) {
      var pop = (Number(i) === d.flashIdx) || !!(this._flashSet && this._flashSet[i]);
      this._itemEls[i].classList.toggle('pop', pop);
    }
  },

  _syncToast: function () {
    var d = this.d, $ = this.$;
    if (d.toast) {
      $.toast.textContent = d.toast;
      $.toast.style.display = '';
    } else {
      $.toast.style.display = 'none';
    }
  },

  _syncSell: function () {
    var d = this.d, $ = this.$;
    $.sellMask.style.display = d.showSell ? '' : 'none';
    $.sellModal.style.display = d.showSell ? '' : 'none';
    if (d.showSell && d.sellInfo) {
      $.sellIcon.textContent = d.sellInfo.icon;
      $.sellName.textContent = d.sellInfo.name;
      $.sellPrice.textContent = '+ ' + d.sellInfo.price + ' 🪙';
    }
  },

  _syncSettings: function () {
    var d = this.d, $ = this.$;
    $.setMask.style.display = d.showSettings ? '' : 'none';
    $.setModal.style.display = d.showSettings ? '' : 'none';
    $.swBgm.checked = !!d.bgmOn;
    $.swSfx.checked = !!d.sfxOn;
    $.swMute.checked = !!d.bgmMuted;
    $.volVal.textContent = d.volumePct + '%';
    $.volRange.disabled = !!d.bgmMuted;
    if (Number($.volRange.value) !== d.volumePct) $.volRange.value = d.volumePct;
    // 模拟原 slider 的 activeColor / backgroundColor
    $.volRange.style.background =
      'linear-gradient(to right, #e8607f 0%, #e8607f ' + d.volumePct + '%, #efe2d6 ' + d.volumePct + '%, #efe2d6 100%)';
  },

  // ---------------------------------------------------------------- 订单渲染
  _buildOrders: function () {
    var d = this.d;
    var html = '';
    for (var n = 0; n < d.orders.length; n++) {
      var o = d.orders[n];
      if (!o) continue;
      html += '<div class="ocard' + (o.ready ? ' ready' : '') + '">' +
        '<div class="o-head">' +
          '<span class="o-avatar">' + o.icon + '</span>' +
          '<span class="o-name">' + o.name + '</span>' +
        '</div>' +
        '<div class="o-items">';
      for (var m = 0; m < o.items.length; m++) {
        var it = o.items[m];
        html += '<div class="o-item' + (it.ok ? ' ok' : '') + '">' +
          '<span class="oi-icon">' + it.icon + '</span>' +
          '<span class="oi-n">' + it.have + '/' + it.n + '</span>' +
        '</div>';
      }
      html += '</div>' +
        '<div class="o-foot">' +
          '<div class="o-coin">🪙 ' + o.coin + '</div>' +
          '<div class="o-btn' + (o.ready ? ' on' : '') + '" data-id="' + o.id + '">' +
            (o.ready ? '交付' : '备菜') +
          '</div>' +
        '</div>' +
        (o.ready ? '<div class="o-ready-flag">✓</div>' : '') +
      '</div>';
    }
    this.$.orders.innerHTML = html;
  },

  // ---------------------------------------------------------------- 棋盘物品层渲染
  _buildItems: function () {
    var d = this.d;
    var cell = d.cell;
    var html = '';
    for (var n = 0; n < d.items.length; n++) {
      var it = d.items[n];
      var style = 'left:' + it.x + 'px;top:' + it.y + 'px;width:' + cell + 'px;height:' + cell +
        'px;z-index:2;transform:scale(1)';
      var pop = (it.i === d.flashIdx) || !!(this._flashSet && this._flashSet[it.i]);
      if (it.k === 'gen') {
        html += '<div class="gen" style="' + style + '" data-i="' + it.i + '" data-order="' + it.order + '">' +
          '<div class="gen-inner">' +
            '<span class="gen-icon">' + it.icon + '</span>' +
            '<span class="gen-name">' + it.name + '</span>' +
            '<div class="gen-tap">点·拖</div>' +
          '</div>' +
        '</div>';
      } else {
        html += '<div class="item' + (pop ? ' pop' : '') + (it.isMax ? ' maxlv' : '') + '" style="' + style +
          '" data-i="' + it.i + '">' +
          '<div class="item-inner">' +
            '<span class="item-icon">' + it.icon + '</span>' +
            '<div class="item-lv">' + it.level + '</div>' +
            (it.isMax ? '<div class="item-star">MAX</div>' : '') +
          '</div>' +
        '</div>';
      }
    }
    this.$.itemsLayer.innerHTML = html;

    // 重新缓存引用并逐个绑定触摸事件
    this._itemEls = {};
    this._dragEl = null;
    var nodes = this.$.itemsLayer.children;
    for (var m = 0; m < nodes.length; m++) {
      var el = nodes[m];
      this._itemEls[el.dataset.i] = el;
      el.addEventListener('touchstart', this._hStart, { passive: true });
      el.addEventListener('touchmove', this._hMove, { passive: false });
      el.addEventListener('touchend', this._hEnd);
      el.addEventListener('touchcancel', this._hEnd);
    }
  },

  // ---------------------------------------------------------------- 渲染
  render: function () {
    var st = store.get();
    var cell = this.d.cell;

    // 棋盘物品
    var items = [];
    var gens = [];
    for (var i = 0; i < st.slots.length; i++) {
      var s = st.slots[i];
      if (!s) continue;
      var x = eng.colOf(i) * cell;
      var y = eng.rowOf(i) * cell;
      var pop = !!(this._flashSet && this._flashSet[i]);
      if (s.k === 'gen') {
        var g = null;
        for (var a = 0; a < cfg.GENS.length; a++) if (cfg.GENS[a].id === s.id) { g = cfg.GENS[a]; break; }
        if (!g) continue;
        var order = -1;
        for (var b = 0; b < cfg.GENS.length; b++) if (cfg.GENS[b].id === s.id) { order = b; break; }
        gens.push({ i: i, x: x, y: y, id: s.id, icon: g.icon, name: g.name, order: order });
        items.push({ i: i, k: 'gen', id: s.id, icon: g.icon, name: g.name, x: x, y: y, chain: g.chain, order: order, pop: pop });
      } else {
        var m = cfg.getItemMeta(s.id);
        if (!m) continue;
        items.push({
          i: i,
          k: 'item',
          id: s.id,
          icon: m.icon,
          name: m.name,
          tint: m.tint,
          level: m.level,
          max: m.max,
          isMax: m.level >= m.max,
          x: x,
          y: y,
          pop: pop
        });
      }
    }

    // 订单
    var orders = st.orders.map(function (o) {
      if (!o) return null;
      var prog = eng.orderProgress(st.slots, o);
      return {
        id: o.id,
        name: o.name,
        icon: o.icon,
        line: o.line,
        coin: o.coin,
        exp: o.exp,
        ready: prog.ok,
        items: prog.detail.map(function (dd) {
          var m = cfg.getItemMeta(dd.id) || { icon: '❓', name: '?' };
          return { icon: m.icon, name: m.name, have: dd.have, n: dd.n, ok: dd.have >= dd.n };
        })
      };
    });

    var expNeed = eng.expToNext(st.lv);
    var sMax = eng.staminaMax(st.lv);

    this.set({
      items: items,
      gens: gens,
      orders: orders,
      coin: st.coin,
      lv: st.lv,
      exp: st.exp,
      expNeed: expNeed,
      expPct: Math.min(100, Math.round((st.exp / expNeed) * 100)),
      stamina: st.stamina,
      staminaMax: sMax,
      storyRed: store.hasPendingStory()
    });
    this.updateStaminaText();

    // 新生成器进场时，被占位挪走/折现的食材要给玩家一个交代
    if (st.notice) {
      var nt = st.notice;
      st.notice = null;
      if (nt.migrated) {
        this.showToast('棋盘扩到 7×9 啦，食材已搬进新棋盘');
      } else {
        var parts = [];
        if (nt.moved) parts.push(nt.moved + ' 件食材挪了位置');
        if (nt.refunded) parts.push(nt.refunded + ' 件折现 ' + nt.coin + ' 金币');
        if (parts.length) this.showToast('新设备进场，' + parts.join('，'));
      }
    }
  },

  updateStaminaText: function () {
    var st = store.get();
    var txt;
    if (st.stamina >= eng.staminaMax(st.lv)) {
      txt = '已满';
    } else {
      var ms = eng.nextStaminaMs(st.staminaAt, Date.now());
      var s = Math.ceil(ms / 1000);
      txt = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
    }
    if (this.d.staminaText !== txt) {
      this.d.staminaText = txt;
      this.$.stText.textContent = txt;
    }
  },

  // ---------------------------------------------------------------- 计时器
  startTimer: function () {
    this.stopTimer();
    var self = this;
    this._timer = setInterval(function () {
      var r = store.tick();
      var st = store.get();
      var patch = {};
      if (st.stamina !== self.d.stamina) patch.stamina = st.stamina;
      self.updateStaminaText();
      if (r.gained > 0) {
        self.pushFloat('+' + r.gained + ' 体力', 'st');
      }
      // 订单空位变化时刷新
      var needRefresh = st.orders.some(function (o, i) {
        var cur = self.d.orders[i];
        return (!o && cur) || (o && cur && o.id !== cur.id);
      });
      if (needRefresh) self.render();
      else if (Object.keys(patch).length) self.set(patch);
    }, 1000);
  },

  stopTimer: function () {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  // ---------------------------------------------------------------- 提示
  showToast: function (text) {
    var key = Date.now();
    this.d.toast = text;
    this.d.toastKey = key;
    this._syncToast();
    var self = this;
    setTimeout(function () {
      if (self.d.toastKey === key) {
        self.d.toast = '';
        self._syncToast();
      }
    }, 1800);
  },

  pushFloat: function (text, kind) {
    var box = this.$.floats;
    // 最多同时 4 条，同原版
    while (box.children.length >= 4) box.removeChild(box.firstChild);
    var el = document.createElement('div');
    el.className = 'float ' + kind;
    el.textContent = text;
    box.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1200);
  },

  // ---------------------------------------------------------------- 生成器
  doGenTap: function (order) {
    var r = store.tapGen(order);
    if (!r.ok) {
      if (r.reason === 'stamina') this.showToast('体力不够啦，休息一会儿再来 ☕');
      else if (r.reason === 'full') this.showToast('棋盘满了！先合成或卖掉一些吧');
      return;
    }
    this.render();
    this.set({ flashIdx: r.slot });
    var self = this;
    setTimeout(function () { self.set({ flashIdx: -1 }); }, 320);
    this.pushFloat('-' + cfg.STAMINA.costPerTap + ' 体力', 'st');
  },

  // ---------------------------------------------------------------- 拖拽
  onItemStart: function (e) {
    var i = Number(e.currentTarget.dataset.i);
    var st = store.get();
    var s = st.slots[i];
    // 食材和生成器都能拖
    if (!s || (s.k !== 'item' && s.k !== 'gen')) return;
    var t = e.touches[0];
    this._start = {
      x: t.clientX,
      y: t.clientY,
      t: Date.now(),
      i: i,
      k: s.k,
      order: Number(e.currentTarget.dataset.order || 0)
    };
    this._moved = false;
    var cell = this.d.cell;
    this.set({
      dragIdx: i,
      dragX: eng.colOf(i) * cell,
      dragY: eng.rowOf(i) * cell,
      dragScale: 1.12
    });
  },

  onItemMove: function (e) {
    if (this.d.dragIdx < 0 || !this._start) return;
    e.preventDefault();
    var t = e.touches[0];
    var s = this._start;
    var cell = this.d.cell;
    var nx = eng.colOf(s.i) * cell + (t.clientX - s.x);
    var ny = eng.rowOf(s.i) * cell + (t.clientY - s.y);
    if (Math.abs(t.clientX - s.x) > 4 || Math.abs(t.clientY - s.y) > 4) this._moved = true;

    var now = Date.now();
    if (now - (this._lastMove || 0) < 16) return;
    this._lastMove = now;

    // 落点高亮
    var ci = Math.floor((nx + cell / 2) / cell);
    var ri = Math.floor((ny + cell / 2) / cell);
    var hint = -1;
    if (ci >= 0 && ci < eng.COLS && ri >= 0 && ri < eng.ROWS) {
      var target = eng.idx(ri, ci);
      var res = eng.resolveDrop(store.get().slots, s.i, target);
      if (res.type === 'merge' || res.type === 'swap' || res.type === 'move') hint = target;
    }

    this.set({ dragX: nx, dragY: ny, hintIdx: hint });
  },

  onItemEnd: function () {
    var idx = this.d.dragIdx;
    if (idx < 0) return;
    var s = this._start;
    var moved = this._moved;
    var cell = this.d.cell;
    var nx = this.d.dragX;
    var ny = this.d.dragY;

    this.set({ dragIdx: -1, dragScale: 1, hintIdx: -1 });

    if (!moved) {
      // 没有位移 = 点击
      if (s.k === 'gen') this.doGenTap(s.order);
      else this.tryTapItem(idx);
      return;
    }

    var ci = Math.floor((nx + cell / 2) / cell);
    var ri = Math.floor((ny + cell / 2) / cell);
    if (ci < 0 || ci >= eng.COLS || ri < 0 || ri >= eng.ROWS) {
      this.render();
      return;
    }
    var target = eng.idx(ri, ci);
    var res = store.dragTo(idx, target);
    if (res.type === 'merge') {
      audio.playSfx('merge');
      this.set({ flashIdx: target });
      var self = this;
      setTimeout(function () { self.set({ flashIdx: -1 }); }, 360);
      var m = cfg.getItemMeta(res.newId);
      this.pushFloat('合成 ' + m.name, 'merge');
      if (res.isNew) this.showToast('图鉴解锁：' + m.name + ' ' + m.icon);
      this.checkStory();
    } else if (res.type === 'invalid' || res.type === 'none') {
      // do nothing
    }
    this.render();
  },

  /** 点击物品：满级则出售 */
  tryTapItem: function (idx) {
    var st = store.get();
    var s = st.slots[idx];
    if (!s || s.k !== 'item') return;
    var r = store.sell(idx);
    if (!r.ok) {
      var m = cfg.getItemMeta(s.id);
      this.showToast(m.name + '（Lv.' + m.level + '/' + m.max + '）');
      return;
    }
    this.set({
      showSell: true,
      sellInfo: { icon: r.icon, name: r.name, price: r.price }
    });
    this.render();
    this.pushFloat('+' + r.price, 'coin');
    this.checkStory();
  },

  closeSell: function () {
    this.set({ showSell: false });
  },

  // ---------------------------------------------------------------- 自动合成
  /** 一次点击合一对：从等级最低的同类道具开始 */
  onAutoMerge: function () {
    var r = store.autoMerge();
    if (!r.ok) {
      this.showToast('未发现相同道具');
      return;
    }
    audio.playSfx('merge');
    this.render();
    this.set({ flashIdx: r.slot });
    var self = this;
    setTimeout(function () { self.set({ flashIdx: -1 }); }, 360);
    this.pushFloat('合成 ' + r.name, 'merge');
    if (r.isNew) this.showToast('图鉴解锁：' + r.name + ' ' + r.icon);
    this.checkStory();
  },

  /** 全自动合成：一次点击把棋盘上所有能合的都合完 */
  onAutoMergeAll: function () {
    var r = store.autoMergeAll();
    if (!r.ok) {
      this.showToast('未发现相同道具');
      return;
    }
    audio.playSfx('merge');
    // 所有合成结果一起闪一下（render 会读 _flashSet）
    this._flashSet = {};
    (r.slots || []).forEach(function (i) { this._flashSet[i] = true; }, this);
    this.render();
    var self = this;
    setTimeout(function () {
      self._flashSet = null;
      self.render();
    }, 420);

    this.pushFloat('连合 ' + r.count + ' 次', 'merge');
    if (r.coin > 0) this.pushFloat('+' + r.coin, 'coin');
    var msg = r.count > 1
      ? '全自动合成 ' + r.count + ' 次，最高 ' + r.topName + ' Lv.' + r.topLevel
      : '合成 ' + r.topName;
    this.showToast(msg);
    if (r.newCount > 0) {
      setTimeout(function () { self.showToast('图鉴解锁：新增 ' + r.newCount + ' 种'); }, 1500);
    }
    this.checkStory();
  },

  // ---------------------------------------------------------------- 体力
  /** 体力胶囊后面的「＋」：老公送体力 */
  onAddStamina: function () {
    var r = store.addStamina(100);
    this.render();
    this.showToast('老公给你加体力 ❤️');
    this.pushFloat('+' + r.gained + ' 体力', 'st');
  },

  // ---------------------------------------------------------------- 订单
  onDeliver: function (id) {
    var r = store.deliver(id);
    if (!r.ok) {
      this.showToast('还差几样东西呢～');
      return;
    }
    audio.playSfx('deliver');
    this.render();
    this.pushFloat('+' + r.coin, 'coin');
    this.pushFloat('+' + r.exp + ' exp', 'exp');
    if (r.ups && r.ups.length) {
      this.showToast('升级！Lv.' + r.ups[r.ups.length - 1] + ' 🎉');
    }
    this.checkStory();
  },

  // ---------------------------------------------------------------- 剧情
  checkStory: function () {
    var c = store.nextChapter();
    this.set({ storyRed: !!c });
    if (c && c.trigger.type !== 'start') {
      // 非开场章节：自动弹出提示气泡，由玩家点开
      this.d.giftInfo = null;
    }
    return c;
  },

  openStory: function () {
    var c = store.nextChapter();
    if (!c) {
      this.showToast('暂时没有新的剧情，继续经营吧～');
      return;
    }
    // Web 版路由不带 query，章节 id 先落到 storage，story 页 onShow 时取
    wx.setStorageSync('rr_pending_story', c.id);
    wx.navigateTo({ url: '/pages/story/story?id=' + c.id });
  },

  // ---------------------------------------------------------------- 设置（背景音乐）
  /**
   * 真机要求先有用户交互才允许出声，
   * 页面任意位置首次触摸时补一次播放，避免进了游戏没音乐。
   */
  onFirstTouch: function () {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    audio.play();
  },

  syncAudio: function () {
    var s = audio.get();
    this.set({
      bgmOn: s.on,
      bgmMuted: s.muted,
      sfxOn: s.sfx,
      volumePct: Math.round(s.volume * 100)
    });
  },

  openSettings: function () {
    this.syncAudio();
    this.set({ showSettings: true });
  },

  closeSettings: function () {
    this.set({ showSettings: false });
  },

  onToggleBgm: function (v) {
    v = !!v;
    audio.setOn(v);
    this.set({ bgmOn: v });
  },

  onToggleMute: function (v) {
    v = !!v;
    audio.setMuted(v);
    this.set({ bgmMuted: v });
  },

  onToggleSfx: function (v) {
    v = !!v;
    audio.setSfx(v);
    this.set({ sfxOn: v });
    // 打开时给一声示例，方便确认音量合不合适
    if (v) audio.playSfx('merge');
  },

  /** 拖动中：实时试听，不写盘 */
  onVolumeChanging: function (v) {
    this.set({ volumePct: v });
    audio.previewVolume(v / 100);
  },

  /** 松手：落盘 */
  onVolumeChange: function (v) {
    audio.setVolume(v / 100);
    this.set({ volumePct: v });
  },

  // ---------------------------------------------------------------- 跳转
  goDecor: function () {
    wx.navigateTo({ url: '/pages/decor/decor' });
  },

  goAlbum: function () {
    wx.navigateTo({ url: '/pages/album/album' });
  }
};

})();
