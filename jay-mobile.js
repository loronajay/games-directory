/* ==========================================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM v7
   - True multi-touch
   - Slide between buttons
   - Diagonal support
   - No reset button
   - Per-game overrides supported
   - Canvas touch passthrough fixed
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
    key,
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
    pointerEvents: "none" // 👈 CRITICAL FIX (allows game UI to work)
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
      pointerEvents: "auto" // buttons still receive touches
    });

    btn.style.bottom = bottom;
    if (left) btn.style.left = left;
    if (right) btn.style.right = right;

    controls.appendChild(btn);
    return btn;
  }

  /* =============================
     D-PAD (GRID STYLE)
     ============================= */

  createButton("left",  "◀", "100px", "40px");
  createButton("right", "▶", "100px", "160px");
  createButton("up",    "▲", "170px", "100px");
  createButton("down",  "▼", "30px",  "100px");

  /* =============================
     FACE BUTTONS (MIRRORED GRID)
     ============================= */

  createButton("y", "Y", "170px", null, "100px");
  createButton("b", "B", "100px", null, "160px");
  createButton("x", "X", "100px", null, "40px");
  createButton("a", "A", "30px",  null, "100px");

  /* =============================
     KEY MAP (Default)
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

  const activePointers = new Map();
  const activeKeys = new Set();

  function updateButtonState(name, pressed) {
    const btn = [...controls.children].find(b => b.dataset.name === name);
    if (!btn) return;

    btn.style.background = pressed
      ? "rgba(0,255,255,0.35)"
      : "rgba(0,255,255,0.12)";
  }

  function handlePointer(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const name = target?.dataset?.name;

    const pointerId = e.pointerId;
    const previous = activePointers.get(pointerId);

    if (previous && previous !== name) {
      simulateKey(keyMap[previous], "keyup");
      updateButtonState(previous, false);
      activeKeys.delete(previous);
    }

    if (name && !activeKeys.has(name)) {
      simulateKey(keyMap[name], "keydown");
      updateButtonState(name, true);
      activeKeys.add(name);
    }

    activePointers.set(pointerId, name);
  }

  function releasePointer(e) {
    const pointerId = e.pointerId;
    const name = activePointers.get(pointerId);
    if (!name) return;

    simulateKey(keyMap[name], "keyup");
    updateButtonState(name, false);
    activeKeys.delete(name);
    activePointers.delete(pointerId);
  }

  controls.addEventListener("pointerdown", handlePointer);
  controls.addEventListener("pointermove", handlePointer);
  controls.addEventListener("pointerup", releasePointer);
  controls.addEventListener("pointercancel", releasePointer);

  startOverlay.addEventListener("click", async () => {
    enterFullscreen();
    await lockLandscape();
    startOverlay.remove();
    controls.style.display = "block";
  }, { once: true });

}