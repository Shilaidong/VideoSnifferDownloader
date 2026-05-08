# Video Sniffer Downloader Privacy Policy

Last updated: 2026-05-08

Video Sniffer Downloader is a Chrome extension that detects video playlist and media URLs on webpages and sends a selected item to the local N_m3u8DL-RE downloader through Chrome Native Messaging.

## Data Processed

The extension may process the current tab title, current tab URL, detected media URLs, media response metadata, and selected request headers that are needed by common streaming servers, such as Referer, Origin, User-Agent, Cookie, and Authorization.

## Storage

Detected media candidates are stored locally in Chrome storage so the popup can show them after it is opened. The selected platform preference is also stored locally. The extension does not run a remote server and does not sell, rent, or share user data.

## Native Host

When the user clicks the download button, the selected media URL and required request headers are sent to the local native host installed from the GitHub Release package. The native host uses them only to start N_m3u8DL-RE on the user's computer.

## Network Use

The extension itself does not upload detected browsing data to the developer. Network requests made by N_m3u8DL-RE are directed to the media URLs selected by the user.

## Limited Use

Use of information received from Chrome APIs complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Data is used only to provide or improve the extension's single purpose: detecting video media URLs and handing a user-selected item to the local downloader.

## Contact

Project homepage: https://github.com/Shilaidong/VideoSnifferDownloader
