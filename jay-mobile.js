/* ==============================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM
   ============================== */

function isMobileDevice() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || window.matchMedia("(pointer: coarse)").matches
  );
}

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

async function lockLandscape() {
  if (screen.orientation?.lock) {
    try { await screen.orientation.lock("landscape"); } catch {}
  }
}

function simulateKey(key, type) {
  const event = new KeyboardEvent(type, {
    key: key,
    code: key,
    bubbles: true
  });
  document.dispatchEvent(event);
}

if (isMobileDevice()) {

  /* Prevent scroll issues */
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  /* Create Start Overlay */
  const startOverlay = document.createElement("div");
  startOverlay.style.position = "fixed";
  startOverlay.style.inset = "0";
  startOverlay.style.background = "black";
  startOverlay.style.color = "#00ffff";
  startOverlay.style.display = "flex";
  startOverlay.style.alignItems = "center";
  startOverlay.style.justifyContent = "center";
  startOverlay.style.flexDirection = "column";
  startOverlay.style.fontFamily = "monospace";
  startOverlay.style.zIndex = "999999";
  startOverlay.innerHTML = `
    <div style="text-align:center">
      <h2>INSERT COIN</h2>
      <p>TAP TO START</p>
    </div>
  `;
  document.body.appendChild(startOverlay);

  /* Create Controls */
  const controls = document.createElement("div");
  controls.style.position = "fixed";
  controls.style.inset = "0";
  controls.style.pointerEvents = "none";
  controls.style.display = "none";
  controls.style.zIndex = "999998";
  document.body.appendChild(controls);

  function createButton(id, label, bottom, left, right) {
    const btn = document.createElement("div");
    btn.innerText = label;
    btn.style.position = "absolute";
    btn.style.width = "70px";
    btn.style.height = "70px";
    btn.style.borderRadius = "50%";
    btn.style.background = "rgba(0,255,255,0.15)";
    btn.style.border = "2px solid #00ffff";
    btn.style.color = "#00ffff";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.fontSize = "20px";
    btn.style.pointerEvents = "auto";
    btn.style.touchAction = "none";
    btn.style.userSelect = "none";

    btn.style.bottom = bottom;
    if (left) btn.style.left = left;
    if (right) btn.style.right = right;

    controls.appendChild(btn);
    return btn;
  }

  const btnLeft  = createButton("left",  "◀", "90px", "30px");
  const btnRight = createButton("right", "▶", "90px", "150px");
  const btnUp    = createButton("up",    "▲", "160px", "90px");
  const btnDown  = createButton("down",  "▼", "20px",  "90px");
  const btnA     = createButton("a",     "A", "90px",  null, "60px");

  const keyMap = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    a: " "
  };

  const buttonMap = {
    left: btnLeft,
    right: btnRight,
    up: btnUp,
    down: btnDown,
    a: btnA
  };

  Object.keys(buttonMap).forEach(name => {
    const btn = buttonMap[name];
    const key = keyMap[name];

    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      simulateKey(key, "keydown");
    });

    btn.addEventListener("pointerup", e => {
      e.preventDefault();
      simulateKey(key, "keyup");
    });

    btn.addEventListener("pointercancel", () => {
      simulateKey(key, "keyup");
    });
  });

  startOverlay.addEventListener("click", async () => {
    enterFullscreen();
    await lockLandscape();
    startOverlay.remove();
    controls.style.display = "block";
  }, { once: true });

}