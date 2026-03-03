// ==============================
// JAY MOBILE CONTROLLER SYSTEM v15
// ==============================

(function () {

  const VERSION = "v15";
  const activeTouches = new Map();
  const pressedKeys = new Set();

  // ------------------------------
  // DEFAULT KEY MAP
  // ------------------------------

  let keyMap = {
    left: "a",        // D-pad left calls "a"
    right: "d",       // D-pad right calls "d"
    up: "w",
    down: "s",
    a: "z",
    b: "x",
    x: "c",
    y: "v"
  };

  // ------------------------------
  // APPLY PER-GAME OVERRIDES
  // ------------------------------

  if (window.JAY_GAME_CONFIG?.keyOverrides) {
    keyMap = { ...keyMap, ...window.JAY_GAME_CONFIG.keyOverrides };
  }

  // ------------------------------
  // KEY SIMULATION (Proper Mapping)
  // ------------------------------

  function simulateKey(key, type) {

    let code = key;

    // Proper letter handling
    if (key.length === 1 && key.match(/[a-z]/i)) {
      code = "Key" + key.toUpperCase();
    }

    const event = new KeyboardEvent(type, {
      key: key,
      code: code,
      bubbles: true
    });

    window.dispatchEvent(event);
    document.dispatchEvent(event);
  }

  function pressKey(key) {
    if (!pressedKeys.has(key)) {
      pressedKeys.add(key);
      simulateKey(key, "keydown");
    }
  }

  function releaseKey(key) {
    if (pressedKeys.has(key)) {
      pressedKeys.delete(key);
      simulateKey(key, "keyup");
    }
  }

  // ------------------------------
  // VERSION BADGE
  // ------------------------------

  function createVersionBadge() {
    const badge = document.createElement("div");
    badge.innerText = VERSION;
    badge.style.position = "fixed";
    badge.style.top = "8px";
    badge.style.right = "12px";
    badge.style.color = "white";
    badge.style.fontSize = "14px";
    badge.style.fontFamily = "monospace";
    badge.style.zIndex = "9999";
    badge.style.opacity = "0.6";
    document.body.appendChild(badge);
  }

  // ------------------------------
  // BUTTON CREATION
  // ------------------------------

  function createButton(id, label, key, styles) {

    const btn = document.createElement("div");
    btn.innerText = label;
    btn.id = id;

    Object.assign(btn.style, {
      position: "fixed",
      background: "rgba(255,255,255,0.15)",
      border: "2px solid white",
      borderRadius: "50%",
      color: "white",
      fontSize: "20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      userSelect: "none",
      touchAction: "none",
      ...styles
    });

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      activeTouches.set(e.pointerId, key);
      pressKey(keyMap[key]);
    });

    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      const mapped = activeTouches.get(e.pointerId);
      if (mapped) {
        releaseKey(keyMap[mapped]);
        activeTouches.delete(e.pointerId);
      }
    });

    btn.addEventListener("pointercancel", (e) => {
      const mapped = activeTouches.get(e.pointerId);
      if (mapped) {
        releaseKey(keyMap[mapped]);
        activeTouches.delete(e.pointerId);
      }
    });

    document.body.appendChild(btn);
  }

  // ------------------------------
  // INIT CONTROLLER
  // ------------------------------

  window.addEventListener("DOMContentLoaded", () => {

    createVersionBadge();

    // ------------------
    // LEFT SIDE D-PAD
    // ------------------

    createButton("btn-left", "◀", "left", {
      bottom: "80px",
      left: "40px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-right", "▶", "right", {
      bottom: "80px",
      left: "140px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-up", "▲", "up", {
      bottom: "140px",
      left: "90px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-down", "▼", "down", {
      bottom: "20px",
      left: "90px",
      width: "60px",
      height: "60px"
    });

    // ------------------
    // RIGHT SIDE ACTION PAD
    // Mirrored Diamond Layout
    // ------------------

    createButton("btn-y", "Y", "y", {
      bottom: "140px",
      right: "90px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-b", "B", "b", {
      bottom: "80px",
      right: "140px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-x", "X", "x", {
      bottom: "80px",
      right: "40px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-a", "A", "a", {
      bottom: "20px",
      right: "90px",
      width: "60px",
      height: "60px"
    });

  });

})();