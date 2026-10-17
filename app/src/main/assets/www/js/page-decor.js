/* 餐厅装修页（移植自 miniprogram/pages/decor/decor.js）
 * 普通 <script>，不用 define()；通过全局 require 取模块。
 */
(function () {
  var cfg = require('config');
  var store = require('store');
  var decorMod = require('decor');
  var DECOR = decorMod.DECOR;
  var PART_HINT = decorMod.PART_HINT;
  var STYLE_NAMES = decorMod.STYLE_NAMES;
  var PART_IMG = decorMod.PART_IMG;

  /* 页面状态（对应原 this.data） */
  var state = {
    padTop: 0,
    coin: 0,
    lv: 1,
    parts: {},
    list: [],
    clues: [],
    showClue: false,
    confirm: null,
    toast: '',
    highlight: ''
  };

  var page = {
    el: null,

    /* 对应 onLoad + 首次渲染：建静态骨架、绑定事件（只调一次） */
    init: function () {
      var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      state.padTop = (info.statusBarHeight || 20) + 8;

      this.el.innerHTML =
        '<div class="page" style="padding-top:' + state.padTop + 'px">' +
          '<div class="nav">' +
            '<div class="back" data-action="back">‹</div>' +
            '<span class="nav-title">我的餐厅</span>' +
            '<div class="nav-coin"></div>' +
          '</div>' +
          '<div class="room"></div>' +
          '<div class="clue-bar-wrap"></div>' +
          '<div class="list"></div>' +
          '<div class="modal-wrap"></div>' +
          '<div class="toast" style="display:none"></div>' +
        '</div>';

      this._roomEl = this.el.querySelector('.room');
      this._listEl = this.el.querySelector('.list');
      this._clueBarEl = this.el.querySelector('.clue-bar-wrap');
      this._modalEl = this.el.querySelector('.modal-wrap');
      this._toastEl = this.el.querySelector('.toast');
      this._coinEl = this.el.querySelector('.nav-coin');

      // 事件委托：bindtap -> click，e.currentTarget.dataset.x -> el.dataset.x
      var self = this;
      this.el.addEventListener('click', function (e) {
        var t = e.target;
        var actEl = t.closest ? t.closest('[data-action]') : null;
        if (actEl && self.el.contains(actEl)) {
          var act = actEl.dataset.action;
          if (act === 'back') self.goBack();
          else if (act === 'closeConfirm') self.closeConfirm();
          else if (act === 'doBuild') self.doBuild();
          else if (act === 'closeClue') self.closeClue();
          else if (act === 'openClue') self.openClue();
          else if (act === 'host') self.hostAct();
          return;
        }
        // v1.9 风格切换按钮（优先于 build/part 判断）
        var styleEl = t.closest ? t.closest('[data-style]') : null;
        if (styleEl && self.el.contains(styleEl)) {
          self.onStyleTap(styleEl);
          return;
        }
        var buildEl = t.closest ? t.closest('[data-build]') : null;
        if (buildEl && self.el.contains(buildEl)) {
          self.openBuild(buildEl.dataset.build);
          return;
        }
        var partEl = t.closest ? t.closest('[data-part]') : null;
        if (partEl && self.el.contains(partEl)) {
          self.onPartTap(partEl.dataset.part);
          return;
        }
        // v1.7 需求物品点击：旁边弹出 名称/等级/产出容器 提示
        var reqEl = t.closest ? t.closest('[data-req]') : null;
        if (reqEl && self.el.contains(reqEl)) {
          self.onReqTap(reqEl);
          return;
        }
        // 点其他区域收起提示
        self.hideReqTips();
      });
    },

    /* 对应小程序 onShow：重新读 store 渲染装修列表与场景 */
    onShow: function () {
      this.refresh();
    },

    onHide: function () {
      clearTimeout(this._hlTimer);
      clearTimeout(this._toastTimer);
      clearTimeout(this._clueTimer);
      clearTimeout(this._hostTimer);
    },

    refresh: function () {
      var st = store.get();
      var parts = {};
      DECOR.forEach(function (d) {
        parts[d.part] = !!st.decor[d.id];
      });

      var list = DECOR.map(function (d) {
        var status = store.decorStatus(d);
        var reqs = d.req.map(function (r) {
          var m = cfg.getItemMeta(r.id) || { icon: '❓', name: '?' };
          var have = store.countItem(r.id);
          // v1.9 需求图标与实际合成物品统一：都用 assets/items/<id>.png
          return { id: r.id, img: 'assets/items/' + r.id + '.png', name: m.name, have: have, n: r.n, ok: have >= r.n };
        });
        var btn = '装修';
        if (status === 'done') btn = '已完成';
        else if (status === 'lock') btn = 'Lv.' + d.unlockLv + ' 解锁';
        else if (status === 'lack') btn = '收集材料';
        else if (status === 'coin') btn = '金币不足';
        else btn = '开始装修';
        return {
          id: d.id,
          part: d.part,
          name: d.name,
          desc: d.desc,
          cost: d.cost,
          unlockLv: d.unlockLv,
          status: status,
          reqs: reqs,
          btn: btn
        };
      });

      state.parts = parts;
      state.list = list;
      state.coin = st.coin;
      state.lv = st.lv;
      state.clues = st.clues;

      this.renderTop();
      this.renderRoom();
      this.renderClueBar();
      this.renderList();
    },

    /* ------------------------------------------------------------ 渲染 */

    renderTop: function () {
      this._coinEl.textContent = '🪙 ' + state.coin;
    },

    renderRoom: function () {
      var p = state.parts;
      // v1.9 每个部件的当前风格（floor/wall 走 CSS 配色，其余走图片）
      var styleOf = {};
      Object.keys(PART_IMG).forEach(function (pt) { styleOf[pt] = store.getDecorStyle(pt); });
      styleOf.floor = store.getDecorStyle('floor');
      styleOf.wall = store.getDecorStyle('wall');
      function img(pt) {
        return 'assets/decor/parts/' + PART_IMG[pt] + '_s' + styleOf[pt] + '.png';
      }
      function part(pt, icoDone, icoBad, extraDone) {
        var done = p[pt];
        return '<div class="part p-' + pt + (done ? ' done' : '') + '" data-part="' + pt + '">' +
          '<img class="p-img' + (done ? '' : ' bad') + '" src="' + img(pt) + '" draggable="false"/>' +
          (done ? (extraDone || '') : '<span class="p-hint">' + PART_HINT[pt] + '</span>') +
        '</div>';
      }
      var h = '';
      // v1.10 餐厅内景背景图：未贴墙纸时压暗做旧（破败态），贴好后墙纸走染色层
      h += '<div class="room-bg' + (p.wall ? '' : ' bad') + '">' +
        '<img class="bg-img" src="assets/decor/room-bg.png" draggable="false"/></div>';
      h += '<div class="wallpaper" data-part="wall"></div>';

      h += part('sign', null, null, '<span class="p-label">ROMANTIC</span>');
      h += part('lamp');
      h += part('window');
      h += part('flowers');
      h += part('piano');
      h += part('terrace');
      h += part('kitchen');
      h += part('gardenArea');
      h += part('counter');
      h += part('seats');
      h += part('stage');

      if (p.blackcat) {
        h += '<div class="part p-cat done" data-part="blackcat">' +
          '<img class="p-img" src="' + img('blackcat') + '" draggable="false"/></div>';
      }

      h += '<div class="floor' + (p.floor ? ' done' : '') + ' st' + styleOf.floor + '" data-part="floor">' +
        (p.floor ? '' : '<span class="f-hint">' + PART_HINT.floor + '</span>') +
      '</div>';

      // v1.12 主人公立绘：保持在最前面（z-index 6 高于家具），时不时左右走动，点击做动作
      h += '<div class="host" data-action="host">' +
        '<img class="host-img" src="assets/faces/host.png" draggable="false"/></div>';

      this._roomEl.className = 'room' + (p.wall ? ' walled' : '') + ' st' + styleOf.wall;
      this._roomEl.innerHTML = h;
    },

    renderClueBar: function () {
      if (!state.clues.length) {
        this._clueBarEl.innerHTML = '';
        return;
      }
      this._clueBarEl.innerHTML =
        '<div class="clue-bar" data-action="openClue">' +
          '<span class="cb-ico">🔍</span>' +
          '<span class="cb-txt">黑猫谜案 · 已找到 ' + state.clues.length + ' 条线索</span>' +
          '<span class="cb-more">查看 ›</span>' +
        '</div>';
    },

    renderList: function () {
      var scrollTop = this._listEl.scrollTop;
      var hl = state.highlight;
      var h = state.list.map(function (d) {
        var tag;
        if (d.status === 'done') tag = '<span class="d-tag">已完成</span>';
        else if (d.status === 'lock') tag = '<span class="d-tag lock">Lv.' + d.unlockLv + '</span>';
        else if (d.status === 'lack') tag = '<span class="d-tag lack">缺材料</span>';
        else if (d.status === 'coin') tag = '<span class="d-tag coin">缺金币</span>';
        else tag = '<span class="d-tag ready">可改造</span>';

        var reqs = d.reqs.map(function (r) {
          return '<div class="req' + (r.ok ? ' ok' : '') + '" data-req="' + r.id + '">' +
            '<span class="r-ico"><img class="r-img" src="' + r.img + '" draggable="false"/></span>' +
            '<span class="r-n">' + r.have + '/' + r.n + '</span>' +
            '<div class="req-tip" style="display:none"></div>' +
          '</div>';
        }).join('');

        // v1.9 已完成家具显示风格切换条（3 种风格即时切换；floor/wall 用色板）
        var styleBar = '';
        if (d.status === 'done') {
          var cur = store.getDecorStyle(d.part);
          var btns = '';
          for (var s = 1; s <= 3; s++) {
            if (PART_IMG[d.part]) {
              btns += '<img class="sb-img' + (s === cur ? ' on' : '') + '" data-style="' + s + '" data-sb="' + d.part + '" ' +
                'src="assets/decor/parts/' + PART_IMG[d.part] + '_s' + s + '.png" draggable="false"/>';
            } else {
              btns += '<span class="sb-swatch sb-st' + s + (s === cur ? ' on' : '') + '" data-style="' + s + '" data-sb="' + d.part + '"></span>';
            }
          }
          styleBar = '<div class="style-bar">' +
            '<span class="sb-label">风格 · ' + STYLE_NAMES[cur] + '</span>' + btns +
          '</div>';
        }

        return '<div class="dcard ' + d.status + (d.id === hl ? ' hl' : '') + '" id="card-' + d.id + '">' +
          '<div class="d-head">' +
            '<span class="d-name">' + d.name + '</span>' + tag +
          '</div>' +
          '<div class="d-desc">' + d.desc + '</div>' +
          '<div class="d-req">' + reqs + '</div>' +
          styleBar +
          '<div class="d-foot">' +
            '<span class="d-cost">🪙 ' + d.cost + '</span>' +
            '<div class="d-btn' + (d.status === 'ready' ? ' on' : '') + '" data-build="' + d.id + '">' + d.btn + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      this._listEl.innerHTML = h + '<div class="pad"></div>';
      this._listEl.scrollTop = scrollTop;
    },

    renderModal: function () {
      var h = '';
      var c = state.confirm;
      if (c) {
        var reqs = c.reqs.map(function (r) {
          return '<div class="cf-req-item">' +
            '<span class="r-ico"><img class="r-img" src="' + r.img + '" draggable="false"/></span>' +
            '<span class="cf-n">' + r.name + ' ' + r.have + '/' + r.n + '</span>' +
          '</div>';
        }).join('');
        h +=
          '<div class="mask" data-action="closeConfirm"></div>' +
          '<div class="modal cf">' +
            '<div class="cf-title">' + c.name + '</div>' +
            '<div class="cf-desc">' + c.desc + '</div>' +
            '<div class="cf-req">' + reqs +
              '<div class="cf-req-item">' +
                '<span class="r-ico">🪙</span>' +
                '<span class="cf-n">' + c.cost + ' 金币</span>' +
              '</div>' +
            '</div>' +
            '<div class="cf-btns">' +
              '<div class="btn-romantic ghost" data-action="closeConfirm">再想想</div>' +
              '<div class="btn-romantic" data-action="doBuild">开始改造</div>' +
            '</div>' +
          '</div>';
      }
      if (state.showClue) {
        var items = state.clues.map(function (cl) {
          return '<div class="clue-item">· ' + cl + '</div>';
        }).join('');
        h +=
          '<div class="mask" data-action="closeClue"></div>' +
          '<div class="modal clue-modal">' +
            '<div class="clue-title">🔍 黑猫谜案 · 线索</div>' + items +
            '<div class="btn-romantic" data-action="closeClue" style="margin-top:28px">收好</div>' +
          '</div>';
      }
      this._modalEl.innerHTML = h;
    },

    /* ------------------------------------------------------------ 交互 */

    /** v1.9 切换家具风格：写存档 -> 场景与风格条即时刷新 */
    onStyleTap: function (el) {
      var part = el.dataset.sb;
      var n = parseInt(el.dataset.style, 10);
      if (!part || !n) return;
      if (!store.setDecorStyle(part, n)) return;
      this.refresh();
    },

    /** v1.9 主人公做动作：原地跳一下（走路动画由 CSS 常驻） */
    hostAct: function () {
      var el = this._roomEl.querySelector('.host');
      if (!el) return;
      el.classList.remove('act');
      void el.offsetWidth; // 重启动画
      el.classList.add('act');
      clearTimeout(this._hostTimer);
      var self = this;
      this._hostTimer = setTimeout(function () { el.classList.remove('act'); }, 900);
    },

    /** 点餐厅场景里的元素：滚到对应卡片并高亮；没改造完的顺便打开改造确认 */
    onPartTap: function (part) {
      var d = DECOR.find(function (x) { return x.part === part; });
      if (!d) return;
      state.highlight = d.id;
      this.renderList();
      var self = this;
      // scroll-into-view -> scrollIntoView（等 DOM 渲染完再滚）
      setTimeout(function () {
        var card = self._listEl.querySelector('#card-' + d.id);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 30);
      clearTimeout(this._hlTimer);
      this._hlTimer = setTimeout(function () {
        state.highlight = '';
        self.renderList();
      }, 1600);
      if (!store.get().decor[d.id]) this.openBuild(d.id);
    },

    /** v1.7 需求物品点击：旁边弹出 名称/等级/产出容器 提示（再点一次收起） */
    onReqTap: function (reqEl) {
      var tip = reqEl.querySelector('.req-tip');
      if (!tip) return;
      var wasOpen = reqEl.classList.contains('open');
      this.hideReqTips();
      if (wasOpen) return;
      var id = reqEl.dataset.req;
      var m = cfg.getItemMeta(id);
      if (!m) return;
      var gen = this._producerOf(id);
      tip.innerHTML =
        '<div class="rt-name"><img class="rt-img" src="assets/items/' + id + '.png" draggable="false"/> ' + m.name + '</div>' +
        '<div class="rt-lv">等级 Lv.' + m.level + '/' + m.max + '</div>' +
        '<div class="rt-from">产出容器：' + (gen ? gen.name : '未知容器') + '</div>';
      tip.style.display = '';
      reqEl.classList.add('open');
    },

    hideReqTips: function () {
      var opened = this._listEl.querySelectorAll('.req.open');
      for (var i = 0; i < opened.length; i++) {
        opened[i].classList.remove('open');
        var tip = opened[i].querySelector('.req-tip');
        if (tip) tip.style.display = 'none';
      }
    },

    /** 物品 id 前缀（chain）-> 生成器配置；与 game 页 _producerOf 同逻辑 */
    _producerOf: function (id) {
      if (!this._genByChain) {
        this._genByChain = {};
        for (var i = 0; i < cfg.GENS.length; i++) this._genByChain[cfg.GENS[i].chain] = cfg.GENS[i];
      }
      return this._genByChain[String(id).split('_')[0]] || null;
    },

    openBuild: function (id) {
      var d = DECOR.find(function (x) { return x.id === id; });
      if (!d) return;
      var status = store.decorStatus(d);
      if (status === 'done') return;
      if (status === 'lock') {
        this.showToast('达到 Lv.' + d.unlockLv + ' 才能改造这里');
        return;
      }
      if (status === 'lack') {
        this.showToast('材料还不够，回棋盘再合成一些吧');
        return;
      }
      if (status === 'coin') {
        this.showToast('金币不够啦，多交付几个订单～');
        return;
      }
      state.confirm = {
        name: d.name,
        desc: d.desc,
        cost: d.cost,
        status: store.decorStatus(d),
        reqs: d.req.map(function (r) {
          var m = cfg.getItemMeta(r.id) || { icon: '❓', name: '?' };
          return { img: 'assets/items/' + r.id + '.png', name: m.name, n: r.n, have: store.countItem(r.id) };
        }),
        id: id
      };
      this.renderModal();
    },

    closeConfirm: function () {
      state.confirm = null;
      this.renderModal();
    },

    doBuild: function () {
      var id = state.confirm.id;
      var r = store.buildDecor(id);
      state.confirm = null;
      this.renderModal();
      if (!r.ok) {
        this.showToast('条件还没满足');
        return;
      }
      this.refresh();
      this.showToast(r.clue ? '发现了新线索！' : '「' + r.decor.name + '」改造完成 🎉');
      if (r.clue) {
        var self = this;
        this._clueTimer = setTimeout(function () {
          state.showClue = true;
          self.renderModal();
        }, 700);
      }
    },

    closeClue: function () {
      state.showClue = false;
      this.renderModal();
    },

    /** v1.11 点线索条打开线索弹窗（原来误绑成关闭，导致查看不了） */
    openClue: function () {
      if (!state.clues.length) {
        this.showToast('还没有找到线索，继续改造餐厅吧');
        return;
      }
      state.showClue = true;
      this.renderModal();
    },

    showToast: function (text) {
      state.toast = text;
      this._toastEl.textContent = text;
      this._toastEl.style.display = text ? '' : 'none';
      var self = this;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(function () {
        state.toast = '';
        self._toastEl.style.display = 'none';
      }, 1800);
    },

    goBack: function () {
      wx.navigateBack();
    }
  };

  window.RR.pages.decor = page;
})();
