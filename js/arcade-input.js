(function () {
  if (window.ArcadeInput) return;

  const listeners = [];

  function emit(action, source) {
    listeners.forEach(fn => fn(action, source));
  }

  function onAction(fn) {
    listeners.push(fn);
  }

  window.addEventListener("keydown", e => {
    if (e.repeat) return;

    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") emit("left", "keyboard");
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") emit("right", "keyboard");
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") emit("up", "keyboard");
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") emit("down", "keyboard");

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      emit("select", "keyboard");
    }
  });

  let lastDir = null;
  let lastMove = 0;
  const delay = 180;
  let lastSelect = false;

  function getPad() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    return pads.find(p => p && p.connected) || null;
  }

  function poll() {
    const pad = getPad();

    if (pad) {
      const now = performance.now();

      const x = pad.axes[0] || 0;
      const y = pad.axes[1] || 0;

      const left  = pad.buttons[14]?.pressed || x < -0.5;
      const right = pad.buttons[15]?.pressed || x > 0.5;
      const up    = pad.buttons[12]?.pressed || y < -0.5;
      const down  = pad.buttons[13]?.pressed || y > 0.5;

      let dir = null;

      if (left) dir = "left";
      else if (right) dir = "right";
      else if (up) dir = "up";
      else if (down) dir = "down";

      if (!dir) {
        lastDir = null;
      } else if (dir !== lastDir || now - lastMove > delay) {
        emit(dir, "gamepad");
        lastDir = dir;
        lastMove = now;
      }

      const select = !!pad.buttons[0]?.pressed;

      if (select && !lastSelect) {
        emit("select", "gamepad");
      }

      lastSelect = select;
    } else {
      lastDir = null;
      lastSelect = false;
    }

    requestAnimationFrame(poll);
  }

  poll();

  window.ArcadeInput = { onAction };
})();