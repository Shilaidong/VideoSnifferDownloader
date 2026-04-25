# Video Sniffer Downloader 小白版

这份说明只讲怎么装、怎么用，不讲开发。

## 你要下载什么

去这个页面下载最新安装包：

<https://github.com/Shilaidong/VideoSnifferDownloader/releases>

下载名字类似下面这个压缩包：

`VideoSnifferDownloader-vX.Y.Z-windows-x64-portable.zip`

## 安装步骤

1. 把压缩包解压到你想长期保存的位置。
2. 双击 `install.bat`。
3. 打开 Chrome，进入 `chrome://extensions/`。
4. 打开右上角“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择你刚才解压出来的文件夹里的 `extension` 文件夹。

## 怎么用

1. 打开一个有视频的网页。
2. 等几秒，让插件自动嗅探视频。
3. 点击浏览器右上角的插件图标。
4. 在列表里选中视频。
5. 点击“发送到 N_m3u8DL-RE”。
6. 稍等片刻，会弹出 `cmd` 窗口开始下载。

## 下载到哪里

默认下载到：

`C:\Users\你的用户名\Downloads`

## 常见问题

### 1. 为什么我已经解压了，还要点 `install.bat`

因为 Chrome 的 Native Messaging 机制需要在当前 Windows 用户下做一次本地注册。

### 2. 我把整个文件夹移动了，为什么又不能用了

因为注册表里记录的是旧路径。

解决办法：
重新双击一次 `install.bat`。

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

上游开源项目说明见：

- [README.md](./README.md)
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)
