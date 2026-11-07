$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$VisionRoot = Join-Path $Root "frontend\vendor\mediapipe"
$WasmRoot = Join-Path $VisionRoot "wasm"
$ModelRoot = Join-Path $Root "frontend\models"

New-Item -ItemType Directory -Force -Path $VisionRoot, $WasmRoot, $ModelRoot | Out-Null

$Files = @(
  @{ Url = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"; Path = (Join-Path $VisionRoot "vision_bundle.mjs") },
  @{ Url = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.js"; Path = (Join-Path $WasmRoot "vision_wasm_internal.js") },
  @{ Url = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_internal.wasm"; Path = (Join-Path $WasmRoot "vision_wasm_internal.wasm") },
  @{ Url = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.js"; Path = (Join-Path $WasmRoot "vision_wasm_nosimd_internal.js") },
  @{ Url = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm/vision_wasm_nosimd_internal.wasm"; Path = (Join-Path $WasmRoot "vision_wasm_nosimd_internal.wasm") },
  @{ Url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"; Path = (Join-Path $ModelRoot "pose_landmarker_lite.task") },
  @{ Url = "https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE"; Path = (Join-Path $VisionRoot "LICENSE") }
)

foreach ($File in $Files) {
  if ((Test-Path $File.Path) -and ((Get-Item $File.Path).Length -gt 0)) {
    Write-Host ("Already present: " + [System.IO.Path]::GetFileName($File.Path)) -ForegroundColor DarkGray
    continue
  }
  Write-Host ("Downloading " + [System.IO.Path]::GetFileName($File.Path) + " ...") -ForegroundColor Cyan
  Invoke-WebRequest -Uri $File.Url -OutFile $File.Path -UseBasicParsing
  if (!(Test-Path $File.Path) -or (Get-Item $File.Path).Length -eq 0) {
    throw ("Download failed: " + $File.Url)
  }
}
Write-Host ""
Write-Host "Vibe Check local assets are ready." -ForegroundColor Green
Write-Host "Next: chrome://extensions > Developer mode > Load unpacked > select this folder:"
Write-Host $Root
