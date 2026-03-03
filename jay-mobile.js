/* ==========================================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM v11
   - Direct TurboWarp VM key injection
   - True controller behavior
   - True multi-touch
   - Slide between buttons
   - Overlay restored
   - Per-game overrides supported
   ========================================== */

const JAY_MOBILE_VERSION = "v11"; // <-- change manually per deploy

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

if (isMobileDevice()) {

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  /* =============================
     VERSION BADGE
     ============================= */

  const versionBadge = document.createElement("div");
  versionBadge.innerText = JAY_MOBILE_VERSION;
  Object.assign(versionBadge.style, {
    position: "fixed",
    top: "8px",
    right: "12px",
    color: "#00ffff",
    fontFamily: "monospace",
    fontSize: "14px",
    opacity: "0.6",
    zIndex: "999999"
  });
  document.body.appendChild(versionBadge);

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
    zIndex: "999998"
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
    zIndex: "999997",
    pointerEvents: "none"
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

  /* =============================
     KEY MAP
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
     TURBOWARP KEY INJECTION
     ============================= */

  const keyboard = window.vm.runtime.ioDevices.keyboard;
  const pressedKeys = keyboard._keysPressed;

  function pressKey(key) {
    if (!pressedKeys.includes(key)) {
      pressedKeys.push(key);
    }
  }

  function releaseKey(key) {
    const index = pressedKeys.indexOf(key);
    if (index !== -1) {
      pressedKeys.splice(index, 1);
    }
  }

  /* =============================
     MULTI-TOUCH ENGINE
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

    const current = activePointers.get(pointerId);
    if (current === name) return;

    releaseButton(pointerId);

    activePointers.set(pointerId, name);
    buttonPressCounts[name] = (buttonPressCounts[name] || 0) + 1;

    if (buttonPressCounts[name] === 1) {
      pressKey(keyMap[name]);
      updateButtonVisual(name, true);
    }
  }

  function releaseButton(pointerId) {
    const name = activePointers.get(pointerId);
    if (!name) return;

    buttonPressCounts[name]--;

    if (buttonPressCounts[name] <= 0) {
      releaseKey(keyMap[name]);
      updateButtonVisual(name, false);
      buttonPressCounts[name] = 0;
    }

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
    pressButton(e.pointerId, name);
  });

  controls.addEventListener("pointerup", (e) => {
    releaseButton(e.pointerId);
  });

  controls.addEventListener("pointercancel", (e) => {
    releaseButton(e.pointerId);
  });

  startOverlay.addEventListener("click", async () => {
    enterFullscreen();
    await lockLandscape();
    startOverlay.remove();
    controls.style.display = "block";
  }, { once: true });

}