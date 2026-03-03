/* ==========================================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM v4
   - Improved visuals
   - Grid layout buttons
   - True diagonal support
   - Safe top RESET button
   - Per-game overrides supported
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

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  /* =============================
     INSERT COIN SCREEN
     ============================= */

  const startOverlay = document.createElement("div");
  Object.assign(startOverlay.style, {
    position: "fixed",
    inset: "0",
    background: "black",
    color: "#00ffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    fontFamily: "monospace",
    zIndex: "999999"
  });

  startOverlay.innerHTML = `
    <h2 style="margin:0 0 20px 0;">INSERT COIN</h2>
    <p style="margin:0;">TAP TO START</p>
  `;

  document.body.appendChild(startOverlay);

  /* =============================
     CONTROLS CONTAINER
     ============================= */

  const controls = document.createElement("div");
  Object.assign(controls.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    display: "none",
    zIndex: "999998"
  });

  document.body.appendChild(controls);

  function createButton(label, bottom, left, right, size = 70, isRect = false) {
    const btn = document.createElement("div");
    btn.innerText = label;

    Object.assign(btn.style, {
      position: "absolute",
      width: isRect ? "110px" : size + "px",
      height: isRect ? "40px" : size + "px",
      borderRadius: isRect ? "8px" : "50%",
      background: "rgba(0,255,255,0.12)",
      border: "2px solid #00ffff",
      color: "#00ffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: isRect ? "14px" : "20px",
      pointerEvents: "auto",
      touchAction: "none",
      userSelect: "none",
      boxShadow: "0 0 12px rgba(0,255,255,0.6)",
      backdropFilter: "blur(4px)"
    });

    btn.style.bottom = bottom;
    if (left) btn.style.left = left;
    if (right) btn.style.right = right;

    controls.appendChild(btn);
    return btn;
  }

  /* =============================
     D-PAD (3x3 GRID STYLE)
     ============================= */

  const btnLeft  = createButton("◀", "100px", "40px");
  const btnRight = createButton("▶", "100px", "160px");
  const btnUp    = createButton("▲", "170px", "100px");
  const btnDown  = createButton("▼", "30px",  "100px");

  /* =============================
     FACE BUTTONS (MIRRORED GRID)
     ============================= */

  const btnY = createButton("Y", "170px", null, "100px");
  const btnB = createButton("B", "100px", null, "160px");
  const btnX = createButton("X", "100px", null, "40px");
  const btnA = createButton("A", "30px",  null, "100px");

  /* =============================
     SAFE TOP RESET BUTTON
     ============================= */

  const btnReset = createButton("RESET", null, "50%", null, 0, true);
  btnReset.style.top = "15px";
  btnReset.style.left = "50%";
  btnReset.style.transform = "translateX(-50%)";
  btnReset.style.background = "rgba(255,0,0,0.15)";
  btnReset.style.borderColor = "#ff4444";
  btnReset.style.color = "#ff4444";
  btnReset.style.boxShadow = "0 0 10px rgba(255,0,0,0.6)";

  /* =============================
     DEFAULT KEY MAP
     ============================= */

  let keyMap = {
    left: "a",
    right: "d",
    up: "w",
    down: "s",
    a: "c",
    b: "v",
    x: "b",
    y: "f",
    reset: " "
  };

  if (window.JAY_GAME_CONFIG?.keyOverrides) {
    keyMap = { ...keyMap, ...window.JAY_GAME_CONFIG.keyOverrides };
  }

  const buttonMap = {
    left: btnLeft,
    right: btnRight,
    up: btnUp,
    down: btnDown,
    a: btnA,
    b: btnB,
    x: btnX,
    y: btnY,
    reset: btnReset
  };

  /* =============================
     MULTI-TOUCH SUPPORT
     ============================= */

  Object.keys(buttonMap).forEach(name => {
    const btn = buttonMap[name];
    const key = keyMap[name];

    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      btn.style.background = "rgba(0,255,255,0.35)";
      simulateKey(key, "keydown");
    });

    btn.addEventListener("pointerup", e => {
      e.preventDefault();
      btn.style.background = "rgba(0,255,255,0.12)";
      simulateKey(key, "keyup");
    });

    btn.addEventListener("pointerleave", () => {
      btn.style.background = "rgba(0,255,255,0.12)";
      simulateKey(key, "keyup");
    });

    btn.addEventListener("pointercancel", () => {
      btn.style.background = "rgba(0,255,255,0.12)";
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