# Third-party notices

## MediaPipe Tasks Vision

Vibe Check's one-time setup downloads MediaPipe Tasks Vision 0.10.14 from the npm CDN and its associated WebAssembly runtime files. MediaPipe is provided by Google LLC and is distributed under the Apache License, Version 2.0. The full license is included as `frontend/vendor/mediapipe/LICENSE` after running the setup script.

MediaPipe Pose Landmarker Lite model is downloaded from Google's hosted model storage:
`https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`.

No model inference API is called by the extension. All pose inference occurs in the browser on the user's device.
