# Vibe Check — Live Virtual Dressing Room

Vibe Check is a local-first Chrome extension prototype. Clicking the extension opens a full-screen dressing room served by the local FastAPI process.

## Current live prototype

- Webcam access through the browser.
- MediaPipe Pose Landmarker runs in the browser (no Replicate inference or per-image API charge).
- Five-second front-facing calibration.
- Multiple wardrobe image uploads and local category suggestions.
- Manual category correction.
- Live 2D garment overlays anchored to tracked body landmarks.

## Run on Windows

1. Start the local server from the `backend` folder:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

2. Open `chrome://extensions`, enable Developer mode, and load this repository folder (the one containing `manifest.json`).
3. Click Vibe Check → **Open live dressing room**.
4. Allow camera access. The first launch needs internet to download the MediaPipe JavaScript/WASM and pose model. Pose inference runs in the browser after loading.
5. Stand far enough back to show your full body, calibrate, upload clothing images, and select an item.

## Important limitations

This is a first live-AR foundation, not a photorealistic virtual fitting system. Garment overlays are 2D images scaled/rotated to body landmarks; they do not yet perform cloth simulation, body occlusion, realistic fabric deformation, automatic background removal, or accurate fit prediction. Category suggestions currently use local filename hints and are user-correctable, not a trained visual garment classifier. Best results require transparent-background garment PNGs. The wardrobe is currently held in the open tab and is not yet persisted between sessions.

The page uses MediaPipe Tasks Vision from jsDelivr and downloads the pose model from Google-hosted model storage on first use. No camera frames or wardrobe images are uploaded to a cloud inference API by this implementation. Camera permission is controlled by Chrome.

## Legacy photo backend

The previous Replicate/IDM-VTON API route and requirements remain in `backend` for reference, but the live dressing-room flow does not call it. IDM-VTON has a non-commercial model licence; review licensing before any commercial use.
