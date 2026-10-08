const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hpBar = document.getElementById("hpBar");
const staminaBar = document.getElementById("staminaBar");
const dayText = document.getElementById("dayText");
const resourceText = document.getElementById("resourceText");
const questText = document.getElementById("questText");
const interaction = document.getElementById("interaction");
const damageFlash = document.getElementById("damageFlash");

const joystick = document.getElementById("joystick");
const joystickKnob = document.getElementById("joystickKnob");

const attackButton = document.getElementById("attackButton");
const dodgeButton = document.getElementById("dodgeButton");
const interactButton = document.getElementById("interactButton");

const loading = document.getElementById("loading");


/* =========================================================
   CANVAS
========================================================= */

let W = 0;
let H = 0;
let DPR = 1;

function resizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);

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

const player = {
    x: 1800,
    y: 1350,

    radius: 18,

    speed: 170,

    hp: 100,
    maxHp: 100,

    stamina: 100,
    maxStamina: 100,

    dirX: 0,
    dirY: 1,

    attackTimer: 0,
    attackCooldown: 0,

    dodgeTimer: 0,
    dodgeCooldown: 0,

    invulnerable: 0,

    hurtTimer: 0,

    attacking: false
};


const camera = {
    x: player.x,
    y: player.y,

    shake: 0,
    zoom: 1
};


const shelter = {
    x: 1800,
    y: 1350,
    width: 260,
    height: 190
};


const campfire = {
    x: 1800,
    y: 1455,
    radius: 34
};


/* =========================================================
   GAME STATE
========================================================= */

let day = 1;
let worldTime = 20;

const DAY_LENGTH = 180;

let resources = {
    wood: 0,
    stone: 0,
    mushroom: 0
};

let questStage = 0;

let message = "";
let messageTimer = 0;

let gameStarted = false;


/* =========================================================
   OBJECTS
========================================================= */

const trees = [];
const rocks = [];
const mushrooms = [];
const woods = [];
const stones = [];
const enemies = [];
const particles = [];

const keys = {};


/* =========================================================
   RANDOM
========================================================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


/* =========================================================
   WORLD GENERATION
========================================================= */

function insideShelter(x, y) {
    return (
        x > shelter.x - shelter.width / 2 &&
        x < shelter.x + shelter.width / 2 &&
        y > shelter.y - shelter.height / 2 &&
        y < shelter.y + shelter.height / 2
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

        let x;
        let y;

        do {
            x = random(80, world.width - 80);
            y = random(80, world.height - 80);
        } while (insideShelter(x, y));

        trees.push({
            x,
            y,
            radius: random(22, 31),
            scale: random(.8, 1.25)
        });
    }


    for (let i = 0; i < 90; i++) {

        let x;
        let y;

        do {
            x = random(60, world.width - 60);
            y = random(60, world.height - 60);
        } while (insideShelter(x, y));

        rocks.push({
            x,
            y,
            radius: random(12, 22)
        });
    }


    for (let i = 0; i < 40; i++) {

        let x;
        let y;

        do {
            x = random(50, world.width - 50);
            y = random(50, world.height - 50);
        } while (insideShelter(x, y));

        mushrooms.push({
            x,
            y,
            radius: 9,
            strange: Math.random() < .20,
            collected: false
        });
    }


    for (let i = 0; i < 50; i++) {

        woods.push({
            x: random(50, world.width - 50),
            y: random(50, world.height - 50),
            collected: false
        });
    }


    for (let i = 0; i < 50; i++) {

        stones.push({
            x: random(50, world.width - 50),
            y: random(50, world.height - 50),
            collected: false
        });
    }


    for (let i = 0; i < 9; i++) {

        let x;
        let y;

        do {
            x = random(250, world.width - 250);
            y = random(250, world.height - 250);
        } while (
            distance(
                { x, y },
                player
            ) < 500
        );

        enemies.push(createGoblin(x, y));
    }
}


function createGoblin(x, y) {

    return {
        x,
        y,

        radius: 17,

        hp: 60,
        maxHp: 60,

        speed: random(52, 72),

        attackCooldown: random(.2, 1),

        hitTimer: 0,

        hurtTimer: 0,

        knockbackX: 0,
        knockbackY: 0,

        wanderAngle: random(0, Math.PI * 2),

        wanderTimer: random(1, 3),

        dead: false
    };
}


generateWorld();


/* =========================================================
   INPUT
========================================================= */

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (
        e.key === " " ||
        e.key.toLowerCase() === "j"
    ) {
        attack();
    }

    if (
        e.key.toLowerCase() === "shift" ||
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


/* =========================================================
   MOVEMENT
========================================================= */

let joystickInput = {
    x: 0,
    y: 0
};


function getMovement() {

    let x = 0;
    let y = 0;

    if (keys["w"] || keys["arrowup"]) y -= 1;
    if (keys["s"] || keys["arrowdown"]) y += 1;
    if (keys["a"] || keys["arrowleft"]) x -= 1;
    if (keys["d"] || keys["arrowright"]) x += 1;

    x += joystickInput.x;
    y += joystickInput.y;

    const length = Math.hypot(x, y);

    if (length > 1) {
        x /= length;
        y /= length;
    }

    return { x, y };
}


/* =========================================================
   COLLISION
========================================================= */

function collidesWithWorld(x, y, radius) {

    for (const tree of trees) {

        const d = Math.hypot(
            x - tree.x,
            y - tree.y
        );

        if (d < radius + tree.radius * .7) {
            return true;
        }
    }


    for (const rock of rocks) {

        const d = Math.hypot(
            x - rock.x,
            y - rock.y
        );

        if (d < radius + rock.radius) {
            return true;
        }
    }


    return false;
}


function movePlayer(dx, dy) {

    let nx = player.x + dx;
    let ny = player.y + dy;

    nx = clamp(
        nx,
        player.radius,
        world.width - player.radius
    );

    ny = clamp(
        ny,
        player.radius,
        world.height - player.radius
    );


    if (!collidesWithWorld(nx, player.y, player.radius)) {
        player.x = nx;
    }

    if (!collidesWithWorld(player.x, ny, player.radius)) {
        player.y = ny;
    }
}


/* =========================================================
   ATTACK
========================================================= */

function attack() {

    if (player.attackCooldown > 0) return;
    if (player.dodgeTimer > 0) return;
    if (player.stamina < 12) return;

    player.attackCooldown = .42;
    player.attackTimer = .18;
    player.attacking = true;

    player.stamina -= 12;

    camera.shake = Math.max(camera.shake, 4);

    spawnAttackParticles();

    for (const enemy of enemies) {

        if (enemy.dead) continue;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;

        const d = Math.hypot(dx, dy);

        if (d > 85) continue;

        const nx = dx / Math.max(d, 1);
        const ny = dy / Math.max(d, 1);

        const dot =
            nx * player.dirX +
            ny * player.dirY;

        if (dot > .15) {

            enemy.hp -= 25;

            enemy.hurtTimer = .22;

            enemy.knockbackX = nx * 230;
            enemy.knockbackY = ny * 230;

            spawnHitParticles(enemy.x, enemy.y);

            camera.shake = Math.max(
                camera.shake,
                8
            );

            if (enemy.hp <= 0) {

                enemy.dead = true;

                spawnDeathParticles(
                    enemy.x,
                    enemy.y
                );

                showMessage(
                    "Goblin derrotado."
                );
            }
        }
    }
}


/* =========================================================
   DODGE
========================================================= */

function dodge() {

    if (player.dodgeCooldown > 0) return;
    if (player.stamina < 22) return;

    const movement = getMovement();

    let dx = movement.x;
    let dy = movement.y;

    if (Math.hypot(dx, dy) < .1) {

        dx = player.dirX;
        dy = player.dirY;
    }

    player.stamina -= 22;

    player.dodgeTimer = .18;
    player.dodgeCooldown = .65;
    player.invulnerable = .22;

    player.dirX = dx;
    player.dirY = dy;

    spawnDodgeParticles();

    camera.shake = Math.max(
        camera.shake,
        3
    );
}


/* =========================================================
   DAMAGE
========================================================= */

function damagePlayer(amount, enemy) {

    if (player.invulnerable > 0) return;
    if (player.dodgeTimer > 0) return;

    player.hp -= amount;

    player.invulnerable = .65;
    player.hurtTimer = .25;

    damageFlash.style.opacity = ".8";

    setTimeout(() => {
        damageFlash.style.opacity = "0";
    }, 90);

    camera.shake = Math.max(
        camera.shake,
        12
    );

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;

    const d = Math.max(
        Math.hypot(dx, dy),
        1
    );

    movePlayer(
        dx / d * 35,
        dy / d * 35
    );

    spawnHitParticles(
        player.x,
        player.y,
        true
    );

    if (player.hp <= 0) {
        respawnPlayer();
    }
}


/* =========================================================
   RESPAWN
========================================================= */

function respawnPlayer() {

    player.x = shelter.x;
    player.y = shelter.y + 50;

    player.hp = player.maxHp;
    player.stamina = player.maxStamina;

    showMessage(
        "Você acordou novamente no abrigo."
    );
}


/* =========================================================
   PARTICLES
========================================================= */

function addParticle(x, y, options = {}) {

    particles.push({
        x,
        y,

        vx: options.vx ?? random(-30, 30),
        vy: options.vy ?? random(-30, 30),

        life: options.life ?? .5,
        maxLife: options.life ?? .5,

        size: options.size ?? random(2, 5),

        type: options.type ?? "dust"
    });
}


function spawnHitParticles(x, y, playerHit = false) {

    for (let i = 0; i < 10; i++) {

        addParticle(x, y, {
            vx: random(-90, 90),
            vy: random(-90, 90),
            life: random(.2, .45),
            size: random(2, 5),
            type: playerHit ? "blood" : "impact"
        });
    }
}


function spawnDeathParticles(x, y) {

    for (let i = 0; i < 22; i++) {

        addParticle(x, y, {
            vx: random(-120, 120),
            vy: random(-120, 120),
            life: random(.35, .8),
            size: random(2, 6),
            type: "blood"
        });
    }
}


function spawnAttackParticles() {

    const x =
        player.x +
        player.dirX * 38;

    const y =
        player.y +
        player.dirY * 38;

    for (let i = 0; i < 7; i++) {

        addParticle(x, y, {
            vx: player.dirX * random(40, 120) + random(-30, 30),
            vy: player.dirY * random(40, 120) + random(-30, 30),
            life: random(.12, .25),
            size: random(2, 4),
            type: "slash"
        });
    }
}


function spawnDodgeParticles() {

    for (let i = 0; i < 14; i++) {

        addParticle(
            player.x - player.dirX * 15,
            player.y - player.dirY * 15,
            {
                vx: random(-25, 25),
                vy: random(-25, 25),
                life: random(.25, .55),
                size: random(2, 5),
                type: "dust"
            }
        );
    }
}


function updateParticles(dt) {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= .94;
        p.vy *= .94;

        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


/* =========================================================
   ENEMIES
========================================================= */

function updateEnemies(dt) {

    for (const enemy of enemies) {

        if (enemy.dead) continue;

        enemy.attackCooldown -= dt;
        enemy.hitTimer -= dt;
        enemy.hurtTimer -= dt;


        if (enemy.hurtTimer > 0) {

            enemy.x += enemy.knockbackX * dt;
            enemy.y += enemy.knockbackY * dt;

            enemy.knockbackX *= .88;
            enemy.knockbackY *= .88;

            continue;
        }


        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const d = Math.hypot(dx, dy);


        if (d < 430) {

            const nx = dx / Math.max(d, 1);
            const ny = dy / Math.max(d, 1);

            if (d > 43) {

                const speed =
                    enemy.speed *
                    (d < 180 ? 1.15 : 1);

                const oldX = enemy.x;
                const oldY = enemy.y;

                enemy.x += nx * speed * dt;
                enemy.y += ny * speed * dt;

                if (
                    collidesWithWorld(
                        enemy.x,
                        enemy.y,
                        enemy.radius
                    )
                ) {
                    enemy.x = oldX;
                    enemy.y = oldY;
                }
            }
            else {

                if (enemy.attackCooldown <= 0) {

                    enemy.attackCooldown = 1.15;

                    damagePlayer(
                        10,
                        enemy
                    );
                }
            }
        }
        else {

            enemy.wanderTimer -= dt;

            if (enemy.wanderTimer <= 0) {

                enemy.wanderTimer =
                    random(1, 3);

                enemy.wanderAngle =
                    random(0, Math.PI * 2);
            }

            enemy.x +=
                Math.cos(enemy.wanderAngle) *
                enemy.speed *
                .2 *
                dt;

            enemy.y +=
                Math.sin(enemy.wanderAngle) *
                enemy.speed *
                .2 *
                dt;
        }


        enemy.x = clamp(
            enemy.x,
            enemy.radius,
            world.width - enemy.radius
        );

        enemy.y = clamp(
            enemy.y,
            enemy.radius,
            world.height - enemy.radius
        );
    }
}


/* =========================================================
   COLLECTION
========================================================= */

function collectResources() {

    for (const item of woods) {

        if (item.collected) continue;

        if (
            Math.hypot(
                player.x - item.x,
                player.y - item.y
            ) < 35
        ) {

            item.collected = true;

            resources.wood++;

            showMessage(
                "Madeira coletada."
            );
        }
    }


    for (const item of stones) {

        if (item.collected) continue;

        if (
            Math.hypot(
                player.x - item.x,
                player.y - item.y
            ) < 35
        ) {

            item.collected = true;

            resources.stone++;

            showMessage(
                "Pedra coletada."
            );
        }
    }


    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        if (
            Math.hypot(
                player.x - mushroom.x,
                player.y - mushroom.y
            ) < 32
        ) {

            mushroom.collected = true;

            resources.mushroom++;

            if (
                mushroom.strange &&
                questStage === 0
            ) {

                questStage = 1;

                questText.textContent =
                    "O cogumelo estranho está reagindo. Volte ao abrigo.";

                showMessage(
                    "Você encontrou algo estranho..."
                );
            }
            else {

                showMessage(
                    "Cogumelo coletado."
                );
            }
        }
    }
}


/* =========================================================
   INTERACTION
========================================================= */

function interact() {

    const dShelter =
        Math.hypot(
            player.x - shelter.x,
            player.y - shelter.y
        );

    const dFire =
        Math.hypot(
            player.x - campfire.x,
            player.y - campfire.y
        );


    if (dShelter < 180) {

        showMessage(
            "Este abrigo pode ser seu refúgio."
        );

        return;
    }


    if (dFire < 100) {

        showMessage(
            "O fogo mantém a escuridão afastada."
        );

        return;
    }
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(text) {

    message = text;
    messageTimer = 2.5;
}


/* =========================================================
   DAY / NIGHT
========================================================= */

function updateDayNight(dt) {

    worldTime += dt;

    if (worldTime >= DAY_LENGTH) {

        worldTime = 0;
        day++;

        showMessage(
            `O dia ${day} começou.`
        );
    }


    const ratio =
        worldTime / DAY_LENGTH;

    let phase = "";

    if (ratio < .25) {
        phase = "MANHÃ";
    }
    else if (ratio < .55) {
        phase = "DIA";
    }
    else if (ratio < .72) {
        phase = "ENTARDECER";
    }
    else {
        phase = "NOITE";
    }

    dayText.textContent =
        `DIA ${day} — ${phase}`;
}


function getNightAmount() {

    const ratio =
        worldTime / DAY_LENGTH;

    if (ratio < .55) return 0;

    if (ratio < .72) {

        return (
            (ratio - .55) /
            .17
        ) * .65;
    }

    return .72;
}


/* =========================================================
   PLAYER UPDATE
========================================================= */

function updatePlayer(dt) {

    player.attackCooldown -= dt;
    player.dodgeCooldown -= dt;
    player.invulnerable -= dt;
    player.hurtTimer -= dt;

    if (player.attackTimer > 0) {

        player.attackTimer -= dt;

        if (player.attackTimer <= 0) {
            player.attacking = false;
        }
    }


    if (player.dodgeTimer > 0) {

        player.dodgeTimer -= dt;

        movePlayer(
            player.dirX *
            player.speed *
            3.8 *
            dt,

            player.dirY *
            player.speed *
            3.8 *
            dt
        );

        return;
    }


    const movement = getMovement();

    const moving =
        Math.hypot(
            movement.x,
            movement.y
        ) > .05;


    if (moving) {

        player.dirX = movement.x;
        player.dirY = movement.y;

        const speed =
            player.speed *
            (player.stamina < 8 ? .55 : 1);

        movePlayer(
            movement.x * speed * dt,
            movement.y * speed * dt
        );

        player.stamina -= 8 * dt;

        if (player.stamina < 0) {
            player.stamina = 0;
        }
    }
    else {

        player.stamina += 18 * dt;

        if (player.stamina > player.maxStamina) {
            player.stamina = player.maxStamina;
        }
    }
}


/* =========================================================
   CAMERA
========================================================= */

function updateCamera(dt) {

    const smoothing =
        1 - Math.pow(.001, dt);

    camera.x +=
        (player.x - camera.x) *
        smoothing;

    camera.y +=
        (player.y - camera.y) *
        smoothing;


    if (camera.shake > 0) {

        camera.shake *= .88;

        if (camera.shake < .1) {
            camera.shake = 0;
        }
    }


    camera.x = clamp(
        camera.x,
        W / 2,
        world.width - W / 2
    );

    camera.y = clamp(
        camera.y,
        H / 2,
        world.height - H / 2
    );
}


/* =========================================================
   DRAW HELPERS
========================================================= */

function worldToScreen(x, y) {

    let sx =
        (x - camera.x) *
        camera.zoom +
        W / 2;

    let sy =
        (y - camera.y) *
        camera.zoom +
        H / 2;


    if (camera.shake > 0) {

        sx += random(
            -camera.shake,
            camera.shake
        );

        sy += random(
            -camera.shake,
            camera.shake
        );
    }

    return { x: sx, y: sy };
}


/* =========================================================
   GROUND
========================================================= */

function drawGround() {

    ctx.fillStyle = "#263026";
    ctx.fillRect(0, 0, W, H);


    const tileSize = 80;

    const startX =
        Math.floor(
            (camera.x - W / 2) /
            tileSize
        ) * tileSize;

    const startY =
        Math.floor(
            (camera.y - H / 2) /
            tileSize
        ) * tileSize;


    for (
        let x = startX;
        x < camera.x + W / 2 + tileSize;
        x += tileSize
    ) {

        for (
            let y = startY;
            y < camera.y + H / 2 + tileSize;
            y += tileSize
        ) {

            const p =
                worldToScreen(x, y);

            ctx.fillStyle =
                ((x / tileSize +
                  y / tileSize) % 2 === 0)
                    ? "#293329"
                    : "#273027";

            ctx.fillRect(
                p.x,
                p.y,
                tileSize,
                tileSize
            );
        }
    }


    // pequenas folhas / marcas do chão

    for (let i = 0; i < 80; i++) {

        const x =
            camera.x +
            random(-W / 2, W / 2);

        const y =
            camera.y +
            random(-H / 2, H / 2);

        const p =
            worldToScreen(x, y);

        ctx.fillStyle =
            "rgba(115,125,91,.18)";

        ctx.fillRect(
            p.x,
            p.y,
            2,
            5
        );
    }
}


/* =========================================================
   TREES
========================================================= */

function drawTree(tree) {

    const p =
        worldToScreen(
            tree.x,
            tree.y
        );

    const s = tree.scale;


    // sombra

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y + 18 * s,
        27 * s,
        11 * s,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(0,0,0,.35)";

    ctx.fill();


    // tronco

    ctx.fillStyle = "#4a3427";

    ctx.fillRect(
        p.x - 7 * s,
        p.y - 12 * s,
        14 * s,
        34 * s
    );


    ctx.fillStyle = "#36251d";

    ctx.fillRect(
        p.x - 2 * s,
        p.y - 8 * s,
        4 * s,
        28 * s
    );


    // copa

    const gradient =
        ctx.createRadialGradient(
            p.x - 8,
            p.y - 35 * s,
            5,
            p.x,
            p.y - 15 * s,
            35 * s
        );

    gradient.addColorStop(
        0,
        "#4e674a"
    );

    gradient.addColorStop(
        1,
        "#18261d"
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.arc(
        p.x,
        p.y - 25 * s,
        31 * s,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
        "rgba(5,10,6,.35)";

    ctx.beginPath();

    ctx.arc(
        p.x + 13 * s,
        p.y - 13 * s,
        21 * s,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


/* =========================================================
   ROCKS
========================================================= */

function drawRock(rock) {

    const p =
        worldToScreen(
            rock.x,
            rock.y
        );

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y + 5,
        rock.radius * 1.2,
        rock.radius * .75,
        -.15,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(0,0,0,.35)";

    ctx.fill();


    ctx.beginPath();

    ctx.moveTo(
        p.x - rock.radius,
        p.y + 5
    );

    ctx.lineTo(
        p.x - rock.radius * .5,
        p.y - rock.radius * .75
    );

    ctx.lineTo(
        p.x + rock.radius * .55,
        p.y - rock.radius * .7
    );

    ctx.lineTo(
        p.x + rock.radius,
        p.y + 2
    );

    ctx.lineTo(
        p.x + rock.radius * .3,
        p.y + rock.radius * .7
    );

    ctx.lineTo(
        p.x - rock.radius * .7,
        p.y + rock.radius * .6
    );

    ctx.closePath();

    ctx.fillStyle =
        "#59605a";

    ctx.fill();


    ctx.strokeStyle =
        "rgba(255,255,255,.08)";

    ctx.stroke();
}


/* =========================================================
   MUSHROOMS
========================================================= */

function drawMushroom(mushroom) {

    if (mushroom.collected) return;

    const p =
        worldToScreen(
            mushroom.x,
            mushroom.y
        );


    ctx.fillStyle =
        "#d2c9a7";

    ctx.fillRect(
        p.x - 3,
        p.y,
        6,
        11
    );


    ctx.beginPath();

    ctx.arc(
        p.x,
        p.y,
        10,
        Math.PI,
        0
    );

    ctx.closePath();

    ctx.fillStyle =
        mushroom.strange
            ? "#744f8d"
            : "#a44c43";

    ctx.fill();


    ctx.fillStyle =
        "#ddd6bd";

    ctx.beginPath();

    ctx.arc(
        p.x - 3,
        p.y - 4,
        2,
        0,
        Math.PI * 2
    );

    ctx.arc(
        p.x + 4,
        p.y - 2,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


/* =========================================================
   RESOURCES
========================================================= */

function drawResources() {

    for (const item of woods) {

        if (item.collected) continue;

        const p =
            worldToScreen(
                item.x,
                item.y
            );

        ctx.save();

        ctx.translate(
            p.x,
            p.y
        );

        ctx.rotate(.25);

        ctx.fillStyle =
            "#684733";

        ctx.fillRect(
            -13,
            -5,
            26,
            9
        );

        ctx.restore();
    }


    for (const item of stones) {

        if (item.collected) continue;

        const p =
            worldToScreen(
                item.x,
                item.y
            );

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            8,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#747970";

        ctx.fill();
    }
}


/* =========================================================
   SHELTER
========================================================= */

function drawShelter() {

    const p =
        worldToScreen(
            shelter.x,
            shelter.y
        );


    ctx.fillStyle =
        "rgba(0,0,0,.4)";

    ctx.fillRect(
        p.x - 135,
        p.y - 73,
        270,
        150
    );


    ctx.fillStyle =
        "#49382c";

    ctx.fillRect(
        p.x - 120,
        p.y - 65,
        240,
        130
    );


    ctx.fillStyle =
        "#30251e";

    ctx.beginPath();

    ctx.moveTo(
        p.x - 140,
        p.y - 65
    );

    ctx.lineTo(
        p.x,
        p.y - 135
    );

    ctx.lineTo(
        p.x + 140,
        p.y - 65
    );

    ctx.closePath();

    ctx.fill();


    ctx.fillStyle =
        "#171713";

    ctx.fillRect(
        p.x - 27,
        p.y + 12,
        54,
        53
    );


    ctx.fillStyle =
        "#726044";

    ctx.fillRect(
        p.x - 6,
        p.y + 20,
        12,
        45
    );
}


/* =========================================================
   CAMPFIRE
========================================================= */

function drawCampfire() {

    const p =
        worldToScreen(
            campfire.x,
            campfire.y
        );


    const pulse =
        Math.sin(
            performance.now() * .008
        ) * 5;


    // luz

    const gradient =
        ctx.createRadialGradient(
            p.x,
            p.y,
            5,
            p.x,
            p.y,
            130 + pulse
        );

    gradient.addColorStop(
        0,
        "rgba(221,155,66,.18)"
    );

    gradient.addColorStop(
        1,
        "rgba(221,155,66,0)"
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.arc(
        p.x,
        p.y,
        135 + pulse,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // pedras

    for (let i = 0; i < 7; i++) {

        const a =
            i / 7 * Math.PI * 2;

        ctx.beginPath();

        ctx.arc(
            p.x + Math.cos(a) * 25,
            p.y + Math.sin(a) * 14,
            6,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#68665c";

        ctx.fill();
    }


    // madeira

    ctx.save();

    ctx.translate(
        p.x,
        p.y + 3
    );

    ctx.rotate(.3);

    ctx.fillStyle =
        "#4b2e20";

    ctx.fillRect(
        -20,
        -4,
        40,
        7
    );

    ctx.rotate(1.1);

    ctx.fillRect(
        -20,
        -4,
        40,
        7
    );

    ctx.restore();


    // fogo

    ctx.beginPath();

    ctx.moveTo(
        p.x,
        p.y - 38 - pulse * .3
    );

    ctx.quadraticCurveTo(
        p.x - 23,
        p.y - 9,
        p.x - 10,
        p.y + 5
    );

    ctx.quadraticCurveTo(
        p.x,
        p.y + 18,
        p.x + 13,
        p.y + 3
    );

    ctx.quadraticCurveTo(
        p.x + 26,
        p.y - 12,
        p.x,
        p.y - 38 - pulse * .3
    );

    ctx.fillStyle =
        "#d07a32";

    ctx.fill();


    ctx.beginPath();

    ctx.moveTo(
        p.x,
        p.y - 27
    );

    ctx.quadraticCurveTo(
        p.x - 12,
        p.y - 6,
        p.x,
        p.y + 4
    );

    ctx.quadraticCurveTo(
        p.x + 12,
        p.y - 6,
        p.x,
        p.y - 27
    );

    ctx.fillStyle =
        "#e4b85d";

    ctx.fill();
}


/* =========================================================
   GOBLIN
========================================================= */

function drawGoblin(enemy) {

    if (enemy.dead) return;

    const p =
        worldToScreen(
            enemy.x,
            enemy.y
        );


    // sombra

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y + 15,
        20,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(0,0,0,.4)";

    ctx.fill();


    // corpo

    ctx.fillStyle =
        enemy.hurtTimer > 0
            ? "#d1b2a5"
            : "#3e5c3d";

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y + 5,
        13,
        18,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // cabeça

    ctx.beginPath();

    ctx.arc(
        p.x,
        p.y - 11,
        15,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // orelhas

    ctx.beginPath();

    ctx.moveTo(
        p.x - 10,
        p.y - 16
    );

    ctx.lineTo(
        p.x - 27,
        p.y - 24
    );

    ctx.lineTo(
        p.x - 13,
        p.y - 5
    );

    ctx.fill();


    ctx.beginPath();

    ctx.moveTo(
        p.x + 10,
        p.y - 16
    );

    ctx.lineTo(
        p.x + 27,
        p.y - 24
    );

    ctx.lineTo(
        p.x + 13,
        p.y - 5
    );

    ctx.fill();


    // olhos

    ctx.fillStyle =
        "#d8bd67";

    ctx.fillRect(
        p.x - 7,
        p.y - 14,
        4,
        4
    );

    ctx.fillRect(
        p.x + 3,
        p.y - 14,
        4,
        4
    );


    // barra de vida

    if (enemy.hp < enemy.maxHp) {

        ctx.fillStyle =
            "rgba(0,0,0,.7)";

        ctx.fillRect(
            p.x - 20,
            p.y - 35,
            40,
            4
        );

        ctx.fillStyle =
            "#a84942";

        ctx.fillRect(
            p.x - 20,
            p.y - 35,
            40 * (
                enemy.hp /
                enemy.maxHp
            ),
            4
        );
    }
}


/* =========================================================
   PLAYER
========================================================= */

function drawPlayer() {

    const p =
        worldToScreen(
            player.x,
            player.y
        );


    const dodge =
        player.dodgeTimer > 0;

    const hurt =
        player.hurtTimer > 0;


    // sombra

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y + 17,
        21,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(0,0,0,.45)";

    ctx.fill();


    if (dodge) {

        ctx.globalAlpha = .55;
    }


    // corpo

    ctx.fillStyle =
        hurt
            ? "#d7aaa2"
            : "#485b50";

    ctx.beginPath();

    ctx.ellipse(
        p.x,
        p.y + 4,
        14,
        19,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // cabeça

    ctx.fillStyle =
        "#b79b7e";

    ctx.beginPath();

    ctx.arc(
        p.x,
        p.y - 15,
        12,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // cabelo

    ctx.fillStyle =
        "#27211d";

    ctx.beginPath();

    ctx.arc(
        p.x,
        p.y - 19,
        12,
        Math.PI,
        0
    );

    ctx.fill();


    // olhos

    ctx.fillStyle =
        "#d9d4b5";

    ctx.fillRect(
        p.x - 6,
        p.y - 16,
        3,
        3
    );

    ctx.fillRect(
        p.x + 3,
        p.y - 16,
        3,
        3
    );


    // espada

    if (player.attacking) {

        const angle =
            Math.atan2(
                player.dirY,
                player.dirX
            );

        ctx.save();

        ctx.translate(
            p.x,
            p.y
        );

        ctx.rotate(angle);

        ctx.strokeStyle =
            "#d6d2bd";

        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.moveTo(
            8,
            5
        );

        ctx.lineTo(
            55,
            5
        );

        ctx.stroke();


        ctx.strokeStyle =
            "#6e4e36";

        ctx.lineWidth = 5;

        ctx.beginPath();

        ctx.moveTo(
            3,
            -5
        );

        ctx.lineTo(
            3,
            15
        );

        ctx.stroke();

        ctx.restore();
    }


    ctx.globalAlpha = 1;
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

        const alpha =
            clamp(
                p.life / p.maxLife,
                0,
                1
            );

        ctx.globalAlpha = alpha;


        if (p.type === "blood") {
            ctx.fillStyle = "#8e3835";
        }
        else if (p.type === "impact") {
            ctx.fillStyle = "#d5c7a1";
        }
        else if (p.type === "slash") {
            ctx.fillStyle = "#e5dfc7";
        }
        else {
            ctx.fillStyle = "#7d806c";
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
    }

    ctx.globalAlpha = 1;
}


/* =========================================================
   LIGHT / NIGHT
========================================================= */

function drawNightOverlay() {

    const night =
        getNightAmount();

    if (night <= 0) return;


    ctx.fillStyle =
        `rgba(4,7,15,${night})`;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    // luz do jogador

    const playerScreen =
        worldToScreen(
            player.x,
            player.y
        );

    const light =
        ctx.createRadialGradient(
            playerScreen.x,
            playerScreen.y,
            10,
            playerScreen.x,
            playerScreen.y,
            170
        );

    light.addColorStop(
        0,
        "rgba(190,178,130,.16)"
    );

    light.addColorStop(
        1,
        "rgba(190,178,130,0)"
    );

    ctx.fillStyle = light;

    ctx.beginPath();

    ctx.arc(
        playerScreen.x,
        playerScreen.y,
        170,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // luz da fogueira

    const fire =
        worldToScreen(
            campfire.x,
            campfire.y
        );

    const fireLight =
        ctx.createRadialGradient(
            fire.x,
            fire.y,
            5,
            fire.x,
            fire.y,
            190
        );

    fireLight.addColorStop(
        0,
        "rgba(226,155,65,.36)"
    );

    fireLight.addColorStop(
        1,
        "rgba(226,155,65,0)"
    );

    ctx.fillStyle = fireLight;

    ctx.beginPath();

    ctx.arc(
        fire.x,
        fire.y,
        190,
        0,
        Math.PI * 2
    );

    ctx.fill();
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
            Math.max(W, H) * .75
        );

    gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,.62)"
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


    drawGround();


    // objetos ordenados por Y

    const objects = [];


    for (const tree of trees) {
        objects.push({
            y: tree.y,
            type: "tree",
            object: tree
        });
    }


    for (const rock of rocks) {
        objects.push({
            y: rock.y,
            type: "rock",
            object: rock
        });
    }


    for (const mushroom of mushrooms) {
        if (!mushroom.collected) {
            objects.push({
                y: mushroom.y,
                type: "mushroom",
                object: mushroom
            });
        }
    }


    for (const enemy of enemies) {
        if (!enemy.dead) {
            objects.push({
                y: enemy.y,
                type: "enemy",
                object: enemy
            });
        }
    }


    objects.push({
        y: shelter.y - 100,
        type: "shelter",
        object: shelter
    });


    objects.push({
        y: campfire.y,
        type: "fire",
        object: campfire
    });


    objects.push({
        y: player.y,
        type: "player",
        object: player
    });


    objects.sort(
        (a, b) => a.y - b.y
    );


    drawResources();


    for (const item of objects) {

        if (item.type === "tree") {
            drawTree(item.object);
        }

        else if (item.type === "rock") {
            drawRock(item.object);
        }

        else if (item.type === "mushroom") {
            drawMushroom(item.object);
        }

        else if (item.type === "enemy") {
            drawGoblin(item.object);
        }

        else if (item.type === "shelter") {
            drawShelter();
        }

        else if (item.type === "fire") {
            drawCampfire();
        }

        else if (item.type === "player") {
            drawPlayer();
        }
    }


    drawParticles();

    drawNightOverlay();

    drawVignette();
}


/* =========================================================
   HUD
========================================================= */

function updateHUD() {

    hpBar.style.width =
        `${clamp(
            player.hp / player.maxHp * 100,
            0,
            100
        )}%`;


    staminaBar.style.width =
        `${clamp(
            player.stamina /
            player.maxStamina *
            100,
            0,
            100
        )}%`;


    resourceText.innerHTML =
        `🪵 ${resources.wood}
         &nbsp; 🪨 ${resources.stone}
         &nbsp; 🍄 ${resources.mushroom}`;


    if (messageTimer > 0) {

        interaction.textContent =
            message;
    }
    else {

        interaction.textContent = "";
    }
}


/* =========================================================
   UPDATE
========================================================= */

function update(dt) {

    updatePlayer(dt);

    updateEnemies(dt);

    collectResources();

    updateParticles(dt);

    updateDayNight(dt);

    updateCamera(dt);


    if (messageTimer > 0) {
        messageTimer -= dt;
    }


    if (
        questStage === 1 &&
        Math.hypot(
            player.x - shelter.x,
            player.y - shelter.y
        ) < 170
    ) {

        questStage = 2;

        questText.textContent =
            "O abrigo parece esconder algo. Continue explorando.";

        showMessage(
            "Algo mudou depois que você trouxe o cogumelo."
        );
    }


    updateHUD();
}


/* =========================================================
   GAME LOOP
========================================================= */

let lastTime = performance.now();

function gameLoop(now) {

    const dt =
        Math.min(
            (now - lastTime) / 1000,
            .033
        );

    lastTime = now;

    update(dt);

    render();

    requestAnimationFrame(gameLoop);
}


/* =========================================================
   MOBILE JOYSTICK
========================================================= */

let joystickActive = false;


function updateJoystick(clientX, clientY) {

    const rect =
        joystick.getBoundingClientRect();

    const centerX =
        rect.left + rect.width / 2;

    const centerY =
        rect.top + rect.height / 2;

    let dx =
        clientX - centerX;

    let dy =
        clientY - centerY;

    const max =
        rect.width * .34;

    const length =
        Math.hypot(dx, dy);


    if (length > max) {

        dx =
            dx / length * max;

        dy =
            dy / length * max;
    }


    joystickKnob.style.transform =
        `translate(${dx}px, ${dy}px)`;


    joystickInput.x =
        dx / max;

    joystickInput.y =
        dy / max;
}


function resetJoystick() {

    joystickInput.x = 0;
    joystickInput.y = 0;

    joystickKnob.style.transform =
        "translate(0,0)";

    joystickActive = false;
}


joystick.addEventListener(
    "pointerdown",
    e => {

        joystickActive = true;

        joystick.setPointerCapture(
            e.pointerId
        );

        updateJoystick(
            e.clientX,
            e.clientY
        );
    }
);


joystick.addEventListener(
    "pointermove",
    e => {

        if (!joystickActive) return;

        updateJoystick(
            e.clientX,
            e.clientY
        );
    }
);


joystick.addEventListener(
    "pointerup",
    resetJoystick
);


joystick.addEventListener(
    "pointercancel",
    resetJoystick
);


/* =========================================================
   MOBILE BUTTONS
========================================================= */

attackButton.addEventListener(
    "pointerdown",
    e => {
        e.preventDefault();
        attack();
    }
);


dodgeButton.addEventListener(
    "pointerdown",
    e => {
        e.preventDefault();
        dodge();
    }
);


interactButton.addEventListener(
    "pointerdown",
    e => {
        e.preventDefault();
        interact();
    }
);


/* =========================================================
   START
========================================================= */

setTimeout(() => {

    loading.style.opacity = "0";

    setTimeout(() => {
        loading.style.display = "none";
    }, 500);

    gameStarted = true;

}, 900);


questText.textContent =
    "Explore a floresta e encontre um cogumelo estranho.";

requestAnimationFrame(gameLoop);
