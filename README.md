# Vibe Check — Live Try-On (prototype)

A minimal Manifest V3 Chrome extension inspired by live virtual fitting-room workflows.

## Run it
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository folder.
4. Click the extension, allow camera access, then paste (Ctrl+V), drop or upload a garment image.

## Prototype scope
- Webcam preview and MediaPipe Pose Landmarker tracking.
- Basic top / bottom / dress placement, inferred partly from the filename.
- Change garment without restarting the camera.
- Camera processing runs in the extension popup.

## Important limitations
This is a pose-tracked 2D garment overlay, not a photorealistic AI virtual try-on model. Best results require a clean transparent garment PNG and a front-facing camera view. Arbitrary product photos with backgrounds will still contain their backgrounds. Realistic cloth deformation, occlusion and generative video inference require a dedicated model/service and GPU backend.

The MediaPipe runtime and model are fetched from public CDNs on first launch, so internet access is required.
