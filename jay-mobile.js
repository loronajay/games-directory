/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v18
   - True radial ring wedges
   - Thin divider lines
   - Arrow glow synced to wedge
   - Edge-based thumb limit
   - Face buttons restored
   ========================================== */

(function () {

const JAY_MOBILE_VERSION = "v18";

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

/* ============================= */
/* VERSION BADGE */
/* ============================= */

const badge = document.createElement("div");
badge.innerText = JAY_MOBILE_VERSION;
Object.assign(badge.style,{
  position:"fixed",
  top:"8px",
  right:"12px",
  color:"#00ffff",
  fontFamily:"monospace",
  fontSize:"14px",
  opacity:"0.6",
  zIndex:"999999"
});
document.body.appendChild(badge);

/* ============================= */
/* START OVERLAY */
/* ============================= */

const startOverlay = document.createElement("div");
Object.assign(startOverlay.style,{
  position:"fixed",
  inset:"0",
  background:"black",
  color:"#00ffff",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  flexDirection:"column",
  fontFamily:"monospace",
  zIndex:"999998"
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

/* ============================= */
/* CONTROLS LAYER */
/* ============================= */

const controls = document.createElement("div");
Object.assign(controls.style,{
  position:"fixed",
  inset:"0",
  display:"none",
  zIndex:"999997",
  pointerEvents:"none",
  userSelect:"none"
});
document.body.appendChild(controls);

document.body.style.userSelect = "none";
document.body.style.webkitTapHighlightColor = "transparent";

/* ============================= */
/* KEY MAP */
/* ============================= */

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

const keyboard = window.vm.runtime.ioDevices.keyboard;

function pressKey(key){ keyboard.postData({key,isDown:true}); }
function releaseKey(key){ keyboard.postData({key,isDown:false}); }

/* ============================= */
/* DPAD SETUP */
/* ============================= */

const DPAD_SIZE = 160;
const DEAD_ZONE = 20;
const OUTER_RADIUS = DPAD_SIZE/2 - 2;
const INNER_RADIUS = DEAD_ZONE;

let currentDirections = new Set();

const dpad = document.createElement("div");
Object.assign(dpad.style,{
  position:"absolute",
  bottom:"40px",
  left:"40px",
  width:DPAD_SIZE+"px",
  height:DPAD_SIZE+"px",
  borderRadius:"50%",
  border:"2px solid rgba(0,255,255,0.7)",
  touchAction:"none",
  pointerEvents:"auto",
  background:"transparent"
});
controls.appendChild(dpad);

/* ============================= */
/* WEDGE LAYER */
/* ============================= */

const wedgeLayer = document.createElement("div");
Object.assign(wedgeLayer.style,{
  position:"absolute",
  inset:"0",
  borderRadius:"50%",
  overflow:"hidden",
  pointerEvents:"none"
});
dpad.appendChild(wedgeLayer);

const wedges = [];
const arrows = [];

for(let i=0;i<8;i++){

  const start=(i*45-22.5)*Math.PI/180;
  const end=(i*45+22.5)*Math.PI/180;

  const scale=OUTER_RADIUS/(DPAD_SIZE/2)*50;
  const innerScale=INNER_RADIUS/(DPAD_SIZE/2)*50;

  const x1o=50+scale*Math.cos(start);
  const y1o=50+scale*Math.sin(start);
  const x2o=50+scale*Math.cos(end);
  const y2o=50+scale*Math.sin(end);

  const x1i=50+innerScale*Math.cos(start);
  const y1i=50+innerScale*Math.sin(start);
  const x2i=50+innerScale*Math.cos(end);
  const y2i=50+innerScale*Math.sin(end);

  const wedge=document.createElement("div");

  Object.assign(wedge.style,{
    position:"absolute",
    inset:"0",
    background:"transparent",
    clipPath:`polygon(
      ${x1o}% ${y1o}%,
      ${x2o}% ${y2o}%,
      ${x2i}% ${y2i}%,
      ${x1i}% ${y1i}%
    )`,
    transition:"background 0.08s ease"
  });

  wedgeLayer.appendChild(wedge);
  wedges.push(wedge);
}

/* ============================= */
/* DIVIDER LINES */
/* ============================= */

for(let i=0;i<8;i++){
  const line=document.createElement("div");
  Object.assign(line.style,{
    position:"absolute",
    left:"50%",
    top:"50%",
    width:(OUTER_RADIUS-INNER_RADIUS)+"px",
    height:"1px",
    background:"rgba(0,255,255,0.5)",
    transformOrigin:"0 50%",
    transform:`rotate(${i*45}deg) translate(${INNER_RADIUS}px,-50%)`,
    pointerEvents:"none"
  });
  dpad.appendChild(line);
}

/* ============================= */
/* ARROWS */
/* ============================= */

const arrowLayer=document.createElement("div");
Object.assign(arrowLayer.style,{
  position:"absolute",
  inset:"0",
  pointerEvents:"none"
});
dpad.appendChild(arrowLayer);

const arrowSymbols=["→","↘","↓","↙","←","↖","↑","↗"];

for(let i=0;i<8;i++){
  const arrow=document.createElement("div");
  arrow.innerText=arrowSymbols[i];
  Object.assign(arrow.style,{
    position:"absolute",
    left:"50%",
    top:"50%",
    transform:`rotate(${i*45}deg) translate(0,-60px) rotate(${-i*45}deg)`,
    transformOrigin:"50% 60px",
    fontFamily:"monospace",
    fontSize:"18px",
    color:"rgba(0,255,255,0.85)",
    transition:"all 0.08s ease"
  });
  arrowLayer.appendChild(arrow);
  arrows.push(arrow);
}

/* ============================= */
/* THUMB */
/* ============================= */

const thumb=document.createElement("div");
Object.assign(thumb.style,{
  position:"absolute",
  width:"40px",
  height:"40px",
  borderRadius:"50%",
  border:"2px solid rgba(0,255,255,0.9)",
  boxShadow:"0 0 15px rgba(0,255,255,0.8)",
  left:"50%",
  top:"50%",
  transform:"translate(-50%,-50%)",
  pointerEvents:"none",
  transition:"transform 0.15s ease-out"
});
dpad.appendChild(thumb);

/* ============================= */
/* HIGHLIGHT */
/* ============================= */

function highlight(index){
  wedges.forEach((w,i)=>{
    w.style.background=i===index?"rgba(0,255,255,0.18)":"transparent";
  });
  arrows.forEach((a,i)=>{
    a.style.textShadow=i===index?"0 0 10px #00ffff":"none";
  });
}

/* ============================= */
/* DPAD INPUT */
/* ============================= */

function updateDpad(x,y){

  const rect=dpad.getBoundingClientRect();
  const cx=rect.left+rect.width/2;
  const cy=rect.top+rect.height/2;

  const dx=x-cx;
  const dy=y-cy;
  const dist=Math.sqrt(dx*dx+dy*dy);

  const maxTravel=OUTER_RADIUS-20;

  let lx=dx,ly=dy;

  if(dist>maxTravel){
    const ang=Math.atan2(dy,dx);
    lx=Math.cos(ang)*maxTravel;
    ly=Math.sin(ang)*maxTravel;
  }

  thumb.style.transform=
    `translate(calc(-50% + ${lx}px), calc(-50% + ${ly}px))`;

  if(dist<DEAD_ZONE){
    clearDirs();
    highlight(null);
    return;
  }

  let ang=Math.atan2(dy,dx);
  ang=(ang*180/Math.PI+360)%360;
  const index=Math.floor((ang+22.5)/45)%8;

  const dirs=[
    ["right"],["down","right"],["down"],["down","left"],
    ["left"],["up","left"],["up"],["up","right"]
  ];

  applyDirs(new Set(dirs[index]));
  highlight(index);
}

function applyDirs(newDirs){
  for(const d of currentDirections)
    if(!newDirs.has(d)) releaseKey(keyMap[d]);

  for(const d of newDirs)
    if(!currentDirections.has(d)) pressKey(keyMap[d]);

  currentDirections=newDirs;
}

function clearDirs(){
  for(const d of currentDirections)
    releaseKey(keyMap[d]);
  currentDirections.clear();
  thumb.style.transform="translate(-50%,-50%)";
}

dpad.addEventListener("pointerdown",e=>{
  dpad.setPointerCapture(e.pointerId);
  updateDpad(e.clientX,e.clientY);
});
dpad.addEventListener("pointermove",e=>{
  updateDpad(e.clientX,e.clientY);
});
dpad.addEventListener("pointerup",clearDirs);
dpad.addEventListener("pointercancel",clearDirs);

/* ============================= */
/* FACE BUTTONS */
/* ============================= */

function createButton(name,label,bottom,right){
  const btn=document.createElement("div");
  btn.dataset.name=name;
  btn.innerText=label;

  Object.assign(btn.style,{
    position:"absolute",
    bottom:bottom,
    right:right,
    width:"74px",
    height:"74px",
    borderRadius:"50%",
    border:"2px solid rgba(0,255,255,0.8)",
    color:"rgba(0,255,255,0.9)",
    background:"transparent",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    fontWeight:"bold",
    fontSize:"22px",
    pointerEvents:"auto",
    touchAction:"none",
    transition:"all 0.05s ease"
  });

  controls.appendChild(btn);
  return btn;
}

createButton("y","Y","160px","100px");
createButton("b","B","100px","140px");
createButton("x","X","100px","60px");
createButton("a","A","40px","100px");

/* ============================= */
/* START */
/* ============================= */

startOverlay.addEventListener("click",async()=>{
  if(document.documentElement.requestFullscreen)
    document.documentElement.requestFullscreen();

  if(screen.orientation?.lock){
    try{await screen.orientation.lock("landscape");}catch{}
  }

  startOverlay.remove();
  controls.style.display="block";
},{once:true});

}

})();