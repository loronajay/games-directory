// ==============================
// JAY MOBILE CONTROLLER SYSTEM v14
// ==============================

(function () {

  const VERSION = "v14";
  const activeTouches = new Map();
  const pressedKeys = new Set();

  // ------------------------------
  // Default key layout
  // ------------------------------

  let keyMap = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    a: "z",
    b: "x",
    x: "c",
    y: "v",
    l: "a",
    r: "s"
  };

  // ------------------------------
  // Apply per-game overrides
  // ------------------------------

  if (window.JAY_GAME_CONFIG?.keyOverrides) {
    keyMap = { ...keyMap, ...window.JAY_GAME_CONFIG.keyOverrides };
  }

  // ------------------------------
  // Proper key simulation
  // ------------------------------

  function simulateKey(key, type) {

    let code = key;

    // Proper code mapping for letters
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
  // Create Version Display
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
  // Button Creation
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
      pressKey(keyMap[key] || key);
    });

    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      const mapped = activeTouches.get(e.pointerId);
      if (mapped) {
        releaseKey(keyMap[mapped] || mapped);
        activeTouches.delete(e.pointerId);
      }
    });

    btn.addEventListener("pointercancel", (e) => {
      const mapped = activeTouches.get(e.pointerId);
      if (mapped) {
        releaseKey(keyMap[mapped] || mapped);
        activeTouches.delete(e.pointerId);
      }
    });

    document.body.appendChild(btn);
  }

  // ------------------------------
  // Initialize Controller
  // ------------------------------

  window.addEventListener("DOMContentLoaded", () => {

    createVersionBadge();

    // D-Pad
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

    // Action Buttons
    createButton("btn-a", "A", "a", {
      bottom: "80px",
      right: "140px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-b", "B", "b", {
      bottom: "140px",
      right: "90px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-x", "X", "x", {
      bottom: "20px",
      right: "90px",
      width: "60px",
      height: "60px"
    });

    createButton("btn-y", "Y", "y", {
      bottom: "80px",
      right: "40px",
      width: "60px",
      height: "60px"
    });

  });

})();