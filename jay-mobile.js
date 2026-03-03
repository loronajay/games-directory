/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v16
   - VM postData injection
   - True 8-direction D-pad
   - Mirrored tighter face buttons
   ========================================== */

(function () {

const JAY_MOBILE_VERSION = "v16";

function isMobile() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

if (!isMobile()) return;

function waitForVM(callback) {
  const interval = setInterval(() => {
    if (window.vm?.runtime?.ioDevices?.keyboard) {
      clearInterval(interval);
      callback();
    }
  }, 50);
}

waitForVM(initController);

function initController() {

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
   VM INPUT
   ============================= */

const keyboard = window.vm.runtime.ioDevices.keyboard;

function pressKey(key) {
  const normalized = key === " " ? "space" : key;
  keyboard.postData({ key: normalized, isDown: true });
}

function releaseKey(key) {
  const normalized = key === " " ? "space" : key;
  keyboard.postData({ key: normalized, isDown: false });
}

/* =============================
   8-DIRECTION DIGITAL D-PAD
   ============================= */

const dpad = document.createElement("div");

Object.assign(dpad.style, {
  position: "absolute",
  bottom: "40px",
  left: "40px",
  width: "160px",
  height: "160px",
  borderRadius: "50%",
  border: "2px solid #00ffff",
  boxShadow: "0 0 15px rgba(0,255,255,0.5)",
  background: "rgba(0,255,255,0.08)",
  touchAction: "none",
  pointerEvents: "auto"
});

controls.appendChild(dpad);

let currentDirections = new Set();
const DEAD_ZONE = 20;
const AXIS_THRESHOLD = 25;

function updateDpadDirection(x, y) {
  const rect = dpad.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = x - cx;
  const dy = y - cy;

  const newDirections = new Set();

  if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) {
    applyDirections(newDirections);
    return;
  }

  if (dx > AXIS_THRESHOLD) newDirections.add("right");
  if (dx < -AXIS_THRESHOLD) newDirections.add("left");
  if (dy > AXIS_THRESHOLD) newDirections.add("down");
  if (dy < -AXIS_THRESHOLD) newDirections.add("up");

  applyDirections(newDirections);
}

function applyDirections(newDirections) {
  for (const dir of currentDirections) {
    if (!newDirections.has(dir)) {
      releaseKey(keyMap[dir]);
    }
  }

  for (const dir of newDirections) {
    if (!currentDirections.has(dir)) {
      pressKey(keyMap[dir]);
    }
  }

  currentDirections = newDirections;
}

function clearDirections() {
  for (const dir of currentDirections) {
    releaseKey(keyMap[dir]);
  }
  currentDirections.clear();
}

dpad.addEventListener("pointerdown", e => {
  dpad.setPointerCapture(e.pointerId);
  updateDpadDirection(e.clientX, e.clientY);
});

dpad.addEventListener("pointermove", e => {
  updateDpadDirection(e.clientX, e.clientY);
});

dpad.addEventListener("pointerup", clearDirections);
dpad.addEventListener("pointercancel", clearDirections);

/* =============================
   FACE BUTTONS (mirrored tighter cluster)
   ============================= */

function createButton(name, label, bottom, left, right) {
  const btn = document.createElement("div");
  btn.dataset.name = name;
  btn.innerText = label;

  Object.assign(btn.style, {
    position: "absolute",
    bottom: bottom,
    left: left,
    right: right,
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "rgba(0,255,255,0.12)",
    border: "2px solid #00ffff",
    color: "#00ffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    touchAction: "none",
    pointerEvents: "auto",
    boxShadow: "0 0 12px rgba(0,255,255,0.6)"
  });

  controls.appendChild(btn);
  return btn;
}

/* Your requested margins */
createButton("y", "Y", "160px", null, "100px");
createButton("b", "B", "100px", null, "140px");
createButton("x", "X", "100px", null, "60px");
createButton("a", "A", "40px",  null, "100px");

/* =============================
   MULTI-TOUCH LOGIC
   ============================= */

const activePointers = new Map();
const buttonCounts = {};

function pressFace(pointerId, name) {
  if (!name) return;

  const current = activePointers.get(pointerId);
  if (current === name) return;

  releaseFace(pointerId);

  activePointers.set(pointerId, name);
  buttonCounts[name] = (buttonCounts[name] || 0) + 1;

  if (buttonCounts[name] === 1) {
    pressKey(keyMap[name]);
  }
}

function releaseFace(pointerId) {
  const name = activePointers.get(pointerId);
  if (!name) return;

  buttonCounts[name]--;

  if (buttonCounts[name] <= 0) {
    releaseKey(keyMap[name]);
    buttonCounts[name] = 0;
  }

  activePointers.delete(pointerId);
}

controls.addEventListener("pointerdown", e => {
  if (!e.target.dataset.name) return;
  e.target.setPointerCapture(e.pointerId);
  pressFace(e.pointerId, e.target.dataset.name);
});

controls.addEventListener("pointermove", e => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const name = el?.dataset?.name;
  if (name) pressFace(e.pointerId, name);
});

controls.addEventListener("pointerup", e => releaseFace(e.pointerId));
controls.addEventListener("pointercancel", e => releaseFace(e.pointerId));

/* =============================
   START
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

}

})();