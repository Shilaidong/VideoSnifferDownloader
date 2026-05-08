# Chrome Web Store Listing Draft

Use this file when filling in the Chrome Developer Dashboard.

## Package

- Extension ZIP: `dist/chrome-web-store/VideoSnifferDownloader-v0.2.5-chrome-web-store.zip`
- Icon: `dist/chrome-web-store/icon128.png`
- Screenshot: `dist/chrome-web-store/screenshot-1280x800.png`
- Small promotional image: `dist/chrome-web-store/promo-440x280.png`

## Store Listing

Name:
Video Sniffer Downloader

Summary:
Find video playlist URLs on webpages and send them to local N_m3u8DL-RE for downloading.

Category:
Productivity

Language:
Chinese (Simplified)

Detailed description:

Video Sniffer Downloader helps you find video playlist and media URLs while browsing, then send a selected item to a local N_m3u8DL-RE downloader.

Features:
- Detects common streaming resources such as m3u8, mpd, and large direct video files.
- Shows captured resources in a simple popup for the current tab.
- Sends the selected URL and required request headers to the local native host.
- Supports macOS and Windows native host packages from GitHub Releases.
- Keeps detected data local to Chrome and the user's computer.

Important:
The Chrome Web Store extension is only the browser side. To actually download with N_m3u8DL-RE, users must install the matching macOS or Windows native host package from GitHub Releases:
https://github.com/Shilaidong/VideoSnifferDownloader/releases/latest

## Privacy Fields

Single purpose:
Detect video playlist and media URLs on the current browsing page and send a user-selected item to a local N_m3u8DL-RE downloader.

Remote code:
No. The extension does not load or execute remotely hosted code.

Data collection:
Disclose Web browsing activity and Website content if the dashboard asks, because the extension observes network requests, page URLs, media URLs, and selected request headers. Explain that this data is stored locally and sent only to the local native host when the user starts a download.

Privacy policy URL:
https://github.com/Shilaidong/VideoSnifferDownloader/blob/main/PRIVACY_POLICY.md

## Permission Justifications

nativeMessaging:
Required to send the user-selected media URL and headers to the local native host that starts N_m3u8DL-RE.

storage:
Required to keep captured media candidates for the current browser session and remember the user's platform preference.

tabs:
Required to identify the active tab and show the page title and URL in the popup.

webRequest:
Required to observe network responses and detect m3u8, mpd, and video resources.

host permissions / all URLs:
Required because users may watch videos on many different sites, and the extension can only detect media requests on sites covered by host permissions.

## Review Notes

This extension does not provide video content, bypass access controls, or host downloaded media. It detects media URLs requested by pages the user opens and hands the selected URL to a local downloader installed separately by the user.
