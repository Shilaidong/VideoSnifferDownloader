# Video Sniffer Downloader

一个面向 Windows 和 macOS 的开源 Chrome 插件项目，用来把网页里嗅探到的视频资源直接转交给本地下载器，并尽量保留原始 `N_m3u8DL-RE` 的命令行体验。

它的目标是做成“单文件夹可携带”的形态：项目目录可以整体移动，移动后只需要重新注册一次 Native Messaging 宿主即可继续使用。

如果你只是想尽快装好直接用，请看小白版说明：
[README-BEGINNER.md](./README-BEGINNER.md)

## 开源说明

- 本项目许可证：`GPL-3.0-or-later`
- 代码仓库：<https://github.com/Shilaidong/VideoSnifferDownloader>
- 第三方说明：见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
- 小白安装版：见 [README-BEGINNER.md](./README-BEGINNER.md)

## 致谢与上游引用

这个项目明确参考并调用了下面两个开源项目：

- [`nilaoda/N_m3u8DL-RE`](https://github.com/nilaoda/N_m3u8DL-RE)
  本项目使用它作为 `m3u8` / `mpd` 下载与合并的核心引擎。它的上游许可证为 `MIT`。
- [`xifangczy/cat-catch`](https://github.com/xifangczy/cat-catch)
  本项目在浏览器侧媒体嗅探体验与产品方向上参考了它的公开开源实现。它的上游许可证为 `GPL-3.0`。

另外，打包环境中还会下载并携带对应平台的 `FFmpeg` 二进制，用于配合 `N_m3u8DL-RE` 完成合并和转封装。

## 功能

- 嗅探网页中的 `m3u8`、`mpd` 和可直接下载的大视频文件
- 在插件弹窗中展示结果
- 将目标资源直接转交给本地 `N_m3u8DL-RE`
- 自动使用网页标题作为保存名
- 默认保存到当前系统用户的 `Downloads` 目录
- Windows 通过 `cmd` 窗口显示 `N_m3u8DL-RE` 输出，macOS 使用后台伪终端避免系统拦截临时脚本
- 在扩展弹窗中切换启动方式：自动识别、Windows、macOS

## 当前架构

- `extension/`：Chrome MV3 扩展
- `native-host/`：Native Messaging 宿主源码
- `runtime/bin/`：当前平台的 `N_m3u8DL-RE` 与 `ffmpeg` 运行时目录
- `runtime/native-host/`：宿主 exe、宿主 manifest、请求缓存
- `scripts/`：下载运行时、编译宿主、注册宿主的一键脚本

## 给普通用户的安装方式

如果你是直接从 GitHub Releases 下载压缩包安装，推荐走这个流程：

1. 进入仓库的 Releases 页面，按系统下载：
   - Windows：`VideoSnifferDownloader-vX.Y.Z-windows-x64-portable.zip`
   - macOS：`VideoSnifferDownloader-vX.Y.Z-macos-arm64-portable.zip` 或 `VideoSnifferDownloader-vX.Y.Z-macos-x64-portable.zip`
2. 解压到任意你想长期保存的位置
3. 执行安装脚本：
   - Windows：双击 `install.bat`
   - macOS：在终端里执行 `./install-macos.sh`
4. 打开 `chrome://extensions/`
5. 开启“开发者模式”
6. 选择“加载已解压的扩展程序”
7. 选择解压目录中的 `extension` 文件夹

注意：

- 这个项目虽然做成了单文件夹 portable 结构，但 Chrome 的 Native Messaging 机制仍然要求做一次本地注册。
- 如果你后续把整个文件夹移动到了新位置，请重新执行一次对应平台的安装脚本。

## GitHub Release 自动打包

仓库已经内置 GitHub Actions 工作流：`.github/workflows/release.yml`。

发布正式版本时：

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub 会自动构建并上传这些 Release 附件：

- `VideoSnifferDownloader-vX.Y.Z-windows-x64-portable.zip`
- `VideoSnifferDownloader-vX.Y.Z-macos-x64-portable.zip`
- `VideoSnifferDownloader-vX.Y.Z-macos-arm64-portable.zip`

也可以在 GitHub 的 `Actions` 页面手动运行 `Build release packages`，填写 `release_tag` 后生成或更新同名 Release。

发布前请确认 `package.json` 和 `extension/manifest.json` 里的版本号已经同步更新。

## Windows 一键构建

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

## macOS 本地构建

在 macOS 项目根目录执行：

```bash
npm install
npm run build:all:mac
npm run package:release:mac
```

脚本会做这些事情：

1. 按当前 CPU 架构下载 `N_m3u8DL-RE` 的 macOS 发行包
2. 使用 `ffmpeg-static` 提供的当前 macOS `ffmpeg`
3. 将 Native Messaging 宿主编译为 `runtime/native-host/video-sniffer-host`
4. 生成 Chrome Native Messaging manifest
5. 写入当前用户的 Chrome Native Messaging Hosts 目录
6. 额外生成适合 GitHub Releases 上传的 macOS portable 压缩包

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
4. 如有需要，在“启动方式”里选择自动识别、Windows 或 macOS
5. 选择目标资源，点击“发送到 N_m3u8DL-RE”
6. Windows 会弹出一个新的 `cmd` 窗口执行下载；macOS 会在后台启动下载任务

下载文件默认保存到：

```text
C:\Users\<你的用户名>\Downloads
macOS: /Users/<你的用户名>/Downloads
```

## 说明

- 首次使用 Native Messaging 时，Chrome 官方机制要求进行本地宿主注册，所以“可迁移”指的是整个项目目录可移动，但移动后需要重新执行一次对应平台的注册脚本，让 Chrome 指向新的绝对路径。
- 当前实现优先抓主清单和大文件资源，会主动过滤常见 `ts`、`m4s`、`key` 等分片噪音。
- 某些站点依赖 `Referer`、`Cookie`、`User-Agent`，扩展会把捕获到的请求头传给 `N_m3u8DL-RE`。
- 如果你要把仓库作为开源项目继续分发，请保留 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`。
