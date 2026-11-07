import { FilesetResolver, PoseLandmarker } from "./vendor/mediapipe/vision_bundle.mjs";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const ctx = canvas.getContext("2d");
const startBtn = document.querySelector("#start");
const stopBtn = document.querySelector("#stop");
const stateEl = document.querySelector("#state");
const hint = document.querySelector("#hint");
const empty = document.querySelector("#empty");
const calibration = document.querySelector("#calibration");
const countdown = document.querySelector("#countdown");
const fileInput = document.querySelector("#files");
const dropzone = document.querySelector("#dropzone");
const wardrobeEl = document.querySelector("#wardrobe");
const selectedEl = document.querySelector("#selected");
const progressTitle = document.querySelector("#progress-title");
const progressValue = document.querySelector("#progress-value");
const progressFill = document.querySelector("#progress-fill");
const progressDetail = document.querySelector("#progress-detail");

let stream = null;
let landmarker = null;
let raf = 0;
let lastVideoTime = -1;
let calibrationStart = null;
let calibrated = false;
let selected = null;
let items = [];
let filter = "all";
let latestLandmarks = null;
let loadedImage = null;
let fitRequest = 0;

const categories = ["tops", "bottoms", "shoes", "accessories"];

function setProgress(percent, title, detail) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  progressTitle.textContent = title;
  progressValue.textContent = value + "%";
  progressFill.style.width = value + "%";
  progressDetail.textContent = detail;
}

function suggestCategory(file) {
  const n = file.name.toLowerCase();
  if (/pant|jean|trouser|short|skirt/.test(n)) return "bottoms";
  if (/shoe|sneaker|boot|heel|sandal/.test(n)) return "shoes";
  if (/watch|glass|spectacle|cap|hat|necklace|chain|bracelet|ring|bag|belt|earring/.test(n)) return "accessories";
  return "tops";
}

function addFiles(files) {
  const added = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const item = {
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      category: suggestCategory(file)
    };
    items.push(item);
    added.push(item);
  }
  renderWardrobe();
  if (!selected && added.length) {
    selectItem(added[0]);
    if (added.length > 1) {
      selectedEl.textContent = "Added " + added.length + " items. First item selected; choose another item whenever you want to switch outfits.";
    }
  }
}

function selectItem(item) {
  selected = item;
  loadedImage = new Image();
  loadedImage.dataset.id = item.id;
  selectedEl.textContent = "Selected: " + item.name + " · " + item.category + ".";
  renderWardrobe();

  if (!stream || !calibrated) {
    setProgress(calibrated ? 100 : 0, "Waiting for body scan", "Your item is selected. Start the camera and complete the five-second scan to preview it.");
    return;
  }

  stateEl.textContent = "Preparing outfit";
  setProgress(15, "Preparing live fit", "Loading your selected garment image locally…");
  loadedImage.onload = () => {
    if (selected?.id !== item.id) return;
    setProgress(65, "Aligning garment", "Mapping the garment overlay to your shoulder, hip and body landmarks…");
    requestAnimationFrame(() => {
      if (selected?.id !== item.id) return;
      drawLatest();
      stateEl.textContent = "Live try-on active";
      selectedEl.textContent = "Live preview: " + item.name + ". Move your shoulders and torso to test the tracking.";
      setProgress(100, "Live try-on active", "Overlay loaded. Pose tracking continues frame by frame; this is a 2D AR preview, not AI fabric generation.");
    });
  };
  loadedImage.onerror = () => {
    stateEl.textContent = "Garment load failed";
    setProgress(0, "Could not load garment", "Try a PNG, JPG or WebP image.");
  };
  loadedImage.src = item.url;
}

function renderWardrobe() {
  wardrobeEl.innerHTML = "";
  const shown = items.filter(item => filter === "all" || item.category === filter);
  if (!shown.length) {
    wardrobeEl.innerHTML = '<div class="empty-wardrobe">No items in this category yet.</div>';
    return;
  }

  for (const item of shown) {
    const card = document.createElement("div");
    card.className = "item" + (selected?.id === item.id ? " selected" : "");
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.name;

    const name = document.createElement("div");
    name.className = "item-name";
    name.textContent = item.name;

    const select = document.createElement("select");
    for (const cat of categories) {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat[0].toUpperCase() + cat.slice(1);
      opt.selected = item.category === cat;
      select.append(opt);
    }
    select.addEventListener("change", event => {
      item.category = event.target.value;
      if (selected?.id === item.id) {
        selectedEl.textContent = "Selected: " + item.name + " · " + item.category + ".";
        if (calibrated) selectItem(item);
      }
      renderWardrobe();
    });

    const tryBtn = document.createElement("button");
    tryBtn.type = "button";
    tryBtn.className = "try-item";
    tryBtn.textContent = selected?.id === item.id ? "Selected item" : "Try this on";
    tryBtn.addEventListener("click", event => {
      event.stopPropagation();
      selectItem(item);
    });

    card.append(img, name, select, tryBtn);
    card.addEventListener("click", event => {
      if (event.target === select || event.target === tryBtn) return;
      selectItem(item);
    });
    wardrobeEl.append(card);
  }
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(other => other.classList.toggle("active", other === button));
    renderWardrobe();
  });
});

fileInput.addEventListener("change", event => addFiles([...event.target.files]));
dropzone.addEventListener("dragover", event => {
  event.preventDefault();
  dropzone.classList.add("drag");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", event => {
  event.preventDefault();
  dropzone.classList.remove("drag");
  addFiles([...event.dataTransfer.files]);
});

function sizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", sizeCanvas);
sizeCanvas();

function point(landmarks, index) {
  const p = landmarks?.[index];
  if (!p || (p.visibility ?? 1) < 0.35) return null;
  return { x: p.x * canvas.clientWidth, y: p.y * canvas.clientHeight };
}

function drawFit(img, category, landmarks) {
  let a, b, c, d;
  if (category === "tops") {
    a = point(landmarks, 11); b = point(landmarks, 12);
    c = point(landmarks, 24); d = point(landmarks, 23);
    if (!c || !d) {
      const shoulderMidY = a && b ? (a.y + b.y) / 2 : 0;
      const shoulderWidth = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
      if (a && b && shoulderWidth > 0) {
        const fallbackY = shoulderMidY + shoulderWidth * 1.45;
        c = { x: a.x, y: fallbackY };
        d = { x: b.x, y: fallbackY };
      }
    }
  } else if (category === "bottoms") {
    a = point(landmarks, 23); b = point(landmarks, 24);
    c = point(landmarks, 28); d = point(landmarks, 27);
  } else if (category === "shoes") {
    a = point(landmarks, 27); b = point(landmarks, 28);
    c = point(landmarks, 31); d = point(landmarks, 32);
  } else {
    a = point(landmarks, 15); b = point(landmarks, 16);
    c = a; d = b;
  }
  if (!a || !b || !c || !d) return false;

  let cx, cy, width, height, angle = 0;
  if (category === "accessories") {
    cx = (a.x + b.x) / 2;
    cy = (a.y + b.y) / 2;
    width = Math.max(34, Math.hypot(b.x - a.x, b.y - a.y) * 0.34);
    height = width;
  } else {
    const shoulderOrHipWidth = Math.hypot(b.x - a.x, b.y - a.y);
    const bodyHeight = Math.hypot(((c.x + d.x) / 2) - ((a.x + b.x) / 2), ((c.y + d.y) / 2) - ((a.y + b.y) / 2));
    cx = (a.x + b.x + c.x + d.x) / 4;
    cy = (a.y + b.y + c.y + d.y) / 4;
    width = shoulderOrHipWidth * (category === "tops" ? 1.55 : category === "bottoms" ? 1.35 : 0.48);
    height = Math.max(28, bodyHeight * (category === "tops" ? 1.35 : category === "bottoms" ? 1.2 : 0.4));
    angle = Math.atan2(b.y - a.y, b.x - a.x);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

function drawLatest() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  if (!selected || !latestLandmarks || !loadedImage?.complete || !loadedImage.naturalWidth) return false;
  return drawFit(loadedImage, selected.category, latestLandmarks);
}

async function setupModel() {
  if (landmarker) return;
  hint.textContent = "Loading the on-device pose tracking model…";
  setProgress(0, "Loading body-tracking model", "First launch downloads the browser model. It runs locally after loading.");
  const wasmRoot = new URL("./vendor/mediapipe/wasm/", import.meta.url).href;
  const vision = await FilesetResolver.forVisionTasks(wasmRoot);
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: new URL("./models/pose_landmarker_lite.task", import.meta.url).href,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numPoses: 1
  });
}

async function startCamera() {
  try {
    startBtn.disabled = true;
    await setupModel();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    stream.getVideoTracks().forEach(track => track.addEventListener("ended", () => {
      if (stream) stopCamera();
    }));
    video.srcObject = stream;
    await video.play();
    empty.hidden = true;
    stopBtn.disabled = false;
    stateEl.textContent = "Finding body";
    hint.textContent = "Keep your full body in frame. The five-second scan starts when your pose is detected.";
    calibration.hidden = false;
    calibrationStart = null;
    calibrated = false;
    lastVideoTime = -1;
    setProgress(0, "Body scan", "Finding your pose before the five-second calibration begins.");
    loop();
  } catch (error) {
    startBtn.disabled = false;
    hint.textContent = "Could not start camera/model: " + error.message + ". Check camera permission and internet access for the first model download.";
    stateEl.textContent = "Camera unavailable";
    setProgress(0, "Camera setup failed", error.message);
  }
}

function loop() {
  if (!stream) return;
  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = landmarker.detectForVideo(video, performance.now());
    const landmarks = result.landmarks?.[0] || null;
    latestLandmarks = landmarks;

    if (landmarks) {
      if (!calibrated) {
        if (calibrationStart === null) calibrationStart = performance.now();
        const elapsed = performance.now() - calibrationStart;
        const percent = Math.min(100, elapsed / 5000 * 100);
        const remaining = Math.max(0, 5 - elapsed / 1000);
        countdown.textContent = Math.ceil(remaining);
        setProgress(percent, "Scanning body", "Calibration " + Math.round(percent) + "% · Hold a relaxed, front-facing pose.");
        if (elapsed >= 5000) {
          calibrated = true;
          calibration.hidden = true;
          stateEl.textContent = "Body tracked";
          hint.textContent = "Body scan complete. Select Try this on to fit a wardrobe item to your live pose.";
          setProgress(100, "Body scan complete", "Pose tracking is live. Choose a wardrobe item to start the AR fitting preview.");
          if (selected) selectItem(selected);
        }
      } else {
        if (selected && loadedImage?.complete) {
          const drawn = drawLatest();
          stateEl.textContent = drawn ? "Live try-on active" : "Adjust body position";
          if (!drawn) {
            setProgress(100, "Waiting for body landmarks", "Move into full view so the garment can align with your shoulders and hips.");
          }
        } else {
          stateEl.textContent = "Body tracked";
          ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        }
      }
    } else {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      stateEl.textContent = calibrated ? "Body not visible" : "Finding body";
      if (!calibrated) {
        setProgress(0, "Finding your body", "Step back until your body is visible, then hold still for five seconds.");
      } else {
        setProgress(100, "Tracking paused", "Your body is outside the frame. Step back into view to resume the live overlay.");
      }
    }
  }
  raf = requestAnimationFrame(loop);
}

function stopCamera() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  const oldStream = stream;
  stream = null;
  if (oldStream) oldStream.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  empty.hidden = false;
  calibration.hidden = true;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  stateEl.textContent = "Camera off";
  hint.textContent = "Camera stopped. Your uploaded wardrobe remains in this tab.";
  latestLandmarks = null;
  calibrated = false;
  calibrationStart = null;
  setProgress(0, "Camera off", "Start the camera to run another five-second body scan.");
  selectedEl.textContent = selected ? "Selected: " + selected.name + ". Start the camera to preview it." : "Select a wardrobe item to preview it on your tracked body.";
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
document.querySelector("#clear").addEventListener("click", () => {
  selected = null;
  loadedImage = null;
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  selectedEl.textContent = "Select a wardrobe item to preview it on your tracked body.";
  setProgress(calibrated ? 100 : 0, calibrated ? "Body scan complete" : "Ready for body scan", calibrated ? "Body tracking remains active. Choose a wardrobe item to try on." : "Start the camera to begin your five-second scan.");
  stateEl.textContent = calibrated ? "Body tracked" : "Camera off";
  renderWardrobe();
});
window.addEventListener("beforeunload", stopCamera);
renderWardrobe();
