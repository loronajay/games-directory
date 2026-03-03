/* ==========================================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM v11
   - True multi-touch
   - Multi-button per finger
   - Proper hold logic
   - Slide support
   - Diagonals supported
   - Version stamp (dev)
   ========================================== */

const DEV_MODE = true;
const JAY_MOBILE_VERSION = "v11-" + new Date().toISOString();

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
     START OVERLAY
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
    pointerEvents: "none"
  });

  document.body.appendChild(controls);

  /* =============================
     VERSION DISPLAY (DEV ONLY)
     ============================= */

  if (DEV_MODE) {
    const versionLabel = document.createElement("div");
    versionLabel.innerText = JAY_MOBILE_VERSION;

    Object.assign(versionLabel.style, {
      position: "fixed",
      top: "8px",
      right: "10px",
      color: "#00ffff",
      fontFamily: "monospace",
      fontSize: "12px",
      background: "rgba(0,0,0,0.7)",
      padding: "4px 8px",
      border: "1px solid #00ffff",
      borderRadius: "6px",
      zIndex: "99999999",
      pointerEvents: "none",
      boxShadow: "0 0 8px rgba(0,255,255,0.6)"
    });

    document.body.appendChild(versionLabel);
  }

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
  }

  /* D-PAD */
  createButton("left",  "◀", "100px", "40px");
  createButton("right", "▶", "100px", "160px");
  createButton("up",    "▲", "170px", "100px");
  createButton("down",  "▼", "30px",  "100px");

  /* FACE BUTTONS */
  createButton("y", "Y", "170px", null, "100px");
  createButton("b", "B", "100px", null, "160px");
  createButton("x", "X", "100px", null, "40px");
  createButton("a", "A", "30px",  null, "100px");

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
     TRUE MULTI-HOLD ENGINE
     ============================= */

  const activePointers = new Map();
  const buttonPressCounts = {};

  function updateButtonVisual(name, pressed) {
    const btn = [...controls.children].find(b => b.dataset.name === name);
    if (!btn) return;

    btn.style.background = pressed
      ? "rgba(0,255,255,0.35)"
      : "rgba(0,255,255,0.12)";
  }

  function pressButton(pointerId, name) {
    if (!name) return;

    if (!activePointers.has(pointerId)) {
      activePointers.set(pointerId, new Set());
    }

    const pressedSet = activePointers.get(pointerId);
    if (pressedSet.has(name)) return;

    pressedSet.add(name);

    buttonPressCounts[name] = (buttonPressCounts[name] || 0) + 1;

    if (buttonPressCounts[name] === 1) {
      simulateKey(keyMap[name], "keydown");
      updateButtonVisual(name, true);
    }
  }

  function releaseAllFromPointer(pointerId) {
    const pressedSet = activePointers.get(pointerId);
    if (!pressedSet) return;

    pressedSet.forEach(name => {
      buttonPressCounts[name]--;

      if (buttonPressCounts[name] <= 0) {
        simulateKey(keyMap[name], "keyup");
        updateButtonVisual(name, false);
        buttonPressCounts[name] = 0;
      }
    });

    activePointers.delete(pointerId);
  }

  controls.addEventListener("pointerdown", (e) => {
    if (!e.target.dataset.name) return;
    e.target.setPointerCapture(e.pointerId);
    pressButton(e.pointerId, e.target.dataset.name);
  });

  controls.addEventListener("pointermove", (e) => {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const name = element?.dataset?.name;

    if (!name) {
      releaseAllFromPointer(e.pointerId);
      return;
    }

    pressButton(e.pointerId, name);
  });

  controls.addEventListener("pointerup", (e) => {
    releaseAllFromPointer(e.pointerId);
  });

  controls.addEventListener("pointercancel", (e) => {
    releaseAllFromPointer(e.pointerId);
  });

  startOverlay.addEventListener("click", async () => {
    enterFullscreen();
    await lockLandscape();
    startOverlay.remove();
    controls.style.display = "block";
  }, { once: true });

}