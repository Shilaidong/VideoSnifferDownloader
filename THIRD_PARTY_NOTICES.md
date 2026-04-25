# Third-Party Notices

This repository is released under `GPL-3.0-or-later`, but it depends on and/or redistributes third-party open-source projects that keep their own licenses.

## Included or Referenced Upstream Projects

### 1. N_m3u8DL-RE

- Upstream: <https://github.com/nilaoda/N_m3u8DL-RE>
- License: `MIT`
- Role in this project:
  This project uses `N_m3u8DL-RE` as the actual download engine for `m3u8` and `mpd` resources. The Chrome extension and native host are a wrapper workflow around that downloader.

### 2. cat-catch

- Upstream: <https://github.com/xifangczy/cat-catch>
- License: `GPL-3.0`
- Role in this project:
  This project references the open-source browser media sniffing direction established by `cat-catch`, and uses that upstream project as an important public reference when designing the extension-side capture experience.

### 3. FFmpeg / BtbN FFmpeg Builds

- Upstream binary source:
  <https://github.com/BtbN/FFmpeg-Builds/releases>
- Role in this project:
  The packaged runtime downloads and redistributes Windows `ffmpeg` binaries so that `N_m3u8DL-RE` can merge and process media correctly.
- Note:
  The current automation downloads the `win64-gpl` build, so redistribution and downstream use must also respect the licenses that apply to that FFmpeg build and its enabled components.

## Important Notes

- This repository does not claim ownership over the upstream projects listed above.
- Upstream project names, binaries, and core functionality remain the property of their respective authors and communities.
- When redistributing packaged releases of this project, keep this notice file and the repository `LICENSE` file together with the distributed bundle.
