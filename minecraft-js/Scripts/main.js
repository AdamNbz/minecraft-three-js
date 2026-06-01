import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { World } from "./world";
import { Player } from "./player";
import { Physics } from "./physics";
import { setupUI } from "./ui";
import { ModelLoader } from "./modelLoader";
import { Mob } from "./mob";

// UI Setup
const stats = new Stats();
document.body.appendChild(stats.dom);

// Renderer setup
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x80a0e0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x80a0e0, 50, 75);

const world = new World();
world.generate();
scene.add(world);

const player = new Player(scene, world);
const physics = new Physics(scene);

// Camera setup
const orbitCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
);
orbitCamera.position.set(24, 24, 24);
orbitCamera.layers.enable(1);

const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.update();

const modelLoader = new ModelLoader((models) => {
    player.setTool(models.pickaxe);
});

const mobs = [];
const mobModelConfigs = [
    { path: "models/minecraft-creeper/source/model.gltf", scale: 0.1 },
    //{ path: "models/anim-creeper/source/model.gltf", scale: 0.02 },
    {
        path: "models/big-spider/model.gltf",
        scale: 0.3,
    },
    { path: "models/hippo/model.gltf", scale: 0.5 },
    { path: "models/minecraft-wolf/scene.gltf", scale: 0.1 },
];

function spawnMobs(count) {
    for (let i = 0; i < count; i++) {
        const x = 36 + (Math.random() - 0.5) * 20;
        const z = 36 + (Math.random() - 0.5) * 20;
        const pos = new THREE.Vector3(x, 20, z);
        const config =
            mobModelConfigs[Math.floor(Math.random() * mobModelConfigs.length)];
        const m = new Mob(scene, world, {
            modelPath: config.path,
            position: config.position !== undefined ? config.position : pos,
            scale: config.scale !== undefined ? config.scale : 0.5,
            walkSpeed:
                config.walkSpeed !== undefined
                    ? config.walkSpeed
                    : 1.0 + Math.random() * 0.6,
            roamRadius:
                config.roamRadius !== undefined
                    ? config.roamRadius
                    : 8 + Math.random() * 8,
            idleChance:
                config.idleChance !== undefined ? config.idleChance : 0.4,
        });
        mobs.push(m);
    }
}

spawnMobs(10);

let sun;
function setupLights() {
    sun = new THREE.DirectionalLight();
    sun.intensity = 1.5;
    sun.position.set(50, 50, 50);
    sun.castShadow = true;

    // Set the size of the sun's shadow box
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.0001;
    sun.shadow.mapSize = new THREE.Vector2(2048, 2048);
    scene.add(sun);
    scene.add(sun.target);

    const ambient = new THREE.AmbientLight();
    ambient.intensity = 0.2;
    scene.add(ambient);
}

// Render loop
let previousTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const dt = (currentTime - previousTime) / 1000;

    // Only update physics when player controls are locked
    if (player.controls.isLocked) {
        physics.update(dt, player, world);
        player.update(dt, world);
        world.update(player);

        // Position the sun relative to the player. Need to adjust both the
        // position and target of the sun to keep the same sun angle
        sun.position.copy(player.camera.position);
        sun.position.sub(new THREE.Vector3(-50, -50, -50));
        sun.target.position.copy(player.camera.position);

        // Update positon of the orbit camera to track player
        orbitCamera.position
            .copy(player.position)
            .add(new THREE.Vector3(16, 16, 16));
        controls.target.copy(player.position);
    }

    for (const mob of mobs) {
        mob.update(dt, world);
    }

    renderer.render(
        scene,
        player.controls.isLocked ? player.getActiveCamera() : orbitCamera,
    );
    stats.update();

    previousTime = currentTime;
}

window.addEventListener("resize", () => {
    // Resize camera aspect ratio and renderer size to the new window size
    const aspect = window.innerWidth / window.innerHeight;
    orbitCamera.aspect = aspect;
    orbitCamera.updateProjectionMatrix();
    player.camera.aspect = aspect;
    player.camera.updateProjectionMatrix();
    player.thirdPersonCamera.aspect = aspect;
    player.thirdPersonCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

setupUI(world, player, physics, scene);
setupLights();
animate();
