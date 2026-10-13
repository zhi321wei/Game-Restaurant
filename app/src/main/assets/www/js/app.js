/* 入口：启动游戏 */
(function () {
  // 初始化音频（读设置、建好播放器，等首次触摸解锁出声）
  var audio = null;
  try { audio = window.require('audio'); audio.init(); } catch (e) { console.error(e); }

  // v1.2 切后台静音：Android MainActivity 的 onPause/onResume 会调这两个钩子
  window.__rrAudioSuspend = function () {
    if (audio) { try { audio.pause(); } catch (e) {} }
  };
  window.__rrAudioResume = function () {
    if (audio) { try { audio.play(); } catch (e) {} }
  };
  // 兜底：WebView 标签页不可见时也暂停（部分机型不触发 Activity onPause）
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) window.__rrAudioSuspend();
    else window.__rrAudioResume();
  });

  // 默认进入经营页
  RR.go('/pages/game/game');
})();
