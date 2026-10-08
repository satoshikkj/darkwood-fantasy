const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let DPR = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = W * DPR;
    canvas.height = H * DPR;

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* =========================================================
   WORLD
========================================================= */

const world = {
    width: 3600,
    height: 2700
};

/* =========================================================
   PLAYER
========================================================= */

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

/* =========================================================
   GAME STATE
========================================================= */

let gameTime = 0;
let worldTime = 0;

let day = 1;

let resources = {
    wood: 0,
    stone: 0,
    mushroom: 0,
    strange: 0
};

let inventoryOpen = false;

let craftedItems = {
    campfire: 0,
    axe: 0,
    sword: 0,
    potion: 0
};

let questStage = 0;

let messageTimer = 0;
let messageText = "";

let camera = {
    x: player.x,
    y: player.y,
    shake: 0,
    zoom: 1
};

/* =========================================================
   ARRAYS
========================================================= */

const trees = [];
const rocks = [];
const mushrooms = [];
const woods = [];
const stones = [];
const enemies = [];
const particles = [];

/* =========================================================
   RANDOM
========================================================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/* =========================================================
   SHELTER
========================================================= */

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

/* =========================================================
   WORLD GENERATION
========================================================= */

function insideShelter(x, y, margin = 0) {
    return (
        x > shelter.x - shelter.width / 2 - margin &&
        x < shelter.x + shelter.width / 2 + margin &&
        y > shelter.y - shelter.height / 2 - margin &&
        y < shelter.y + shelter.height / 2 + margin
    );
}

function generateWorld() {

    trees.length = 0;
    rocks.length = 0;
    mushrooms.length = 0;
    woods.length = 0;
    stones.length = 0;
    enemies.length = 0;

    for (let i = 0; i < 220; i++) {

        const x = random(100, world.width - 100);
        const y = random(100, world.height - 100);

        if (!insideShelter(x, y, 180)) {
            trees.push({
                x,
                y,
                radius: random(22, 34)
            });
        }
    }

    for (let i = 0; i < 90; i++) {

        const x = random(80, world.width - 80);
        const y = random(80, world.height - 80);

        if (!insideShelter(x, y, 130)) {
            rocks.push({
                x,
                y,
                radius: random(14, 23)
            });
        }
    }

    for (let i = 0; i < 40; i++) {

        const x = random(80, world.width - 80);
        const y = random(80, world.height - 80);

        if (!insideShelter(x, y, 100)) {

            mushrooms.push({
                x,
                y,
                radius: 8,
                strange: Math.random() < .2,
                collected: false
            });
        }
    }

    for (let i = 0; i < 50; i++) {

        const x = random(80, world.width - 80);
        const y = random(80, world.height - 80);

        woods.push({
            x,
            y,
            radius: 8,
            collected: false
        });
    }

    for (let i = 0; i < 50; i++) {

        const x = random(80, world.width - 80);
        const y = random(80, world.height - 80);

        stones.push({
            x,
            y,
            radius: 8,
            collected: false
        });
    }

    for (let i = 0; i < 9; i++) {

        let x;
        let y;

        do {
            x = random(300, world.width - 300);
            y = random(300, world.height - 300);
        } while (
            insideShelter(x, y, 300) ||
            Math.hypot(x - player.x, y - player.y) < 500
        );

        enemies.push({
            x,
            y,
            radius: 18,

            hp: 60,
            maxHp: 60,

            speed: random(45, 65),

            attackCooldown: random(0, 2),

            wanderTimer: random(1, 4),

            dirX: random(-1, 1),
            dirY: random(-1, 1),

            hitTimer: 0
        });
    }
}

generateWorld();

/* =========================================================
   COLLISIONS
========================================================= */

function isBlocked(x, y, radius) {

    for (const tree of trees) {

        if (
            Math.hypot(x - tree.x, y - tree.y) <
            radius + tree.radius * .65
        ) {
            return true;
        }
    }

    for (const rock of rocks) {

        if (
            Math.hypot(x - rock.x, y - rock.y) <
            radius + rock.radius * .7
        ) {
            return true;
        }
    }

    return false;
}

/* =========================================================
   MOVEMENT
========================================================= */

const keys = {};

window.addEventListener("keydown", e => {

    keys[e.key.toLowerCase()] = true;

    if (
        e.key.toLowerCase() === "i" ||
        e.key.toLowerCase() === "b"
    ) {
        toggleInventory();
    }

    if (e.key === " " || e.key.toLowerCase() === "j") {
        attack();
    }

    if (
        e.key === "Shift" ||
        e.key.toLowerCase() === "k"
    ) {
        dodge();
    }

    if (e.key.toLowerCase() === "e") {
        interact();
    }
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

let joystick = {
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

    const max = rect.width / 2 - 28;

    const len = Math.hypot(dx, dy);

    if (len > max) {

        dx = dx / len * max;
        dy = dy / len * max;
    }

    joystick.x = dx / max;
    joystick.y = dy / max;

    joystickKnob.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

joystickElement.addEventListener("pointerdown", e => {

    joystick.active = true;

    joystickElement.setPointerCapture(e.pointerId);

    updateJoystick(e.clientX, e.clientY);
});

joystickElement.addEventListener("pointermove", e => {

    if (joystick.active) {
        updateJoystick(e.clientX, e.clientY);
    }
});

joystickElement.addEventListener("pointerup", resetJoystick);
joystickElement.addEventListener("pointercancel", resetJoystick);

function resetJoystick() {

    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;

    joystickKnob.style.transform =
        "translate(-50%, -50%)";
}

/* =========================================================
   INVENTORY
========================================================= */

const inventoryPanel =
    document.getElementById("inventoryPanel");

const inventoryButton =
    document.getElementById("inventoryButton");

const closeInventory =
    document.getElementById("closeInventory");

function toggleInventory() {

    inventoryOpen = !inventoryOpen;

    inventoryPanel.classList.toggle(
        "open",
        inventoryOpen
    );

    updateInventoryUI();
}

function updateInventoryUI() {

    document.getElementById("invWood").textContent =
        resources.wood;

    document.getElementById("invStone").textContent =
        resources.stone;

    document.getElementById("invMushroom").textContent =
        resources.mushroom;

    document.getElementById("invStrange").textContent =
        resources.strange;
}

inventoryButton.addEventListener(
    "click",
    toggleInventory
);

closeInventory.addEventListener(
    "click",
    toggleInventory
);

inventoryPanel.addEventListener("pointerdown", e => {

    if (e.target === inventoryPanel) {
        toggleInventory();
    }
});

/* =========================================================
   CRAFTING
========================================================= */

const recipes = {

    campfire: {
        name: "Fogueira",
        costs: {
            wood: 5,
            stone: 3
        }
    },

    axe: {
        name: "Machado",
        costs: {
            wood: 8,
            stone: 4
        }
    },

    sword: {
        name: "Espada simples",
        costs: {
            wood: 5,
            stone: 8
        }
    },

    potion: {
        name: "Poção simples",
        costs: {
            mushroom: 2,
            wood: 1
        }
    }
};

document.querySelectorAll(".craft-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const recipe =
                recipes[button.dataset.recipe];

            craft(button.dataset.recipe, recipe);
        });
    });

function hasResources(costs) {

    for (const key in costs) {

        if (resources[key] < costs[key]) {
            return false;
        }
    }

    return true;
}

function craft(id, recipe) {

    if (!hasResources(recipe.costs)) {

        showMessage(
            "Você não possui recursos suficientes."
        );

        return;
    }

    for (const key in recipe.costs) {

        resources[key] -= recipe.costs[key];
    }

    craftedItems[id]++;

    updateInventoryUI();
    updateHUD();

    showMessage(
        `${recipe.name} fabricado.`
    );

    createCraftParticles();
}

/* =========================================================
   CRAFT PARTICLES
========================================================= */

function createCraftParticles() {

    for (let i = 0; i < 18; i++) {

        particles.push({
            x: player.x + random(-15, 15),
            y: player.y + random(-20, 10),

            vx: random(-50, 50),
            vy: random(-80, -20),

            life: random(.4, .8),
            maxLife: .8,

            size: random(2, 5),

            type: "craft"
        });
    }
}

/* =========================================================
   ATTACK
========================================================= */

function attack() {

    if (inventoryOpen) return;

    if (player.attackCooldown > 0) return;

    if (player.stamina < 12) {

        showMessage("Sem energia.");

        return;
    }

    player.stamina -= 12;

    player.attackCooldown = .45;
    player.attackTimer = .16;

    camera.shake = 5;

    for (const enemy of enemies) {

        if (enemy.hp <= 0) continue;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;

        const dist = Math.hypot(dx, dy);

        if (dist > 75) continue;

        const dot =
            (dx / Math.max(dist, 1)) * player.dirX +
            (dy / Math.max(dist, 1)) * player.dirY;

        if (dot < .15) continue;

        enemy.hp -= 25;

        enemy.hitTimer = .2;

        enemy.x += player.dirX * 25;
        enemy.y += player.dirY * 25;

        createHitParticles(
            enemy.x,
            enemy.y
        );

        if (enemy.hp <= 0) {

            resources.wood += 1;

            showMessage(
                "Goblin derrotado. +1 madeira"
            );

            createDeathParticles(
                enemy.x,
                enemy.y
            );
        }
    }
}

/* =========================================================
   DODGE
========================================================= */

function dodge() {

    if (inventoryOpen) return;

    if (player.dodgeCooldown > 0) return;

    if (player.stamina < 25) {

        showMessage("Sem energia.");

        return;
    }

    player.stamina -= 25;

    player.dodgeCooldown = .7;
    player.dodgeTimer = .22;
    player.invulnerable = .25;

    camera.shake = 3;

    createDodgeParticles();
}

/* =========================================================
   INTERACTION
========================================================= */

function interact() {

    if (inventoryOpen) return;

    let nearest = null;
    let nearestDist = Infinity;

    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        const d = distance(player, mushroom);

        if (d < nearestDist) {

            nearest = mushroom;
            nearestDist = d;
        }
    }

    for (const wood of woods) {

        if (wood.collected) continue;

        const d = distance(player, wood);

        if (d < nearestDist) {

            nearest = wood;
            nearestDist = d;
        }
    }

    for (const stone of stones) {

        if (stone.collected) continue;

        const d = distance(player, stone);

        if (d < nearestDist) {

            nearest = stone;
            nearestDist = d;
        }
    }

    if (!nearest || nearestDist > 55) {

        if (
            Math.hypot(
                player.x - shelter.x,
                player.y - shelter.y
            ) < 180
        ) {

            showMessage(
                "Abrigo: local seguro."
            );

            return;
        }

        showMessage(
            "Não há nada para interagir aqui."
        );

        return;
    }

    collectObject(nearest);
}

/* =========================================================
   COLLECTION
========================================================= */

function collectObject(object) {

    if (object.collected) return;

    object.collected = true;

    if (mushrooms.includes(object)) {

        if (object.strange) {

            resources.strange++;

            showMessage(
                "Você encontrou um cogumelo estranho."
            );

            if (questStage === 0) {

                questStage = 1;
            }

        } else {

            resources.mushroom++;

            showMessage(
                "Cogumelo coletado."
            );
        }
    }

    else if (woods.includes(object)) {

        resources.wood++;

        showMessage(
            "Madeira coletada. +1"
        );
    }

    else if (stones.includes(object)) {

        resources.stone++;

        showMessage(
            "Pedra coletada. +1"
        );
    }

    updateHUD();
    updateInventoryUI();

    createCollectionParticles(
        object.x,
        object.y
    );
}

/* =========================================================
   PARTICLES
========================================================= */

function createCollectionParticles(x, y) {

    for (let i = 0; i < 10; i++) {

        particles.push({
            x,
            y,

            vx: random(-25, 25),
            vy: random(-70, -20),

            life: random(.4, .7),
            maxLife: .7,

            size: random(2, 4),

            type: "collection"
        });
    }
}

function createHitParticles(x, y) {

    for (let i = 0; i < 10; i++) {

        particles.push({
            x,
            y,

            vx: random(-100, 100),
            vy: random(-100, 30),

            life: random(.2, .45),
            maxLife: .45,

            size: random(2, 5),

            type: "hit"
        });
    }
}

function createDeathParticles(x, y) {

    for (let i = 0; i < 25; i++) {

        particles.push({
            x,
            y,

            vx: random(-120, 120),
            vy: random(-130, 80),

            life: random(.4, .9),
            maxLife: .9,

            size: random(2, 6),

            type: "death"
        });
    }
}

function createDodgeParticles() {

    for (let i = 0; i < 12; i++) {

        particles.push({
            x: player.x,
            y: player.y,

            vx: random(-60, 60),
            vy: random(-60, 60),

            life: random(.2, .45),
            maxLife: .45,

            size: random(2, 5),

            type: "dodge"
        });
    }
}

/* =========================================================
   DAMAGE
========================================================= */

function damagePlayer(amount, enemy) {

    if (player.invulnerable > 0) return;

    player.hp -= amount;

    player.hurtTimer = .25;

    camera.shake = 10;

    document.getElementById(
        "damageFlash"
    ).style.opacity = "1";

    setTimeout(() => {

        document.getElementById(
            "damageFlash"
        ).style.opacity = "0";

    }, 100);

    if (enemy) {

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const len = Math.hypot(dx, dy) || 1;

        player.x += dx / len * 30;
        player.y += dy / len * 30;
    }

    if (player.hp <= 0) {

        player.hp = player.maxHp;
        player.stamina = player.maxStamina;

        player.x = shelter.x;
        player.y = shelter.y;

        showMessage(
            "Você caiu. A floresta trouxe você de volta ao abrigo."
        );
    }
}

/* =========================================================
   ENEMIES
========================================================= */

function updateEnemies(dt) {

    for (const enemy of enemies) {

        if (enemy.hp <= 0) continue;

        enemy.hitTimer =
            Math.max(0, enemy.hitTimer - dt);

        enemy.attackCooldown =
            Math.max(0, enemy.attackCooldown - dt);

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const dist = Math.hypot(dx, dy);

        if (dist < 420) {

            if (dist > 48) {

                const len = Math.max(dist, 1);

                const mx = dx / len;
                const my = dy / len;

                const speed = enemy.speed;

                const nx =
                    enemy.x + mx * speed * dt;

                const ny =
                    enemy.y + my * speed * dt;

                if (!isBlocked(nx, enemy.y, enemy.radius)) {
                    enemy.x = nx;
                }

                if (!isBlocked(enemy.x, ny, enemy.radius)) {
                    enemy.y = ny;
                }
            }

            else if (
                enemy.attackCooldown <= 0
            ) {

                damagePlayer(10, enemy);

                enemy.attackCooldown = 1.3;
            }

        } else {

            enemy.wanderTimer -= dt;

            if (enemy.wanderTimer <= 0) {

                enemy.wanderTimer =
                    random(1.5, 4);

                enemy.dirX =
                    random(-1, 1);

                enemy.dirY =
                    random(-1, 1);

                const len = Math.hypot(
                    enemy.dirX,
                    enemy.dirY
                ) || 1;

                enemy.dirX /= len;
                enemy.dirY /= len;
            }

            const nx =
                enemy.x +
                enemy.dirX *
                enemy.speed *
                .35 *
                dt;

            const ny =
                enemy.y +
                enemy.dirY *
                enemy.speed *
                .35 *
                dt;

            if (!isBlocked(nx, enemy.y, enemy.radius)) {
                enemy.x = nx;
            }

            if (!isBlocked(enemy.x, ny, enemy.radius)) {
                enemy.y = ny;
            }
        }
    }
}

/* =========================================================
   PLAYER UPDATE
========================================================= */

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

    if (inventoryOpen) return;

    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"]) {
        dy -= 1;
    }

    if (keys["s"] || keys["arrowdown"]) {
        dy += 1;
    }

    if (keys["a"] || keys["arrowleft"]) {
        dx -= 1;
    }

    if (keys["d"] || keys["arrowright"]) {
        dx += 1;
    }

    if (
        joystick.active ||
        Math.abs(joystick.x) > .05 ||
        Math.abs(joystick.y) > .05
    ) {

        dx = joystick.x;
        dy = joystick.y;
    }

    const len = Math.hypot(dx, dy);

    if (len > .01) {

        dx /= len;
        dy /= len;

        player.dirX = dx;
        player.dirY = dy;

        let speed = player.speed;

        if (player.dodgeTimer > 0) {
            speed *= 3.4;
        }

        const moving = true;

        if (
            moving &&
            player.dodgeTimer <= 0
        ) {

            player.stamina = Math.min(
                player.maxStamina,
                player.stamina + 22 * dt
            );
        }

        const nx =
            player.x +
            dx * speed * dt;

        const ny =
            player.y +
            dy * speed * dt;

        if (
            nx > player.radius &&
            nx < world.width - player.radius &&
            !isBlocked(nx, player.y, player.radius)
        ) {
            player.x = nx;
        }

        if (
            ny > player.radius &&
            ny < world.height - player.radius &&
            !isBlocked(player.x, ny, player.radius)
        ) {
            player.y = ny;
        }

    } else {

        player.stamina = Math.min(
            player.maxStamina,
            player.stamina + 28 * dt
        );
    }

    if (player.dodgeTimer > 0) {

        const nx =
            player.x +
            player.dirX *
            player.speed *
            3.4 *
            dt;

        const ny =
            player.y +
            player.dirY *
            player.speed *
            3.4 *
            dt;

        if (
            !isBlocked(nx, player.y, player.radius)
        ) {
            player.x = nx;
        }

        if (
            !isBlocked(player.x, ny, player.radius)
        ) {
            player.y = ny;
        }
    }
}

/* =========================================================
   RESOURCES
========================================================= */

function updateQuest() {

    if (questStage === 0) {

        document.getElementById("questText").textContent =
            "Explore a floresta e encontre um cogumelo estranho.";
    }

    else if (questStage === 1) {

        document.getElementById("questText").textContent =
            "O cogumelo estranho está reagindo. Volte ao abrigo.";
    }

    else if (questStage === 2) {

        document.getElementById("questText").textContent =
            "O abrigo parece esconder algo. Continue explorando.";
    }

    const nearShelter =
        Math.hypot(
            player.x - shelter.x,
            player.y - shelter.y
        ) < 170;

    if (
        nearShelter &&
        questStage === 1
    ) {

        questStage = 2;

        showMessage(
            "O abrigo parece diferente..."
        );
    }
}

/* =========================================================
   DAY / NIGHT
========================================================= */

function updateWorldTime(dt) {

    worldTime += dt;

    const cycle = 180;

    const t = (worldTime % cycle) / cycle;

    if (t > .99) {
        day++;
    }
}

function getTimeOfDay() {

    const cycle = 180;

    const t = (worldTime % cycle) / cycle;

    if (t < .25) {
        return "MANHÃ";
    }

    if (t < .5) {
        return "DIA";
    }

    if (t < .72) {
        return "ENTARDECER";
    }

    return "NOITE";
}

function getNightAmount() {

    const cycle = 180;

    const t = (worldTime % cycle) / cycle;

    if (t < .5) return 0;

    if (t < .72) {
        return (t - .5) / .22 * .65;
    }

    if (t < .95) {
        return .65;
    }

    return .65 - ((t - .95) / .05) * .65;
}

/* =========================================================
   CAMERA
========================================================= */

function updateCamera(dt) {

    const smoothing = 1 - Math.pow(.001, dt);

    camera.x +=
        (player.x - camera.x) *
        smoothing;

    camera.y +=
        (player.y - camera.y) *
        smoothing;

    camera.shake =
        Math.max(0, camera.shake - dt * 18);
}

/* =========================================================
   PARTICLES UPDATE
========================================================= */

function updateParticles(dt) {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vy += 100 * dt;

        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text) {

    messageText = text;
    messageTimer = 2.5;

    const element =
        document.getElementById("interaction");

    element.textContent = text;
    element.classList.add("show");
}

function updateMessage(dt) {

    if (messageTimer > 0) {

        messageTimer -= dt;

        if (messageTimer <= 0) {

            document
                .getElementById("interaction")
                .classList.remove("show");
        }
    }
}

/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    const hp =
        Math.max(
            0,
            player.hp / player.maxHp * 100
        );

    const stamina =
        Math.max(
            0,
            player.stamina /
            player.maxStamina * 100
        );

    document.getElementById("hpBar")
        .style.width = hp + "%";

    document.getElementById("staminaBar")
        .style.width = stamina + "%";

    document.getElementById("hpText")
        .textContent =
        `${Math.ceil(player.hp)} / ${player.maxHp}`;

    document.getElementById("staminaText")
        .textContent =
        `${Math.ceil(player.stamina)} / ${player.maxStamina}`;

    document.getElementById("dayText")
        .textContent =
        `DIA ${day} • ${getTimeOfDay()}`;

    document.getElementById("resourceText")
        .textContent =
        `🪵 ${resources.wood}   🪨 ${resources.stone}   🍄 ${resources.mushroom}`;
}

/* =========================================================
   WORLD DRAWING
========================================================= */

function worldToScreen(x, y) {

    return {
        x: x - camera.x + W / 2,
        y: y - camera.y + H / 2
    };
}

function drawGround() {

    const tile = 64;

    const startX =
        Math.floor(
            (camera.x - W / 2) / tile
        ) * tile;

    const startY =
        Math.floor(
            (camera.y - H / 2) / tile
        ) * tile;

    for (
        let x = startX;
        x < camera.x + W / 2 + tile;
        x += tile
    ) {

        for (
            let y = startY;
            y < camera.y + H / 2 + tile;
            y += tile
        ) {

            const screen =
                worldToScreen(x, y);

            const variation =
                ((x / tile + y / tile) % 3);

            if (variation === 0) {
                ctx.fillStyle = "#252b20";
            }

            else if (variation === 1) {
                ctx.fillStyle = "#283022";
            }

            else {
                ctx.fillStyle = "#22291e";
            }

            ctx.fillRect(
                screen.x,
                screen.y,
                tile + 1,
                tile + 1
            );

            ctx.fillStyle =
                "rgba(20,25,18,.25)";

            ctx.fillRect(
                screen.x + 5,
                screen.y + 12,
                2,
                2
            );
        }
    }
}

/* =========================================================
   TREES
========================================================= */

function drawTrees() {

    for (const tree of trees) {

        const s =
            worldToScreen(tree.x, tree.y);

        if (
            s.x < -80 ||
            s.x > W + 80 ||
            s.y < -100 ||
            s.y > H + 100
        ) continue;

        ctx.save();

        ctx.translate(s.x, s.y);

        ctx.fillStyle =
            "rgba(0,0,0,.3)";

        ctx.beginPath();
        ctx.ellipse(
            0,
            16,
            tree.radius * 1.3,
            tree.radius * .55,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#3c2920";

        ctx.fillRect(
            -7,
            -5,
            14,
            30
        );

        ctx.fillStyle = "#182619";

        ctx.beginPath();
        ctx.arc(
            -12,
            -18,
            tree.radius * .7,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#21351f";

        ctx.beginPath();
        ctx.arc(
            12,
            -22,
            tree.radius * .75,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#294126";

        ctx.beginPath();
        ctx.arc(
            0,
            -38,
            tree.radius * .65,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   ROCKS
========================================================= */

function drawRocks() {

    for (const rock of rocks) {

        const s =
            worldToScreen(
                rock.x,
                rock.y
            );

        if (
            s.x < -60 ||
            s.x > W + 60 ||
            s.y < -60 ||
            s.y > H + 60
        ) continue;

        ctx.save();

        ctx.translate(s.x, s.y);

        ctx.fillStyle =
            "rgba(0,0,0,.3)";

        ctx.beginPath();
        ctx.ellipse(
            0,
            7,
            rock.radius * 1.15,
            rock.radius * .55,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#51564e";

        ctx.beginPath();
        ctx.moveTo(-rock.radius, 5);
        ctx.lineTo(-rock.radius * .6, -rock.radius);
        ctx.lineTo(rock.radius * .4, -rock.radius * .85);
        ctx.lineTo(rock.radius, 2);
        ctx.lineTo(rock.radius * .4, rock.radius);
        ctx.lineTo(-rock.radius * .7, rock.radius * .7);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#777b70";

        ctx.beginPath();
        ctx.moveTo(
            -rock.radius * .5,
            -rock.radius * .55
        );

        ctx.lineTo(
            rock.radius * .25,
            -rock.radius * .7
        );

        ctx.lineTo(
            rock.radius * .55,
            -rock.radius * .1
        );

        ctx.lineTo(
            -rock.radius * .1,
            -rock.radius * .25
        );

        ctx.closePath();

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   MUSHROOMS
========================================================= */

function drawMushrooms() {

    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        const s =
            worldToScreen(
                mushroom.x,
                mushroom.y
            );

        ctx.save();

        ctx.translate(s.x, s.y);

        ctx.fillStyle = "#d4c4a0";

        ctx.fillRect(
            -3,
            0,
            6,
            11
        );

        ctx.fillStyle =
            mushroom.strange
                ? "#773e80"
                : "#8d3939";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            10,
            Math.PI,
            0
        );

        ctx.fill();

        if (mushroom.strange) {

            ctx.fillStyle = "#d5a6e0";

            ctx.beginPath();

            ctx.arc(
                -3,
                -3,
                2,
                0,
                Math.PI * 2
            );

            ctx.arc(
                4,
                -5,
                2,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.restore();
    }
}

/* =========================================================
   RESOURCE OBJECTS
========================================================= */

function drawResources() {

    for (const wood of woods) {

        if (wood.collected) continue;

        const s =
            worldToScreen(
                wood.x,
                wood.y
            );

        ctx.save();

        ctx.translate(s.x, s.y);

        ctx.rotate(-.2);

        ctx.fillStyle = "#6e4429";

        ctx.fillRect(
            -10,
            -4,
            20,
            8
        );

        ctx.fillStyle = "#9c6c40";

        ctx.fillRect(
            -8,
            -2,
            16,
            3
        );

        ctx.restore();
    }

    for (const stone of stones) {

        if (stone.collected) continue;

        const s =
            worldToScreen(
                stone.x,
                stone.y
            );

        ctx.save();

        ctx.translate(s.x, s.y);

        ctx.fillStyle = "#6e746d";

        ctx.beginPath();

        ctx.moveTo(-8, 4);
        ctx.lineTo(-5, -6);
        ctx.lineTo(4, -8);
        ctx.lineTo(9, 1);
        ctx.lineTo(3, 8);
        ctx.lineTo(-6, 7);

        ctx.closePath();

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   SHELTER
========================================================= */

function drawShelter() {

    const s =
        worldToScreen(
            shelter.x,
            shelter.y
        );

    ctx.save();

    ctx.translate(s.x, s.y);

    ctx.fillStyle =
        "rgba(0,0,0,.35)";

    ctx.fillRect(
        -shelter.width / 2 + 10,
        -shelter.height / 2 + 15,
        shelter.width,
        shelter.height
    );

    ctx.fillStyle = "#453528";

    ctx.fillRect(
        -shelter.width / 2,
        -shelter.height / 2,
        shelter.width,
        shelter.height
    );

    ctx.fillStyle = "#2d241e";

    ctx.fillRect(
        -shelter.width / 2 + 10,
        -shelter.height / 2 + 10,
        shelter.width - 20,
        shelter.height - 20
    );

    ctx.fillStyle = "#624731";

    ctx.fillRect(
        -100,
        -50,
        200,
        90
    );

    ctx.fillStyle = "#211c17";

    ctx.fillRect(
        -30,
        0,
        60,
        40
    );

    ctx.fillStyle = "#9a7849";

    ctx.fillRect(
        -5,
        20,
        10,
        10
    );

    ctx.fillStyle = "#837050";

    ctx.font = "12px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
        "ABRIGO",
        0,
        -72
    );

    ctx.restore();
}

/* =========================================================
   CAMPFIRE
========================================================= */

function drawCampfire() {

    const s =
        worldToScreen(
            campfire.x,
            campfire.y
        );

    const glow =
        ctx.createRadialGradient(
            s.x,
            s.y,
            5,
            s.x,
            s.y,
            130
        );

    glow.addColorStop(
        0,
        "rgba(255,170,50,.28)"
    );

    glow.addColorStop(
        1,
        "rgba(255,100,20,0)"
    );

    ctx.fillStyle = glow;

    ctx.beginPath();

    ctx.arc(
        s.x,
        s.y,
        130,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.save();

    ctx.translate(
        s.x,
        s.y
    );

    ctx.fillStyle = "#5d3925";

    ctx.fillRect(
        -20,
        -4,
        40,
        8
    );

    ctx.rotate(.8);

    ctx.fillRect(
        -20,
        -4,
        40,
        8
    );

    ctx.rotate(-.4);

    ctx.fillStyle = "#e47a22";

    ctx.beginPath();

    ctx.moveTo(0, -35);
    ctx.lineTo(-17, 5);
    ctx.lineTo(0, -3);
    ctx.lineTo(15, 5);

    ctx.closePath();

    ctx.fill();

    ctx.fillStyle = "#ffd36b";

    ctx.beginPath();

    ctx.moveTo(0, -24);
    ctx.lineTo(-9, 4);
    ctx.lineTo(0, -2);
    ctx.lineTo(8, 4);

    ctx.closePath();

    ctx.fill();

    ctx.restore();
}

/* =========================================================
   ENEMIES
========================================================= */

function drawEnemies() {

    for (const enemy of enemies) {

        if (enemy.hp <= 0) continue;

        const s =
            worldToScreen(
                enemy.x,
                enemy.y
            );

        ctx.save();

        ctx.translate(
            s.x,
            s.y
        );

        if (enemy.hitTimer > 0) {
            ctx.globalAlpha = .65;
        }

        ctx.fillStyle =
            "rgba(0,0,0,.35)";

        ctx.beginPath();

        ctx.ellipse(
            0,
            15,
            18,
            7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#53623e";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            17,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#333c28";

        ctx.fillRect(
            -12,
            -14,
            24,
            8
        );

        ctx.fillStyle = "#d3c69a";

        ctx.beginPath();

        ctx.moveTo(-10, -11);
        ctx.lineTo(-19, -20);
        ctx.lineTo(-8, -16);

        ctx.closePath();

        ctx.fill();

        ctx.beginPath();

        ctx.moveTo(10, -11);
        ctx.lineTo(19, -20);
        ctx.lineTo(8, -16);

        ctx.closePath();

        ctx.fill();

        ctx.fillStyle = "#d95b49";

        ctx.fillRect(
            -7,
            -2,
            4,
            4
        );

        ctx.fillRect(
            3,
            -2,
            4,
            4
        );

        ctx.fillStyle = "#181913";

        ctx.fillRect(
            -8,
            7,
            16,
            4
        );

        ctx.restore();

        /* barra de vida */

        const hpWidth = 34;

        ctx.fillStyle =
            "rgba(0,0,0,.6)";

        ctx.fillRect(
            s.x - hpWidth / 2,
            s.y - 31,
            hpWidth,
            4
        );

        ctx.fillStyle = "#8d3030";

        ctx.fillRect(
            s.x - hpWidth / 2,
            s.y - 31,
            hpWidth *
            Math.max(
                0,
                enemy.hp / enemy.maxHp
            ),
            4
        );
    }
}

/* =========================================================
   PLAYER
========================================================= */

function drawPlayer() {

    const s =
        worldToScreen(
            player.x,
            player.y
        );

    ctx.save();

    ctx.translate(
        s.x,
        s.y
    );

    if (
        player.invulnerable > 0 &&
        Math.floor(
            player.invulnerable * 20
        ) % 2 === 0
    ) {
        ctx.globalAlpha = .45;
    }

    ctx.fillStyle =
        "rgba(0,0,0,.4)";

    ctx.beginPath();

    ctx.ellipse(
        0,
        15,
        17,
        7,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#20252a";

    ctx.fillRect(
        -9,
        0,
        18,
        20
    );

    ctx.fillStyle = "#b58d70";

    ctx.beginPath();

    ctx.arc(
        0,
        -9,
        10,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#17191c";

    ctx.beginPath();

    ctx.arc(
        0,
        -12,
        11,
        Math.PI,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#c5a27b";

    ctx.fillRect(
        -13,
        2,
        6,
        13
    );

    ctx.fillRect(
        7,
        2,
        6,
        13
    );

    if (player.attackTimer > 0) {

        ctx.save();

        ctx.rotate(
            Math.atan2(
                player.dirY,
                player.dirX
            )
        );

        ctx.strokeStyle = "#d8d7c7";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";

        ctx.beginPath();

        ctx.moveTo(
            8,
            -2
        );

        ctx.lineTo(
            48,
            -17
        );

        ctx.stroke();

        ctx.strokeStyle = "#8b6944";
        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.moveTo(
            7,
            -1
        );

        ctx.lineTo(
            22,
            -1
        );

        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();
}

/* =========================================================
   PARTICLES DRAW
========================================================= */

function drawParticles() {

    for (const p of particles) {

        const s =
            worldToScreen(
                p.x,
                p.y
            );

        ctx.globalAlpha =
            Math.max(
                0,
                p.life / p.maxLife
            );

        if (p.type === "hit") {
            ctx.fillStyle = "#d5b29a";
        }

        else if (p.type === "death") {
            ctx.fillStyle = "#71835a";
        }

        else if (p.type === "dodge") {
            ctx.fillStyle = "#b9b39b";
        }

        else if (p.type === "craft") {
            ctx.fillStyle = "#d6bd70";
        }

        else {
            ctx.fillStyle = "#c7b77a";
        }

        ctx.beginPath();

        ctx.arc(
            s.x,
            s.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.globalAlpha = 1;
    }
}

/* =========================================================
   NIGHT
========================================================= */

function drawNightOverlay() {

    const amount = getNightAmount();

    if (amount <= 0) return;

    ctx.fillStyle =
        `rgba(5,8,18,${amount})`;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    /* luz do jogador */

    const ps =
        worldToScreen(
            player.x,
            player.y
        );

    const light =
        ctx.createRadialGradient(
            ps.x,
            ps.y,
            20,
            ps.x,
            ps.y,
            250
        );

    light.addColorStop(
        0,
        `rgba(0,0,0,${amount})`
    );

    light.addColorStop(
        .35,
        `rgba(0,0,0,${amount * .55})`
    );

    light.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.globalCompositeOperation =
        "destination-out";

    ctx.fillStyle = light;

    ctx.beginPath();

    ctx.arc(
        ps.x,
        ps.y,
        250,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalCompositeOperation =
        "source-over";

    /* luz da fogueira */

    const fire =
        worldToScreen(
            campfire.x,
            campfire.y
        );

    const fireLight =
        ctx.createRadialGradient(
            fire.x,
            fire.y,
            10,
            fire.x,
            fire.y,
            170
        );

    fireLight.addColorStop(
        0,
        `rgba(0,0,0,${amount})`
    );

    fireLight.addColorStop(
        .4,
        `rgba(0,0,0,${amount * .55})`
    );

    fireLight.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.globalCompositeOperation =
        "destination-out";

    ctx.fillStyle = fireLight;

    ctx.beginPath();

    ctx.arc(
        fire.x,
        fire.y,
        170,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalCompositeOperation =
        "source-over";
}

/* =========================================================
   VIGNETTE
========================================================= */

function drawVignette() {

    const gradient =
        ctx.createRadialGradient(
            W / 2,
            H / 2,
            Math.min(W, H) * .25,
            W / 2,
            H / 2,
            Math.max(W, H) * .7
        );

    gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,.45)"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );
}

/* =========================================================
   RENDER
========================================================= */

function render() {

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
        shakeX,
        shakeY
    );

    drawGround();

    drawShelter();

    drawCampfire();

    drawResources();

    drawMushrooms();

    drawTrees();

    drawRocks();

    drawEnemies();

    drawParticles();

    drawPlayer();

    ctx.restore();

    drawNightOverlay();

    drawVignette();
}

/* =========================================================
   MAIN LOOP
========================================================= */

let lastTime = performance.now();

function gameLoop(now) {

    const dt =
        Math.min(
            (now - lastTime) / 1000,
            .05
        );

    lastTime = now;

    gameTime += dt;

    updateWorldTime(dt);

    updatePlayer(dt);

    updateEnemies(dt);

    updateParticles(dt);

    updateCamera(dt);

    updateMessage(dt);

    updateQuest();

    updateHUD();

    render();

    requestAnimationFrame(gameLoop);
}

/* =========================================================
   BUTTONS
========================================================= */

document
    .getElementById("attackButton")
    .addEventListener(
        "pointerdown",
        attack
    );

document
    .getElementById("dodgeButton")
    .addEventListener(
        "pointerdown",
        dodge
    );

document
    .getElementById("interactButton")
    .addEventListener(
        "pointerdown",
        interact
    );

/* =========================================================
   START
========================================================= */

updateHUD();
updateInventoryUI();

setTimeout(() => {

    const loading =
        document.getElementById("loading");

    loading.style.opacity = "0";

    setTimeout(() => {
        loading.style.display = "none";
    }, 700);

}, 900);

showMessage(
    "A floresta está silenciosa..."
);

requestAnimationFrame(gameLoop);
