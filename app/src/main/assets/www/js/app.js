/* 入口：启动游戏 */
(function () {
  // 初始化音频（读设置、建好播放器，等首次触摸解锁出声）
  try { window.require('audio').init(); } catch (e) { console.error(e); }

  // 默认进入经营页
  RR.go('/pages/game/game');
})();
