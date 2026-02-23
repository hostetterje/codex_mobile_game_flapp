const gameEl = document.getElementById('game');
const mugEl = document.getElementById('mug');
const obstaclesEl = document.getElementById('obstacles');
const scoreEl = document.getElementById('score');
const startHintEl = document.getElementById('startHint');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

const state = {
  running: false,
  gameOver: false,
  score: 0,
  mugY: 0,
  mugVelocity: 0,
  bars: [],
  lastTime: 0,
  obstacleTimer: 0,
  difficulty: 0,
};

const cfg = {
  mugX: 74,
  gravity: 1520,
  liftVelocity: -430,
  maxFallSpeed: 580,
  baseSpeed: 158,
  baseGap: 188,
  minGap: 116,
  spawnEvery: 1.38,
  floorRatio: 0.14,
};

function gameHeight() {
  return gameEl.clientHeight;
}

function gameWidth() {
  return gameEl.clientWidth;
}

function floorTop() {
  return gameHeight() * (1 - cfg.floorRatio);
}

function drawMug() {
  const tilt = Math.max(-30, Math.min(72, state.mugVelocity * 0.1));
  mugEl.style.left = `${cfg.mugX}px`;
  mugEl.style.top = `${state.mugY}px`;
  mugEl.style.transform = `rotate(${tilt}deg)`;
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.mugY = gameHeight() * 0.4;
  state.mugVelocity = 0;
  state.bars = [];
  state.lastTime = performance.now();
  state.obstacleTimer = 0;
  state.difficulty = 0;

  obstaclesEl.innerHTML = '';
  scoreEl.textContent = '0';
  startHintEl.classList.remove('hidden');
  gameOverEl.classList.add('hidden');

  drawMug();
}

function startRound() {
  if (state.gameOver) {
    return;
  }

  if (!state.running) {
    state.running = true;
    startHintEl.classList.add('hidden');
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  jumpMug();
}

function jumpMug() {
  if (state.gameOver) {
    return;
  }
  state.mugVelocity = cfg.liftVelocity;
}

function spawnBarTops() {
  const w = gameWidth();
  const h = gameHeight();
  const safeTop = 56;
  const safeBottom = h - h * cfg.floorRatio - 56;

  const progress = Math.min(state.difficulty, 36);
  const gap = Math.max(cfg.minGap, cfg.baseGap - progress * 1.6);
  const openingY = safeTop + Math.random() * Math.max(8, safeBottom - safeTop - gap);

  const barSet = {
    x: w + 68,
    width: 66,
    topHeight: openingY,
    bottomY: openingY + gap,
    passed: false,
  };

  state.bars.push(barSet);

  const topEl = document.createElement('div');
  topEl.className = 'bar top';
  const bottomEl = document.createElement('div');
  bottomEl.className = 'bar bottom';

  obstaclesEl.append(topEl, bottomEl);
  barSet.topEl = topEl;
  barSet.bottomEl = bottomEl;
  renderBarSet(barSet);
}

function renderBarSet(barSet) {
  const h = gameHeight();

  barSet.topEl.style.left = `${barSet.x}px`;
  barSet.topEl.style.top = '0px';
  barSet.topEl.style.height = `${barSet.topHeight}px`;

  barSet.bottomEl.style.left = `${barSet.x}px`;
  barSet.bottomEl.style.top = `${barSet.bottomY}px`;
  barSet.bottomEl.style.height = `${Math.max(0, h - barSet.bottomY - h * cfg.floorRatio)}px`;
}

function spillsOn(barSet) {
  const mx = cfg.mugX;
  const my = state.mugY;
  const mw = mugEl.offsetWidth;
  const mh = mugEl.offsetHeight;

  const inX = mx + mw > barSet.x && mx < barSet.x + barSet.width;
  const hitsTop = my < barSet.topHeight;
  const hitsBottom = my + mh > barSet.bottomY;

  return inX && (hitsTop || hitsBottom);
}

function updateMug(dt) {
  state.mugVelocity += cfg.gravity * dt;
  if (state.mugVelocity > cfg.maxFallSpeed) {
    state.mugVelocity = cfg.maxFallSpeed;
  }

  state.mugY += state.mugVelocity * dt;

  const ceiling = 0;
  const floor = floorTop() - mugEl.offsetHeight;

  if (state.mugY < ceiling) {
    state.mugY = ceiling;
    state.mugVelocity = 90;
  }

  if (state.mugY >= floor) {
    state.mugY = floor;
    spillGame();
  }

  drawMug();
}

function updateBars(dt) {
  state.difficulty += dt * 2.2;
  const barSpeed = cfg.baseSpeed + state.difficulty * 4.2;

  state.obstacleTimer += dt;
  const spawnRate = Math.max(0.8, cfg.spawnEvery - state.difficulty * 0.01);

  if (state.obstacleTimer >= spawnRate) {
    state.obstacleTimer = 0;
    spawnBarTops();
  }

  for (const barSet of state.bars) {
    barSet.x -= barSpeed * dt;
    renderBarSet(barSet);

    if (!barSet.passed && barSet.x + barSet.width < cfg.mugX) {
      barSet.passed = true;
      state.score += 1;
      scoreEl.textContent = String(state.score);
    }

    if (spillsOn(barSet)) {
      spillGame();
    }
  }

  state.bars = state.bars.filter((barSet) => {
    const keep = barSet.x + barSet.width > -8;
    if (!keep) {
      barSet.topEl.remove();
      barSet.bottomEl.remove();
    }
    return keep;
  });
}

function spillGame() {
  if (state.gameOver) {
    return;
  }

  state.gameOver = true;
  state.running = false;
  finalScoreEl.textContent = String(state.score);
  gameOverEl.classList.remove('hidden');
}

function loop(time) {
  if (!state.running || state.gameOver) {
    return;
  }

  const dt = Math.min(0.032, (time - state.lastTime) / 1000);
  state.lastTime = time;

  updateMug(dt);
  updateBars(dt);

  if (state.running && !state.gameOver) {
    requestAnimationFrame(loop);
  }
}

function bindControls() {
  const tapHandler = (event) => {
    event.preventDefault();
    startRound();
  };

  gameEl.addEventListener('pointerdown', tapHandler, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      startRound();
    }
  });

  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  window.addEventListener('resize', () => {
    state.mugY = Math.min(state.mugY, floorTop() - mugEl.offsetHeight);
    drawMug();
    for (const barSet of state.bars) {
      renderBarSet(barSet);
    }
  });
}

bindControls();
resetGame();
