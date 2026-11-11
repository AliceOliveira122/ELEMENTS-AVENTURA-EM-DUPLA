
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

const overlay = document.getElementById("overlay");
const startButton = document.getElementById("start-button");

const keys = {};
let gameState = "menu";
let levelIndex = 0;
let elapsed = 0;
let collected = 0;
let particles = [];
let message = "";
let messageTime = 0;

const TILE = 40;
const GRAVITY = 0.55;

const levels = [
  {
    name: "A FLORESTA ELEMENTAL",
    gems: [
      [240, 410, "fire"],
      [400, 330, "water"],
      [530, 410, "fire"],
      [650, 330, "water"],
      [750, 410, "fire"],
      [850, 410, "water"]
    ],
    platforms: [
      [0, 490, 960, 50],
      [160, 420, 160, 20],
      [360, 350, 160, 20],
      [560, 420, 160, 20],
      [740, 350, 140, 20],
      [40, 300, 100, 20],
      [450, 250, 120, 20]
    ],
    hazards: [
      { x: 320, y: 490, w: 40, h: 50, type: "lava" },
      { x: 520, y: 490, w: 40, h: 50, type: "water" },
      { x: 720, y: 490, w: 40, h: 50, type: "toxic" }
    ],
    switches: [
      { x: 450, y: 470, w: 35, h: 20 }
    ],
    gate: { x: 475, y: 390, w: 25, h: 100 },
    fireDoor: { x: 865, y: 430, w: 40, h: 60 },
    waterDoor: { x: 915, y: 430, w: 40, h: 60 },
    fireStart: [65, 440],
    waterStart: [115, 440]
  },
  {
    name: "AS CAVERNAS SECRETAS",
    gems: [
      [180, 390, "fire"],
      [300, 290, "water"],
      [430, 390, "fire"],
      [550, 290, "water"],
      [700, 390, "fire"],
      [830, 290, "water"],
      [900, 390, "fire"]
    ],
    platforms: [
      [0, 490, 960, 50],
      [120, 420, 140, 20],
      [260, 320, 150, 20],
      [430, 420, 140, 20],
      [570, 320, 150, 20],
      [740, 420, 160, 20],
      [40, 260, 100, 20],
      [800, 230, 120, 20]
    ],
    hazards: [
      { x: 260, y: 490, w: 80, h: 50, type: "water" },
      { x: 450, y: 490, w: 80, h: 50, type: "lava" },
      { x: 640, y: 490, w: 80, h: 50, type: "toxic" }
    ],
    switches: [
      { x: 385, y: 470, w: 35, h: 20 },
      { x: 750, y: 400, w: 35, h: 20 }
    ],
    gate: { x: 470, y: 390, w: 25, h: 100 },
    fireDoor: { x: 865, y: 430, w: 40, h: 60 },
    waterDoor: { x: 915, y: 430, w: 40, h: 60 },
    fireStart: [65, 440],
    waterStart: [115, 440]
  }
];

let level;
let fire;
let water;
let gateOpen = false;
let switchActivated = [];

function createPlayer(x, y, type) {
  return {
    x, y,
    w: 25,
    h: 35,
    vx: 0,
    vy: 0,
    speed: 3.3,
    jump: 11,
    grounded: false,
    type,
    alive: true
  };
}

function loadLevel(index) {
  levelIndex = index;
  level = levels[index];

  fire = createPlayer(
    level.fireStart[0],
    level.fireStart[1],
    "fire"
  );

  water = createPlayer(
    level.waterStart[0],
    level.waterStart[1],
    "water"
  );

  level.gems = level.gems.map(g => ({
    x: g[0],
    y: g[1],
    type: g[2],
    collected: false,
    phase: Math.random() * 6
  }));

  gateOpen = false;
  switchActivated = level.switches.map(() => false);
  collected = 0;
  particles = [];

  updateHUD();
}

function startGame() {
  elapsed = 0;
  loadLevel(0);
  gameState = "playing";
  overlay.classList.add("hidden");
  startButton.textContent = "COMEÇAR NOVAMENTE";
}

// TECLADO

document.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (
    ["arrowup", "arrowdown", "arrowleft", "arrowright", " "]
      .includes(key)
  ) {
    e.preventDefault();
  }

  if (key === "r" && gameState === "playing") {
    loadLevel(levelIndex);
    showMessage("Fase reiniciada!");
  }

  if (key === "escape" && gameState === "playing") {
    gameState = "paused";
    showOverlay("PAUSADO", "A aventura está pausada.", "CONTINUAR");
  } else if (key === "escape" && gameState === "paused") {
    gameState = "playing";
    overlay.classList.add("hidden");
  }
});

document.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

// BOTÕES PARA CELULAR

document.querySelectorAll("[data-key]").forEach(button => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    keys[key] = true;
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach(event => {
    button.addEventListener(event, () => {
      keys[key] = false;
    });
  });
});

startButton.addEventListener("click", () => {
  if (gameState === "paused") {
    gameState = "playing";
    overlay.classList.add("hidden");
  } else {
    startGame();
  }
});

function showOverlay(title, text, buttonText) {
  document.getElementById("overlay-title").textContent = title;
  document.getElementById("overlay-text").textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function showMessage(text) {
  message = text;
  messageTime = 1.8;
}

// COLISÃO

function overlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function getSolids() {
  const solids = level.platforms.map(p => ({
    x: p[0], y: p[1], w: p[2], h: p[3]
  }));

  if (!gateOpen) {
    solids.push(level.gate);
  }

  return solids;
}

function movePlayer(player, direction, jump) {
  player.vx = direction * player.speed;

  if (jump && player.grounded) {
    player.vy = -player.jump;
    player.grounded = false;
    createParticles(
      player.x + player.w / 2,
      player.y + player.h,
      player.type
    );
  }

  // Movimento horizontal
  player.x += player.vx;

  for (const solid of getSolids()) {
    if (overlap(player, solid)) {
      if (player.vx > 0) {
        player.x = solid.x - player.w;
      } else if (player.vx < 0) {
        player.x = solid.x + solid.w;
      }
    }
  }

  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // Gravidade e movimento vertical
  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, 13);
  player.y += player.vy;

  player.grounded = false;

  for (const solid of getSolids()) {
    if (overlap(player, solid)) {
      if (player.vy > 0) {
        player.y = solid.y - player.h;
        player.grounded = true;
      } else if (player.vy < 0) {
        player.y = solid.y + solid.h;
      }

      player.vy = 0;
    }
  }

  // Limites do cenário
  if (player.y > H + 100) {
    resetPlayers("Você caiu no abismo!");
  }
}

// BOTÕES E PORTÕES

function updateSwitches() {
  let allPressed = true;

  level.switches.forEach((button, index) => {
    const firePressed = overlap(fire, button);
    const waterPressed = overlap(water, button);

    switchActivated[index] = firePressed || waterPressed;

    if (!switchActivated[index]) {
      allPressed = false;
    }
  });

  if (allPressed && !gateOpen) {
    gateOpen = true;
    showMessage("🔓 Passagem desbloqueada!");
    createParticles(485, 400, "water");
  }
}

// CRISTAIS

function updateGems() {
  for (const gem of level.gems) {
    if (gem.collected) continue;

    const box = {
      x: gem.x - 10,
      y: gem.y - 10,
      w: 20,
      h: 20
    };

    const player = gem.type === "fire" ? fire : water;

    if (overlap(player, box)) {
      gem.collected = true;
      collected++;

      createParticles(gem.x, gem.y, gem.type);
      showMessage("💎 Cristal coletado!");

      updateHUD();
    }
  }
}

// PERIGOS

function updateHazards() {
  const players = [fire, water];

  for (const player of players) {
    for (const hazard of level.hazards) {
      if (!overlap(player, hazard)) continue;

      if (
        hazard.type === "toxic" ||
        (hazard.type === "lava" && player.type === "water") ||
        (hazard.type === "water" && player.type === "fire")
      ) {
        resetPlayers("Um dos heróis tocou no elemento errado!");
        return;
      }
    }
  }
}

function resetPlayers(reason) {
  loadLevel(levelIndex);
  showMessage(reason);
}

// PORTAS

function checkDoors() {
  if (collected !== level.gems.length) return;

  const fireAtDoor = overlap(fire, level.fireDoor);
  const waterAtDoor = overlap(water, level.waterDoor);

  if (fireAtDoor && waterAtDoor) {
    if (levelIndex < levels.length - 1) {
      gameState = "transition";
      showOverlay(
        "FASE CONCLUÍDA! 🎉",
        "Os dois heróis conseguiram escapar! Prepare-se para o próximo desafio.",
        "PRÓXIMA FASE"
      );

      startButton.onclick = () => {
        startButton.onclick = null;
        loadLevel(levelIndex + 1);
        gameState = "playing";
        overlay.classList.add("hidden");
      };
    } else {
      gameState = "victory";
      showOverlay(
        "VOCÊ VENCEU! 🏆",
        "Parabéns! Você e seu parceiro completaram toda a aventura!",
        "JOGAR NOVAMENTE"
      );

      startButton.onclick = () => {
        startButton.onclick = null;
        startGame();
      };
    }
  }
}

// PARTÍCULAS

function createParticles(x, y, type) {
  const color = type === "fire" ? "#fb923c" : "#67e8f9";

  for (let i = 0; i < 9; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 30,
      color
    });
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }

  particles = particles.filter(p => p.life > 0);
}

// ATUALIZAÇÃO

function update(dt) {
  if (gameState !== "playing") return;

  elapsed += dt;

  movePlayer(
    fire,
    (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0),
    keys["w"]
  );

  movePlayer(
    water,
    (keys["arrowright"] ? 1 : 0) -
    (keys["arrowleft"] ? 1 : 0),
    keys["arrowup"]
  );

  updateSwitches();
  updateGems();
  updateHazards();
  updateParticles();
  checkDoors();

  if (messageTime > 0) {
    messageTime -= dt;
  }

  updateHUD();
}

// DESENHO DO CENÁRIO

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#172554");
  gradient.addColorStop(1, "#312e81");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Estrelas
  for (let i = 0; i < 65; i++) {
    const x = (i * 149) % W;
    const y = (i * 73) % 300;

    ctx.fillStyle = i % 2 ? "#ffffff" : "#a5f3fc";
    ctx.fillRect(x, y, 2, 2);
  }

  // Montanhas ao fundo
  ctx.fillStyle = "#25366a";

  for (let x = 0; x < W; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 490);
    ctx.lineTo(x + 60, 330 + (x % 3) * 15);
    ctx.lineTo(x + 120, 490);
    ctx.fill();
  }
}

function drawPlatforms() {
  for (const p of level.platforms) {
    ctx.fillStyle = "#475569";
    ctx.fillRect(p[0], p[1], p[2], p[3]);

    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(p[0], p[1], p[2], 6);

    ctx.strokeStyle = "#1e293b";
    ctx.strokeRect(p[0], p[1], p[2], p[3]);
  }

  if (!gateOpen) {
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(
      level.gate.x,
      level.gate.y,
      level.gate.w,
      level.gate.h
    );

    ctx.fillStyle = "#ddd6fe";

    for (let y = level.gate.y + 10; y < level.gate.y + level.gate.h; y += 20) {
      ctx.fillRect(level.gate.x + 5, y, 15, 5);
    }
  }
}

// DESENHO DOS PERIGOS

function drawHazards() {
  for (const hazard of level.hazards) {
    if (hazard.type === "lava") {
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);

      ctx.fillStyle = "#facc15";

      for (let x = hazard.x; x < hazard.x + hazard.w; x += 18) {
        ctx.fillRect(x, hazard.y + 8, 10, 5);
      }
    }

    if (hazard.type === "water") {
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);

      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(hazard.x, hazard.y + 5, hazard.w, 4);
    }

    if (hazard.type === "toxic") {
      ctx.fillStyle = "#65a30d";
      ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);

      ctx.fillStyle = "#bef264";
      ctx.fillRect(hazard.x + 10, hazard.y + 8, 15, 5);
    }
  }
}

// DESENHO DOS BOTÕES

function drawSwitches() {
  level.switches.forEach((button, index) => {
    ctx.fillStyle = switchActivated[index] ? "#4ade80" : "#facc15";
    ctx.fillRect(button.x, button.y, button.w, button.h);

    ctx.fillStyle = "#713f12";
    ctx.fillRect(button.x + 5, button.y + 5, button.w - 10, 5);
  });
}

// CRISTAIS

function drawGems() {
  for (const gem of level.gems) {
    if (gem.collected) continue;

    const bob = Math.sin(elapsed * 4 + gem.phase) * 5;

    ctx.save();
    ctx.translate(gem.x, gem.y + bob);
    ctx.rotate(Math.PI / 4);

    ctx.fillStyle = gem.type === "fire" ? "#fb923c" : "#67e8f9";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.fillRect(-9, -9, 18, 18);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-3, -6, 5, 5);

    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

// PORTAS

function drawDoors() {
  // Porta do Foguinho
  ctx.fillStyle = "#7c2d12";
  ctx.fillRect(
    level.fireDoor.x,
    level.fireDoor.y,
    level.fireDoor.w,
    level.fireDoor.h
  );

  ctx.fillStyle = "#fb923c";
  ctx.fillRect(
    level.fireDoor.x + 6,
    level.fireDoor.y + 8,
    28,
    45
  );

  ctx.fillStyle = "#fff7ed";
  ctx.font = "20px Arial";
  ctx.fillText("🔥", level.fireDoor.x + 9, level.fireDoor.y + 35);

  // Porta da Água
  ctx.fillStyle = "#164e63";
  ctx.fillRect(
    level.waterDoor.x,
    level.waterDoor.y,
    level.waterDoor.w,
    level.waterDoor.h
  );

  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(
    level.waterDoor.x + 6,
    level.waterDoor.y + 8,
    28,
    45
  );

  ctx.fillStyle = "#ffffff";
  ctx.fillText("💧", level.waterDoor.x + 8, level.waterDoor.y + 35);
}

// PERSONAGENS

function drawPlayer(player) {
  const x = player.x;
  const y = player.y;

  ctx.save();

  if (player.type === "fire") {
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#ea580c";
    ctx.fillRect(x, y + 8, player.w, player.h - 8);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + 4, y, 17, 15);

    ctx.fillStyle = "#fff7ed";
    ctx.fillRect(x + 7, y + 5, 4, 4);
    ctx.fillRect(x + 16, y + 5, 4, 4);

    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(x + 7, y + 20, 12, 4);
  } else {
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#0284c7";
    ctx.fillRect(x, y + 8, player.w, player.h - 8);

    ctx.fillStyle = "#67e8f9";
    ctx.beginPath();
    ctx.arc(x + 12, y + 10, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 6, y + 6, 4, 4);
    ctx.fillRect(x + 16, y + 6, 4, 4);

    ctx.fillStyle = "#164e63";
    ctx.fillRect(x + 7, y + 20, 12, 4);
  }

  ctx.restore();
}

// PARTÍCULAS

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life / 30;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 5, 5);
  }

  ctx.globalAlpha = 1;
}

// INTERFACE DO CENÁRIO

function drawGameMessage() {
  if (messageTime <= 0) return;

  ctx.fillStyle = "#0f172acc";
  ctx.fillRect(270, 18, 420, 42);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px Arial";
  ctx.textAlign = "center";
  ctx.fillText(message, W / 2, 45);
  ctx.textAlign = "left";
}

function draw() {
  drawBackground();
  drawPlatforms();
  drawHazards();
  drawSwitches();
  drawDoors();
  drawGems();
  drawParticles();
  drawPlayer(fire);
  drawPlayer(water);
  drawGameMessage();
}

// HUD

function updateHUD() {
  document.getElementById("level").textContent =
    `FASE ${levelIndex + 1}`;

  document.getElementById("gems").textContent =
    `💎 ${collected} / ${level.gems.length}`;

  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);

  document.getElementById("timer").textContent =
    `⏱ ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// LOOP

let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.04);
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

loadLevel(0);
updateHUD();
requestAnimationFrame(loop);
