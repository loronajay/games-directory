/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v14
   - Safe VM wait
   - Direct TurboWarp postData injection
   - True multi-touch controller behavior
   ========================================== */

(function () {

const JAY_MOBILE_VERSION = "v14"; // change manually per deploy

function isMobile() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

if (!isMobile()) {
  return; // now legal because we're inside a function
}

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

/* =============================
   8-DIRECTION D-PAD (SINGLE SURFACE)
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

function updateDpadDirection(x, y) {
  const rect = dpad.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = x - cx;
  const dy = y - cy;

  const distance = Math.sqrt(dx * dx + dy * dy);

  // Dead zone in center
  if (distance < 20) {
    clearDirections();
    return;
  }

  const angle = Math.atan2(dy, dx); // radians

  const directions = new Set();

  // Right
  if (angle > -Math.PI/4 && angle <= Math.PI/4) {
    directions.add("right");
  }

  // Down
  if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
    directions.add("down");
  }

  // Left
  if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) {
    directions.add("left");
  }

  // Up
  if (angle > -3*Math.PI/4 && angle <= -Math.PI/4) {
    directions.add("up");
  }

  applyDirections(directions);
}

function applyDirections(newDirections) {
  // Release removed directions
  for (const dir of currentDirections) {
    if (!newDirections.has(dir)) {
      releaseKey(keyMap[dir]);
    }
  }

  // Press new directions
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

/* FACE BUTTONS (mirrored tighter cluster) */
createButton("y", "Y", "160px", null, "100px");
createButton("b", "B", "100px", null, "140px");
createButton("x", "X", "100px", null, "60px");
createButton("a", "A", "40px",  null, "100px");

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
  keyboard.postData({ key, isDown: true });
}

function releaseKey(key) {
  keyboard.postData({ key, isDown: false });
}

/* =============================
   CONTROLLER ENGINE
   ============================= */

const activePointers = new Map();
const buttonCounts = {};

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
    pressKey(keyMap[name]);
    updateVisual(name, true);
  }
}

function releaseButton(pointerId) {
  const name = activePointers.get(pointerId);
  if (!name) return;

  buttonCounts[name]--;

  if (buttonCounts[name] <= 0) {
    releaseKey(keyMap[name]);
    updateVisual(name, false);
    buttonCounts[name] = 0;
  }

  activePointers.delete(pointerId);
}

/* POINTER EVENTS */

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

/* START */

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