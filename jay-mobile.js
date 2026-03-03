/* ==========================================
   JAY ARCADE UNIVERSAL MOBILE SYSTEM v12
   - True controller state engine
   - Forces simultaneous key holding
   - Android Chrome compatible
   ========================================== */

const JAY_MOBILE_VERSION = "v12.0";

function isMobileDevice() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function simulateKey(key, type) {
  const event = new KeyboardEvent(type, {
    key: key,
    code: key,
    bubbles: true
  });

  window.dispatchEvent(event);
  document.dispatchEvent(event);
}

if (isMobileDevice()) {

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  /* VERSION BADGE */
  const badge = document.createElement("div");
  badge.innerText = JAY_MOBILE_VERSION;
  Object.assign(badge.style, {
    position: "fixed",
    top: "8px",
    right: "12px",
    color: "#00ffff",
    fontFamily: "monospace",
    fontSize: "12px",
    opacity: "0.7",
    zIndex: "1000000",
    pointerEvents: "none"
  });
  document.body.appendChild(badge);

  /* CONTROLS LAYER */
  const controls = document.createElement("div");
  Object.assign(controls.style, {
    position: "fixed",
    inset: "0",
    zIndex: "999998",
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

  const activePointers = new Map();
  const activeKeys = new Set();

  function rebroadcastState() {
    activeKeys.forEach(key => simulateKey(key, "keydown"));
  }

  function press(pointerId, button) {
    if (!button) return;

    const current = activePointers.get(pointerId);
    if (current === button) return;

    if (current) release(pointerId);

    activePointers.set(pointerId, button);
    const key = keyMap[button];

    activeKeys.add(key);
    simulateKey(key, "keydown");
    rebroadcastState();
  }

  function release(pointerId) {
    const button = activePointers.get(pointerId);
    if (!button) return;

    const key = keyMap[button];
    activeKeys.delete(key);

    simulateKey(key, "keyup");
    rebroadcastState();

    activePointers.delete(pointerId);
  }

  controls.addEventListener("pointerdown", e => {
    if (!e.target.dataset.name) return;
    e.target.setPointerCapture(e.pointerId);
    press(e.pointerId, e.target.dataset.name);
  });

  controls.addEventListener("pointermove", e => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const name = el?.dataset?.name;
    const current = activePointers.get(e.pointerId);
    if (name && name !== current) {
      press(e.pointerId, name);
    }
  });

  controls.addEventListener("pointerup", e => release(e.pointerId));
  controls.addEventListener("pointercancel", e => release(e.pointerId));
}