```javascript
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
                strange: Math.random() < 0.2,
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
            x = random(150, world.width - 150);
            y = random(150, world.height - 150);
        } while (insideShelter(x, y, 300));

        enemies.push({
            x,
            y,
            radius: 15,
            hp: 60,
            maxHp: 60,
            speed: random(45, 65),
            damage: 8,
            attackCooldown: 0,
            hitTimer: 0,
            wanderTimer: random(1, 4),
            wanderX: 0,
            wanderY: 0,
            dead: false,
            type: "goblin"
        });
    }
}

/* =========================================================
   COLLISIONS
========================================================= */

function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;

    return dx * dx + dy * dy < radius * radius;
}

function isBlocked(x, y, radius = player.radius) {
    if (
        x < radius ||
        y < radius ||
        x > world.width - radius ||
        y > world.height - radius
    ) {
        return true;
    }

    for (const tree of trees) {
        if (Math.hypot(x - tree.x, y - tree.y) < radius + tree.radius * 0.65) {
            return true;
        }
    }

    for (const rock of rocks) {
        if (Math.hypot(x - rock.x, y - rock.y) < radius + rock.radius * 0.75) {
            return true;
        }
    }

    return false;
}

/* =========================================================
   INPUT
========================================================= */

const keys = Object.create(null);

let joystickActive = false;
let joystickX = 0;
let joystickY = 0;
let joystickPointerId = null;

window.addEventListener("keydown", event => {
    keys[event.key.toLowerCase()] = true;

    if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(
            event.key.toLowerCase()
        )
    ) {
        event.preventDefault();
    }

    if (event.repeat) return;

    if (event.key.toLowerCase() === "i" || event.key.toLowerCase() === "b") {
        toggleInventory();
    }

    if (event.key.toLowerCase() === "e") {
        interact();
    }

    if (event.key.toLowerCase() === "j" || event.key === " ") {
        attack();
    }

    if (event.key.toLowerCase() === "k" || event.key === "Shift") {
        dodge();
    }
});

window.addEventListener("keyup", event => {
    keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
    for (const key in keys) {
        keys[key] = false;
    }

    joystickActive = false;
    joystickX = 0;
    joystickY = 0;
});

/* =========================================================
   INVENTORY
========================================================= */

function toggleInventory() {
    inventoryOpen = !inventoryOpen;

    const panel = document.getElementById("inventoryPanel");

    if (panel) {
        panel.style.display = inventoryOpen ? "block" : "none";
    }

    updateInventoryUI();
}

function updateInventoryUI() {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText("invWood", resources.wood);
    setText("invStone", resources.stone);
    setText("invMushroom", resources.mushroom);
    setText("invStrange", resources.strange);

    setText("invCampfire", craftedItems.campfire);
    setText("invAxe", craftedItems.axe);
    setText("invSword", craftedItems.sword);
    setText("invPotion", craftedItems.potion);
}

/* =========================================================
   CRAFTING
========================================================= */

function craftItem(type) {
    const recipes = {
        campfire: {
            wood: 5,
            stone: 3,
            label: "Fogueira"
        },
        axe: {
            wood: 8,
            stone: 4,
            label: "Machado"
        },
        sword: {
            wood: 5,
            stone: 8,
            label: "Espada simples"
        },
        potion: {
            mushroom: 2,
            wood: 1,
            label: "Poção simples"
        }
    };

    const recipe = recipes[type];

    if (!recipe) return;

    for (const resource in recipe) {
        if (resource === "label") continue;

        if ((resources[resource] || 0) < recipe[resource]) {
            showMessage("Recursos insuficientes para criar " + recipe.label + ".");
            return;
        }
    }

    for (const resource in recipe) {
        if (resource === "label") continue;
        resources[resource] -= recipe[resource];
    }

    craftedItems[type]++;

    showMessage(recipe.label + " criado!");
    createCraftParticles(player.x, player.y);
    updateHUD();
    updateInventoryUI();
}

function createCraftParticles(x, y) {
    for (let i = 0; i < 16; i++) {
        particles.push({
            x,
            y,
            vx: random(-55, 55),
            vy: random(-70, 10),
            life: random(0.3, 0.8),
            maxLife: 0.8,
            size: random(2, 5),
            color: "#c7d8a4"
        });
    }
}

/* =========================================================
   COMBAT
========================================================= */

function attack() {
    if (inventoryOpen || player.attackCooldown > 0) return;
    if (player.stamina < 12) {
        showMessage("Você está sem energia.");
        return;
    }

    player.stamina -= 12;
    player.attackCooldown = 0.45;
    player.attackTimer = 0.16;
    camera.shake = Math.max(camera.shake, 5);

    let hits = 0;

    for (const enemy of enemies) {
        if (enemy.dead) continue;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 75 || dist === 0) continue;

        const dot =
            (dx / dist) * player.dirX +
            (dy / dist) * player.dirY;

        if (dot < 0.15) continue;

        enemy.hp -= 25;
        enemy.hitTimer = 0.2;
        enemy.x += (dx / dist) * 25;
        enemy.y += (dy / dist) * 25;

        hits++;

        for (let i = 0; i < 8; i++) {
            particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: random(-75, 75),
                vy: random(-75, 75),
                life: random(0.15, 0.4),
                maxLife: 0.4,
                size: random(2, 4),
                color: "#b7a18b"
            });
        }

        if (enemy.hp <= 0) {
            enemy.dead = true;
            resources.wood++;

            for (let i = 0; i < 14; i++) {
                particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: random(-90, 90),
                    vy: random(-90, 90),
                    life: random(0.25, 0.7),
                    maxLife: 0.7,
                    size: random(2, 5),
                    color: "#7e9b63"
                });
            }
        }
    }

    if (hits > 0) {
        showMessage("Golpe acertou!");
    }

    updateHUD();
}

/* =========================================================
   DODGE
========================================================= */

function dodge() {
    if (inventoryOpen || player.dodgeCooldown > 0) return;

    if (player.stamina < 25) {
        showMessage("Sem energia para esquivar.");
        return;
    }

    player.stamina -= 25;
    player.dodgeCooldown = 0.7;
    player.dodgeTimer = 0.22;
    player.invulnerable = 0.25;
    camera.shake = Math.max(camera.shake, 3);

    for (let i = 0; i < 8; i++) {
        particles.push({
            x: player.x,
            y: player.y,
            vx: random(-35, 35),
            vy: random(-35, 35),
            life: random(0.15, 0.35),
            maxLife: 0.35,
            size: random(2, 4),
            color: "#a7b5a0"
        });
    }
}

/* =========================================================
   INTERACTION
========================================================= */

function interact() {
    if (inventoryOpen) return;

    let nearest = null;
    let nearestDistance = Infinity;
    let nearestType = "";

    const groups = [
        [mushrooms, "mushroom"],
        [woods, "wood"],
        [stones, "stone"]
    ];

    for (const [group, type] of groups) {
        for (const object of group) {
            if (object.collected) continue;

            const dist = Math.hypot(
                player.x - object.x,
                player.y - object.y
            );

            if (dist < 55 && dist < nearestDistance) {
                nearest = object;
                nearestDistance = dist;
                nearestType = type;
            }
        }
    }

    if (!nearest) {
        if (insideShelter(player.x, player.y, 180)) {
            showMessage("Abrigo: local seguro.");
        } else {
            showMessage("Não há nada para interagir aqui.");
        }

        return;
    }

    collectObject(nearest, nearestType);
}

function collectObject(object, type) {
    object.collected = true;

    if (type === "mushroom") {
        if (object.strange) {
            resources.strange++;

            if (questStage === 0) {
                questStage = 1;
                showMessage("O cogumelo estranho está reagindo. Volte ao abrigo.");
            } else {
                showMessage("Você encontrou um cogumelo estranho.");
            }
        } else {
            resources.mushroom++;
            showMessage("Cogumelo coletado.");
        }
    } else if (type === "wood") {
        resources.wood++;
        showMessage("Madeira coletada.");
    } else if (type === "stone") {
        resources.stone++;
        showMessage("Pedra coletada.");
    }

    createCraftParticles(object.x, object.y);
    updateHUD();
    updateInventoryUI();
}
```

```javascript
/* =========================================================
   V5–V10: SISTEMAS DE JOGO
========================================================= */

const progression = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    gold: 0,
    skillPoints: 0,
    kills: 0,
    bossesDefeated: 0
};

const survival = {
    hunger: 100,
    thirst: 100,
    hungerTimer: 0,
    thirstTimer: 0,
    starvationTimer: 0
};

const equipment = {
    weapon: "sword",
    armor: "none",
    axeLevel: 0,
    swordLevel: 1,
    armorLevel: 0,
    potions: 0,
    arrows: 0
};

const playerClass = {
    selected: null,
    unlocked: {
        warrior: true,
        mage: true,
        rogue: true
    },
    mana: 100,
    maxMana: 100,
    specialCooldown: 0,
    skills: {
        strength: 0,
        defense: 0,
        magic: 0,
        agility: 0,
        healing: 0
    }
};

const weather = {
    current: "clear",
    timer: 0,
    duration: 90,
    intensity: 0,
    wind: 0
};

const worldState = {
    paused: false,
    gameOver: false,
    started: false,
    mapOpen: false,
    dialogueOpen: false,
    classMenuOpen: false,
    saveSlot: "darkwood-save-v10",
    lastTimestamp: 0,
    elapsed: 0,
    bossSpawned: false,
    ending: null
};

const quests = {
    active: "first_mushroom",
    completed: [],
    progress: Object.create(null)
};

const structures = [];
const npcs = [];
const animals = [];
const chests = [];
const crystals = [];
const shrines = [];
const fireflies = [];
const spells = [];
const floatingTexts = [];
const worldEvents = [];

let dialogue = null;
let activeBoss = null;
let minimapVisible = false;
let attackCombo = 0;
let attackComboTimer = 0;
let footstepTimer = 0;
let ambientTimer = 0;
let autosaveTimer = 0;
let survivalDamageTimer = 0;
let gameStarted = false;

const CLASS_INFO = {
    warrior: {
        name: "Guerreiro",
        description: "Combate corpo a corpo, resistência e força.",
        color: "#c85f4e",
        hp: 125,
        stamina: 115,
        mana: 50,
        speed: 165,
        damage: 1.3
    },
    mage: {
        name: "Mago",
        description: "Magia elemental, ataques à distância e cura.",
        color: "#a28be8",
        hp: 85,
        stamina: 95,
        mana: 150,
        speed: 160,
        damage: 1
    },
    rogue: {
        name: "Ladino",
        description: "Velocidade, esquiva, furtividade e golpes rápidos.",
        color: "#7fb66b",
        hp: 95,
        stamina: 130,
        mana: 75,
        speed: 205,
        damage: 1.05
    }
};

const QUEST_DATA = {
    first_mushroom: {
        title: "O cogumelo estranho",
        description: "Encontre um cogumelo estranho na floresta.",
        target: 1
    },
    return_shelter: {
        title: "O caminho de volta",
        description: "Volte ao abrigo e descubra o que aconteceu.",
        target: 1
    },
    meet_elder: {
        title: "Uma voz na floresta",
        description: "Encontre o ancião perto das ruínas.",
        target: 1
    },
    gather_supplies: {
        title: "Preparativos",
        description: "Reúna 5 madeiras e 3 pedras.",
        target: 1
    },
    investigate_ruins: {
        title: "Ruínas esquecidas",
        description: "Investigue o santuário antigo.",
        target: 1
    },
    defeat_guardian: {
        title: "O guardião da mata",
        description: "Derrote o guardião das ruínas.",
        target: 1
    },
    find_three_crystals: {
        title: "Fragmentos antigos",
        description: "Encontre os três cristais mágicos.",
        target: 3
    },
    reach_castle: {
        title: "O reino perdido",
        description: "Encontre o castelo ancestral.",
        target: 1
    },
    defeat_dragon: {
        title: "A sombra do dragão",
        description: "Derrote o dragão ancestral.",
        target: 1
    }
};

/* =========================================================
   DOM HELPERS
========================================================= */

function element(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const node = element(id);
    if (node) node.textContent = String(value);
}

function setWidth(id, value) {
    const node = element(id);
    if (node) {
        node.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
}

function showElement(id, visible, display = "block") {
    const node = element(id);
    if (node) node.style.display = visible ? display : "none";
}

function bindClick(id, callback) {
    const node = element(id);
    if (node) node.addEventListener("click", callback);
}

function showMessage(text, duration = 2.6) {
    messageText = text;
    messageTimer = duration;

    const notification = element("v5Notification");
    if (notification) {
        notification.textContent = text;
        notification.style.display = "block";
        notification.style.opacity = "1";
    }

    const interaction = element("interaction");
    if (interaction) {
        interaction.textContent = text;
        interaction.style.display = "block";
    }
}

function hideMessage() {
    const notification = element("v5Notification");
    if (notification) notification.style.opacity = "0";

    const interaction = element("interaction");
    if (interaction) interaction.style.display = "none";
}

/* =========================================================
   MOBILE CONTROLS
========================================================= */

const joystickElement = element("joystick");
const joystickKnob = element("joystickKnob");

if (joystickElement) {
    joystickElement.addEventListener("pointerdown", event => {
        joystickActive = true;
        joystickPointerId = event.pointerId;

        try {
            joystickElement.setPointerCapture(event.pointerId);
        } catch (_) {}

        updateJoystick(event.clientX, event.clientY);
    });

    joystickElement.addEventListener("pointermove", event => {
        if (!joystickActive || event.pointerId !== joystickPointerId) return;
        updateJoystick(event.clientX, event.clientY);
    });

    joystickElement.addEventListener("pointerup", resetJoystick);
    joystickElement.addEventListener("pointercancel", resetJoystick);
    joystickElement.addEventListener("lostpointercapture", resetJoystick);
}

function updateJoystick(clientX, clientY) {
    if (!joystickElement) return;

    const rect = joystickElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const max = Math.max(1, rect.width / 2 - 28);
    const len = Math.hypot(dx, dy);

    if (len > max) {
        dx = dx / len * max;
        dy = dy / len * max;
    }

    joystickX = dx / max;
    joystickY = dy / max;

    if (joystickKnob) {
        joystickKnob.style.transform =
            `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
}

function resetJoystick() {
    joystickActive = false;
    joystickPointerId = null;
    joystickX = 0;
    joystickY = 0;

    if (joystickKnob) {
        joystickKnob.style.transform = "translate(-50%, -50%)";
    }
}

bindClick("interactButton", interact);
bindClick("attackButton", attack);
bindClick("dodgeButton", dodge);
bindClick("inventoryButton", toggleInventory);
bindClick("specialButton", castSpecial);
bindClick("potionButton", usePotion);
bindClick("eatButton", eatMushroom);
bindClick("mapButton", toggleMap);
bindClick("craftCampfire", () => craftItem("campfire"));
bindClick("craftAxe", () => craftItem("axe"));
bindClick("craftSword", () => craftItem("sword"));
bindClick("craftPotion", () => craftItem("potion"));
bindClick("closeInventory", () => {
    if (inventoryOpen) toggleInventory();
});
bindClick("closeMap", () => {
    worldState.mapOpen = false;
    showElement("mapPanel", false);
});

function getMovementInput() {
    let x = joystickX;
    let y = joystickY;

    if (keys.w || keys.arrowup) y -= 1;
    if (keys.s || keys.arrowdown) y += 1;
    if (keys.a || keys.arrowleft) x -= 1;
    if (keys.d || keys.arrowright) x += 1;

    const length = Math.hypot(x, y);

    if (length > 1) {
        x /= length;
        y /= length;
    }

    return { x, y };
}

/* =========================================================
   QUEST SYSTEM
========================================================= */

function setQuest(id) {
    if (!QUEST_DATA[id]) return;

    quests.active = id;
    quests.progress[id] = 0;
    updateQuestUI();

    showMessage("Nova missão: " + QUEST_DATA[id].title, 3.5);
}

function advanceQuest(id, amount = 1) {
    if (quests.active !== id) return;

    quests.progress[id] = (quests.progress[id] || 0) + amount;

    if (quests.progress[id] >= QUEST_DATA[id].target) {
        completeQuest(id);
    }

    updateQuestUI();
}

function completeQuest(id) {
    if (quests.completed.includes(id)) return;

    quests.completed.push(id);
    progression.xp += 35;
    progression.gold += 12;
    showMessage("Missão concluída: " + QUEST_DATA[id].title, 3.5);

    checkLevelUp();

    const sequence = {
        first_mushroom: "return_shelter",
        return_shelter: "meet_elder",
        meet_elder: "gather_supplies",
        gather_supplies: "investigate_ruins",
        investigate_ruins: "defeat_guardian",
        defeat_guardian: "find_three_crystals",
        find_three_crystals: "reach_castle",
        reach_castle: "defeat_dragon"
    };

    const next = sequence[id];

    if (next) {
        setTimeoutSafe(() => {
            if (!worldState.gameOver) setQuest(next);
        }, 1500);
    } else if (id === "defeat_dragon") {
        worldState.ending = playerClass.selected || "wanderer";
        showEnding();
    }

    updateHUD();
    updateQuestUI();
}

function setTimeoutSafe(callback, delay) {
    window.setTimeout(callback, delay);
}

function updateQuestUI() {
    const quest = QUEST_DATA[quests.active];

    if (!quest) {
        setText("questText", "Explore o mundo e descubra seus segredos.");
        return;
    }

    const progress = quests.progress[quests.active] || 0;
    setText(
        "questText",
        `${quest.description}${quest.target > 1 ? ` (${Math.min(progress, quest.target)}/${quest.target})` : ""}`
    );
}

function updateQuest() {
    if (quests.active === "return_shelter") {
        if (insideShelter(player.x, player.y, 10)) {
            advanceQuest("return_shelter");
        }
    }

    if (quests.active === "gather_supplies") {
        if (resources.wood >= 5 && resources.stone >= 3) {
            advanceQuest("gather_supplies");
        }
    }

    if (quests.active === "find_three_crystals") {
        const found = crystals.filter(crystal => crystal.collected).length;
        quests.progress.find_three_crystals = found;

        if (found >= 3) {
            completeQuest("find_three_crystals");
        }
    }

    updateQuestUI();
}

/* =========================================================
   PLAYER CLASS
========================================================= */

function chooseClass(type) {
    if (!CLASS_INFO[type]) return;

    playerClass.selected = type;
    const info = CLASS_INFO[type];

    player.maxHp = info.hp;
    player.hp = info.hp;
    player.maxStamina = info.stamina;
    player.stamina = info.stamina;
    player.speed = info.speed;
    playerClass.maxMana = info.mana;
    playerClass.mana = info.mana;

    worldState.classMenuOpen = false;
    showElement("classSelection", false);

    setText("v5Class", info.name);
    showMessage("Você escolheu o caminho: " + info.name, 3);
    updateHUD();
}

bindClick("chooseWarrior", () => chooseClass("warrior"));
bindClick("chooseMage", () => chooseClass("mage"));
bindClick("chooseRogue", () => chooseClass("rogue"));

function openClassSelection() {
    worldState.classMenuOpen = true;
    showElement("classSelection", true, "flex");
}

function applyClassBonus(baseDamage) {
    const type = playerClass.selected;
    if (!type) return baseDamage;

    const info = CLASS_INFO[type];
    const strength = playerClass.skills.strength || 0;

    return baseDamage * info.damage * (1 + strength * 0.08);
}

/* =========================================================
   XP AND LEVELING
========================================================= */

function gainXP(amount) {
    progression.xp += amount;
    showFloatingText(player.x, player.y - 25, `+${amount} XP`, "#c8d8f4");
    checkLevelUp();
    updateHUD();
}

function checkLevelUp() {
    while (progression.xp >= progression.xpToNext) {
        progression.xp -= progression.xpToNext;
        progression.level++;
        progression.skillPoints++;
        progression.xpToNext = Math.floor(progression.xpToNext * 1.35);

        player.maxHp += 5;
        player.hp = Math.min(player.maxHp, player.hp + 20);
        player.maxStamina += 3;
        player.stamina = player.maxStamina;
        playerClass.maxMana += 5;
        playerClass.mana = playerClass.maxMana;

        showMessage(`Nível ${progression.level}! Você ganhou um ponto de habilidade.`, 3.5);

        for (let i = 0; i < 24; i++) {
            particles.push({
                x: player.x,
                y: player.y,
                vx: random(-90, 90),
                vy: random(-100, 20),
                life: random(0.5, 1.1),
                maxLife: 1.1,
                size: random(2, 5),
                color: "#d9d89a"
            });
        }
    }
}

function spendSkillPoint(skill) {
    if (progression.skillPoints <= 0) {
        showMessage("Você não tem pontos de habilidade.");
        return;
    }

    if (!(skill in playerClass.skills)) return;

    playerClass.skills[skill]++;
    progression.skillPoints--;

    showMessage(`Habilidade aprimorada: ${skill}.`);
    updateHUD();
}

/* =========================================================
   SURVIVAL: HUNGER AND THIRST
========================================================= */

function updateSurvival(dt) {
    survival.hungerTimer += dt;
    survival.thirstTimer += dt;
    survivalDamageTimer += dt;

    if (survival.hungerTimer >= 8) {
        survival.hungerTimer = 0;
        survival.hunger = Math.max(0, survival.hunger - 0.7);
    }

    if (survival.thirstTimer >= 6) {
        survival.thirstTimer = 0;
        survival.thirst = Math.max(0, survival.thirst - 0.9);
    }

    if (
        (survival.hunger <= 0 || survival.thirst <= 0) &&
        survivalDamageTimer >= 3
    ) {
        survivalDamageTimer = 0;
        damagePlayer(2);
        showMessage("Você precisa comer e beber!");
    }

    if (survival.hunger > 0 && survival.thirst > 0) {
        if (player.hp < player.maxHp) {
            player.hp = Math.min(player.maxHp, player.hp + dt * 0.25);
        }
    }
}

function eatMushroom() {
    if (resources.mushroom <= 0) {
        showMessage("Você não tem cogumelos para comer.");
        return;
    }

    resources.mushroom--;
    survival.hunger = Math.min(100, survival.hunger + 24);
    player.hp = Math.min(player.maxHp, player.hp + 5);

    showMessage("Você comeu um cogumelo.");
    updateHUD();
    updateInventoryUI();
}

function drinkWater() {
    survival.thirst = Math.min(100, survival.thirst + 35);
    showMessage("Você bebeu água fresca.");
    updateHUD();
}

function usePotion() {
    if (craftedItems.potion <= 0) {
        showMessage("Você não possui poções.");
        return;
    }

    craftedItems.potion--;
    player.hp = Math.min(player.maxHp, player.hp + 35);
    playerClass.mana = Math.min(playerClass.maxMana, playerClass.mana + 20);

    showMessage("Poção utilizada.");
    createCraftParticles(player.x, player.y);
    updateHUD();
    updateInventoryUI();
}

/* =========================================================
   SPECIAL ABILITIES
========================================================= */

function castSpecial() {
    if (inventoryOpen || worldState.paused || worldState.gameOver) return;
    if (playerClass.specialCooldown > 0) return;

    const type = playerClass.selected || "warrior";

    if (type === "mage") {
        castMagicBurst();
    } else if (type === "rogue") {
        rogueDash();
    } else {
        warriorStrike();
    }
}

function warriorStrike() {
    if (player.stamina < 20) {
        showMessage("Você não tem energia suficiente.");
        return;
    }

    player.stamina -= 20;
    playerClass.specialCooldown = 5;
    camera.shake = 10;

    let hitCount = 0;

    for (const enemy of enemies) {
        if (enemy.dead) continue;

        const d = distance(player, enemy);

        if (d <= 115) {
            enemy.hp -= applyClassBonus(38);
            enemy.hitTimer = 0.35;

            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const len = Math.max(1, Math.hypot(dx, dy));

            enemy.x += dx / len * 45;
            enemy.y += dy / len * 45;

            createHitParticles(enemy.x, enemy.y);
            hitCount++;

            if (enemy.hp <= 0) killEnemy(enemy);
        }
    }

    for (let i = 0; i < 30; i++) {
        particles.push({
            x: player.x + random(-60, 60),
            y: player.y + random(-60, 60),
            vx: random(-120, 120),
            vy: random(-120, 120),
            life: random(0.25, 0.6),
            maxLife: 0.6,
            size: random(3, 6),
            color: "#d9b36c"
        });
    }

    showMessage(hitCount ? "Golpe poderoso!" : "Golpe poderoso!");
}

function castMagicBurst() {
    if (playerClass.mana < 25) {
        showMessage("Mana insuficiente.");
        return;
    }

    playerClass.mana -= 25;
    playerClass.specialCooldown = 3.5;

    spells.push({
        x: player.x + player.dirX * 28,
        y: player.y + player.dirY * 28,
        vx: player.dirX * 320,
        vy: player.dirY * 320,
        radius: 12,
        damage: applyClassBonus(34),
        life: 1.8,
        color: "#b99cff"
    });

    showMessage("Orbe arcano lançado!");
}

function rogueDash() {
    if (player.stamina < 15) {
        showMessage("Energia insuficiente.");
        return;
    }

    player.stamina -= 15;
    playerClass.specialCooldown = 3;
    player.invulnerable = Math.max(player.invulnerable, 0.6);

    const move = getMovementInput();
    const dx = move.x || player.dirX;
    const dy = move.y || player.dirY;

    const targetX = player.x + dx * 180;
    const targetY = player.y + dy * 180;

    if (!isBlocked(targetX, targetY)) {
        player.x = targetX;
        player.y = targetY;
    } else {
        player.x += dx * 60;
        player.y += dy * 60;
    }

    camera.shake = 4;

    for (let i = 0; i < 18; i++) {
        particles.push({
            x: player.x,
            y: player.y,
            vx: random(-70, 70),
            vy: random(-70, 70),
            life: random(0.15, 0.4),
            maxLife: 0.4,
            size: random(2, 4),
            color: "#91d77c"
        });
    }

    showMessage("Passo das sombras!");
}

/* =========================================================
   ENEMY DEATH AND REWARDS
========================================================= */

function killEnemy(enemy) {
    if (enemy.dead) return;

    enemy.dead = true;
    progression.kills++;

    resources.wood += randomInt(0, 2);
    progression.gold += randomInt(1, 4);
    gainXP(enemy.type === "boss" ? 150 : 20);

    createDeathParticles(enemy.x, enemy.y);
    showFloatingText(enemy.x, enemy.y - 20, "+XP", "#d5dba7");

    if (enemy.type === "boss") {
        progression.bossesDefeated++;
        activeBoss = null;
        advanceQuest("defeat_guardian");
        advanceQuest("defeat_dragon");
        showMessage("Chefe derrotado!", 3);
    }

    updateHUD();
    updateInventoryUI();
}

/* =========================================================
   SPELL UPDATE
========================================================= */

function updateSpells(dt) {
    for (let i = spells.length - 1; i >= 0; i--) {
        const spell = spells[i];

        spell.x += spell.vx * dt;
        spell.y += spell.vy * dt;
        spell.life -= dt;

        for (const enemy of enemies) {
            if (enemy.dead) continue;

            if (Math.hypot(spell.x - enemy.x, spell.y - enemy.y) <
                spell.radius + enemy.radius) {
                enemy.hp -= spell.damage;
                enemy.hitTimer = 0.2;
                createHitParticles(enemy.x, enemy.y);

                if (enemy.hp <= 0) killEnemy(enemy);

                spell.life = 0;
                break;
            }
        }

        if (spell.life <= 0) {
            for (let j = 0; j < 8; j++) {
                particles.push({
                    x: spell.x,
                    y: spell.y,
                    vx: random(-60, 60),
                    vy: random(-60, 60),
                    life: random(0.15, 0.4),
                    maxLife: 0.4,
                    size: random(2, 5),
                    color: spell.color
                });
            }

            spells.splice(i, 1);
        }
    }
}

/* =========================================================
   WEATHER
========================================================= */

function updateWeather(dt) {
    weather.timer += dt;

    if (weather.timer >= weather.duration) {
        weather.timer = 0;

        const choices = ["clear", "clear", "fog", "rain", "wind"];
        weather.current = choices[randomInt(0, choices.length - 1)];

        weather.intensity = weather.current === "clear" ? 0 : random(0.2, 0.7);
        weather.wind = weather.current === "wind" || weather.current === "rain"
            ? random(-1, 1)
            : 0;

        showMessage({
            clear: "O céu está limpo.",
            fog: "Uma névoa envolve a floresta.",
            rain: "A chuva começou a cair.",
            wind: "O vento sopra entre as árvores."
        }[weather.current]);
    }
}

function drawWeather() {
    if (weather.current === "fog") {
        ctx.fillStyle = `rgba(175, 190, 178, ${0.07 + weather.intensity * 0.08})`;
        ctx.fillRect(0, 0, W, H);
    }

    if (weather.current === "rain") {
        ctx.save();
        ctx.strokeStyle = `rgba(180, 200, 220, ${0.25 + weather.intensity * 0.25})`;
        ctx.lineWidth = 1;

        for (let i = 0; i < 100; i++) {
            const x = (i * 97 + gameTime * 280) % (W + 100);
            const y = (i * 61 + gameTime * 480) % (H + 100);

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 5, y + 13);
            ctx.stroke();
        }

        ctx.restore();
    }

    if (weather.current === "wind") {
        ctx.save();
        ctx.strokeStyle = "rgba(200,215,190,0.13)";
        ctx.lineWidth = 1;

        for (let i = 0; i < 20; i++) {
            const x = (i * 133 + gameTime * weather.wind * 120) % W;
            const y = (i * 71) % H;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 22, y - 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}
```

```javascript
/* =========================================================
   NPCS, ANIMAIS E ESTRUTURAS
========================================================= */

function createNPC(name, x, y, role, color = "#b6c6a1") {
    return {
        name,
        x,
        y,
        role,
        color,
        radius: 13,
        interactRadius: 65,
        wanderTimer: random(1, 4),
        dirX: 0,
        dirY: 0,
        moving: false
    };
}

function createWorldEntities() {
    npcs.length = 0;
    animals.length = 0;
    chests.length = 0;
    crystals.length = 0;
    shrines.length = 0;
    fireflies.length = 0;
    structures.length = 0;

    npcs.push(
        createNPC("Ancião Edrin", 2110, 1140, "elder", "#b6c6e0"),
        createNPC("Lia", 1710, 1280, "friend", "#d8a8b5"),
        createNPC("Ferreiro Bram", 2440, 1980, "blacksmith", "#c4a17e"),
        createNPC("Maga Selene", 2820, 740, "mage", "#b6a0e8"),
        createNPC("Mercador", 2210, 2090, "merchant", "#d7c17e")
    );

    for (let i = 0; i < 18; i++) {
        animals.push({
            x: random(120, world.width - 120),
            y: random(120, world.height - 120),
            radius: 8,
            speed: random(35, 65),
            type: Math.random() < 0.5 ? "rabbit" : "deer",
            dirX: random(-1, 1),
            dirY: random(-1, 1),
            wanderTimer: random(1, 4),
            alive: true
        });
    }

    for (let i = 0; i < 12; i++) {
        chests.push({
            x: random(150, world.width - 150),
            y: random(150, world.height - 150),
            radius: 13,
            opened: false
        });
    }

    const crystalLocations = [
        { x: 700, y: 500 },
        { x: 3000, y: 700 },
        { x: 2600, y: 2250 }
    ];

    for (const point of crystalLocations) {
        crystals.push({
            x: point.x,
            y: point.y,
            radius: 13,
            collected: false,
            pulse: random(0, Math.PI * 2)
        });
    }

    shrines.push(
        { x: 620, y: 650, type: "forest", activated: false },
        { x: 3030, y: 620, type: "arcane", activated: false },
        { x: 2600, y: 2210, type: "ancient", activated: false }
    );

    structures.push(
        { x: 760, y: 450, type: "ruins", width: 150, height: 100 },
        { x: 2950, y: 650, type: "tower", width: 100, height: 150 },
        { x: 2700, y: 2200, type: "castle", width: 260, height: 210 },
        { x: 2380, y: 1930, type: "village", width: 200, height: 150 }
    );

    for (let i = 0; i < 45; i++) {
        fireflies.push({
            x: random(0, world.width),
            y: random(0, world.height),
            phase: random(0, Math.PI * 2),
            speed: random(0.7, 1.8),
            radius: random(1, 2.5)
        });
    }
}

/* =========================================================
   NPC MOVEMENT AND INTERACTION
========================================================= */

function updateNPCs(dt) {
    for (const npc of npcs) {
        const distanceToPlayer = Math.hypot(
            player.x - npc.x,
            player.y - npc.y
        );

        if (distanceToPlayer < 160) {
            npc.moving = false;
            continue;
        }

        npc.wanderTimer -= dt;

        if (npc.wanderTimer <= 0) {
            npc.wanderTimer = random(2, 5);
            npc.dirX = random(-1, 1);
            npc.dirY = random(-1, 1);

            const length = Math.hypot(npc.dirX, npc.dirY) || 1;
            npc.dirX /= length;
            npc.dirY /= length;
        }

        const nx = npc.x + npc.dirX * 16 * dt;
        const ny = npc.y + npc.dirY * 16 * dt;

        if (!isBlocked(nx, npc.y, npc.radius)) npc.x = nx;
        if (!isBlocked(npc.x, ny, npc.radius)) npc.y = ny;

        npc.moving = Math.abs(npc.dirX) + Math.abs(npc.dirY) > 0.1;
    }
}

function interactWithNPC(npc) {
    if (npc.role === "elder") {
        openDialogue(
            npc.name,
            "A floresta está mudando. Os cogumelos antigos despertaram algo que deveria permanecer adormecido.",
            [
                {
                    text: "Quero entender o que está acontecendo.",
                    action: () => {
                        closeDialogue();
                        if (!quests.completed.includes("meet_elder")) {
                            advanceQuest("meet_elder");
                        }
                        openClassSelection();
                    }
                },
                {
                    text: "Você pode me ajudar?",
                    action: () => {
                        closeDialogue();
                        progression.gold += 5;
                        showMessage("O ancião entregou 5 moedas.");
                        updateHUD();
                    }
                },
                {
                    text: "Preciso ir.",
                    action: closeDialogue
                }
            ]
        );
        return;
    }

    if (npc.role === "friend") {
        openDialogue(
            npc.name,
            "Você viu aquela luz entre as árvores? Acho que não estamos mais no mesmo lugar de antes.",
            [
                {
                    text: "Vamos investigar juntos.",
                    action: () => {
                        closeDialogue();
                        gainXP(10);
                        showMessage("Lia deseja explorar a floresta com você.");
                    }
                },
                {
                    text: "Fique aqui por enquanto.",
                    action: () => {
                        closeDialogue();
                        showMessage("Lia ficará perto do abrigo.");
                    }
                }
            ]
        );
        return;
    }

    if (npc.role === "merchant") {
        openDialogue(
            npc.name,
            "Tenho alguns suprimentos. O que deseja comprar?",
            [
                {
                    text: "Comprar poção — 12 moedas",
                    action: () => {
                        closeDialogue();
                        if (progression.gold >= 12) {
                            progression.gold -= 12;
                            craftedItems.potion++;
                            showMessage("Você comprou uma poção.");
                        } else {
                            showMessage("Você não tem moedas suficientes.");
                        }
                        updateHUD();
                        updateInventoryUI();
                    }
                },
                {
                    text: "Comprar comida — 5 moedas",
                    action: () => {
                        closeDialogue();
                        if (progression.gold >= 5) {
                            progression.gold -= 5;
                            survival.hunger = Math.min(100, survival.hunger + 40);
                            showMessage("Você comprou provisões.");
                        } else {
                            showMessage("Você não tem moedas suficientes.");
                        }
                        updateHUD();
                    }
                },
                {
                    text: "Sair",
                    action: closeDialogue
                }
            ]
        );
        return;
    }

    if (npc.role === "blacksmith") {
        openDialogue(
            npc.name,
            "Uma arma bem feita pode salvar sua vida. Posso melhorar sua espada por 20 moedas.",
            [
                {
                    text: "Melhorar espada — 20 moedas",
                    action: () => {
                        closeDialogue();

                        if (progression.gold < 20) {
                            showMessage("Você precisa de 20 moedas.");
                            return;
                        }

                        progression.gold -= 20;
                        equipment.swordLevel++;
                        showMessage("Sua espada foi aprimorada!");
                        updateHUD();
                    }
                },
                {
                    text: "Sair",
                    action: closeDialogue
                }
            ]
        );
        return;
    }

    if (npc.role === "mage") {
        openDialogue(
            npc.name,
            "A magia responde à intenção. Não desperdice sua mana com medo.",
            [
                {
                    text: "Aprender magia — 15 moedas",
                    action: () => {
                        closeDialogue();

                        if (progression.gold < 15) {
                            showMessage("Você precisa de 15 moedas.");
                            return;
                        }

                        progression.gold -= 15;
                        playerClass.skills.magic++;
                        playerClass.maxMana += 10;
                        playerClass.mana = playerClass.maxMana;
                        showMessage("Seu conhecimento mágico aumentou.");
                        updateHUD();
                    }
                },
                {
                    text: "Sair",
                    action: closeDialogue
                }
            ]
        );
    }
}

function interactWithNearestEntity() {
    let nearest = null;
    let nearestDistance = 78;

    for (const npc of npcs) {
        const d = distance(player, npc);
        if (d < nearestDistance) {
            nearest = { type: "npc", object: npc };
            nearestDistance = d;
        }
    }

    for (const chest of chests) {
        if (chest.opened) continue;
        const d = distance(player, chest);

        if (d < nearestDistance) {
            nearest = { type: "chest", object: chest };
            nearestDistance = d;
        }
    }

    for (const shrine of shrines) {
        if (shrine.activated) continue;
        const d = distance(player, shrine);

        if (d < nearestDistance) {
            nearest = { type: "shrine", object: shrine };
            nearestDistance = d;
        }
    }

    for (const crystal of crystals) {
        if (crystal.collected) continue;
        const d = distance(player, crystal);

        if (d < nearestDistance) {
            nearest = { type: "crystal", object: crystal };
            nearestDistance = d;
        }
    }

    if (!nearest) return false;

    if (nearest.type === "npc") {
        interactWithNPC(nearest.object);
    } else if (nearest.type === "chest") {
        openChest(nearest.object);
    } else if (nearest.type === "shrine") {
        activateShrine(nearest.object);
    } else if (nearest.type === "crystal") {
        collectCrystal(nearest.object);
    }

    return true;
}

/* =========================================================
   DIALOGUE
========================================================= */

function openDialogue(speaker, text, choices = []) {
    dialogue = { speaker, text, choices };
    worldState.dialogueOpen = true;

    setText("dialogueSpeaker", speaker);
    setText("dialogueText", text);

    const panel = element("dialoguePanel");
    const choiceContainer = element("dialogueChoices");

    if (panel) panel.style.display = "block";

    if (choiceContainer) {
        choiceContainer.innerHTML = "";

        for (const choice of choices) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = choice.text;

            button.addEventListener("click", () => {
                if (typeof choice.action === "function") {
                    choice.action();
                }
            });

            choiceContainer.appendChild(button);
        }
    }
}

function closeDialogue() {
    dialogue = null;
    worldState.dialogueOpen = false;
    showElement("dialoguePanel", false);
}

function updateDialogueInput() {
    if (worldState.dialogueOpen && keys.escape) {
        closeDialogue();
        keys.escape = false;
    }
}

/* =========================================================
   CHESTS, CRYSTALS AND SHRINES
========================================================= */

function openChest(chest) {
    if (chest.opened) return;

    chest.opened = true;

    const goldFound = randomInt(4, 15);
    progression.gold += goldFound;

    if (Math.random() < 0.45) {
        craftedItems.potion++;
        showMessage(`Baú aberto: ${goldFound} moedas e uma poção!`);
    } else {
        const woodFound = randomInt(2, 6);
        resources.wood += woodFound;
        showMessage(`Baú aberto: ${goldFound} moedas e ${woodFound} madeiras.`);
    }

    gainXP(12);
    createCollectionParticles(chest.x, chest.y);
    updateHUD();
    updateInventoryUI();
}

function collectCrystal(crystal) {
    if (crystal.collected) return;

    crystal.collected = true;
    progression.gold += 10;
    playerClass.maxMana += 5;
    playerClass.mana = playerClass.maxMana;

    gainXP(35);
    showMessage("Cristal ancestral encontrado!");
    createCraftParticles(crystal.x, crystal.y);
    advanceQuest("find_three_crystals");
    updateHUD();
}

function activateShrine(shrine) {
    if (shrine.activated) return;

    shrine.activated = true;
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    playerClass.mana = playerClass.maxMana;
    survival.hunger = Math.min(100, survival.hunger + 15);
    survival.thirst = Math.min(100, survival.thirst + 15);

    gainXP(20);
    showMessage("O santuário restaurou suas forças.");
    createCraftParticles(shrine.x, shrine.y);
    updateHUD();
}

/* =========================================================
   ANIMALS
========================================================= */

function updateAnimals(dt) {
    for (const animal of animals) {
        if (!animal.alive) continue;

        const d = distance(player, animal);

        if (d < 150) {
            const dx = animal.x - player.x;
            const dy = animal.y - player.y;
            const length = Math.max(1, Math.hypot(dx, dy));

            animal.dirX = dx / length;
            animal.dirY = dy / length;
            animal.wanderTimer = 1;
        } else {
            animal.wanderTimer -= dt;

            if (animal.wanderTimer <= 0) {
                animal.wanderTimer = random(1, 4);
                animal.dirX = random(-1, 1);
                animal.dirY = random(-1, 1);

                const length = Math.hypot(animal.dirX, animal.dirY) || 1;
                animal.dirX /= length;
                animal.dirY /= length;
            }
        }

        const nx = animal.x + animal.dirX * animal.speed * dt;
        const ny = animal.y + animal.dirY * animal.speed * dt;

        if (!isBlocked(nx, animal.y, animal.radius)) animal.x = nx;
        if (!isBlocked(animal.x, ny, animal.radius)) animal.y = ny;
    }
}

/* =========================================================
   FIRELIES
========================================================= */

function updateFireflies(dt) {
    for (const fly of fireflies) {
        fly.phase += dt * fly.speed;
    }
}

/* =========================================================
   DAY AND NIGHT
========================================================= */

function updateDayNight(dt) {
    worldTime += dt;

    const cycleLength = 180;
    const cyclePosition = (worldTime % cycleLength) / cycleLength;

    day = Math.floor(worldTime / cycleLength) + 1;

    const isNight = cyclePosition > 0.68 || cyclePosition < 0.12;

    if (isNight && Math.random() < dt * 0.018) {
        spawnNightEnemy();
    }

    updateHUD();
}

function isNightTime() {
    const cyclePosition = (worldTime % 180) / 180;
    return cyclePosition > 0.68 || cyclePosition < 0.12;
}

function drawNightOverlay() {
    const cyclePosition = (worldTime % 180) / 180;
    let darkness = 0;

    if (cyclePosition > 0.62 && cyclePosition < 0.82) {
        darkness = (cyclePosition - 0.62) / 0.2 * 0.55;
    } else if (cyclePosition >= 0.82) {
        darkness = 0.55;
    } else if (cyclePosition < 0.12) {
        darkness = 0.55 * (1 - cyclePosition / 0.12);
    }

    if (darkness <= 0) return;

    ctx.save();
    ctx.fillStyle = `rgba(5, 8, 22, ${darkness})`;
    ctx.fillRect(0, 0, W, H);

    const screenX = player.x - camera.x + W / 2;
    const screenY = player.y - camera.y + H / 2;

    const gradient = ctx.createRadialGradient(
        screenX, screenY, 25,
        screenX, screenY, 240
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.55, "rgba(0,0,0,0.1)");
    gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.8, darkness + 0.1)})`);

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
}

/* =========================================================
   NIGHT CREATURES
========================================================= */

function spawnNightEnemy() {
    if (enemies.filter(enemy => !enemy.dead).length >= 22) return;

    const angle = random(0, Math.PI * 2);
    const spawnDistance = random(300, 450);

    const x = Math.max(
        60,
        Math.min(world.width - 60, player.x + Math.cos(angle) * spawnDistance)
    );

    const y = Math.max(
        60,
        Math.min(world.height - 60, player.y + Math.sin(angle) * spawnDistance)
    );

    enemies.push({
        x,
        y,
        radius: 16,
        hp: 45,
        maxHp: 45,
        speed: random(65, 85),
        damage: 12,
        attackCooldown: random(0, 1),
        hitTimer: 0,
        wanderTimer: 2,
        wanderX: 0,
        wanderY: 0,
        dead: false,
        type: "nightstalker"
    });
}

/* =========================================================
   BOSS SPAWNING
========================================================= */

function spawnBoss(type = "guardian") {
    if (activeBoss && !activeBoss.dead) {
        showMessage("Já existe um chefe nesta região.");
        return;
    }

    const location = type === "dragon"
        ? { x: 2820, y: 2200 }
        : { x: 820, y: 520 };

    const boss = {
        x: location.x,
        y: location.y,
        radius: type === "dragon" ? 38 : 29,
        hp: type === "dragon" ? 1200 : 500,
        maxHp: type === "dragon" ? 1200 : 500,
        speed: type === "dragon" ? 68 : 52,
        damage: type === "dragon" ? 25 : 18,
        attackCooldown: 1.5,
        hitTimer: 0,
        wanderTimer: 2,
        dead: false,
        type: "boss",
        bossKind: type,
        specialTimer: 5
    };

    enemies.push(boss);
    activeBoss = boss;

    if (type === "dragon") {
        showMessage("O dragão ancestral despertou!", 4);
    } else {
        showMessage("O guardião das ruínas apareceu!", 4);
    }
}

function updateBoss(enemy, dt) {
    enemy.specialTimer -= dt;

    if (enemy.specialTimer <= 0) {
        enemy.specialTimer = enemy.bossKind === "dragon" ? 4 : 5;

        const radius = enemy.bossKind === "dragon" ? 190 : 125;

        for (const target of [player]) {
            if (distance(enemy, target) < radius) {
                damagePlayer(enemy.damage);
            }
        }

        for (let i = 0; i < 24; i++) {
            particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: random(-150, 150),
                vy: random(-150, 150),
                life: random(0.3, 0.8),
                maxLife: 0.8,
                size: random(3, 7),
                color: enemy.bossKind === "dragon" ? "#d76d4e" : "#a38ce0"
            });
        }

        camera.shake = Math.max(camera.shake, 8);
    }
}
```

```javascript
/* =========================================================
   UPDATE LOOP
========================================================= */

function updateGame(dt) {
    if (worldState.paused || worldState.gameOver || !gameStarted) return;

    gameTime += dt;
    ambientTimer += dt;
    autosaveTimer += dt;

    if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) hideMessage();
    }

    if (playerClass.specialCooldown > 0) {
        playerClass.specialCooldown = Math.max(0, playerClass.specialCooldown - dt);
    }

    if (attackComboTimer > 0) {
        attackComboTimer -= dt;
    } else {
        attackCombo = 0;
    }

    updatePlayer(dt);
    updateEnemies(dt);
    updateNPCs(dt);
    updateAnimals(dt);
    updateSpells(dt);
    updateParticles(dt);
    updateSurvival(dt);
    updateWeather(dt);
    updateDayNight(dt);
    updateFireflies(dt);
    updateQuest();
    updateCamera(dt);
    updateFloatingTexts(dt);
    updateWorldEvents(dt);
    updateDialogueInput();

    if (autosaveTimer >= 60) {
        autosaveTimer = 0;
        saveGame(true);
    }

    if (player.hp <= 0) {
        player.hp = 0;
        worldState.gameOver = true;
        showGameOver();
    }

    if (
        quests.active === "investigate_ruins" &&
        distance(player, { x: 760, y: 450 }) < 140
    ) {
        advanceQuest("investigate_ruins");
        if (!worldState.bossSpawned) {
            worldState.bossSpawned = true;
            spawnBoss("guardian");
        }
    }

    if (
        quests.active === "reach_castle" &&
        distance(player, { x: 2700, y: 2200 }) < 180
    ) {
        advanceQuest("reach_castle");

        if (!worldEvents.some(event => event.type === "dragonWarning")) {
            worldEvents.push({
                type: "dragonWarning",
                timer: 3
            });
        }
    }

    if (
        quests.active === "defeat_dragon" &&
        !activeBoss &&
        !worldEvents.some(event => event.type === "dragonSpawned")
    ) {
        worldEvents.push({
            type: "dragonSpawned",
            timer: 2
        });
    }

    updateHUD();
}

function updateWorldEvents(dt) {
    for (let i = worldEvents.length - 1; i >= 0; i--) {
        const event = worldEvents[i];
        event.timer -= dt;

        if (event.timer > 0) continue;

        if (event.type === "dragonWarning") {
            showMessage("Um rugido ecoa sobre o castelo...", 4);
        }

        if (event.type === "dragonSpawned") {
            spawnBoss("dragon");
        }

        worldEvents.splice(i, 1);
    }
}

/* =========================================================
   CAMERA
========================================================= */

function updateCamera(dt) {
    const smoothing = Math.min(1, dt * 5);

    camera.x += (player.x - camera.x) * smoothing;
    camera.y += (player.y - camera.y) * smoothing;
    camera.shake = Math.max(0, camera.shake - dt * 20);

    camera.x = Math.max(W / 2, Math.min(world.width - W / 2, camera.x));
    camera.y = Math.max(H / 2, Math.min(world.height - H / 2, camera.y));
}

function worldToScreen(x, y) {
    return {
        x: x - camera.x + W / 2,
        y: y - camera.y + H / 2
    };
}

/* =========================================================
   DRAWING HELPERS
========================================================= */

function roundedRect(x, y, width, height, radius, fill, stroke = null) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();

    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}

function drawShadow(x, y, rx, ry, alpha = 0.25) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawGlow(x, y, radius, color, alpha = 0.3) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color.replace("ALPHA", String(alpha)));
    gradient.addColorStop(1, color.replace("ALPHA", "0"));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

/* =========================================================
   GROUND AND ENVIRONMENT
========================================================= */

function drawGround() {
    ctx.fillStyle = "#18271a";
    ctx.fillRect(0, 0, W, H);

    const tileSize = 70;
    const startX = Math.floor((camera.x - W / 2) / tileSize) * tileSize;
    const startY = Math.floor((camera.y - H / 2) / tileSize) * tileSize;

    for (let wx = startX; wx < camera.x + W / 2 + tileSize; wx += tileSize) {
        for (let wy = startY; wy < camera.y + H / 2 + tileSize; wy += tileSize) {
            const point = worldToScreen(wx, wy);

            const seed = Math.abs(
                Math.sin(wx * 0.013 + wy * 0.021) *
                Math.cos(wx * 0.008 - wy * 0.017)
            );

            ctx.fillStyle = seed > 0.5 ? "#1b2c1d" : "#19291b";
            ctx.fillRect(point.x, point.y, tileSize + 1, tileSize + 1);

            if (seed > 0.72) {
                ctx.strokeStyle = "rgba(95,120,76,0.14)";
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.moveTo(point.x + 8, point.y + 18);
                ctx.lineTo(point.x + 15, point.y + 11);
                ctx.moveTo(point.x + 36, point.y + 50);
                ctx.lineTo(point.x + 45, point.y + 44);
                ctx.stroke();
            }
        }
    }

    drawForestPaths();
}

function drawForestPaths() {
    ctx.save();
    ctx.lineCap = "round";

    const pathPoints = [
        [1800, 1500],
        [1700, 1250],
        [1450, 1100],
        [1250, 900],
        [950, 700],
        [760, 450]
    ];

    ctx.beginPath();

    pathPoints.forEach((point, index) => {
        const screen = worldToScreen(point[0], point[1]);

        if (index === 0) ctx.moveTo(screen.x, screen.y);
        else ctx.lineTo(screen.x, screen.y);
    });

    ctx.strokeStyle = "#293324";
    ctx.lineWidth = 72;
    ctx.stroke();

    ctx.strokeStyle = "rgba(111,111,75,0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 13]);
    ctx.stroke();

    ctx.restore();
}

function drawGrassDetails() {
    const tile = 24;
    const left = Math.floor((camera.x - W / 2) / tile) * tile;
    const top = Math.floor((camera.y - H / 2) / tile) * tile;

    ctx.save();

    for (let x = left; x < camera.x + W / 2 + tile; x += tile) {
        for (let y = top; y < camera.y + H / 2 + tile; y += tile) {
            const seed = Math.abs(Math.sin(x * 0.03 + y * 0.05));

            if (seed > 0.92) {
                const p = worldToScreen(x, y);

                ctx.strokeStyle = "rgba(102,135,81,0.24)";
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.moveTo(p.x, p.y + 3);
                ctx.lineTo(p.x + 2, p.y - 3);
                ctx.moveTo(p.x + 3, p.y + 4);
                ctx.lineTo(p.x + 5, p.y - 1);
                ctx.stroke();
            }
        }
    }

    ctx.restore();
}

/* =========================================================
   TREES
========================================================= */

function drawTree(tree) {
    const p = worldToScreen(tree.x, tree.y);

    if (
        p.x < -80 || p.x > W + 80 ||
        p.y < -100 || p.y > H + 100
    ) return;

    const r = tree.radius;

    drawShadow(p.x, p.y + r * 0.45, r * 1.05, r * 0.55, 0.32);

    ctx.fillStyle = "#493c2c";
    ctx.fillRect(p.x - r * 0.2, p.y - r * 0.05, r * 0.4, r * 1.1);

    const leaves = [
        { x: -0.35, y: -0.55, scale: 0.75, color: "#29462c" },
        { x: 0.25, y: -0.65, scale: 0.85, color: "#345334" },
        { x: 0, y: -1.05, scale: 0.8, color: "#3b603b" },
        { x: 0.48, y: -0.25, scale: 0.6, color: "#29472c" },
        { x: -0.5, y: -0.2, scale: 0.65, color: "#243f28" }
    ];

    for (const leaf of leaves) {
        ctx.fillStyle = leaf.color;
        ctx.beginPath();
        ctx.ellipse(
            p.x + leaf.x * r,
            p.y + leaf.y * r,
            r * leaf.scale,
            r * leaf.scale * 0.82,
            leaf.x * 0.3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.strokeStyle = "rgba(117,151,86,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x - r * 0.2, p.y - r * 0.8, r * 0.45, 3.5, 5.4);
    ctx.stroke();
}

/* =========================================================
   ROCKS
========================================================= */

function drawRock(rock) {
    const p = worldToScreen(rock.x, rock.y);

    if (
        p.x < -50 || p.x > W + 50 ||
        p.y < -50 || p.y > H + 50
    ) return;

    const r = rock.radius;

    drawShadow(p.x, p.y + r * 0.45, r * 1.1, r * 0.45, 0.35);

    ctx.fillStyle = "#4d554d";
    ctx.beginPath();
    ctx.moveTo(p.x - r, p.y + r * 0.15);
    ctx.lineTo(p.x - r * 0.6, p.y - r * 0.55);
    ctx.lineTo(p.x + r * 0.05, p.y - r * 0.85);
    ctx.lineTo(p.x + r * 0.75, p.y - r * 0.3);
    ctx.lineTo(p.x + r, p.y + r * 0.35);
    ctx.lineTo(p.x - r * 0.3, p.y + r * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(186,195,176,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x - r * 0.55, p.y - r * 0.4);
    ctx.lineTo(p.x + r * 0.05, p.y - r * 0.7);
    ctx.lineTo(p.x + r * 0.35, p.y - r * 0.3);
    ctx.stroke();
}

/* =========================================================
   MUSHROOMS AND COLLECTIBLES
========================================================= */

function drawMushroom(mushroom) {
    if (mushroom.collected) return;

    const p = worldToScreen(mushroom.x, mushroom.y);
    if (p.x < -25 || p.x > W + 25 || p.y < -25 || p.y > H + 25) return;

    drawShadow(p.x, p.y + 5, 8, 3, 0.28);

    ctx.fillStyle = "#d9c7a2";
    ctx.fillRect(p.x - 2, p.y - 1, 4, 9);

    ctx.fillStyle = mushroom.strange ? "#b34bda" : "#b64d48";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 3, 9, 6, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f1e6d3";

    if (mushroom.strange) {
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 5, 1.5, 0, Math.PI * 2);
        ctx.arc(p.x + 3, p.y - 7, 1.5, 0, Math.PI * 2);
        ctx.fill();

        drawGlow(p.x, p.y - 3, 19, "rgba(174,100,220,ALPHA)", 0.16);
    } else {
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 5, 1.5, 0, Math.PI * 2);
        ctx.arc(p.x + 3, p.y - 4, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawWood(wood) {
    if (wood.collected) return;

    const p = worldToScreen(wood.x, wood.y);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.35);

    drawShadow(0, 5, 11, 4, 0.3);

    ctx.fillStyle = "#765236";
    ctx.fillRect(-11, -3, 22, 7);

    ctx.fillStyle = "#aa8054";
    ctx.fillRect(-8, -3, 3, 7);
    ctx.fillRect(2, -3, 2, 7);

    ctx.restore();
}

function drawStone(stone) {
    if (stone.collected) return;

    const p = worldToScreen(stone.x, stone.y);

    drawShadow(p.x, p.y + 5, 9, 4, 0.3);

    ctx.fillStyle = "#778178";
    ctx.beginPath();
    ctx.moveTo(p.x - 8, p.y + 4);
    ctx.lineTo(p.x - 5, p.y - 5);
    ctx.lineTo(p.x + 2, p.y - 8);
    ctx.lineTo(p.x + 8, p.y - 2);
    ctx.lineTo(p.x + 7, p.y + 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(225,230,215,0.22)";
    ctx.beginPath();
    ctx.moveTo(p.x - 4, p.y - 3);
    ctx.lineTo(p.x + 2, p.y - 6);
    ctx.stroke();
}

/* =========================================================
   SHELTER AND CAMPFIRE
========================================================= */

function drawShelter() {
    const p = worldToScreen(shelter.x, shelter.y);
    const x = p.x - shelter.width / 2;
    const y = p.y - shelter.height / 2;

    drawShadow(p.x, y + shelter.height, shelter.width * 0.55, 25, 0.35);

    ctx.fillStyle = "#45392a";
    ctx.fillRect(x, y + 38, shelter.width, shelter.height - 38);

    ctx.fillStyle = "#6c5036";
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 42);
    ctx.lineTo(p.x, y - 28);
    ctx.lineTo(x + shelter.width + 18, y + 42);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#96724b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 42);
    ctx.lineTo(p.x, y - 28);
    ctx.lineTo(x + shelter.width + 18, y + 42);
    ctx.stroke();

    ctx.fillStyle = "#1a2118";
    ctx.fillRect(p.x - 24, y + 83, 48, 65);

    ctx.fillStyle = "#6e5439";
    ctx.fillRect(x + 20, y + 58, 34, 22);

    ctx.fillStyle = "#d0bd8e";
    ctx.fillRect(x + 31, y + 63, 4, 4);
    ctx.fillRect(x + 40, y + 63, 4, 4);

    drawCampfire();
}

function drawCampfire() {
    const p = worldToScreen(campfire.x, campfire.y);
    const flicker = Math.sin(gameTime * 13) * 3;

    drawGlow(p.x, p.y, 110 + flicker * 2, "rgba(255,125,40,ALPHA)", 0.22);

    drawShadow(p.x, p.y + 7, 25, 11, 0.45);

    ctx.strokeStyle = "#64432a";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(p.x - 14, p.y + 4);
    ctx.lineTo(p.x + 14, p.y - 3);
    ctx.moveTo(p.x - 13, p.y - 4);
    ctx.lineTo(p.x + 13, p.y + 4);
    ctx.stroke();

    ctx.fillStyle = "#ff8b3d";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 25 - flicker);
    ctx.quadraticCurveTo(p.x + 16, p.y - 8, p.x + 4, p.y + 1);
    ctx.quadraticCurveTo(p.x - 15, p.y - 2, p.x, p.y - 25 - flicker);
    ctx.fill();

    ctx.fillStyle = "#ffd777";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 15 - flicker * 0.5);
    ctx.quadraticCurveTo(p.x + 7, p.y - 4, p.x, p.y);
    ctx.quadraticCurveTo(p.x - 7, p.y - 5, p.x, p.y - 15 - flicker * 0.5);
    ctx.fill();
}
```

```javascript
/* =========================================================
   PLAYER DRAWING AND ANIMATIONS
========================================================= */

function drawPlayer() {
    const p = worldToScreen(player.x, player.y);
    const moving = Math.hypot(getMovementInput().x, getMovementInput().y) > 0.1;
    const walk = moving ? Math.sin(gameTime * 13) * 2.5 : 0;
    const hurt = player.hurtTimer > 0;
    const rogue = playerClass.selected === "rogue";
    const mage = playerClass.selected === "mage";
    const warrior = playerClass.selected === "warrior";

    drawShadow(p.x, p.y + 12, 15, 7, 0.4);

    if (player.invulnerable > 0 && Math.floor(gameTime * 22) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    if (rogue) {
        ctx.fillStyle = "#344a35";
    } else if (mage) {
        ctx.fillStyle = "#51426f";
    } else {
        ctx.fillStyle = "#465246";
    }

    ctx.beginPath();
    ctx.ellipse(p.x, p.y + walk, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b99b79";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 11 + walk, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hurt ? "#b74a43" : "#332a24";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 14 + walk, 8.5, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#211e1b";
    ctx.beginPath();
    ctx.arc(p.x + player.dirX * 3, p.y - 11 + player.dirY * 2 + walk, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#a58b6c";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(p.x - 7, p.y - 1 + walk);
    ctx.lineTo(p.x - 12, p.y + 6 + walk);

    ctx.moveTo(p.x + 7, p.y - 1 + walk);
    ctx.lineTo(p.x + 12, p.y + 6 + walk);
    ctx.stroke();

    ctx.strokeStyle = "#302820";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y + 9 + walk);
    ctx.lineTo(p.x - 6, p.y + 16 + walk);

    ctx.moveTo(p.x + 5, p.y + 9 + walk);
    ctx.lineTo(p.x + 6, p.y + 16 + walk);
    ctx.stroke();

    if (warrior) {
        ctx.strokeStyle = "#a7b0b5";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - 8, p.y + 1);
        ctx.lineTo(p.x - 13, p.y + 6);
        ctx.stroke();
    }

    if (mage) {
        ctx.strokeStyle = "#a995e4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + walk, 16, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (player.attackTimer > 0) {
        drawSwordAttack(p);
    } else {
        drawHeldWeapon(p);
    }

    ctx.globalAlpha = 1;
}

function drawHeldWeapon(p) {
    ctx.save();
    ctx.translate(p.x, p.y + 1);
    ctx.rotate(Math.atan2(player.dirY, player.dirX));

    if (playerClass.selected === "mage") {
        ctx.strokeStyle = "#aa93ed";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(8, 3);
        ctx.lineTo(19, -4);
        ctx.stroke();

        drawGlow(19, -4, 10, "rgba(175,142,255,ALPHA)", 0.35);
    } else {
        ctx.strokeStyle = "#9ba5a5";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(8, 3);
        ctx.lineTo(22, -1);
        ctx.stroke();

        ctx.strokeStyle = "#725239";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(5, 4);
        ctx.lineTo(10, 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawSwordAttack(p) {
    const progress = 1 - player.attackTimer / 0.16;
    const angle = Math.atan2(player.dirY, player.dirX);
    const swing = -1.5 + progress * 3;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle + swing);

    ctx.strokeStyle = "rgba(220,230,205,0.25)";
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.arc(0, 0, 37, -0.9, 0.9);
    ctx.stroke();

    ctx.strokeStyle = "#aab7ba";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, 1);
    ctx.lineTo(49, 1);
    ctx.stroke();

    ctx.strokeStyle = "#e5e8d9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, -1);
    ctx.lineTo(45, -1);
    ctx.stroke();

    ctx.strokeStyle = "#735439";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(5, 1);
    ctx.lineTo(13, 1);
    ctx.stroke();

    ctx.restore();
}

/* =========================================================
   GOBLINS AND CREATURES
========================================================= */

function drawEnemy(enemy) {
    if (enemy.dead) return;

    const p = worldToScreen(enemy.x, enemy.y);

    if (
        p.x < -70 || p.x > W + 70 ||
        p.y < -70 || p.y > H + 70
    ) return;

    if (enemy.type === "boss") {
        drawBoss(enemy, p);
        return;
    }

    const isNightstalker = enemy.type === "nightstalker";
    const bodyColor = isNightstalker ? "#30354c" : "#607b43";
    const headColor = isNightstalker ? "#444969" : "#7c9854";

    drawShadow(p.x, p.y + 9, enemy.radius * 1.2, enemy.radius * 0.5, 0.38);

    ctx.fillStyle = enemy.hitTimer > 0 ? "#d9c8b0" : bodyColor;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, enemy.radius * 0.8, enemy.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y - enemy.radius * 0.55, enemy.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isNightstalker ? "#e58a99" : "#e7d9a0";
    ctx.beginPath();
    ctx.arc(p.x - 4, p.y - enemy.radius * 0.6, 2, 0, Math.PI * 2);
    ctx.arc(p.x + 4, p.y - enemy.radius * 0.6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isNightstalker ? "#515772" : "#8c9d61";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y + 7);
    ctx.lineTo(p.x - 10, p.y + 13);
    ctx.moveTo(p.x + 6, p.y + 7);
    ctx.lineTo(p.x + 10, p.y + 13);
    ctx.stroke();

    if (enemy.hp < enemy.maxHp) {
        drawHealthBar(p.x - 17, p.y - enemy.radius - 13, 34, 4, enemy.hp / enemy.maxHp);
    }
}

function drawBoss(enemy, p) {
    const dragon = enemy.bossKind === "dragon";
    const r = enemy.radius;

    drawGlow(
        p.x,
        p.y,
        r * 3,
        dragon ? "rgba(205,75,44,ALPHA)" : "rgba(140,90,200,ALPHA)",
        0.2
    );

    drawShadow(p.x, p.y + r * 0.6, r * 1.5, r * 0.6, 0.45);

    ctx.fillStyle = enemy.hitTimer > 0
        ? "#f0d8c8"
        : dragon ? "#733b32" : "#493d64";

    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();

    if (dragon) {
        ctx.fillStyle = "#8d5142";

        ctx.beginPath();
        ctx.moveTo(p.x - r * 0.4, p.y - r * 0.3);
        ctx.lineTo(p.x - r * 1.6, p.y - r * 1.1);
        ctx.lineTo(p.x - r * 1.2, p.y + r * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p.x + r * 0.4, p.y - r * 0.3);
        ctx.lineTo(p.x + r * 1.6, p.y - r * 1.1);
        ctx.lineTo(p.x + r * 1.2, p.y + r * 0.3);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = dragon ? "#ffb06a" : "#c4b6ff";
    ctx.beginPath();
    ctx.arc(p.x - r * 0.25, p.y - r * 0.15, r * 0.09, 0, Math.PI * 2);
    ctx.arc(p.x + r * 0.25, p.y - r * 0.15, r * 0.09, 0, Math.PI * 2);
    ctx.fill();

    drawHealthBar(p.x - 55, p.y - r - 25, 110, 7, enemy.hp / enemy.maxHp);

    ctx.fillStyle = "#e7e3d9";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(dragon ? "DRAGÃO ANCESTRAL" : "GUARDIÃO DAS RUÍNAS", p.x, p.y - r - 33);
    ctx.textAlign = "left";
}

function drawHealthBar(x, y, width, height, ratio) {
    roundedRect(x, y, width, height, height / 2, "rgba(0,0,0,0.65)");
    roundedRect(
        x,
        y,
        width * Math.max(0, Math.min(1, ratio)),
        height,
        height / 2,
        "#bd554b"
    );
}

/* =========================================================
   NPC DRAWING
========================================================= */

function drawNPC(npc) {
    const p = worldToScreen(npc.x, npc.y);

    if (
        p.x < -40 || p.x > W + 40 ||
        p.y < -50 || p.y > H + 50
    ) return;

    drawShadow(p.x, p.y + 10, 12, 5, 0.3);

    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, 10, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d0ad8a";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 12, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = npc.role === "elder" ? "#d2d4ce" : "#352b24";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 15, 7.5, Math.PI, Math.PI * 2);
    ctx.fill();

    if (npc.role === "elder") {
        ctx.strokeStyle = "#d8d8c7";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + 5, p.y - 1);
        ctx.lineTo(p.x + 9, p.y + 17);
        ctx.stroke();
    }

    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(240,240,225,0.9)";
    ctx.fillText(npc.name, p.x, p.y - 25);
    ctx.textAlign = "left";

    if (distance(player, npc) < 70) {
        ctx.fillStyle = "#d7dfbd";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.fillText("E · Conversar", p.x, p.y + 30);
        ctx.textAlign = "left";
    }
}

/* =========================================================
   ANIMAL DRAWING
========================================================= */

function drawAnimal(animal) {
    if (!animal.alive) return;

    const p = worldToScreen(animal.x, animal.y);

    if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) return;

    drawShadow(p.x, p.y + 5, animal.radius * 1.2, 4, 0.25);

    ctx.fillStyle = animal.type === "deer" ? "#927354" : "#a7a08b";
    ctx.beginPath();
    ctx.ellipse(
        p.x,
        p.y,
        animal.radius * 1.3,
        animal.radius * 0.7,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#bba98b";
    ctx.beginPath();
    ctx.arc(p.x + 7, p.y - 3, animal.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (animal.type === "deer") {
        ctx.strokeStyle = "#a99c7f";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x + 8, p.y - 7);
        ctx.lineTo(p.x + 10, p.y - 13);
        ctx.lineTo(p.x + 13, p.y - 15);
        ctx.moveTo(p.x + 10, p.y - 13);
        ctx.lineTo(p.x + 7, p.y - 16);
        ctx.stroke();
    }
}

/* =========================================================
   CHESTS, CRYSTALS, SHRINES
========================================================= */

function drawChest(chest) {
    if (chest.opened) return;

    const p = worldToScreen(chest.x, chest.y);

    drawShadow(p.x, p.y + 8, 14, 5, 0.3);

    ctx.fillStyle = "#68472c";
    ctx.fillRect(p.x - 12, p.y - 5, 24, 15);

    ctx.fillStyle = "#967047";
    ctx.fillRect(p.x - 12, p.y - 8, 24, 7);

    ctx.fillStyle = "#d2b76d";
    ctx.fillRect(p.x - 2, p.y - 2, 4, 7);

    if (distance(player, chest) < 75) {
        ctx.font = "9px Arial";
        ctx.fillStyle = "#f0e6c6";
        ctx.textAlign = "center";
        ctx.fillText("E · Abrir", p.x, p.y - 15);
        ctx.textAlign = "left";
    }
}

function drawCrystal(crystal) {
    if (crystal.collected) return;

    const p = worldToScreen(crystal.x, crystal.y);
    const pulse = Math.sin(gameTime * 3 + crystal.pulse) * 3;

    drawGlow(p.x, p.y, 45 + pulse, "rgba(110,190,235,ALPHA)", 0.3);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(gameTime * 0.7 + crystal.pulse) * 0.1);

    ctx.fillStyle = "#7fd8ef";
    ctx.beginPath();
    ctx.moveTo(0, -16 - pulse);
    ctx.lineTo(10, -3);
    ctx.lineTo(6, 12);
    ctx.lineTo(-5, 10);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#d6f5ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -13 - pulse);
    ctx.lineTo(-2, 4);
    ctx.stroke();

    ctx.restore();

    if (distance(player, crystal) < 75) {
        ctx.font = "9px Arial";
        ctx.fillStyle = "#d5f0f7";
        ctx.textAlign = "center";
        ctx.fillText("E · Coletar cristal", p.x, p.y - 24);
        ctx.textAlign = "left";
    }
}

function drawShrine(shrine) {
    const p = worldToScreen(shrine.x, shrine.y);

    ctx.save();

    ctx.fillStyle = shrine.activated ? "#526b4c" : "#5d6256";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 5, 27, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shrine.activated ? "#8ac27d" : "#777e6c";
    ctx.fillRect(p.x - 12, p.y - 22, 24, 26);

    ctx.fillStyle = shrine.activated ? "#b9eaa0" : "#b2b9a2";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 21, 8, 0, Math.PI * 2);
    ctx.fill();

    if (shrine.activated) {
        drawGlow(p.x, p.y - 10, 35, "rgba(150,220,130,ALPHA)", 0.3);
    }

    ctx.restore();
}

/* =========================================================
   WORLD STRUCTURES
========================================================= */

function drawStructure(structure) {
    const p = worldToScreen(structure.x, structure.y);

    if (
        p.x < -structure.width - 40 ||
        p.x > W + structure.width + 40 ||
        p.y < -structure.height - 40 ||
        p.y > H + structure.height + 40
    ) return;

    const x = p.x - structure.width / 2;
    const y = p.y - structure.height / 2;

    drawShadow(p.x, y + structure.height, structure.width * 0.6, 18, 0.4);

    if (structure.type === "ruins") {
        ctx.fillStyle = "#5a6053";
        ctx.fillRect(x, y + 25, structure.width, structure.height - 25);

        ctx.fillStyle = "#777c6b";
        ctx.fillRect(x - 12, y + 18, 30, structure.height - 10);
        ctx.fillRect(x + structure.width - 18, y + 8, 30, structure.height);

        ctx.fillStyle = "#222c23";
        ctx.fillRect(p.x - 20, y + 45, 40, structure.height - 45);
    } else if (structure.type === "tower") {
        ctx.fillStyle = "#5a5b63";
        ctx.fillRect(x + 20, y + 30, structure.width - 40, structure.height - 30);

        ctx.fillStyle = "#777b83";
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 35);
        ctx.lineTo(p.x, y - 15);
        ctx.lineTo(x + structure.width - 5, y + 35);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#20242a";
        ctx.fillRect(p.x - 12, y + 62, 24, 38);
    } else if (structure.type === "castle") {
        ctx.fillStyle = "#4b5051";
        ctx.fillRect(x, y + 35, structure.width, structure.height - 35);

        ctx.fillStyle = "#666c6b";
        ctx.fillRect(x + 15, y + 5, 45, 80);
        ctx.fillRect(x + structure.width - 60, y + 5, 45, 80);

        ctx.fillStyle = "#353c3b";
        ctx.fillRect(p.x - 28, y + structure.height - 75, 56, 75);

        ctx.fillStyle = "#6c7370";
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 10);
        ctx.lineTo(x + 37, y - 20);
        ctx.lineTo(x + 67, y + 10);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + structure.width - 68, y + 10);
        ctx.lineTo(x + structure.width - 37, y - 20);
        ctx.lineTo(x + structure.width - 8, y + 10);
        ctx.closePath();
        ctx.fill();
    } else if (structure.type === "village") {
        ctx.fillStyle = "#51432f";
        ctx.fillRect(x, y + 35, structure.width, structure.height - 35);

        ctx.fillStyle = "#79583a";
        ctx.beginPath();
        ctx.moveTo(x - 10, y + 40);
        ctx.lineTo(x + structure.width / 2, y);
        ctx.lineTo(x + structure.width + 10, y + 40);
        ctx.closePath();
        ctx.fill();
    }
}

/* =========================================================
   FIRELIES RENDER
========================================================= */

function drawFireflies() {
    if (!isNightTime()) return;

    for (const fly of fireflies) {
        const p = worldToScreen(
            fly.x + Math.sin(fly.phase) * 8,
            fly.y + Math.cos(fly.phase * 0.8) * 6
        );

        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;

        const alpha = 0.25 + (Math.sin(fly.phase) + 1) * 0.3;

        ctx.fillStyle = `rgba(201,224,133,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, fly.radius, 0, Math.PI * 2);
        ctx.fill();

        if (alpha > 0.65) {
            drawGlow(p.x, p.y, 8, "rgba(192,222,120,ALPHA)", 0.12);
        }
    }
}
```

```javascript
/* =========================================================
   PARTICLES AND FLOATING TEXT
========================================================= */

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.pow(0.15, dt);
        particle.vy += 45 * dt;
        particle.life -= dt;

        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const particle of particles) {
        const p = worldToScreen(particle.x, particle.y);
        const alpha = Math.max(0, particle.life / (particle.maxLife || 0.8));

        ctx.globalAlpha = alpha;

        let color = "#c4d3a5";

        if (particle.type === "hit") color = "#c8a99a";
        if (particle.type === "death") color = "#849c6b";
        if (particle.type === "dodge") color = "#c0d8bf";
        if (particle.type === "craft") color = "#c7d8a4";
        if (particle.type === "collection") color = "#d5dba8";

        if (particle.color) color = particle.color;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, particle.size || 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

function showFloatingText(x, y, text, color = "#e5e8d8") {
    floatingTexts.push({
        x,
        y,
        text,
        color,
        life: 1.1,
        maxLife: 1.1
    });
}

function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const item = floatingTexts[i];

        item.y -= 25 * dt;
        item.life -= dt;

        if (item.life <= 0) floatingTexts.splice(i, 1);
    }
}

function drawFloatingTexts() {
    for (const item of floatingTexts) {
        const p = worldToScreen(item.x, item.y);

        ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, p.x, p.y);
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
}

/* =========================================================
   LIGHTING AND ATMOSPHERE
========================================================= */

function drawAtmosphere() {
    drawWeather();

    const vignette = ctx.createRadialGradient(
        W / 2, H / 2, Math.min(W, H) * 0.2,
        W / 2, H / 2, Math.max(W, H) * 0.72
    );

    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.34)");

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    drawNightOverlay();
}

/* =========================================================
   MINIMAP
========================================================= */

function toggleMap() {
    worldState.mapOpen = !worldState.mapOpen;
    showElement("mapPanel", worldState.mapOpen, "flex");

    if (worldState.mapOpen) {
        drawMinimapPanel();
    }
}

function drawMinimapPanel() {
    const container = element("mapContainer");
    if (!container) return;

    container.innerHTML = "";
    container.style.position = "relative";
    container.style.overflow = "hidden";
    container.style.background = "#18271a";

    const playerMarker = document.createElement("div");
    playerMarker.style.cssText = `
        position:absolute;
        width:10px;height:10px;border-radius:50%;
        background:#f0e7bf;box-shadow:0 0 10px #f0e7bf;
        transform:translate(-50%,-50%);
        left:${player.x / world.width * 100}%;
        top:${player.y / world.height * 100}%;
    `;
    container.appendChild(playerMarker);

    const shelterMarker = document.createElement("div");
    shelterMarker.title = "Abrigo";
    shelterMarker.style.cssText = `
        position:absolute;width:9px;height:9px;background:#d39b68;
        left:${shelter.x / world.width * 100}%;
        top:${shelter.y / world.height * 100}%;
    `;
    container.appendChild(shelterMarker);

    for (const npc of npcs) {
        const marker = document.createElement("div");
        marker.title = npc.name;
        marker.style.cssText = `
            position:absolute;width:7px;height:7px;border-radius:50%;
            background:${npc.color};
            left:${npc.x / world.width * 100}%;
            top:${npc.y / world.height * 100}%;
        `;
        container.appendChild(marker);
    }

    for (const crystal of crystals) {
        if (crystal.collected) continue;

        const marker = document.createElement("div");
        marker.title = "Cristal ancestral";
        marker.style.cssText = `
            position:absolute;width:6px;height:6px;background:#7fd8ef;
            transform:rotate(45deg);
            left:${crystal.x / world.width * 100}%;
            top:${crystal.y / world.height * 100}%;
        `;
        container.appendChild(marker);
    }
}

/* =========================================================
   HUD UPDATE
========================================================= */

function updateHUD() {
    setWidth("hpBar", player.hp / player.maxHp * 100);
    setWidth("staminaBar", player.stamina / player.maxStamina * 100);

    setText("hpText", `${Math.ceil(player.hp)}/${player.maxHp}`);
    setText("staminaText", `${Math.ceil(player.stamina)}/${player.maxStamina}`);

    setText("dayText", `Dia ${day} · ${isNightTime() ? "Noite" : "Dia"}`);

    setText(
        "resourceText",
        `Madeira: ${resources.wood} · Pedra: ${resources.stone}`
    );

    setText("v5Level", `Nível ${progression.level}`);
    setText("v5Gold", `◈ ${progression.gold}`);
    setText("v5Xp", `${progression.xp}/${progression.xpToNext} XP`);

    setWidth("v5XpBar", progression.xp / progression.xpToNext * 100);

    setText("v5Hunger", `Fome: ${Math.ceil(survival.hunger)}%`);
    setText("v5Thirst", `Sede: ${Math.ceil(survival.thirst)}%`);
    setText("weatherText", `Clima: ${weather.current}`);

    const selectedClass = playerClass.selected
        ? CLASS_INFO[playerClass.selected].name
        : "Sem classe";

    setText("v5Class", selectedClass);

    updateInventoryUI();
}

/* =========================================================
   PAUSE MENU
========================================================= */

function togglePause(force) {
    if (worldState.gameOver) return;

    worldState.paused = typeof force === "boolean"
        ? force
        : !worldState.paused;

    showElement("pausePanel", worldState.paused, "flex");
}

bindClick("resumeButton", () => togglePause(false));
bindClick("saveButton", () => saveGame(false));
bindClick("loadButton", () => loadGame());

/* =========================================================
   SAVE AND LOAD
========================================================= */

function buildSaveData() {
    return {
        version: 10,
        savedAt: new Date().toISOString(),
        player: {
            x: player.x,
            y: player.y,
            hp: player.hp,
            maxHp: player.maxHp,
            stamina: player.stamina,
            maxStamina: player.maxStamina,
            speed: player.speed
        },
        resources: { ...resources },
        craftedItems: { ...craftedItems },
        progression: { ...progression },
        survival: { ...survival },
        equipment: { ...equipment },
        playerClass: {
            ...playerClass,
            skills: { ...playerClass.skills },
            unlocked: { ...playerClass.unlocked }
        },
        weather: { ...weather },
        gameTime,
        worldTime,
        day,
        questStage,
        quests: {
            active: quests.active,
            completed: [...quests.completed],
            progress: { ...quests.progress }
        },
        world: {
            mushrooms: mushrooms.map(item => item.collected),
            woods: woods.map(item => item.collected),
            stones: stones.map(item => item.collected),
            enemies: enemies.map(enemy => ({
                x: enemy.x,
                y: enemy.y,
                hp: enemy.hp,
                dead: enemy.dead,
                type: enemy.type
            })),
            chests: chests.map(chest => chest.opened),
            crystals: crystals.map(crystal => crystal.collected),
            shrines: shrines.map(shrine => shrine.activated)
        }
    };
}

function saveGame(automatic = false) {
    try {
        const data = buildSaveData();
        localStorage.setItem(worldState.saveSlot, JSON.stringify(data));

        if (!automatic) {
            showMessage("Jogo salvo com sucesso.");
        }
    } catch (error) {
        if (!automatic) {
            showMessage("Não foi possível salvar neste navegador.");
        }
    }
}

function loadGame() {
    let raw;

    try {
        raw = localStorage.getItem(worldState.saveSlot);
    } catch (_) {
        showMessage("O armazenamento não está disponível.");
        return;
    }

    if (!raw) {
        showMessage("Nenhum salvamento encontrado.");
        return;
    }

    try {
        const data = JSON.parse(raw);

        if (!data || !data.player || !data.resources) {
            throw new Error("Save inválido");
        }

        Object.assign(player, data.player);
        Object.assign(resources, data.resources);
        Object.assign(craftedItems, data.craftedItems || {});
        Object.assign(progression, data.progression || {});
        Object.assign(survival, data.survival || {});
        Object.assign(equipment, data.equipment || {});

        if (data.playerClass) {
            Object.assign(playerClass, data.playerClass);
            Object.assign(
                playerClass.skills,
                data.playerClass.skills || {}
            );
            Object.assign(
                playerClass.unlocked,
                data.playerClass.unlocked || {}
            );
        }

        if (data.weather) Object.assign(weather, data.weather);

        gameTime = Number(data.gameTime) || 0;
        worldTime = Number(data.worldTime) || 0;
        day = Number(data.day) || 1;
        questStage = Number(data.questStage) || 0;

        if (data.quests) {
            quests.active = data.quests.active || "first_mushroom";
            quests.completed = Array.isArray(data.quests.completed)
                ? data.quests.completed
                : [];
            quests.progress = data.quests.progress || {};
        }

        const worldData = data.world || {};

        applyCollectedState(mushrooms, worldData.mushrooms);
        applyCollectedState(woods, worldData.woods);
        applyCollectedState(stones, worldData.stones);
        applyCollectedState(chests, worldData.chests, "opened");
        applyCollectedState(crystals, worldData.crystals);
        applyCollectedState(shrines, worldData.shrines, "activated");

        if (Array.isArray(worldData.enemies)) {
            for (let i = 0; i < Math.min(enemies.length, worldData.enemies.length); i++) {
                Object.assign(enemies[i], worldData.enemies[i]);
            }
        }

        worldState.paused = false;
        worldState.gameOver = false;

        updateHUD();
        updateQuestUI();
        showMessage("Salvamento carregado.");
    } catch (_) {
        showMessage("O arquivo de salvamento está corrompido.");
    }
}

function applyCollectedState(items, states, property = "collected") {
    if (!Array.isArray(states)) return;

    for (let i = 0; i < Math.min(items.length, states.length); i++) {
        items[i][property] = Boolean(states[i]);
    }
}

/* =========================================================
   GAME OVER AND RESPAWN
========================================================= */

function showGameOver() {
    worldState.paused = true;

    let panel = element("gameOverPanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "gameOverPanel";

        panel.style.cssText = `
            position:fixed;inset:0;z-index:500;
            display:flex;flex-direction:column;
            justify-content:center;align-items:center;
            gap:14px;background:rgba(3,5,4,.94);
            color:#e8e8df;font-family:Arial,sans-serif;
            text-align:center;padding:20px;
        `;

        panel.innerHTML = `
            <h1 style="letter-spacing:5px">VOCÊ CAIU</h1>
            <p>A floresta ainda guarda seus segredos.</p>
            <button id="respawnButton" style="
                padding:13px 25px;border-radius:8px;
                border:1px solid #687c5b;background:#202c1e;
                color:#e4eadb;font-size:14px;cursor:pointer
            ">Voltar ao abrigo</button>
        `;

        document.body.appendChild(panel);
    }

    panel.style.display = "flex";

    bindRespawnButton();
}

function bindRespawnButton() {
    const button = element("respawnButton");
    if (!button) return;

    button.onclick = () => {
        player.hp = player.maxHp;
        player.stamina = player.maxStamina;
        playerClass.mana = playerClass.maxMana;

        player.x = shelter.x;
        player.y = shelter.y;

        survival.hunger = Math.max(survival.hunger, 30);
        survival.thirst = Math.max(survival.thirst, 30);

        worldState.gameOver = false;
        worldState.paused = false;

        const panel = element("gameOverPanel");
        if (panel) panel.style.display = "none";

        showMessage("Você voltou ao abrigo.");
        updateHUD();
    };
}

/* =========================================================
   ENDING
========================================================= */

function showEnding() {
    worldState.paused = true;

    let endingPanel = element("endingPanel");

    if (!endingPanel) {
        endingPanel = document.createElement("div");
        endingPanel.id = "endingPanel";

        endingPanel.style.cssText = `
            position:fixed;inset:0;z-index:600;
            display:flex;flex-direction:column;
            justify-content:center;align-items:center;
            padding:30px;text-align:center;
            background:rgba(4,7,5,.96);color:#e2e9d8;
            font-family:Arial,sans-serif;
        `;

        document.body.appendChild(endingPanel);
    }

    const className = CLASS_INFO[worldState.ending]?.name || "Aventureiro";

    endingPanel.innerHTML = `
        <div style="max-width:620px">
            <p style="letter-spacing:5px;color:#a7bd91">DARKWOOD</p>
            <h1 style="font-size:clamp(28px,7vw,56px);margin:18px 0">
                FIM DESTA JORNADA
            </h1>
            <p style="line-height:1.8;color:#c3cbbc">
                O dragão ancestral caiu, mas a floresta ainda guarda
                histórias que ninguém ousou contar. Seu caminho como
                ${className} será lembrado pelos sobreviventes.
            </p>
            <p style="margin:18px 0;color:#9cac8b">
                Nível ${progression.level} · ${progression.kills} criaturas derrotadas
            </p>
            <button id="endingContinue" style="
                margin-top:18px;padding:13px 24px;
                border:1px solid #788d67;border-radius:8px;
                background:#1b291a;color:#e3e9d9;cursor:pointer
            ">Continuar explorando</button>
        </div>
    `;

    endingPanel.style.display = "flex";

    const button = element("endingContinue");
    if (button) {
        button.addEventListener("click", () => {
            endingPanel.style.display = "none";
            worldState.paused = false;
            worldState.ending = null;
            showMessage("A aventura continua...");
        });
    }
}

/* =========================================================
   MAIN RENDER
========================================================= */

function renderGame() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, W, H);

    const shakeX = camera.shake > 0 ? random(-camera.shake, camera.shake) : 0;
    const shakeY = camera.shake > 0 ? random(-camera.shake, camera.shake) : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawGround();
    drawGrassDetails();

    const renderables = [];

    for (const structure of structures) {
        renderables.push({
            y: structure.y + structure.height / 2,
            draw: () => drawStructure(structure)
        });
    }

    for (const tree of trees) {
        renderables.push({
            y: tree.y + tree.radius,
            draw: () => drawTree(tree)
        });
    }

    for (const rock of rocks) {
        renderables.push({
            y: rock.y + rock.radius,
            draw: () => drawRock(rock)
        });
    }

    for (const mushroom of mushrooms) {
        if (!mushroom.collected) {
            renderables.push({
                y: mushroom.y,
                draw: () => drawMushroom(mushroom)
            });
        }
    }

    for (const wood of woods) {
        if (!wood.collected) {
            renderables.push({
                y: wood.y,
                draw: () => drawWood(wood)
            });
        }
    }

    for (const stone of stones) {
        if (!stone.collected) {
            renderables.push({
                y: stone.y,
                draw: () => drawStone(stone)
            });
        }
    }

    renderables.push({
        y: shelter.y + shelter.height / 2,
        draw: drawShelter
    });

    for (const shrine of shrines) {
        renderables.push({
            y: shrine.y,
            draw: () => drawShrine(shrine)
        });
    }

    for (const crystal of crystals) {
        if (!crystal.collected) {
            renderables.push({
                y: crystal.y,
                draw: () => drawCrystal(crystal)
            });
        }
    }

    for (const chest of chests) {
        if (!chest.opened) {
            renderables.push({
                y: chest.y,
                draw: () => drawChest(chest)
            });
        }
    }

    for (const animal of animals) {
        renderables.push({
            y: animal.y,
            draw: () => drawAnimal(animal)
        });
    }

    for (const npc of npcs) {
        renderables.push({
            y: npc.y,
            draw: () => drawNPC(npc)
        });
    }

    for (const enemy of enemies) {
        if (!enemy.dead) {
            renderables.push({
                y: enemy.y,
                draw: () => drawEnemy(enemy)
            });
        }
    }

    renderables.push({
        y: player.y,
        draw: drawPlayer
    });

    renderables.sort((a, b) => a.y - b.y);

    for (const item of renderables) {
        item.draw();
    }

    drawFireflies();
    drawParticles();
    drawFloatingTexts();
    drawSpellEffects();

    ctx.restore();

    drawAtmosphere();
    drawBossHUD();
    drawMinimapHUD();

    if (worldState.paused && !worldState.gameOver) {
        drawPauseOverlay();
    }
}

function drawSpellEffects() {
    for (const spell of spells) {
        const p = worldToScreen(spell.x, spell.y);

        drawGlow(p.x, p.y, 35, "rgba(170,135,255,ALPHA)", 0.4);

        ctx.fillStyle = spell.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, spell.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBossHUD() {
    if (!activeBoss || activeBoss.dead) return;

    const width = Math.min(360, W * 0.65);
    const x = (W - width) / 2;
    const y = 22;

    roundedRect(x, y, width, 13, 6, "rgba(0,0,0,0.72)");
    roundedRect(
        x,
        y,
        width * Math.max(0, activeBoss.hp / activeBoss.maxHp),
        13,
        6,
        "#9f433d"
    );

    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9e4d7";

    ctx.fillText(
        activeBoss.bossKind === "dragon" ? "DRAGÃO ANCESTRAL" : "GUARDIÃO DAS RUÍNAS",
        W / 2,
        y - 6
    );

    ctx.textAlign = "left";
}

function drawMinimapHUD() {
    const size = 105;
    const x = W - size - 15;
    const y = H - size - 15;

    if (worldState.mapOpen || W < 600) return;

    ctx.save();
    ctx.globalAlpha = 0.8;

    roundedRect(x, y, size, size, 8, "rgba(7,12,8,0.78)", "rgba(210,225,195,0.15)");

    const px = x + player.x / world.width * size;
    const py = y + player.y / world.height * size;

    ctx.fillStyle = "#dbe6c5";
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d3a06e";
    ctx.fillRect(
        x + shelter.x / world.width * size - 2,
        y + shelter.y / world.height * size - 2,
        4,
        4
    );

    for (const crystal of crystals) {
        if (crystal.collected) continue;

        ctx.fillStyle = "#83d6ed";
        ctx.fillRect(
            x + crystal.x / world.width * size - 1.5,
            y + crystal.y / world.height * size - 1.5,
            3,
            3
        );
    }

    ctx.restore();
}

function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, W, H);
}

/* =========================================================
   RESPONSIVE GAME INITIALIZATION
========================================================= */

function initializeGame() {
    generateWorld();
    createWorldEntities();

    gameStarted = true;
    worldState.started = true;

    const loading = element("loading");
    if (loading) {
        loading.style.opacity = "0";

        window.setTimeout(() => {
            loading.style.display = "none";
        }, 500);
    }

    if (!playerClass.selected) {
        playerClass.selected = "warrior";
        chooseClass("warrior");
    }

    setQuest("first_mushroom");
    updateHUD();
    updateInventoryUI();
    updateQuestUI();

    showMessage("Explore a floresta. Encontre o cogumelo estranho.", 4);
}

/* =========================================================
   KEYBOARD ACTIONS
========================================================= */

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (key === "escape") {
        if (worldState.dialogueOpen) {
            closeDialogue();
        } else if (worldState.mapOpen) {
            toggleMap();
        } else {
            togglePause();
        }
    }

    if (key === "m") {
        toggleMap();
    }

    if (key === "q") {
        castSpecial();
    }

    if (key === "h") {
        usePotion();
    }

    if (key === "f") {
        eatMushroom();
    }

    if (key === "e" && !worldState.dialogueOpen) {
        if (interactWithNearestEntity()) {
            event.preventDefault();
        }
    }
});

/* =========================================================
   CONNECT EXISTING INTERACTION TO WORLD OBJECTS
========================================================= */

const originalInteract = interact;

interact = function () {
    if (worldState.paused || worldState.gameOver || worldState.dialogueOpen) return;

    if (interactWithNearestEntity()) return;

    originalInteract();
};

/* =========================================================
   PLAYER UPDATE WRAPPER
========================================================= */

const originalUpdatePlayer = updatePlayer;

updatePlayer = function (dt) {
    if (worldState.dialogueOpen || worldState.mapOpen) return;

    originalUpdatePlayer(dt);

    if (player.dodgeTimer > 0) {
        const input = getMovementInput();
        const dx = input.x || player.dirX;
        const dy = input.y || player.dirY;

        const targetX = player.x + dx * 210 * dt;
        const targetY = player.y + dy * 210 * dt;

        if (!isBlocked(targetX, player.y)) player.x = targetX;
        if (!isBlocked(player.x, targetY)) player.y = targetY;
    }

    if (inputMovementActive()) {
        footstepTimer -= dt;

        if (footstepTimer <= 0) {
            footstepTimer = 0.35;

            if (Math.random() < 0.25) {
                particles.push({
                    x: player.x + random(-5, 5),
                    y: player.y + 9,
                    vx: random(-10, 10),
                    vy: random(-8, 0),
                    life: 0.2,
                    maxLife: 0.2,
                    size: 2,
                    color: "#596c4d"
                });
            }
        }
    }

    player.stamina = Math.min(
        player.maxStamina,
        player.stamina + dt * 7
    );

    playerClass.mana = Math.min(
        playerClass.maxMana,
        playerClass.mana + dt * 2
    );
};

function inputMovementActive() {
    const input = getMovementInput();
    return Math.hypot(input.x, input.y) > 0.1;
}

/* =========================================================
   ENEMY UPDATE WRAPPER
========================================================= */

const originalUpdateEnemies = updateEnemies;

updateEnemies = function (dt) {
    originalUpdateEnemies(dt);

    for (const enemy of enemies) {
        if (enemy.dead) continue;

        if (enemy.type === "boss") {
            updateBoss(enemy, dt);
        }

        if (enemy.hp <= 0) {
            killEnemy(enemy);
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].dead && enemies.length > 30) {
            enemies.splice(i, 1);
        }
    }
};

/* =========================================================
   ATTACK WRAPPER FOR XP AND CLASS DAMAGE
========================================================= */

const originalAttack = attack;

attack = function () {
    if (worldState.paused || worldState.gameOver || worldState.dialogueOpen) return;

    const previousKills = progression.kills;
    originalAttack();

    for (const enemy of enemies) {
        if (enemy.dead) continue;

        if (enemy.hp <= 0) {
            killEnemy(enemy);
        }
    }

    if (progression.kills > previousKills) {
        gainXP((progression.kills - previousKills) * 20);
    }

    attackCombo++;
    attackComboTimer = 0.8;

    if (attackCombo >= 3) {
        attackCombo = 0;
        attackComboTimer = 0;

        for (const enemy of enemies) {
            if (enemy.dead) continue;

            if (distance(player, enemy) < 90) {
                enemy.hp -= applyClassBonus(10);
                enemy.hitTimer = 0.2;

                if (enemy.hp <= 0) killEnemy(enemy);
            }
        }
    }
};

/* =========================================================
   QUEST TRIGGERS FOR COLLECTION
========================================================= */

const originalCollectObject = collectObject;

collectObject = function (object, type) {
    originalCollectObject(object, type);

    if (object.strange || object === mushrooms.find(item => item === object && item.strange)) {
        advanceQuest("first_mushroom");
    }
};

/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(timestamp) {
    if (!worldState.lastTimestamp) {
        worldState.lastTimestamp = timestamp;
    }

    const rawDelta = (timestamp - worldState.lastTimestamp) / 1000;
    const dt = Math.min(0.033, Math.max(0, rawDelta));

    worldState.lastTimestamp = timestamp;

    if (gameStarted) {
        updateGame(dt);
        renderGame();
    }

    requestAnimationFrame(gameLoop);
}

/* =========================================================
   STARTUP
========================================================= */

function startDarkwood() {
    try {
        initializeGame();
    } catch (error) {
        console.error("Erro ao iniciar Darkwood:", error);

        const loading = element("loading");
        if (loading) {
            loading.style.display = "flex";
            loading.style.opacity = "1";

            const message = document.createElement("p");
            message.textContent = "Erro ao iniciar o jogo. Verifique o console.";
            message.style.color = "#e59c91";
            loading.appendChild(message);
        }
    }
}

startDarkwood();
requestAnimationFrame(gameLoop);
```

Pensou por 4m 2s

```javascript
/* =========================================================
   MOVEMENT AND AI BASE FUNCTIONS
========================================================= */

function updatePlayer(dt) {
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.dodgeCooldown = Math.max(0, player.dodgeCooldown - dt);
    player.dodgeTimer = Math.max(0, player.dodgeTimer - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.hurtTimer = Math.max(0, player.hurtTimer - dt);

    if (inventoryOpen || worldState.dialogueOpen || worldState.mapOpen) return;

    const input = getMovementInput();

    if (Math.hypot(input.x, input.y) > 0.1) {
        player.dirX = input.x;
        player.dirY = input.y;
    }

    let speed = player.speed;

    if (player.dodgeTimer > 0) {
        speed *= 2.1;
    }

    if (survival.hunger <= 0 || survival.thirst <= 0) {
        speed *= 0.75;
    }

    if (isNightTime() && playerClass.selected === "rogue") {
        speed *= 1.05;
    }

    const moveX = input.x * speed * dt;
    const moveY = input.y * speed * dt;

    const nextX = player.x + moveX;
    const nextY = player.y + moveY;

    if (!isBlocked(nextX, player.y)) {
        player.x = nextX;
    }

    if (!isBlocked(player.x, nextY)) {
        player.y = nextY;
    }

    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
}

function updateEnemies(dt) {
    for (const enemy of enemies) {
        if (enemy.dead || enemy.hp <= 0) continue;

        enemy.hitTimer = Math.max(0, (enemy.hitTimer || 0) - dt);
        enemy.attackCooldown = Math.max(0, (enemy.attackCooldown || 0) - dt);

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (enemy.type === "boss") {
            if (dist > enemy.radius + player.radius + 8) {
                moveEnemyToward(enemy, player.x, player.y, dt);
            } else if (enemy.attackCooldown <= 0) {
                damagePlayer(enemy.damage || 18, enemy);
                enemy.attackCooldown = 1.1;
            }

            continue;
        }

        if (dist < 380) {
            if (dist > enemy.radius + player.radius + 8) {
                moveEnemyToward(enemy, player.x, player.y, dt);
            } else if (enemy.attackCooldown <= 0) {
                damagePlayer(enemy.damage || 8, enemy);
                enemy.attackCooldown = 1.25;
            }
        } else {
            enemy.wanderTimer = (enemy.wanderTimer || 0) - dt;

            if (enemy.wanderTimer <= 0) {
                enemy.wanderTimer = random(1.5, 4);
                enemy.wanderX = random(-1, 1);
                enemy.wanderY = random(-1, 1);

                const len = Math.hypot(enemy.wanderX, enemy.wanderY) || 1;
                enemy.wanderX /= len;
                enemy.wanderY /= len;
            }

            const speed = (enemy.speed || 45) * 0.3;
            const nx = enemy.x + enemy.wanderX * speed * dt;
            const ny = enemy.y + enemy.wanderY * speed * dt;

            if (!isBlocked(nx, enemy.y, enemy.radius)) enemy.x = nx;
            if (!isBlocked(enemy.x, ny, enemy.radius)) enemy.y = ny;
        }
    }
}

function moveEnemyToward(enemy, targetX, targetY, dt) {
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const len = Math.hypot(dx, dy) || 1;

    const speed = enemy.speed || 45;
    const nx = enemy.x + dx / len * speed * dt;
    const ny = enemy.y + dy / len * speed * dt;

    if (!isBlocked(nx, enemy.y, enemy.radius)) enemy.x = nx;
    if (!isBlocked(enemy.x, ny, enemy.radius)) enemy.y = ny;
}
```
