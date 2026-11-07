# Vibe Check — AI Photo Virtual Try-On

Chrome Manifest V3 extension for generating a still virtual try-on image from:
1. A photo of the person.
2. A single garment/product image.

## Architecture

Chrome extension (photo uploads and result UI) → FastAPI backend → Replicate API → IDM-VTON (A100 GPU) → generated image returned to extension.

The extension never contains the Replicate API token. Keep it only in the backend environment.

## Run locally

Requirements: Python 3.10+.

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Add your Replicate API token to `backend/.env`:
```
REPLICATE_API_TOKEN=r8_your_token_here
```

Start the API:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000
```

Then:
1. Open `chrome://extensions`.
2. Enable Developer mode → Load unpacked → select this repository folder.
3. Open Vibe Check.
4. Upload a person photo and garment photo, select the category, and generate.

## Model / licensing

The default model is `cuuupid/idm-vton` on Replicate. It accepts `human_img`, `garm_img`, `garment_des`, `category`, `steps`, and `seed`. The model is published as non-commercial and its code/checkpoints use CC BY-NC-SA 4.0. Do not use this integration for a commercial product without obtaining compatible rights or replacing the model.

IDM-VTON runs on cloud GPU hardware; a typical Replicate example uses an A100. A laptop RTX 4050 with 6 GB VRAM is not enough to run this pipeline locally.

## Photo guidance

- Person photo: front-facing, good lighting, visible target body region, avoid loose objects covering clothing.
- Garment photo: one item, clearly visible, preferably front view and simple background.
- The output is a visual styling preview, not a size/fit guarantee.
- The backend sends the two images to Replicate for inference. Avoid uploading private images unless comfortable with the provider's data handling.

## Current limitations

- Still-image output only (photo mode).
- Category is selected by the user rather than inferred automatically.
- The extension is local-first and uses `http://127.0.0.1:8000` by default.
- Add authentication, rate limiting, secure storage and a production deployment before sharing the backend publicly.
