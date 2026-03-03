// ==============================
// JAY MOBILE CONTROLLER SYSTEM v16
// TRUE TOUCH REGION ENGINE
// ==============================

(function () {

  const VERSION = "v16";

  const pressedKeys = new Set();
  const fingerMap = new Map(); // pointerId → key
  const buttons = [];

  // ------------------------------
  // DEFAULT KEY MAP
  // ------------------------------

  let keyMap = {
    left: "a",
    right: "d",
    up: "w",
    down: "s",
    a: "z",
    b: "x",
    x: "c",
    y: "v"
  };

  if (window.JAY_GAME_CONFIG?.keyOverrides) {
    keyMap = { ...keyMap, ...window.JAY_GAME_CONFIG.keyOverrides };
  }

  // ------------------------------
  // KEY SIMULATION
  // ------------------------------

  function simulateKey(key, type) {
    let code = key;

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
  // BUTTON CREATION
  // ------------------------------

  function createButton(id, label, key, styles) {

    const btn = document.createElement("div");
    btn.innerText = label;
    btn.dataset.key = key;

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
      pointerEvents: "none",
      ...styles
    });

    document.body.appendChild(btn);
    buttons.push(btn);
  }

  // ------------------------------
  // HIT TEST
  // ------------------------------

  function getButtonAt(x, y) {
    for (let btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return btn.dataset.key;
      }
    }
    return null;
  }

  // ------------------------------
  // GLOBAL TOUCH ENGINE
  // ------------------------------

  function handlePointer(e) {

    const keyUnderFinger = getButtonAt(e.clientX, e.clientY);
    const previousKey = fingerMap.get(e.pointerId);

    if (keyUnderFinger !== previousKey) {

      if (previousKey) {
        releaseKey(keyMap[previousKey]);
      }

      if (keyUnderFinger) {
        pressKey(keyMap[keyUnderFinger]);
      }

      if (keyUnderFinger) {
        fingerMap.set(e.pointerId, keyUnderFinger);
      } else {
        fingerMap.delete(e.pointerId);
      }
    }
  }

  function handlePointerUp(e) {
    const key = fingerMap.get(e.pointerId);
    if (key) {
      releaseKey(keyMap[key]);
      fingerMap.delete(e.pointerId);
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
  // INIT
  // ------------------------------

  window.addEventListener("DOMContentLoaded", () => {

    createVersionBadge();

    // LEFT D-PAD
    createButton("left", "◀", "left", { bottom: "80px", left: "40px", width: "60px", height: "60px" });
    createButton("right", "▶", "right", { bottom: "80px", left: "140px", width: "60px", height: "60px" });
    createButton("up", "▲", "up", { bottom: "140px", left: "90px", width: "60px", height: "60px" });
    createButton("down", "▼", "down", { bottom: "20px", left: "90px", width: "60px", height: "60px" });

    // RIGHT ACTION PAD (diamond mirror)
    createButton("y", "Y", "y", { bottom: "140px", right: "90px", width: "60px", height: "60px" });
    createButton("b", "B", "b", { bottom: "80px", right: "140px", width: "60px", height: "60px" });
    createButton("x", "X", "x", { bottom: "80px", right: "40px", width: "60px", height: "60px" });
    createButton("a", "A", "a", { bottom: "20px", right: "90px", width: "60px", height: "60px" });

    // Global listeners
    window.addEventListener("pointerdown", handlePointer);
    window.addEventListener("pointermove", handlePointer);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

  });

})();