/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v19
   Visual polish update

   Added:
   • arcade glow pulse
   • surface depth shading
   • thumb pressure scaling
   • glass reflection layer
   ========================================== */

(function () {

const JAY_MOBILE_VERSION = "v19";

/* ===============================
   MOBILE DETECTION
=============================== */

function isMobile() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

if (!isMobile()) return;

/* ===============================
   WAIT FOR TURBOWARP VM
=============================== */

function waitForVM(callback) {
  const interval = setInterval(() => {
    if (window.vm?.runtime?.ioDevices?.keyboard) {
      clearInterval(interval);
      callback();
    }
  }, 50);
}

waitForVM(initController);

/* ===============================
   MAIN INIT
=============================== */

function initController() {

const gameConfig = window.JAY_GAME_CONFIG || {};
const mobileConfig = gameConfig.mobile || {};
const layoutName = mobileConfig.layout || "default";

/* ===============================
   KEY MAP
=============================== */

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

/* ===============================
   KEY INPUT HELPERS
=============================== */

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

/* ===============================
   VERSION BADGE
=============================== */

const versionBadge = document.createElement("div");
versionBadge.innerText = JAY_MOBILE_VERSION;

Object.assign(versionBadge.style,{
  position:"fixed",
  top:"8px",
  right:"12px",
  color:"#00ffff",
  fontFamily:"monospace",
  fontSize:"14px",
  opacity:"0.6",
  zIndex:"999999"
});

document.body.appendChild(versionBadge);

/* ===============================
   GLOBAL CONTROLLER STYLE
=============================== */

const style = document.createElement("style");

style.innerHTML = `
@keyframes jayArcadePulse {
  0% { box-shadow:0 0 10px rgba(0,255,255,.25); }
  50% { box-shadow:0 0 18px rgba(0,255,255,.45); }
  100% { box-shadow:0 0 10px rgba(0,255,255,.25); }
}
`;

document.head.appendChild(style);

/* ===============================
   CONTROLS ROOT
=============================== */

const controls = document.createElement("div");

Object.assign(controls.style,{
  position:"fixed",
  inset:"0",
  pointerEvents:"none",
  zIndex:"999997"
});

document.body.appendChild(controls);

/* ===============================
   LAYOUT METRICS
=============================== */

function clamp(value,min,max){
  return Math.max(min,Math.min(max,value));
}

function getLayoutMetrics(){

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = vh > vw;

  const shortSide = Math.min(vw,vh);

  const padSize = clamp(shortSide * (portrait ? .31 : .27),145,250);
  const buttonSize = clamp(shortSide * (portrait ? .135 : .115),70,118);

  const edge = clamp(shortSide * .055,16,42);
  const faceGap = clamp(buttonSize * .78,42,82);

  return {vw,vh,portrait,padSize,buttonSize,edge,faceGap};
}

/* ===============================
   BASE CONTROL
=============================== */

function makeBaseControl(){

  const el = document.createElement("div");

  Object.assign(el.style,{
    position:"absolute",
    pointerEvents:"auto",
    touchAction:"none"
  });

  controls.appendChild(el);
  return el;
}

/* ===============================
   RING DPAD
=============================== */

function createRingDpad(options){

const el = makeBaseControl();

/* ===============================
   PAD BASE STYLE
=============================== */

Object.assign(el.style,{

  width:`${options.size}px`,
  height:`${options.size}px`,
  borderRadius:"50%",

  border:"3px solid rgba(0,255,255,.88)",

  animation:"jayArcadePulse 4s ease-in-out infinite",

  background:`
  radial-gradient(circle at 50% 35%, rgba(255,255,255,.08), transparent 40%),
  radial-gradient(circle at 50% 70%, rgba(0,0,0,.35), transparent 65%),
  radial-gradient(circle at 50% 50%, rgba(0,0,0,.28), rgba(0,0,0,.18))
  `,

  backdropFilter:"blur(2px)",
  boxSizing:"border-box",
  overflow:"hidden"
});

/* ===============================
   GLASS REFLECTION
=============================== */

const glass = document.createElement("div");

Object.assign(glass.style,{
  position:"absolute",
  inset:"0",
  borderRadius:"50%",
  pointerEvents:"none",
  background:"linear-gradient(135deg, rgba(255,255,255,.05), transparent 40%)"
});

el.appendChild(glass);

/* ===============================
   THUMB CURSOR
=============================== */

const thumb = document.createElement("div");

Object.assign(thumb.style,{
  position:"absolute",
  left:"50%",
  top:"50%",
  width:`${options.size * .14}px`,
  height:`${options.size * .14}px`,
  borderRadius:"50%",
  border:"2px solid rgba(0,255,255,.88)",
  background:"rgba(0,255,255,.16)",
  boxShadow:"0 0 12px rgba(0,255,255,.25)",
  transform:"translate(-50%,-50%)",
  pointerEvents:"none",
  opacity:"0"
});

el.appendChild(thumb);

/* ===============================
   INPUT
=============================== */

let activePointerId = null;

const centerX = options.size / 2;
const centerY = options.size / 2;

const outerR = options.size * .48;
const innerR = options.size * .20;

const thumbMaxR = outerR * .92;

function updateFromPoint(clientX,clientY){

const rect = el.getBoundingClientRect();

const dx = clientX - (rect.left + rect.width/2);
const dy = clientY - (rect.top + rect.height/2);

const distance = Math.hypot(dx,dy);

const clamped = Math.min(distance,thumbMaxR);

const scale = clamped / distance;

const thumbX = dx * scale;
const thumbY = dy * scale;

/* pressure scaling */

const pressure = Math.min(1,distance/thumbMaxR);
const sizeScale = .85 + pressure * .35;

thumb.style.opacity = "1";

thumb.style.transform =
`translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px)) scale(${sizeScale})`;

}

function clearThumb(){

thumb.style.opacity = "0";
thumb.style.transform = "translate(-50%,-50%)";

}

el.addEventListener("pointerdown",(e)=>{

activePointerId = e.pointerId;
el.setPointerCapture(e.pointerId);

updateFromPoint(e.clientX,e.clientY);

});

el.addEventListener("pointermove",(e)=>{

if(e.pointerId !== activePointerId) return;

updateFromPoint(e.clientX,e.clientY);

});

function endPointer(e){

if(e.pointerId !== activePointerId) return;

activePointerId = null;
clearThumb();

}

el.addEventListener("pointerup",endPointer);
el.addEventListener("pointercancel",endPointer);

return {

el,

setPosition({left,right,bottom,top}){

el.style.left = left ?? "";
el.style.right = right ?? "";
el.style.bottom = bottom ?? "";
el.style.top = top ?? "";

}

};

}

/* ===============================
   LAYOUT
=============================== */

function renderDefaultLayout(){

controls.innerHTML = "";

const m = getLayoutMetrics();

const leftPad = createRingDpad({size:m.padSize});

leftPad.setPosition({
left:`${m.edge}px`,
bottom:`${m.edge}px`
});

}

function renderLayout(){

if(layoutName === "default"){
renderDefaultLayout();
}

}

renderLayout();

window.addEventListener("resize",renderLayout);

}

})();