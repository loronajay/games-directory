/* ==========================================
   JAY ARCADE MOBILE CONTROLLER v18
   - VM postData injection
   - True 8-direction ring D-pad
   - Compass arrows w/ glow sync
   - Outer travel boundary
   - Working mirrored face buttons
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

/* =============================
   VERSION BADGE
   ============================= */

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

/* =============================
   START OVERLAY
   ============================= */

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

/* =============================
   CONTROLS LAYER
   ============================= */

const controls = document.createElement("div");
Object.assign(controls.style,{
  position:"fixed",
  inset:"0",
  display:"none",
  zIndex:"999997",
  pointerEvents:"none",
  userSelect:"none",
  webkitUserSelect:"none",
  webkitTouchCallout:"none"
});
document.body.appendChild(controls);

document.body.style.userSelect="none";
document.body.style.webkitTapHighlightColor="transparent";

/* =============================
   KEY MAP
   ============================= */

let keyMap = {
  left:"a",
  right:"d",
  up:"w",
  down:"s",
  a:"c",
  b:"v",
  x:"b",
  y:"f"
};

if (window.JAY_GAME_CONFIG?.keyOverrides) {
  keyMap = { ...keyMap, ...window.JAY_GAME_CONFIG.keyOverrides };
}

const keyboard = window.vm.runtime.ioDevices.keyboard;

function pressKey(key){ keyboard.postData({key,isDown:true}); }
function releaseKey(key){ keyboard.postData({key,isDown:false}); }

/* =============================
   D-PAD CORE (RING)
   ============================= */

let currentDirections = new Set();

const DPAD_SIZE = 160;
const DEAD_ZONE = 20;
const OUTER_RADIUS = DPAD_SIZE/2 - 20;

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
  pointerEvents:"auto"
});

controls.appendChild(dpad);

/* OUTER LIMIT RING */

const outerRing = document.createElement("div");
Object.assign(outerRing.style,{
  position:"absolute",
  left:"50%",
  top:"50%",
  width:(OUTER_RADIUS*2)+"px",
  height:(OUTER_RADIUS*2)+"px",
  borderRadius:"50%",
  border:"1px solid rgba(0,255,255,0.4)",
  transform:"translate(-50%,-50%)",
  pointerEvents:"none"
});
dpad.appendChild(outerRing);

/* INNER DEAD ZONE */

const innerCircle = document.createElement("div");
Object.assign(innerCircle.style,{
  position:"absolute",
  left:"50%",
  top:"50%",
  width:(DEAD_ZONE*2)+"px",
  height:(DEAD_ZONE*2)+"px",
  borderRadius:"50%",
  border:"1px solid rgba(0,255,255,0.4)",
  transform:"translate(-50%,-50%)",
  pointerEvents:"none"
});
dpad.appendChild(innerCircle);

/* RING WEDGES */

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

for(let i=0;i<8;i++){

  const start=(i*45-22.5)*Math.PI/180;
  const end  =(i*45+22.5)*Math.PI/180;

  const outerScale=(OUTER_RADIUS/(DPAD_SIZE/2))*50;
  const innerScale=(DEAD_ZONE/(DPAD_SIZE/2))*50;

  const x1o=50+outerScale*Math.cos(start);
  const y1o=50+outerScale*Math.sin(start);
  const x2o=50+outerScale*Math.cos(end);
  const y2o=50+outerScale*Math.sin(end);

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
    transition:"background 0.05s ease"
  });

  wedgeLayer.appendChild(wedge);
  wedges.push(wedge);
}

/* DIVIDER LINES */

for(let i=0;i<8;i++){
  const line=document.createElement("div");
  Object.assign(line.style,{
    position:"absolute",
    left:"50%",
    top:"50%",
    width:(OUTER_RADIUS-DEAD_ZONE)+"px",
    height:"1px",
    background:"rgba(0,255,255,0.5)",
    transformOrigin:"0 50%",
    transform:`rotate(${i*45}deg) translate(${DEAD_ZONE}px,-50%)`,
    pointerEvents:"none"
  });
  dpad.appendChild(line);
}

/* ARROWS */

const arrowLayer=document.createElement("div");
Object.assign(arrowLayer.style,{
  position:"absolute",
  inset:"0",
  pointerEvents:"none"
});
dpad.appendChild(arrowLayer);

const arrowPositions=[
  ["→","85%","50%"],
  ["↘","80%","80%"],
  ["↓","50%","85%"],
  ["↙","20%","80%"],
  ["←","15%","50%"],
  ["↖","20%","20%"],
  ["↑","50%","15%"],
  ["↗","80%","20%"]
];

const arrows=[];

arrowPositions.forEach(([symbol,left,top])=>{
  const arrow=document.createElement("div");
  arrow.innerText=symbol;
  Object.assign(arrow.style,{
    position:"absolute",
    left,
    top,
    transform:"translate(-50%,-50%)",
    fontSize:"20px",
    fontFamily:"monospace",
    color:"rgba(0,255,255,0.85)",
    transition:"all 0.05s ease"
  });
  arrowLayer.appendChild(arrow);
  arrows.push(arrow);
});

/* THUMB */

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
  transition:"none"
});
dpad.appendChild(thumb);

/* HIGHLIGHT */

function highlight(index){
  wedges.forEach((w,i)=>{
    w.style.background=
      i===index?"rgba(0,255,255,0.18)":"transparent";
  });
  arrows.forEach((a,i)=>{
    a.style.textShadow=
      i===index?"0 0 10px #00ffff":"none";
  });
}

/* INPUT */

function updateDpadDirection(x,y){

  const rect=dpad.getBoundingClientRect();
  const cx=rect.left+rect.width/2;
  const cy=rect.top+rect.height/2;

  const dx=x-cx;
  const dy=y-cy;
  const distance=Math.sqrt(dx*dx+dy*dy);

  let lx=dx;
  let ly=dy;

  if(distance>OUTER_RADIUS){
    const angle=Math.atan2(dy,dx);
    lx=Math.cos(angle)*OUTER_RADIUS;
    ly=Math.sin(angle)*OUTER_RADIUS;
  }

  thumb.style.transform=
    `translate(calc(-50% + ${lx}px), calc(-50% + ${ly}px))`;

  if(distance<DEAD_ZONE){
    clearDirections();
    return;
  }

  let angle=Math.atan2(dy,dx);
  angle=(angle*180/Math.PI+360)%360;

  const wedgeIndex=Math.floor((angle+22.5)/45)%8;

  const directions=[
    ["right"],
    ["down","right"],
    ["down"],
    ["down","left"],
    ["left"],
    ["up","left"],
    ["up"],
    ["up","right"]
  ];

  applyDirections(new Set(directions[wedgeIndex]));
  highlight(wedgeIndex);
}

function applyDirections(newDirs){
  for(const dir of currentDirections)
    if(!newDirs.has(dir))
      releaseKey(keyMap[dir]);

  for(const dir of newDirs)
    if(!currentDirections.has(dir))
      pressKey(keyMap[dir]);

  currentDirections=newDirs;
}

function clearDirections(){
  for(const dir of currentDirections)
    releaseKey(keyMap[dir]);

  currentDirections.clear();
  highlight(null);
  thumb.style.transform="translate(-50%,-50%)";
}

dpad.addEventListener("pointerdown",e=>{
  dpad.setPointerCapture(e.pointerId);
  updateDpadDirection(e.clientX,e.clientY);
});
dpad.addEventListener("pointermove",e=>{
  updateDpadDirection(e.clientX,e.clientY);
});
dpad.addEventListener("pointerup",clearDirections);
dpad.addEventListener("pointercancel",clearDirections);

/* =============================
   FACE BUTTONS (WORKING)
   ============================= */

function createButton(name,label,bottom,right){

  const btn=document.createElement("div");
  btn.innerText=label;

  Object.assign(btn.style,{
    position:"absolute",
    bottom,
    right,
    width:"70px",
    height:"70px",
    borderRadius:"50%",
    border:"2px solid rgba(0,255,255,0.8)",
    color:"rgba(0,255,255,0.9)",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    fontSize:"22px",
    fontWeight:"bold",
    pointerEvents:"auto",
    touchAction:"none"
  });

  btn.addEventListener("pointerdown",e=>{
    btn.setPointerCapture(e.pointerId);
    pressKey(keyMap[name]);
    btn.style.background="rgba(0,255,255,0.2)";
  });

  btn.addEventListener("pointerup",()=>{
    releaseKey(keyMap[name]);
    btn.style.background="transparent";
  });

  btn.addEventListener("pointercancel",()=>{
    releaseKey(keyMap[name]);
    btn.style.background="transparent";
  });

  controls.appendChild(btn);
}

createButton("y","Y","160px","100px");
createButton("b","B","100px","140px");
createButton("x","X","100px","60px");
createButton("a","A","40px","100px");

/* =============================
   START
   ============================= */

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