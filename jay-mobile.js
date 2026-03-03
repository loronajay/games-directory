/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v12
   - Direct TurboWarp VM injection (postData)
   - True multi-touch
   - True hold behavior
   - Slide between buttons
   - Per-game overrides supported
   - Touch-to-start overlay
   - Version badge
   ========================================== */

const JAY_MOBILE_VERSION = "v12"; // <-- change manually each deploy

function isMobile() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

if (!isMobile()) return;

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

/* D-PAD (left side) */
createButton("left",  "◀", "100px", "40px");
createButton("right", "▶", "100px", "160px");
createButton("up",    "▲", "170px", "100px");
createButton("down",  "▼", "30px",  "100px");

/* FACE BUTTONS (right side, mirrored like D-pad) */
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

/* Per-game override support */
if (window.JAY_GAME_CONFIG?.keyOverrides) {
  keyMap = { ...keyMap, ...window.JAY_GAME_CONFIG.keyOverrides };
}

/* =============================
   TURBOWARP VM INPUT
   ============================= */

const keyboard = window.vm.runtime.ioDevices.keyboard;

function pressKey(key) {
  keyboard.postData({ key, isDown: true });
}

function releaseKey(key) {
  keyboard.postData({ key, isDown: false });
}

/* =============================
   TRUE CONTROLLER ENGINE
   ============================= */

const activePointers = new Map();
const buttonCounts = {};
const physicallyHeldKeys = new Set();

function updateVisual(name, pressed) {
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
  buttonCounts[name] = (buttonCounts[name] || 0) + 1;

  if (buttonCounts[name] === 1) {
    const key = keyMap[name];
    physicallyHeldKeys.add(key);
    pressKey(key);
    updateVisual(name, true);
  }
}

function releaseButton(pointerId) {
  const name = activePointers.get(pointerId);
  if (!name) return;

  buttonCounts[name]--;

  if (buttonCounts[name] <= 0) {
    const key = keyMap[name];
    physicallyHeldKeys.delete(key);
    releaseKey(key);
    updateVisual(name, false);
    buttonCounts[name] = 0;
  }

  activePointers.delete(pointerId);
}

/* =============================
   POINTER EVENTS (MULTI-TOUCH)
   ============================= */

controls.addEventListener("pointerdown", e => {
  if (!e.target.dataset.name) return;
  e.target.setPointerCapture(e.pointerId);
  pressButton(e.pointerId, e.target.dataset.name);
});

controls.addEventListener("pointermove", e => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const name = el?.dataset?.name;
  pressButton(e.pointerId, name);
});

controls.addEventListener("pointerup", e => {
  releaseButton(e.pointerId);
});

controls.addEventListener("pointercancel", e => {
  releaseButton(e.pointerId);
});

/* =============================
   START GAME
   ============================= */

startOverlay.addEventListener("click", async () => {
  if (document.documentElement.requestFullscreen)
    document.documentElement.requestFullscreen();

  if (screen.orientation?.lock) {
    try { await screen.orientation.lock("landscape"); } catch {}
  }

  startOverlay.remove();
  controls.style.display = "block";
}, { once: true });