/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v19.6
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

const JAY_MOBILE_VERSION = "v19.6";

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

  let scanlineButtonApi = null;
  let themeButtonApi = null;

  const COLOR_PRESETS = {
  "arcade-cyan": "#00ffff",
  "crt-amber": "#ffb000",
  "genesis-green": "#5aff87",
  "neon-pink": "#ff4fd8",
  "ice-blue": "#7fdcff"
};

const THEME_ORDER = [
  "arcade-cyan",
  "crt-amber",
  "genesis-green",
  "neon-pink",
  "ice-blue"
];

const THEME_LABELS = {
  "arcade-cyan": "Arcade Cyan",
  "crt-amber": "CRT Amber",
  "genesis-green": "Genesis Green",
  "neon-pink": "Neon Pink",
  "ice-blue": "Ice Blue"
};



function getSavedThemeName() {
  const saved = localStorage.getItem("jayControllerTheme");
  return COLOR_PRESETS[saved] ? saved : "arcade-cyan";
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean;

  const num = parseInt(value, 16);

  if (Number.isNaN(num)) {
    return { r: 0, g: 255, b: 255 };
  }

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

let currentThemeName = getSavedThemeName();
let colorHex = COLOR_PRESETS[currentThemeName];
let themeColor = hexToRgb(colorHex);

function applyThemeByName(name) {
  currentThemeName = COLOR_PRESETS[name] ? name : "arcade-cyan";
  colorHex = COLOR_PRESETS[currentThemeName];
  themeColor = hexToRgb(colorHex);
  localStorage.setItem("jayControllerTheme", currentThemeName);
}

const buttonLabels = {
  a: mobileConfig.buttonLabels?.a || "A",
  b: mobileConfig.buttonLabels?.b || "B",
  x: mobileConfig.buttonLabels?.x || "X",
  y: mobileConfig.buttonLabels?.y || "Y"
};

const sizeProfile = mobileConfig.sizeProfile || "normal";
const showScanlineButton = mobileConfig.showScanlineButton !== false;
  

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

  const style = document.createElement("style");
  document.head.appendChild(style);

function refreshThemeStyleTag() {
  style.innerHTML = `
    @keyframes jayArcadePulse {
      0% { box-shadow: 0 0 10px ${rgba(themeColor, 0.25)}; }
      50% { box-shadow: 0 0 18px ${rgba(themeColor, 0.45)}; }
      100% { box-shadow: 0 0 10px ${rgba(themeColor, 0.25)}; }
    }
  `;
}

refreshThemeStyleTag();

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
    color: colorHex,
    fontFamily: "monospace",
    fontSize: "14px",
    opacity: "0.6",
    zIndex: "999999"
  });

  function refreshThemeVisuals() {
    versionBadge.style.color = colorHex;
    refreshThemeStyleTag();
  }

  document.body.appendChild(versionBadge);

  refreshThemeVisuals();

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

  const activeTweaks = portrait
    ? (mobileConfig.portraitOffsetTweaks || {})
    : (mobileConfig.landscapeOffsetTweaks || {});

  const sizeScale =
    sizeProfile === "compact" ? 0.90 :
    sizeProfile === "large" ? 1.10 :
    1.00;

  const padSize = clamp(shortSide * (portrait ? 0.31 : 0.27) * sizeScale, 145, 250);
  const buttonSize = clamp(shortSide * (portrait ? 0.105 : 0.115) * sizeScale, 60, 110);

  const edge = clamp(shortSide * 0.055, 16, 42);
  const faceGap = clamp(buttonSize * (portrait ? 0.70 : 0.78), 38, 82);

  const faceRightBase = portrait
    ? clamp(shortSide * 0.020, 8, 16)
    : edge;

  const faceBottomBase = portrait
    ? clamp(shortSide * 0.030, 10, 20)
    : edge;

  const padLeftBase = edge;
  const padBottomBase = edge;

  return {
    vw,
    vh,
    portrait,
    padSize,
    buttonSize,
    edge,
    faceGap,
    faceRight: faceRightBase + (activeTweaks.faceRight || 0),
    faceBottom: faceBottomBase + (activeTweaks.faceBottom || 0),
    padLeft: padLeftBase + (activeTweaks.padLeft || 0),
    padBottom: padBottomBase + (activeTweaks.padBottom || 0)
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
  const pressure = thumbVisible
    ? Math.min(1, Math.hypot(thumbX, thumbY) / thumbMaxR)
    : 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const zone = visualZones[i];
    const isActive = zone.dir === activeDirection;

    if (isActive) {
      seg.setAttribute(
        "fill",
        rgba(themeColor, 0.16 + pressure * 0.16)
      );
      seg.style.filter =
        `drop-shadow(0 0 ${8 + pressure * 10}px ${rgba(themeColor, 0.22 + pressure * 0.22)})`;
      seg.setAttribute("opacity", `${0.95 + pressure * 0.05}`);
    } else {
      seg.setAttribute("fill", rgba(themeColor, 0.045));
      seg.style.filter = "none";
      seg.setAttribute("opacity", "0.90");
    }
  }

  centerCap.style.boxShadow = activeDirection
    ? `0 0 ${16 + pressure * 12}px ${rgba(themeColor, 0.24 + pressure * 0.20)}`
    : `0 0 10px ${rgba(themeColor, 0.18)}`;

  el.style.boxShadow = thumbVisible
    ? `0 0 ${12 + pressure * 22}px ${rgba(themeColor, 0.10 + pressure * 0.20)}`
    : `0 0 0px ${rgba(themeColor, 0)}`;

  energyLayer.style.opacity = thumbVisible
    ? `${0.18 + pressure * 0.28}`
    : "0.18";

  energyLayer.style.filter = thumbVisible
    ? `drop-shadow(0 0 ${8 + pressure * 12}px ${rgba(themeColor, 0.10 + pressure * 0.18)})`
    : "none";

  if (!thumbVisible) {
    thumb.style.opacity = "0";
    thumb.style.transform = "translate(-50%, -50%)";
  } else {
    thumb.style.opacity = "1";
    const sizeScale = 0.85 + pressure * 0.35;

    thumb.style.transform =
      `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px)) scale(${sizeScale})`;

    thumb.style.boxShadow =
      `0 0 ${10 + pressure * 14}px ${rgba(themeColor, 0.22 + pressure * 0.28)}`;
    thumb.style.background =
      rgba(themeColor, 0.10 + pressure * 0.14);
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
    border: `3px solid ${rgba(themeColor, 0.88)}`,
    boxSizing: "border-box",
    overflow: "hidden",
    backdropFilter: "blur(2px)",
    animation: "jayArcadePulse 4s ease-in-out infinite",
    background: `
      radial-gradient(circle at 50% 35%, rgba(255,255,255,0.08), transparent 40%),
      radial-gradient(circle at 50% 70%, rgba(0,0,0,0.35), transparent 65%),
      radial-gradient(circle at 50% 50%, rgba(0,0,0,0.28), rgba(0,0,0,0.18))
    `
  });

    const glass = document.createElement("div");
    Object.assign(glass.style, {
      position: "absolute",
      inset: "0",
      borderRadius: "50%",
      pointerEvents: "none",
      background: "linear-gradient(135deg, rgba(255,255,255,0.05), transparent 40%)"
    });
  el.appendChild(glass);

    const energyLayer = document.createElement("div");
    Object.assign(energyLayer.style, {
      position: "absolute",
      inset: "0",
      borderRadius: "50%",
      pointerEvents: "none",
      opacity: "0.22",
      background: `
        radial-gradient(circle at 50% 50%, ${rgba(themeColor, 0.10)}, transparent 42%),
        radial-gradient(circle at 50% 50%, ${rgba(themeColor, 0.05)}, transparent 68%)
      `,
      transition: "opacity 0.04s linear, filter 0.04s linear"
    });
el.appendChild(energyLayer);

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
      seg.setAttribute("fill", rgba(themeColor, 0.05));
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
      line.setAttribute("stroke", rgba(themeColor, 0.22));
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
      border: `3px solid ${rgba(themeColor, 0.88)}`,
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
      border: `2px solid ${rgba(themeColor, 0.75)}`,
      color: rgba(themeColor, 0.75),
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
      background: rgba(themeColor, 0.16),
      border: `2px solid ${rgba(themeColor, 0.88)}`,
      boxShadow: `0 0 12px ${rgba(themeColor, 0.25)}`,
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
  { angle:   0, rotate:  90 },
  { angle:  45, rotate: 135 },
  { angle:  90, rotate: 180 },
  { angle: 135, rotate: 225 },
  { angle: 180, rotate: 270 },
  { angle: 225, rotate: 315 }
];

const arrowRadius = innerR + (outerR - innerR) * 0.58;
const arrowSize = options.size * 0.062;

for (const { angle, rotate } of arrows) {

  const p = polarToCartesian(cx, cy, arrowRadius, angle);

  const icon = document.createElement("div");

  Object.assign(icon.style,{
  position:"absolute",
  left:`${p.x}px`,
  top:`${p.y}px`,
  width:`${arrowSize}px`,
  height:`${arrowSize}px`,
  transform:`translate(-50%, -50%) rotate(${rotate}deg)`,
  transformOrigin:"50% 50%",
  pointerEvents:"none",
  display:"flex",
  alignItems:"center",
  justifyContent:"center"
});

  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");

  svg.setAttribute("viewBox","0 0 24 24");
  svg.setAttribute("preserveAspectRatio","xMidYMid meet");

  Object.assign(svg.style,{
    width:"100%",
    height:"100%",
    display:"block"
});

const path = document.createElementNS("http://www.w3.org/2000/svg","path");

path.setAttribute("d","M12 4 L20 18 H4 Z");
path.setAttribute("fill", rgba(themeColor, 0.92));

svg.appendChild(path);
  icon.appendChild(svg);
  arrowLayer.appendChild(icon);
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
  let isPressed = false;

  Object.assign(btn.style, {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: rgba(themeColor, 0.08),
    border: `3px solid ${rgba(themeColor, 0.85)}`,
    color: rgba(themeColor, 0.92),
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
    if (isPressed) return;
    isPressed = true;
    btn.style.transform = "scale(0.95)";
    btn.style.background = rgba(themeColor, 0.18);
    btn.style.boxShadow =
      `0 0 18px ${rgba(themeColor, 0.35)}, inset 0 0 10px ${rgba(themeColor, 0.18)}`;
    pressKey(keyMap[name]);
  }

  function deactivate() {
    if (!isPressed) return;
    isPressed = false;
    btn.style.transform = "scale(1)";
    btn.style.background = rgba(themeColor, 0.08);
    btn.style.boxShadow = "none";
    releaseKey(keyMap[name]);
  }

  function getFaceButtonsUnderPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);
    return elements.find(el => el?.dataset?.jayFaceButton === "true");
  }

  function switchToButton(targetBtnEl, pointerId) {
    if (!targetBtnEl || targetBtnEl === btn) return;

    deactivate();

    const handoff = targetBtnEl._jayFaceButtonApi;
    if (handoff) {
      handoff.takeOverPointer(pointerId);
    }
  }

  btn.dataset.jayFaceButton = "true";

  btn._jayFaceButtonApi = {
    takeOverPointer(pointerId) {
      activePointerId = pointerId;
      try {
        btn.setPointerCapture(pointerId);
      } catch {}
      activate();
    }
  };

  btn.addEventListener("pointerdown", async (e) => {
    await handleFirstGestureSetup();
    activePointerId = e.pointerId;
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {}
    activate();
  });

  btn.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activePointerId) return;

    const targetBtnEl = getFaceButtonsUnderPoint(e.clientX, e.clientY);
    if (targetBtnEl && targetBtnEl !== btn) {
      switchToButton(targetBtnEl, e.pointerId);
      activePointerId = null;
    }
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
    color: colorHex,
    background: "transparent",
    border: `1px solid ${rgba(themeColor, 0.7)}`,
    borderRadius: "6px",
    pointerEvents: "auto",
    touchAction: "none",
    zIndex: "999999",
    userSelect: "none"
  });

  function syncScanlineButton() {
    scanlineBtn.style.color = colorHex;
    scanlineBtn.style.borderColor = rgba(themeColor, 0.7);
    scanlineBtn.textContent = "Scanlines";
  }

  document.body.appendChild(scanlineBtn);

  scanlineBtn.addEventListener("pointerdown", async () => {
    await handleFirstGestureSetup();
    scanlineBtn.style.borderColor = colorHex;
    pressKey("2");
  });

  function end() {
    syncScanlineButton();
    releaseKey("2");
  }

  scanlineBtn.addEventListener("pointerup", end);
  scanlineBtn.addEventListener("pointercancel", end);

  syncScanlineButton();

  return {
    syncTheme: syncScanlineButton
  };
}

  function createThemeButton() {
  const themeBtn = document.createElement("div");
  themeBtn.textContent = "Change Theme";

  Object.assign(themeBtn.style, {
    position: "fixed",
    top: "36px",
    left: "6px",
    padding: "4px 8px",
    fontSize: "11px",
    fontFamily: "monospace",
    color: colorHex,
    background: "transparent",
    border: `1px solid ${rgba(themeColor, 0.7)}`,
    borderRadius: "6px",
    pointerEvents: "auto",
    touchAction: "none",
    zIndex: "999999",
    userSelect: "none"
  });

  document.body.appendChild(themeBtn);

  function syncThemeButton() {
    themeBtn.style.color = colorHex;
    themeBtn.style.borderColor = rgba(themeColor, 0.7);
    themeBtn.textContent = "Change Theme";
  }

  themeBtn.addEventListener("pointerdown", async () => {
    await handleFirstGestureSetup();

    const currentIndex = THEME_ORDER.indexOf(currentThemeName);
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
    const nextTheme = THEME_ORDER[nextIndex];

    applyThemeByName(nextTheme);
    refreshThemeVisuals();
    renderLayout();
    syncThemeButton();

    if (scanlineButtonApi) {
      scanlineButtonApi.syncTheme();
    }

    themeBtn.style.borderColor = colorHex;
  });

  function end() {
    syncThemeButton();
  }

  themeBtn.addEventListener("pointerup", end);
  themeBtn.addEventListener("pointercancel", end);

  syncThemeButton();

  return {
    syncTheme: syncThemeButton
  };
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
    left: `${m.padLeft}px`,
    bottom: `${m.padBottom}px`
  });

  const yBtn = createFaceButton({ name: "y", label: buttonLabels.y, size: m.buttonSize });
  const bBtn = createFaceButton({ name: "b", label: buttonLabels.b, size: m.buttonSize });
  const xBtn = createFaceButton({ name: "x", label: buttonLabels.x, size: m.buttonSize });
  const aBtn = createFaceButton({ name: "a", label: buttonLabels.a, size: m.buttonSize });

  const groupRight = m.faceRight;
  const baseBottom = m.faceBottom;
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
      left: `${m.padLeft}px`,
      bottom: `${m.padBottom}px`
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
      right: `${m.faceRight}px`,
      bottom: `${m.padBottom}px`
    });
  }

  function renderLayout() {
    if (layoutName === "dual-dpad") {
      renderDualDpadLayout();
    } else {
      renderDefaultLayout();
    }
  }

  scanlineButtonApi = createScanlineButton();
  themeButtonApi = createThemeButton();
  renderLayout();
  window.addEventListener("resize", renderLayout);
}
})();