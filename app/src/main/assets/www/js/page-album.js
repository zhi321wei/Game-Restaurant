/* 图鉴页：移植自 miniprogram/pages/album
 * 7 条合成链 × 7 级网格 + 进度统计；wx:for 改为 JS 字符串渲染。
 */
(function () {
  var cfg = require('config');
  var store = require('store');

  RR.pages.album = {
    el: null,

    init: function () {
      this.el.innerHTML =
        '<div class="page">' +
          '<div class="nav">' +
            '<div class="back">‹</div>' +
            '<span class="nav-title">美食图鉴</span>' +
            '<span class="nav-num"></span>' +
          '</div>' +
          '<div class="summary">' +
            '<div class="ring">' +
              '<span class="ring-num"></span>' +
            '</div>' +
            '<div class="sum-txt">' +
              '<div class="sum-line">已收集 <span class="hl"></span> / <span class="sum-total"></span> 种</div>' +
              '<div class="sum-sub"></div>' +
            '</div>' +
          '</div>' +
          '<div class="body"></div>' +
        '</div>';

      this.$navNum = this.el.querySelector('.nav-num');
      this.$ringNum = this.el.querySelector('.ring-num');
      this.$hl = this.el.querySelector('.hl');
      this.$sumTotal = this.el.querySelector('.sum-total');
      this.$sumSub = this.el.querySelector('.sum-sub');
      this.$body = this.el.querySelector('.body');

      this.el.querySelector('.back').addEventListener('click', function () {
        wx.navigateBack();
      });

      var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.el.querySelector('.page').style.paddingTop = ((info.statusBarHeight || 20) + 8) + 'px';
    },

    onShow: function () {
      var st = store.get();
      var groups = Object.keys(cfg.CHAINS).map(function (key) {
        var c = cfg.CHAINS[key];
        var items = c.items.map(function (it, i) {
          var id = cfg.itemId(c.id, i + 1);
          var got = !!st.album[id];
          return {
            id: id,
            icon: got ? it.icon : '❓',
            name: got ? it.name : '???',
            lv: i + 1,
            got: got,
            tint: c.tint
          };
        });
        var got = items.filter(function (i) { return i.got; }).length;
        return {
          id: c.id,
          name: c.name,
          tint: c.tint,
          items: items,
          got: got,
          total: items.length
        };
      });

      var got = store.albumCount();
      var total = store.albumTotal();
      var pct = Math.round((got / total) * 100);
      var stats = st.stats;

      this.$navNum.textContent = got + '/' + total;
      this.$ringNum.textContent = pct + '%';
      this.$hl.textContent = got;
      this.$sumTotal.textContent = total;
      if (stats) {
        this.$sumSub.style.display = '';
        this.$sumSub.textContent =
          '交付订单 ' + stats.orders + ' 次 · 合成 ' + stats.merges + ' 次 · 累计金币 ' + stats.coin;
      } else {
        this.$sumSub.style.display = 'none';
      }

      var html = '';
      groups.forEach(function (g) {
        html +=
          '<div class="group">' +
            '<div class="g-head">' +
              '<span class="g-name">' + g.name + '</span>' +
              '<span class="g-num">' + g.got + '/' + g.total + '</span>' +
            '</div>' +
            '<div class="g-items">';
        g.items.forEach(function (it) {
          html +=
            '<div class="cell' + (it.got ? ' got' : '') + '">' +
              '<span class="c-ico">' + (it.got ? '<img class="c-img" src="assets/items/' + it.id + '.png" draggable="false"/>' : it.icon) + '</span>' +
              '<span class="c-name">' + it.name + '</span>' +
              '<span class="c-lv">Lv.' + it.lv + '</span>' +
            '</div>';
        });
        html += '</div></div>';
      });
      html += '<div class="pad"></div>';
      this.$body.innerHTML = html;
    },

    onHide: function () {}
  };
})();
