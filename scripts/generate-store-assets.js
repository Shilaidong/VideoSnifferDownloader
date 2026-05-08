"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const iconDir = path.join(root, "extension", "icons");
const assetDir = path.join(root, "store-assets");

fs.mkdirSync(iconDir, { recursive: true });
fs.mkdirSync(assetDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(iconDir, `icon${size}.png`), createIcon(size));
}

fs.writeFileSync(path.join(assetDir, "screenshot.html"), createScreenshotHtml(), "utf8");
fs.writeFileSync(path.join(assetDir, "promo.html"), createPromoHtml(), "utf8");

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const inset = Math.max(2, Math.round(size * 0.125));
  const radius = Math.round(size * 0.2);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const inside = roundedRectContains(x, y, inset, inset, size - inset * 2, size - inset * 2, radius);
      if (!inside) {
        continue;
      }

      const t = y / Math.max(1, size - 1);
      pixels[i] = Math.round(14 + 22 * t);
      pixels[i + 1] = Math.round(122 - 20 * t);
      pixels[i + 2] = Math.round(92 + 35 * t);
      pixels[i + 3] = 255;
    }
  }

  const cx = size / 2;
  const cy = size / 2;
  fillTriangle(
    pixels,
    size,
    { x: cx - size * 0.13, y: cy - size * 0.2 },
    { x: cx - size * 0.13, y: cy + size * 0.2 },
    { x: cx + size * 0.24, y: cy },
    [255, 255, 255, 245]
  );

  fillRect(pixels, size, size * 0.32, size * 0.68, size * 0.36, size * 0.08, [255, 255, 255, 225]);
  fillTriangle(
    pixels,
    size,
    { x: cx, y: size * 0.63 },
    { x: cx - size * 0.11, y: size * 0.51 },
    { x: cx + size * 0.11, y: size * 0.51 },
    [255, 255, 255, 225]
  );
  fillRect(pixels, size, cx - size * 0.035, size * 0.4, size * 0.07, size * 0.19, [255, 255, 255, 225]);

  return encodePng(size, size, pixels);
}

function roundedRectContains(x, y, rx, ry, width, height, radius) {
  const right = rx + width - 1;
  const bottom = ry + height - 1;
  const qx = x < rx + radius ? rx + radius : x > right - radius ? right - radius : x;
  const qy = y < ry + radius ? ry + radius : y > bottom - radius ? bottom - radius : y;
  return x >= rx && x <= right && y >= ry && y <= bottom && (x - qx) ** 2 + (y - qy) ** 2 <= radius ** 2;
}

function fillRect(pixels, size, x, y, width, height, color) {
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const right = Math.min(size, Math.ceil(x + width));
  const bottom = Math.min(size, Math.ceil(y + height));

  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      setPixel(pixels, size, px, py, color);
    }
  }
}

function fillTriangle(pixels, size, a, b, c, color) {
  const left = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const right = Math.min(size - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const top = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const bottom = Math.min(size - 1, Math.ceil(Math.max(a.y, b.y, c.y)));

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (pointInTriangle(x + 0.5, y + 0.5, a, b, c)) {
        setPixel(pixels, size, x, y, color);
      }
    }
  }
}

function pointInTriangle(px, py, a, b, c) {
  const area = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const p = { x: px, y: py };
  const d1 = area(p, a, b);
  const d2 = area(p, b, c);
  const d3 = area(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function setPixel(pixels, size, x, y, color) {
  const i = (y * size + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3];
}

function encodePng(width, height, rgba) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    rgba.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", zlib.deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createScreenshotHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=1280,height=800,initial-scale=1">
<title>Video Sniffer Downloader Screenshot</title>
<style>
*{box-sizing:border-box}body{margin:0;width:1280px;height:800px;font:22px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei UI",sans-serif;color:#18201d;background:#f7f4ed;overflow:hidden}.shell{display:grid;grid-template-columns:720px 1fr;height:800px}.page{padding:52px 60px;background:linear-gradient(180deg,#ffffff,#edf6f2);border-right:1px solid #d8e2dc}.browser{height:470px;border:1px solid #c7d3cc;border-radius:14px;background:#fff;box-shadow:0 24px 60px rgba(20,45,35,.12);overflow:hidden}.bar{height:46px;background:#eef3f0;border-bottom:1px solid #d9e4de;display:flex;gap:10px;align-items:center;padding:0 16px}.dot{width:12px;height:12px;border-radius:50%;background:#d65b49}.dot:nth-child(2){background:#dfb24b}.dot:nth-child(3){background:#36a176}.address{margin-left:12px;height:24px;flex:1;border-radius:12px;background:#fff;color:#62736b;font-size:13px;display:flex;align-items:center;padding:0 14px}.video{margin:36px auto 20px;width:560px;height:315px;border-radius:10px;background:linear-gradient(135deg,#10231f,#0f7a5c);position:relative}.play{position:absolute;left:238px;top:105px;width:0;height:0;border-top:48px solid transparent;border-bottom:48px solid transparent;border-left:76px solid rgba(255,255,255,.9)}.caption{margin:0 auto;width:560px;color:#65756d;font-size:18px}.side{padding:52px 56px;background:#fffaf4}.popup{width:420px;border:1px solid rgba(68,54,42,.15);border-radius:22px;background:#fffdf9;box-shadow:0 20px 60px rgba(62,41,20,.16);padding:18px}.eyebrow{margin:0 0 8px;color:#0a5d46;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.title{margin:0;font-size:24px;line-height:1.2}.url{margin:10px 0 18px;font-size:14px;color:#6d6259;word-break:break-all}.tools{display:flex;gap:10px;margin-bottom:14px}.btn{border:0;border-radius:999px;padding:10px 14px;background:#e7ddd0;font-size:14px}.select{border:1px solid rgba(68,54,42,.15);border-radius:12px;padding:10px 12px;margin-bottom:14px;font-size:14px;color:#1e1b18;background:#fff}.card{border:1px solid rgba(68,54,42,.15);border-radius:18px;background:#fffdf9;padding:16px}.badges{display:flex;gap:8px;margin-bottom:10px}.badge{border-radius:999px;background:#efe2d2;color:#533f30;padding:4px 10px;font-size:11px;font-weight:800;text-transform:uppercase}.card h2{font-size:17px;margin:0 0 8px}.card p{font-size:13px;margin:0 0 14px;color:#6d6259;word-break:break-all}.primary{background:#0f7a5c;color:#fff}.copy{background:#e7ddd0}.headline{font-size:44px;line-height:1.08;margin:0 0 18px}.lead{font-size:20px;color:#53635d;margin:0 0 30px}.check{display:grid;gap:14px;color:#31443c;font-size:18px}.check span:before{content:"";display:inline-block;width:10px;height:10px;margin-right:12px;border-radius:50%;background:#0f7a5c}</style>
<body>
  <div class="shell">
    <section class="page">
      <h1 class="headline">网页视频嗅探<br>交给本机下载器</h1>
      <p class="lead">播放页面时自动捕获 m3u8、mpd 和常见视频链接。</p>
      <div class="browser">
        <div class="bar"><i class="dot"></i><i class="dot"></i><i class="dot"></i><div class="address">https://example.com/video</div></div>
        <div class="video"><i class="play"></i></div>
        <p class="caption">检测到 playlist.m3u8，准备发送到本机 N_m3u8DL-RE。</p>
      </div>
    </section>
    <section class="side">
      <div class="popup">
        <p class="eyebrow">Video Sniffer Downloader</p>
        <h2 class="title">Example Video Page</h2>
        <p class="url">https://example.com/video</p>
        <div class="tools"><button class="btn">刷新列表</button><button class="btn">清空当前页</button></div>
        <div class="select">启动方式：自动识别当前系统</div>
        <article class="card">
          <div class="badges"><span class="badge">m3u8</span><span class="badge">playlist</span></div>
          <h2>Example Video Page</h2>
          <p>https://cdn.example.com/hls/playlist.m3u8</p>
          <div class="tools"><button class="btn primary">发送到 N_m3u8DL-RE</button><button class="btn copy">复制链接</button></div>
        </article>
      </div>
      <div class="check" style="margin-top:34px"><span>macOS / Windows 安装包共存</span><span>链接和必要请求头只在本机处理</span><span>适合已经有下载目录习惯的小白用户</span></div>
    </section>
  </div>
</body>
</html>`;
}

function createPromoHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=440,height=280,initial-scale=1">
<title>Video Sniffer Downloader Promo</title>
<style>
*{box-sizing:border-box}body{margin:0;width:440px;height:280px;overflow:hidden;background:linear-gradient(135deg,#0f7a5c,#1b2a35);font:20px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei UI",sans-serif;color:#fff}.wrap{position:relative;width:440px;height:280px;padding:30px}.icon{width:94px;height:94px;border-radius:22px;background:#fff;display:grid;place-items:center;box-shadow:0 18px 40px rgba(0,0,0,.22)}.icon img{width:70px;height:70px}.panel{position:absolute;right:30px;top:46px;width:205px;height:166px;border-radius:18px;background:rgba(255,255,255,.96);box-shadow:0 20px 55px rgba(0,0,0,.22);padding:18px;color:#1e1b18}.line{height:10px;border-radius:5px;background:#d9e4de;margin-bottom:12px}.line.short{width:62%}.pill{width:104px;height:34px;border-radius:999px;background:#0f7a5c;margin-top:10px}.connector{position:absolute;left:122px;top:92px;width:118px;height:2px;background:rgba(255,255,255,.5)}.connector:before,.connector:after{content:"";position:absolute;top:-5px;width:12px;height:12px;border-radius:50%;background:#fff}.connector:before{left:-2px}.connector:after{right:-2px}.wave{position:absolute;left:28px;bottom:28px;width:190px;height:60px}.wave i{display:inline-block;width:10px;margin-right:7px;border-radius:999px;background:rgba(255,255,255,.82);vertical-align:bottom}.wave i:nth-child(1){height:18px}.wave i:nth-child(2){height:34px}.wave i:nth-child(3){height:50px}.wave i:nth-child(4){height:28px}.wave i:nth-child(5){height:44px}.wave i:nth-child(6){height:22px}</style>
<body>
  <div class="wrap">
    <div class="icon"><img src="../extension/icons/icon128.png" alt=""></div>
    <div class="connector"></div>
    <div class="panel"><div class="line"></div><div class="line"></div><div class="line short"></div><div class="pill"></div></div>
    <div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i></div>
  </div>
</body>
</html>`;
}
