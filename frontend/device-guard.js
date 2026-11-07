(() => {
  const ua = navigator.userAgent || "";
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const compactTouchDevice =
    window.matchMedia("(pointer: coarse)").matches &&
    navigator.maxTouchPoints > 1 &&
    Math.min(window.screen.width, window.screen.height) < 600;

  if (!mobileUA && !iPadOS && !compactTouchDevice) return;

  document.documentElement.classList.add("pc-only-blocked");
  document.body.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#0c0d12;color:#f5f3ff;font-family:Inter,system-ui,sans-serif">
      <section style="max-width:480px;text-align:center;background:#15151d;border:1px solid #343241;border-radius:20px;padding:32px">
        <div style="font-size:42px;margin-bottom:14px">🖥️</div>
        <h1 style="margin:0 0 10px;font-size:24px">Vibe Check is for PC</h1>
        <p style="color:#aaa9b7;line-height:1.6;font-size:14px">The live dressing room needs a desktop browser, a large screen and a webcam. Open Vibe Check on a Windows, macOS or Linux computer to continue.</p>
        <p style="color:#8d8b9a;font-size:12px;margin-top:20px">Your wardrobe and camera session are not started on this device.</p>
      </section>
    </main>`;
})();
