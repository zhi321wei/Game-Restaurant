# 浪漫餐厅 · 安卓版

合成 + 餐厅经营小游戏（《浪漫餐厅》同款玩法），由微信小程序版移植，安卓端采用 WebView 承载本地网页资源，无需联网。

## 下载

见 [Releases](../../releases) 页面，下载最新 `romantic-restaurant-vX.Y.apk` 安装（需允许"安装未知来源应用"）。

## 版本规则

- 初始版本 **1.0**，之后每次更新 **+0.1**（1.1、1.2 …）
- 版本号写在 `version.txt`，更新内容记录在 `CHANGELOG.md`
- 发布：推送 tag `vX.Y` 后，GitHub Actions 自动构建 APK 并创建 Release

## 目录结构

```
app/                  安卓壳（WebView）
  src/main/assets/www/  游戏本体（HTML/CSS/JS，本地加载）
version.txt           当前版本号
CHANGELOG.md          更新日志
.github/workflows/    自动构建 APK 的 CI
```

## 本地开发

游戏本体是纯静态网页（`app/src/main/assets/www/index.html`），用浏览器打开即可调试；
改动后推送 tag 即可出新包。
