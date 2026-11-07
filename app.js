import { FilesetResolver, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

const video=document.querySelector("#video");
const canvas=document.querySelector("#overlay");
const ctx=canvas.getContext("2d");
const statusEl=document.querySelector("#status");
const empty=document.querySelector("#empty");
const fileInput=document.querySelector("#file");
const garmentWrap=document.querySelector("#garment");
const thumb=document.querySelector("#thumb");
const gname=document.querySelector("#gname");
let stream=null, detector=null, garment=null, garmentKind="top", raf=0, lastVideoTime=-1;

function setStatus(s){statusEl.textContent=s;}
function loadGarment(file){
  if(!file || !file.type.startsWith("image/")) return;
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{garment=img;gname.textContent=file.name;thumb.src=url;garmentWrap.hidden=false;classify(file.name);setStatus("Garment loaded. Move into the camera frame.");};
  img.onerror=()=>setStatus("Could not read that image.");
  img.src=url;
}
function classify(name){
  const n=name.toLowerCase();
  garmentKind=/pant|jean|trouser|short|skirt/.test(n)?"bottom":/dress|gown/.test(n)?"dress":"top";
}
fileInput.addEventListener("change",e=>loadGarment(e.target.files?.[0]));
window.addEventListener("paste",e=>{
  const item=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith("image/"));
  if(item) loadGarment(item.getAsFile());
});
document.addEventListener("dragover",e=>e.preventDefault());
document.addEventListener("drop",e=>{e.preventDefault();const f=e.dataTransfer?.files?.[0];if(f)loadGarment(f);});

async function startCamera(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:800},facingMode:"user"},audio:false});
    video.srcObject=stream;await video.play();empty.hidden=true;
    setStatus("Loading pose tracker…");
    const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    detector=await PoseLandmarker.createFromOptions(vision,{
      baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"GPU"},
      runningMode:"VIDEO",numPoses:1
    });
    fitCanvas();loop();setStatus(garment?"Live tracking active.":"Camera active — paste a garment image.");
  }catch(err){setStatus("Camera/model error: "+err.message);}
}
function fitCanvas(){
  const r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function point(lm){return {x:lm.x*canvas.clientWidth,y:lm.y*canvas.clientHeight};}
function drawBetween(img,a,b,widthScale=1.35,heightScale=1.0){
  const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
  const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx);
  const w=Math.max(30,Math.hypot(dx,dy)*widthScale);
  const h=w*img.height/img.width*heightScale;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.globalAlpha=.94;
  ctx.drawImage(img,-w/2,-h*.12,w,h);ctx.restore();
}
function renderPose(result){
  const lm=result.landmarks?.[0];if(!lm||!garment)return;
  const shoulders=[lm[11],lm[12]],hips=[lm[23],lm[24]];
  if(shoulders.some(p=>p.visibility<.35)||hips.some(p=>p.visibility<.25))return;
  const s1=point(shoulders[0]),s2=point(shoulders[1]),h1=point(hips[0]),h2=point(hips[1]);
  if(garmentKind==="bottom"){
    const w=Math.hypot(h2.x-h1.x,h2.y-h1.y)*1.55;
    const cx=(h1.x+h2.x)/2,cy=(h1.y+h2.y)/2;
    const knee1=lm[25],knee2=lm[26];
    const legY=(knee1.visibility>.25&&knee2.visibility>.25)?(point(knee1).y+point(knee2).y)/2:cy+Math.hypot(h2.x-h1.x,h2.y-h1.y)*2.1;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(h2.y-h1.y,h2.x-h1.x));ctx.globalAlpha=.94;
    ctx.drawImage(garment,-w*.55,-w*.15,w,Math.max(w*.9,legY-cy)*1.25);ctx.restore();
  }else if(garmentKind==="dress"){
    const w=Math.hypot(s2.x-s1.x,s2.y-s1.y)*2.1;
    const bottomY=Math.max(h1.y,h2.y)+Math.hypot(h2.x-h1.x,h2.y-h1.y)*2.7;
    ctx.save();ctx.translate((s1.x+s2.x)/2,(s1.y+s2.y)/2);ctx.rotate(Math.atan2(s2.y-s1.y,s2.x-s1.x));ctx.globalAlpha=.94;
    ctx.drawImage(garment,-w/2,0,w,Math.max(w,bottomY-(s1.y+s2.y)/2));ctx.restore();
  }else{
    drawBetween(garment,s1,s2,2.05,1.9);
  }
}
function loop(){
  if(!detector||video.readyState<2){raf=requestAnimationFrame(loop);return;}
  if(video.currentTime!==lastVideoTime){
    lastVideoTime=video.currentTime;
    const result=detector.detectForVideo(video,performance.now());
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    renderPose(result);
  }
  raf=requestAnimationFrame(loop);
}
document.querySelector("#start").addEventListener("click",startCamera);
document.querySelector("#stop").addEventListener("click",()=>{
  cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;ctx.clearRect(0,0,canvas.width,canvas.height);empty.hidden=false;setStatus("Camera stopped.");
});
window.addEventListener("resize",fitCanvas);