/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v18.5
   - layout-driven
   - segmented 8-way ring d-pad
   - responsive sizing
   - portrait + landscape support
   - dual-dpad support
   - upgraded Genesis-style d-pad feel
   - corrected visual/input alignment
   - curved segmented highlight regions
   - aligned wedge boundaries
   - smooth raw-touch thumb cursor
   - improved arrow appearance
   ========================================== */

(function () {
"use strict";

const JAY_MOBILE_VERSION = "v18.5";

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

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    return {
      x: cx + Math.cos(rad) * r,
      y: cy + Math.sin(rad) * r
    };
  }

  function describeRingSegmentPath(cx, cy, innerR, outerR, startDeg, endDeg) {
    const startOuter = polarToCartesian(cx, cy, outerR, startDeg);
    const endOuter = polarToCartesian(cx, cy, outerR, endDeg);
    const startInner = polarToCartesian(cx, cy, innerR, endDeg);
    const endInner = polarToCartesian(cx, cy, innerR, startDeg);

    const sweep = ((endDeg - startDeg) % 360 + 360) % 360;
    const largeArc = sweep > 180 ? 1 : 0;

    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
      `L ${startInner.x} ${startInner.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
      "Z"
    ].join(" ");
  }

  function createRingDpad(options) {
    const el = makeBaseControl();
    const segments = [];
    const centerCap = document.createElement("div");
    const centerDot = document.createElement("div");
    const thumb = document.createElement("div");

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    const segmentGroup = document.createElementNS(svgNS, "g");
    const dividerGroup = document.createElementNS(svgNS, "g");

    let activeDirection = null;
    let activePointerId = null;
    let thumbX = 0;
    let thumbY = 0;
    let thumbVisible = false;

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

    const cx = options.size / 2;
    const cy = options.size / 2;
    const outerR = options.size * 0.485;
    const innerR = options.size * 0.20;
    const thumbMaxR = outerR * 0.92;

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
      thumbVisible = false;
      thumbX = 0;
      thumbY = 0;
      applyDirection(null);
    }

    function updateVisualState() {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const zone = visualZones[i];
        const isActive = zone.dir === activeDirection;

        seg.setAttribute(
          "fill",
          isActive ? "rgba(0,255,255,0.24)" : "rgba(0,255,255,0.05)"
        );
        seg.style.filter = isActive
          ? "drop-shadow(0 0 8px rgba(0,255,255,0.35))"
          : "none";
        seg.setAttribute("opacity", isActive ? "1" : "0.92");
      }

      centerCap.style.boxShadow = activeDirection
        ? "0 0 18px rgba(0,255,255,0.35)"
        : "0 0 10px rgba(0,255,255,0.18)";

      if (!thumbVisible) {
        thumb.style.opacity = "0";
        thumb.style.transform = "translate(-50%, -50%)";
      } else {
        thumb.style.opacity = "1";
        thumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;
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
      const padCx = rect.left + rect.width / 2;
      const padCy = rect.top + rect.height / 2;
      const dx = clientX - padCx;
      const dy = clientY - padCy;
      const distance = Math.hypot(dx, dy);

      const outerRadius = rect.width / 2;
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = normalizeAngle(angleRad * 180 / Math.PI);

      thumbVisible = true;

      if (distance > 0) {
        const clamped = Math.min(distance, thumbMaxR);
        const scale = clamped / distance;
        thumbX = dx * scale;
        thumbY = dy * scale;
      } else {
        thumbX = 0;
        thumbY = 0;
      }

      const nextDirection = resolveDirection(angleDeg, distance, outerRadius);
      applyDirection(nextDirection);
      updateVisualState();
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

    Object.assign(svg.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      overflow: "visible"
    });

    svg.setAttribute("viewBox", `0 0 ${options.size} ${options.size}`);
    svg.appendChild(segmentGroup);
    svg.appendChild(dividerGroup);
    el.appendChild(svg);

    for (const zone of visualZones) {
      const seg = document.createElementNS(svgNS, "path");
      const startDeg = zone.center - zone.half;
      const endDeg = zone.center + zone.half;

      seg.setAttribute(
        "d",
        describeRingSegmentPath(cx, cy, innerR, outerR, startDeg, endDeg)
      );
      seg.setAttribute("fill", "rgba(0,255,255,0.05)");
      seg.setAttribute("opacity", "0.92");
      seg.style.transition = "fill 0.04s linear, opacity 0.04s linear, filter 0.04s linear";

      segmentGroup.appendChild(seg);
      segments.push(seg);
    }

    const boundaryAngles = [];
    for (const zone of visualZones) {
      boundaryAngles.push(zone.center - zone.half);
      boundaryAngles.push(zone.center + zone.half);
    }

    for (const angle of boundaryAngles) {
      const p1 = polarToCartesian(cx, cy, innerR, angle);
      const p2 = polarToCartesian(cx, cy, outerR, angle);
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
      line.setAttribute("stroke", "rgba(0,255,255,0.22)");
      line.setAttribute("stroke-width", Math.max(1.5, options.size * 0.010));
      line.setAttribute("stroke-linecap", "round");
      dividerGroup.appendChild(line);
    }

    Object.assign(centerCap.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: `${innerR * 2}px`,
      height: `${innerR * 2}px`,
      transform: "translate(-50%, -50%)",
      borderRadius: "50%",
      border: "3px solid rgba(0,255,255,0.88)",
      background: "rgba(0,0,0,0.22)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 10px rgba(0,255,255,0.18)",
      boxSizing: "border-box"
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
      transition: "opacity 0.03s linear"
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
  { angle: 270, rotate:   0 },
  { angle: 315, rotate:  45 },
  { angle: 0,   rotate:  90 },
  { angle: 45,  rotate: 135 },
  { angle: 90,  rotate: 180 },
  { angle: 135, rotate: 225 },
  { angle: 180, rotate: 270 },
  { angle: 225, rotate: 315 }
];

const arrowRadius = innerR + (outerR - innerR) * 0.50;

for (const { angle, rotate } of arrows) {
  const p = polarToCartesian(cx, cy, arrowRadius, angle);
  const a = document.createElement("div");
  a.textContent = "↑";
  Object.assign(a.style, {
    position: "absolute",
    left: `${p.x}px`,
    top: `${p.y}px`,
    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    color: "rgba(0,255,255,0.88)",
    fontFamily: "monospace",
    fontSize: `${Math.max(14, options.size * 0.10)}px`,
    textShadow: "0 0 8px rgba(0,255,255,0.25)",
    lineHeight: "1",
    width: `${Math.max(18, options.size * 0.12)}px`,
    height: `${Math.max(18, options.size * 0.12)}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
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