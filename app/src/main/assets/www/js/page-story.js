/* 剧情页（覆盖层）：移植自 miniprogram/pages/story
 * 章节 id 来源：game 页跳转前写入 wx.setStorageSync('rr_pending_story', id)，
 * 这里取出后即清除；没有则回退到 store 里待播的章节（原 onLoad 兜底逻辑）。
 */
(function () {
  var storyMod = require('story');
  var CHAPTERS = storyMod.CHAPTERS;
  var ROLES = storyMod.ROLES;
  var store = require('store');

  RR.pages.story = {
    el: null,

    init: function () {
      this.el.innerHTML =
        '<div class="story">' +
          '<div class="sky">' +
            '<div class="sun"></div>' +
            '<div class="sea"></div>' +
          '</div>' +
          '<div class="topbar">' +
            '<span class="title"></span>' +
            '<span class="progress"></span>' +
          '</div>' +
          '<div class="stage">' +
            '<div class="actor hide">' +
              '<span class="avatar"></span>' +
              '<span class="who"></span>' +
            '</div>' +
          '</div>' +
          '<div class="dialog">' +
            '<span class="text"></span>' +
            '<div class="caret"></div>' +
          '</div>' +
          '<div class="foot tip-foot">' +
            '<span class="tip">轻点屏幕继续 ▸</span>' +
          '</div>' +
          '<div class="foot done-foot">' +
            '<div class="btn-romantic ghost btn-close">回到餐厅</div>' +
            '<div class="btn-romantic btn-next">下一段故事</div>' +
          '</div>' +
        '</div>';

      var el = this.el;
      this.$root = el.querySelector('.story');
      this.$title = el.querySelector('.title');
      this.$progress = el.querySelector('.progress');
      this.$actor = el.querySelector('.actor');
      this.$avatar = el.querySelector('.avatar');
      this.$who = el.querySelector('.who');
      this.$text = el.querySelector('.dialog .text');
      this.$caret = el.querySelector('.caret');
      this.$tipFoot = el.querySelector('.tip-foot');
      this.$doneFoot = el.querySelector('.done-foot');

      var self = this;
      this.$root.addEventListener('click', function () { self.onTap(); });
      // 原 catchtap：阻止冒泡到 .story 的推进点击
      el.querySelector('.btn-close').addEventListener('click', function (e) {
        e.stopPropagation();
        self.onClose();
      });
      el.querySelector('.btn-next').addEventListener('click', function (e) {
        e.stopPropagation();
        self.onNextChapter();
      });

      this._timer = null;
      this.d = { idx: 0, total: 0, text: '', role: null, done: false, typing: false };
    },

    onShow: function () {
      var id = wx.getStorageSync('rr_pending_story');
      if (id) wx.removeStorageSync('rr_pending_story');
      if (!id) id = (store.nextChapter() && store.nextChapter().id);
      var chapter = CHAPTERS.find(function (c) { return c.id === id; }) || CHAPTERS[0];
      this.chapter = chapter;

      var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.$root.style.paddingTop = ((info.statusBarHeight || 20) + 10) + 'px';
      this.d.done = false;
      this.$title.textContent = chapter.title;
      this.d.total = chapter.lines.length;
      this._renderFoot();
      this.showLine(0);
    },

    onHide: function () {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      // 未看完也标记已读，避免卡住主线
      if (this.chapter && !this.d.done) {
        store.finishChapter(this.chapter.id);
      }
    },

    _renderLine: function () {
      var d = this.d;
      this.$progress.textContent = (d.idx + 1) + '/' + d.total;
      var role = d.role;
      this.$actor.classList.toggle('hide', !(role && role.avatar));
      this.$avatar.textContent = (role && role.avatar) || '';
      this.$who.style.display = (role && role.name) ? '' : 'none';
      this.$who.textContent = (role && role.name) || '';
      this.$text.textContent = d.text;
      this.$caret.style.display = d.typing ? '' : 'none';
    },

    _renderFoot: function () {
      this.$tipFoot.style.display = this.d.done ? 'none' : '';
      this.$doneFoot.style.display = this.d.done ? '' : 'none';
    },

    showLine: function (i) {
      var line = this.chapter.lines[i];
      if (!line) return;
      var role = ROLES[line.who] || ROLES.narr;
      this.d.idx = i;
      this.d.role = role;
      this.d.text = '';
      this.d.typing = true;
      this._renderLine();
      this.typeText(line.text);
    },

    typeText: function (text) {
      if (this._timer) clearInterval(this._timer);
      var self = this;
      var n = 0;
      this._timer = setInterval(function () {
        n += 1;
        self.d.text = text.slice(0, n);
        self.$text.textContent = self.d.text;
        if (n >= text.length) {
          clearInterval(self._timer);
          self._timer = null;
          self.d.typing = false;
          self.$caret.style.display = 'none';
        }
      }, 34);
    },

    onTap: function () {
      if (this.d.typing) {
        // 跳过打字
        var line = this.chapter.lines[this.d.idx];
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
        this.d.text = line.text;
        this.d.typing = false;
        this._renderLine();
        return;
      }
      var next = this.d.idx + 1;
      if (next >= this.chapter.lines.length) {
        this.d.done = true;
        this._renderFoot();
        store.finishChapter(this.chapter.id);
        return;
      }
      this.showLine(next);
    },

    onClose: function () {
      if (this._timer) clearInterval(this._timer);
      this._timer = null;
      store.finishChapter(this.chapter.id);
      wx.navigateBack();
    },

    onNextChapter: function () {
      var c = store.nextChapter();
      if (c) {
        this.chapter = c;
        this.d.done = false;
        this.$title.textContent = c.title;
        this.d.total = c.lines.length;
        this._renderFoot();
        this.showLine(0);
      } else {
        wx.navigateBack();
      }
    }
  };
})();
