// game.js — DARKWOOD V5
// Base: V4 preservada + NPC Ancião + diálogo + missão + escolha/consequência

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = innerWidth;
let H = innerHeight;

function resize() {
  W = innerWidth;
  H = innerHeight;
  canvas.width = W;
  canvas.height = H;
}

addEventListener("resize", resize);
resize();

const WORLD = {
  width: 3600,
  height: 2700
};

const player = {
  x: 1800,
  y: 1350,
  radius: 15,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  speed: 170,
  dirX: 1,
  dirY: 0,
  attackCooldown: 0,
  attackTimer: 0,
  dodgeCooldown: 0,
  dodgeTimer: 0,
  invulnerable: 0,
  hurtTimer: 0
};

const shelter = {
  x: 1800,
  y: 1350,
  width: 260,
  height: 190
};

const campfire = {
  x: 1800,
  y: 1490,
  radius: 32
};

/* =========================
   NOVOS ELEMENTOS V5
========================= */

const elder = {
  x: shelter.x + 115,
  y: shelter.y - 105,
  radius: 18,
  active: true,
  talking: false
};

let dialogue = {
  active: false,
  speaker: "",
  text: "",
  fullText: "",
  index: 0,
  timer: 0,
  choice: false,
  choices: [],
  choiceIndex: 0
};

let consequence = "none";

/* =========================
   ESTADO ORIGINAL V4
========================= */

let gameTime = 0;
let worldTime = 0;
let day = 1;

const resources = {
  wood: 0,
  stone: 0,
  mushroom: 0,
  strange: 0
};

let inventoryOpen = false;

const craftedItems = {
  campfire: 0,
  axe: 0,
  sword: 0,
  potion: 0
};

let questStage = 0;
let messageTimer = 0;
let messageText = "";

const camera = {
  x: player.x,
  y: player.y,
  shake: 0,
  zoom: 1
};

const trees = [];
const rocks = [];
const mushrooms = [];
const woods = [];
const stones = [];
const enemies = [];
const particles = [];

/* =========================
   UTILIDADES
========================= */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function message(text, time = 2.5) {
  messageText = text;
  messageTimer = time;
}

/* =========================
   GERAÇÃO DO MUNDO
========================= */

function generateWorld() {
  trees.length = 0;
  rocks.length = 0;
  mushrooms.length = 0;
  woods.length = 0;
  stones.length = 0;
  enemies.length = 0;

  for (let i = 0; i < 220; i++) {
    trees.push({
      x: rand(100, WORLD.width - 100),
      y: rand(100, WORLD.height - 100),
      r: rand(20, 34)
    });
  }

  for (let i = 0; i < 90; i++) {
    rocks.push({
      x: rand(80, WORLD.width - 80),
      y: rand(80, WORLD.height - 80),
      r: rand(10, 22)
    });
  }

  for (let i = 0; i < 40; i++) {
    mushrooms.push({
      x: rand(80, WORLD.width - 80),
      y: rand(80, WORLD.height - 80),
      collected: false,
      strange: i === 0
    });
  }

  for (let i = 0; i < 50; i++) {
    woods.push({
      x: rand(80, WORLD.width - 80),
      y: rand(80, WORLD.height - 80),
      collected: false
    });
  }

  for (let i = 0; i < 50; i++) {
    stones.push({
      x: rand(80, WORLD.width - 80),
      y: rand(80, WORLD.height - 80),
      collected: false
    });
  }

  for (let i = 0; i < 9; i++) {
    enemies.push({
      x: rand(300, WORLD.width - 300),
      y: rand(300, WORLD.height - 300),
      radius: 17,
      hp: 60,
      maxHp: 60,
      speed: rand(40, 65),
      attackCooldown: rand(0.5, 2),
      hitTimer: 0,
      dead: false,
      wanderTimer: rand(0, 3),
      dirX: 0,
      dirY: 0
    });
  }
}

generateWorld();

/* =========================
   INPUT
========================= */

const keys = {};

addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === " ") {
    e.preventDefault();
    attack();
  }

  if (e.key.toLowerCase() === "j") attack();
  if (e.key.toLowerCase() === "e") interact();
  if (e.key.toLowerCase() === "i") toggleInventory();
  if (e.key.toLowerCase() === "b") toggleInventory();
  if (e.key === "Shift") dodge();

  if (dialogue.active) {
    if (e.key === "Enter") advanceDialogue();

    if (dialogue.choice) {
      if (e.key === "1") chooseDialogue(0);
      if (e.key === "2") chooseDialogue(1);
    }
  }
});

addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

/* =========================
   JOYSTICK
========================= */

let joystick = {
  active: false,
  x: 0,
  y: 0
};

const joystickEl = document.getElementById("joystick");

if (joystickEl) {
  joystickEl.addEventListener("pointerdown", e => {
    joystick.active = true;
    joystickEl.setPointerCapture(e.pointerId);
  });

  joystickEl.addEventListener("pointermove", e => {
    if (!joystick.active) return;

    const r = joystickEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;

    const max = r.width * 0.35;
    const length = Math.hypot(dx, dy);

    if (length > max) {
      dx = dx / length * max;
      dy = dy / length * max;
    }

    joystick.x = dx / max;
    joystick.y = dy / max;
  });

  const stopJoystick = () => {
    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;
  };

  joystickEl.addEventListener("pointerup", stopJoystick);
  joystickEl.addEventListener("pointercancel", stopJoystick);
}

/* =========================
   MOVIMENTO
========================= */

function getMovement() {
  let x = 0;
  let y = 0;

  if (keys["w"] || keys["arrowup"]) y -= 1;
  if (keys["s"] || keys["arrowdown"]) y += 1;
  if (keys["a"] || keys["arrowleft"]) x -= 1;
  if (keys["d"] || keys["arrowright"]) x += 1;

  if (Math.abs(joystick.x) > 0.05 || Math.abs(joystick.y) > 0.05) {
    x = joystick.x;
    y = joystick.y;
  }

  const len = Math.hypot(x, y);

  if (len > 1) {
    x /= len;
    y /= len;
  }

  return { x, y };
}

/* =========================
   INVENTÁRIO
========================= */

function toggleInventory() {
  if (dialogue.active) return;

  inventoryOpen = !inventoryOpen;

  const panel = document.getElementById("inventoryPanel");

  if (panel) {
    panel.style.display = inventoryOpen ? "block" : "none";
  }

  updateInventoryUI();
}

function updateInventoryUI() {
  const ids = {
    wood: "invWood",
    stone: "invStone",
    mushroom: "invMushroom",
    strange: "invStrange"
  };

  for (const key in ids) {
    const el = document.getElementById(ids[key]);
    if (el) el.textContent = resources[key];
  }

  const items = {
    campfire: "craftedCampfire",
    axe: "craftedAxe",
    sword: "craftedSword",
    potion: "craftedPotion"
  };

  for (const key in items) {
    const el = document.getElementById(items[key]);
    if (el) el.textContent = craftedItems[key];
  }
}

/* =========================
   CRAFTING
========================= */

function craft(type) {
  if (type === "campfire") {
    if (resources.wood >= 5 && resources.stone >= 3) {
      resources.wood -= 5;
      resources.stone -= 3;
      craftedItems.campfire++;
      craftParticles(player.x, player.y);
      message("Fogueira criada.");
    } else {
      message("Recursos insuficientes.");
    }
  }

  if (type === "axe") {
    if (resources.wood >= 8 && resources.stone >= 4) {
      resources.wood -= 8;
      resources.stone -= 4;
      craftedItems.axe++;
      craftParticles(player.x, player.y);
      message("Machado criado.");
    } else {
      message("Recursos insuficientes.");
    }
  }

  if (type === "sword") {
    if (resources.wood >= 5 && resources.stone >= 8) {
      resources.wood -= 5;
      resources.stone -= 8;
      craftedItems.sword++;
      craftParticles(player.x, player.y);
      message("Espada simples criada.");
    } else {
      message("Recursos insuficientes.");
    }
  }

  if (type === "potion") {
    if (resources.mushroom >= 2 && resources.wood >= 1) {
      resources.mushroom -= 2;
      resources.wood -= 1;
      craftedItems.potion++;
      craftParticles(player.x, player.y);
      message("Poção simples criada.");
    } else {
      message("Recursos insuficientes.");
    }
  }

  updateInventoryUI();
  updateHUD();
}

function craftParticles(x, y) {
  for (let i = 0; i < 14; i++) {
    particles.push({
      x,
      y,
      vx: rand(-70, 70),
      vy: rand(-90, 20),
      life: rand(0.4, 0.9),
      maxLife: 0.9,
      size: rand(2, 5),
      type: "craft"
    });
  }
}

/* =========================
   ATAQUE ORIGINAL V4
========================= */

function attack() {
  if (dialogue.active) return;
  if (inventoryOpen) return;
  if (player.attackCooldown > 0) return;
  if (player.stamina < 12) return;

  player.stamina -= 12;
  player.attackCooldown = 0.45;
  player.attackTimer = 0.16;

  camera.shake = 5;

  for (const enemy of enemies) {
    if (enemy.dead) continue;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const d = Math.hypot(dx, dy);

    if (d > 75) continue;

    const dot =
      (dx / d) * player.dirX +
      (dy / d) * player.dirY;

    if (dot < 0.15) continue;

    enemy.hp -= 25;
    enemy.hitTimer = 0.2;

    enemy.x += (dx / d) * 25;
    enemy.y += (dy / d) * 25;

    for (let i = 0; i < 10; i++) {
      particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: rand(-100, 100),
        vy: rand(-100, 100),
        life: rand(0.2, 0.5),
        maxLife: 0.5,
        size: rand(2, 5),
        type: "hit"
      });
    }

    if (enemy.hp <= 0) {
      enemy.dead = true;
      resources.wood++;

      for (let i = 0; i < 20; i++) {
        particles.push({
          x: enemy.x,
          y: enemy.y,
          vx: rand(-130, 130),
          vy: rand(-130, 130),
          life: rand(0.4, 1),
          maxLife: 1,
          size: rand(2, 6),
          type: "death"
        });
      }
    }
  }

  updateHUD();
}

/* =========================
   DODGE ORIGINAL V4
========================= */

function dodge() {
  if (dialogue.active) return;
  if (player.dodgeCooldown > 0) return;
  if (player.stamina < 25) return;

  const move = getMovement();

  let dx = move.x;
  let dy = move.y;

  if (Math.hypot(dx, dy) < 0.1) {
    dx = player.dirX;
    dy = player.dirY;
  }

  player.stamina -= 25;
  player.dodgeCooldown = 0.7;
  player.dodgeTimer = 0.22;
  player.invulnerable = 0.25;

  player.x += dx * 75;
  player.y += dy * 75;

  player.x = clamp(player.x, 30, WORLD.width - 30);
  player.y = clamp(player.y, 30, WORLD.height - 30);

  camera.shake = 3;

  for (let i = 0; i < 12; i++) {
    particles.push({
      x: player.x,
      y: player.y,
      vx: rand(-60, 60),
      vy: rand(-60, 60),
      life: rand(0.2, 0.5),
      maxLife: 0.5,
      size: rand(2, 4),
      type: "dodge"
    });
  }
}

/* =========================
   DIÁLOGO V5
========================= */

function startDialogue(speaker, text, choices = []) {
  dialogue.active = true;
  dialogue.speaker = speaker;
  dialogue.fullText = text;
  dialogue.text = "";
  dialogue.index = 0;
  dialogue.timer = 0;
  dialogue.choice = choices.length > 0;
  dialogue.choices = choices;
  dialogue.choiceIndex = 0;
  elder.talking = true;
}

function advanceDialogue() {
  if (!dialogue.active) return;

  if (dialogue.index < dialogue.fullText.length) {
    dialogue.index = dialogue.fullText.length;
    dialogue.text = dialogue.fullText;
    return;
  }

  if (dialogue.choice) return;

  closeDialogue();
}

function chooseDialogue(index) {
  if (!dialogue.active || !dialogue.choice) return;

  const choice = dialogue.choices[index];

  if (!choice) return;

  consequence = choice.consequence;

  closeDialogue();

  if (consequence === "investigate") {
    questStage = 4;
    message("O Ancião pediu que você procure as pedras antigas.");
  }

  if (consequence === "ignore") {
    questStage = 5;
    message("Você decidiu ignorar o aviso. Algo pode ter mudado.");
  }

  updateHUD();
}

function closeDialogue() {
  dialogue.active = false;
  dialogue.speaker = "";
  dialogue.text = "";
  dialogue.fullText = "";
  dialogue.index = 0;
  dialogue.choice = false;
  dialogue.choices = [];
  elder.talking = false;
}

function updateDialogue(dt) {
  if (!dialogue.active) return;

  if (dialogue.index < dialogue.fullText.length) {
    dialogue.timer += dt;

    if (dialogue.timer >= 0.025) {
      dialogue.timer = 0;
      dialogue.index++;

      dialogue.text =
        dialogue.fullText.substring(0, dialogue.index);
    }
  }
}

/* =========================
   INTERAÇÃO V4 + V5
========================= */

function interact() {
  if (dialogue.active) {
    advanceDialogue();
    return;
  }

  const elderDistance = dist(
    player.x,
    player.y,
    elder.x,
    elder.y
  );

  if (elder.active && elderDistance < 70) {
    interactElder();
    return;
  }

  let nearest = null;
  let nearestDistance = Infinity;
  let type = null;

  for (const mushroom of mushrooms) {
    if (mushroom.collected) continue;

    const d = dist(player.x, player.y, mushroom.x, mushroom.y);

    if (d < nearestDistance) {
      nearest = mushroom;
      nearestDistance = d;
      type = "mushroom";
    }
  }

  for (const wood of woods) {
    if (wood.collected) continue;

    const d = dist(player.x, player.y, wood.x, wood.y);

    if (d < nearestDistance) {
      nearest = wood;
      nearestDistance = d;
      type = "wood";
    }
  }

  for (const stone of stones) {
    if (stone.collected) continue;

    const d = dist(player.x, player.y, stone.x, stone.y);

    if (d < nearestDistance) {
      nearest = stone;
      nearestDistance = d;
      type = "stone";
    }
  }

  if (!nearest || nearestDistance > 55) {
    if (
      Math.abs(player.x - shelter.x) < 180 &&
      Math.abs(player.y - shelter.y) < 150
    ) {
      message("Abrigo: local seguro.");
    } else {
      message("Não há nada para interagir aqui.");
    }

    return;
  }

  collectObject(nearest, type);
}

/* =========================
   ANCIÃO
========================= */

function interactElder() {
  if (questStage < 2) {
    startDialogue(
      "Ancião",
      "Você encontrou o cogumelo... Eu senti sua presença antes mesmo de você chegar."
    );

    return;
  }

  if (questStage === 2) {
    questStage = 3;

    startDialogue(
      "Ancião",
      "Escute com atenção. Aquele cogumelo não pertence a este mundo. Algo antigo está despertando na floresta."
    );

    return;
  }

  if (questStage === 3) {
    startDialogue(
      "Ancião",
      "Você precisa decidir o que fará agora.",
      [
        {
          text: "Investigar a floresta",
          consequence: "investigate"
        },
        {
          text: "Ignorar o aviso",
          consequence: "ignore"
        }
      ]
    );

    return;
  }

  if (questStage === 4) {
    startDialogue(
      "Ancião",
      "As pedras antigas ficam além da parte mais escura da floresta. Procure sinais de uma construção esquecida."
    );

    return;
  }

  if (questStage === 5) {
    startDialogue(
      "Ancião",
      "Você escolheu ignorar o aviso... Espero que a floresta não cobre um preço por isso."
    );

    return;
  }
}

/* =========================
   COLETA
========================= */

function collectObject(obj, type) {
  obj.collected = true;

  if (type === "mushroom") {
    if (obj.strange) {
      resources.strange++;

      if (questStage === 0) {
        questStage = 1;
        message("O cogumelo estranho está reagindo.");
      }
    } else {
      resources.mushroom++;
      message("Cogumelo coletado.");
    }
  }

  if (type === "wood") {
    resources.wood++;
    message("Madeira coletada.");
  }

  if (type === "stone") {
    resources.stone++;
    message("Pedra coletada.");
  }

  for (let i = 0; i < 10; i++) {
    particles.push({
      x: obj.x,
      y: obj.y,
      vx: rand(-70, 70),
      vy: rand(-100, 20),
      life: rand(0.3, 0.7),
      maxLife: 0.7,
      size: rand(2, 5),
      type: "collect"
    });
  }

  updateHUD();
  updateInventoryUI();
}

/* =========================
   DANO
========================= */

function damagePlayer(amount, enemy) {
  if (player.invulnerable > 0) return;

  player.hp -= amount;
  player.hurtTimer = 0.2;
  camera.shake = 7;

  if (enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;

    player.x += (dx / d) * 18;
    player.y += (dy / d) * 18;
  }

  for (let i = 0; i < 8; i++) {
    particles.push({
      x: player.x,
      y: player.y,
      vx: rand(-90, 90),
      vy: rand(-90, 90),
      life: rand(0.2, 0.5),
      maxLife: 0.5,
      size: rand(2, 5),
      type: "damage"
    });
  }

  if (player.hp <= 0) {
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.x = shelter.x;
    player.y = shelter.y + 50;

    message("Você acordou novamente no abrigo.");
  }

  updateHUD();
}

/* =========================
   INIMIGOS
========================= */

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (enemy.dead) continue;

    enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
    enemy.attackCooldown -= dt;
    enemy.wanderTimer -= dt;

    const d = dist(
      enemy.x,
      enemy.y,
      player.x,
      player.y
    );

    if (d < 300) {
      const dx = (player.x - enemy.x) / Math.max(d, 1);
      const dy = (player.y - enemy.y) / Math.max(d, 1);

      enemy.x += dx * enemy.speed * dt;
      enemy.y += dy * enemy.speed * dt;

      if (d < 32 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 1.1;
        damagePlayer(10, enemy);
      }
    } else {
      if (enemy.wanderTimer <= 0) {
        enemy.wanderTimer = rand(1, 3);

        const a = rand(0, Math.PI * 2);

        enemy.dirX = Math.cos(a);
        enemy.dirY = Math.sin(a);
      }

      enemy.x += enemy.dirX * enemy.speed * 0.3 * dt;
      enemy.y += enemy.dirY * enemy.speed * 0.3 * dt;
    }

    enemy.x = clamp(enemy.x, 30, WORLD.width - 30);
    enemy.y = clamp(enemy.y, 30, WORLD.height - 30);
  }
}

/* =========================
   PLAYER UPDATE
========================= */

function updatePlayer(dt) {
  player.attackCooldown =
    Math.max(0, player.attackCooldown - dt);

  player.attackTimer =
    Math.max(0, player.attackTimer - dt);

  player.dodgeCooldown =
    Math.max(0, player.dodgeCooldown - dt);

  player.dodgeTimer =
    Math.max(0, player.dodgeTimer - dt);

  player.invulnerable =
    Math.max(0, player.invulnerable - dt);

  player.hurtTimer =
    Math.max(0, player.hurtTimer - dt);

  if (dialogue.active) return;

  const move = getMovement();

  if (Math.hypot(move.x, move.y) > 0.05) {
    player.dirX = move.x;
    player.dirY = move.y;
  }

  let speed = player.speed;

  if (player.dodgeTimer > 0) {
    speed *= 2.8;
  }

  player.x += move.x * speed * dt;
  player.y += move.y * speed * dt;

  player.x = clamp(player.x, 30, WORLD.width - 30);
  player.y = clamp(player.y, 30, WORLD.height - 30);

  player.stamina = clamp(
    player.stamina + 24 * dt,
    0,
    player.maxStamina
  );
}

/* =========================
   QUEST
========================= */

function updateQuest() {
  if (
    questStage === 1 &&
    Math.abs(player.x - shelter.x) < 180 &&
    Math.abs(player.y - shelter.y) < 150
  ) {
    questStage = 2;
    message("O abrigo parece diferente...");
  }
}

/* =========================
   DIA / NOITE
========================= */

function updateDayNight(dt) {
  worldTime += dt;

  const cycle = 180;

  if (worldTime >= cycle) {
    worldTime -= cycle;
    day++;
  }

  gameTime = worldTime / cycle;
}

/* =========================
   CÂMERA
========================= */

function updateCamera(dt) {
  const targetX = player.x;
  const targetY = player.y;

  camera.x += (targetX - camera.x) * Math.min(1, dt * 6);
  camera.y += (targetY - camera.y) * Math.min(1, dt * 6);

  camera.x = clamp(
    camera.x,
    W / 2,
    WORLD.width - W / 2
  );

  camera.y = clamp(
    camera.y,
    H / 2,
    WORLD.height - H / 2
  );

  camera.shake = Math.max(0, camera.shake - dt * 18);
}

/* =========================
   PARTÍCULAS
========================= */

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.vx *= 0.97;
    p.vy *= 0.97;

    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

/* =========================
   MENSAGENS
========================= */

function updateMessages(dt) {
  if (messageTimer > 0) {
    messageTimer -= dt;
  }
}

/* =========================
   HUD
========================= */

function updateHUD() {
  const hp = document.getElementById("hpBar");
  const stamina = document.getElementById("staminaBar");
  const dayText = document.getElementById("dayText");
  const resourcesText = document.getElementById("resourcesText");
  const questText = document.getElementById("questText");

  if (hp) {
    hp.style.width =
      `${player.hp / player.maxHp * 100}%`;
  }

  if (stamina) {
    stamina.style.width =
      `${player.stamina / player.maxStamina * 100}%`;
  }

  if (dayText) {
    dayText.textContent = `Dia ${day}`;
  }

  if (resourcesText) {
    resourcesText.textContent =
      `🪵 ${resources.wood}   🪨 ${resources.stone}   🍄 ${resources.mushroom}   ✨ ${resources.strange}`;
  }

  if (questText) {
    let text = "";

    if (questStage === 0) {
      text = "Explore a floresta e encontre um cogumelo estranho.";
    }

    if (questStage === 1) {
      text = "O cogumelo estranho está reagindo. Volte ao abrigo.";
    }

    if (questStage === 2) {
      text = "Fale com o Ancião próximo ao abrigo.";
    }

    if (questStage === 3) {
      text = "Ouça o Ancião e escolha o que fazer.";
    }

    if (questStage === 4) {
      text = "Procure as pedras antigas na floresta.";
    }

    if (questStage === 5) {
      text = "Continue explorando a floresta.";
    }

    questText.textContent = text;
  }
}

/* =========================
   DESENHO DO MUNDO
========================= */

function drawGround() {
  ctx.fillStyle = "#172018";
  ctx.fillRect(
    0,
    0,
    WORLD.width,
    WORLD.height
  );

  for (let x = 0; x < WORLD.width; x += 80) {
    for (let y = 0; y < WORLD.height; y += 80) {
      ctx.fillStyle =
        ((x / 80 + y / 80) % 2 === 0)
          ? "#19231a"
          : "#182019";

      ctx.fillRect(x, y, 80, 80);
    }
  }
}

function drawTrees() {
  for (const tree of trees) {
    ctx.save();
    ctx.translate(tree.x, tree.y);

    ctx.fillStyle = "#3b261a";
    ctx.fillRect(
      -tree.r * 0.25,
      0,
      tree.r * 0.5,
      tree.r * 1.6
    );

    ctx.fillStyle = "#19391f";
    ctx.beginPath();
    ctx.arc(0, -tree.r * 0.3, tree.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#245229";
    ctx.beginPath();
    ctx.arc(
      -tree.r * 0.4,
      -tree.r * 0.65,
      tree.r * 0.55,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }
}

function drawRocks() {
  for (const rock of rocks) {
    ctx.fillStyle = "#4d524e";

    ctx.beginPath();
    ctx.ellipse(
      rock.x,
      rock.y,
      rock.r,
      rock.r * 0.7,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#70756f";
    ctx.beginPath();
    ctx.arc(
      rock.x - rock.r * 0.25,
      rock.y - rock.r * 0.2,
      rock.r * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

function drawMushrooms() {
  for (const mushroom of mushrooms) {
    if (mushroom.collected) continue;

    ctx.save();
    ctx.translate(mushroom.x, mushroom.y);

    ctx.fillStyle = "#ded6b7";
    ctx.fillRect(-3, 2, 6, 14);

    ctx.fillStyle = mushroom.strange
      ? "#7d2cff"
      : "#a94444";

    ctx.beginPath();
    ctx.arc(0, 2, 10, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = "#f2e8c8";

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(
        rand(-6, 6),
        rand(-3, 2),
        1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawResources() {
  for (const wood of woods) {
    if (wood.collected) continue;

    ctx.save();
    ctx.translate(wood.x, wood.y);
    ctx.rotate(0.3);

    ctx.fillStyle = "#76502d";
    ctx.fillRect(-12, -4, 24, 8);

    ctx.restore();
  }

  for (const stone of stones) {
    if (stone.collected) continue;

    ctx.fillStyle = "#6d716d";

    ctx.beginPath();
    ctx.arc(
      stone.x,
      stone.y,
      8,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}

function drawShelter() {
  ctx.save();
  ctx.translate(shelter.x, shelter.y);

  ctx.fillStyle = "#513521";
  ctx.fillRect(
    -shelter.width / 2,
    -shelter.height / 2,
    shelter.width,
    shelter.height
  );

  ctx.fillStyle = "#2d1b16";

  ctx.beginPath();
  ctx.moveTo(
    -shelter.width / 2 - 20,
    -shelter.height / 2
  );
  ctx.lineTo(
    0,
    -shelter.height / 2 - 90
  );
  ctx.lineTo(
    shelter.width / 2 + 20,
    -shelter.height / 2
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1b1411";

  ctx.fillRect(-28, 15, 56, 75);

  ctx.restore();
}

function drawCampfire() {
  const flicker =
    Math.sin(performance.now() * 0.015) * 3;

  ctx.save();
  ctx.translate(campfire.x, campfire.y);

  ctx.shadowBlur = 35;
  ctx.shadowColor = "#ff9d42";

  ctx.fillStyle = "#f39a35";

  ctx.beginPath();
  ctx.arc(0, 0, campfire.radius + flicker, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffdf70";

  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(13, 5);
  ctx.lineTo(0, 19);
  ctx.lineTo(-13, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* =========================
   GOBLINS
========================= */

function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.dead) continue;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.hitTimer > 0) {
      ctx.globalAlpha = 0.6;
    }

    ctx.fillStyle = "#56753b";

    ctx.beginPath();
    ctx.arc(
      0,
      0,
      enemy.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#27341f";

    ctx.beginPath();
    ctx.arc(-6, -3, 3, 0, Math.PI * 2);
    ctx.arc(6, -3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9a3737";

    ctx.beginPath();
    ctx.arc(0, 5, 4, 0, Math.PI);
    ctx.fill();

    ctx.restore();

    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = "#321616";
      ctx.fillRect(
        enemy.x - 18,
        enemy.y - 28,
        36,
        4
      );

      ctx.fillStyle = "#c94a4a";
      ctx.fillRect(
        enemy.x - 18,
        enemy.y - 28,
        36 * (enemy.hp / enemy.maxHp),
        4
      );
    }
  }
}

/* =========================
   ANCIÃO V5
========================= */

function drawElder() {
  if (!elder.active) return;

  ctx.save();
  ctx.translate(elder.x, elder.y);

  const pulse =
    1 + Math.sin(performance.now() * 0.004) * 0.05;

  ctx.scale(pulse, pulse);

  if (questStage >= 2) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#b78cff";
  }

  ctx.fillStyle = "#56416d";
  ctx.beginPath();
  ctx.arc(0, 4, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8b98b";
  ctx.beginPath();
  ctx.arc(0, -13, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e7e0d0";
  ctx.beginPath();
  ctx.arc(0, -19, 12, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = "#251c30";
  ctx.fillRect(-5, -14, 3, 3);
  ctx.fillRect(2, -14, 3, 3);

  ctx.fillStyle = "#6e4c2e";
  ctx.fillRect(15, -2, 4, 35);

  ctx.fillStyle = "#a98043";
  ctx.beginPath();
  ctx.arc(17, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (
    dist(player.x, player.y, elder.x, elder.y) < 100 &&
    !dialogue.active
  ) {
    ctx.save();

    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f3e8ff";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#000";

    ctx.fillText(
      "E — Falar",
      elder.x,
      elder.y - 42
    );

    ctx.restore();
  }
}

/* =========================
   PLAYER ORIGINAL
========================= */

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  const moving =
    Math.abs(getMovement().x) > 0.05 ||
    Math.abs(getMovement().y) > 0.05;

  const bob =
    moving
      ? Math.sin(performance.now() * 0.018) * 2
      : 0;

  ctx.translate(0, bob);

  if (player.invulnerable > 0) {
    ctx.globalAlpha = 0.55;
  }

  if (player.dodgeTimer > 0) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#b58cff";
  }

  ctx.fillStyle = "#111820";

  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263746";
  ctx.fillRect(-10, 2, 20, 18);

  ctx.fillStyle = "#d1a57a";
  ctx.beginPath();
  ctx.arc(0, -13, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(
    player.dirX * 4,
    -15 + player.dirY * 2,
    2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  if (player.attackTimer > 0) {
    ctx.save();

    const angle =
      Math.atan2(player.dirY, player.dirX);

    ctx.rotate(angle);

    ctx.translate(24, 0);

    ctx.rotate(
      -0.8 +
      (0.16 - player.attackTimer) * 8
    );

    ctx.fillStyle = "#65462c";
    ctx.fillRect(-4, -2, 14, 4);

    ctx.fillStyle = "#d7dce2";

    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.lineTo(48, -4);
    ctx.lineTo(57, 0);
    ctx.lineTo(48, 4);
    ctx.lineTo(5, 4);
    ctx.closePath();

    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

/* =========================
   PARTÍCULAS
========================= */

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha =
      clamp(p.life / p.maxLife, 0, 1);

    if (p.type === "hit") {
      ctx.fillStyle = "#d95c5c";
    } else if (p.type === "damage") {
      ctx.fillStyle = "#e74c4c";
    } else if (p.type === "death") {
      ctx.fillStyle = "#87a84f";
    } else if (p.type === "collect") {
      ctx.fillStyle = "#e7cf70";
    } else if (p.type === "craft") {
      ctx.fillStyle = "#9f7cff";
    } else {
      ctx.fillStyle = "#c6d6c1";
    }

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/* =========================
   NOITE
========================= */

function drawNight() {
  const phase = worldTime / 180;

  let darkness = 0;

  if (phase < 0.2) {
    darkness = 0;
  } else if (phase < 0.35) {
    darkness = (phase - 0.2) / 0.15 * 0.5;
  } else if (phase < 0.7) {
    darkness = 0.5;
  } else if (phase < 0.85) {
    darkness = 0.5 -
      ((phase - 0.7) / 0.15 * 0.5);
  } else {
    darkness = 0;
  }

  if (darkness <= 0) return;

  ctx.fillStyle =
    `rgba(5,8,20,${darkness})`;

  ctx.fillRect(0, 0, W, H);

  ctx.save();

  const px = player.x - camera.x + W / 2;
  const py = player.y - camera.y + H / 2;

  const gradient =
    ctx.createRadialGradient(
      px,
      py,
      30,
      px,
      py,
      250
    );

  gradient.addColorStop(
    0,
    "rgba(255,255,255,0.10)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,0,0,0)"
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

/* =========================
   VIGNETTE
========================= */

function drawVignette() {
  const gradient =
    ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.25,
      W / 2,
      H / 2,
      Math.max(W, H) * 0.7
    );

  gradient.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,0,0,0.45)"
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

/* =========================
   DIÁLOGO NA TELA
========================= */

function drawDialogue() {
  if (!dialogue.active) return;

  const boxWidth = Math.min(
    W - 30,
    760
  );

  const boxHeight =
    dialogue.choice ? 190 : 145;

  const x = (W - boxWidth) / 2;
  const y = H - boxHeight - 25;

  ctx.save();

  ctx.fillStyle = "rgba(8,10,15,0.94)";
  ctx.strokeStyle = "#8e6cc9";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(
    x,
    y,
    boxWidth,
    boxHeight,
    14
  );

  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#d8b98b";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";

  ctx.fillText(
    dialogue.speaker,
    x + 20,
    y + 28
  );

  ctx.fillStyle = "#e8e8e8";
  ctx.font = "16px sans-serif";

  const words =
    dialogue.text.split(" ");

  let line = "";
  let lineY = y + 58;

  for (const word of words) {
    const test =
      line ? `${line} ${word}` : word;

    if (
      ctx.measureText(test).width >
      boxWidth - 40
    ) {
      ctx.fillText(
        line,
        x + 20,
        lineY
      );

      line = word;
      lineY += 23;
    } else {
      line = test;
    }
  }

  if (line) {
    ctx.fillText(
      line,
      x + 20,
      lineY
    );
  }

  if (
    dialogue.index >=
    dialogue.fullText.length
  ) {
    if (dialogue.choice) {
      ctx.font = "bold 15px sans-serif";

      ctx.fillStyle = "#bfa7ff";

      ctx.fillText(
        "1 — " + dialogue.choices[0].text,
        x + 20,
        y + boxHeight - 48
      );

      ctx.fillText(
        "2 — " + dialogue.choices[1].text,
        x + 20,
        y + boxHeight - 22
      );
    } else {
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#aaa";

      ctx.fillText(
        "Toque / E / Enter para continuar",
        x + boxWidth - 230,
        y + boxHeight - 18
      );
    }
  }

  ctx.restore();
}

/* =========================
   RENDER
========================= */

function render() {
  ctx.clearRect(0, 0, W, H);

  const shakeX =
    camera.shake > 0
      ? rand(-camera.shake, camera.shake)
      : 0;

  const shakeY =
    camera.shake > 0
      ? rand(-camera.shake, camera.shake)
      : 0;

  ctx.save();

  ctx.translate(
    W / 2 - camera.x + shakeX,
    H / 2 - camera.y + shakeY
  );

  drawGround();
  drawTrees();
  drawRocks();
  drawMushrooms();
  drawResources();
  drawShelter();
  drawCampfire();
  drawEnemies();
  drawElder();
  drawPlayer();
  drawParticles();

  ctx.restore();

  drawNight();
  drawVignette();

  drawDialogue();

  if (messageTimer > 0) {
    ctx.save();

    ctx.textAlign = "center";
    ctx.font = "bold 15px sans-serif";

    const width =
      Math.min(W - 40, 500);

    ctx.fillStyle =
      "rgba(10,10,15,0.85)";

    ctx.fillRect(
      W / 2 - width / 2,
      25,
      width,
      42
    );

    ctx.fillStyle = "#eee";

    ctx.fillText(
      messageText,
      W / 2,
      51
    );

    ctx.restore();
  }
}

/* =========================
   LOOP
========================= */

let lastTime = performance.now();

function loop(now) {
  const dt =
    Math.min(0.033, (now - lastTime) / 1000);

  lastTime = now;

  updatePlayer(dt);
  updateEnemies(dt);
  updateQuest();
  updateDayNight(dt);
  updateCamera(dt);
  updateParticles(dt);
  updateMessages(dt);
  updateDialogue(dt);

  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

/* =========================
   BOTÕES MOBILE
========================= */

const attackButton =
  document.getElementById("attackButton");

const dodgeButton =
  document.getElementById("dodgeButton");

const interactButton =
  document.getElementById("interactButton");

const inventoryButton =
  document.getElementById("inventoryButton");

if (attackButton) {
  attackButton.addEventListener(
    "pointerdown",
    e => {
      e.preventDefault();
      attack();
    }
  );
}

if (dodgeButton) {
  dodgeButton.addEventListener(
    "pointerdown",
    e => {
      e.preventDefault();
      dodge();
    }
  );
}

if (interactButton) {
  interactButton.addEventListener(
    "pointerdown",
    e => {
      e.preventDefault();
      interact();
    }
  );
}

if (inventoryButton) {
  inventoryButton.addEventListener(
    "pointerdown",
    e => {
      e.preventDefault();
      toggleInventory();
    }
  );
}

/* =========================
   CRAFTING BUTTONS
========================= */

const craftCampfire =
  document.getElementById("craftCampfire");

const craftAxe =
  document.getElementById("craftAxe");

const craftSword =
  document.getElementById("craftSword");

const craftPotion =
  document.getElementById("craftPotion");

if (craftCampfire) {
  craftCampfire.onclick =
    () => craft("campfire");
}

if (craftAxe) {
  craftAxe.onclick =
    () => craft("axe");
}

if (craftSword) {
  craftSword.onclick =
    () => craft("sword");
}

if (craftPotion) {
  craftPotion.onclick =
    () => craft("potion");
}

/* =========================
   INICIALIZAÇÃO
========================= */

updateHUD();
updateInventoryUI();

const loading =
  document.getElementById("loading");

if (loading) {
  setTimeout(() => {
    loading.style.display = "none";
  }, 500);
}
