const gameEl = document.getElementById('game');
const birdEl = document.getElementById('bird');
const pipesEl = document.getElementById('pipes');
const scoreEl = document.getElementById('score');
const startHintEl = document.getElementById('startHint');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

const state = {
  running: false,
  gameOver: false,
  score: 0,
  birdY: 0,
  birdVelocity: 0,
  pipes: [],
  lastTime: 0,
  pipeTimer: 0,
  difficulty: 0,
};

const cfg = {
  birdX: 72,
  gravity: 1500,
  jumpVelocity: -420,
  maxFallSpeed: 560,
  basePipeSpeed: 160,
  baseGap: 185,
  minGap: 120,
  spawnEvery: 1.4,
  groundRatio: 0.14,
};

function gameHeight() {
  return gameEl.clientHeight;
}

function gameWidth() {
  return gameEl.clientWidth;
}

function groundTop() {
  return gameHeight() * (1 - cfg.groundRatio);
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.birdY = gameHeight() * 0.4;
  state.birdVelocity = 0;
  state.pipes = [];
  state.lastTime = performance.now();
  state.pipeTimer = 0;
  state.difficulty = 0;

  pipesEl.innerHTML = '';
  scoreEl.textContent = '0';
  startHintEl.classList.remove('hidden');
  gameOverEl.classList.add('hidden');

  drawBird();
}

function startGame() {
  if (state.gameOver) {
    return;
  }

  if (!state.running) {
    state.running = true;
    startHintEl.classList.add('hidden');
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  flap();
}

function flap() {
  if (state.gameOver) {
    return;
  }
  state.birdVelocity = cfg.jumpVelocity;
}

function addPipe() {
  const w = gameWidth();
  const h = gameHeight();
  const safeTop = 56;
  const safeBottom = h - (h * cfg.groundRatio) - 56;

  const progress = Math.min(state.difficulty, 35);
  const gap = Math.max(cfg.minGap, cfg.baseGap - progress * 1.5);
  const openingY = safeTop + Math.random() * Math.max(10, (safeBottom - safeTop - gap));

  const pipePair = {
    x: w + 64,
    width: 60,
    topHeight: openingY,
    bottomY: openingY + gap,
    passed: false,
  };

  state.pipes.push(pipePair);

  const topEl = document.createElement('div');
  topEl.className = 'pipe top';
  const bottomEl = document.createElement('div');
  bottomEl.className = 'pipe bottom';
  pipesEl.append(topEl, bottomEl);
  pipePair.topEl = topEl;
  pipePair.bottomEl = bottomEl;
  renderPipe(pipePair);
}

function renderPipe(pipe) {
  const h = gameHeight();
  pipe.topEl.style.left = `${pipe.x}px`;
  pipe.topEl.style.top = '0px';
  pipe.topEl.style.height = `${pipe.topHeight}px`;

  pipe.bottomEl.style.left = `${pipe.x}px`;
  pipe.bottomEl.style.top = `${pipe.bottomY}px`;
  pipe.bottomEl.style.height = `${Math.max(0, h - pipe.bottomY - h * cfg.groundRatio)}px`;
}

function updateBird(dt) {
  state.birdVelocity += cfg.gravity * dt;
  if (state.birdVelocity > cfg.maxFallSpeed) {
    state.birdVelocity = cfg.maxFallSpeed;
  }
  state.birdY += state.birdVelocity * dt;

  const ceiling = 0;
  const floor = groundTop() - birdEl.offsetHeight;

  if (state.birdY < ceiling) {
    state.birdY = ceiling;
    state.birdVelocity = 80;
  }

  if (state.birdY >= floor) {
    state.birdY = floor;
    endGame();
  }

  drawBird();
}

function drawBird() {
  const tilt = Math.max(-30, Math.min(70, state.birdVelocity * 0.1));
  birdEl.style.left = `${cfg.birdX}px`;
  birdEl.style.top = `${state.birdY}px`;
  birdEl.style.transform = `rotate(${tilt}deg)`;
}

function intersects(pipe) {
  const bx = cfg.birdX;
  const bw = birdEl.offsetWidth;
  const by = state.birdY;
  const bh = birdEl.offsetHeight;

  const inX = bx + bw > pipe.x && bx < pipe.x + pipe.width;
  const hitsTop = by < pipe.topHeight;
  const hitsBottom = by + bh > pipe.bottomY;

  return inX && (hitsTop || hitsBottom);
}

function updatePipes(dt) {
  state.difficulty += dt * 2.2;
  const pipeSpeed = cfg.basePipeSpeed + state.difficulty * 4;

  state.pipeTimer += dt;
  const spawnRate = Math.max(0.82, cfg.spawnEvery - state.difficulty * 0.01);
  if (state.pipeTimer >= spawnRate) {
    state.pipeTimer = 0;
    addPipe();
  }

  for (const pipe of state.pipes) {
    pipe.x -= pipeSpeed * dt;
    renderPipe(pipe);

    if (!pipe.passed && pipe.x + pipe.width < cfg.birdX) {
      pipe.passed = true;
      state.score += 1;
      scoreEl.textContent = String(state.score);
    }

    if (intersects(pipe)) {
      endGame();
    }
  }

  state.pipes = state.pipes.filter((pipe) => {
    const alive = pipe.x + pipe.width > -8;
    if (!alive) {
      pipe.topEl.remove();
      pipe.bottomEl.remove();
    }
    return alive;
  });
}

function endGame() {
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

  updateBird(dt);
  updatePipes(dt);

  if (state.running && !state.gameOver) {
    requestAnimationFrame(loop);
  }
}

function bindControls() {
  const tapHandler = (event) => {
    event.preventDefault();
    startGame();
  };

  gameEl.addEventListener('pointerdown', tapHandler, { passive: false });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      startGame();
    }
  });

  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  window.addEventListener('resize', () => {
    state.birdY = Math.min(state.birdY, groundTop() - birdEl.offsetHeight);
    drawBird();
    for (const pipe of state.pipes) {
      renderPipe(pipe);
    }
  });
}

bindControls();
resetGame();
