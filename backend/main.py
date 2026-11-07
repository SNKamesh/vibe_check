import base64
import os
import re
import tempfile
from pathlib import Path
from typing import Literal

import replicate
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(title="Vibe Check Try-On API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "http://localhost", "http://127.0.0.1"],
    allow_origin_regex=r"^(chrome-extension://[a-p]{32}|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?)$",
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

MODEL = "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985"
MAX_BYTES = 12 * 1024 * 1024


class TryOnRequest(BaseModel):
    person_image: str
    garment_image: str
    category: Literal["upper_body", "lower_body", "dresses"] = "upper_body"
    garment_description: str = Field(default="garment", max_length=160)


def decode_image(data_url: str, prefix: str) -> tuple[bytes, str]:
    match = re.fullmatch(r"data:image/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)", data_url or "")
    if not match:
        raise HTTPException(400, f"{prefix} must be a PNG, JPEG or WebP data URL.")
    ext = "jpg" if match.group(1) in ("jpeg", "jpg") else match.group(1)
    try:
        raw = base64.b64decode(match.group(2), validate=True)
    except Exception:
        raise HTTPException(400, f"{prefix} is not valid base64.")
    if not raw or len(raw) > MAX_BYTES:
        raise HTTPException(413, f"{prefix} must be non-empty and at most 12 MB.")
    return raw, ext


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL.split(":")[0]}


@app.post("/api/try-on")
def try_on(body: TryOnRequest):
    if not os.getenv("REPLICATE_API_TOKEN"):
        raise HTTPException(503, "Replicate API token missing. Add REPLICATE_API_TOKEN to backend/.env and restart the server.")
    person_bytes, person_ext = decode_image(body.person_image, "Person photo")
    garment_bytes, garment_ext = decode_image(body.garment_image, "Garment photo")

    with tempfile.TemporaryDirectory(prefix="vibe-check-") as tmp:
        person_path = Path(tmp) / f"person.{person_ext}"
        garment_path = Path(tmp) / f"garment.{garment_ext}"
        person_path.write_bytes(person_bytes)
        garment_path.write_bytes(garment_bytes)
        try:
            with person_path.open("rb") as person_file, garment_path.open("rb") as garment_file:
                result = replicate.run(
                    MODEL,
                    input={
                        "human_img": person_file,
                        "garm_img": garment_file,
                        "garment_des": body.garment_description or body.category.replace("_", " "),
                        "category": body.category,
                        "steps": 30,
                        "seed": 42,
                        "force_dc": body.category == "dresses",
                    },
                )
            if hasattr(result, "read"):
                output_bytes = result.read()
            elif isinstance(result, (list, tuple)) and result and hasattr(result[0], "read"):
                output_bytes = result[0].read()
            else:
                raise RuntimeError("Unexpected model output type.")
            encoded = base64.b64encode(output_bytes).decode("ascii")
            return {"image": f"data:image/jpeg;base64,{encoded}", "model": MODEL}
        except Exception as exc:
            message = str(exc)
            if "401" in message or "Unauthenticated" in message:
                raise HTTPException(502, "Replicate rejected the API token. Check backend/.env.")
            raise HTTPException(502, f"AI inference failed: {message[:500]}")


# Serve the browser-based live dressing room from the same local origin.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.is_dir():
    app.mount("/dressing-room", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="dressing-room")

@app.get("/", include_in_schema=False)
def home():
    return RedirectResponse(url="/dressing-room/")
