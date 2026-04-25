# Video Sniffer Downloader

一个可独立放在单个文件夹中的 Chrome 插件项目，用来：

- 嗅探网页中的 `m3u8`、`mpd` 和可直接下载的大视频文件
- 在插件弹窗中展示结果
- 将目标资源直接转交给本地 `N_m3u8DL-RE`
- 自动使用网页标题作为保存名
- 默认保存到 Windows 的 `Downloads` 目录
- 通过新的 `cmd` 窗口显示 `N_m3u8DL-RE` 原始输出

## 当前架构

- `extension/`：Chrome MV3 扩展
- `native-host/`：Native Messaging 宿主源码
- `runtime/bin/`：`N_m3u8DL-RE` 与 `ffmpeg` 运行时目录
- `runtime/native-host/`：宿主 exe、宿主 manifest、请求缓存
- `scripts/`：下载运行时、编译宿主、注册宿主的一键脚本

## 一键构建

在项目根目录执行：

```powershell
npm install
npm run build:all
```

脚本会做这些事情：

1. 下载 `N_m3u8DL-RE` 最新 Windows x64 发行包
2. 下载 `ffmpeg` 最新 Windows x64 静态构建
3. 将 Native Messaging 宿主编译为 `runtime/native-host/video-sniffer-host.exe`
4. 复制 PowerShell 下载执行脚本
5. 生成 Chrome Native Messaging manifest
6. 写入当前用户注册表

## 加载扩展

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择当前项目下的 `extension` 文件夹

扩展 ID 已通过固定 `key` 锁定，便于与 Native Messaging 宿主匹配。

## 使用流程

1. 打开包含视频的网页
2. 等待插件嗅探到 `m3u8`、`mpd` 或大文件视频
3. 点击扩展图标
4. 选择目标资源，点击“发送到 N_m3u8DL-RE”
5. 会弹出一个新的 `cmd` 窗口执行下载

下载文件默认保存到：

```text
C:\Users\<你的用户名>\Downloads
```

## 说明

- 首次使用 Native Messaging 时，Chrome 官方机制要求进行本地宿主注册，所以“可迁移”指的是整个项目目录可移动，但移动后需要重新执行一次 `npm run register:host`，让注册表指向新的绝对路径。
- 当前实现优先抓主清单和大文件资源，会主动过滤常见 `ts`、`m4s`、`key` 等分片噪音。
- 某些站点依赖 `Referer`、`Cookie`、`User-Agent`，扩展会把捕获到的请求头传给 `N_m3u8DL-RE`。
