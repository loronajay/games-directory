/* ==========================================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM v2
   ========================================== */

function isMobileDevice() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

async function lockLandscape() {
  if (screen.orientation?.lock) {
    try {
      await screen.orientation.lock("landscape");
    } catch {}
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

  /* Prevent scrolling */
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  /* =============================
     INSERT COIN OVERLAY
     ============================= */

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
      <h2 style="margin:0 0 20px 0;">INSERT COIN</h2>
      <p style="margin:0;">TAP TO START</p>
    </div>
  `;
  document.body.appendChild(startOverlay);

  /* =============================
     CONTROLS CONTAINER
     ============================= */

  const controls = document.createElement("div");
  controls.style.position = "fixed";
  controls.style.inset = "0";
  controls.style.pointerEvents = "none";
  controls.style.display = "none";
  controls.style.zIndex = "999998";
  document.body.appendChild(controls);

  function createButton(name, label, bottom, left, right) {
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

  /* =============================
     D-PAD (WASD)
     ============================= */

  const btnLeft  = createButton("left",  "◀", "90px", "30px");
  const btnRight = createButton("right", "▶", "90px", "150px");
  const btnUp    = createButton("up",    "▲", "160px", "90px");
  const btnDown  = createButton("down",  "▼", "20px",  "90px");

  /* =============================
     FACE BUTTONS (Diamond Layout)
     
            Y
       B         X
            A
     ============================= */

  const btnY = createButton("y", "Y", "170px", null, "100px");   // Top
  const btnB = createButton("b", "B", "100px", null, "170px");   // Left
  const btnX = createButton("x", "X", "100px", null, "30px");    // Right
  const btnA = createButton("a", "A", "30px",  null, "100px");   // Bottom

  /* =============================
     KEY MAP
     ============================= */

  const keyMap = {
    left: "a",
    right: "d",
    up: "w",
    down: "s",
    a: "c",
    b: "v",
    x: "b",
    y: "f"
  };

  const buttonMap = {
    left: btnLeft,
    right: btnRight,
    up: btnUp,
    down: btnDown,
    a: btnA,
    b: btnB,
    x: btnX,
    y: btnY
  };

  /* =============================
     BUTTON INPUT HANDLING
     ============================= */

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

  /* =============================
     START GAME
     ============================= */

  startOverlay.addEventListener("click", async () => {
    enterFullscreen();
    await lockLandscape();
    startOverlay.remove();
    controls.style.display = "block";
  }, { once: true });

}