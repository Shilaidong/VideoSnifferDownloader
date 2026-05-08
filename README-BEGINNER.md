# Video Sniffer Downloader 小白版

这份说明只讲怎么装、怎么用，不讲开发。

## 你要下载什么

去这个页面下载最新安装包：

<https://github.com/Shilaidong/VideoSnifferDownloader/releases>

按你的电脑系统下载名字类似下面的压缩包。

- Windows 电脑：`VideoSnifferDownloader-vX.Y.Z-windows-x64-portable.zip`
- 苹果芯片 Mac，也就是 M1 / M2 / M3 / M4：`VideoSnifferDownloader-vX.Y.Z-macos-arm64-portable.zip`
- Intel 芯片 Mac：`VideoSnifferDownloader-vX.Y.Z-macos-x64-portable.zip`

不知道 Mac 是哪种芯片的话，点左上角苹果图标，选择“关于本机”，看“芯片”或“处理器”。

## 安装步骤

1. 把压缩包解压到你想长期保存的位置。
2. 执行安装脚本。
   - Windows：双击 `install.bat`
   - macOS：打开终端，进入解压后的文件夹，执行 `./install-macos.sh`
3. 打开 Chrome，进入 `chrome://extensions/`。
4. 打开右上角“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择你刚才解压出来的文件夹里的 `extension` 文件夹。

## 怎么用

1. 打开一个有视频的网页。
2. 等几秒，让插件自动嗅探视频。
3. 点击浏览器右上角的插件图标。
4. 在列表里选中视频。
5. “启动方式”一般保持“自动识别当前系统”即可；如果你确定要手动选，也可以切到 Windows 或 macOS。
6. 点击“发送到 N_m3u8DL-RE”。
7. 稍等片刻，会弹出终端窗口开始下载。

## 下载到哪里

默认下载到：

- Windows：`C:\Users\你的用户名\Downloads`
- macOS：`/Users/你的用户名/Downloads`

## 常见问题

### 1. 为什么我已经解压了，还要点 `install.bat`

因为 Chrome 的 Native Messaging 机制需要在当前电脑用户下做一次本地注册。

macOS 用户对应的是执行 `./install-macos.sh`。

### 2. 我把整个文件夹移动了，为什么又不能用了

因为 Chrome 记录的是旧路径。

解决办法：

- Windows：重新双击一次 `install.bat`
- macOS：重新执行一次 `./install-macos.sh`

### 3. 为什么没有嗅探到视频

不是所有网站都能保证抓到。

这个插件会优先抓：

- `m3u8`
- `mpd`
- 可以直接下载的大视频文件

它不会把一堆普通分片 `ts`、`m4s` 都直接堆给你。

### 4. 为什么下载失败

有些网站依赖：

- `Referer`
- `Cookie`
- `User-Agent`

本项目会尽量把这些请求头一起带给 `N_m3u8DL-RE`，但不同网站规则不一样，所以不能保证所有站点都成功。

## 这项目是什么

这是一个开源项目，作用是：

- Chrome 里负责嗅探网页视频
- 把结果交给本地 `N_m3u8DL-RE`
- 配好 `ffmpeg`
- 用网页标题自动命名
- Windows 和 macOS 用同一套扩展界面，弹窗里可以切换启动方式

上游开源项目说明见：

- [README.md](./README.md)
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
