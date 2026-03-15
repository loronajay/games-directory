/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v18.2
   - layout-driven
   - segmented 8-way ring d-pad
   - responsive sizing
   - portrait + landscape support
   - dual-dpad support
   - upgraded Genesis-style d-pad feel
   - corrected visual/input alignment
   ========================================== */

(function () {
"use strict";

const JAY_MOBILE_VERSION = "v18.2";

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
  const gameConfig = window.JAY_GAME_CONFIG || {};
  const mobileConfig = gameConfig.mobile || {};
  const layoutName = mobileConfig.layout || "default";

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

  if (gameConfig.keyOverrides) {
    keyMap = { ...keyMap, ...gameConfig.keyOverrides };
  }

  const keyboard = window.vm.runtime.ioDevices.keyboard;
  const pressedKeys = new Set();

  function pressKey(key) {
    if (!key || pressedKeys.has(key)) return;
    pressedKeys.add(key);
    keyboard.postData({ key, isDown: true });
  }

  function releaseKey(key) {
    if (!key || !pressedKeys.has(key)) return;
    pressedKeys.delete(key);
    keyboard.postData({ key, isDown: false });
  }

  function releaseKeys(keys) {
    for (const key of keys) releaseKey(key);
  }

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

  const controls = document.createElement("div");
  Object.assign(controls.style, {
    position: "fixed",
    inset: "0",
    display: "block",
    zIndex: "999997",
    pointerEvents: "none",
    userSelect: "none",
    webkitUserSelect: "none",
    webkitTouchCallout: "none"
  });
  document.body.appendChild(controls);

  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";
  document.body.style.webkitTouchCallout = "none";
  document.body.style.webkitTapHighlightColor = "transparent";

  let firstGestureDone = false;

  async function handleFirstGestureSetup() {
    if (firstGestureDone) return;
    firstGestureDone = true;

    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {}
    }

    if (screen.orientation?.lock) {
      try {
        await screen.orientation.lock("landscape");
      } catch {}
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getLayoutMetrics() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const portrait = vh > vw;
    const shortSide = Math.min(vw, vh);

    const padSize = clamp(shortSide * (portrait ? 0.31 : 0.27), 145, 250);
    const buttonSize = clamp(shortSide * (portrait ? 0.135 : 0.115), 70, 118);
    const edge = clamp(shortSide * 0.055, 16, 42);
    const faceGap = clamp(buttonSize * 0.78, 42, 82);

    return {
      vw,
      vh,
      portrait,
      padSize,
      buttonSize,
      edge,
      faceGap
    };
  }

  function makeBaseControl() {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute",
      pointerEvents: "auto",
      touchAction: "none"
    });
    controls.appendChild(el);
    return el;
  }

  function directionToKeys(direction, map) {
    switch (direction) {
      case "up": return [map.up];
      case "up-right": return [map.up, map.right];
      case "right": return [map.right];
      case "down-right": return [map.down, map.right];
      case "down": return [map.down];
      case "down-left": return [map.down, map.left];
      case "left": return [map.left];
      case "up-left": return [map.up, map.left];
      default: return [];
    }
  }

  function normalizeAngle(angle) {
    return (angle % 360 + 360) % 360;
  }

  function shortestAngleDelta(a, b) {
    let d = normalizeAngle(a - b);
    if (d > 180) d -= 360;
    return d;
  }

  function getDirectionCenter(direction) {
    switch (direction) {
      case "right": return 0;
      case "down-right": return 45;
      case "down": return 90;
      case "down-left": return 135;
      case "left": return 180;
      case "up-left": return 225;
      case "up": return 270;
      case "up-right": return 315;
      default: return null;
    }
  }

  function angleToDirectionGenesis(angle, options = {}) {
    const {
      cardinalHalf = 26,
      diagonalHalf = 18
    } = options;

    const a = normalizeAngle(angle);

    const zones = [
      ["right", 0, cardinalHalf],
      ["down-right", 45, diagonalHalf],
      ["down", 90, cardinalHalf],
      ["down-left", 135, diagonalHalf],
      ["left", 180, cardinalHalf],
      ["up-left", 225, diagonalHalf],
      ["up", 270, cardinalHalf],
      ["up-right", 315, diagonalHalf]
    ];

    for (const [dir, center, half] of zones) {
      if (Math.abs(shortestAngleDelta(a, center)) <= half) {
        return dir;
      }
    }

    let bestDir = null;
    let bestDist = Infinity;
    for (const [dir, center] of zones) {
      const dist = Math.abs(shortestAngleDelta(a, center));
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }
    return bestDir;
  }

  function createRingDpad(options) {
    const el = makeBaseControl();
    const segments = [];
    const dividers = [];
    const centerCap = document.createElement("div");
    const centerDot = document.createElement("div");
    const thumb = document.createElement("div");

    let activeDirection = null;
    let activePointerId = null;
    let visualAngle = null;

    const visualZones = [
      { dir: "right", center: 0, half: 26 },
      { dir: "down-right", center: 45, half: 18 },
      { dir: "down", center: 90, half: 26 },
      { dir: "down-left", center: 135, half: 18 },
      { dir: "left", center: 180, half: 26 },
      { dir: "up-left", center: 225, half: 18 },
      { dir: "up", center: 270, half: 26 },
      { dir: "up-right", center: 315, half: 18 }
    ];

    function applyDirection(nextDirection) {
      if (nextDirection === activeDirection) return;

      const prevKeys = directionToKeys(activeDirection, options.map);
      const nextKeys = directionToKeys(nextDirection, options.map);

      releaseKeys(prevKeys);
      for (const key of nextKeys) pressKey(key);

      activeDirection = nextDirection;
      updateVisualState();
    }

    function clearDirection() {
      visualAngle = null;
      applyDirection(null);
    }

    function updateVisualState() {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const zone = visualZones[i];
        const isActive = zone.dir === activeDirection;

        seg.style.background = isActive
          ? "rgba(0,255,255,0.24)"
          : "rgba(0,255,255,0.05)";

        seg.style.boxShadow = isActive
          ? "inset 0 0 18px rgba(0,255,255,0.50), 0 0 14px rgba(0,255,255,0.22)"
          : "none";

        seg.style.opacity = isActive ? "1" : "0.92";
      }

      centerCap.style.boxShadow = activeDirection
        ? "0 0 18px rgba(0,255,255,0.35)"
        : "0 0 10px rgba(0,255,255,0.18)";

      if (visualAngle == null) {
        thumb.style.opacity = "0";
        thumb.style.transform = "translate(-50%, -50%)";
      } else {
        const radius = options.size * 0.30;
        const rad = visualAngle * Math.PI / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        thumb.style.opacity = "1";
        thumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      }
    }

    function resolveDirection(angleDeg, distance, outerRadius) {
      const ringStart = outerRadius * 0.24;
      const ringEnd = outerRadius * 1.08;

      if (distance < ringStart) return null;
      if (distance > ringEnd) return activeDirection;

      const candidate = angleToDirectionGenesis(angleDeg, {
        cardinalHalf: 26,
        diagonalHalf: 18
      });

      if (!activeDirection) return candidate;

      const currentCenter = getDirectionCenter(activeDirection);
      const candidateCenter = getDirectionCenter(candidate);

      const currentError = Math.abs(shortestAngleDelta(angleDeg, currentCenter));
      const candidateError = Math.abs(shortestAngleDelta(angleDeg, candidateCenter));

      if (candidate !== activeDirection && candidateError + 8 < currentError) {
        return candidate;
      }

      return activeDirection;
    }

    function updateFromPoint(clientX, clientY) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const distance = Math.hypot(dx, dy);

      const outerRadius = rect.width / 2;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = normalizeAngle(angleRad * 180 / Math.PI);

      visualAngle = angleDeg;

      const nextDirection = resolveDirection(angleDeg, distance, outerRadius);
      applyDirection(nextDirection);
    }

    Object.assign(el.style, {
      width: `${options.size}px`,
      height: `${options.size}px`,
      borderRadius: "50%",
      background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.28) 100%)",
      border: "3px solid rgba(0,255,255,0.88)",
      boxSizing: "border-box",
      overflow: "hidden",
      backdropFilter: "blur(2px)"
    });

    for (const zone of visualZones) {
      const seg = document.createElement("div");
      const start = (zone.center - zone.half) * Math.PI / 180;
      const end = (zone.center + zone.half) * Math.PI / 180;

      Object.assign(seg.style, {
        position: "absolute",
        inset: "0",
        clipPath: `polygon(
          50% 50%,
          ${50 + 50 * Math.cos(start)}% ${50 + 50 * Math.sin(start)}%,
          ${50 + 50 * Math.cos(end)}% ${50 + 50 * Math.sin(end)}%
        )`,
        background: "rgba(0,255,255,0.05)",
        opacity: "0.92",
        transition: "background 0.04s linear, box-shadow 0.04s linear, opacity 0.04s linear"
      });

      el.appendChild(seg);
      segments.push(seg);
    }

    for (let i = 0; i < 8; i++) {
      const divider = document.createElement("div");
      const angle = i * 45;
      Object.assign(divider.style, {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: "2px",
        height: `${options.size * 0.44}px`,
        background: "rgba(0,255,255,0.20)",
        transformOrigin: "50% 0%",
        transform: `translate(-50%, 0%) rotate(${angle}deg)`
      });
      el.appendChild(divider);
      dividers.push(divider);
    }

    Object.assign(centerCap.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: `${options.size * 0.46}px`,
      height: `${options.size * 0.46}px`,
      transform: "translate(-50%, -50%)",
      borderRadius: "38%",
      border: "3px solid rgba(0,255,255,0.88)",
      background: "rgba(0,0,0,0.22)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 10px rgba(0,255,255,0.18)"
    });

    Object.assign(centerDot.style, {
      width: `${options.size * 0.11}px`,
      height: `${options.size * 0.11}px`,
      borderRadius: "50%",
      border: "2px solid rgba(0,255,255,0.75)",
      color: "rgba(0,255,255,0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "monospace",
      fontSize: `${Math.max(10, options.size * 0.06)}px`
    });
    centerDot.textContent = "×";

    Object.assign(thumb.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: `${Math.max(18, options.size * 0.14)}px`,
      height: `${Math.max(18, options.size * 0.14)}px`,
      borderRadius: "50%",
      background: "rgba(0,255,255,0.16)",
      border: "2px solid rgba(0,255,255,0.88)",
      boxShadow: "0 0 12px rgba(0,255,255,0.25)",
      pointerEvents: "none",
      opacity: "0",
      transform: "translate(-50%, -50%)",
      transition: "transform 0.03s linear, opacity 0.03s linear"
    });

    centerCap.appendChild(centerDot);
    el.appendChild(thumb);
    el.appendChild(centerCap);

    const arrowLayer = document.createElement("div");
    Object.assign(arrowLayer.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none"
    });
    el.appendChild(arrowLayer);

    const arrows = [
      ["↑", 50, 18],
      ["↗", 78, 28],
      ["→", 82, 50],
      ["↘", 78, 72],
      ["↓", 50, 82],
      ["↙", 22, 72],
      ["←", 18, 50],
      ["↖", 22, 28]
    ];

    for (const [symbol, x, y] of arrows) {
      const a = document.createElement("div");
      a.textContent = symbol;
      Object.assign(a.style, {
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        color: "rgba(0,255,255,0.88)",
        fontFamily: "monospace",
        fontSize: `${Math.max(14, options.size * 0.10)}px`,
        textShadow: "0 0 8px rgba(0,255,255,0.25)"
      });
      arrowLayer.appendChild(a);
    }

    el.addEventListener("pointerdown", async (e) => {
      await handleFirstGestureSetup();
      activePointerId = e.pointerId;
      el.setPointerCapture(e.pointerId);
      updateFromPoint(e.clientX, e.clientY);
    });

    el.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activePointerId) return;
      updateFromPoint(e.clientX, e.clientY);
    });

    function endPointer(e) {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      clearDirection();
      updateVisualState();
    }

    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);

    updateVisualState();

    return {
      el,
      setPosition({ left, right, bottom, top }) {
        el.style.left = left ?? "";
        el.style.right = right ?? "";
        el.style.bottom = bottom ?? "";
        el.style.top = top ?? "";
      }
    };
  }

  function createFaceButton({ name, label, size }) {
    const btn = makeBaseControl();
    let activePointerId = null;

    Object.assign(btn.style, {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: "rgba(0,255,255,0.08)",
      border: "3px solid rgba(0,255,255,0.85)",
      color: "rgba(0,255,255,0.92)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      fontWeight: "bold",
      fontSize: `${Math.max(20, size * 0.34)}px`,
      boxSizing: "border-box",
      backdropFilter: "blur(2px)",
      transition: "transform 0.05s ease, box-shadow 0.05s ease, background 0.05s ease"
    });

    btn.textContent = label;

    function activate() {
      btn.style.transform = "scale(0.95)";
      btn.style.background = "rgba(0,255,255,0.18)";
      btn.style.boxShadow = "0 0 20px rgba(0,255,255,0.35)";
      pressKey(keyMap[name]);
    }

    function deactivate() {
      btn.style.transform = "scale(1)";
      btn.style.background = "rgba(0,255,255,0.08)";
      btn.style.boxShadow = "none";
      releaseKey(keyMap[name]);
    }

    btn.addEventListener("pointerdown", async (e) => {
      await handleFirstGestureSetup();
      activePointerId = e.pointerId;
      btn.setPointerCapture(e.pointerId);
      activate();
    });

    function endPointer(e) {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      deactivate();
    }

    btn.addEventListener("pointerup", endPointer);
    btn.addEventListener("pointercancel", endPointer);

    return {
      el: btn,
      setPosition({ left, right, bottom, top }) {
        btn.style.left = left ?? "";
        btn.style.right = right ?? "";
        btn.style.bottom = bottom ?? "";
        btn.style.top = top ?? "";
      }
    };
  }

  function createScanlineButton() {
    const scanlineBtn = document.createElement("div");
    scanlineBtn.textContent = "Scanlines";

    Object.assign(scanlineBtn.style, {
      position: "fixed",
      top: "6px",
      left: "6px",
      padding: "4px 8px",
      fontSize: "11px",
      fontFamily: "monospace",
      color: "#00ffff",
      background: "transparent",
      border: "1px solid rgba(0,255,255,0.7)",
      borderRadius: "6px",
      pointerEvents: "auto",
      touchAction: "none",
      zIndex: "999999",
      userSelect: "none"
    });

    document.body.appendChild(scanlineBtn);

    scanlineBtn.addEventListener("pointerdown", async () => {
      await handleFirstGestureSetup();
      scanlineBtn.style.borderColor = "#00ffff";
      pressKey("2");
    });

    function end() {
      scanlineBtn.style.borderColor = "rgba(0,255,255,0.7)";
      releaseKey("2");
    }

    scanlineBtn.addEventListener("pointerup", end);
    scanlineBtn.addEventListener("pointercancel", end);
  }

  function clearControls() {
    controls.innerHTML = "";
  }

  function renderDefaultLayout() {
    clearControls();
    const m = getLayoutMetrics();

    const leftPad = createRingDpad({
      size: m.padSize,
      map: {
        up: keyMap.up,
        down: keyMap.down,
        left: keyMap.left,
        right: keyMap.right
      }
    });

    leftPad.setPosition({
      left: `${m.edge}px`,
      bottom: `${m.edge}px`
    });

    const yBtn = createFaceButton({ name: "y", label: "Y", size: m.buttonSize });
    const bBtn = createFaceButton({ name: "b", label: "B", size: m.buttonSize });
    const xBtn = createFaceButton({ name: "x", label: "X", size: m.buttonSize });
    const aBtn = createFaceButton({ name: "a", label: "A", size: m.buttonSize });

    const groupRight = m.edge;
    const baseBottom = m.edge;
    const gap = m.faceGap;

    yBtn.setPosition({ right: `${groupRight + gap}px`, bottom: `${baseBottom + gap * 2}px` });
    bBtn.setPosition({ right: `${groupRight + gap * 2}px`, bottom: `${baseBottom + gap}px` });
    xBtn.setPosition({ right: `${groupRight}px`, bottom: `${baseBottom + gap}px` });
    aBtn.setPosition({ right: `${groupRight + gap}px`, bottom: `${baseBottom}px` });
  }

  function renderDualDpadLayout() {
    clearControls();
    const m = getLayoutMetrics();

    const leftPad = createRingDpad({
      size: m.padSize,
      map: {
        up: keyMap.up,
        down: keyMap.down,
        left: keyMap.left,
        right: keyMap.right
      }
    });

    leftPad.setPosition({
      left: `${m.edge}px`,
      bottom: `${m.edge}px`
    });

    const rightPad = createRingDpad({
      size: m.padSize,
      map: {
        up: keyMap.y,
        down: keyMap.a,
        left: keyMap.b,
        right: keyMap.x
      }
    });

    rightPad.setPosition({
      right: `${m.edge}px`,
      bottom: `${m.edge}px`
    });
  }

  function renderLayout() {
    if (layoutName === "dual-dpad") {
      renderDualDpadLayout();
    } else {
      renderDefaultLayout();
    }
  }

  createScanlineButton();
  renderLayout();
  window.addEventListener("resize", renderLayout);
}
})();