# FileFlex – Offline Edition

All conversion runs in your browser via ffmpeg.wasm. This build bundles the ffmpeg engine and uses system fonts, so it needs **no internet** after setup.

## Quickest way (needs only Node.js)
    node serve.js
Then open http://localhost:5000

## Windows desktop app
The portable Windows `.exe` bundles the exported site and FFmpeg engine, so it
can run offline without Node.js or an installation step. Download the
`FileFlex-*-portable-x64.exe` asset from the latest GitHub Release and run it.

To publish a new release, push a version tag such as `v1.0.0`. The GitHub
Actions workflow builds and attaches the portable `.exe` automatically.

To run the desktop app from source:

    cd desktop
    npm install
    npm start

## Rebuilding from source
    npm install
    npm run build      # stages FFmpeg and outputs the static site to ./out
