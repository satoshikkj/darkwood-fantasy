const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;

function resize() {

    W = window.innerWidth;
    H = window.innerHeight;

    const ratio =
        Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = W * ratio;
    canvas.height = H * ratio;

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );
}

window.addEventListener(
    "resize",
    resize
);

resize();

/* ==================================================
   MUNDO
================================================== */

const world = {

    width: 3600,
    height: 2700
};

const player = {

    x: 1800,
    y: 1350,

    radius: 16,

    speed: 210,

    hp: 100,
    maxHp: 100,

    stamina: 100,
    maxStamina: 100,

    direction: 0,

    attackCooldown: 0,
    attackTime: 0,

    invulnerable: 0
};

const camera = {

    x: player.x,
    y: player.y
};

/* ==================================================
   ESTADO
================================================== */

let day = 1;

let worldTime = 0;

let mushroomsCollected = 0;
let woodCollected = 0;
let stoneCollected = 0;

let questStage = 0;

let messageTimer = 0;

let deltaTime = 0;

let lastTime = performance.now();

/* ==================================================
   CONTROLES
================================================== */

const keys = {};

window.addEventListener(
    "keydown",
    e => {

        keys[e.key.toLowerCase()] = true;

        if (
            [
                "w",
                "a",
                "s",
                "d",
                "arrowup",
                "arrowdown",
                "arrowleft",
                "arrowright",
                " "
            ].includes(
                e.key.toLowerCase()
            )
        ) {
            e.preventDefault();
        }

        if (
            e.key === " " ||
            e.key.toLowerCase() === "j"
        ) {
            attack();
        }
    }
);

window.addEventListener(
    "keyup",
    e => {

        keys[e.key.toLowerCase()] =
            false;
    }
);

/* ==================================================
   OBJETOS
================================================== */

const trees = [];
const rocks = [];
const mushrooms = [];
const wood = [];
const stones = [];
const enemies = [];
const particles = [];

/* ==================================================
   RANDOM
================================================== */

function random(min, max) {

    return Math.random() *
        (max - min) +
        min;
}

function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

/* ==================================================
   ABRIGO
================================================== */

const shelter = {

    x: 1800,
    y: 1350,

    width: 300,
    height: 230
};

const campfire = {

    x: 1800,
    y: 1450
};

/* ==================================================
   GERAR MUNDO
================================================== */

function generateWorld() {

    trees.length = 0;
    rocks.length = 0;
    mushrooms.length = 0;
    wood.length = 0;
    stones.length = 0;
    enemies.length = 0;

    /* árvores */

    for (
        let i = 0;
        i < 220;
        i++
    ) {

        const x =
            random(
                100,
                world.width - 100
            );

        const y =
            random(
                100,
                world.height - 100
            );

        if (
            Math.hypot(
                x - shelter.x,
                y - shelter.y
            ) < 360
        ) continue;

        trees.push({

            x,
            y,

            radius:
                random(25, 40)
        });
    }

    /* pedras */

    for (
        let i = 0;
        i < 90;
        i++
    ) {

        rocks.push({

            x:
                random(
                    100,
                    world.width - 100
                ),

            y:
                random(
                    100,
                    world.height - 100
                ),

            radius:
                random(12, 22)
        });
    }

    /* cogumelos */

    for (
        let i = 0;
        i < 40;
        i++
    ) {

        mushrooms.push({

            x:
                random(
                    150,
                    world.width - 150
                ),

            y:
                random(
                    150,
                    world.height - 150
                ),

            radius: 9,

            type:
                Math.random() < 0.2
                    ? "strange"
                    : "normal",

            collected: false
        });
    }

    /* madeira */

    for (
        let i = 0;
        i < 50;
        i++
    ) {

        wood.push({

            x:
                random(
                    100,
                    world.width - 100
                ),

            y:
                random(
                    100,
                    world.height - 100
                ),

            collected: false
        });
    }

    /* pedra */

    for (
        let i = 0;
        i < 50;
        i++
    ) {

        stones.push({

            x:
                random(
                    100,
                    world.width - 100
                ),

            y:
                random(
                    100,
                    world.height - 100
                ),

            collected: false
        });
    }

    /* goblins */

    for (
        let i = 0;
        i < 9;
        i++
    ) {

        enemies.push({

            x:
                random(
                    500,
                    world.width - 500
                ),

            y:
                random(
                    500,
                    world.height - 500
                ),

            radius: 18,

            hp: 60,
            maxHp: 60,

            speed:
                random(55, 75),

            alive: true,

            attackCooldown: 0,

            hitFlash: 0
        });
    }
}

generateWorld();

/* ==================================================
   COLISÃO
================================================== */

function collidesWithObstacle(
    x,
    y,
    radius
) {

    for (
        const tree of trees
    ) {

        const d =
            Math.hypot(
                x - tree.x,
                y - tree.y
            );

        if (
            d <
            radius +
            tree.radius * 0.65
        ) {
            return true;
        }
    }

    for (
        const rock of rocks
    ) {

        const d =
            Math.hypot(
                x - rock.x,
                y - rock.y
            );

        if (
            d <
            radius +
            rock.radius
        ) {
            return true;
        }
    }

    return false;
}

/* ==================================================
   MOVIMENTO
================================================== */

function movePlayer(
    dx,
    dy
) {

    if (
        dx === 0 &&
        dy === 0
    ) return;

    const length =
        Math.hypot(dx, dy);

    dx /= length;
    dy /= length;

    player.direction =
        Math.atan2(dy, dx);

    let speed =
        player.speed;

    if (
        player.stamina <= 5
    ) {
        speed *= 0.55;
    }

    const newX =
        player.x +
        dx *
        speed *
        deltaTime;

    const newY =
        player.y +
        dy *
        speed *
        deltaTime;

    if (
        !collidesWithObstacle(
            newX,
            player.y,
            player.radius
        )
    ) {

        player.x = newX;
    }

    if (
        !collidesWithObstacle(
            player.x,
            newY,
            player.radius
        )
    ) {

        player.y = newY;
    }

    player.x =
        Math.max(
            player.radius,
            Math.min(
                world.width -
                player.radius,
                player.x
            )
        );

    player.y =
        Math.max(
            player.radius,
            Math.min(
                world.height -
                player.radius,
                player.y
            )
        );
}

/* ==================================================
   ATAQUE
================================================== */

function attack() {

    if (
        player.attackCooldown > 0
    ) return;

    if (
        player.stamina < 12
    ) return;

    player.stamina -= 12;

    player.attackCooldown =
        0.42;

    player.attackTime =
        0.18;

    createAttackParticles();

    const range = 78;

    for (
        const enemy of enemies
    ) {

        if (!enemy.alive)
            continue;

        const d =
            distance(
                player,
                enemy
            );

        if (
            d > range
        ) continue;

        const angle =
            Math.atan2(
                enemy.y -
                player.y,

                enemy.x -
                player.x
            );

        let difference =
            Math.abs(
                angle -
                player.direction
            );

        if (
            difference >
            Math.PI
        ) {

            difference =
                Math.PI * 2 -
                difference;
        }

        if (
            difference <
            Math.PI * 0.72
        ) {

            enemy.hp -= 25;

            enemy.hitFlash =
                0.12;

            createHitParticles(
                enemy.x,
                enemy.y
            );

            if (
                enemy.hp <= 0
            ) {

                enemy.alive =
                    false;

                createDeathParticles(
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

/* ==================================================
   PARTÍCULAS
================================================== */

function createParticle(
    x,
    y,
    color
) {

    particles.push({

        x,
        y,

        vx:
            random(-70, 70),

        vy:
            random(-70, 20),

        life: 0.5,

        maxLife: 0.5,

        size:
            random(2, 5),

        color
    });
}

function createHitParticles(
    x,
    y
) {

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        createParticle(
            x,
            y,
            "#d6c68b"
        );
    }
}

function createDeathParticles(
    x,
    y
) {

    for (
        let i = 0;
        i < 18;
        i++
    ) {

        createParticle(
            x,
            y,
            "#687c55"
        );
    }
}

function createAttackParticles() {

    const x =
        player.x +
        Math.cos(
            player.direction
        ) * 45;

    const y =
        player.y +
        Math.sin(
            player.direction
        ) * 45;

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        createParticle(
            x,
            y,
            "#d9c98d"
        );
    }
}

function updateParticles() {

    for (
        let i =
            particles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            particles[i];

        p.life -= deltaTime;

        p.x +=
            p.vx *
            deltaTime;

        p.y +=
            p.vy *
            deltaTime;

        p.vy +=
            80 *
            deltaTime;

        if (
            p.life <= 0
        ) {

            particles.splice(
                i,
                1
            );
        }
    }
}

function drawParticles() {

    for (
        const p of particles
    ) {

        const sx =
            p.x -
            camera.x +
            W / 2;

        const sy =
            p.y -
            camera.y +
            H / 2;

        ctx.globalAlpha =
            p.life /
            p.maxLife;

        ctx.fillStyle =
            p.color;

        ctx.beginPath();

        ctx.arc(
            sx,
            sy,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

/* ==================================================
   INIMIGOS
================================================== */

function updateEnemies() {

    for (
        const enemy of enemies
    ) {

        if (
            !enemy.alive
        ) continue;

        if (
            enemy.attackCooldown >
            0
        ) {

            enemy.attackCooldown -=
                deltaTime;
        }

        if (
            enemy.hitFlash >
            0
        ) {

            enemy.hitFlash -=
                deltaTime;
        }

        const d =
            distance(
                player,
                enemy
            );

        if (
            d < 340 &&
            d > 46
        ) {

            const dx =
                player.x -
                enemy.x;

            const dy =
                player.y -
                enemy.y;

            const length =
                Math.hypot(
                    dx,
                    dy
                );

            const nx =
                dx / length;

            const ny =
                dy / length;

            const newX =
                enemy.x +
                nx *
                enemy.speed *
                deltaTime;

            const newY =
                enemy.y +
                ny *
                enemy.speed *
                deltaTime;

            if (
                !collidesWithObstacle(
                    newX,
                    newY,
                    enemy.radius
                )
            ) {

                enemy.x =
                    newX;

                enemy.y =
                    newY;
            }
        }

        if (
            d <= 48 &&
            enemy.attackCooldown <= 0
        ) {

            if (
                player.invulnerable <=
                0
            ) {

                player.hp -= 10;

                player.invulnerable =
                    0.6;

                showMessage(
                    "Você foi atacado!"
                );

                if (
                    player.hp <= 0
                ) {

                    respawnPlayer();
                }
            }

            enemy.attackCooldown =
                1.1;
        }
    }
}

/* ==================================================
   MORTE
================================================== */

function respawnPlayer() {

    player.hp =
        player.maxHp;

    player.stamina =
        player.maxStamina;

    player.x =
        shelter.x;

    player.y =
        shelter.y + 100;

    showMessage(
        "Você acordou no abrigo..."
    );
}

/* ==================================================
   COLETA
================================================== */

function collectResources() {

    for (
        const mushroom of mushrooms
    ) {

        if (
            mushroom.collected
        ) continue;

        if (
            distance(
                player,
                mushroom
            ) < 35
        ) {

            mushroom.collected =
                true;

            mushroomsCollected++;

            if (
                mushroom.type ===
                "strange"
            ) {

                questStage =
                    Math.max(
                        questStage,
                        1
                    );

                showMessage(
                    "Você encontrou um cogumelo estranho..."
                );

            } else {

                showMessage(
                    "Cogumelo coletado."
                );
            }
        }
    }

    for (
        const item of wood
    ) {

        if (
            item.collected
        ) continue;

        if (
            distance(
                player,
                item
            ) < 35
        ) {

            item.collected =
                true;

            woodCollected++;

            showMessage(
                "Madeira coletada."
            );
        }
    }

    for (
        const item of stones
    ) {

        if (
            item.collected
        ) continue;

        if (
            distance(
                player,
                item
            ) < 35
        ) {

            item.collected =
                true;

            stoneCollected++;

            showMessage(
                "Pedra coletada."
            );
        }
    }
}

/* ==================================================
   CÂMERA
================================================== */

function updateCamera() {

    camera.x +=
        (
            player.x -
            camera.x
        ) *
        0.08;

    camera.y +=
        (
            player.y -
            camera.y
        ) *
        0.08;
}

/* ==================================================
   TEMPO
================================================== */

function getTimeOfDay() {

    const cycle =
        (worldTime % 180) /
        180;

    return cycle;
}

function getTimeName() {

    const cycle =
        getTimeOfDay();

    if (
        cycle < 0.25
    ) return "MANHÃ";

    if (
        cycle < 0.5
    ) return "DIA";

    if (
        cycle < 0.7
    ) return "ENTARDECER";

    return "NOITE";
}

/* ==================================================
   ABRIGO
================================================== */

function drawShelter() {

    const sx =
        shelter.x -
        camera.x +
        W / 2;

    const sy =
        shelter.y -
        camera.y +
        H / 2;

    ctx.fillStyle =
        "#241e18";

    ctx.fillRect(
        sx -
        shelter.width / 2,
        sy -
        shelter.height / 2,
        shelter.width,
        shelter.height
    );

    /* parede */

    ctx.strokeStyle =
        "#594838";

    ctx.lineWidth = 8;

    ctx.strokeRect(
        sx -
        shelter.width / 2,
        sy -
        shelter.height / 2,
        shelter.width,
        shelter.height
    );

    /* telhado */

    ctx.fillStyle =
        "#35281e";

    ctx.beginPath();

    ctx.moveTo(
        sx -
        shelter.width / 2 -
        20,
        sy -
        shelter.height / 2
    );

    ctx.lineTo(
        sx,
        sy -
        shelter.height / 2 -
        80
    );

    ctx.lineTo(
        sx +
        shelter.width / 2 +
        20,
        sy -
        shelter.height / 2
    );

    ctx.closePath();

    ctx.fill();

    /* porta */

    ctx.fillStyle =
        "#11100d";

    ctx.fillRect(
        sx - 28,
        sy + 10,
        56,
        85
    );

    /* placa */

    ctx.fillStyle =
        "#b6a875";

    ctx.font =
        "bold 11px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "ABRIGO",
        sx,
        sy -
        shelter.height / 2 -
        12
    );
}

function drawCampfire() {

    const sx =
        campfire.x -
        camera.x +
        W / 2;

    const sy =
        campfire.y -
        camera.y +
        H / 2;

    const pulse =
        10 +
        Math.sin(
            worldTime * 8
        ) * 3;

    /* luz */

    const gradient =
        ctx.createRadialGradient(
            sx,
            sy,
            5,
            sx,
            sy,
            130
        );

    gradient.addColorStop(
        0,
        "rgba(255,170,70,0.30)"
    );

    gradient.addColorStop(
        1,
        "rgba(255,100,20,0)"
    );

    ctx.fillStyle =
        gradient;

    ctx.beginPath();

    ctx.arc(
        sx,
        sy,
        130,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* lenha */

    ctx.strokeStyle =
        "#5c3821";

    ctx.lineWidth = 7;

    ctx.beginPath();

    ctx.moveTo(
        sx - 20,
        sy + 12
    );

    ctx.lineTo(
        sx + 20,
        sy - 12
    );

    ctx.moveTo(
        sx - 20,
        sy - 12
    );

    ctx.lineTo(
        sx + 20,
        sy + 12
    );

    ctx.stroke();

    /* fogo */

    ctx.fillStyle =
        "#c85b28";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy - 7,
        pulse,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#e7b34e";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy - 10,
        pulse * 0.55,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

/* ==================================================
   TERRENO
================================================== */

function drawGround() {

    ctx.fillStyle =
        "#111811";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    const tile = 80;

    const startX =
        Math.floor(
            (
                camera.x -
                W / 2
            ) / tile
        ) * tile;

    const startY =
        Math.floor(
            (
                camera.y -
                H / 2
            ) / tile
        ) * tile;

    for (
        let x = startX;
        x <
        camera.x +
        W / 2 +
        tile;
        x += tile
    ) {

        for (
            let y = startY;
            y <
            camera.y +
            H / 2 +
            tile;
            y += tile
        ) {

            const sx =
                x -
                camera.x +
                W / 2;

            const sy =
                y -
                camera.y +
                H / 2;

            const variation =
                Math.sin(
                    x * 0.01
                ) +
                Math.cos(
                    y * 0.013
                );

            ctx.fillStyle =
                variation > 0
                    ? "#172018"
                    : "#141c16";

            ctx.fillRect(
                sx,
                sy,
                tile + 1,
                tile + 1
            );
        }
    }
}

/* ==================================================
   ÁRVORES
================================================== */

function drawTree(tree) {

    const sx =
        tree.x -
        camera.x +
        W / 2;

    const sy =
        tree.y -
        camera.y +
        H / 2;

    if (
        sx < -80 ||
        sy < -100 ||
        sx > W + 80 ||
        sy > H + 100
    ) return;

    /* sombra */

    ctx.fillStyle =
        "rgba(0,0,0,0.35)";

    ctx.beginPath();

    ctx.ellipse(
        sx,
        sy + 25,
        tree.radius * 1.15,
        tree.radius * 0.45,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* tronco */

    ctx.fillStyle =
        "#38291d";

    ctx.fillRect(
        sx - 7,
        sy - 5,
        14,
        38
    );

    /* copa */

    ctx.fillStyle =
        "#213522";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy - 18,
        tree.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#2d462a";

    ctx.beginPath();

    ctx.arc(
        sx - 9,
        sy - 25,
        tree.radius * 0.65,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#1c2d1d";

    ctx.beginPath();

    ctx.arc(
        sx + 10,
        sy - 20,
        tree.radius * 0.55,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

/* ==================================================
   PEDRAS
================================================== */

function drawRock(rock) {

    const sx =
        rock.x -
        camera.x +
        W / 2;

    const sy =
        rock.y -
        camera.y +
        H / 2;

    ctx.fillStyle =
        "#424941";

    ctx.beginPath();

    ctx.ellipse(
        sx,
        sy,
        rock.radius,
        rock.radius * 0.72,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#59605a";

    ctx.beginPath();

    ctx.ellipse(
        sx - 4,
        sy - 4,
        rock.radius * 0.5,
        rock.radius * 0.3,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

/* ==================================================
   RECURSOS
================================================== */

function drawMushroom(
    mushroom
) {

    if (
        mushroom.collected
    ) return;

    const sx =
        mushroom.x -
        camera.x +
        W / 2;

    const sy =
        mushroom.y -
        camera.y +
        H / 2;

    ctx.fillStyle =
        "#d7c6a1";

    ctx.fillRect(
        sx - 3,
        sy,
        6,
        12
    );

    ctx.fillStyle =
        mushroom.type ===
        "strange"
            ? "#7139a8"
            : "#b83b3b";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy,
        11,
        Math.PI,
        0
    );

    ctx.fill();

    ctx.fillStyle =
        "#e7d9b5";

    ctx.beginPath();

    ctx.arc(
        sx - 3,
        sy - 4,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        sx + 4,
        sy - 3,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

function drawWood(item) {

    if (
        item.collected
    ) return;

    const sx =
        item.x -
        camera.x +
        W / 2;

    const sy =
        item.y -
        camera.y +
        H / 2;

    ctx.strokeStyle =
        "#69452a";

    ctx.lineWidth = 7;

    ctx.beginPath();

    ctx.moveTo(
        sx - 12,
        sy + 7
    );

    ctx.lineTo(
        sx + 12,
        sy - 7
    );

    ctx.stroke();
}

function drawStone(item) {

    if (
        item.collected
    ) return;

    const sx =
        item.x -
        camera.x +
        W / 2;

    const sy =
        item.y -
        camera.y +
        H / 2;

    ctx.fillStyle =
        "#6a716c";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

/* ==================================================
   GOBLIN
================================================== */

function drawEnemy(
    enemy
) {

    if (
        !enemy.alive
    ) return;

    const sx =
        enemy.x -
        camera.x +
        W / 2;

    const sy =
        enemy.y -
        camera.y +
        H / 2;

    /* sombra */

    ctx.fillStyle =
        "rgba(0,0,0,0.4)";

    ctx.beginPath();

    ctx.ellipse(
        sx,
        sy + 18,
        21,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* corpo */

    ctx.fillStyle =
        enemy.hitFlash > 0
            ? "#ddd"
            : "#496b45";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy,
        enemy.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* orelhas */

    ctx.fillStyle =
        "#385737";

    ctx.beginPath();

    ctx.moveTo(
        sx - 14,
        sy - 9
    );

    ctx.lineTo(
        sx - 29,
        sy - 18
    );

    ctx.lineTo(
        sx - 18,
        sy + 1
    );

    ctx.fill();

    ctx.beginPath();

    ctx.moveTo(
        sx + 14,
        sy - 9
    );

    ctx.lineTo(
        sx + 29,
        sy - 18
    );

    ctx.lineTo(
        sx + 18,
        sy + 1
    );

    ctx.fill();

    /* olhos */

    ctx.fillStyle =
        "#f0e8c8";

    ctx.beginPath();

    ctx.arc(
        sx - 6,
        sy - 3,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.beginPath();

    ctx.arc(
        sx + 6,
        sy - 3,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* vida */

    ctx.fillStyle =
        "#351515";

    ctx.fillRect(
        sx - 20,
        sy - 31,
        40,
        5
    );

    ctx.fillStyle =
        "#b33b3b";

    ctx.fillRect(
        sx - 20,
        sy - 31,
        40 *
        (
            enemy.hp /
            enemy.maxHp
        ),
        5
    );
}

/* ==================================================
   PLAYER
================================================== */

function drawPlayer() {

    const sx =
        W / 2;

    const sy =
        H / 2;

    /* sombra */

    ctx.fillStyle =
        "rgba(0,0,0,0.4)";

    ctx.beginPath();

    ctx.ellipse(
        sx,
        sy + 18,
        19,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* capa */

    ctx.fillStyle =
        "#28384e";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy + 2,
        player.radius + 2,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* cabeça */

    ctx.fillStyle =
        "#c89470";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy - 14,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* cabelo */

    ctx.fillStyle =
        "#211b18";

    ctx.beginPath();

    ctx.arc(
        sx,
        sy - 18,
        9,
        Math.PI,
        0
    );

    ctx.fill();

    /* olho */

    const eyeX =
        sx +
        Math.cos(
            player.direction
        ) * 7;

    const eyeY =
        sy -
        14 +
        Math.sin(
            player.direction
        ) * 7;

    ctx.fillStyle =
        "#111";

    ctx.beginPath();

    ctx.arc(
        eyeX,
        eyeY,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* espada */

    if (
        player.attackTime > 0
    ) {

        const swordX =
            sx +
            Math.cos(
                player.direction
            ) * 42;

        const swordY =
            sy +
            Math.sin(
                player.direction
            ) * 42;

        ctx.strokeStyle =
            "#ded9c4";

        ctx.lineWidth = 5;

        ctx.beginPath();

        ctx.moveTo(
            sx +
            Math.cos(
                player.direction
            ) * 16,

            sy +
            Math.sin(
                player.direction
            ) * 16
        );

        ctx.lineTo(
            swordX,
            swordY
        );

        ctx.stroke();

        ctx.strokeStyle =
            "#8d6d3e";

        ctx.lineWidth = 7;

        ctx.beginPath();

        ctx.moveTo(
            sx +
            Math.cos(
                player.direction
            ) * 19 -
            Math.sin(
                player.direction
            ) * 7,

            sy +
            Math.sin(
                player.direction
            ) * 19 +
            Math.cos(
                player.direction
            ) * 7
        );

        ctx.lineTo(
            sx +
            Math.cos(
                player.direction
            ) * 19 +
            Math.sin(
                player.direction
            ) * 7,

            sy +
            Math.sin(
                player.direction
            ) * 19 -
            Math.cos(
                player.direction
            ) * 7
        );

        ctx.stroke();
    }
}

/* ==================================================
   NOITE
================================================== */

function drawNightOverlay() {

    const cycle =
        getTimeOfDay();

    let darkness = 0;

    if (
        cycle > 0.55 &&
        cycle < 0.75
    ) {

        darkness =
            (
                cycle -
                0.55
            ) / 0.2 *
            0.45;

    } else if (
        cycle >= 0.75
    ) {

        darkness =
            0.58;

    } else if (
        cycle < 0.15
    ) {

        darkness =
            0.58 *
            (
                1 -
                cycle /
                0.15
            );
    }

    if (
        darkness <= 0
    ) return;

    ctx.fillStyle =
        `rgba(5,8,18,${darkness})`;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    /* luz do jogador */

    const px =
        W / 2;

    const py =
        H / 2;

    const light =
        ctx.createRadialGradient(
            px,
            py,
            30,
            px,
            py,
            250
        );

    light.addColorStop(
        0,
        "rgba(255,230,160,0.14)"
    );

    light.addColorStop(
        1,
        "rgba(255,230,160,0)"
    );

    ctx.fillStyle =
        light;

    ctx.beginPath();

    ctx.arc(
        px,
        py,
        250,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* fogueira */

    const fx =
        campfire.x -
        camera.x +
        W / 2;

    const fy =
        campfire.y -
        camera.y +
        H / 2;

    const fireLight =
        ctx.createRadialGradient(
            fx,
            fy,
            10,
            fx,
            fy,
            180
        );

    fireLight.addColorStop(
        0,
        "rgba(255,160,60,0.28)"
    );

    fireLight.addColorStop(
        1,
        "rgba(255,120,20,0)"
    );

    ctx.fillStyle =
        fireLight;

    ctx.beginPath();

    ctx.arc(
        fx,
        fy,
        180,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

/* ==================================================
   VIGNETTE
================================================== */

function drawVignette() {

    const gradient =
        ctx.createRadialGradient(
            W / 2,
            H / 2,
            100,
            W / 2,
            H / 2,
            Math.max(W, H) * 0.75
        );

    gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0.68)"
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

/* ==================================================
   HUD
================================================== */

function updateHUD() {

    const hpBar =
        document.getElementById(
            "hpBar"
        );

    const staminaBar =
        document.getElementById(
            "staminaBar"
        );

    const dayText =
        document.getElementById(
            "dayText"
        );

    const resourceText =
        document.getElementById(
            "resourceText"
        );

    const questText =
        document.getElementById(
            "questText"
        );

    if (hpBar) {

        hpBar.style.width =
            (
                player.hp /
                player.maxHp *
                100
            ) + "%";
    }

    if (staminaBar) {

        staminaBar.style.width =
            (
                player.stamina /
                player.maxStamina *
                100
            ) + "%";
    }

    if (dayText) {

        dayText.textContent =
            `DIA ${day} • ${getTimeName()}`;
    }

    if (resourceText) {

        resourceText.textContent =
            `🍄 ${mushroomsCollected}   🪵 ${woodCollected}   🪨 ${stoneCollected}`;
    }

    if (questText) {

        if (
            questStage === 0
        ) {

            questText.textContent =
                "Explore a floresta e encontre um cogumelo estranho.";

        } else {

            questText.textContent =
                "O cogumelo estranho está reagindo. Volte ao abrigo.";
        }
    }
}

/* ==================================================
   MENSAGEM
================================================== */

function showMessage(
    text
) {

    const interaction =
        document.getElementById(
            "interaction"
        );

    if (!interaction)
        return;

    interaction.textContent =
        text;

    interaction.style.opacity =
        "1";

    messageTimer = 3;
}

/* ==================================================
   JOYSTICK
================================================== */

let joystickActive =
    false;

let joystickX = 0;
let joystickY = 0;

const joystick =
    document.getElementById(
        "joystick"
    );

const joystickKnob =
    document.getElementById(
        "joystickKnob"
    );

if (joystick) {

    const start =
        e => {

            joystickActive =
                true;

            updateJoystick(e);
        };

    const move =
        e => {

            if (
                !joystickActive
            ) return;

            updateJoystick(e);
        };

    const end =
        () => {

            joystickActive =
                false;

            joystickX = 0;
            joystickY = 0;

            if (
                joystickKnob
            ) {

                joystickKnob.style.transform =
                    "translate(-50%, -50%)";
            }
        };

    joystick.addEventListener(
        "touchstart",
        start
    );

    joystick.addEventListener(
        "touchmove",
        move
    );

    joystick.addEventListener(
        "touchend",
        end
    );

    joystick.addEventListener(
        "mousedown",
        start
    );

    window.addEventListener(
        "mousemove",
        e => {

            if (
                joystickActive
            ) {
                updateJoystick(e);
            }
        }
    );

    window.addEventListener(
        "mouseup",
        end
    );
}

function updateJoystick(
    e
) {

    const rect =
        joystick.getBoundingClientRect();

    const clientX =
        e.touches
            ? e.touches[0].clientX
            : e.clientX;

    const clientY =
        e.touches
            ? e.touches[0].clientY
            : e.clientY;

    let x =
        clientX -
        (
            rect.left +
            rect.width / 2
        );

    let y =
        clientY -
        (
            rect.top +
            rect.height / 2
        );

    const max =
        rect.width / 2 -
        25;

    const length =
        Math.hypot(x, y);

    if (
        length > max
    ) {

        x =
            x /
            length *
            max;

        y =
            y /
            length *
            max;
    }

    joystickX =
        x / max;

    joystickY =
        y / max;

    if (
        joystickKnob
    ) {

        joystickKnob.style.transform =
            `translate(
                calc(-50% + ${x}px),
                calc(-50% + ${y}px)
            )`;
    }
}

/* ==================================================
   BOTÃO ATAQUE
================================================== */

const attackButton =
    document.getElementById(
        "attackButton"
    );

if (attackButton) {

    attackButton.addEventListener(
        "touchstart",
        e => {

            e.preventDefault();

            attack();
        }
    );

    attackButton.addEventListener(
        "mousedown",
        e => {

            e.preventDefault();

            attack();
        }
    );
}

/* ==================================================
   INTERAÇÃO
================================================== */

const interactButton =
    document.getElementById(
        "interactButton"
    );

if (interactButton) {

    interactButton.addEventListener(
        "click",
        () => {

            collectResources();
        }
    );

    interactButton.addEventListener(
        "touchstart",
        e => {

            e.preventDefault();

            collectResources();
        }
    );
}

/* ==================================================
   UPDATE
================================================== */

function update() {

    const now =
        performance.now();

    deltaTime =
        Math.min(
            (
                now -
                lastTime
            ) / 1000,
            0.05
        );

    lastTime =
        now;

    /* movimento */

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

    if (
        joystickActive
    ) {

        dx =
            joystickX;

        dy =
            joystickY;
    }

    movePlayer(
        dx,
        dy
    );

    /* stamina */

    if (
        dx === 0 &&
        dy === 0
    ) {

        player.stamina +=
            25 *
            deltaTime;

    } else {

        player.stamina -=
            5 *
            deltaTime;
    }

    player.stamina =
        Math.max(
            0,
            Math.min(
                player.maxStamina,
                player.stamina
            )
        );

    /* ataque */

    if (
        player.attackCooldown >
        0
    ) {

        player.attackCooldown -=
            deltaTime;
    }

    if (
        player.attackTime >
        0
    ) {

        player.attackTime -=
            deltaTime;
    }

    if (
        player.invulnerable >
        0
    ) {

        player.invulnerable -=
            deltaTime;
    }

    /* tempo */

    worldTime +=
        deltaTime;

    if (
        worldTime >= 180
    ) {

        worldTime = 0;

        day++;

        showMessage(
            `O DIA ${day} COMEÇOU.`
        );
    }

    updateEnemies();

    collectResources();

    updateParticles();

    updateCamera();

    /* mensagem */

    if (
        messageTimer > 0
    ) {

        messageTimer -=
            deltaTime;

        if (
            messageTimer <= 0
        ) {

            const interaction =
                document.getElementById(
                    "interaction"
                );

            if (
                interaction
            ) {

                interaction.style.opacity =
                    "0";
            }
        }
    }

    updateHUD();
}

/* ==================================================
   RENDER
================================================== */

function render() {

    drawGround();

    drawShelter();

    drawCampfire();

    for (
        const rock of rocks
    ) {

        drawRock(
            rock
        );
    }

    for (
        const item of wood
    ) {

        drawWood(
            item
        );
    }

    for (
        const item of stones
    ) {

        drawStone(
            item
        );
    }

    for (
        const mushroom of mushrooms
    ) {

        drawMushroom(
            mushroom
        );
    }

    for (
        const tree of trees
    ) {

        drawTree(
            tree
        );
    }

    for (
        const enemy of enemies
    ) {

        drawEnemy(
            enemy
        );
    }

    drawParticles();

    drawPlayer();

    drawNightOverlay();

    drawVignette();
}

/* ==================================================
   LOOP
================================================== */

function loop() {

    update();

    render();

    requestAnimationFrame(
        loop
    );
}

/* ==================================================
   START
================================================== */

const loading =
    document.getElementById(
        "loading"
    );

setTimeout(
    () => {

        if (loading) {

            loading.style.display =
                "none";
        }

        showMessage(
            "Encontre o cogumelo estranho..."
        );

        loop();

    },
    600
);
