# Video Sniffer Downloader

一个面向 Windows 的开源 Chrome 插件项目，用来把网页里嗅探到的视频资源直接转交给本地下载器，并尽量保留原始 `N_m3u8DL-RE` 的命令行体验。

它的目标是做成“单文件夹可携带”的形态：项目目录可以整体移动，移动后只需要重新注册一次 Native Messaging 宿主即可继续使用。

## 开源说明

- 本项目许可证：`GPL-3.0-or-later`
- 代码仓库：<https://github.com/Shilaidong/VideoSnifferDownloader>
- 第三方说明：见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)

## 致谢与上游引用

这个项目明确参考并调用了下面两个开源项目：

- [`nilaoda/N_m3u8DL-RE`](https://github.com/nilaoda/N_m3u8DL-RE)
  本项目使用它作为 `m3u8` / `mpd` 下载与合并的核心引擎。它的上游许可证为 `MIT`。
- [`xifangczy/cat-catch`](https://github.com/xifangczy/cat-catch)
  本项目在浏览器侧媒体嗅探体验与产品方向上参考了它的公开开源实现。它的上游许可证为 `GPL-3.0`。

另外，打包环境中还会下载并携带 `FFmpeg` Windows 二进制，用于配合 `N_m3u8DL-RE` 完成合并和转封装。

## 功能

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

## 给普通用户的安装方式

如果你是直接从 GitHub Releases 下载压缩包安装，推荐走这个流程：

1. 进入仓库的 Releases 页面，下载 `VideoSnifferDownloader-vX.Y.Z-windows-x64-portable.zip`
2. 解压到任意你想长期保存的位置
3. 双击压缩包里的 `install.bat`
4. 打开 `chrome://extensions/`
5. 开启“开发者模式”
6. 选择“加载已解压的扩展程序”
7. 选择解压目录中的 `extension` 文件夹

注意：

- 这个项目虽然做成了单文件夹 portable 结构，但 Chrome 的 Native Messaging 机制仍然要求写入当前用户注册表。
- 如果你后续把整个文件夹移动到了新位置，请重新执行一次 `install.bat`。

## 一键构建

在项目根目录执行：

```powershell
npm install
npm run build:all
npm run package:release
```

脚本会做这些事情：

1. 下载 `N_m3u8DL-RE` 最新 Windows x64 发行包
2. 下载 `ffmpeg` 最新 Windows x64 静态构建
3. 将 Native Messaging 宿主编译为 `runtime/native-host/video-sniffer-host.exe`
4. 复制 PowerShell 下载执行脚本
5. 生成 Chrome Native Messaging manifest
6. 写入当前用户注册表
7. 额外生成适合 GitHub Releases 上传的 portable 压缩包

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
- 如果你要把仓库作为开源项目继续分发，请保留 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`。
