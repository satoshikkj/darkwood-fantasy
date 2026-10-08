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

function insideShelter(x, y, margin = 0) {
    return (
        x > shelter.x - shelter.width / 2 - margin &&
        x < shelter.x + shelter.width / 2 + margin &&
        y > shelter.y - shelter.height / 2 - margin &&
        y < shelter.y + shelter.height / 2 + margin
    );
}

/* =========================================================
   WORLD GENERATION
========================================================= */

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

        woods.push({
            x: random(80, world.width - 80),
            y: random(80, world.height - 80),
            radius: 8,
            collected: false
        });
    }

    for (let i = 0; i < 50; i++) {

        stones.push({
            x: random(80, world.width - 80),
            y: random(80, world.height - 80),
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
   INPUT
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

    if (e.key === "Escape") {
        if (V5.dialogue) {
            V5.dialogue = null;
        }
    }
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

/* =========================================================
   JOYSTICK
========================================================= */

let joystick = {
    active: false,
    x: 0,
    y: 0
};

const joystickElement = document.getElementById("joystick");
const joystickKnob = document.getElementById("joystickKnob");

function updateJoystick(clientX, clientY) {

    if (!joystickElement) return;

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

    if (joystickKnob) {
        joystickKnob.style.transform =
            `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
}

if (joystickElement) {

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
}

function resetJoystick() {

    joystick.active = false;
    joystick.x = 0;
    joystick.y = 0;

    if (joystickKnob) {
        joystickKnob.style.transform =
            "translate(-50%, -50%)";
    }
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

    if (!inventoryPanel) return;

    inventoryOpen = !inventoryOpen;

    inventoryPanel.classList.toggle(
        "open",
        inventoryOpen
    );

    updateInventoryUI();
}

function updateInventoryUI() {

    const values = {
        invWood: resources.wood,
        invStone: resources.stone,
        invMushroom: resources.mushroom,
        invStrange: resources.strange
    };

    for (const id in values) {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = values[id];
        }
    }
}

if (inventoryButton) {
    inventoryButton.addEventListener(
        "click",
        toggleInventory
    );
}

if (closeInventory) {
    closeInventory.addEventListener(
        "click",
        toggleInventory
    );
}

if (inventoryPanel) {

    inventoryPanel.addEventListener("pointerdown", e => {

        if (e.target === inventoryPanel) {
            toggleInventory();
        }
    });
}

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

            if (recipe) {
                craft(button.dataset.recipe, recipe);
            }
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
    if (V5.dialogue) return;

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

        enemy.x +=
            dx / Math.max(dist, 1) * 25;

        enemy.y +=
            dy / Math.max(dist, 1) * 25;

        createHitParticles(
            enemy.x,
            enemy.y
        );

        if (enemy.hp <= 0) {

            resources.wood++;

            createDeathParticles(
                enemy.x,
                enemy.y
            );

            showMessage(
                "Goblins derrotados."
            );
        }
    }

    updateHUD();
}

/* =========================================================
   DODGE
========================================================= */

function dodge() {

    if (V5.dialogue) return;

    if (player.dodgeCooldown > 0) return;

    if (player.stamina < 25) {

        showMessage("Sem energia.");

        return;
    }

    let dx = joystick.x;
    let dy = joystick.y;

    if (
        Math.abs(dx) < .1 &&
        Math.abs(dy) < .1
    ) {

        dx =
            (keys["d"] || keys["arrowright"] ? 1 : 0) -
            (keys["a"] || keys["arrowleft"] ? 1 : 0);

        dy =
            (keys["s"] || keys["arrowdown"] ? 1 : 0) -
            (keys["w"] || keys["arrowup"] ? 1 : 0);
    }

    const len = Math.hypot(dx, dy);

    if (len < .1) {

        dx = player.dirX;
        dy = player.dirY;
    } else {

        dx /= len;
        dy /= len;
    }

    player.stamina -= 25;

    player.dodgeCooldown = .7;
    player.dodgeTimer = .22;
    player.invulnerable = .25;

    player.x += dx * 75;
    player.y += dy * 75;

    player.x =
        Math.max(30, Math.min(world.width - 30, player.x));

    player.y =
        Math.max(30, Math.min(world.height - 30, player.y));

    camera.shake = 3;

    createDodgeParticles();
}

/* =========================================================
   INTERACTION
========================================================= */

function interact() {

    if (V5.dialogue) {

        dialogueAdvance();

        return;
    }

    const elderDistance =
        Math.hypot(
            player.x - V5.elder.x,
            player.y - V5.elder.y
        );

    if (
        V5.elder.active &&
        elderDistance < 75
    ) {

        interactElder();

        return;
    }

    let nearest = null;
    let nearestDistance = Infinity;
    let nearestType = null;

    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        const d =
            Math.hypot(
                player.x - mushroom.x,
                player.y - mushroom.y
            );

        if (d < nearestDistance) {

            nearest = mushroom;
            nearestDistance = d;
            nearestType = "mushroom";
        }
    }

    for (const wood of woods) {

        if (wood.collected) continue;

        const d =
            Math.hypot(
                player.x - wood.x,
                player.y - wood.y
            );

        if (d < nearestDistance) {

            nearest = wood;
            nearestDistance = d;
            nearestType = "wood";
        }
    }

    for (const stone of stones) {

        if (stone.collected) continue;

        const d =
            Math.hypot(
                player.x - stone.x,
                player.y - stone.y
            );

        if (d < nearestDistance) {

            nearest = stone;
            nearestDistance = d;
            nearestType = "stone";
        }
    }

    if (
        nearest &&
        nearestDistance <= 55
    ) {

        collectObject(
            nearest,
            nearestType
        );

        return;
    }

    if (
        Math.abs(player.x - shelter.x) < 180 &&
        Math.abs(player.y - shelter.y) < 150
    ) {

        showMessage(
            "Abrigo: local seguro."
        );

    } else {

        showMessage(
            "Não há nada para interagir aqui."
        );
    }
}

/* =========================================================
   COLLECTION
========================================================= */

function collectObject(obj, type) {

    obj.collected = true;

    if (type === "mushroom") {

        if (obj.strange) {

            resources.strange++;

            if (questStage === 0) {
                questStage = 1;

                showMessage(
                    "O cogumelo estranho está reagindo."
                );
            }

        } else {

            resources.mushroom++;

            showMessage(
                "Cogumelo coletado."
            );
        }
    }

    if (type === "wood") {

        resources.wood++;

        showMessage(
            "Madeira coletada."
        );
    }

    if (type === "stone") {

        resources.stone++;

        showMessage(
            "Pedra coletada."
        );
    }

    for (let i = 0; i < 10; i++) {

        particles.push({
            x: obj.x,
            y: obj.y,

            vx: random(-70, 70),
            vy: random(-100, 20),

            life: random(.3, .7),
            maxLife: .7,

            size: random(2, 5),

            type: "collect"
        });
    }

    updateHUD();
    updateInventoryUI();
}

/* =========================================================
   DAMAGE
========================================================= */

function damagePlayer(amount, enemy) {

    if (player.invulnerable > 0) return;

    player.hp -= amount;

    player.hurtTimer = .2;

    camera.shake = 7;

    if (enemy) {

        const dx =
            player.x - enemy.x;

        const dy =
            player.y - enemy.y;

        const d =
            Math.hypot(dx, dy) || 1;

        player.x +=
            dx / d * 18;

        player.y +=
            dy / d * 18;
    }

    for (let i = 0; i < 8; i++) {

        particles.push({
            x: player.x,
            y: player.y,

            vx: random(-90, 90),
            vy: random(-90, 90),

            life: random(.2, .5),
            maxLife: .5,

            size: random(2, 5),

            type: "damage"
        });
    }

    if (player.hp <= 0) {

        player.hp = player.maxHp;
        player.stamina = player.maxStamina;

        player.x = shelter.x;
        player.y = shelter.y + 50;

        showMessage(
            "Você acordou novamente no abrigo."
        );
    }

    updateHUD();
}

/* =========================================================
   ENEMIES
========================================================= */

function updateEnemies(dt) {

    for (const enemy of enemies) {

        if (enemy.hp <= 0) continue;

        enemy.hitTimer =
            Math.max(0, enemy.hitTimer - dt);

        enemy.attackCooldown -= dt;
        enemy.wanderTimer -= dt;

        const dx =
            player.x - enemy.x;

        const dy =
            player.y - enemy.y;

        const d =
            Math.hypot(dx, dy);

        if (d < 320) {

            const nx =
                dx / Math.max(d, 1);

            const ny =
                dy / Math.max(d, 1);

            const nextX =
                enemy.x +
                nx *
                enemy.speed *
                dt;

            const nextY =
                enemy.y +
                ny *
                enemy.speed *
                dt;

            if (!isBlocked(
                nextX,
                enemy.y,
                enemy.radius
            )) {
                enemy.x = nextX;
            }

            if (!isBlocked(
                enemy.x,
                nextY,
                enemy.radius
            )) {
                enemy.y = nextY;
            }

            if (
                d < 32 &&
                enemy.attackCooldown <= 0
            ) {

                enemy.attackCooldown = 1.1;

                damagePlayer(
                    10,
                    enemy
                );
            }

        } else {

            if (enemy.wanderTimer <= 0) {

                enemy.wanderTimer =
                    random(1, 4);

                enemy.dirX =
                    random(-1, 1);

                enemy.dirY =
                    random(-1, 1);

                const len =
                    Math.hypot(
                        enemy.dirX,
                        enemy.dirY
                    );

                if (len > 0) {

                    enemy.dirX /= len;
                    enemy.dirY /= len;
                }
            }

            enemy.x +=
                enemy.dirX *
                enemy.speed *
                .3 *
                dt;

            enemy.y +=
                enemy.dirY *
                enemy.speed *
                .3 *
                dt;
        }

        enemy.x =
            Math.max(
                30,
                Math.min(
                    world.width - 30,
                    enemy.x
                )
            );

        enemy.y =
            Math.max(
                30,
                Math.min(
                    world.height - 30,
                    enemy.y
                )
            );
    }
}

/* =========================================================
   PLAYER UPDATE
========================================================= */

function updatePlayer(dt) {

    player.attackCooldown =
        Math.max(
            0,
            player.attackCooldown - dt
        );

    player.attackTimer =
        Math.max(
            0,
            player.attackTimer - dt
        );

    player.dodgeCooldown =
        Math.max(
            0,
            player.dodgeCooldown - dt
        );

    player.dodgeTimer =
        Math.max(
            0,
            player.dodgeTimer - dt
        );

    player.invulnerable =
        Math.max(
            0,
            player.invulnerable - dt
        );

    player.hurtTimer =
        Math.max(
            0,
            player.hurtTimer - dt
        );

    if (V5.dialogue) return;

    let moveX = 0;
    let moveY = 0;

    if (keys["w"] || keys["arrowup"])
        moveY -= 1;

    if (keys["s"] || keys["arrowdown"])
        moveY += 1;

    if (keys["a"] || keys["arrowleft"])
        moveX -= 1;

    if (keys["d"] || keys["arrowright"])
        moveX += 1;

    if (
        Math.abs(joystick.x) > .05 ||
        Math.abs(joystick.y) > .05
    ) {

        moveX = joystick.x;
        moveY = joystick.y;
    }

    const len =
        Math.hypot(moveX, moveY);

    if (len > 1) {

        moveX /= len;
        moveY /= len;
    }

    if (
        Math.abs(moveX) > .05 ||
        Math.abs(moveY) > .05
    ) {

        player.dirX = moveX;
        player.dirY = moveY;
    }

    const speed =
        player.dodgeTimer > 0
            ? player.speed * 2.8
            : player.speed;

    const nextX =
        player.x +
        moveX *
        speed *
        dt;

    const nextY =
        player.y +
        moveY *
        speed *
        dt;

    if (
        !isBlocked(
            nextX,
            player.y,
            player.radius
        )
    ) {
        player.x = nextX;
    }

    if (
        !isBlocked(
            player.x,
            nextY,
            player.radius
        )
    ) {
        player.y = nextY;
    }

    player.x =
        Math.max(
            30,
            Math.min(
                world.width - 30,
                player.x
            )
        );

    player.y =
        Math.max(
            30,
            Math.min(
                world.height - 30,
                player.y
            )
        );

    player.stamina =
        Math.min(
            player.maxStamina,
            player.stamina + 24 * dt
        );
}

/* =========================================================
   QUEST ORIGINAL
========================================================= */

function updateQuest() {

    if (
        questStage === 1 &&
        Math.abs(player.x - shelter.x) < 180 &&
        Math.abs(player.y - shelter.y) < 150
    ) {

        questStage = 2;

        showMessage(
            "O abrigo parece diferente..."
        );
    }

    if (
        questStage >= 4 &&
        questStage < 6
    ) {

        const found =
            V5.ancientStones.filter(
                stone => stone.discovered
            ).length;

        if (found >= 3) {

            questStage = 6;

            showMessage(
                "Você descobriu o segredo das pedras antigas."
            );
        }
    }

    if (
        questStage === 6 &&
        Math.abs(player.x - V5.elder.x) < 80 &&
        Math.abs(player.y - V5.elder.y) < 80
    ) {

        if (!V5.questComplete) {

            V5.questComplete = true;
            questStage = 7;

            V5.gold += 20;
            resources.mushroom += 5;

            V5.flash = 1;

            showMessage(
                "MISSÃO CONCLUÍDA — O Cogumelo que Sussurra"
            );
        }
    }
}

/* =========================================================
   DAY / NIGHT
========================================================= */

function updateDayNight(dt) {

    worldTime += dt;

    const cycle = 180;

    if (worldTime >= cycle) {

        worldTime -= cycle;

        day++;
    }

    gameTime =
        worldTime / cycle;
}

/* =========================================================
   CAMERA
========================================================= */

function updateCamera(dt) {

    camera.x +=
        (player.x - camera.x) *
        Math.min(1, dt * 6);

    camera.y +=
        (player.y - camera.y) *
        Math.min(1, dt * 6);

    camera.x =
        Math.max(
            W / 2,
            Math.min(
                world.width - W / 2,
                camera.x
            )
        );

    camera.y =
        Math.max(
            H / 2,
            Math.min(
                world.height - H / 2,
                camera.y
            )
        );

    camera.shake =
        Math.max(
            0,
            camera.shake - dt * 18
        );
}

/* =========================================================
   PARTICLES
========================================================= */

function updateParticles(dt) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= .97;
        p.vy *= .97;

        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

/* =========================================================
   MESSAGES
========================================================= */

function showMessage(text, duration = 2.5) {

    messageText = text;
    messageTimer = duration;
}

/* Compatibilidade */
function message(text, duration = 2.5) {
    showMessage(text, duration);
}

/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    const hpBar =
        document.getElementById("hpBar");

    const staminaBar =
        document.getElementById("staminaBar");

    const dayText =
        document.getElementById("dayText");

    const resourcesText =
        document.getElementById("resourceText");

    const questText =
        document.getElementById("questText");

    if (hpBar) {

        hpBar.style.width =
            `${Math.max(
                0,
                player.hp /
                player.maxHp *
                100
            )}%`;
    }

    if (staminaBar) {

        staminaBar.style.width =
            `${Math.max(
                0,
                player.stamina /
                player.maxStamina *
                100
            )}%`;
    }

    if (dayText) {

        const phase =
            worldTime / 180;

        dayText.textContent =
            phase > .25 &&
            phase < .75
                ? `☀️ Dia ${day}`
                : `🌙 Noite — Dia ${day}`;
    }

    if (resourcesText) {

        resourcesText.textContent =
            `🪵 ${resources.wood}   ` +
            `🪨 ${resources.stone}   ` +
            `🍄 ${resources.mushroom}   ` +
            `✨ ${resources.strange}`;
    }

    if (questText) {

        if (questStage === 0) {

            questText.textContent =
                "Explore a floresta e encontre um cogumelo estranho.";
        }

        else if (questStage === 1) {

            questText.textContent =
                "O cogumelo estranho está reagindo. Volte ao abrigo.";
        }

        else if (questStage === 2) {

            questText.textContent =
                "Fale com o Ancião próximo ao abrigo.";
        }

        else if (questStage === 3) {

            questText.textContent =
                "Converse com o Ancião e escolha seu caminho.";
        }

        else if (
            questStage >= 4 &&
            questStage < 6
        ) {

            const found =
                V5.ancientStones.filter(
                    stone => stone.discovered
                ).length;

            questText.textContent =
                `Procure as pedras antigas (${found}/3).`;
        }

        else if (questStage === 6) {

            questText.textContent =
                "Retorne ao Ancião.";
        }

        else if (V5.questComplete) {

            questText.textContent =
                "A história da floresta apenas começou...";
        }

        else {

            questText.textContent =
                "Continue explorando a floresta.";
        }
    }
}

/* =========================================================
   DRAW GROUND
========================================================= */

function drawGround() {

    ctx.fillStyle = "#172018";

    ctx.fillRect(
        0,
        0,
        world.width,
        world.height
    );

    for (
        let x = 0;
        x < world.width;
        x += 80
    ) {

        for (
            let y = 0;
            y < world.height;
            y += 80
        ) {

            ctx.fillStyle =
                ((x / 80 + y / 80) % 2 === 0)
                    ? "#19231a"
                    : "#182019";

            ctx.fillRect(
                x,
                y,
                80,
                80
            );
        }
    }
}

/* =========================================================
   TREES
========================================================= */

function drawTrees() {

    for (const tree of trees) {

        ctx.save();

        ctx.translate(
            tree.x,
            tree.y
        );

        ctx.fillStyle =
            "#3b261a";

        ctx.fillRect(
            -tree.radius * .25,
            0,
            tree.radius * .5,
            tree.radius * 1.6
        );

        ctx.fillStyle =
            "#19391f";

        ctx.beginPath();

        ctx.arc(
            0,
            -tree.radius * .3,
            tree.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#245229";

        ctx.beginPath();

        ctx.arc(
            -tree.radius * .4,
            -tree.radius * .65,
            tree.radius * .55,
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

        ctx.fillStyle =
            "#4d524e";

        ctx.beginPath();

        ctx.ellipse(
            rock.x,
            rock.y,
            rock.radius,
            rock.radius * .7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#70756f";

        ctx.beginPath();

        ctx.arc(
            rock.x - rock.radius * .25,
            rock.y - rock.radius * .2,
            rock.radius * .3,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

/* =========================================================
   MUSHROOMS
========================================================= */

function drawMushrooms() {

    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        ctx.save();

        ctx.translate(
            mushroom.x,
            mushroom.y
        );

        ctx.fillStyle =
            "#ded6b7";

        ctx.fillRect(
            -3,
            2,
            6,
            14
        );

        ctx.fillStyle =
            mushroom.strange
                ? "#7d2cff"
                : "#a94444";

        ctx.beginPath();

        ctx.arc(
            0,
            2,
            10,
            Math.PI,
            0
        );

        ctx.fill();

        ctx.fillStyle =
            "#f2e8c8";

        for (let i = 0; i < 3; i++) {

            ctx.beginPath();

            ctx.arc(
                random(-6, 6),
                random(-3, 2),
                1.5,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.restore();
    }
}

/* =========================================================
   RESOURCES
========================================================= */

function drawResources() {

    for (const wood of woods) {

        if (wood.collected) continue;

        ctx.save();

        ctx.translate(
            wood.x,
            wood.y
        );

        ctx.rotate(.3);

        ctx.fillStyle =
            "#76502d";

        ctx.fillRect(
            -12,
            -4,
            24,
            8
        );

        ctx.restore();
    }

    for (const stone of stones) {

        if (stone.collected) continue;

        ctx.fillStyle =
            "#6d716d";

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

/* =========================================================
   SHELTER
========================================================= */

function drawShelter() {

    ctx.save();

    ctx.translate(
        shelter.x,
        shelter.y
    );

    ctx.fillStyle =
        "#513521";

    ctx.fillRect(
        -shelter.width / 2,
        -shelter.height / 2,
        shelter.width,
        shelter.height
    );

    ctx.fillStyle =
        "#2d1b16";

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

    ctx.fillStyle =
        "#1b1411";

    ctx.fillRect(
        -28,
        15,
        56,
        75
    );

    ctx.restore();
}

/* =========================================================
   CAMPFIRE
========================================================= */

function drawCampfire() {

    const flicker =
        Math.sin(
            performance.now() * .015
        ) * 3;

    ctx.save();

    ctx.translate(
        campfire.x,
        campfire.y
    );

    ctx.shadowBlur = 35;
    ctx.shadowColor =
        "#ff9d42";

    ctx.fillStyle =
        "#f39a35";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        campfire.radius + flicker,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#ffdf70";

    ctx.beginPath();

    ctx.moveTo(
        0,
        -25
    );

    ctx.lineTo(
        13,
        5
    );

    ctx.lineTo(
        0,
        19
    );

    ctx.lineTo(
        -13,
        5
    );

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

        ctx.save();

        ctx.translate(
            enemy.x,
            enemy.y
        );

        if (enemy.hitTimer > 0) {
            ctx.globalAlpha = .55;
        }

        ctx.fillStyle =
            "#56753b";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            enemy.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#27341f";

        ctx.beginPath();

        ctx.arc(
            -6,
            -3,
            3,
            0,
            Math.PI * 2
        );

        ctx.arc(
            6,
            -3,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#9a3737";

        ctx.beginPath();

        ctx.arc(
            0,
            5,
            4,
            0,
            Math.PI
        );

        ctx.fill();

        ctx.restore();

        if (enemy.hp < enemy.maxHp) {

            ctx.fillStyle =
                "#321616";

            ctx.fillRect(
                enemy.x - 18,
                enemy.y - 28,
                36,
                4
            );

            ctx.fillStyle =
                "#c94a4a";

            ctx.fillRect(
                enemy.x - 18,
                enemy.y - 28,
                36 *
                (enemy.hp /
                enemy.maxHp),
                4
            );
        }
    }
}

/* =========================================================
   PLAYER
========================================================= */

function drawPlayer() {

    ctx.save();

    ctx.translate(
        player.x,
        player.y
    );

    const moving =
        Math.abs(joystick.x) > .05 ||
        keys["w"] ||
        keys["a"] ||
        keys["s"] ||
        keys["d"] ||
        keys["arrowup"] ||
        keys["arrowdown"] ||
        keys["arrowleft"] ||
        keys["arrowright"];

    const bob =
        moving
            ? Math.sin(
                performance.now() * .018
            ) * 2
            : 0;

    ctx.translate(
        0,
        bob
    );

    if (
        player.invulnerable > 0
    ) {

        ctx.globalAlpha = .55;
    }

    ctx.fillStyle =
        "#111820";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        15,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#263746";

    ctx.fillRect(
        -10,
        2,
        20,
        18
    );

    ctx.fillStyle =
        "#d1a57a";

    ctx.beginPath();

    ctx.arc(
        0,
        -13,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#111";

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
            Math.atan2(
                player.dirY,
                player.dirX
            );

        ctx.rotate(angle);

        ctx.translate(
            24,
            0
        );

        ctx.rotate(
            -.8 +
            (.16 -
            player.attackTimer) *
            8
        );

        ctx.fillStyle =
            "#65462c";

        ctx.fillRect(
            -4,
            -2,
            14,
            4
        );

        ctx.fillStyle =
            "#d7dce2";

        ctx.beginPath();

        ctx.moveTo(
            5,
            -4
        );

        ctx.lineTo(
            48,
            -4
        );

        ctx.lineTo(
            57,
            0
        );

        ctx.lineTo(
            48,
            4
        );

        ctx.lineTo(
            5,
            4
        );

        ctx.closePath();

        ctx.fill();

        ctx.restore();
    }

    ctx.restore();
}

/* =========================================================
   PARTICLES
========================================================= */

function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha =
            Math.max(
                0,
                Math.min(
                    1,
                    p.life /
                    p.maxLife
                )
            );

        if (p.type === "hit") {
            ctx.fillStyle = "#d95c5c";
        }

        else if (p.type === "damage") {
            ctx.fillStyle = "#e74c4c";
        }

        else if (p.type === "death") {
            ctx.fillStyle = "#87a84f";
        }

        else if (p.type === "collect") {
            ctx.fillStyle = "#e7cf70";
        }

        else if (p.type === "craft") {
            ctx.fillStyle = "#9f7cff";
        }

        else {
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

function createHitParticles(x, y) {

    for (let i = 0; i < 10; i++) {

        particles.push({
            x,
            y,

            vx: random(-100, 100),
            vy: random(-100, 100),

            life: random(.2, .5),
            maxLife: .5,

            size: random(2, 5),

            type: "hit"
        });
    }
}

function createDeathParticles(x, y) {

    for (let i = 0; i < 20; i++) {

        particles.push({
            x,
            y,

            vx: random(-130, 130),
            vy: random(-130, 130),

            life: random(.4, 1),
            maxLife: 1,

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

            life: random(.2, .5),
            maxLife: .5,

            size: random(2, 4),

            type: "dodge"
        });
    }
}

/* =========================================================
   NIGHT
========================================================= */

function drawNight() {

    const phase =
        worldTime / 180;

    let darkness = 0;

    if (phase < .2) {
        darkness = 0;
    }

    else if (phase < .35) {
        darkness =
            (phase - .2) /
            .15 *
            .5;
    }

    else if (phase < .7) {
        darkness = .5;
    }

    else if (phase < .85) {
        darkness =
            .5 -
            ((phase - .7) /
            .15 *
            .5);
    }

    else {
        darkness = 0;
    }

    if (darkness <= 0) return;

    ctx.fillStyle =
        `rgba(5,8,20,${darkness})`;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    const px =
        player.x -
        camera.x +
        W / 2;

    const py =
        player.y -
        camera.y +
        H / 2;

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
        "rgba(255,255,255,.10)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );
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

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );
}

/* =========================================================
   V5 — EXTENDED SYSTEMS
========================================================= */

const V5 = {

    initialized: false,

    elder: {
        x: 1940,
        y: 1210,
        radius: 18,
        active: true
    },

    dialogue: null,

    gold: 0,

    level: 1,
    xp: 0,
    xpNext: 100,

    hunger: 100,
    thirst: 100,

    weather: "clear",
    weatherTimer: 60,
    weatherIntensity: 0,

    playerClass: null,
    classChosen: false,

    questComplete: false,

    flash: 0,

    paused: false,

    ancientStones: [],

    crystalObjects: [],

    chests: [],

    animals: [],

    fireflies: [],

    shrine: {
        x: 2550,
        y: 950,
        active: true
    },

    injuredGoblin: {
        x: 2600,
        y: 1100,
        hp: 30,
        active: true,
        helped: false
    },

    specialMushroom: {
        x: 2350,
        y: 950,
        active: true
    }
};

/* =========================================================
   V5 — WORLD CONTENT
========================================================= */

function generateV5World() {

    V5.ancientStones = [
        {
            x: 2350,
            y: 800,
            discovered: false
        },

        {
            x: 2700,
            y: 850,
            discovered: false
        },

        {
            x: 2900,
            y: 1150,
            discovered: false
        }
    ];

    V5.crystalObjects = [
        {
            x: 2200,
            y: 900,
            collected: false,
            type: "purple"
        },

        {
            x: 2800,
            y: 1000,
            collected: false,
            type: "blue"
        },

        {
            x: 2450,
            y: 1250,
            collected: false,
            type: "green"
        }
    ];

    V5.chests = [
        {
            x: 2250,
            y: 1100,
            opened: false,
            gold: 8
        },

        {
            x: 2900,
            y: 1350,
            opened: false,
            gold: 15
        }
    ];

    V5.animals = [];

    for (let i = 0; i < 8; i++) {

        V5.animals.push({
            x: random(500, world.width - 500),
            y: random(500, world.height - 500),
            dirX: random(-1, 1),
            dirY: random(-1, 1),
            timer: random(1, 4),
            type: i % 2 === 0
                ? "deer"
                : "rabbit"
        });
    }

    V5.fireflies = [];

    for (let i = 0; i < 35; i++) {

        V5.fireflies.push({
            x: random(400, world.width - 400),
            y: random(400, world.height - 400),
            phase: random(0, Math.PI * 2)
        });
    }
}

generateV5World();

/* =========================================================
   V5 — EXPERIENCE
========================================================= */

function gainXP(amount) {

    if (amount <= 0) return;

    V5.xp += amount;

    while (V5.xp >= V5.xpNext) {

        V5.xp -= V5.xpNext;

        V5.level++;

        V5.xpNext =
            Math.floor(
                V5.xpNext * 1.35
            );

        player.maxHp += 8;
        player.hp = player.maxHp;

        player.maxStamina += 5;
        player.stamina = player.maxStamina;

        V5.flash = 1;

        showMessage(
            `Você alcançou o nível ${V5.level}!`
        );
    }

    updateHUD();
}

/* =========================================================
   V5 — HUNGER / THIRST
========================================================= */

function updateSurvival(dt) {

    if (V5.dialogue) return;

    V5.hunger -= dt * .7;
    V5.thirst -= dt * 1.0;

    V5.hunger =
        Math.max(
            0,
            V5.hunger
        );

    V5.thirst =
        Math.max(
            0,
            V5.thirst
        );

    if (
        V5.hunger <= 0 ||
        V5.thirst <= 0
    ) {

        player.hp -= dt * .8;

        if (player.hp <= 0) {

            player.hp =
                player.maxHp;

            V5.hunger = 70;
            V5.thirst = 70;

            player.x =
                shelter.x;

            player.y =
                shelter.y + 50;

            showMessage(
                "Você desmaiou de exaustão."
            );
        }
    }
}

/* =========================================================
   V5 — FOOD
========================================================= */

function consumeMushroom() {

    if (resources.mushroom <= 0) {

        showMessage(
            "Você não possui cogumelos."
        );

        return;
    }

    resources.mushroom--;

    V5.hunger =
        Math.min(
            100,
            V5.hunger + 18
        );

    player.hp =
        Math.min(
            player.maxHp,
            player.hp + 5
        );

    showMessage(
        "Você comeu um cogumelo."
    );

    updateHUD();
    updateInventoryUI();
}

/* =========================================================
   V5 — ELDER
========================================================= */

function drawElderV5() {

    if (!V5.elder.active) return;

    const d =
        Math.hypot(
            player.x - V5.elder.x,
            player.y - V5.elder.y
        );

    ctx.save();

    ctx.translate(
        V5.elder.x,
        V5.elder.y
    );

    const pulse =
        1 +
        Math.sin(
            performance.now() * .004
        ) * .04;

    ctx.scale(
        pulse,
        pulse
    );

    ctx.shadowBlur = 15;
    ctx.shadowColor =
        "#9c73d6";

    ctx.fillStyle =
        "#59466b";

    ctx.beginPath();

    ctx.arc(
        0,
        4,
        17,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle =
        "#d0a87f";

    ctx.beginPath();

    ctx.arc(
        0,
        -14,
        11,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#e4ddd0";

    ctx.beginPath();

    ctx.arc(
        0,
        -18,
        13,
        Math.PI,
        0
    );

    ctx.fill();

    ctx.fillStyle =
        "#292032";

    ctx.fillRect(
        -6,
        -15,
        4,
        3
    );

    ctx.fillRect(
        2,
        -15,
        4,
        3
    );

    ctx.fillStyle =
        "#704b2d";

    ctx.fillRect(
        16,
        -2,
        4,
        38
    );

    ctx.fillStyle =
        "#a88046";

    ctx.beginPath();

    ctx.arc(
        18,
        -5,
        6,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    if (
        d < 100 &&
        !V5.dialogue
    ) {

        ctx.save();

        ctx.textAlign =
            "center";

        ctx.font =
            "bold 14px sans-serif";

        ctx.fillStyle =
            "#e9ddff";

        ctx.shadowBlur = 8;
        ctx.shadowColor =
            "#000";

        ctx.fillText(
            "E — Falar",
            V5.elder.x,
            V5.elder.y - 42
        );

        ctx.restore();
    }
}

/* =========================================================
   V5 — DIALOGUE
========================================================= */

function startDialogue(
    speaker,
    text,
    choices = [],
    callback = null
) {

    V5.dialogue = {

        speaker,

        text,

        chars: 0,

        timer: 0,

        finished: false,

        choices,

        selected: 0,

        callback
    };
}

function dialogueAdvance() {

    const d = V5.dialogue;

    if (!d) return;

    if (!d.finished) {

        d.chars =
            d.text.length;

        d.finished = true;

        return;
    }

    if (d.choices.length > 0) {

        chooseDialogue(
            d.selected
        );

        return;
    }

    if (typeof d.callback === "function") {
        d.callback();
    }

    V5.dialogue = null;
}

function chooseDialogue(index) {

    const d =
        V5.dialogue;

    if (!d) return;

    const choice =
        d.choices[index];

    if (!choice) return;

    if (typeof choice.action === "function") {
        choice.action();
    }

    V5.dialogue = null;
}

/* =========================================================
   V5 — ELDER INTERACTION
========================================================= */

function interactElder() {

    if (V5.questComplete) {

        startDialogue(
            "Eldran",
            "Você voltou. A floresta ainda está observando você..."
        );

        return;
    }

    if (questStage === 0) {

        startDialogue(
            "Eldran",
            "A floresta não costuma aceitar visitantes. Mas você... parece ter sido escolhido."
        );

        questStage = 1;

        return;
    }

    if (questStage === 1) {

        if (resources.strange <= 0) {

            startDialogue(
                "Eldran",
                "Procure o cogumelo estranho. Ele estará em algum lugar além das árvores."
            );

            return;
        }

        questStage = 2;

        startDialogue(
            "Eldran",
            "Então você encontrou. Eu sabia que era apenas questão de tempo."
        );

        return;
    }

    if (questStage === 2) {

        startDialogue(
            "Eldran",
            "Aquele cogumelo não é apenas uma planta. Ele é uma porta."
        );

        questStage = 3;

        return;
    }

    if (questStage === 3) {

        startDialogue(
            "Eldran",
            "Há três pedras antigas espalhadas pela floresta. Descubra o que elas estão escondendo.",
            [
                {
                    text: "Vou investigar.",
                    action: () => {

                        questStage = 4;

                        showMessage(
                            "Nova missão: investigar as pedras antigas."
                        );
                    }
                },

                {
                    text: "Não quero me envolver.",
                    action: () => {

                        questStage = 5;

                        showMessage(
                            "Você decidiu ignorar o aviso."
                        );
                    }
                }
            ]
        );

        return;
    }

    if (questStage === 4) {

        const count =
            V5.ancientStones.filter(
                s => s.discovered
            ).length;

        startDialogue(
            "Eldran",
            `Você descobriu ${count} de 3 pedras. Continue procurando.`
        );

        return;
    }

    if (questStage === 5) {

        startDialogue(
            "Eldran",
            "Algumas escolhas não podem ser desfeitas..."
        );

        return;
    }

    if (questStage === 6) {

        V5.questComplete = true;

        V5.gold += 20;

        resources.mushroom += 5;

        gainXP(100);

        questStage = 7;

        V5.flash = 1;

        startDialogue(
            "Eldran",
            "Você voltou vivo. Mas agora sabe que existe algo escondido sob a floresta."
        );

        showMessage(
            "MISSÃO CONCLUÍDA — O Cogumelo que Sussurra"
        );

        updateHUD();

        return;
    }
}

/* =========================================================
   V5 — ANCIENT STONES
========================================================= */

function updateAncientStones() {

    if (
        questStage < 4 ||
        questStage > 6
    ) return;

    for (
        const stone
        of V5.ancientStones
    ) {

        if (stone.discovered) continue;

        const d =
            Math.hypot(
                player.x - stone.x,
                player.y - stone.y
            );

        if (d < 55) {

            stone.discovered = true;

            gainXP(30);

            V5.flash = .5;

            createMagicParticles(
                stone.x,
                stone.y
            );

            const found =
                V5.ancientStones.filter(
                    s => s.discovered
                ).length;

            showMessage(
                `Pedra antiga descoberta (${found}/3).`
            );
        }
    }
}

function drawAncientStones() {

    for (
        const stone
        of V5.ancientStones
    ) {

        if (stone.discovered) {

            ctx.globalAlpha = .35;
        }

        ctx.save();

        ctx.translate(
            stone.x,
            stone.y
        );

        ctx.shadowBlur = 15;

        ctx.shadowColor =
            "#9b69d5";

        ctx.fillStyle =
            "#65537d";

        ctx.beginPath();

        ctx.moveTo(
            0,
            -22
        );

        ctx.lineTo(
            15,
            -10
        );

        ctx.lineTo(
            12,
            22
        );

        ctx.lineTo(
            -13,
            22
        );

        ctx.lineTo(
            -16,
            -8
        );

        ctx.closePath();

        ctx.fill();

        ctx.strokeStyle =
            "#bd94e9";

        ctx.stroke();

        ctx.restore();

        ctx.globalAlpha = 1;
    }
}

/* =========================================================
   V5 — MAGIC CRYSTALS
========================================================= */

function drawCrystalObjects() {

    for (
        const crystal
        of V5.crystalObjects
    ) {

        if (crystal.collected) continue;

        ctx.save();

        ctx.translate(
            crystal.x,
            crystal.y
        );

        const pulse =
            1 +
            Math.sin(
                performance.now() * .004 +
                crystal.x
            ) * .08;

        ctx.scale(
            pulse,
            pulse
        );

        ctx.shadowBlur = 20;

        if (crystal.type === "purple") {
            ctx.shadowColor =
                "#a06cff";
            ctx.fillStyle =
                "#8f55d9";
        }

        else if (crystal.type === "blue") {
            ctx.shadowColor =
                "#5a9cff";
            ctx.fillStyle =
                "#4f76c5";
        }

        else {
            ctx.shadowColor =
                "#67d687";
            ctx.fillStyle =
                "#4f9e62";
        }

        ctx.beginPath();

        ctx.moveTo(
            0,
            -16
        );

        ctx.lineTo(
            10,
            0
        );

        ctx.lineTo(
            0,
            17
        );

        ctx.lineTo(
            -10,
            0
        );

        ctx.closePath();

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   V5 — CHESTS
========================================================= */

function updateChests() {

    for (
        const chest
        of V5.chests
    ) {

        if (chest.opened) continue;

        const d =
            Math.hypot(
                player.x - chest.x,
                player.y - chest.y
            );

        if (
            d < 45 &&
            keys["e"]
        ) {

            chest.opened = true;

            V5.gold += chest.gold;

            gainXP(15);

            showMessage(
                `Baú aberto! +${chest.gold} ouro.`
            );
        }
    }
}

function drawChest() {

    for (
        const chest
        of V5.chests
    ) {

        ctx.save();

        ctx.translate(
            chest.x,
            chest.y
        );

        ctx.fillStyle =
            chest.opened
                ? "#3b2b1b"
                : "#754c29";

        ctx.fillRect(
            -18,
            -12,
            36,
            24
        );

        ctx.fillStyle =
            "#b48a3d";

        ctx.fillRect(
            -3,
            -2,
            6,
            6
        );

        ctx.restore();
    }
}

/* =========================================================
   V5 — INJURED GOBLIN
========================================================= */

function drawInjuredGoblin() {

    if (!V5.injuredGoblin.active) return;

    const g =
        V5.injuredGoblin;

    ctx.save();

    ctx.translate(
        g.x,
        g.y
    );

    ctx.fillStyle =
        g.helped
            ? "#719b51"
            : "#4d6d3a";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        16,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#e5d9b9";

    ctx.fillRect(
        -10,
        6,
        20,
        5
    );

    ctx.fillStyle =
        "#242c1c";

    ctx.fillRect(
        -7,
        -4,
        4,
        3
    );

    ctx.fillRect(
        3,
        -4,
        4,
        3
    );

    ctx.restore();

    const d =
        Math.hypot(
            player.x - g.x,
            player.y - g.y
        );

    if (
        d < 75 &&
        !V5.dialogue
    ) {

        ctx.save();

        ctx.textAlign =
            "center";

        ctx.font =
            "bold 13px sans-serif";

        ctx.fillStyle =
            "#d9d0c2";

        ctx.fillText(
            "E — Interagir",
            g.x,
            g.y - 30
        );

        ctx.restore();
    }
}

function interactInjuredGoblin() {

    if (!V5.injuredGoblin.active) return;

    if (V5.injuredGoblin.helped) {

        startDialogue(
            "Goblin ferido",
            "Você salvou minha vida. A floresta não esquecerá."
        );

        return;
    }

    startDialogue(
        "Goblin ferido",
        "Não me mate... eu sei o que existe além da floresta.",
        [
            {
                text: "Ajudar o goblin",
                action: () => {

                    V5.injuredGoblin.helped = true;

                    player.hp =
                        Math.min(
                            player.maxHp,
                            player.hp + 20
                        );

                    gainXP(40);

                    showMessage(
                        "Você ajudou o goblin ferido."
                    );
                }
            },

            {
                text: "Atacar",
                action: () => {

                    V5.injuredGoblin.active =
                        false;

                    resources.wood += 2;

                    gainXP(10);

                    showMessage(
                        "Você atacou o goblin."
                    );
                }
            }
        ]
    );
}

/* =========================================================
   V5 — ANIMALS
========================================================= */

function updateAnimals(dt) {

    for (
        const animal
        of V5.animals
    ) {

        animal.timer -= dt;

        if (animal.timer <= 0) {

            animal.timer =
                random(1, 4);

            const angle =
                random(
                    0,
                    Math.PI * 2
                );

            animal.dirX =
                Math.cos(angle);

            animal.dirY =
                Math.sin(angle);
        }

        animal.x +=
            animal.dirX *
            20 *
            dt;

        animal.y +=
            animal.dirY *
            20 *
            dt;

        animal.x =
            Math.max(
                100,
                Math.min(
                    world.width - 100,
                    animal.x
                )
            );

        animal.y =
            Math.max(
                100,
                Math.min(
                    world.height - 100,
                    animal.y
                )
            );
    }
}

function drawAnimals() {

    for (
        const animal
        of V5.animals
    ) {

        ctx.save();

        ctx.translate(
            animal.x,
            animal.y
        );

        ctx.fillStyle =
            animal.type === "deer"
                ? "#73583c"
                : "#aaa58c";

        ctx.beginPath();

        ctx.ellipse(
            0,
            0,
            animal.type === "deer"
                ? 14
                : 9,
            animal.type === "deer"
                ? 8
                : 7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        if (
            animal.type === "deer"
        ) {

            ctx.fillRect(
                10,
                -7,
                8,
                8
            );
        }

        ctx.restore();
    }
}

/* =========================================================
   V5 — FIREFLIES
========================================================= */

function updateFireflies() {

    const night =
        worldTime / 180;

    if (
        night < .25 ||
        night > .8
    ) return;

    for (
        const firefly
        of V5.fireflies
    ) {

        firefly.phase += .01;
    }
}

function drawFireflies() {

    const phase =
        worldTime / 180;

    if (
        phase < .25 ||
        phase > .8
    ) return;

    for (
        const firefly
        of V5.fireflies
    ) {

        const alpha =
            .35 +
            Math.sin(
                firefly.phase
            ) * .3;

        ctx.globalAlpha =
            Math.max(
                .05,
                alpha
            );

        ctx.fillStyle =
            "#d8e987";

        ctx.beginPath();

        ctx.arc(
            firefly.x,
            firefly.y,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

/* =========================================================
   V5 — SHRINE
========================================================= */

function drawShrine() {

    if (!V5.shrine.active) return;

    const s =
        V5.shrine;

    ctx.save();

    ctx.translate(
        s.x,
        s.y
    );

    ctx.shadowBlur = 20;
    ctx.shadowColor =
        "#6e4ba8";

    ctx.fillStyle =
        "#40354f";

    ctx.fillRect(
        -28,
        -20,
        56,
        40
    );

    ctx.fillStyle =
        "#9674bd";

    ctx.beginPath();

    ctx.arc(
        0,
        -25,
        12,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}

/* =========================================================
   V5 — WEATHER
========================================================= */

function updateWeather(dt) {

    V5.weatherTimer -= dt;

    if (V5.weatherTimer <= 0) {

        V5.weatherTimer =
            random(
                35,
                70
            );

        const roll =
            Math.random();

        if (roll < .2) {
            V5.weather = "rain";
            V5.weatherIntensity =
                random(.25, .55);
        }

        else if (roll < .35) {
            V5.weather = "fog";
            V5.weatherIntensity =
                random(.15, .3);
        }

        else {
            V5.weather = "clear";
            V5.weatherIntensity = 0;
        }
    }
}

function drawWeather() {

    if (
        V5.weather === "fog"
    ) {

        ctx.fillStyle =
            `rgba(160,170,165,${V5.weatherIntensity})`;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );
    }

    if (
        V5.weather === "rain"
    ) {

        ctx.save();

        ctx.strokeStyle =
            `rgba(170,205,235,${V5.weatherIntensity})`;

        ctx.lineWidth = 1;

        for (let i = 0; i < 90; i++) {

            const x =
                (i * 83 +
                performance.now() * .18) %
                W;

            const y =
                (i * 47 +
                performance.now() * .42) %
                H;

            ctx.beginPath();

            ctx.moveTo(
                x,
                y
            );

            ctx.lineTo(
                x - 5,
                y + 14
            );

            ctx.stroke();
        }

        ctx.restore();
    }
}

/* =========================================================
   V5 — CLASS SYSTEM
========================================================= */

function chooseClass(type) {

    V5.playerClass = type;
    V5.classChosen = true;

    if (type === "warrior") {

        player.maxHp += 25;
        player.hp = player.maxHp;

        player.speed -= 5;

        showMessage(
            "Caminho escolhido: GUERREIRO"
        );
    }

    else if (type === "mage") {

        player.maxStamina += 25;
        player.stamina =
            player.maxStamina;

        showMessage(
            "Caminho escolhido: MAGO"
        );
    }

    else if (type === "rogue") {

        player.speed += 25;

        showMessage(
            "Caminho escolhido: DUENDE"
        );
    }

    gainXP(20);
}

/* =========================================================
   V5 — SPECIAL MUSHROOM
========================================================= */

function drawSpecialMushroom() {

    const m =
        V5.specialMushroom;

    if (!m.active) return;

    ctx.save();

    ctx.translate(
        m.x,
        m.y
    );

    ctx.shadowBlur = 25;
    ctx.shadowColor =
        "#9c4cff";

    ctx.fillStyle =
        "#c8b58a";

    ctx.fillRect(
        -4,
        2,
        8,
        20
    );

    ctx.fillStyle =
        "#7d25c9";

    ctx.beginPath();

    ctx.arc(
        0,
        3,
        17,
        Math.PI,
        0
    );

    ctx.fill();

    ctx.fillStyle =
        "#f0d9ff";

    for (let i = 0; i < 5; i++) {

        ctx.beginPath();

        ctx.arc(
            random(-10, 10),
            random(-3, 4),
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.restore();
}

/* =========================================================
   V5 — INTERACTIONS
========================================================= */

const originalInteract =
    interact;

interact = function() {

    if (V5.dialogue) {

        dialogueAdvance();

        return;
    }

    const elderDistance =
        Math.hypot(
            player.x - V5.elder.x,
            player.y - V5.elder.y
        );

    if (
        V5.elder.active &&
        elderDistance < 75
    ) {

        interactElder();

        return;
    }

    const goblinDistance =
        Math.hypot(
            player.x -
            V5.injuredGoblin.x,

            player.y -
            V5.injuredGoblin.y
        );

    if (
        V5.injuredGoblin.active &&
        goblinDistance < 75
    ) {

        interactInjuredGoblin();

        return;
    }

    for (
        const crystal
        of V5.crystalObjects
    ) {

        if (crystal.collected) continue;

        const d =
            Math.hypot(
                player.x - crystal.x,
                player.y - crystal.y
            );

        if (d < 50) {

            crystal.collected = true;

            gainXP(10);

            showMessage(
                "Cristal mágico coletado."
            );

            return;
        }
    }

    for (
        const chest
        of V5.chests
    ) {

        if (chest.opened) continue;

        const d =
            Math.hypot(
                player.x - chest.x,
                player.y - chest.y
            );

        if (d < 50) {

            chest.opened = true;

            V5.gold += chest.gold;

            gainXP(15);

            showMessage(
                `Baú aberto! +${chest.gold} ouro.`
            );

            return;
        }
    }

    originalInteract();
};

/* =========================================================
   V5 — UPDATE WRAPPER
========================================================= */

const originalUpdatePlayer =
    updatePlayer;

updatePlayer = function(dt) {

    originalUpdatePlayer(dt);

    updateSurvival(dt);
};

const originalUpdateQuest =
    updateQuest;

updateQuest = function() {

    originalUpdateQuest();

    updateAncientStones();

    updateChests();
};

const originalUpdateParticles =
    updateParticles;

updateParticles = function(dt) {

    originalUpdateParticles(dt);

    updateFireflies();
    updateAnimals(dt);

    if (V5.flash > 0) {
        V5.flash -= dt;
    }
};

const originalUpdateDayNight =
    updateDayNight;

updateDayNight = function(dt) {

    originalUpdateDayNight(dt);

    updateWeather(dt);
};

/* =========================================================
   V5 — HUD
========================================================= */

const originalHUD =
    updateHUD;

updateHUD = function() {

    originalHUD();

    const quest =
        document.getElementById(
            "questText"
        );

    if (!quest) return;

    let extra = "";

    if (V5.questComplete) {

        extra =
            "A história da floresta apenas começou...";
    }

    else if (questStage === 2) {

        extra =
            "Fale com Eldran, o Ancião.";
    }

    else if (questStage === 3) {

        extra =
            "Ouça o Ancião e escolha seu caminho.";
    }

    else if (
        questStage >= 4 &&
        questStage < 6
    ) {

        const count =
            V5.ancientStones.filter(
                s => s.discovered
            ).length;

        extra =
            `Encontre as pedras antigas (${count}/3).`;
    }

    else if (questStage === 6) {

        extra =
            "Retorne ao Ancião.";
    }

    if (extra) {
        quest.textContent =
            extra;
    }
};

/* =========================================================
   V5 — EXTRA HUD
========================================================= */

function drawV5HUD() {

    ctx.save();

    ctx.font =
        "12px sans-serif";

    ctx.textAlign =
        "left";

    const panelW = 185;

    const x =
        W -
        panelW -
        12;

    const y = 12;

    ctx.fillStyle =
        "rgba(7,9,13,.72)";

    ctx.fillRect(
        x,
        y,
        panelW,
        105
    );

    ctx.strokeStyle =
        "rgba(173,130,230,.35)";

    ctx.strokeRect(
        x,
        y,
        panelW,
        105
    );

    ctx.fillStyle =
        "#f0e8ff";

    ctx.font =
        "bold 13px sans-serif";

    ctx.fillText(
        `Nível ${V5.level}`,
        x + 10,
        y + 19
    );

    ctx.font =
        "11px sans-serif";

    ctx.fillStyle =
        "#cbbde2";

    ctx.fillText(
        `XP ${V5.xp}/${V5.xpNext}`,
        x + 10,
        y + 37
    );

    ctx.fillText(
        `Ouro: ${V5.gold}`,
        x + 10,
        y + 53
    );

    ctx.fillText(
        `Fome: ${Math.round(V5.hunger)}%`,
        x + 10,
        y + 69
    );

    ctx.fillText(
        `Sede: ${Math.round(V5.thirst)}%`,
        x + 10,
        y + 85
    );

    if (V5.classChosen) {

        ctx.fillStyle =
            "#d7c4ff";

        ctx.fillText(
            V5.playerClass === "warrior"
                ? "GUERREIRO"
                : V5.playerClass === "mage"
                    ? "MAGO"
                    : "DUENDE",

            x + 10,
            y + 101
        );
    }

    ctx.restore();
}

/* =========================================================
   V5 — DIALOGUE DRAW
========================================================= */

function drawDialogueV5() {

    const d =
        V5.dialogue;

    if (!d) return;

    ctx.save();

    ctx.fillStyle =
        "rgba(0,0,0,.72)";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    const boxW =
        Math.min(
            W - 30,
            760
        );

    const boxH =
        d.choices.length
            ? 220
            : 175;

    const x =
        (W - boxW) / 2;

    const y =
        H -
        boxH -
        25;

    ctx.fillStyle =
        "rgba(15,13,21,.97)";

    ctx.strokeStyle =
        "#8c6ac0";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        boxW,
        boxH,
        14
    );

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle =
        "#d6b98a";

    ctx.font =
        "bold 18px sans-serif";

    ctx.fillText(
        d.speaker,
        x + 20,
        y + 30
    );

    const shown =
        d.text.substring(
            0,
            Math.floor(d.chars)
        );

    ctx.fillStyle =
        "#eee";

    ctx.font =
        "15px sans-serif";

    const words =
        shown.split(" ");

    let line = "";
    let yy = y + 62;

    for (
        const word
        of words
    ) {

        const test =
            line
                ? line + " " + word
                : word;

        if (
            ctx.measureText(test).width >
            boxW - 40
        ) {

            ctx.fillText(
                line,
                x + 20,
                yy
            );

            yy += 22;

            line = word;

        } else {

            line = test;
        }
    }

    if (line) {

        ctx.fillText(
            line,
            x + 20,
            yy
        );
    }

    if (
        d.finished &&
        d.choices.length
    ) {

        let cy =
            y +
            boxH -
            75;

        d.choices.forEach(
            (choice, i) => {

                ctx.fillStyle =
                    i === d.selected
                        ? "#b993f0"
                        : "#aaa";

                ctx.font =
                    i === d.selected
                        ? "bold 14px sans-serif"
                        : "14px sans-serif";

                ctx.fillText(
                    `${i === d.selected ? ">" : " "} ${i + 1}. ${choice.text}`,
                    x + 20,
                    cy
                );

                cy += 25;
            }
        );

    } else if (d.finished) {

        ctx.fillStyle =
            "#aaa";

        ctx.font =
            "12px sans-serif";

        ctx.fillText(
            "E / Enter / toque para continuar",
            x + 20,
            y + boxH - 18
        );
    }

    ctx.restore();
}

/* =========================================================
   V5 — MINIMAP
========================================================= */

function drawMinimap() {

    const size = 120;

    const x =
        W -
        size -
        12;

    const y =
        H -
        size -
        12;

    ctx.save();

    ctx.globalAlpha = .85;

    ctx.fillStyle =
        "rgba(8,12,12,.72)";

    ctx.fillRect(
        x,
        y,
        size,
        size
    );

    ctx.strokeStyle =
        "rgba(180,180,180,.3)";

    ctx.strokeRect(
        x,
        y,
        size,
        size
    );

    const sx =
        size /
        world.width;

    const sy =
        size /
        world.height;

    ctx.fillStyle =
        "#b9b9b9";

    ctx.fillRect(
        x +
        shelter.x *
        sx - 3,

        y +
        shelter.y *
        sy - 3,

        6,
        6
    );

    ctx.fillStyle =
        "#e7b75b";

    ctx.fillRect(
        x +
        player.x *
        sx - 2,

        y +
        player.y *
        sy - 2,

        4,
        4
    );

    ctx.fillStyle =
        "#6c8f58";

    for (
        const enemy
        of enemies
    ) {

        if (enemy.hp <= 0) continue;

        ctx.fillRect(
            x +
            enemy.x *
            sx - 1,

            y +
            enemy.y *
            sy - 1,

            3,
            3
        );
    }

    ctx.fillStyle =
        "#a97cff";

    for (
        const stone
        of V5.ancientStones
    ) {

        ctx.fillRect(
            x +
            stone.x *
            sx - 1,

            y +
            stone.y *
            sy - 1,

            3,
            3
        );
    }

    ctx.restore();
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
        camera.shake > 0
            ? random(
                -camera.shake,
                camera.shake
            )
            : 0;

    const shakeY =
        camera.shake > 0
            ? random(
                -camera.shake,
                camera.shake
            )
            : 0;

    ctx.save();

    ctx.translate(
        W / 2 -
        camera.x +
        shakeX,

        H / 2 -
        camera.y +
        shakeY
    );

    drawGround();
    drawTrees();
    drawRocks();
    drawMushrooms();
    drawResources();
    drawShelter();
    drawCampfire();
    drawEnemies();

    drawAncientStones();
    drawCrystalObjects();
    drawChest();
    drawShrine();
    drawSpecialMushroom();
    drawInjuredGoblin();
    drawAnimals();
    drawFireflies();
    drawElderV5();

    drawPlayer();
    drawParticles();

    ctx.restore();

    drawNight();
    drawWeather();
    drawVignette();

    drawV5HUD();
    drawMinimap();

    if (V5.dialogue) {
        drawDialogueV5();
    }

    if (messageTimer > 0) {

        ctx.save();

        ctx.textAlign =
            "center";

        ctx.font =
            "bold 15px sans-serif";

        const width =
            Math.min(
                W - 40,
                500
            );

        ctx.fillStyle =
            "rgba(10,10,15,.85)";

        ctx.fillRect(
            W / 2 -
            width / 2,

            25,

            width,
            42
        );

        ctx.fillStyle =
            "#eee";

        ctx.fillText(
            messageText,
            W / 2,
            51
        );

        ctx.restore();
    }

    if (V5.flash > 0) {

        ctx.save();

        ctx.fillStyle =
            `rgba(180,120,255,${Math.min(
                .28,
                V5.flash * .28
            )})`;

        ctx.fillRect(
            0,
            0,
            W,
            H
        );

        ctx.restore();
    }

    if (V5.paused) {

        ctx.save();

        ctx.fillStyle =
            "rgba(0,0,0,.62)";

        ctx.fillRect(
            0,
            0,
            W,
            H
        );

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#eee";

        ctx.font =
            "bold 34px sans-serif";

        ctx.fillText(
            "PAUSADO",
            W / 2,
            H / 2 - 10
        );

        ctx.font =
            "14px sans-serif";

        ctx.fillStyle =
            "#bbb";

        ctx.fillText(
            "Pressione ESC para continuar",
            W / 2,
            H / 2 + 22
        );

        ctx.restore();
    }
}

/* =========================================================
   GAME LOOP
========================================================= */

let lastTime =
    performance.now();

function gameLoop(now) {

    const dt =
        Math.min(
            .033,
            (now - lastTime) /
            1000
        );

    lastTime = now;

    if (!V5.paused) {

        updatePlayer(dt);
        updateEnemies(dt);
        updateQuest();
        updateDayNight(dt);
        updateCamera(dt);
        updateParticles(dt);
        updateDialogue(dt);
        updateMessages(dt);
    }

    render();

    requestAnimationFrame(
        gameLoop
    );
}

requestAnimationFrame(
    gameLoop
);

/* =========================================================
   DIALOGUE UPDATE
========================================================= */

function updateDialogue(dt) {

    const d =
        V5.dialogue;

    if (!d) return;

    if (
        d.chars <
        d.text.length
    ) {

        d.timer += dt;

        while (
            d.timer >= .025 &&
            d.chars <
            d.text.length
        ) {

            d.timer -= .025;

            d.chars++;
        }

        if (
            d.chars >=
            d.text.length
        ) {

            d.finished = true;
        }
    }
}

/* =========================================================
   MESSAGES UPDATE
========================================================= */

function updateMessages(dt) {

    if (messageTimer > 0) {

        messageTimer -= dt;
    }
}

/* =========================================================
   MOBILE CONTROLS
========================================================= */

const attackButton =
    document.getElementById(
        "attackButton"
    );

const dodgeButton =
    document.getElementById(
        "dodgeButton"
    );

const interactButton =
    document.getElementById(
        "interactButton"
    );

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

/* =========================================================
   DIALOGUE TOUCH
========================================================= */

canvas.addEventListener(
    "pointerdown",
    e => {

        if (!V5.dialogue) return;

        const d =
            V5.dialogue;

        if (
            d.choices.length &&
            d.finished
        ) {

            const boxW =
                Math.min(
                    W - 30,
                    760
                );

            const boxH = 220;

            const x =
                (W - boxW) / 2;

            const y =
                H -
                boxH -
                25;

            if (
                e.clientX >= x &&
                e.clientX <= x + boxW &&
                e.clientY >=
                    y + boxH - 100
            ) {

                const localY =
                    e.clientY -
                    (y + boxH - 75);

                const index =
                    Math.floor(
                        localY / 25
                    );

                if (
                    index >= 0 &&
                    index <
                    d.choices.length
                ) {

                    d.selected =
                        index;

                    chooseDialogue(
                        index
                    );

                    return;
                }
            }
        }

        dialogueAdvance();
    }
);

/* =========================================================
   DIALOGUE KEYBOARD
========================================================= */

window.addEventListener(
    "keydown",
    e => {

        if (!V5.dialogue) return;

        const d =
            V5.dialogue;

        if (
            d.choices.length &&
            d.finished
        ) {

            if (
                e.key === "ArrowDown"
            ) {

                d.selected =
                    Math.min(
                        d.choices.length - 1,
                        d.selected + 1
                    );
            }

            if (
                e.key === "ArrowUp"
            ) {

                d.selected =
                    Math.max(
                        0,
                        d.selected - 1
                    );
            }

            if (
                e.key === "1"
            ) {

                chooseDialogue(0);
            }

            if (
                e.key === "2"
            ) {

                chooseDialogue(1);
            }
        }

        if (
            e.key === "Enter"
        ) {

            dialogueAdvance();
        }
    }
);

/* =========================================================
   PAUSE
========================================================= */

window.addEventListener(
    "keydown",
    e => {

        if (
            e.key === "Escape" &&
            !V5.dialogue
        ) {

            V5.paused =
                !V5.paused;
        }
    }
);

/* =========================================================
   INVENTORY EXTRA BUTTON
========================================================= */

const eatButton =
    document.getElementById(
        "eatMushroom"
    );

if (eatButton) {

    eatButton.addEventListener(
        "click",
        consumeMushroom
    );
}

/* =========================================================
   START
========================================================= */

updateHUD();
updateInventoryUI();

const loading =
    document.getElementById(
        "loading"
    );

if (loading) {

    setTimeout(
        () => {
            loading.style.display =
                "none";
        },
        500
    );
}

setTimeout(
    () => {

        if (
            questStage === 0
        ) {

            showMessage(
                "Há algo estranho além das árvores...",
                3
            );
        }
    },
    1600
);

V5.initialized = true;
        

    /* =====================================================
       INTERACTION
    ===================================================== */

    function talkToNearestV5(){

        if(V5.paused) return;

        if(V5.dialogue){
            dialogueAdvance();
            return;
        }

        const elderDistance =
            v5Dist(
                player.x,
                player.y,
                V5.elder.x,
                V5.elder.y
            );

        if(elderDistance < 75){
            talkToElder();
            return;
        }

        const injuredDistance =
            v5Dist(
                player.x,
                player.y,
                V5.injuredGoblin.x,
                V5.injuredGoblin.y
            );

        if(
            V5.injuredGoblin.active &&
            injuredDistance < 75
        ){

            openDialogue(
                "Goblin ferido",
                "Não... não me mate. A floresta está cheia de monstros. Posso mostrar um caminho secreto.",
                [
                    {
                        id:"helpGoblin",
                        text:"Ajudar o goblin"
                    },
                    {
                        id:"killGoblin",
                        text:"Atacar o goblin"
                    }
                ]
            );

            return;
        }

        const stone =
            v5Nearest(
                V5.ancientStones,
                75,
                s => s.active
            );

        if(stone){

            if(!stone.discovered){

                stone.discovered = true;

                V5.discovered.add(
                    `${stone.x}:${stone.y}`
                );

                v5AddXP(20);

                v5Show(
                    "Você encontrou uma pedra antiga. Ela parece guardar uma memória."
                );

                questStage =
                    Math.max(
                        questStage,
                        4
                    );

            }else{

                v5Show(
                    "A pedra antiga pulsa com uma energia estranha."
                );
            }

            return;
        }

        const crystal =
            v5Nearest(
                V5.crystals,
                65,
                c => !c.collected
            );

        if(crystal){

            crystal.collected = true;

            gold += 0;

            V5.gold += 5;

            v5AddXP(10);

            v5Show(
                "Cristal mágico encontrado. +5 ouro."
            );

            return;
        }

        if(
            V5.chest &&
            !V5.chest.opened &&
            v5Dist(
                player.x,
                player.y,
                V5.chest.x,
                V5.chest.y
            ) < 75
        ){

            openChestV5();

            return;
        }

        if(
            V5.shrine &&
            !V5.shrine.used &&
            v5Dist(
                player.x,
                player.y,
                V5.shrine.x,
                V5.shrine.y
            ) < 85
        ){

            useShrineV5();

            return;
        }

        interact();
    }

    /* =====================================================
       POTION
    ===================================================== */

    function usePotionV5(){

        if(V5.paused) return;

        if(craftedItems.potion <= 0){
            v5Show("Você não possui poções.");
            return;
        }

        if(player.hp >= player.maxHp){
            v5Show("Sua vida já está cheia.");
            return;
        }

        craftedItems.potion--;

        player.hp =
            Math.min(
                player.maxHp,
                player.hp + 35
            );

        for(let i=0;i<12;i++){
            particles.push({
                x:player.x,
                y:player.y,
                vx:v5Random(-45,45),
                vy:v5Random(-45,45),
                life:.7,
                maxLife:.7,
                size:v5Random(2,5),
                type:"craft"
            });
        }

        v5Show(
            "Poção utilizada. +35 HP."
        );

        updateInventoryUI();
    }

    /* =====================================================
       SPECIAL ATTACK
    ===================================================== */

    function performSpecialAttackV5(){

        if(V5.paused || V5.dialogue) return;

        if(!V5.classChosen){
            v5Show(
                "Escolha um caminho antes de usar habilidades."
            );
            return;
        }

        if(player.stamina < 30){
            v5Show("Stamina insuficiente.");
            return;
        }

        player.stamina -= 30;

        camera.shake = 9;

        for(const enemy of enemies){

            if(enemy.hp <= 0) continue;

            const dx =
                enemy.x - player.x;

            const dy =
                enemy.y - player.y;

            const dist =
                Math.hypot(dx,dy);

            if(dist > 130) continue;

            const nx =
                dx / Math.max(1,dist);

            const ny =
                dy / Math.max(1,dist);

            let damage = 35;

            if(
                V5.playerClass === "warrior"
            ){
                damage = 55;
            }

            if(
                V5.playerClass === "mage"
            ){
                damage = 45;
            }

            if(
                V5.playerClass === "rogue"
            ){
                damage = 40;
            }

            enemy.hp -= damage;

            enemy.hitTimer = .35;

            enemy.x += nx * 35;
            enemy.y += ny * 35;

            for(let p=0;p<8;p++){

                particles.push({
                    x:enemy.x,
                    y:enemy.y,
                    vx:v5Random(-90,90),
                    vy:v5Random(-90,90),
                    life:.45,
                    maxLife:.45,
                    size:v5Random(2,6),
                    type:"hit"
                });
            }

            if(enemy.hp <= 0){

                V5.gold += 2;

                v5AddXP(20);

                resources.wood++;

                for(let p=0;p<12;p++){

                    particles.push({
                        x:enemy.x,
                        y:enemy.y,
                        vx:v5Random(-100,100),
                        vy:v5Random(-100,100),
                        life:.8,
                        maxLife:.8,
                        size:v5Random(2,6),
                        type:"death"
                    });
                }
            }
        }

        v5Show(
            V5.playerClass === "mage"
                ? "MAGIA LIBERADA!"
                : V5.playerClass === "rogue"
                    ? "ATAQUE SOMBRIO!"
                    : "GOLPE PODEROSO!"
        );
    }

    /* =====================================================
       CHEST
    ===================================================== */

    function openChestV5(){

        if(V5.chest.opened){
            v5Show("O baú está vazio.");
            return;
        }

        V5.chest.opened = true;

        const reward =
            Math.floor(
                v5Random(15,31)
            );

        V5.gold += reward;

        resources.wood += 5;
        resources.stone += 5;
        resources.mushroom += 2;

        v5AddXP(40);

        camera.shake = 4;

        for(let i=0;i<20;i++){

            particles.push({
                x:V5.chest.x,
                y:V5.chest.y,
                vx:v5Random(-120,120),
                vy:v5Random(-120,120),
                life:1,
                maxLife:1,
                size:v5Random(2,7),
                type:"craft"
            });
        }

        v5Show(
            `Baú aberto! +${reward} ouro, recursos e XP.`
        );
    }

    /* =====================================================
       SHRINE
    ===================================================== */

    function useShrineV5(){

        if(V5.shrine.used){
            v5Show(
                "O santuário está adormecido."
            );
            return;
        }

        V5.shrine.used = true;

        player.hp =
            player.maxHp;

        player.stamina =
            player.maxStamina;

        V5.hunger =
            Math.min(
                100,
                V5.hunger + 30
            );

        V5.thirst =
            Math.min(
                100,
                V5.thirst + 30
            );

        V5.reputation += 5;

        v5AddXP(60);

        V5.flash = 1.5;

        v5Show(
            "O santuário restaurou suas forças."
        );
    }

    /* =====================================================
       HUNGER / THIRST
    ===================================================== */

    let survivalTimerV5 = 0;

    function updateSurvivalV5(dt){

        survivalTimerV5 += dt;

        if(survivalTimerV5 < 4) return;

        survivalTimerV5 = 0;

        V5.hunger =
            Math.max(
                0,
                V5.hunger - .35
            );

        V5.thirst =
            Math.max(
                0,
                V5.thirst - .55
            );

        if(V5.hunger <= 0){

            player.hp =
                Math.max(
                    1,
                    player.hp - 1
                );
        }

        if(V5.thirst <= 0){

            player.hp =
                Math.max(
                    1,
                    player.hp - 1.5
                );
        }

        if(
            V5.hunger < 20 &&
            player.stamina > 0
        ){
            player.stamina =
                Math.max(
                    0,
                    player.stamina - .5
                );
        }
    }

    /* =====================================================
       FOOD / WATER
    ===================================================== */

    function consumeMushroomV5(){

        if(resources.mushroom <= 0){
            v5Show("Você não possui cogumelos.");
            return;
        }

        resources.mushroom--;

        V5.hunger =
            Math.min(
                100,
                V5.hunger + 15
            );

        v5Show(
            "Você comeu um cogumelo. +15 fome."
        );

        updateHUD();
        updateInventoryUI();
    }

    /* =====================================================
       WEATHER
    ===================================================== */

    const weatherTypes = [
        "clear",
        "fog",
        "rain",
        "storm"
    ];

    function changeWeatherV5(){

        const index =
            Math.floor(
                Math.random() *
                weatherTypes.length
            );

        V5.weather =
            weatherTypes[index];

        V5.weatherIntensity =
            V5.weather === "clear"
                ? 0
                : v5Random(.25,.85);

        V5.weatherDuration =
            v5Random(
                30,
                70
            );

        V5.weatherTimer = 0;

        if(V5.weather === "rain"){
            v5Show(
                "A chuva começa a cair sobre a floresta."
            );
        }

        if(V5.weather === "storm"){
            v5Show(
                "Uma tempestade se aproxima."
            );
        }

        if(V5.weather === "fog"){
            v5Show(
                "Uma névoa estranha cobre a floresta."
            );
        }
    }

    function updateWeatherV5(dt){

        V5.weatherTimer += dt;

        if(
            V5.weatherTimer >
            V5.weatherDuration
        ){
            changeWeatherV5();
        }

        if(
            V5.weather === "rain" ||
            V5.weather === "storm"
        ){

            if(
                V5.rainDrops.length <
                (
                    V5.weather === "storm"
                        ? 120
                        : 70
                )
            ){

                V5.rainDrops.push({
                    x:v5Random(0,W),
                    y:v5Random(-H,0),
                    speed:v5Random(350,650),
                    length:v5Random(8,18)
                });
            }

            for(
                const drop of V5.rainDrops
            ){

                drop.y +=
                    drop.speed * dt;

                if(drop.y > H){
                    drop.y =
                        v5Random(-100,0);

                    drop.x =
                        v5Random(0,W);
                }
            }
        }
    }

    function drawWeather(){

        if(
            V5.weather === "fog"
        ){

            ctx.save();

            const alpha =
                .08 +
                V5.weatherIntensity * .16;

            ctx.fillStyle =
                `rgba(185,190,200,${alpha})`;

            ctx.fillRect(
                0,
                0,
                W,
                H
            );

            ctx.restore();
        }

        if(
            V5.weather === "rain" ||
            V5.weather === "storm"
        ){

            ctx.save();

            ctx.strokeStyle =
                V5.weather === "storm"
                    ? "rgba(180,200,230,.48)"
                    : "rgba(170,190,220,.30)";

            ctx.lineWidth =
                V5.weather === "storm"
                    ? 1.5
                    : 1;

            ctx.beginPath();

            for(
                const drop of V5.rainDrops
            ){

                ctx.moveTo(
                    drop.x,
                    drop.y
                );

                ctx.lineTo(
                    drop.x - 4,
                    drop.y + drop.length
                );
            }

            ctx.stroke();

            ctx.restore();
        }

        if(
            V5.weather === "storm" &&
            Math.random() < .003
        ){

            ctx.fillStyle =
                "rgba(230,235,255,.18)";

            ctx.fillRect(
                0,
                0,
                W,
                H
            );

            camera.shake =
                Math.max(
                    camera.shake,
                    5
                );
        }
    }

    /* =====================================================
       ANIMALS
    ===================================================== */

    function updateAnimalsV5(dt){

        for(
            const animal of V5.animals
        ){

            animal.timer -= dt;

            if(
                animal.timer <= 0
            ){

                animal.timer =
                    v5Random(
                        1,
                        4
                    );

                const angle =
                    v5Random(
                        0,
                        Math.PI * 2
                    );

                const speed =
                    animal.type === "rabbit"
                        ? 35
                        : 20;

                animal.vx =
                    Math.cos(angle) *
                    speed;

                animal.vy =
                    Math.sin(angle) *
                    speed;
            }

            animal.x +=
                animal.vx * dt;

            animal.y +=
                animal.vy * dt;

            animal.x =
                v5Clamp(
                    animal.x,
                    100,
                    WORLD.width - 100
                );

            animal.y =
                v5Clamp(
                    animal.y,
                    100,
                    WORLD.height - 100
                );
        }
    }

    function drawAnimals(){

        for(
            const animal of V5.animals
        ){

            const s =
                worldToScreen(
                    animal.x,
                    animal.y
                );

            ctx.save();

            ctx.translate(
                s.x,
                s.y
            );

            if(
                animal.type === "rabbit"
            ){

                ctx.fillStyle =
                    "#8f806f";

                ctx.beginPath();

                ctx.ellipse(
                    0,
                    3,
                    10,
                    7,
                    0,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.fillStyle =
                    "#aa9985";

                ctx.beginPath();

                ctx.ellipse(
                    -5,
                    -7,
                    4,
                    10,
                    -.25,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.beginPath();

                ctx.ellipse(
                    2,
                    -8,
                    4,
                    10,
                    .2,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

            }else{

                ctx.fillStyle =
                    "#777b82";

                ctx.beginPath();

                ctx.ellipse(
                    0,
                    0,
                    12,
                    6,
                    -.2,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.beginPath();

                ctx.moveTo(
                    6,
                    -1
                );

                ctx.lineTo(
                    17,
                    -6
                );

                ctx.lineTo(
                    11,
                    2
                );

                ctx.closePath();

                ctx.fill();
            }

            ctx.restore();
        }
    }

    /* =====================================================
       FIREFLIES
    ===================================================== */

    function updateFirefliesV5(dt){

        for(
            const f of V5.fireflies
        ){

            f.phase +=
                dt * f.speed;
        }
    }

    function drawFireflies(){

        if(
            getNightAmount() < .15
        ) return;

        for(
            const f of V5.fireflies
        ){

            const s =
                worldToScreen(
                    f.x,
                    f.y
                );

            const glow =
                .4 +
                Math.sin(f.phase) *
                .35;

            ctx.save();

            ctx.globalAlpha =
                Math.max(
                    0,
                    glow
                );

            ctx.fillStyle =
                "#d8e89a";

            ctx.shadowColor =
                "#d8e89a";

            ctx.shadowBlur =
                10;

            ctx.beginPath();

            ctx.arc(
                s.x,
                s.y,
                2,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }
    }

    /* =====================================================
       ANCIENT STONES
    ===================================================== */

    function drawAncientStones(){

        for(
            const stone of V5.ancientStones
        ){

            const s =
                worldToScreen(
                    stone.x,
                    stone.y
                );

            ctx.save();

            ctx.translate(
                s.x,
                s.y
            );

            ctx.fillStyle =
                "#44474a";

            ctx.beginPath();

            ctx.moveTo(
                -stone.r,
                15
            );

            ctx.lineTo(
                -20,
                -18
            );

            ctx.lineTo(
                0,
                -stone.r
            );

            ctx.lineTo(
                23,
                -15
            );

            ctx.lineTo(
                stone.r,
                18
            );

            ctx.closePath();

            ctx.fill();

            ctx.strokeStyle =
                stone.discovered
                    ? "#8b6fc4"
                    : "#676a6c";

            ctx.lineWidth = 2;

            ctx.stroke();

            if(stone.discovered){

                ctx.strokeStyle =
                    "rgba(160,130,230,.75)";

                ctx.beginPath();

                ctx.moveTo(-8,8);
                ctx.lineTo(0,-14);
                ctx.lineTo(8,8);
                ctx.moveTo(-13,-1);
                ctx.lineTo(13,-1);

                ctx.stroke();
            }

            ctx.restore();
        }
    }

    /* =====================================================
       CRYSTALS
    ===================================================== */

    function drawCrystalObjects(){

        for(
            const crystal of V5.crystals
        ){

            if(crystal.collected)
                continue;

            const s =
                worldToScreen(
                    crystal.x,
                    crystal.y
                );

            ctx.save();

            ctx.translate(
                s.x,
                s.y
            );

            ctx.shadowColor =
                "#9e7bea";

            ctx.shadowBlur =
                12;

            ctx.fillStyle =
                "#8065c5";

            ctx.beginPath();

            ctx.moveTo(
                0,
                -12
            );

            ctx.lineTo(
                8,
                4
            );

            ctx.lineTo(
                0,
                12
            );

            ctx.lineTo(
                -8,
                4
            );

            ctx.closePath();

            ctx.fill();

            ctx.restore();
        }
    }

    /* =====================================================
       CHEST
    ===================================================== */

    function drawChest(){

        if(!V5.chest)
            return;

        const s =
            worldToScreen(
                V5.chest.x,
                V5.chest.y
            );

        ctx.save();

        ctx.translate(
            s.x,
            s.y
        );

        ctx.fillStyle =
            V5.chest.opened
                ? "#51402e"
                : "#80592d";

        ctx.fillRect(
            -20,
            -12,
            40,
            25
        );

        ctx.fillStyle =
            "#c5a44c";

        ctx.fillRect(
            -3,
            -2,
            6,
            9
        );

        if(!V5.chest.opened){

            ctx.strokeStyle =
                "#c59c48";

            ctx.lineWidth = 2;

            ctx.strokeRect(
                -20,
                -12,
                40,
                25
            );
        }

        ctx.restore();
    }

    /* =====================================================
       SHRINE
    ===================================================== */

    function drawShrine(){

        if(!V5.shrine)
            return;

        const s =
            worldToScreen(
                V5.shrine.x,
                V5.shrine.y
            );

        ctx.save();

        ctx.translate(
            s.x,
            s.y
        );

        ctx.fillStyle =
            "#38343f";

        ctx.fillRect(
            -20,
            -5,
            40,
            25
        );

        ctx.fillStyle =
            V5.shrine.used
                ? "#62556b"
                : "#a77de0";

        ctx.beginPath();

        ctx.moveTo(
            0,
            -30
        );

        ctx.lineTo(
            13,
            -5
        );

        ctx.lineTo(
            0,
            4
        );

        ctx.lineTo(
            -13,
            -5
        );

        ctx.closePath();

        ctx.fill();

        ctx.shadowColor =
            "#9d6de0";

        ctx.shadowBlur =
            V5.shrine.used
                ? 0
                : 15;

        ctx.fillStyle =
            "#c8a8ff";

        ctx.beginPath();

        ctx.arc(
            0,
            -12,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }

    /* =====================================================
       INJURED GOBLIN
    ===================================================== */

    function drawInjuredGoblin(){

        if(!V5.injuredGoblin.active)
            return;

        const s =
            worldToScreen(
                V5.injuredGoblin.x,
                V5.injuredGoblin.y
            );

        ctx.save();

        ctx.translate(
            s.x,
            s.y
        );

        ctx.globalAlpha =
            .85;

        ctx.fillStyle =
            "#5b6d43";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            16,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#d36b58";

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

        ctx.fillStyle =
            "#a54242";

        ctx.fillRect(
            -12,
            11,
            24,
            3
        );

        ctx.restore();
    }

    /* =====================================================
       ELDER
    ===================================================== */

    function drawElderV5(){

        const s =
            worldToScreen(
                V5.elder.x,
                V5.elder.y
            );

        ctx.save();

        ctx.translate(
            s.x,
            s.y
        );

        ctx.fillStyle =
            "rgba(0,0,0,.35)";

        ctx.beginPath();

        ctx.ellipse(
            0,
            16,
            18,
            7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            V5.playerClass === "mage"
                ? "#5e467e"
                : "#66556f";

        ctx.beginPath();

        ctx.moveTo(
            -16,
            15
        );

        ctx.lineTo(
            -11,
            -10
        );

        ctx.lineTo(
            0,
            -22
        );

        ctx.lineTo(
            11,
            -10
        );

        ctx.lineTo(
            16,
            15
        );

        ctx.closePath();

        ctx.fill();

        ctx.fillStyle =
            "#a98b72";

        ctx.beginPath();

        ctx.arc(
            0,
            -16,
            9,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#d1c5a5";

        ctx.beginPath();

        ctx.arc(
            0,
            -10,
            11,
            0,
            Math.PI
        );

        ctx.fill();

        ctx.fillStyle =
            "#b48ae8";

        ctx.beginPath();

        ctx.arc(
            0,
            -25,
            7,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();

        ctx.save();

        ctx.font =
            "bold 11px sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillStyle =
            "#d9c8f5";

        ctx.fillText(
            "Eldran",
            s.x,
            s.y - 40
        );

        ctx.restore();
    }

    /* =====================================================
       V5 UPDATE SYSTEM
    ===================================================== */

    const oldUpdateParticles =
        updateParticles;

    updateParticles =
        function(dt){

            oldUpdateParticles(dt);

            updateAnimalsV5(dt);
            updateFirefliesV5(dt);
            updateWeatherV5(dt);
            updateSurvivalV5(dt);

            if(V5.notificationTimer > 0){
                V5.notificationTimer -= dt;
            }

            if(V5.flash > 0){
                V5.flash -= dt;
            }

            if(V5.autosaveTimer > 0){
                V5.autosaveTimer -= dt;
            }

            if(
                V5.autosaveTimer <= 0
            ){

                V5.autosaveTimer =
                    15;

                saveGameV5();
            }
        };

    /* =====================================================
       PAUSE GAMEPLAY
    ===================================================== */

    const oldUpdatePlayer =
        updatePlayer;

    updatePlayer =
        function(dt){

            if(V5.paused || V5.dialogue)
                return;

            oldUpdatePlayer(dt);
        };

    const oldUpdateEnemies =
        updateEnemies;

    updateEnemies =
        function(dt){

            if(V5.paused || V5.dialogue)
                return;

            oldUpdateEnemies(dt);
        };

    /* =====================================================
       SAVE SYSTEM
    ===================================================== */

    function saveGameV5(){

        try{

            const data = {

                player:{
                    x:player.x,
                    y:player.y,
                    hp:player.hp,
                    maxHp:player.maxHp,
                    stamina:player.stamina,
                    maxStamina:player.maxStamina,
                    speed:player.speed
                },

                resources:{
                    wood:resources.wood,
                    stone:resources.stone,
                    mushroom:resources.mushroom,
                    strange:resources.strange
                },

                craftedItems:{
                    campfire:craftedItems.campfire,
                    axe:craftedItems.axe,
                    sword:craftedItems.sword,
                    potion:craftedItems.potion
                },

                questStage,

                V5:{
                    gold:V5.gold,
                    xp:V5.xp,
                    level:V5.level,
                    xpNext:V5.xpNext,
                    hunger:V5.hunger,
                    thirst:V5.thirst,
                    reputation:V5.reputation,
                    classChosen:V5.classChosen,
                    playerClass:V5.playerClass,
                    chestOpened:V5.chest.opened,
                    shrineUsed:V5.shrine.used,
                    injuredGoblinActive:V5.injuredGoblin.active,
                    injuredGoblinHelped:V5.injuredGoblin.helped,
                    goblinChoice:V5.goblinChoice,
                    stones:V5.ancientStones.map(
                        s => s.discovered
                    ),
                    crystals:V5.crystals.map(
                        c => c.collected
                    )
                }
            };

            localStorage.setItem(
                "darkwood_save_v5",
                JSON.stringify(data)
            );

        }catch(error){

            console.warn(
                "Não foi possível salvar o jogo.",
                error
            );
        }
    }

    function loadGameV5(){

        try{

            const raw =
                localStorage.getItem(
                    "darkwood_save_v5"
                );

            if(!raw)
                return false;

            const data =
                JSON.parse(raw);

            if(data.player){

                Object.assign(
                    player,
                    data.player
                );
            }

            if(data.resources){

                Object.assign(
                    resources,
                    data.resources
                );
            }

            if(data.craftedItems){

                Object.assign(
                    craftedItems,
                    data.craftedItems
                );
            }

            if(
                typeof data.questStage ===
                "number"
            ){
                questStage =
                    data.questStage;
            }

            if(data.V5){

                Object.assign(
                    V5,
                    data.V5
                );

                V5.dialogue = null;

                if(V5.chest){
                    V5.chest = {
                        x:2320,
                        y:780,
                        opened:
                            !!data.V5.chestOpened
                    };
                }

                if(V5.shrine){
                    V5.shrine = {
                        x:2700,
                        y:650,
                        active:true,
                        used:
                            !!data.V5.shrineUsed
                    };
                }

                if(
                    typeof data.V5
                        .injuredGoblinActive
                    === "boolean"
                ){

                    V5.injuredGoblin.active =
                        data.V5.injuredGoblinActive;
                }

                V5.injuredGoblin.helped =
                    !!data.V5.injuredGoblinHelped;

                V5.goblinChoice =
                    data.V5.goblinChoice;

                if(
                    Array.isArray(
                        data.V5.stones
                    )
                ){

                    data.V5.stones.forEach(
                        (value,index) => {

                            if(
                                V5.ancientStones[index]
                            ){

                                V5.ancientStones[index]
                                    .discovered =
                                    !!value;
                            }
                        }
                    );
                }

                if(
                    Array.isArray(
                        data.V5.crystals
                    )
                ){

                    data.V5.crystals.forEach(
                        (value,index) => {

                            if(
                                V5.crystals[index]
                            ){

                                V5.crystals[index]
                                    .collected =
                                    !!value;
                            }
                        }
                    );
                }
            }

            updateHUD();
            updateInventoryUI();

            v5Show(
                "Jogo carregado."
            );

            return true;

        }catch(error){

            console.warn(
                "Erro ao carregar save.",
                error
            );

            return false;
        }
    }

    window.saveDarkwood =
        saveGameV5;

    window.loadDarkwood =
        loadGameV5;

    /* =====================================================
       RENDER ADDITIONS
    ===================================================== */

    const oldRender =
        render;

    render =
        function(){

            oldRender();

            ctx.save();

            drawAncientStones();
            drawChest();
            drawCrystalObjects();
            drawShrine();
            drawInjuredGoblin();
            drawAnimals();
            drawFireflies();
            drawElderV5();

            ctx.restore();

            drawWeather();
            drawV5HUD();
            drawMinimap();

            if(V5.dialogue){
                drawDialogueV5();
            }

            if(V5.paused){

                ctx.save();

                ctx.fillStyle =
                    "rgba(0,0,0,.68)";

                ctx.fillRect(
                    0,
                    0,
                    W,
                    H
                );

                ctx.textAlign =
                    "center";

                ctx.fillStyle =
                    "#eee";

                ctx.font =
                    "bold 34px sans-serif";

                ctx.fillText(
                    "PAUSADO",
                    W/2,
                    H/2 - 10
                );

                ctx.font =
                    "14px sans-serif";

                ctx.fillStyle =
                    "#bbb";

                ctx.fillText(
                    "ESC para continuar",
                    W/2,
                    H/2 + 22
                );

                ctx.restore();
            }

            if(V5.flash > 0){

                ctx.save();

                ctx.fillStyle =
                    `rgba(180,120,255,${Math.min(
                        .28,
                        V5.flash * .28
                    )})`;

                ctx.fillRect(
                    0,
                    0,
                    W,
                    H
                );

                ctx.restore();
            }
        };

    /* =====================================================
       HUD
    ===================================================== */

    function drawV5HUD(){

        ctx.save();

        ctx.font =
            "12px sans-serif";

        ctx.textAlign =
            "left";

        const x = 15;
        const y = 145;

        /* LEVEL */

        ctx.fillStyle =
            "rgba(8,10,15,.78)";

        ctx.fillRect(
            x,
            y,
            190,
            82
        );

        ctx.strokeStyle =
            "rgba(255,255,255,.08)";

        ctx.strokeRect(
            x,
            y,
            190,
            82
        );

        ctx.fillStyle =
            "#d8c9e9";

        ctx.font =
            "bold 13px sans-serif";

        ctx.fillText(
            `NÍVEL ${V5.level}`,
            x + 10,
            y + 18
        );

        ctx.font =
            "11px sans-serif";

        ctx.fillStyle =
            "#b9b2c4";

        ctx.fillText(
            `${V5.xp} / ${V5.xpNext} XP`,
            x + 10,
            y + 34
        );

        ctx.fillStyle =
            "rgba(255,255,255,.08)";

        ctx.fillRect(
            x + 10,
            y + 42,
            170,
            6
        );

        ctx.fillStyle =
            "#8c67bd";

        ctx.fillRect(
            x + 10,
            y + 42,
            170 *
            Math.min(
                1,
                V5.xp / V5.xpNext
            ),
            6
        );

        ctx.fillStyle =
            "#c8a76c";

        ctx.fillText(
            `Ouro: ${V5.gold}`,
            x + 10,
            y + 67
        );

        /* SURVIVAL */

        ctx.fillStyle =
            "#aaa";

        ctx.fillText(
            `Fome: ${Math.round(V5.hunger)}%`,
            x + 90,
            y + 67
        );

        ctx.fillText(
            `Sede: ${Math.round(V5.thirst)}%`,
            x + 10,
            y + 80
        );

        /* CLASS */

        if(V5.classChosen){

            ctx.fillStyle =
                "#c6b2e7";

            const className =
                V5.playerClass === "warrior"
                    ? "GUERREIRO"
                    : V5.playerClass === "mage"
                        ? "MAGO"
                        : "DUENDE";

            ctx.fillText(
                className,
                x + 105,
                y + 80
            );
        }

        /* WEATHER */

        ctx.textAlign =
            "right";

        const weatherName =
            V5.weather === "clear"
                ? "Céu limpo"
                : V5.weather === "fog"
                    ? "Névoa"
                    : V5.weather === "rain"
                        ? "Chuva"
                        : "Tempestade";

        ctx.fillStyle =
            "#bdb6c7";

        ctx.fillText(
            weatherName,
            W - 15,
            28
        );

        ctx.restore();
    }

    /* =====================================================
       DIALOGUE DRAW
    ===================================================== */

    function drawDialogueV5(){

        const d =
            V5.dialogue;

        if(!d)
            return;

        d.timer +=
            1 / 60;

        if(
            !d.finished &&
            d.timer > .025
        ){

            d.timer = 0;

            d.chars =
                Math.min(
                    d.text.length,
                    d.chars + 1
                );

            if(
                d.chars >=
                d.text.length
            ){
                d.finished = true;
            }
        }

        ctx.save();

        const boxW =
            Math.min(
                W - 30,
                700
            );

        const boxH =
            d.choices.length
                ? 170
                : 130;

        const bx =
            (W - boxW) / 2;

        const by =
            H - boxH - 25;

        ctx.fillStyle =
            "rgba(8,8,13,.94)";

        ctx.fillRect(
            bx,
            by,
            boxW,
            boxH
        );

        ctx.strokeStyle =
            "rgba(169,132,218,.55)";

        ctx.lineWidth = 2;

        ctx.strokeRect(
            bx,
            by,
            boxW,
            boxH
        );

        ctx.textAlign =
            "left";

        ctx.fillStyle =
            "#d6bdf1";

        ctx.font =
            "bold 15px sans-serif";

        ctx.fillText(
            d.speaker,
            bx + 18,
            by + 25
        );

        ctx.fillStyle =
            "#ddd";

        ctx.font =
            "14px sans-serif";

        const visible =
            d.text.slice(
                0,
                d.chars
            );

        drawWrappedTextV5(
            visible,
            bx + 18,
            by + 50,
            boxW - 36,
            20
        );

        if(
            d.finished &&
            d.choices.length
        ){

            ctx.font =
                "13px sans-serif";

            for(
                let i=0;
                i<d.choices.length;
                i++
            ){

                const selected =
                    i === d.selected;

                ctx.fillStyle =
                    selected
                        ? "#a985d0"
                        : "#888";

                ctx.fillText(
                    `${selected ? "▶" : "•"} ${d.choices[i].text}`,
                    bx + 20,
                    by + 112 + i * 22
                );
            }

        }else if(d.finished){

            ctx.fillStyle =
                "#888";

            ctx.font =
                "11px sans-serif";

            ctx.fillText(
                "Toque ou pressione ENTER para continuar",
                bx + 18,
                by + boxH - 15
            );
        }

        ctx.restore();
    }

    function drawWrappedTextV5(
        text,
        x,
        y,
        maxWidth,
        lineHeight
    ){

        const words =
            text.split(" ");

        let line = "";
        let yy = y;

        for(
            const word of words
        ){

            const test =
                line
                    ? `${line} ${word}`
                    : word;

            if(
                ctx.measureText(test).width >
                maxWidth
            ){

                ctx.fillText(
                    line,
                    x,
                    yy
                );

                line = word;
                yy += lineHeight;

            }else{

                line = test;
            }
        }

        if(line){
            ctx.fillText(
                line,
                x,
                yy
            );
        }
    }

    /* =====================================================
       MINIMAP
    ===================================================== */

    let mapOpenV5 = false;

    function toggleMapV5(){

        mapOpenV5 =
            !mapOpenV5;
    }

    function drawMinimap(){

        if(mapOpenV5){

            drawFullMapV5();

            return;
        }

        const size = 125;
        const pad = 15;

        const x =
            W - size - pad;

        const y =
            45;

        ctx.save();

        ctx.fillStyle =
            "rgba(5,8,9,.78)";

        ctx.fillRect(
            x,
            y,
            size,
            size
        );

        ctx.strokeStyle =
            "rgba(255,255,255,.16)";

        ctx.strokeRect(
            x,
            y,
            size,
            size
        );

        const sx =
            size / WORLD.width;

        const sy =
            size / WORLD.height;

        /* árvores */

        ctx.fillStyle =
            "rgba(63,78,51,.75)";

        for(
            let i=0;
            i<trees.length;
            i+=3
        ){

            const t =
                trees[i];

            ctx.fillRect(
                x + t.x * sx,
                y + t.y * sy,
                2,
                2
            );
        }

        /* abrigo */

        ctx.fillStyle =
            "#c6a86a";

        ctx.fillRect(
            x + shelter.x * sx - 2,
            y + shelter.y * sy - 2,
            5,
            5
        );

        /* jogador */

        ctx.fillStyle =
            "#e6d4ff";

        ctx.beginPath();

        ctx.arc(
            x + player.x * sx,
            y + player.y * sy,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        /* inimigos */

        ctx.fillStyle =
            "#a64c4c";

        for(
            const enemy of enemies
        ){

            if(enemy.hp <= 0)
                continue;

            ctx.fillRect(
                x + enemy.x * sx - 1,
                y + enemy.y * sy - 1,
                2,
                2
            );
        }

        ctx.restore();
    }

    function drawFullMapV5(){

        ctx.save();

        ctx.fillStyle =
            "rgba(3,4,7,.95)";

        ctx.fillRect(
            0,
            0,
            W,
            H
        );

        const mapW =
            Math.min(
                W - 40,
                800
            );

        const mapH =
            Math.min(
                H - 90,
                560
            );

        const x =
            (W - mapW) / 2;

        const y =
            (H - mapH) / 2;

        ctx.fillStyle =
            "#20291f";

        ctx.fillRect(
            x,
            y,
            mapW,
            mapH
        );

        ctx.strokeStyle =
            "#69735d";

        ctx.strokeRect(
            x,
            y,
            mapW,
            mapH
        );

        const sx =
            mapW / WORLD.width;

        const sy =
            mapH / WORLD.height;

        ctx.fillStyle =
            "#4e6741";

        for(
            let i=0;
            i<trees.length;
            i+=2
        ){

            const t =
                trees[i];

            ctx.fillRect(
                x + t.x * sx,
                y + t.y * sy,
                2,
                2
            );
        }

        ctx.fillStyle =
            "#c5a76b";

        ctx.fillRect(
            x + shelter.x * sx - 4,
            y + shelter.y * sy - 4,
            8,
            8
        );

        ctx.fillStyle =
            "#e7d6ff";

        ctx.beginPath();

        ctx.arc(
            x + player.x * sx,
            y + player.y * sy,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "#c75a55";

        for(
            const enemy of enemies
        ){

            if(enemy.hp <= 0)
                continue;

            ctx.fillRect(
                x + enemy.x * sx - 2,
                y + enemy.y * sy - 2,
                4,
                4
            );
        }

        ctx.fillStyle =
            "#b28ee5";

        for(
            const stone of V5.ancientStones
        ){

            if(!stone.discovered)
                continue;

            ctx.beginPath();

            ctx.arc(
                x + stone.x * sx,
                y + stone.y * sy,
                4,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }

        ctx.fillStyle =
            "#eee";

        ctx.font =
            "bold 18px sans-serif";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "MAPA DA FLORESTA",
            W/2,
            y - 15
        );

        ctx.font =
            "12px sans-serif";

        ctx.fillStyle =
            "#aaa";

        ctx.fillText(
            "M para fechar",
            W/2,
            y + mapH + 25
        );

        ctx.restore();
    }

    /* =====================================================
       QUEST EXTENSION
    ===================================================== */

    const oldUpdateQuest =
        updateQuest;

    updateQuest =
        function(){

            oldUpdateQuest();

            if(
                questStage === 3
            ){

                if(
                    V5.ancientStones.every(
                        s => s.discovered
                    )
                ){

                    questStage = 5;

                    v5AddXP(80);

                    v5Show(
                        "As três pedras despertaram. Algo respondeu do outro lado da floresta."
                    );
                }
            }

            if(
                questStage === 5 &&
                !V5.classChosen
            ){

                questStage = 3;
            }

            if(
                questStage === 5 &&
                V5.classChosen
            ){

                if(
                    v5Dist(
                        player.x,
                        player.y,
                        V5.chest.x,
                        V5.chest.y
                    ) < 180
                ){

                    questStage = 6;

                    v5Show(
                        "Você encontrou uma antiga câmara escondida."
                    );
                }
            }

            if(
                questStage === 7 &&
                !V5.injuredGoblin.active
            ){

                questStage = 8;
            }
        };

    /* =====================================================
       QUEST TEXT EXTENSION
    ===================================================== */

    const oldUpdateHUD =
        updateHUD;

    updateHUD =
        function(){

            oldUpdateHUD();

            const quest =
                document.getElementById(
                    "questText"
                );

            if(!quest)
                return;

            if(
                questStage === 3
            ){

                quest.textContent =
                    "Encontre as três pedras antigas.";
            }

            if(
                questStage === 4
            ){

                quest.textContent =
                    "Continue investigando as pedras antigas.";
            }

            if(
                questStage === 5
            ){

                quest.textContent =
                    "A floresta despertou. Descubra o que mudou.";
            }

            if(
                questStage === 6
            ){

                quest.textContent =
                    "Explore a antiga câmara e encontre seus segredos.";
            }

            if(
                questStage === 7
            ){

                quest.textContent =
                    "Decida o destino do goblin ferido.";
            }

            if(
                questStage >= 8
            ){

                quest.textContent =
                    "Siga para o norte e descubra o caminho para o reino.";
            }
        };

    /* =====================================================
       MOBILE DIALOGUE
    ===================================================== */

    document.addEventListener(
        "pointerdown",
        function(e){

            if(!V5.dialogue)
                return;

            const target =
                e.target;

            if(
                target &&
                (
                    target.id ===
                    "attackButton" ||
                    target.id ===
                    "dodgeButton" ||
                    target.id ===
                    "interactButton"
                )
            ){
                return;
            }

            dialogueAdvance();
        }
    );

    /* =====================================================
       EXTRA MOBILE BUTTONS
    ===================================================== */

    const interactButton =
        document.getElementById(
            "interactButton"
        );

    if(interactButton){

        interactButton.addEventListener(
            "pointerdown",
            function(e){

                if(V5.dialogue){

                    e.preventDefault();

                    dialogueAdvance();

                    return;
                }

                talkToNearestV5();
            },
            true
        );
    }

    /* =====================================================
       STARTUP
    ===================================================== */

    changeWeatherV5();

    const loaded =
        loadGameV5();

    if(!loaded){

        V5.hunger = 100;
        V5.thirst = 100;
        V5.gold = 0;
        V5.xp = 0;
        V5.level = 1;
        V5.xpNext = 100;
    }

    V5.initialized = true;

    setTimeout(
        function(){

            v5Show(
                "Darkwood V5 iniciado. Explore, sobreviva e escolha seu caminho."
            );

        },
        1400
    );

})();
