const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;

function resize() {
    W = canvas.width = window.innerWidth * devicePixelRatio;
    H = canvas.height = window.innerHeight * devicePixelRatio;

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener("resize", resize);
resize();

const world = {
    width: 3200,
    height: 2400
};

const player = {
    x: 1600,
    y: 1200,
    radius: 16,
    speed: 210,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    direction: 0,
    attackCooldown: 0,
    attackTime: 0
};

const camera = {
    x: player.x,
    y: player.y
};

const keys = {};

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "]
            .includes(e.key.toLowerCase())
    ) {
        e.preventDefault();
    }
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

const trees = [];
const rocks = [];
const mushrooms = [];
const enemies = [];

let collectedMushrooms = 0;
let day = 1;
let time = 0;

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/* =========================
   GERAR FLORESTA
========================= */

function generateWorld() {
    trees.length = 0;
    rocks.length = 0;
    mushrooms.length = 0;
    enemies.length = 0;

    // Árvores
    for (let i = 0; i < 180; i++) {
        let x = random(100, world.width - 100);
        let y = random(100, world.height - 100);

        if (Math.hypot(x - player.x, y - player.y) < 260) continue;

        trees.push({
            x,
            y,
            radius: random(25, 38)
        });
    }

    // Pedras
    for (let i = 0; i < 70; i++) {
        rocks.push({
            x: random(80, world.width - 80),
            y: random(80, world.height - 80),
            radius: random(12, 22)
        });
    }

    // Cogumelos
    for (let i = 0; i < 30; i++) {
        mushrooms.push({
            x: random(100, world.width - 100),
            y: random(100, world.height - 100),
            radius: 9,
            collected: false
        });
    }

    // Goblins
    for (let i = 0; i < 7; i++) {
        enemies.push({
            x: random(500, world.width - 500),
            y: random(500, world.height - 500),
            radius: 18,
            hp: 60,
            maxHp: 60,
            speed: 70,
            alive: true,
            attackCooldown: 0
        });
    }
}

generateWorld();

/* =========================
   COLISÃO
========================= */

function collidesWithObstacle(x, y, radius) {

    for (const tree of trees) {
        const d = Math.hypot(x - tree.x, y - tree.y);

        if (d < radius + tree.radius * 0.65) {
            return true;
        }
    }

    for (const rock of rocks) {
        const d = Math.hypot(x - rock.x, y - rock.y);

        if (d < radius + rock.radius) {
            return true;
        }
    }

    return false;
}

/* =========================
   MOVIMENTO
========================= */

function movePlayer(dx, dy) {

    if (dx === 0 && dy === 0) return;

    const length = Math.hypot(dx, dy);

    dx /= length;
    dy /= length;

    player.direction = Math.atan2(dy, dx);

    const speed = player.speed;

    const newX = player.x + dx * speed * deltaTime;
    const newY = player.y + dy * speed * deltaTime;

    if (!collidesWithObstacle(newX, player.y, player.radius)) {
        player.x = newX;
    }

    if (!collidesWithObstacle(player.x, newY, player.radius)) {
        player.y = newY;
    }

    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
}

/* =========================
   ATAQUE
========================= */

function attack() {

    if (player.attackCooldown > 0) return;

    player.attackCooldown = 0.45;
    player.attackTime = 0.15;

    const range = 70;

    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        const d = distance(player, enemy);

        if (d > range) continue;

        const angle = Math.atan2(
            enemy.y - player.y,
            enemy.x - player.x
        );

        let difference = Math.abs(angle - player.direction);

        if (difference > Math.PI) {
            difference = Math.PI * 2 - difference;
        }

        if (difference < Math.PI / 2) {
            enemy.hp -= 25;

            if (enemy.hp <= 0) {
                enemy.alive = false;
            }
        }
    }
}

/* =========================
   INIMIGOS
========================= */

function updateEnemies() {

    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= deltaTime;
        }

        const d = distance(player, enemy);

        // perseguir
        if (d < 300 && d > 42) {

            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;

            const length = Math.hypot(dx, dy);

            const nx = dx / length;
            const ny = dy / length;

            const newX = enemy.x + nx * enemy.speed * deltaTime;
            const newY = enemy.y + ny * enemy.speed * deltaTime;

            if (!collidesWithObstacle(newX, newY, enemy.radius)) {
                enemy.x = newX;
                enemy.y = newY;
            }
        }

        // ataque
        if (d <= 45 && enemy.attackCooldown <= 0) {

            player.hp -= 10;

            enemy.attackCooldown = 1.2;

            if (player.hp <= 0) {
                player.hp = player.maxHp;
                player.x = 1600;
                player.y = 1200;
            }
        }
    }
}

/* =========================
   COLETAR COGUMELOS
========================= */

function collectMushrooms() {

    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        const d = distance(player, mushroom);

        if (d < 35) {

            mushroom.collected = true;
            collectedMushrooms++;

            showMessage(
                "Cogumelo coletado: " +
                collectedMushrooms +
                "/30"
            );
        }
    }
}

/* =========================
   CÂMERA
========================= */

function updateCamera() {

    const targetX = player.x;
    const targetY = player.y;

    camera.x += (targetX - camera.x) * 0.08;
    camera.y += (targetY - camera.y) * 0.08;
}

/* =========================
   DESENHO DO MUNDO
========================= */

function drawGround() {

    ctx.fillStyle = "#101510";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    const tile = 80;

    const startX =
        Math.floor((camera.x - window.innerWidth / 2) / tile) * tile;

    const startY =
        Math.floor((camera.y - window.innerHeight / 2) / tile) * tile;

    for (let x = startX; x < camera.x + window.innerWidth / 2 + tile; x += tile) {

        for (
            let y = startY;
            y < camera.y + window.innerHeight / 2 + tile;
            y += tile
        ) {

            const sx = x - camera.x + window.innerWidth / 2;
            const sy = y - camera.y + window.innerHeight / 2;

            const variation =
                Math.sin(x * 0.01) +
                Math.cos(y * 0.013);

            ctx.fillStyle =
                variation > 0
                    ? "#172018"
                    : "#141c16";

            ctx.fillRect(sx, sy, tile + 1, tile + 1);
        }
    }
}

/* =========================
   DESENHAR ÁRVORE
========================= */

function drawTree(tree) {

    const sx =
        tree.x - camera.x + window.innerWidth / 2;

    const sy =
        tree.y - camera.y + window.innerHeight / 2;

    if (
        sx < -80 ||
        sy < -80 ||
        sx > window.innerWidth + 80 ||
        sy > window.innerHeight + 80
    ) return;

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(
        sx,
        sy + 22,
        tree.radius * 1.1,
        tree.radius * 0.45,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // tronco
    ctx.fillStyle = "#38291d";
    ctx.fillRect(
        sx - 7,
        sy - 5,
        14,
        34
    );

    // copa
    ctx.fillStyle = "#263b25";
    ctx.beginPath();
    ctx.arc(
        sx,
        sy - 15,
        tree.radius,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#304b2e";
    ctx.beginPath();
    ctx.arc(
        sx - 8,
        sy - 22,
        tree.radius * 0.65,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

/* =========================
   PEDRAS
========================= */

function drawRock(rock) {

    const sx =
        rock.x - camera.x + window.innerWidth / 2;

    const sy =
        rock.y - camera.y + window.innerHeight / 2;

    ctx.fillStyle = "#3d443f";

    ctx.beginPath();
    ctx.ellipse(
        sx,
        sy,
        rock.radius,
        rock.radius * 0.75,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

/* =========================
   COGUMELOS
========================= */

function drawMushroom(mushroom) {

    if (mushroom.collected) return;

    const sx =
        mushroom.x - camera.x + window.innerWidth / 2;

    const sy =
        mushroom.y - camera.y + window.innerHeight / 2;

    // caule
    ctx.fillStyle = "#d7c6a1";

    ctx.fillRect(
        sx - 3,
        sy,
        6,
        12
    );

    // chapéu
    ctx.fillStyle = "#b83b3b";

    ctx.beginPath();
    ctx.arc(
        sx,
        sy,
        10,
        Math.PI,
        0
    );

    ctx.fill();

    // ponto
    ctx.fillStyle = "#e7d9b5";

    ctx.beginPath();
    ctx.arc(sx - 3, sy - 4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx + 4, sy - 3, 2, 0, Math.PI * 2);
    ctx.fill();
}

/* =========================
   GOBLIN
========================= */

function drawEnemy(enemy) {

    if (!enemy.alive) return;

    const sx =
        enemy.x - camera.x + window.innerWidth / 2;

    const sy =
        enemy.y - camera.y + window.innerHeight / 2;

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.4)";

    ctx.beginPath();

    ctx.ellipse(
        sx,
        sy + 17,
        20,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // corpo
    ctx.fillStyle = "#496b45";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy,
        enemy.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // olhos
    ctx.fillStyle = "#f0e8c8";

    ctx.beginPath();
    ctx.arc(sx - 6, sy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx + 6, sy - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // vida
    ctx.fillStyle = "#351515";
    ctx.fillRect(sx - 20, sy - 30, 40, 5);

    ctx.fillStyle = "#b33b3b";
    ctx.fillRect(
        sx - 20,
        sy - 30,
        40 * (enemy.hp / enemy.maxHp),
        5
    );
}

/* =========================
   PLAYER
========================= */

function drawPlayer() {

    const sx = window.innerWidth / 2;
    const sy = window.innerHeight / 2;

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.4)";

    ctx.beginPath();

    ctx.ellipse(
        sx,
        sy + 17,
        18,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // corpo
    ctx.fillStyle = "#4c5f83";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // cabeça
    ctx.fillStyle = "#c89470";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy - 14,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // direção
    const eyeX =
        sx + Math.cos(player.direction) * 7;

    const eyeY =
        sy - 14 +
        Math.sin(player.direction) * 7;

    ctx.fillStyle = "#111";

    ctx.beginPath();

    ctx.arc(
        eyeX,
        eyeY,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // ataque
    if (player.attackTime > 0) {

        ctx.strokeStyle = "#e7d8a2";
        ctx.lineWidth = 5;

        ctx.beginPath();

        ctx.arc(
            sx,
            sy,
            48,
            player.direction - 0.7,
            player.direction + 0.7
        );

        ctx.stroke();
    }
}

/* =========================
   HUD
========================= */

function updateHUD() {

    const hpBar = document.getElementById("hpBar");
    const staminaBar = document.getElementById("staminaBar");
    const dayText = document.getElementById("dayText");

    if (hpBar) {
        hpBar.style.width =
            `${(player.hp / player.maxHp) * 100}%`;
    }

    if (staminaBar) {
        staminaBar.style.width =
            `${(player.stamina / player.maxStamina) * 100}%`;
    }

    if (dayText) {
        dayText.textContent =
            `DIA ${day} • COGUMELOS ${collectedMushrooms}`;
    }
}

/* =========================
   MENSAGEM
========================= */

let messageTimer = 0;

function showMessage(text) {

    const interaction =
        document.getElementById("interaction");

    if (!interaction) return;

    interaction.textContent = text;
    interaction.style.opacity = "1";

    messageTimer = 3;
}

/* =========================
   CONTROLES MOBILE
========================= */

let joystickActive = false;
let joystickX = 0;
let joystickY = 0;

const joystick =
    document.getElementById("joystick");

const joystickKnob =
    document.getElementById("joystickKnob");

if (joystick) {

    const startJoystick = e => {

        joystickActive = true;

        updateJoystick(e);
    };

    const moveJoystick = e => {

        if (!joystickActive) return;

        updateJoystick(e);
    };

    const endJoystick = () => {

        joystickActive = false;

        joystickX = 0;
        joystickY = 0;

        if (joystickKnob) {
            joystickKnob.style.transform =
                "translate(-50%, -50%)";
        }
    };

    joystick.addEventListener("touchstart", startJoystick);
    joystick.addEventListener("touchmove", moveJoystick);
    joystick.addEventListener("touchend", endJoystick);

    joystick.addEventListener("mousedown", startJoystick);

    window.addEventListener("mousemove", e => {
        if (joystickActive) updateJoystick(e);
    });

    window.addEventListener("mouseup", endJoystick);
}

function updateJoystick(e) {

    const rect = joystick.getBoundingClientRect();

    let x = (e.touches ? e.touches[0].clientX : e.clientX) -
        (rect.left + rect.width / 2);

    let y = (e.touches ? e.touches[0].clientY : e.clientY) -
        (rect.top + rect.height / 2);

    const max = rect.width / 2 - 25;

    const length = Math.hypot(x, y);

    if (length > max) {

        x = x / length * max;
        y = y / length * max;
    }

    joystickX = x / max;
    joystickY = y / max;

    if (joystickKnob) {

        joystickKnob.style.transform =
            `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
}

/* =========================
   BOTÃO ATAQUE
========================= */

const attackButton =
    document.getElementById("attackButton");

if (attackButton) {

    attackButton.addEventListener("touchstart", e => {
        e.preventDefault();
        attack();
    });

    attackButton.addEventListener("mousedown", e => {
        e.preventDefault();
        attack();
    });
}

/* =========================
   INTERAÇÃO
========================= */

const interactButton =
    document.getElementById("interactButton");

if (interactButton) {

    interactButton.addEventListener("click", () => {
        collectMushrooms();
    });

    interactButton.addEventListener("touchstart", e => {
        e.preventDefault();
        collectMushrooms();
    });
}

/* =========================
   LOOP
========================= */

let lastTime = performance.now();
let deltaTime = 0;

function update() {

    const now = performance.now();

    deltaTime =
        Math.min((now - lastTime) / 1000, 0.05);

    lastTime = now;

    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;

    if (joystickActive) {

        dx = joystickX;
        dy = joystickY;
    }

    movePlayer(dx, dy);

    if (player.attackCooldown > 0) {
        player.attackCooldown -= deltaTime;
    }

    if (player.attackTime > 0) {
        player.attackTime -= deltaTime;
    }

    // regeneração de stamina
    if (dx === 0 && dy === 0) {

        player.stamina += 25 * deltaTime;

    } else {

        player.stamina -= 4 * deltaTime;
    }

    player.stamina =
        Math.max(
            0,
            Math.min(player.maxStamina, player.stamina)
        );

    updateEnemies();
    collectMushrooms();
    updateCamera();

    // ciclo do mundo
    time += deltaTime;

    if (time >= 120) {
        time = 0;
        day++;
    }

    if (messageTimer > 0) {

        messageTimer -= deltaTime;

        if (messageTimer <= 0) {

            const interaction =
                document.getElementById("interaction");

            if (interaction) {
                interaction.style.opacity = "0";
            }
        }
    }

    updateHUD();
}

function render() {

    drawGround();

    // pedras
    for (const rock of rocks) {
        drawRock(rock);
    }

    // cogumelos
    for (const mushroom of mushrooms) {
        drawMushroom(mushroom);
    }

    // árvores
    for (const tree of trees) {
        drawTree(tree);
    }

    // inimigos
    for (const enemy of enemies) {
        drawEnemy(enemy);
    }

    // jogador
    drawPlayer();

    // escuridão nas bordas
    const gradient = ctx.createRadialGradient(
        window.innerWidth / 2,
        window.innerHeight / 2,
        80,
        window.innerWidth / 2,
        window.innerHeight / 2,
        Math.max(window.innerWidth, window.innerHeight) * 0.75
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.72)");

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
    );
}

function loop() {

    update();
    render();

    requestAnimationFrame(loop);
}

const loading =
    document.getElementById("loading");

setTimeout(() => {

    if (loading) {
        loading.style.display = "none";
    }

    showMessage(
        "Explore a floresta. Encontre os cogumelos."
    );

    loop();

}, 500);
