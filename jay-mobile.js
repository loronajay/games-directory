/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v17
   - VM postData injection
   - True 8-direction radial D-pad (exact wedges)
   - Mirrored tighter face buttons
   ========================================== */

(function () {

const JAY_MOBILE_VERSION = "v17";

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

const entryTitle =
  window.JAY_GAME_CONFIG?.entryTitle || "INSERT COIN";

const entrySub =
  window.JAY_GAME_CONFIG?.entrySub || "TAP TO START";

startOverlay.innerHTML = `
  <h2 style="margin:0 0 20px 0;">${entryTitle}</h2>
  <p style="margin:0;">${entrySub}</p>
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
  pointerEvents: "none",
  userSelect: "none",
  webkitUserSelect: "none",
  webkitTouchCallout: "none"
});
document.body.appendChild(controls);

/* Disable text selection globally */
document.body.style.userSelect = "none";
document.body.style.webkitUserSelect = "none";
document.body.style.webkitTouchCallout = "none";
document.body.style.webkitTapHighlightColor = "transparent";

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
   D-PAD CORE
   ============================= */

let currentDirections = new Set();
const DEAD_ZONE = 20;
const DPAD_SIZE = 160;
const OUTER_RADIUS = DPAD_SIZE / 2 - 2; // inside border
const INNER_RADIUS = DEAD_ZONE;         // dead zone radius

const dpad = document.createElement("div");

Object.assign(dpad.style, {
  position: "absolute",
  bottom: "40px",
  left: "40px",
  width: "160px",
  height: "160px",
  borderRadius: "50%",
  border: "2px solid rgba(0,255,255,0.7)",
  background: "transparent",
  touchAction: "none",
  pointerEvents: "auto"
});

controls.appendChild(dpad);

/* =============================
   RING WEDGES (ANNULAR SECTORS)
   ============================= */

const wedges = [];

for (let i = 0; i < 8; i++) {

  const startAngle = (i * 45 - 22.5) * Math.PI / 180;
  const endAngle   = (i * 45 + 22.5) * Math.PI / 180;

  const x1o = 50 + (OUTER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.cos(startAngle);
  const y1o = 50 + (OUTER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.sin(startAngle);

  const x2o = 50 + (OUTER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.cos(endAngle);
  const y2o = 50 + (OUTER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.sin(endAngle);

  const x1i = 50 + (INNER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.cos(startAngle);
  const y1i = 50 + (INNER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.sin(startAngle);

  const x2i = 50 + (INNER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.cos(endAngle);
  const y2i = 50 + (INNER_RADIUS / (DPAD_SIZE/2)) * 50 * Math.sin(endAngle);

  const wedge = document.createElement("div");

  Object.assign(wedge.style, {
    position: "absolute",
    inset: "0",
    background: "transparent",
    clipPath: `
      polygon(
        ${x1o}% ${y1o}%,
        ${x2o}% ${y2o}%,
        ${x2i}% ${y2i}%,
        ${x1i}% ${y1i}%
      )
    `,
    transition: "background 0.08s ease"
  });

  wedgeLayer.appendChild(wedge);
  wedges.push(wedge);
}

/* =============================
   RADIAL DIVIDER LINES
   ============================= */

for (let i = 0; i < 8; i++) {

  const angle = i * 45 * Math.PI / 180;

  const line = document.createElement("div");

  Object.assign(line.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${OUTER_RADIUS - INNER_RADIUS}px`,
    height: "2px",
    background: "rgba(0,255,255,0.5)",
    transformOrigin: "0 50%",
    transform: `
      rotate(${i * 45}deg)
      translate(${INNER_RADIUS}px, -50%)
    `,
    pointerEvents: "none"
  });

  dpad.appendChild(line);
}

/* =============================
   ARROWS (ABOVE WEDGES)
   ============================= */

const arrowLayer = document.createElement("div");
Object.assign(arrowLayer.style, {
  position: "absolute",
  inset: "0",
  pointerEvents: "none"
});
dpad.appendChild(arrowLayer);

function createArrow(symbol, left, top) {
  const arrow = document.createElement("div");
  arrow.innerText = symbol;
  Object.assign(arrow.style, {
    position: "absolute",
    left,
    top,
    transform: "translate(-50%, -50%)",
    fontSize: "20px",
    fontFamily: "monospace",
    color: "rgba(0,255,255,0.85)"
  });
  arrowLayer.appendChild(arrow);
}

createArrow("↑", "50%", "15%");
createArrow("↓", "50%", "85%");
createArrow("←", "15%", "50%");
createArrow("→", "85%", "50%");
createArrow("↖", "20%", "20%");
createArrow("↗", "80%", "20%");
createArrow("↙", "20%", "80%");
createArrow("↘", "80%", "80%");

/* =============================
   THUMB
   ============================= */

const thumb = document.createElement("div");
Object.assign(thumb.style, {
  position: "absolute",
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: "2px solid rgba(0,255,255,0.9)",
  boxShadow: "0 0 15px rgba(0,255,255,0.8)",
  pointerEvents: "none",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  transition: "transform 0.15s ease-out"
});
dpad.appendChild(thumb);

/* =============================
   DEAD ZONE VISUAL
   ============================= */

const deadZone = document.createElement("div");
Object.assign(deadZone.style, {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: `${DEAD_ZONE * 2}px`,
  height: `${DEAD_ZONE * 2}px`,
  borderRadius: "50%",
  border: "1px solid rgba(0,255,255,0.4)",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none"
});
dpad.appendChild(deadZone);

/* =============================
   D-PAD LOGIC (ANGLE BASED)
   ============================= */

function updateDpadDirection(x, y) {
  const rect = dpad.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const radius = OUTER_RADIUS - 20;

  let limitedDx = dx;
  let limitedDy = dy;

  if (distance > radius) {
    const angle = Math.atan2(dy, dx);
    limitedDx = Math.cos(angle) * radius;
    limitedDy = Math.sin(angle) * radius;
  }

  thumb.style.transform =
    `translate(calc(-50% + ${limitedDx}px), calc(-50% + ${limitedDy}px))`;

  if (distance < DEAD_ZONE) {
    applyDirections(new Set());
    highlightWedge(null);
    return;
  }

  let angle = Math.atan2(dy, dx);
  angle = (angle * 180 / Math.PI + 360) % 360;

  const wedgeIndex = Math.floor((angle + 22.5) / 45) % 8;

  const directions = [
    ["right"],
    ["down","right"],
    ["down"],
    ["down","left"],
    ["left"],
    ["up","left"],
    ["up"],
    ["up","right"]
  ];

  const newDirections = new Set(directions[wedgeIndex]);

  applyDirections(newDirections);
  highlightWedge(wedgeIndex);
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
  highlightWedge(null);
  thumb.style.transform = "translate(-50%, -50%)";
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