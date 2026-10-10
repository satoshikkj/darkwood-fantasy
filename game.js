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

    if (e.key === "Escape") {
        const map = document.getElementById("mapPanel");
        const dialogue = document.getElementById("dialoguePanel");
        if (map && !map.hidden) map.hidden = true;
        else if (dialogue && !dialogue.hidden) dialogue.hidden = true;
        else togglePause();
    }

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
   COMBAT SYSTEM
========================================================= */

function attack() {

    if (paused || player.attackCooldown > 0) return;

    player.attackCooldown = 0.42;
    player.attackTimer = 0.18;

    const damage = 25 + (player.damageBonus || 0);

    let hitSomething = false;

    for (const enemy of enemies) {

        if (enemy.hp <= 0) continue;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 78) continue;

        const dot =
            (dx / Math.max(dist, 1)) * player.dirX +
            (dy / Math.max(dist, 1)) * player.dirY;

        if (dot < -0.35) continue;

        enemy.hp -= damage;
        enemy.hitTimer = 0.22;

        const push = 22;

        enemy.x += player.dirX * push;
        enemy.y += player.dirY * push;

        createParticles(enemy.x, enemy.y, "#d9e8bc", 7);

        hitSomething = true;

        if (enemy.hp <= 0) {
            defeatEnemy(enemy);
        }
    }

    if (hitSomething) {
        camera.shake = Math.max(camera.shake, 4);
    }

    updateHUD();
}

/* =========================================================
   ENEMY DEFEAT
========================================================= */

function defeatEnemy(enemy) {

    enemy.hp = 0;

    resources.strange += 1;

    addXP(20);

    createParticles(enemy.x, enemy.y, "#9caf77", 18);

    showMessage("Criatura derrotada! +20 XP");

    if (Math.random() < 0.35) {
        resources.mushroom += 1;
        showMessage("Você encontrou um cogumelo.");
    }

    updateHUD();
    updateInventoryUI();
}

/* =========================================================
   DODGE
========================================================= */

function dodge() {

    if (paused || player.dodgeCooldown > 0) return;

    if (player.stamina < 18) {
        showMessage("Você está sem resistência.");
        return;
    }

    player.stamina -= 18;

    player.dodgeCooldown = 0.75;
    player.dodgeTimer = 0.18;
    player.invulnerable = Math.max(player.invulnerable, 0.22);

    player.x += player.dirX * 45;
    player.y += player.dirY * 45;

    player.x = Math.max(
        player.radius,
        Math.min(world.width - player.radius, player.x)
    );

    player.y = Math.max(
        player.radius,
        Math.min(world.height - player.radius, player.y)
    );

    createParticles(player.x, player.y, "#a8b8a0", 5);
}

/* =========================================================
   PLAYER DAMAGE
========================================================= */

function damagePlayer(amount) {

    if (player.invulnerable > 0 || player.hp <= 0) return;

    player.hp = Math.max(0, player.hp - amount);

    player.invulnerable = 0.75;
    player.hurtTimer = 0.25;

    camera.shake = Math.max(camera.shake, 7);

    createParticles(player.x, player.y, "#a94343", 8);

    if (player.hp <= 0) {
        handlePlayerDeath();
    }

    updateHUD();
}

/* =========================================================
   DEATH AND RESPAWN
========================================================= */

function handlePlayerDeath() {

    paused = true;

    showMessage("Você foi vencido pela floresta.");

    const panel = document.getElementById("deathPanel");

    if (panel) {
        panel.hidden = false;
    } else {
        const retry = confirm(
            "Você morreu em Darkwood.\nDeseja retornar ao abrigo?"
        );

        if (retry) {
            respawnPlayer();
        }
    }
}

function respawnPlayer() {

    player.x = shelter.x;
    player.y = shelter.y;

    player.hp = player.maxHp;
    player.stamina = player.maxStamina;

    player.invulnerable = 2;
    player.hurtTimer = 0;

    paused = false;

    const panel = document.getElementById("deathPanel");

    if (panel) {
        panel.hidden = true;
    }

    camera.x = player.x;
    camera.y = player.y;

    showMessage("Você despertou no abrigo.");
    updateHUD();
}

/* =========================================================
   PARTICLES
========================================================= */

function createParticles(x, y, color, amount = 8) {

    for (let i = 0; i < amount; i++) {

        const angle = random(0, Math.PI * 2);
        const speed = random(20, 100);

        particles.push({
            x,
            y,

            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,

            life: random(0.25, 0.7),
            maxLife: 0.7,

            radius: random(2, 5),
            color
        });
    }
}

function updateParticles(dt) {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= 0.96;
        p.vy *= 0.96;

        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {

    for (const p of particles) {

        const alpha = Math.max(
            0,
            Math.min(1, p.life / p.maxLife)
        );

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        ctx.beginPath();

        ctx.arc(
            p.x - camera.x + W / 2,
            p.y - camera.y + H / 2,
            p.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

/* =========================================================
   RESOURCE COLLECTION
========================================================= */

function collectNearbyResources() {

    let collected = false;

    for (const item of woods) {

        if (item.collected) continue;

        if (Math.hypot(
            player.x - item.x,
            player.y - item.y
        ) < 42) {

            item.collected = true;

            resources.wood += 1;

            createParticles(item.x, item.y, "#b58c5c", 4);

            collected = true;
        }
    }

    for (const item of stones) {

        if (item.collected) continue;

        if (Math.hypot(
            player.x - item.x,
            player.y - item.y
        ) < 42) {

            item.collected = true;

            resources.stone += 1;

            createParticles(item.x, item.y, "#a5aaa7", 4);

            collected = true;
        }
    }

    for (const item of mushrooms) {

        if (item.collected) continue;

        if (Math.hypot(
            player.x - item.x,
            player.y - item.y
        ) < 42) {

            item.collected = true;

            if (item.strange) {
                resources.strange += 1;
                showMessage("Você encontrou um cogumelo estranho!");
            } else {
                resources.mushroom += 1;
                showMessage("Cogumelo coletado.");
            }

            createParticles(
                item.x,
                item.y,
                item.strange ? "#bd83d8" : "#d8b7a0",
                6
            );

            collected = true;
        }
    }

    if (collected) {
        updateHUD();
        updateInventoryUI();
        updateQuest();
    }
}

/* =========================================================
   INTERACTION
========================================================= */

function interact() {

    if (paused) return;

    collectNearbyResources();

    if (Math.hypot(
        player.x - campfire.x,
        player.y - campfire.y
    ) < 85) {

        showMessage(
            "Uma fogueira antiga. O abrigo oferece segurança."
        );

        return;
    }

    if (Math.hypot(
        player.x - shelter.x,
        player.y - shelter.y
    ) < 150) {

        showMessage(
            "Você está no abrigo. Prepare-se antes de explorar."
        );

        return;
    }

    const nearbyEnemy = enemies.find(enemy =>
        enemy.hp > 0 &&
        Math.hypot(
            player.x - enemy.x,
            player.y - enemy.y
        ) < 65
    );

    if (nearbyEnemy) {

        showMessage(
            "Uma criatura hostil se aproxima. Prepare sua arma!"
        );

        return;
    }

    const nearbyMushroom = mushrooms.find(item =>
        !item.collected &&
        Math.hypot(
            player.x - item.x,
            player.y - item.y
        ) < 65
    );

    if (nearbyMushroom) {

        nearbyMushroom.collected = true;

        if (nearbyMushroom.strange) {
            resources.strange++;
            showMessage("Cogumelo estranho coletado!");
        } else {
            resources.mushroom++;
            showMessage("Você coletou um cogumelo.");
        }

        updateHUD();
        updateInventoryUI();
        updateQuest();

        return;
    }

    showMessage("Não há nada para interagir por perto.");
}

/* =========================================================
   MESSAGE SYSTEM
========================================================= */

function showMessage(text, duration = 3) {

    messageText = text;
    messageTimer = duration;

    const element = document.getElementById("message");

    if (element) {
        element.textContent = text;
        element.classList.add("visible");
    }
}

function updateMessage(dt) {

    if (messageTimer > 0) {
        messageTimer -= dt;
    }

    if (messageTimer <= 0) {

        const element = document.getElementById("message");

        if (element) {
            element.classList.remove("visible");
        }
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

    inventoryOpen = !inventoryOpen;

    inventoryPanel.hidden = !inventoryOpen;
    inventoryPanel.classList.toggle("open", inventoryOpen);

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

document.querySelectorAll(".craft-button, .craft-card")
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
   PARTE 3/8 — HUD, MISSÕES, MENSAGENS E ESTADO DO JOGO
========================================================= */

/* =========================================================
   GAME STATE
========================================================= */

let paused = false;
let gameOver = false;
let experience = 0;
let playerLevel = 1;
let experienceRequired = 100;

let questCompleted = false;
let lastMessage = "";
let lastMessageTime = 0;

/* =========================================================
   SAFE DOM HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = String(value);
    }
}

function setWidth(id, value) {
    const element = getElement(id);

    if (element) {
        element.style.width =
            Math.max(0, Math.min(100, value)) + "%";
    }
}

/* =========================================================
   HUD UPDATE
========================================================= */

function updateHUD() {

    const hpPercent =
        (player.hp / player.maxHp) * 100;

    const staminaPercent =
        (player.stamina / player.maxStamina) * 100;

    setText("hpValue", Math.ceil(player.hp));
    setText("healthValue", Math.ceil(player.hp));
    setText("staminaValue", Math.ceil(player.stamina));

    setWidth("hpFill", hpPercent);
    setWidth("healthFill", hpPercent);
    setWidth("staminaFill", staminaPercent);

    setText("woodCount", resources.wood);
    setText("stoneCount", resources.stone);
    setText("mushroomCount", resources.mushroom);
    setText("strangeCount", resources.strange);

    setText("levelValue", playerLevel);
    setText("playerLevel", playerLevel);

    setText("xpValue", experience);
    setText("xpRequired", experienceRequired);

    setWidth(
        "xpFill",
        (experience / experienceRequired) * 100
    );

    updateInventoryUI();
}

/* =========================================================
   EXPERIENCE AND LEVELS
========================================================= */

function addXP(amount) {

    if (amount <= 0) return;

    experience += amount;

    while (experience >= experienceRequired) {

        experience -= experienceRequired;

        playerLevel++;

        experienceRequired =
            Math.floor(experienceRequired * 1.35);

        player.maxHp += 10;
        player.maxStamina += 5;

        player.hp = Math.min(
            player.maxHp,
            player.hp + 10
        );

        player.stamina = Math.min(
            player.maxStamina,
            player.stamina + 5
        );

        showMessage(
            "Nível aumentado! Agora você está no nível " +
            playerLevel + "."
        );

        createLevelUpParticles();
    }

    updateHUD();
}

/* =========================================================
   LEVEL-UP PARTICLES
========================================================= */

function createLevelUpParticles() {

    for (let i = 0; i < 35; i++) {

        particles.push({
            x: player.x + random(-20, 20),
            y: player.y + random(-25, 15),

            vx: random(-80, 80),
            vy: random(-110, 30),

            life: random(0.5, 1.2),
            maxLife: 1.2,

            size: random(2, 6),

            type: "levelup"
        });
    }
}

/* =========================================================
   MESSAGE SYSTEM
========================================================= */

function showMessage(text) {

    lastMessage = text;
    lastMessageTime = performance.now();

    messageText = text;
    messageTimer = 2.8;

    const messageElement = getElement("message");

    if (messageElement) {

        messageElement.textContent = text;
        messageElement.classList.add("visible");
        messageElement.style.opacity = "1";
    }

    const notification = getElement("notification");

    if (notification) {

        notification.textContent = text;
        notification.classList.add("visible");
    }
}

function updateMessages(deltaTime) {

    if (messageTimer > 0) {

        messageTimer -= deltaTime;

    } else {

        const messageElement = getElement("message");

        if (messageElement) {

            messageElement.style.opacity = "0";
            messageElement.classList.remove("visible");
        }

        const notification = getElement("notification");

        if (notification) {
            notification.classList.remove("visible");
        }
    }
}

/* =========================================================
   QUEST SYSTEM
========================================================= */

const questDescriptions = {
    0: {
        title: "Explore a floresta",
        description:
            "Encontre recursos e descubra o que existe neste lugar."
    },

    1: {
        title: "Investigue o cogumelo",
        description:
            "Você encontrou algo estranho. Continue explorando."
    },

    2: {
        title: "Prepare-se para a jornada",
        description:
            "Reúna madeira e pedra para fabricar equipamentos."
    },

    3: {
        title: "Construa seu primeiro abrigo",
        description:
            "Use os recursos coletados para se preparar."
    },

    4: {
        title: "Explore mais longe",
        description:
            "A floresta guarda segredos além do seu ponto inicial."
    }
};

function updateQuest() {

    const quest = questDescriptions[questStage];

    if (!quest) return;

    setText("questTitle", quest.title);
    setText("questDescription", quest.description);
    setText("currentQuest", quest.title);

    const questPanel = getElement("questPanel");

    if (questPanel) {
        questPanel.classList.add("active");
    }
}

function advanceQuest(nextStage) {

    if (nextStage <= questStage) return;

    questStage = nextStage;

    updateQuest();

    showMessage("Nova missão: " +
        (questDescriptions[questStage]?.title || "Explore"));

    addXP(20);
}

function checkQuestProgress() {

    if (
        questStage === 0 &&
        resources.wood >= 3
    ) {

        advanceQuest(1);

    } else if (
        questStage === 1 &&
        resources.strange >= 1
    ) {

        advanceQuest(2);

    } else if (
        questStage === 2 &&
        resources.wood >= 5 &&
        resources.stone >= 3
    ) {

        advanceQuest(3);

    } else if (
        questStage === 3 &&
        craftedItems.campfire > 0
    ) {

        advanceQuest(4);
    }
}

/* =========================================================
   PAUSE SYSTEM
========================================================= */

function togglePause() {

    if (gameOver) return;

    paused = !paused;

    const pausePanel = getElement("pausePanel");
    const pauseButton = getElement("pauseButton");

    if (pausePanel) {
        pausePanel.hidden = !paused;
        pausePanel.classList.toggle("open", paused);
    }

    if (pauseButton) {
        pauseButton.textContent =
            paused ? "Continuar" : "Pausar";
    }

    if (paused) {
        showMessage("Jogo pausado.");
    }
}

function resumeGame() {

    paused = false;

    const pausePanel = getElement("pausePanel");

    if (pausePanel) {
        pausePanel.hidden = true;
        pausePanel.classList.remove("open");
    }
}

function returnToGame() {
    resumeGame();
}

const pauseButtonElement = getElement("pauseButton");
const resumeButtonElement = getElement("resumeButton");

if (pauseButtonElement) {
    pauseButtonElement.addEventListener(
        "click",
        togglePause
    );
}

if (resumeButtonElement) {
    resumeButtonElement.addEventListener(
        "click",
        resumeGame
    );
}

/* =========================================================
   PLAYER DEATH PANEL
========================================================= */

function showDeathPanel() {

    gameOver = true;
    paused = true;

    const panel = getElement("deathPanel");

    if (panel) {
        panel.hidden = false;
        panel.classList.add("open");
    }
}

function hideDeathPanel() {

    const panel = getElement("deathPanel");

    if (panel) {
        panel.hidden = true;
        panel.classList.remove("open");
    }
}

function restartPlayer() {

    gameOver = false;
    paused = false;

    player.hp = player.maxHp;
    player.stamina = player.maxStamina;

    player.x = shelter.x;
    player.y = shelter.y;

    hideDeathPanel();

    updateHUD();

    showMessage("Você voltou ao abrigo.");
}

const restartButtonElement = getElement("restartButton");

if (restartButtonElement) {
    restartButtonElement.addEventListener(
        "click",
        restartPlayer
    );
}

/* =========================================================
   WORLD TIME DISPLAY
========================================================= */

function formatWorldTime(value) {

    const hours = Math.floor(value) % 24;

    const minutes = Math.floor(
        (value - Math.floor(value)) * 60
    );

    return String(hours).padStart(2, "0") +
        ":" +
        String(minutes).padStart(2, "0");
}

function updateWorldTimeDisplay() {

    setText(
        "worldTime",
        formatWorldTime(worldTime)
    );

    const period =
        worldTime >= 6 && worldTime < 18
            ? "Dia"
            : "Noite";

    setText("dayPeriod", period);
}

/* =========================================================
   INITIAL HUD REFRESH
========================================================= */

function initializeHUD() {

    updateHUD();
    updateQuest();
    updateWorldTimeDisplay();

    const inventoryPanelElement =
        getElement("inventoryPanel");

    if (inventoryPanelElement) {
        inventoryPanelElement.hidden = true;
    }

    const pausePanelElement =
        getElement("pausePanel");

    if (pausePanelElement) {
        pausePanelElement.hidden = true;
    }

    const deathPanelElement =
        getElement("deathPanel");

    if (deathPanelElement) {
        deathPanelElement.hidden = true;
    }
}
/* =========================================================
   PARTE 4/8 — CICLO DO JOGO, MOVIMENTO E CÂMERA
========================================================= */

/* =========================================================
   MOVEMENT CONFIGURATION
========================================================= */

const movementConfig = {
    walkSpeed: 145,
    runSpeed: 225,
    acceleration: 10,
    friction: 9,
    diagonalFactor: 0.7071
};

let movementInput = {
    x: 0,
    y: 0,
    running: false
};

let joystickActive = false;
let joystickPointerId = null;

let lastFrameTime = 0;
let animationFrameId = null;

/* =========================================================
   KEYBOARD INPUT
========================================================= */

const keysDown = new Set();

window.addEventListener("keydown", event => {

    keysDown.add(event.key.toLowerCase());

    if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "]
            .includes(event.key.toLowerCase())
    ) {
        event.preventDefault();
    }

    if (event.repeat) return;

    switch (event.key.toLowerCase()) {

        case "e":
            interact();
            break;

        case "i":
            toggleInventory();
            break;

        case "escape":
            togglePause();
            break;

        case " ":
            attack();
            break;

        case "shift":
            dodge();
            break;
    }

}, { passive: false });

window.addEventListener("keyup", event => {
    keysDown.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
    keysDown.clear();

    movementInput.x = 0;
    movementInput.y = 0;

    joystickActive = false;
});

/* =========================================================
   KEYBOARD MOVEMENT
========================================================= */

function readKeyboardMovement() {

    let x = 0;
    let y = 0;

    if (
        keysDown.has("a") ||
        keysDown.has("arrowleft")
    ) {
        x -= 1;
    }

    if (
        keysDown.has("d") ||
        keysDown.has("arrowright")
    ) {
        x += 1;
    }

    if (
        keysDown.has("w") ||
        keysDown.has("arrowup")
    ) {
        y -= 1;
    }

    if (
        keysDown.has("s") ||
        keysDown.has("arrowdown")
    ) {
        y += 1;
    }

    const length = Math.hypot(x, y);

    if (length > 1) {
        x /= length;
        y /= length;
    }

    movementInput.x = x;
    movementInput.y = y;

    movementInput.running =
        keysDown.has("shift") &&
        length > 0;
}

/* =========================================================
   MOBILE JOYSTICK
========================================================= */

function initializeJoystick() {

    const joystick = getElement("joystick");
    const knob = getElement("joystickKnob");

    if (!joystick || !knob) return;

    function updateJoystick(event) {

        const rect = joystick.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = event.clientX - centerX;
        let dy = event.clientY - centerY;

        const maxDistance =
            Math.min(rect.width, rect.height) * 0.32;

        const distanceFromCenter =
            Math.hypot(dx, dy);

        if (distanceFromCenter > maxDistance) {

            const ratio =
                maxDistance / distanceFromCenter;

            dx *= ratio;
            dy *= ratio;
        }

        movementInput.x = dx / maxDistance;
        movementInput.y = dy / maxDistance;

        knob.style.transform =
            `translate(${dx}px, ${dy}px)`;
    }

    function resetJoystick() {

        joystickActive = false;
        joystickPointerId = null;

        movementInput.x = 0;
        movementInput.y = 0;

        knob.style.transform =
            "translate(0px, 0px)";
    }

    joystick.addEventListener(
        "pointerdown",
        event => {

            if (paused || gameOver) return;

            event.preventDefault();

            joystickActive = true;
            joystickPointerId = event.pointerId;

            joystick.setPointerCapture(
                event.pointerId
            );

            updateJoystick(event);
        }
    );

    joystick.addEventListener(
        "pointermove",
        event => {

            if (
                !joystickActive ||
                event.pointerId !== joystickPointerId
            ) {
                return;
            }

            event.preventDefault();

            updateJoystick(event);
        }
    );

    joystick.addEventListener(
        "pointerup",
        event => {

            if (event.pointerId === joystickPointerId) {
                resetJoystick();
            }
        }
    );

    joystick.addEventListener(
        "pointercancel",
        resetJoystick
    );

    joystick.addEventListener(
        "lostpointercapture",
        resetJoystick
    );
}

/* =========================================================
   MOBILE ACTION BUTTONS
========================================================= */

function initializeActionButtons() {

    const attackButton = getElement("attackButton");
    const dodgeButton = getElement("dodgeButton");
    const interactButton = getElement("interactButton");
    const runButton = getElement("runButton");

    if (attackButton) {
        attackButton.addEventListener(
            "click",
            attack
        );
    }

    if (dodgeButton) {
        dodgeButton.addEventListener(
            "click",
            dodge
        );
    }

    if (interactButton) {
        interactButton.addEventListener(
            "click",
            interact
        );
    }

    if (runButton) {

        runButton.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();

                movementInput.running = true;
            }
        );

        const releaseRun = () => {
            movementInput.running = false;
        };

        runButton.addEventListener(
            "pointerup",
            releaseRun
        );

        runButton.addEventListener(
            "pointercancel",
            releaseRun
        );

        runButton.addEventListener(
            "lostpointercapture",
            releaseRun
        );
    }
}

/* =========================================================
   PLAYER MOVEMENT
========================================================= */

function updatePlayerMovement(deltaTime) {

    if (paused || gameOver) return;

    if (!joystickActive) {
        readKeyboardMovement();
    }

    let inputX = movementInput.x;
    let inputY = movementInput.y;

    const inputLength =
        Math.hypot(inputX, inputY);

    if (inputLength > 1) {

        inputX /= inputLength;
        inputY /= inputLength;
    }

    const moving = inputLength > 0.05;

    const running =
        movementInput.running &&
        moving &&
        player.stamina > 0;

    let speed = running
        ? movementConfig.runSpeed
        : movementConfig.walkSpeed;

    if (player.dodgeTimer > 0) {
        speed *= 2.3;
    }

    if (moving) {

        player.dirX = inputX;
        player.dirY = inputY;

        const oldX = player.x;
        const oldY = player.y;

        const moveX =
            inputX * speed * deltaTime;

        const moveY =
            inputY * speed * deltaTime;

        player.x += moveX;

        if (collidesWithWorld(player.x, player.y)) {
            player.x = oldX;
        }

        player.y += moveY;

        if (collidesWithWorld(player.x, player.y)) {
            player.y = oldY;
        }

        player.moving = true;

    } else {

        player.moving = false;
    }

    if (running) {

        player.stamina = Math.max(
            0,
            player.stamina - 22 * deltaTime
        );

    } else {

        player.stamina = Math.min(
            player.maxStamina,
            player.stamina + 12 * deltaTime
        );
    }

    player.x = Math.max(
        15,
        Math.min(world.width - 15, player.x)
    );

    player.y = Math.max(
        15,
        Math.min(world.height - 15, player.y)
    );
}

/* =========================================================
   CAMERA FOLLOW
========================================================= */

function updateCamera(deltaTime) {

    const targetX =
        player.x - canvas.width / 2;

    const targetY =
        player.y - canvas.height / 2;

    const smoothing = Math.min(
        1,
        deltaTime * 6
    );

    camera.x +=
        (targetX - camera.x) * smoothing;

    camera.y +=
        (targetY - camera.y) * smoothing;

    camera.x = Math.max(
        0,
        Math.min(
            world.width - canvas.width,
            camera.x
        )
    );

    camera.y = Math.max(
        0,
        Math.min(
            world.height - canvas.height,
            camera.y
        )
    );

    if (camera.shake > 0) {

        camera.shake = Math.max(
            0,
            camera.shake - 25 * deltaTime
        );
    }
}

/* =========================================================
   ENTITY DISTANCE
========================================================= */

function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

/* =========================================================
   INTERACTION HINT
========================================================= */

function updateInteractionHint() {

    const hint = getElement("interactionHint");

    if (!hint) return;

    let closest = Infinity;

    const collections = [
        mushrooms,
        woods,
        stones
    ];

    for (const collection of collections) {

        for (const object of collection) {

            if (object.collected) continue;

            closest = Math.min(
                closest,
                distance(player, object)
            );
        }
    }

    if (closest < 55) {

        hint.textContent =
            "E / INTERAGIR";

        hint.classList.add("visible");

    } else {

        hint.classList.remove("visible");
    }
}

/* =========================================================
   WINDOW RESIZE
========================================================= */

function resizeGameCanvas() {

    const rect = canvas.getBoundingClientRect();

    const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    canvas.width = Math.floor(
        rect.width * pixelRatio
    );

    canvas.height = Math.floor(
        rect.height * pixelRatio
    );

    ctx.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
    );
}

window.addEventListener(
    "resize",
    resizeGameCanvas
);

/* =========================================================
   INITIALIZE INPUT
========================================================= */

function initializeControls() {

    initializeJoystick();
    initializeActionButtons();

    resizeGameCanvas();
}
/* =========================================================
   PARTE 5/8 — INIMIGOS, IA E COMBATE
========================================================= */

/* =========================================================
   ENEMY CONFIGURATION
========================================================= */

const enemyConfig = {
    goblin: {
        name: "Goblin",
        hp: 60,
        speed: 48,
        damage: 8,
        detectionRange: 230,
        attackRange: 30,
        attackCooldown: 1.3,
        xp: 25
    },

    forestCreature: {
        name: "Criatura da floresta",
        hp: 90,
        speed: 35,
        damage: 12,
        detectionRange: 190,
        attackRange: 36,
        attackCooldown: 1.7,
        xp: 40
    }
};

/* =========================================================
   ENEMY INITIALIZATION
========================================================= */

function initializeEnemies() {

    if (enemies.length > 0) return;

    for (let i = 0; i < 5; i++) {

        const position = findOpenPosition(
            350,
            world.width - 100,
            350,
            world.height - 100
        );

        enemies.push({
            x: position.x,
            y: position.y,

            type: "goblin",

            hp: enemyConfig.goblin.hp,
            maxHp: enemyConfig.goblin.hp,

            speed: enemyConfig.goblin.speed,
            damage: enemyConfig.goblin.damage,

            detectionRange:
                enemyConfig.goblin.detectionRange,

            attackRange:
                enemyConfig.goblin.attackRange,

            attackCooldown: 0,
            attackInterval:
                enemyConfig.goblin.attackCooldown,

            hitTimer: 0,
            attackTimer: 0,

            directionX: 0,
            directionY: 0,

            state: "idle",

            wanderTimer: random(1, 4),
            wanderAngle: random(0, Math.PI * 2),

            dead: false
        });
    }
}

/* =========================================================
   FIND OPEN POSITION
========================================================= */

function findOpenPosition(
    minX,
    maxX,
    minY,
    maxY
) {

    for (let attempt = 0; attempt < 80; attempt++) {

        const x = random(minX, maxX);
        const y = random(minY, maxY);

        if (!collidesWithWorld(x, y)) {

            const farFromPlayer =
                Math.hypot(
                    x - player.x,
                    y - player.y
                ) > 200;

            if (farFromPlayer) {
                return { x, y };
            }
        }
    }

    return {
        x: Math.max(50, Math.min(world.width - 50, minX)),
        y: Math.max(50, Math.min(world.height - 50, minY))
    };
}

/* =========================================================
   UPDATE ENEMIES
========================================================= */

function updateEnemies(deltaTime) {

    if (paused || gameOver) return;

    for (const enemy of enemies) {

        if (enemy.dead || enemy.hp <= 0) continue;

        enemy.attackCooldown = Math.max(
            0,
            enemy.attackCooldown - deltaTime
        );

        enemy.hitTimer = Math.max(
            0,
            enemy.hitTimer - deltaTime
        );

        enemy.attackTimer = Math.max(
            0,
            enemy.attackTimer - deltaTime
        );

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const distanceToPlayer =
            Math.hypot(dx, dy);

        if (
            distanceToPlayer <=
            enemy.detectionRange
        ) {

            enemy.state = "chase";

            const length =
                Math.max(distanceToPlayer, 1);

            enemy.directionX = dx / length;
            enemy.directionY = dy / length;

            if (
                distanceToPlayer >
                enemy.attackRange
            ) {

                moveEnemy(
                    enemy,
                    enemy.directionX *
                        enemy.speed * deltaTime,
                    enemy.directionY *
                        enemy.speed * deltaTime
                );

            } else {

                enemy.state = "attack";

                if (enemy.attackCooldown <= 0) {

                    enemy.attackCooldown =
                        enemy.attackInterval;

                    enemy.attackTimer = 0.25;

                    damagePlayer(
                        enemy.damage,
                        enemy
                    );
                }
            }

        } else {

            updateEnemyWander(
                enemy,
                deltaTime
            );
        }
    }

    enemies = enemies.filter(
        enemy => !enemy.dead
    );
}

/* =========================================================
   ENEMY MOVEMENT
========================================================= */

function moveEnemy(enemy, dx, dy) {

    const oldX = enemy.x;
    const oldY = enemy.y;

    enemy.x += dx;

    if (
        collidesWithWorld(enemy.x, enemy.y) ||
        distance(enemy, player) < 20
    ) {
        enemy.x = oldX;
    }

    enemy.y += dy;

    if (
        collidesWithWorld(enemy.x, enemy.y) ||
        distance(enemy, player) < 20
    ) {
        enemy.y = oldY;
    }

    enemy.x = Math.max(
        10,
        Math.min(world.width - 10, enemy.x)
    );

    enemy.y = Math.max(
        10,
        Math.min(world.height - 10, enemy.y)
    );
}

/* =========================================================
   ENEMY WANDERING
========================================================= */

function updateEnemyWander(enemy, deltaTime) {

    enemy.state = "idle";

    enemy.wanderTimer -= deltaTime;

    if (enemy.wanderTimer <= 0) {

        enemy.wanderTimer = random(1.5, 4);

        enemy.wanderAngle =
            random(0, Math.PI * 2);
    }

    if (Math.random() < 0.15) return;

    const dx =
        Math.cos(enemy.wanderAngle) *
        enemy.speed * 0.35 * deltaTime;

    const dy =
        Math.sin(enemy.wanderAngle) *
        enemy.speed * 0.35 * deltaTime;

    moveEnemy(enemy, dx, dy);
}

/* =========================================================
   ENEMY DEATH
========================================================= */

function defeatEnemy(enemy) {

    if (enemy.dead) return;

    enemy.dead = true;
    enemy.hp = 0;

    resources.wood += 1;

    addXP(
        enemy.type === "goblin"
            ? enemyConfig.goblin.xp
            : enemyConfig.forestCreature.xp
    );

    createDeathParticles(
        enemy.x,
        enemy.y
    );

    showMessage(
        enemy.type === "goblin"
            ? "Goblin derrotado. +1 madeira"
            : "Criatura derrotada."
    );

    updateHUD();
}

/* =========================================================
   PLAYER ATTACK SUPPORT
========================================================= */

function damageEnemy(enemy, amount) {

    if (!enemy || enemy.dead) return;

    enemy.hp -= amount;
    enemy.hitTimer = 0.2;

    createHitParticles(
        enemy.x,
        enemy.y
    );

    if (enemy.hp <= 0) {
        defeatEnemy(enemy);
    }
}

/* =========================================================
   ATTACK ANIMATION STATE
========================================================= */

function updateCombat(deltaTime) {

    player.attackCooldown = Math.max(
        0,
        (player.attackCooldown || 0) - deltaTime
    );

    player.attackTimer = Math.max(
        0,
        (player.attackTimer || 0) - deltaTime
    );

    player.dodgeCooldown = Math.max(
        0,
        (player.dodgeCooldown || 0) - deltaTime
    );

    player.dodgeTimer = Math.max(
        0,
        (player.dodgeTimer || 0) - deltaTime
    );

    player.invulnerable = Math.max(
        0,
        (player.invulnerable || 0) - deltaTime
    );

    player.hurtTimer = Math.max(
        0,
        (player.hurtTimer || 0) - deltaTime
    );
}

/* =========================================================
   COLLISION CHECK FOR COMBAT
========================================================= */

function isEnemyInAttackRange(enemy) {

    if (!enemy || enemy.dead) return false;

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;

    const dist = Math.hypot(dx, dy);

    if (dist > 75 || dist === 0) {
        return false;
    }

    const directionDot =
        (dx / dist) * player.dirX +
        (dy / dist) * player.dirY;

    return directionDot >= 0.15;
}

/* =========================================================
   ENEMY HEALTH BAR DATA
========================================================= */

function getEnemyHealthPercent(enemy) {

    if (!enemy || enemy.maxHp <= 0) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            100,
            (enemy.hp / enemy.maxHp) * 100
        )
    );
}
/* =========================================================
   PARTE 6/8 — CICLO DIA/NOITE E CLIMA
========================================================= */

/* =========================================================
   WORLD TIME CONFIGURATION
========================================================= */

const worldTimeConfig = {
    dayLength: 600,
    startHour: 8,
    nightStart: 19,
    dayStart: 6
};

let worldDay = 1;
let weather = "clear";
let weatherTimer = 0;
let ambientParticles = [];

/* =========================================================
   WORLD CLOCK
========================================================= */

function updateWorldClock(deltaTime) {

    worldTime +=
        (24 / worldTimeConfig.dayLength) *
        deltaTime;

    if (worldTime >= 24) {

        worldTime -= 24;
        worldDay++;

        showMessage(
            "Dia " + worldDay +
            ": um novo ciclo começa."
        );
    }

    updateWorldTimeDisplay();
}

/* =========================================================
   DAYLIGHT INTENSITY
========================================================= */

function getDaylightIntensity() {

    const hour = worldTime;

    if (hour >= 7 && hour < 17) {
        return 1;
    }

    if (hour >= 5 && hour < 7) {
        return 0.35 + (hour - 5) * 0.325;
    }

    if (hour >= 17 && hour < 20) {
        return 1 - (hour - 17) * 0.22;
    }

    return 0.18;
}

/* =========================================================
   DAY/NIGHT COLOR
========================================================= */

function getAmbientColor() {

    const hour = worldTime;

    if (hour >= 6 && hour < 9) {
        return {
            r: 255,
            g: 204,
            b: 145,
            alpha: 0.12
        };
    }

    if (hour >= 9 && hour < 16) {
        return {
            r: 255,
            g: 255,
            b: 255,
            alpha: 0
        };
    }

    if (hour >= 16 && hour < 19) {
        return {
            r: 255,
            g: 135,
            b: 90,
            alpha: 0.17
        };
    }

    return {
        r: 18,
        g: 23,
        b: 54,
        alpha: 0.55
    };
}

/* =========================================================
   WEATHER SYSTEM
========================================================= */

const weatherTypes = [
    "clear",
    "mist",
    "rain"
];

function updateWeather(deltaTime) {

    weatherTimer -= deltaTime;

    if (weatherTimer <= 0) {

        weatherTimer = random(60, 120);

        const nextWeather =
            weatherTypes[
                Math.floor(
                    Math.random() * weatherTypes.length
                )
            ];

        if (nextWeather !== weather) {

            weather = nextWeather;

            if (weather === "mist") {
                showMessage(
                    "Uma névoa cobre a floresta..."
                );
            } else if (weather === "rain") {
                showMessage(
                    "A chuva começou a cair."
                );
            } else {
                showMessage(
                    "O céu voltou a ficar limpo."
                );
            }
        }
    }
}

/* =========================================================
   RAIN PARTICLES
========================================================= */

function spawnRainParticle() {

    return {
        x: camera.x + random(0, canvas.clientWidth),
        y: camera.y + random(-100, 0),

        vx: -35,
        vy: random(260, 400),

        life: random(0.5, 1.2),
        maxLife: 1.2,

        size: random(1, 2),

        type: "rain"
    };
}

function updateRain(deltaTime) {

    if (weather !== "rain") return;

    if (ambientParticles.length < 120) {

        for (let i = 0; i < 4; i++) {
            ambientParticles.push(
                spawnRainParticle()
            );
        }
    }

    for (const particle of ambientParticles) {

        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.life -= deltaTime;
    }

    ambientParticles = ambientParticles.filter(
        particle =>
            particle.life > 0 &&
            particle.y <
                camera.y + canvas.clientHeight + 20
    );
}

/* =========================================================
   DRAW WEATHER
========================================================= */

function drawWeather() {

    if (weather === "rain") {

        ctx.save();

        ctx.strokeStyle =
            "rgba(180,205,235,0.45)";

        ctx.lineWidth = 1;

        for (const particle of ambientParticles) {

            const screenX =
                particle.x - camera.x;

            const screenY =
                particle.y - camera.y;

            ctx.beginPath();

            ctx.moveTo(
                screenX,
                screenY
            );

            ctx.lineTo(
                screenX - 4,
                screenY + 12
            );

            ctx.stroke();
        }

        ctx.restore();
    }

    if (weather === "mist") {

        ctx.save();

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                canvas.clientWidth,
                canvas.clientHeight
            );

        gradient.addColorStop(
            0,
            "rgba(170,185,195,0.04)"
        );

        gradient.addColorStop(
            0.5,
            "rgba(180,195,205,0.18)"
        );

        gradient.addColorStop(
            1,
            "rgba(170,185,195,0.06)"
        );

        ctx.fillStyle = gradient;

        ctx.fillRect(
            0,
            0,
            canvas.clientWidth,
            canvas.clientHeight
        );

        ctx.restore();
    }
}

/* =========================================================
   AMBIENT OVERLAY
========================================================= */

function drawAmbientOverlay() {

    const ambient = getAmbientColor();

    if (ambient.alpha <= 0) return;

    ctx.save();

    ctx.fillStyle =
        `rgba(${ambient.r},${ambient.g},${ambient.b},${ambient.alpha})`;

    ctx.fillRect(
        0,
        0,
        canvas.clientWidth,
        canvas.clientHeight
    );

    ctx.restore();
}

/* =========================================================
   WORLD ENVIRONMENT UPDATE
========================================================= */

function updateEnvironment(deltaTime) {

    updateWorldClock(deltaTime);
    updateWeather(deltaTime);
    updateRain(deltaTime);
}

/* =========================================================
   WORLD ENVIRONMENT RENDER
========================================================= */

function drawEnvironmentEffects() {

    drawAmbientOverlay();
    drawWeather();
}

/* =========================================================
   DAY/NIGHT DISPLAY
========================================================= */

function getTimeDescription() {

    if (worldTime >= 5 && worldTime < 8) {
        return "Amanhecer";
    }

    if (worldTime >= 8 && worldTime < 17) {
        return "Dia";
    }

    if (worldTime >= 17 && worldTime < 20) {
        return "Anoitecer";
    }

    return "Noite";
}

/* =========================================================
   ENVIRONMENT INITIALIZATION
========================================================= */

function initializeEnvironment() {

    worldTime = worldTimeConfig.startHour;

    worldDay = 1;

    weather = "clear";

    weatherTimer = random(30, 90);

    ambientParticles = [];

    updateWorldTimeDisplay();
}
/* =========================================================
   PARTE 7/8 — RENDERIZAÇÃO, MUNDO E PERSONAGENS
========================================================= */

/* =========================================================
   DRAW HELPERS
========================================================= */

function drawRoundedRect(
    x,
    y,
    width,
    height,
    radius,
    fillStyle,
    strokeStyle = null
) {

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        width,
        height,
        radius
    );

    ctx.fillStyle = fillStyle;
    ctx.fill();

    if (strokeStyle) {

        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}

function drawText(
    text,
    x,
    y,
    size = 14,
    color = "#ffffff",
    align = "left"
) {

    ctx.save();

    ctx.font = `600 ${size}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;

    ctx.fillText(text, x, y);

    ctx.restore();
}

/* =========================================================
   WORLD BACKGROUND
========================================================= */

function drawWorldBackground() {

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.fillStyle = "#17271d";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    const tileSize = 64;

    const startX =
        Math.floor(camera.x / tileSize) * tileSize;

    const startY =
        Math.floor(camera.y / tileSize) * tileSize;

    for (
        let y = startY;
        y < camera.y + height + tileSize;
        y += tileSize
    ) {

        for (
            let x = startX;
            x < camera.x + width + tileSize;
            x += tileSize
        ) {

            const sx = x - camera.x;
            const sy = y - camera.y;

            const variation =
                Math.abs(
                    Math.sin(x * 0.013 + y * 0.021)
                );

            ctx.fillStyle =
                variation > 0.5
                    ? "#1b3023"
                    : "#203727";

            ctx.fillRect(
                sx,
                sy,
                tileSize,
                tileSize
            );

            if (variation > 0.72) {

                ctx.fillStyle =
                    "rgba(120,145,88,0.15)";

                ctx.beginPath();

                ctx.arc(
                    sx + tileSize * 0.5,
                    sy + tileSize * 0.5,
                    7,
                    0,
                    Math.PI * 2
                );

                ctx.fill();
            }
        }
    }
}

/* =========================================================
   WORLD BOUNDARIES
========================================================= */

function drawWorldBoundary() {

    ctx.save();

    ctx.strokeStyle = "#5a6945";
    ctx.lineWidth = 5;

    ctx.strokeRect(
        -camera.x,
        -camera.y,
        world.width,
        world.height
    );

    ctx.restore();
}

/* =========================================================
   TREES
========================================================= */

function drawTrees() {

    for (const tree of trees) {

        const x = tree.x - camera.x;
        const y = tree.y - camera.y;

        if (
            x < -100 ||
            y < -120 ||
            x > canvas.clientWidth + 100 ||
            y > canvas.clientHeight + 120
        ) {
            continue;
        }

        ctx.save();

        /* Tree shadow */

        ctx.fillStyle =
            "rgba(0,0,0,0.22)";

        ctx.beginPath();

        ctx.ellipse(
            x + 8,
            y + 13,
            23,
            10,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        /* Trunk */

        ctx.fillStyle = "#57402d";

        ctx.fillRect(
            x - 7,
            y - 2,
            14,
            27
        );

        /* Foliage */

        ctx.fillStyle = "#24472e";

        ctx.beginPath();

        ctx.arc(
            x,
            y - 17,
            tree.radius || 25,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#315a38";

        ctx.beginPath();

        ctx.arc(
            x - 8,
            y - 23,
            (tree.radius || 25) * 0.66,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
            "rgba(111,145,81,0.35)";

        ctx.beginPath();

        ctx.arc(
            x - 10,
            y - 28,
            (tree.radius || 25) * 0.35,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   COLLECTIBLE RESOURCES
========================================================= */

function drawCollectibles() {

    for (const wood of woods) {

        if (wood.collected) continue;

        const x = wood.x - camera.x;
        const y = wood.y - camera.y;

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(-0.35);

        drawRoundedRect(
            -10,
            -4,
            23,
            8,
            3,
            "#94643d"
        );

        ctx.restore();
    }

    for (const stone of stones) {

        if (stone.collected) continue;

        const x = stone.x - camera.x;
        const y = stone.y - camera.y;

        ctx.fillStyle = "#818b88";

        ctx.beginPath();

        ctx.moveTo(x - 9, y + 5);
        ctx.lineTo(x - 5, y - 7);
        ctx.lineTo(x + 5, y - 9);
        ctx.lineTo(x + 10, y + 2);
        ctx.lineTo(x + 3, y + 8);

        ctx.closePath();
        ctx.fill();
    }

    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        const x = mushroom.x - camera.x;
        const y = mushroom.y - camera.y;

        const color = mushroom.strange
            ? "#b54ee6"
            : "#d9564c";

        ctx.fillStyle = "#e3d5bd";

        ctx.fillRect(
            x - 3,
            y - 1,
            6,
            12
        );

        ctx.fillStyle = color;

        ctx.beginPath();

        ctx.arc(
            x,
            y - 2,
            11,
            Math.PI,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
            x - 4,
            y - 5,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.arc(
            x + 4,
            y - 7,
            1.5,
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

    const x = shelter.x - camera.x;
    const y = shelter.y - camera.y;

    ctx.save();

    ctx.fillStyle =
        "rgba(0,0,0,0.25)";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y + 15,
        50,
        20,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#62462e";

    ctx.fillRect(
        x - 35,
        y - 5,
        70,
        35
    );

    ctx.fillStyle = "#3d2b23";

    ctx.beginPath();

    ctx.moveTo(x - 45, y - 5);
    ctx.lineTo(x, y - 38);
    ctx.lineTo(x + 45, y - 5);

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2d211d";

    ctx.fillRect(
        x - 8,
        y + 8,
        16,
        22
    );

    drawText(
        "ABRIGO",
        x,
        y + 48,
        11,
        "#e5d6ad",
        "center"
    );

    ctx.restore();
}

/* =========================================================
   CAMPFIRE
========================================================= */

function drawCampfire() {

    if (!craftedItems.campfire) return;

    const x = shelter.x + 55 - camera.x;
    const y = shelter.y + 15 - camera.y;

    const flicker =
        Math.sin(performance.now() * 0.012) * 3;

    ctx.save();

    ctx.fillStyle = "#69432b";

    ctx.fillRect(
        x - 12,
        y + 3,
        25,
        5
    );

    ctx.save();

    ctx.translate(x, y);

    ctx.rotate(-0.5);

    ctx.fillStyle = "#895a34";

    ctx.fillRect(
        -13,
        -2,
        26,
        5
    );

    ctx.restore();

    ctx.fillStyle =
        "rgba(255,120,30,0.18)";

    ctx.beginPath();

    ctx.arc(
        x,
        y - 5,
        30 + flicker,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#f28b32";

    ctx.beginPath();

    ctx.moveTo(x, y - 26 - flicker);
    ctx.quadraticCurveTo(
        x + 18,
        y - 7,
        x,
        y + 1
    );

    ctx.quadraticCurveTo(
        x - 14,
        y - 6,
        x,
        y - 26 - flicker
    );

    ctx.fill();

    ctx.fillStyle = "#ffe49a";

    ctx.beginPath();

    ctx.moveTo(x, y - 16 - flicker);
    ctx.quadraticCurveTo(
        x + 7,
        y - 5,
        x,
        y
    );

    ctx.quadraticCurveTo(
        x - 6,
        y - 6,
        x,
        y - 16 - flicker
    );

    ctx.fill();

    ctx.restore();
}

/* =========================================================
   ENEMY RENDERING
========================================================= */

function drawEnemies() {

    for (const enemy of enemies) {

        if (enemy.dead || enemy.hp <= 0) continue;

        const x = enemy.x - camera.x;
        const y = enemy.y - camera.y;

        if (
            x < -50 ||
            y < -60 ||
            x > canvas.clientWidth + 50 ||
            y > canvas.clientHeight + 60
        ) {
            continue;
        }

        ctx.save();

        ctx.fillStyle =
            "rgba(0,0,0,0.25)";

        ctx.beginPath();

        ctx.ellipse(
            x,
            y + 12,
            15,
            7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        const enemyColor =
            enemy.type === "goblin"
                ? "#79984b"
                : "#5c687d";

        ctx.fillStyle = enemyColor;

        ctx.beginPath();

        ctx.ellipse(
            x,
            y,
            11,
            14,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#d7c49d";

        ctx.beginPath();

        ctx.arc(
            x,
            y - 13,
            9,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#bb3434";

        ctx.fillRect(
            x - 5,
            y - 15,
            3,
            3
        );

        ctx.fillRect(
            x + 2,
            y - 15,
            3,
            3
        );

        /* Health bar */

        const healthWidth = 28;

        ctx.fillStyle = "#301d1d";

        ctx.fillRect(
            x - healthWidth / 2,
            y - 30,
            healthWidth,
            4
        );

        ctx.fillStyle = "#bd3f43";

        ctx.fillRect(
            x - healthWidth / 2,
            y - 30,
            healthWidth *
                getEnemyHealthPercent(enemy) / 100,
            4
        );

        ctx.restore();
    }
}

/* =========================================================
   PLAYER RENDERING
========================================================= */

function drawPlayer() {

    const x = player.x - camera.x;
    const y = player.y - camera.y;

    ctx.save();

    if (player.invulnerable > 0) {

        ctx.globalAlpha =
            Math.sin(performance.now() * 0.04) > 0
                ? 0.45
                : 1;
    }

    /* Shadow */

    ctx.fillStyle =
        "rgba(0,0,0,0.3)";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y + 12,
        15,
        7,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* Body */

    ctx.fillStyle =
        player.hurtTimer > 0
            ? "#d65b5b"
            : "#536e9c";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y,
        11,
        15,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* Head */

    ctx.fillStyle = "#e1bd98";

    ctx.beginPath();

    ctx.arc(
        x,
        y - 15,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* Hair */

    ctx.fillStyle = "#352b29";

    ctx.beginPath();

    ctx.arc(
        x,
        y - 18,
        9,
        Math.PI,
        Math.PI * 2
    );

    ctx.fill();

    /* Direction indicator */

    ctx.strokeStyle =
        "rgba(255,255,255,0.75)";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(x, y);

    ctx.lineTo(
        x + player.dirX * 18,
        y + player.dirY * 18
    );

    ctx.stroke();

    /* Attack effect */

    if (player.attackTimer > 0) {

        ctx.strokeStyle =
            "rgba(230,235,255,0.9)";

        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.arc(
            x + player.dirX * 18,
            y + player.dirY * 18,
            25,
            -Math.PI * 0.75,
            Math.PI * 0.75
        );

        ctx.stroke();
    }

    ctx.restore();
}

/* =========================================================
   PARTICLES RENDERING
========================================================= */

function drawParticles() {

    for (const particle of particles) {

        const x = particle.x - camera.x;
        const y = particle.y - camera.y;

        const alpha = Math.max(
            0,
            Math.min(
                1,
                particle.life /
                    (particle.maxLife || 1)
            )
        );

        ctx.save();

        ctx.globalAlpha = alpha;

        let color = "#d6d6d6";

        switch (particle.type) {

            case "craft":
                color = "#e7c58a";
                break;

            case "collection":
                color = "#a7d78b";
                break;

            case "hit":
                color = "#e45b58";
                break;

            case "death":
                color = "#8ca66b";
                break;

            case "dodge":
                color = "#9db5d8";
                break;

            case "levelup":
                color = "#f3d987";
                break;
        }

        ctx.fillStyle = color;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            particle.size || 3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   RENDER ALL WORLD OBJECTS
========================================================= */

function renderWorld() {

    drawWorldBackground();

    drawWorldBoundary();

    drawTrees();

    drawCollectibles();

    drawShelter();

    drawCampfire();

    drawEnemies();

    drawPlayer();

    drawParticles();

    drawEnvironmentEffects();
}
/* =========================================================
   PARTE 8/8 — ATUALIZAÇÃO FINAL E INICIALIZAÇÃO
========================================================= */

/* =========================================================
   PARTICLE UPDATE
========================================================= */

function updateParticles(deltaTime) {

    for (const particle of particles) {

        particle.x +=
            (particle.vx || 0) * deltaTime;

        particle.y +=
            (particle.vy || 0) * deltaTime;

        particle.life -= deltaTime;
    }

    for (let i = particles.length - 1; i >= 0; i--) {

        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

/* =========================================================
   WORLD COLLISION HELPERS
========================================================= */

function circleCollision(x1, y1, r1, x2, y2, r2) {

    return Math.hypot(
        x1 - x2,
        y1 - y2
    ) < r1 + r2;
}

/* =========================================================
   SAFE PLAYER POSITION
========================================================= */

function keepPlayerInsideWorld() {

    player.x = Math.max(
        15,
        Math.min(world.width - 15, player.x)
    );

    player.y = Math.max(
        15,
        Math.min(world.height - 15, player.y)
    );
}

/* =========================================================
   PLAYER REGENERATION
========================================================= */

function updatePlayerRecovery(deltaTime) {

    if (paused || gameOver) return;

    if (
        !player.moving &&
        player.hp < player.maxHp &&
        player.hp > 0
    ) {

        player.hp = Math.min(
            player.maxHp,
            player.hp + 0.4 * deltaTime
        );
    }
}

/* =========================================================
   GAME UPDATE
========================================================= */

function updateGame(deltaTime) {

    if (paused || gameOver) return;

    updatePlayerMovement(deltaTime);

    updateCombat(deltaTime);

    updateEnemies(deltaTime);

    updateParticles(deltaTime);

    updateEnvironment(deltaTime);

    updatePlayerRecovery(deltaTime);

    updateCamera(deltaTime);

    keepPlayerInsideWorld();

    updateInteractionHint();

    checkQuestProgress();

    updateHUD();
}

/* =========================================================
   GAME RENDER
========================================================= */

function renderGame() {

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    renderWorld();

    if (paused) {
        drawPauseOverlay();
    }
}

/* =========================================================
   PAUSE OVERLAY
========================================================= */

function drawPauseOverlay() {

    ctx.save();

    ctx.fillStyle =
        "rgba(5,8,12,0.68)";

    ctx.fillRect(
        0,
        0,
        canvas.clientWidth,
        canvas.clientHeight
    );

    drawText(
        "JOGO PAUSADO",
        canvas.clientWidth / 2,
        canvas.clientHeight / 2 - 12,
        25,
        "#ffffff",
        "center"
    );

    drawText(
        "Pressione ESC para continuar",
        canvas.clientWidth / 2,
        canvas.clientHeight / 2 + 22,
        13,
        "#d1d5db",
        "center"
    );

    ctx.restore();
}

/* =========================================================
   MAIN GAME LOOP
========================================================= */

function gameLoop(timestamp) {

    if (!lastFrameTime) {
        lastFrameTime = timestamp;
    }

    const deltaTime = Math.min(
        (timestamp - lastFrameTime) / 1000,
        0.05
    );

    lastFrameTime = timestamp;

    updateMessages(deltaTime);

    if (!paused && !gameOver) {
        updateGame(deltaTime);
    }

    renderGame();

    animationFrameId =
        requestAnimationFrame(gameLoop);
}

/* =========================================================
   START GAME
========================================================= */

function startGame() {

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }

    lastFrameTime = 0;

    initializeControls();

    initializeEnemies();

    initializeHUD();

    initializeEnvironment();

    updateHUD();

    updateQuest();

    showMessage(
        "Bem-vindo a Darkwood. Explore a floresta e colete recursos."
    );

    animationFrameId =
        requestAnimationFrame(gameLoop);
}

/* =========================================================
   DOCUMENT READY
========================================================= */

function initializeDarkwood() {

    if (!canvas || !ctx) {
        console.error(
            "DARKWOOD: canvas ou contexto 2D não encontrado."
        );

        return;
    }

    startGame();
}

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDarkwood,
        { once: true }
    );

} else {

    initializeDarkwood();
}

/* =========================================================
   END OF DARKWOOD game.js
========================================================= */
