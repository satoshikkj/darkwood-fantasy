const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W = window.innerWidth;
let H = window.innerHeight;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = W * dpr;
  canvas.height = H * dpr;

  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

/* =========================================================
   MUNDO
========================================================= */

const world = {
  width: 3600,
  height: 2700
};

const player = {
  x: 1800,
  y: 1350,

  radius: 18,

  speed: 210,

  hp: 100,
  maxHp: 100,

  stamina: 100,
  maxStamina: 100,

  attacking: false,
  attackTimer: 0,

  dodging: false,
  dodgeTimer: 0,
  invulnerable: false,

  direction: 0,

  hurtTimer: 0
};

const camera = {
  x: player.x,
  y: player.y,

  zoom: 1,

  shake: 0
};

/* =========================================================
   INVENTÁRIO
========================================================= */

const inventory = {
  wood: 0,
  stone: 0,
  mushroom: 0,
  strangeMushroom: 0
};

const crafted = {
  campfire: 0,
  axe: 0,
  sword: 0,
  potion: 0
};

/* =========================================================
   QUEST
========================================================= */

const quest = {
  stage: 0,

  name: "O Cogumelo que Sussurra",

  elderTrust: 0,

  completed: false
};

/*
0 = falar com o ancião
1 = encontrar cogumelo
2 = voltar ao ancião
3 = reunir materiais
4 = concluída
*/

/* =========================================================
   NPC
========================================================= */

const elder = {
  x: 1800,
  y: 1180,

  radius: 22,

  name: "Ancião",

  active: true
};

/* =========================================================
   OBJETOS
========================================================= */

const shelter = {
  x: 1800,
  y: 1350,

  width: 210,
  height: 150
};

const campfire = {
  x: 1800,
  y: 1470,

  radius: 32
};

/* =========================================================
   FLORESTA
========================================================= */

const trees = [];
const rocks = [];
const mushrooms = [];
const goblins = [];
const particles = [];

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/* árvores */

for (let i = 0; i < 170; i++) {

  let x = random(100, world.width - 100);
  let y = random(100, world.height - 100);

  if (
    Math.abs(x - shelter.x) < 250 &&
    Math.abs(y - shelter.y) < 230
  ) {
    i--;
    continue;
  }

  trees.push({
    x,
    y,
    size: random(28, 55)
  });
}

/* pedras */

for (let i = 0; i < 100; i++) {

  rocks.push({
    x: random(80, world.width - 80),
    y: random(80, world.height - 80),
    size: random(10, 22)
  });
}

/* cogumelos */

for (let i = 0; i < 70; i++) {

  mushrooms.push({
    x: random(80, world.width - 80),
    y: random(80, world.height - 80),

    strange: i === 0,

    collected: false
  });
}

/* =========================================================
   GOBLINS
========================================================= */

for (let i = 0; i < 14; i++) {

  goblins.push({
    x: random(500, world.width - 500),
    y: random(400, world.height - 400),

    radius: 17,

    hp: 45,
    maxHp: 45,

    speed: random(45, 65),

    attackCooldown: random(0, 2),

    wanderAngle: random(0, Math.PI * 2),

    hitTimer: 0,

    dead: false
  });
}

/* =========================================================
   PARTÍCULAS
========================================================= */

function particle(x, y, color = "#fff", amount = 8) {

  for (let i = 0; i < amount; i++) {

    particles.push({
      x,
      y,

      vx: random(-70, 70),
      vy: random(-70, 70),

      life: random(.3, .7),
      maxLife: .7,

      color
    });
  }
}

/* =========================================================
   CONTROLES
========================================================= */

const keys = {};

window.addEventListener("keydown", e => {

  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "i" ||
      e.key.toLowerCase() === "b") {

    toggleInventory();
  }

  if (e.key.toLowerCase() === "e") {

    if (dialogueOpen) {
      advanceDialogue();
    } else {
      interact();
    }
  }

  if (
    e.key === "Enter" &&
    dialogueOpen
  ) {
    advanceDialogue();
  }

  if (
    e.key === " " ||
    e.key.toLowerCase() === "j"
  ) {

    if (!dialogueOpen) {
      attack();
    }
  }

  if (
    e.key === "Shift" ||
    e.key.toLowerCase() === "k"
  ) {

    if (!dialogueOpen) {
      dodge();
    }
  }
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

/* =========================================================
   MOVIMENTO
========================================================= */

const joystick = {
  active: false,
  x: 0,
  y: 0
};

const joystickElement = document.getElementById("joystick");
const joystickKnob = document.getElementById("joystickKnob");

function updateJoystick(clientX, clientY) {

  const rect = joystickElement.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let dx = clientX - centerX;
  let dy = clientY - centerY;

  const max = 42;

  const length = Math.hypot(dx, dy);

  if (length > max) {

    dx = dx / length * max;
    dy = dy / length * max;
  }

  joystick.x = dx / max;
  joystick.y = dy / max;

  joystickKnob.style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetJoystick() {

  joystick.active = false;

  joystick.x = 0;
  joystick.y = 0;

  joystickKnob.style.transform =
    "translate(-50%, -50%)";
}

joystickElement.addEventListener("pointerdown", e => {

  joystick.active = true;

  joystickElement.setPointerCapture(e.pointerId);

  updateJoystick(e.clientX, e.clientY);
});

joystickElement.addEventListener("pointermove", e => {

  if (!joystick.active) return;

  updateJoystick(e.clientX, e.clientY);
});

joystickElement.addEventListener("pointerup", resetJoystick);
joystickElement.addEventListener("pointercancel", resetJoystick);

/* =========================================================
   AÇÕES
========================================================= */

function attack() {

  if (player.attackTimer > 0) return;
  if (player.dodging) return;

  player.attacking = true;
  player.attackTimer = .35;

  const attackRange = 65;

  goblins.forEach(g => {

    if (g.dead) return;

    const d = distance(player, g);

    if (d < attackRange) {

      g.hp -= 20;
      g.hitTimer = .18;

      const angle =
        Math.atan2(g.y - player.y, g.x - player.x);

      g.x += Math.cos(angle) * 30;
      g.y += Math.sin(angle) * 30;

      particle(g.x, g.y, "#d9d9d9", 10);

      camera.shake = 5;

      if (g.hp <= 0) {

        g.dead = true;

        particle(g.x, g.y, "#8c5c5c", 18);

        inventory.wood += 1;
      }
    }
  });
}

function dodge() {

  if (player.dodging) return;
  if (player.stamina < 25) return;

  player.stamina -= 25;

  player.dodging = true;
  player.invulnerable = true;

  player.dodgeTimer = .25;

  particle(player.x, player.y, "#b9c6c0", 10);
}

/* =========================================================
   INTERAÇÃO
========================================================= */

function nearestInteractable() {

  const d = distance(player, elder);

  if (d < 85) {
    return elder;
  }

  return null;
}

function interact() {

  if (dialogueOpen) {
    advanceDialogue();
    return;
  }

  const target = nearestInteractable();

  if (target === elder) {
    talkToElder();
  }
}

/* =========================================================
   DIÁLOGOS
========================================================= */

const dialoguePanel =
  document.getElementById("dialoguePanel");

const dialogueName =
  document.getElementById("dialogueName");

const dialogueRole =
  document.getElementById("dialogueRole");

const dialogueText =
  document.getElementById("dialogueText");

const dialogueChoices =
  document.getElementById("dialogueChoices");

const dialogueContinue =
  document.getElementById("dialogueContinue");

let dialogueOpen = false;

let dialogueQueue = [];
let dialogueIndex = 0;

let currentChoices = null;

function openDialogue(lines, choices = null) {

  dialogueOpen = true;

  dialoguePanel.classList.remove("hidden");

  dialogueQueue = lines;

  dialogueIndex = 0;

  currentChoices = choices;

  dialogueChoices.innerHTML = "";

  dialogueContinue.style.display = "block";

  showDialogueLine();
}

function showDialogueLine() {

  if (!dialogueQueue[dialogueIndex]) {

    finishDialogue();

    return;
  }

  const line = dialogueQueue[dialogueIndex];

  dialogueName.textContent =
    line.name || "Ancião";

  dialogueRole.textContent =
    line.role || "Guardião da floresta";

  dialogueText.textContent =
    line.text;

  dialogueChoices.innerHTML = "";

  if (
    currentChoices &&
    dialogueIndex === dialogueQueue.length - 1
  ) {

    dialogueContinue.style.display = "none";

    currentChoices.forEach(choice => {

      const button =
        document.createElement("button");

      button.className = "dialogue-choice";

      button.textContent = choice.text;

      button.onclick = () => {

        choice.action();

        finishDialogue();
      };

      dialogueChoices.appendChild(button);
    });

  } else {

    dialogueContinue.style.display = "block";
  }
}

function advanceDialogue() {

  if (!dialogueOpen) return;

  if (
    currentChoices &&
    dialogueIndex === dialogueQueue.length - 1
  ) {
    return;
  }

  dialogueIndex++;

  showDialogueLine();
}

function finishDialogue() {

  dialogueOpen = false;

  dialoguePanel.classList.add("hidden");

  currentChoices = null;
  dialogueChoices.innerHTML = "";

  updateQuestText();
}

/* =========================================================
   ANCIÃO
========================================================= */

function talkToElder() {

  if (quest.stage === 0) {

    openDialogue([
      {
        name: "Ancião",
        role: "Guardião da floresta",
        text:
          "Você finalmente chegou. Há algo errado com esta floresta."
      },
      {
        name: "Ancião",
        role: "Guardião da floresta",
        text:
          "Durante a noite, ouvi uma espécie de sussurro vindo das árvores."
      },
      {
        name: "Ancião",
        role: "Guardião da floresta",
        text:
          "Encontre um cogumelo estranho. Se encontrar um, não o destrua."
      },
      {
        name: "Ancião",
        role: "Guardião da floresta",
        text:
          "Traga-o para mim. Preciso saber o que está despertando."
      }
    ]);

    quest.stage = 1;

    updateQuestText();

    return;
  }

  if (quest.stage === 1) {

    openDialogue([
      {
        name: "Ancião",
        text:
          "Você ainda não encontrou o cogumelo."
      },
      {
        name: "Ancião",
        text:
          "Procure nas partes mais antigas da floresta."
      }
    ]);

    return;
  }

  if (quest.stage === 2) {

    openDialogue(
      [
        {
          name: "Ancião",
          text:
            "Então era verdade... você encontrou o cogumelo."
        },
        {
          name: "Ancião",
          text:
            "Algo está despertando sob esta floresta."
        },
        {
          name: "Ancião",
          text:
            "Mas ainda não estamos preparados."
        }
      ],
      [
        {
          text: "Contar tudo o que aconteceu",
          action: () => {

            quest.elderTrust = 1;

            quest.stage = 3;

            showMessage(
              "O Ancião agora confia em você."
            );
          }
        },

        {
          text: "Esconder parte do que aconteceu",
          action: () => {

            quest.elderTrust = 0;

            quest.stage = 3;

            showMessage(
              "Você decidiu guardar um segredo."
            );
          }
        }
      ]
    );

    return;
  }

  if (quest.stage === 3) {

    const enoughResources =
      inventory.wood >= 5 &&
      inventory.stone >= 3;

    if (!enoughResources) {

      openDialogue([
        {
          name: "Ancião",
          text:
            "Precisamos reforçar o abrigo antes da próxima noite."
        },
        {
          name: "Ancião",
          text:
            "Traga 5 madeiras e 3 pedras."
        },
        {
          name: "Ancião",
          text:
            `Você possui ${inventory.wood}/5 madeiras e ${inventory.stone}/3 pedras.`
        }
      ]);

      return;
    }

    inventory.wood -= 5;
    inventory.stone -= 3;

    quest.stage = 4;
    quest.completed = true;

    crafted.potion += 1;

    openDialogue([
      {
        name: "Ancião",
        text:
          "Excelente. O abrigo ficará protegido por mais uma noite."
      },
      {
        name: "Ancião",
        text:
          "Você provou que pode sobreviver nesta floresta."
      },
      {
        name: "Ancião",
        text:
          "Mas o verdadeiro perigo ainda está escondido."
      }
    ]);

    showMessage(
      "Missão concluída! Você recebeu uma poção."
    );

    updateQuestText();

    return;
  }

  if (quest.stage === 4) {

    if (quest.elderTrust === 1) {

      openDialogue([
        {
          name: "Ancião",
          text:
            "Você fez a escolha certa ao confiar em mim."
        },
        {
          name: "Ancião",
          text:
            "Quando estiver preparado, procure as ruínas ao norte."
        }
      ]);

    } else {

      openDialogue([
        {
          name: "Ancião",
          text:
            "Há algo que você ainda não me contou."
        },
        {
          name: "Ancião",
          text:
            "A floresta percebe quando alguém esconde a verdade."
        }
      ]);
    }
  }
}

/* =========================================================
   QUEST
========================================================= */

function updateQuestText() {

  const objective =
    document.getElementById("questObjective");

  if (quest.stage === 0) {

    objective.textContent =
      "Fale com o Ancião no abrigo.";

  } else if (quest.stage === 1) {

    objective.textContent =
      "Encontre o cogumelo estranho na floresta.";

  } else if (quest.stage === 2) {

    objective.textContent =
      "Volte ao abrigo e fale com o Ancião.";

  } else if (quest.stage === 3) {

    objective.textContent =
      `Reúna 5 madeiras e 3 pedras. (${inventory.wood}/5 madeira • ${inventory.stone}/3 pedra)`;

  } else {

    objective.textContent =
      "Missão concluída. A floresta esconde outros segredos...";
  }
}

/* =========================================================
   COLETA
========================================================= */

function collectResources() {

  mushrooms.forEach(m => {

    if (m.collected) return;

    const d = distance(player, m);

    if (d < 32) {

      m.collected = true;

      if (m.strange) {

        inventory.strangeMushroom++;

        quest.stage = 2;

        showMessage(
          "Você encontrou o cogumelo estranho."
        );

        particle(
          m.x,
          m.y,
          "#c47cff",
          20
        );

      } else {

        inventory.mushroom++;

        particle(
          m.x,
          m.y,
          "#d27c8d",
          10
        );
      }

      updateQuestText();
    }
  });

  rocks.forEach(r => {

    if (distance(player, r) < r.size + 25) {

      if (Math.random() < .03) {

        inventory.stone++;

        particle(
          r.x,
          r.y,
          "#aaa",
          5
        );

        updateQuestText();
      }
    }
  });

  trees.forEach(t => {

    if (distance(player, t) < t.size + 25) {

      if (Math.random() < .025) {

        inventory.wood++;

        particle(
          t.x,
          t.y,
          "#b07a48",
          5
        );

        updateQuestText();
      }
    }
  });
}

/* =========================================================
   CRAFT
========================================================= */

function craft(type) {

  let success = false;

  if (type === "campfire") {

    if (
      inventory.wood >= 5 &&
      inventory.stone >= 3
    ) {

      inventory.wood -= 5;
      inventory.stone -= 3;

      crafted.campfire++;

      success = true;
    }
  }

  if (type === "axe") {

    if (
      inventory.wood >= 8 &&
      inventory.stone >= 4
    ) {

      inventory.wood -= 8;
      inventory.stone -= 4;

      crafted.axe++;

      success = true;
    }
  }

  if (type === "sword") {

    if (
      inventory.wood >= 5 &&
      inventory.stone >= 8
    ) {

      inventory.wood -= 5;
      inventory.stone -= 8;

      crafted.sword++;

      success = true;
    }
  }

  if (type === "potion") {

    if (
      inventory.mushroom >= 2 &&
      inventory.wood >= 1
    ) {

      inventory.mushroom -= 2;
      inventory.wood -= 1;

      crafted.potion++;

      success = true;
    }
  }

  if (success) {

    particle(
      player.x,
      player.y,
      "#e4c978",
      18
    );

    showMessage("Item fabricado!");

  } else {

    showMessage("Materiais insuficientes.");
  }

  updateInventoryUI();
  updateQuestText();
}

/* =========================================================
   INVENTÁRIO UI
========================================================= */

const inventoryPanel =
  document.getElementById("inventoryPanel");

function toggleInventory() {

  if (dialogueOpen) return;

  inventoryPanel.classList.toggle("hidden");

  updateInventoryUI();
}

document
  .getElementById("inventoryButton")
  .addEventListener("click", toggleInventory);

document
  .getElementById("closeInventory")
  .addEventListener("click", toggleInventory);

document
  .querySelectorAll("[data-craft]")
  .forEach(button => {

    button.addEventListener("click", () => {

      craft(button.dataset.craft);
    });
  });

function updateInventoryUI() {

  document.getElementById("woodCount").textContent =
    inventory.wood;

  document.getElementById("stoneCount").textContent =
    inventory.stone;

  document.getElementById("mushroomCount").textContent =
    inventory.mushroom;

  document.getElementById("strangeCount").textContent =
    inventory.strangeMushroom;

  document.getElementById("campfireCount").textContent =
    crafted.campfire;

  document.getElementById("axeCount").textContent =
    crafted.axe;

  document.getElementById("swordCount").textContent =
    crafted.sword;

  document.getElementById("potionCount").textContent =
    crafted.potion;
}

/* =========================================================
   COMBATE DOS GOBLINS
========================================================= */

function updateGoblins(dt) {

  goblins.forEach(g => {

    if (g.dead) return;

    if (g.hitTimer > 0) {
      g.hitTimer -= dt;
    }

    if (g.attackCooldown > 0) {
      g.attackCooldown -= dt;
    }

    const d = distance(player, g);

    if (d < 420) {

      const angle =
        Math.atan2(
          player.y - g.y,
          player.x - g.x
        );

      if (d > 42) {

        g.x +=
          Math.cos(angle) *
          g.speed *
          dt;

        g.y +=
          Math.sin(angle) *
          g.speed *
          dt;

      } else if (
        g.attackCooldown <= 0 &&
        !player.invulnerable
      ) {

        player.hp -= 8;

        player.hurtTimer = .25;

        player.invulnerable = true;

        setTimeout(() => {

          player.invulnerable = false;

        }, 250);

        camera.shake = 8;

        particle(
          player.x,
          player.y,
          "#d34d4d",
          12
        );

        g.attackCooldown = 1.2;
      }

    } else {

      g.wanderAngle +=
        random(-.5, .5) * dt;

      g.x +=
        Math.cos(g.wanderAngle) *
        g.speed *
        .25 *
        dt;

      g.y +=
        Math.sin(g.wanderAngle) *
        g.speed *
        .25 *
        dt;
    }
  });
}

/* =========================================================
   PLAYER
========================================================= */

function updatePlayer(dt) {

  if (dialogueOpen) return;

  if (!inventoryPanel.classList.contains("hidden")) {
    return;
  }

  let dx = 0;
  let dy = 0;

  if (
    keys["w"] ||
    keys["arrowup"]
  ) dy -= 1;

  if (
    keys["s"] ||
    keys["arrowdown"]
  ) dy += 1;

  if (
    keys["a"] ||
    keys["arrowleft"]
  ) dx -= 1;

  if (
    keys["d"] ||
    keys["arrowright"]
  ) dx += 1;

  if (joystick.active) {

    dx = joystick.x;
    dy = joystick.y;
  }

  const length = Math.hypot(dx, dy);

  if (length > 0) {

    dx /= length;
    dy /= length;

    player.direction =
      Math.atan2(dy, dx);

    const speed =
      player.dodging
        ? player.speed * 2.8
        : player.speed;

    player.x += dx * speed * dt;
    player.y += dy * speed * dt;
  }

  player.x =
    Math.max(
      30,
      Math.min(world.width - 30, player.x)
    );

  player.y =
    Math.max(
      30,
      Math.min(world.height - 30, player.y)
    );

  if (!player.dodging) {

    player.stamina =
      Math.min(
        player.maxStamina,
        player.stamina + 20 * dt
      );
  }

  if (player.attackTimer > 0) {

    player.attackTimer -= dt;

    if (player.attackTimer <= 0) {
      player.attacking = false;
    }
  }

  if (player.dodgeTimer > 0) {

    player.dodgeTimer -= dt;

    if (player.dodgeTimer <= 0) {

      player.dodging = false;
      player.invulnerable = false;
    }
  }

  if (player.hurtTimer > 0) {
    player.hurtTimer -= dt;
  }
}

/* =========================================================
   CÂMERA
========================================================= */

function updateCamera(dt) {

  camera.x +=
    (player.x - camera.x) *
    Math.min(dt * 6, 1);

  camera.y +=
    (player.y - camera.y) *
    Math.min(dt * 6, 1);

  camera.shake *= .88;
}

/* =========================================================
   PARTÍCULAS
========================================================= */

function updateParticles(dt) {

  particles.forEach(p => {

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.life -= dt;
  });

  for (
    let i = particles.length - 1;
    i >= 0;
    i--
  ) {

    if (particles[i].life <= 0) {

      particles.splice(i, 1);
    }
  }
}

/* =========================================================
   MUNDO / DESENHO
========================================================= */

function drawGround() {

  ctx.fillStyle = "#182019";

  ctx.fillRect(
    0,
    0,
    world.width,
    world.height
  );

  /* grama */

  ctx.strokeStyle = "rgba(92,110,78,.12)";
  ctx.lineWidth = 1;

  for (let x = 0; x < world.width; x += 80) {

    for (let y = 0; y < world.height; y += 80) {

      ctx.beginPath();

      ctx.moveTo(x, y);

      ctx.lineTo(
        x + 4,
        y - 7
      );

      ctx.stroke();
    }
  }
}

function drawTrees() {

  trees.forEach(t => {

    /* sombra */

    ctx.fillStyle =
      "rgba(0,0,0,.25)";

    ctx.beginPath();

    ctx.ellipse(
      t.x,
      t.y + t.size * .55,
      t.size * .8,
      t.size * .35,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* tronco */

    ctx.fillStyle = "#4d3827";

    ctx.fillRect(
      t.x - t.size * .18,
      t.y,
      t.size * .36,
      t.size * .75
    );

    /* copa */

    ctx.fillStyle = "#213b28";

    ctx.beginPath();

    ctx.arc(
      t.x,
      t.y,
      t.size * .7,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#294c31";

    ctx.beginPath();

    ctx.arc(
      t.x - t.size * .22,
      t.y - t.size * .15,
      t.size * .38,
      0,
      Math.PI * 2
    );

    ctx.fill();
  });
}

function drawRocks() {

  rocks.forEach(r => {

    ctx.fillStyle =
      "rgba(0,0,0,.25)";

    ctx.beginPath();

    ctx.ellipse(
      r.x,
      r.y + 5,
      r.size,
      r.size * .45,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#59605b";

    ctx.beginPath();

    ctx.arc(
      r.x,
      r.y,
      r.size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  });
}

function drawMushrooms() {

  mushrooms.forEach(m => {

    if (m.collected) return;

    ctx.fillStyle = "#e2d3ba";

    ctx.fillRect(
      m.x - 2,
      m.y,
      4,
      12
    );

    ctx.fillStyle =
      m.strange
        ? "#8d4bd3"
        : "#c55362";

    ctx.beginPath();

    ctx.arc(
      m.x,
      m.y,
      10,
      Math.PI,
      0
    );

    ctx.fill();

    if (m.strange) {

      ctx.fillStyle = "#e9caff";

      ctx.beginPath();

      ctx.arc(
        m.x - 3,
        m.y - 4,
        2,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }
  });
}

/* =========================================================
   ABRIGO
========================================================= */

function drawShelter() {

  /* sombra */

  ctx.fillStyle =
    "rgba(0,0,0,.3)";

  ctx.fillRect(
    shelter.x - shelter.width / 2 + 8,
    shelter.y - shelter.height / 2 + 10,
    shelter.width,
    shelter.height
  );

  /* madeira */

  ctx.fillStyle = "#61442d";

  ctx.fillRect(
    shelter.x - shelter.width / 2,
    shelter.y - shelter.height / 2,
    shelter.width,
    shelter.height
  );

  /* teto */

  ctx.fillStyle = "#382a21";

  ctx.beginPath();

  ctx.moveTo(
    shelter.x - shelter.width / 2 - 15,
    shelter.y - shelter.height / 2
  );

  ctx.lineTo(
    shelter.x,
    shelter.y - shelter.height / 2 - 70
  );

  ctx.lineTo(
    shelter.x + shelter.width / 2 + 15,
    shelter.y - shelter.height / 2
  );

  ctx.closePath();

  ctx.fill();

  /* porta */

  ctx.fillStyle = "#17130f";

  ctx.fillRect(
    shelter.x - 18,
    shelter.y + 5,
    36,
    70
  );

  /* placa */

  ctx.fillStyle = "#bda76a";

  ctx.font = "bold 14px Arial";

  ctx.textAlign = "center";

  ctx.fillText(
    "ABRIGO",
    shelter.x,
    shelter.y - shelter.height / 2 - 82
  );
}

/* =========================================================
   FOGUEIRA
========================================================= */

function drawCampfire() {

  ctx.fillStyle =
    "rgba(255,120,40,.13)";

  ctx.beginPath();

  ctx.arc(
    campfire.x,
    campfire.y,
    110,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle = "#4d3323";

  ctx.fillRect(
    campfire.x - 22,
    campfire.y - 4,
    44,
    8
  );

  ctx.fillRect(
    campfire.x - 22,
    campfire.y + 4,
    44,
    8
  );

  ctx.fillStyle = "#ff9a35";

  ctx.beginPath();

  ctx.arc(
    campfire.x,
    campfire.y - 10,
    18,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle = "#ffd36a";

  ctx.beginPath();

  ctx.arc(
    campfire.x,
    campfire.y - 13,
    9,
    0,
    Math.PI * 2
  );

  ctx.fill();
}

/* =========================================================
   ANCIÃO
========================================================= */

function drawElder() {

  const pulse =
    Math.sin(performance.now() / 400) * 2;

  /* sombra */

  ctx.fillStyle =
    "rgba(0,0,0,.3)";

  ctx.beginPath();

  ctx.ellipse(
    elder.x,
    elder.y + 25,
    25,
    10,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* manto */

  ctx.fillStyle = "#554b3d";

  ctx.beginPath();

  ctx.moveTo(
    elder.x - 20,
    elder.y + 25
  );

  ctx.lineTo(
    elder.x - 25,
    elder.y - 5
  );

  ctx.lineTo(
    elder.x,
    elder.y - 22
  );

  ctx.lineTo(
    elder.x + 25,
    elder.y - 5
  );

  ctx.lineTo(
    elder.x + 20,
    elder.y + 25
  );

  ctx.closePath();

  ctx.fill();

  /* cabeça */

  ctx.fillStyle = "#b58b70";

  ctx.beginPath();

  ctx.arc(
    elder.x,
    elder.y - 25,
    13,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* cabelo/barba */

  ctx.fillStyle = "#d2d0c2";

  ctx.beginPath();

  ctx.arc(
    elder.x,
    elder.y - 29,
    12,
    Math.PI,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillRect(
    elder.x - 8,
    elder.y - 21,
    16,
    13
  );

  /* cajado */

  ctx.strokeStyle = "#7b5637";

  ctx.lineWidth = 5;

  ctx.beginPath();

  ctx.moveTo(
    elder.x + 20,
    elder.y + 27
  );

  ctx.lineTo(
    elder.x + 28,
    elder.y - 30
  );

  ctx.stroke();

  /* marcador */

  if (
    distance(player, elder) < 120
  ) {

    ctx.fillStyle = "#e3c86e";

    ctx.beginPath();

    ctx.arc(
      elder.x,
      elder.y - 65 + pulse,
      5,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.font = "bold 12px Arial";

  ctx.textAlign = "center";

  ctx.fillStyle = "#e2d4aa";

  ctx.fillText(
    "Ancião",
    elder.x,
    elder.y - 78
  );
}

/* =========================================================
   GOBLINS
========================================================= */

function drawGoblins() {

  goblins.forEach(g => {

    if (g.dead) return;

    /* sombra */

    ctx.fillStyle =
      "rgba(0,0,0,.3)";

    ctx.beginPath();

    ctx.ellipse(
      g.x,
      g.y + 18,
      18,
      7,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* corpo */

    ctx.fillStyle =
      g.hitTimer > 0
        ? "#f2caca"
        : "#5b7048";

    ctx.beginPath();

    ctx.arc(
      g.x,
      g.y,
      g.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* orelhas */

    ctx.fillStyle = "#718a57";

    ctx.beginPath();

    ctx.moveTo(
      g.x - 12,
      g.y - 5
    );

    ctx.lineTo(
      g.x - 28,
      g.y - 13
    );

    ctx.lineTo(
      g.x - 15,
      g.y + 7
    );

    ctx.fill();

    ctx.beginPath();

    ctx.moveTo(
      g.x + 12,
      g.y - 5
    );

    ctx.lineTo(
      g.x + 28,
      g.y - 13
    );

    ctx.lineTo(
      g.x + 15,
      g.y + 7
    );

    ctx.fill();

    /* olhos */

    ctx.fillStyle = "#e8d76b";

    ctx.fillRect(
      g.x - 7,
      g.y - 4,
      4,
      4
    );

    ctx.fillRect(
      g.x + 3,
      g.y - 4,
      4,
      4
    );

    /* barra de vida */

    if (g.hp < g.maxHp) {

      ctx.fillStyle = "rgba(0,0,0,.6)";

      ctx.fillRect(
        g.x - 20,
        g.y - 30,
        40,
        5
      );

      ctx.fillStyle = "#c94d4d";

      ctx.fillRect(
        g.x - 20,
        g.y - 30,
        40 * (g.hp / g.maxHp),
        5
      );
    }
  });
}

/* =========================================================
   PLAYER
========================================================= */

function drawPlayer() {

  /* sombra */

  ctx.fillStyle =
    "rgba(0,0,0,.3)";

  ctx.beginPath();

  ctx.ellipse(
    player.x,
    player.y + 20,
    20,
    8,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* corpo */

  ctx.fillStyle =
    player.dodging
      ? "#a7b9bd"
      : "#354f58";

  ctx.beginPath();

  ctx.arc(
    player.x,
    player.y,
    player.radius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* capa */

  ctx.fillStyle = "#202c31";

  ctx.beginPath();

  ctx.moveTo(
    player.x - 13,
    player.y + 6
  );

  ctx.lineTo(
    player.x,
    player.y + 26
  );

  ctx.lineTo(
    player.x + 13,
    player.y + 6
  );

  ctx.closePath();

  ctx.fill();

  /* cabeça */

  ctx.fillStyle = "#b88970";

  ctx.beginPath();

  ctx.arc(
    player.x,
    player.y - 15,
    10,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /* espada */

  if (
    player.attacking ||
    crafted.sword > 0
  ) {

    ctx.save();

    ctx.translate(
      player.x,
      player.y
    );

    ctx.rotate(
      player.attacking
        ? player.direction + .5
        : player.direction
    );

    ctx.strokeStyle = "#d8dce0";

    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.moveTo(12, 0);
    ctx.lineTo(48, 0);

    ctx.stroke();

    ctx.restore();
  }
}

/* =========================================================
   PARTÍCULAS DRAW
========================================================= */

function drawParticles() {

  particles.forEach(p => {

    ctx.globalAlpha =
      Math.max(0, p.life / p.maxLife);

    ctx.fillStyle = p.color;

    ctx.fillRect(
      p.x - 2,
      p.y - 2,
      4,
      4
    );
  });

  ctx.globalAlpha = 1;
}

/* =========================================================
   ILUMINAÇÃO
========================================================= */

function drawLighting() {

  const gradient =
    ctx.createRadialGradient(
      player.x,
      player.y,
      80,
      player.x,
      player.y,
      550
    );

  gradient.addColorStop(
    0,
    "rgba(0,0,0,0)"
  );

  gradient.addColorStop(
    1,
    "rgba(0,0,0,.48)"
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    camera.x - W / 2 - 100,
    camera.y - H / 2 - 100,
    W + 200,
    H + 200
  );
}

/* =========================================================
   DIA / NOITE
========================================================= */

let worldTime = 0;

const dayLength = 180;

function updateWorldTime(dt) {

  worldTime += dt;

  if (worldTime > dayLength) {
    worldTime = 0;
  }
}

function drawNight() {

  const progress =
    worldTime / dayLength;

  const darkness =
    Math.max(
      0,
      Math.sin(
        progress * Math.PI * 2
      ) * .5 + .1
    );

  if (darkness <= 0) return;

  ctx.fillStyle =
    `rgba(7,12,25,${darkness * .45})`;

  ctx.fillRect(
    camera.x - W / 2,
    camera.y - H / 2,
    W,
    H
  );
}

/* =========================================================
   INTERAÇÃO HUD
========================================================= */

const interactionHint =
  document.getElementById("interactionHint");

function updateInteractionHint() {

  if (dialogueOpen) {

    interactionHint.classList.remove("show");

    return;
  }

  const target =
    nearestInteractable();

  if (target === elder) {

    interactionHint.textContent =
      "E — Falar com o Ancião";

    interactionHint.classList.add("show");

  } else {

    interactionHint.classList.remove("show");
  }
}

/* =========================================================
   MOBILE BUTTONS
========================================================= */

document
  .getElementById("attackButton")
  .addEventListener("pointerdown", e => {

    e.preventDefault();

    if (dialogueOpen) return;

    attack();
  });

document
  .getElementById("dodgeButton")
  .addEventListener("pointerdown", e => {

    e.preventDefault();

    if (dialogueOpen) return;

    dodge();
  });

document
  .getElementById("interactButton")
  .addEventListener("pointerdown", e => {

    e.preventDefault();

    if (dialogueOpen) {

      advanceDialogue();

    } else {

      interact();
    }
  });

dialogueContinue.addEventListener(
  "click",
  advanceDialogue
);

/* =========================================================
   MENSAGEM
========================================================= */

let messageTimer = null;

function showMessage(text) {

  const message =
    document.getElementById("message");

  message.textContent = text;

  message.classList.add("show");

  clearTimeout(messageTimer);

  messageTimer = setTimeout(() => {

    message.classList.remove("show");

  }, 2200);
}

/* =========================================================
   HUD
========================================================= */

function updateHUD() {

  document.getElementById("hpBar").style.width =
    `${Math.max(0, player.hp / player.maxHp * 100)}%`;

  document.getElementById("staminaBar").style.width =
    `${Math.max(0, player.stamina / player.maxStamina * 100)}%`;

  updateQuestText();
}

/* =========================================================
   GAME LOOP
========================================================= */

let lastTime = performance.now();

function loop(now) {

  const dt =
    Math.min(
      (now - lastTime) / 1000,
      .033
    );

  lastTime = now;

  updateWorldTime(dt);

  updatePlayer(dt);

  updateGoblins(dt);

  collectResources();

  updateParticles(dt);

  updateCamera(dt);

  updateInteractionHint();

  updateHUD();

  /* =========================
     DESENHO
  ========================= */

  ctx.clearRect(
    0,
    0,
    W,
    H
  );

  const shakeX =
    random(
      -camera.shake,
      camera.shake
    );

  const shakeY =
    random(
      -camera.shake,
      camera.shake
    );

  ctx.save();

  ctx.translate(
    W / 2 + shakeX,
    H / 2 + shakeY
  );

  ctx.scale(
    camera.zoom,
    camera.zoom
  );

  ctx.translate(
    -camera.x,
    -camera.y
  );

  drawGround();

  drawTrees();

  drawRocks();

  drawMushrooms();

  drawShelter();

  drawCampfire();

  drawGoblins();

  drawElder();

  drawPlayer();

  drawParticles();

  drawNight();

  drawLighting();

  ctx.restore();

  requestAnimationFrame(loop);
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

updateInventoryUI();
updateQuestText();

requestAnimationFrame(loop);
