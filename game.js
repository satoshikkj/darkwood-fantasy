```javascript
"use strict";

/*
    DARKWOOD FANTASY
    V1.0

    Base:
    - Top-down world
    - Player
    - Camera
    - Collision
    - Mobile joystick
    - Keyboard controls
    - Forest
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthBar = document.getElementById("health-bar");
const staminaBar = document.getElementById("stamina-bar");
const loadingScreen = document.getElementById("loading");


// ============================================================
// CANVAS
// ============================================================

let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;

    canvas.width = screenWidth * dpr;
    canvas.height = screenHeight * dpr;

    canvas.style.width = screenWidth + "px";
    canvas.style.height = screenHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();


// ============================================================
// WORLD
// ============================================================

const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 2400;

const world = {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT
};


// ============================================================
// PLAYER
// ============================================================

const player = {

    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,

    radius: 16,

    speed: 180,

    health: 100,
    maxHealth: 100,

    stamina: 100,
    maxStamina: 100,

    directionX: 0,
    directionY: 1,

    moving: false
};


// ============================================================
// CAMERA
// ============================================================

const camera = {

    x: 0,
    y: 0,

    smoothing: 0.12
};


function updateCamera() {

    const targetX =
        player.x - screenWidth / 2;

    const targetY =
        player.y - screenHeight / 2;

    camera.x +=
        (targetX - camera.x) *
        camera.smoothing;

    camera.y +=
        (targetY - camera.y) *
        camera.smoothing;


    camera.x = Math.max(
        0,
        Math.min(
            camera.x,
            world.width - screenWidth
        )
    );

    camera.y = Math.max(
        0,
        Math.min(
            camera.y,
            world.height - screenHeight
        )
    );
}


// ============================================================
// INPUT
// ============================================================

const keys = {};

window.addEventListener("keydown", event => {

    keys[event.key.toLowerCase()] = true;

});

window.addEventListener("keyup", event => {

    keys[event.key.toLowerCase()] = false;

});


const joystick = {

    active: false,

    x: 0,
    y: 0,

    startX: 0,
    startY: 0,

    maxDistance: 38
};


const joystickBase =
    document.getElementById("joystick-base");

const joystickStick =
    document.getElementById("joystick-stick");


function updateJoystick(event) {

    const rect =
        joystickBase.getBoundingClientRect();

    const centerX =
        rect.left + rect.width / 2;

    const centerY =
        rect.top + rect.height / 2;

    let dx =
        event.clientX - centerX;

    let dy =
        event.clientY - centerY;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    if (distance > joystick.maxDistance) {

        dx =
            dx / distance *
            joystick.maxDistance;

        dy =
            dy / distance *
            joystick.maxDistance;
    }

    joystick.x =
        dx / joystick.maxDistance;

    joystick.y =
        dy / joystick.maxDistance;


    joystickStick.style.transform =
        `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}


joystickBase.addEventListener(
    "pointerdown",
    event => {

        joystick.active = true;

        joystickBase.setPointerCapture(
            event.pointerId
        );

        updateJoystick(event);
    }
);


joystickBase.addEventListener(
    "pointermove",
    event => {

        if (!joystick.active) return;

        updateJoystick(event);
    }
);


function resetJoystick() {

    joystick.active = false;

    joystick.x = 0;
    joystick.y = 0;

    joystickStick.style.transform =
        "translate(-50%, -50%)";
}


joystickBase.addEventListener(
    "pointerup",
    resetJoystick
);

joystickBase.addEventListener(
    "pointercancel",
    resetJoystick
);


// ============================================================
// OBSTACLES
// ============================================================

const obstacles = [];


// Deterministic random generator
let seed = 12345;

function random() {

    seed =
        (seed * 16807) %
        2147483647;

    return (
        seed - 1
    ) / 2147483646;
}


function createForest() {

    obstacles.length = 0;

    // Trees

    for (let i = 0; i < 110; i++) {

        const x =
            80 + random() * (WORLD_WIDTH - 160);

        const y =
            80 + random() * (WORLD_HEIGHT - 160);

        const distance =
            Math.hypot(
                x - player.x,
                y - player.y
            );

        // Keep starting area clear

        if (distance < 280) {
            i--;
            continue;
        }

        obstacles.push({

            type: "tree",

            x,
            y,

            radius:
                25 + random() * 12
        });
    }


    // Rocks

    for (let i = 0; i < 45; i++) {

        const x =
            60 + random() * (WORLD_WIDTH - 120);

        const y =
            60 + random() * (WORLD_HEIGHT - 120);

        obstacles.push({

            type: "rock",

            x,
            y,

            radius:
                14 + random() * 10
        });
    }
}

createForest();


// ============================================================
// COLLISION
// ============================================================

function circleCollision(
    x1,
    y1,
    r1,
    x2,
    y2,
    r2
) {

    return Math.hypot(
        x1 - x2,
        y1 - y2
    ) < r1 + r2;
}


function isBlocked(
    x,
    y
) {

    // World boundaries

    if (
        x - player.radius < 0 ||
        x + player.radius > world.width ||
        y - player.radius < 0 ||
        y + player.radius > world.height
    ) {

        return true;
    }


    for (const obstacle of obstacles) {

        if (
            circleCollision(
                x,
                y,
                player.radius,
                obstacle.x,
                obstacle.y,
                obstacle.radius
            )
        ) {

            return true;
        }
    }

    return false;
}


// ============================================================
// PLAYER MOVEMENT
// ============================================================

function getMovementInput() {

    let x = 0;
    let y = 0;


    // Keyboard

    if (keys["w"] || keys["arrowup"]) {
        y -= 1;
    }

    if (keys["s"] || keys["arrowdown"]) {
        y += 1;
    }

    if (keys["a"] || keys["arrowleft"]) {
        x -= 1;
    }

    if (keys["d"] || keys["arrowright"]) {
        x += 1;
    }


    // Mobile joystick

    if (
        Math.abs(joystick.x) > 0.05 ||
        Math.abs(joystick.y) > 0.05
    ) {

        x = joystick.x;
        y = joystick.y;
    }


    const length =
        Math.hypot(x, y);

    if (length > 1) {

        x /= length;
        y /= length;
    }


    return {
        x,
        y
    };
}


function updatePlayer(delta) {

    const movement =
        getMovementInput();

    player.moving =
        Math.abs(movement.x) > 0.01 ||
        Math.abs(movement.y) > 0.01;


    if (!player.moving) {

        player.stamina +=
            25 * delta;

        player.stamina =
            Math.min(
                player.maxStamina,
                player.stamina
            );

        return;
    }


    player.directionX =
        movement.x;

    player.directionY =
        movement.y;


    const moveX =
        movement.x *
        player.speed *
        delta;

    const moveY =
        movement.y *
        player.speed *
        delta;


    // X collision

    const newX =
        player.x + moveX;

    if (!isBlocked(newX, player.y)) {

        player.x = newX;
    }


    // Y collision

    const newY =
        player.y + moveY;

    if (!isBlocked(player.x, newY)) {

        player.y = newY;
    }


    player.stamina -=
        8 * delta;

    player.stamina =
        Math.max(
            0,
            player.stamina
        );
}


// ============================================================
// DRAW WORLD
// ============================================================

function drawWorld() {

    ctx.fillStyle = "#182119";

    ctx.fillRect(
        0,
        0,
        screenWidth,
        screenHeight
    );


    // Ground

    const tileSize = 64;

    const startX =
        Math.floor(camera.x / tileSize) *
        tileSize;

    const startY =
        Math.floor(camera.y / tileSize) *
        tileSize;


    for (
        let y = startY;
        y < camera.y + screenHeight + tileSize;
        y += tileSize
    ) {

        for (
            let x = startX;
            x < camera.x + screenWidth + tileSize;
            x += tileSize
        ) {

            const screenX =
                x - camera.x;

            const screenY =
                y - camera.y;


            ctx.fillStyle =
                ((x / tileSize + y / tileSize) % 2 === 0)
                    ? "#1b271c"
                    : "#19251a";

            ctx.fillRect(
                screenX,
                screenY,
                tileSize + 1,
                tileSize + 1
            );
        }
    }


    drawPath();

    drawObstacles();
}


function drawPath() {

    ctx.save();

    ctx.strokeStyle = "#293429";
    ctx.lineWidth = 95;
    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(
        0 - camera.x,
        world.height / 2 - camera.y
    );

    ctx.bezierCurveTo(

        600 - camera.x,
        world.height / 2 - 80 - camera.y,

        1100 - camera.x,
        world.height / 2 + 100 - camera.y,

        1600 - camera.x,
        world.height / 2 - camera.y
    );

    ctx.stroke();

    ctx.restore();
}


function drawObstacles() {

    for (const obstacle of obstacles) {

        const x =
            obstacle.x - camera.x;

        const y =
            obstacle.y - camera.y;


        if (
            x < -100 ||
            x > screenWidth + 100 ||
            y < -100 ||
            y > screenHeight + 100
        ) {
            continue;
        }


        if (obstacle.type === "tree") {

            // Shadow

            ctx.fillStyle =
                "rgba(0,0,0,0.25)";

            ctx.beginPath();

            ctx.ellipse(
                x,
                y + 24,
                30,
                12,
                0,
                0,
                Math.PI * 2
            );

            ctx.fill();


            // Trunk

            ctx.fillStyle =
                "#49382a";

            ctx.fillRect(
                x - 7,
                y - 5,
                14,
                32
            );


            // Crown

            ctx.fillStyle =
                "#102016";

            ctx.beginPath();

            ctx.arc(
                x,
                y - 15,
                obstacle.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.fillStyle =
                "#172b1a";

            ctx.beginPath();

            ctx.arc(
                x - 13,
                y - 5,
                obstacle.radius * 0.65,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.beginPath();

            ctx.arc(
                x + 14,
                y - 4,
                obstacle.radius * 0.65,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        if (obstacle.type === "rock") {

            ctx.fillStyle =
                "#4b514b";

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                obstacle.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();


            ctx.fillStyle =
                "#626961";

            ctx.beginPath();

            ctx.arc(
                x - 4,
                y - 5,
                obstacle.radius * 0.45,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }
}


// ============================================================
// PLAYER RENDER
// ============================================================

function drawPlayer() {

    const x =
        player.x - camera.x;

    const y =
        player.y - camera.y;


    // Shadow

    ctx.fillStyle =
        "rgba(0,0,0,0.35)";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y + 14,
        18,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Body

    ctx.fillStyle =
        "#59665c";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Head

    ctx.fillStyle =
        "#b98c6a";

    ctx.beginPath();

    ctx.arc(
        x,
        y - 13,
        9,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Hair

    ctx.fillStyle =
        "#171716";

    ctx.beginPath();

    ctx.arc(
        x,
        y - 16,
        9,
        Math.PI,
        Math.PI * 2
    );

    ctx.fill();


    // Direction indicator

    ctx.strokeStyle =
        "#d5d8d0";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
        x,
        y
    );

    ctx.lineTo(
        x + player.directionX * 17,
        y + player.directionY * 17
    );

    ctx.stroke();
}


// ============================================================
// VIGNETTE
// ============================================================

function drawVignette() {

    const gradient =
        ctx.createRadialGradient(

            screenWidth / 2,
            screenHeight / 2,
            screenWidth * 0.25,

            screenWidth / 2,
            screenHeight / 2,
            screenWidth * 0.75
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

    ctx.fillRect(
        0,
        0,
        screenWidth,
        screenHeight
    );
}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    healthBar.style.width =
        `${player.health / player.maxHealth * 100}%`;

    staminaBar.style.width =
        `${player.stamina / player.maxStamina * 100}%`;
}


// ============================================================
// GAME LOOP
// ============================================================

let lastTime = performance.now();

function gameLoop(currentTime) {

    const delta =
        Math.min(
            (currentTime - lastTime) / 1000,
            0.05
        );

    lastTime = currentTime;


    updatePlayer(delta);

    updateCamera();

    updateHUD();


    // Render

    ctx.clearRect(
        0,
        0,
        screenWidth,
        screenHeight
    );

    drawWorld();

    drawPlayer();

    drawVignette();


    requestAnimationFrame(gameLoop);
}


// ============================================================
// START
// ============================================================

setTimeout(() => {

    loadingScreen.classList.add("hidden");

}, 700);


requestAnimationFrame(gameLoop);
```

