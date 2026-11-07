const personInput=document.querySelector("#person");
const clothInput=document.querySelector("#cloth");
const runButton=document.querySelector("#run");
const statusEl=document.querySelector("#status");
const resultBox=document.querySelector("#result");
const outputImg=document.querySelector("#output");
const downloadLink=document.querySelector("#download");
function status(s){statusEl.textContent=s;}
function preview(input,box){
  input.addEventListener("change",()=>{
    const file=input.files?.[0];if(!file)return;
    if(!file.type.startsWith("image/")){status("Please choose an image file.");return;}
    let img=box.querySelector("img");if(!img){img=document.createElement("img");box.append(img);}
    img.src=URL.createObjectURL(file);
    box.querySelector("strong").textContent=file.name;
    box.querySelector("span").textContent=Math.round(file.size/1024)+" KB";
  });
}
preview(personInput,document.querySelector("#personDrop"));
preview(clothInput,document.querySelector("#clothDrop"));
async function imageToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);
  });
}
runButton.addEventListener("click",async()=>{
  const person=personInput.files?.[0],cloth=clothInput.files?.[0];
  if(!person||!cloth){status("Upload both your photo and a garment image first.");return;}
  if(person.size>12*1024*1024||cloth.size>12*1024*1024){status("Each image must be smaller than 12 MB.");return;}
  const backend=document.querySelector("#backend").value.trim().replace(/\/$/,"");
  if(!/^https?:\/\//i.test(backend)){status("Enter a valid backend URL.");return;}
  runButton.disabled=true;resultBox.style.display="none";status("Preparing images…");
  try{
    const [personData,clothData]=await Promise.all([imageToDataUrl(person),imageToDataUrl(cloth)]);
    status("Sending images to the AI try-on model. This may take 30–120 seconds…");
    const response=await fetch(backend+"/api/try-on",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      person_image:personData,garment_image:clothData,category:document.querySelector("#category").value,
      garment_description:document.querySelector("#description").value.trim()
    })});
    const data=await response.json().catch(()=>({detail:"Backend returned an unreadable response."}));
    if(!response.ok)throw new Error(data.detail||data.error||"Try-on request failed ("+response.status+").");
    if(!data.image)throw new Error("The model completed without returning an image.");
    outputImg.src=data.image;downloadLink.href=data.image;resultBox.style.display="block";
    status("Done — your AI try-on image is ready.");
  }catch(err){status("Error: "+err.message);}
  finally{runButton.disabled=false;}
});