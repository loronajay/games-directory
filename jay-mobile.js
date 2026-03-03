/* ==========================================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM v8
   - True multi-touch
   - Slide between buttons
   - Diagonal support
   - No reset button
   - Per-game overrides supported
   - Canvas passthrough safe
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
     CONTROLS LAYER
     ============================= */

  const controls = document.createElement("div");
  Object.assign(controls.style, {
    position: "fixed",
    inset: "0",
    display: "none",
    zIndex: "999998",
    pointerEvents: "none" // allow game UI clicks through empty space
  });

  document.body.appendChild(controls);

  function createButton(name, label, bottom, left, right, size = 70) {
    const btn = document.createElement("div");
    btn.dataset.name = name;
    btn.innerText = label;

    Object.assign(btn.style, {
      position: "absolute",
      width: size + "px",
      height: size + "px",
      borderRadius: "50%",
      background: "rgba(0,255,255,0.12)",
      border: "2px solid #00ffff",
      color: "#00ffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "20px",
      touchAction: "none",
      userSelect: "none",
      boxShadow: "0 0 12px rgba(0,255,255,0.6)",
      backdropFilter: "blur(4px)",
      pointerEvents: "auto"
    });

    btn.style.bottom = bottom;
    if (left) btn.style.left = left;
    if (right) btn.style.right = right;

    controls.appendChild(btn);
    return btn;
  }

  /* =============================
     D-PAD (Grid Layout)
     ============================= */

  createButton("left",  "◀", "100px", "40px");
  createButton("right", "▶", "100px", "160px");
  createButton("up",    "▲", "170px", "100px");
  createButton("down",  "▼", "30px",  "100px");

  /* =============================
     FACE BUTTONS (Mirrored Grid)
     ============================= */

  createButton("y", "Y", "170px", null, "100px");
  createButton("b", "B", "100px", null, "160px");
  createButton("x", "X", "100px", null, "40px");
  createButton("a", "A", "30px",  null, "100px");

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
    y: "f"
  };

  if (window.JAY_GAME_CONFIG?.keyOverrides) {
    keyMap = { ...keyMap, ...window.JAY_GAME_CONFIG.keyOverrides };
  }

  /* =============================
     MULTI-TOUCH ENGINE
     ============================= */

  const activePointers = new Map(); // pointerId -> buttonName

  function updateButtonState(name, pressed) {
    const btn = [...controls.children].find(b => b.dataset.name === name);
    if (!btn) return;

    btn.style.background = pressed
      ? "rgba(0,255,255,0.35)"
      : "rgba(0,255,255,0.12)";
  }

  function pressButton(pointerId, name) {
    if (!name) return;

    simulateKey(keyMap[name], "keydown");
    updateButtonState(name, true);
    activePointers.set(pointerId, name);
  }

  function releaseButton(pointerId) {
    const name = activePointers.get(pointerId);
    if (!name) return;

    simulateKey(keyMap[name], "keyup");
    updateButtonState(name, false);
    activePointers.delete(pointerId);
  }

  controls.addEventListener("pointerdown", (e) => {
    if (!e.target.dataset.name) return;

    e.target.setPointerCapture(e.pointerId); // critical for multi-touch
    pressButton(e.pointerId, e.target.dataset.name);
  });

  controls.addEventListener("pointermove", (e) => {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const newName = element?.dataset?.name;
    const oldName = activePointers.get(e.pointerId);

    if (newName !== oldName) {
      releaseButton(e.pointerId);
      if (newName) {
        pressButton(e.pointerId, newName);
      }
    }
  });

  controls.addEventListener("pointerup", (e) => {
    releaseButton(e.pointerId);
  });

  controls.addEventListener("pointercancel", (e) => {
    releaseButton(e.pointerId);
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