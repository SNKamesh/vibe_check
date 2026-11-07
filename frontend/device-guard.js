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
    <main class="pc-only-screen">
      <section class="pc-only-card">
        <div class="pc-only-icon">🖥️</div>
        <h1>Vibe Check is for PC</h1>
        <p>The live dressing room needs a desktop browser, a large screen and a webcam. Open Vibe Check on a Windows, macOS or Linux computer to continue.</p>
        <p class="pc-only-note">Your wardrobe and camera session are not started on this device.</p>
      </section>
    </main>`;
})();
