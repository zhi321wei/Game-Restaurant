/* 餐厅装修页（移植自 miniprogram/pages/decor/decor.js）
 * 普通 <script>，不用 define()；通过全局 require 取模块。
 */
(function () {
  var cfg = require('config');
  var store = require('store');
  var decorMod = require('decor');
  var DECOR = decorMod.DECOR;
  var PART_HINT = decorMod.PART_HINT;

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
          return { id: r.id, icon: m.icon, name: m.name, have: have, n: r.n, ok: have >= r.n };
        });
        var btn = '装修';
        if (status === 'done') btn = '已完成';
        else if (status === 'lock') btn = 'Lv.' + d.unlockLv + ' 解锁';
        else if (status === 'lack') btn = '收集材料';
        else if (status === 'coin') btn = '金币不足';
        else btn = '开始装修';
        return {
          id: d.id,
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
      var h = '';
      h += '<div class="wallpaper" data-part="wall"></div>';

      h += '<div class="part p-sign' + (p.sign ? ' done' : '') + '" data-part="sign">' +
        '<span class="p-ico">' + (p.sign ? '✨' : '🪧') + '</span>' +
        (p.sign
          ? '<span class="p-label">ROMANTIC</span>'
          : '<span class="p-hint">' + PART_HINT.sign + '</span>') +
      '</div>';

      h += '<div class="part p-lamp' + (p.lamp ? ' done' : '') + '" data-part="lamp">' +
        '<span class="p-ico">💡</span>' +
        (p.lamp ? '' : '<span class="p-hint">' + PART_HINT.lamp + '</span>') +
      '</div>';

      h += '<div class="part p-window' + (p.window ? ' done' : '') + '" data-part="window">' +
        '<span class="p-ico">' + (p.window ? '🌅' : '🪟') + '</span>' +
        (p.window ? '' : '<span class="p-hint">' + PART_HINT.window + '</span>') +
      '</div>';

      h += '<div class="part p-flowers' + (p.flowers ? ' done' : '') + '" data-part="flowers">' +
        '<span class="p-ico">' + (p.flowers ? '💐' : '🪴') + '</span>' +
        (p.flowers ? '' : '<span class="p-hint">' + PART_HINT.flowers + '</span>') +
      '</div>';

      h += '<div class="part p-piano' + (p.piano ? ' done' : '') + '" data-part="piano">' +
        '<span class="p-ico">🎹</span>' +
        (p.piano ? '' : '<span class="p-hint">' + PART_HINT.piano + '</span>') +
      '</div>';

      h += '<div class="part p-terrace' + (p.terrace ? ' done' : '') + '" data-part="terrace">' +
        '<span class="p-ico">' + (p.terrace ? '🏖️' : '🚪') + '</span>' +
        (p.terrace ? '' : '<span class="p-hint">' + PART_HINT.terrace + '</span>') +
      '</div>';

      h += '<div class="part p-kitchen' + (p.kitchen ? ' done' : '') + '" data-part="kitchen">' +
        '<span class="p-ico">' + (p.kitchen ? '👩‍🍳' : '🔒') + '</span>' +
        (p.kitchen ? '' : '<span class="p-hint">' + PART_HINT.kitchen + '</span>') +
      '</div>';

      h += '<div class="part p-garden' + (p.gardenArea ? ' done' : '') + '" data-part="gardenArea">' +
        '<span class="p-ico">' + (p.gardenArea ? '🌿' : '🥀') + '</span>' +
        (p.gardenArea ? '' : '<span class="p-hint">' + PART_HINT.gardenArea + '</span>') +
      '</div>';

      h += '<div class="part p-counter' + (p.counter ? ' done' : '') + '" data-part="counter">' +
        '<span class="p-ico">' + (p.counter ? '🍽️' : '🔨') + '</span>' +
        (p.counter ? '' : '<span class="p-hint">' + PART_HINT.counter + '</span>') +
      '</div>';

      h += '<div class="part p-seats' + (p.seats ? ' done' : '') + '" data-part="seats">' +
        '<span class="p-ico">' + (p.seats ? '🪑' : '🪚') + '</span>' +
        (p.seats ? '' : '<span class="p-hint">' + PART_HINT.seats + '</span>') +
      '</div>';

      h += '<div class="part p-stage' + (p.stage ? ' done' : '') + '" data-part="stage">' +
        '<span class="p-ico">' + (p.stage ? '🎤' : '📦') + '</span>' +
        (p.stage ? '' : '<span class="p-hint">' + PART_HINT.stage + '</span>') +
      '</div>';

      if (p.blackcat) {
        h += '<div class="cat done" data-part="blackcat"><span class="p-ico">🐈‍⬛</span></div>';
      }

      h += '<div class="floor' + (p.floor ? ' done' : '') + '" data-part="floor">' +
        (p.floor ? '' : '<span class="f-hint">' + PART_HINT.floor + '</span>') +
      '</div>';

      h += '<div class="host"><span class="host-ico">👩‍🦰</span></div>';

      this._roomEl.className = 'room' + (p.wall ? ' walled' : '');
      this._roomEl.innerHTML = h;
    },

    renderClueBar: function () {
      if (!state.clues.length) {
        this._clueBarEl.innerHTML = '';
        return;
      }
      this._clueBarEl.innerHTML =
        '<div class="clue-bar" data-action="closeClue">' +
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
            '<span class="r-ico">' + r.icon + '</span>' +
            '<span class="r-n">' + r.have + '/' + r.n + '</span>' +
            '<div class="req-tip" style="display:none"></div>' +
          '</div>';
        }).join('');

        return '<div class="dcard ' + d.status + (d.id === hl ? ' hl' : '') + '" id="card-' + d.id + '">' +
          '<div class="d-head">' +
            '<span class="d-name">' + d.name + '</span>' + tag +
          '</div>' +
          '<div class="d-desc">' + d.desc + '</div>' +
          '<div class="d-req">' + reqs + '</div>' +
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
            '<span class="r-ico">' + r.icon + '</span>' +
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
        '<div class="rt-name">' + m.icon + ' ' + m.name + '</div>' +
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
          return { icon: m.icon, name: m.name, n: r.n, have: store.countItem(r.id) };
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
