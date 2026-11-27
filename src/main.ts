import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { createPhysics } from './physics';

const app = document.querySelector<HTMLDivElement>('#app')!;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
app.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0f17');
scene.fog = new THREE.Fog('#0b0f17', 16, 34);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(7, 6, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.minDistance = 4;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2 - 0.02;

// Lights
const skyLight = new THREE.HemisphereLight('#c7d2fe', '#1e1b2e', 1.1);
scene.add(skyLight);

const sunLight = new THREE.DirectionalLight('#ffffff', 2.6);
sunLight.position.set(6, 10, 4);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -8;
sunLight.shadow.camera.right = 8;
sunLight.shadow.camera.top = 8;
sunLight.shadow.camera.bottom = -8;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 30;
sunLight.shadow.camera.updateProjectionMatrix();
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// Ground
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(16, 64),
  new THREE.MeshStandardMaterial({ color: '#151b26', roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(20, 20, '#334155', '#1f2937');
grid.position.y = 0.002;
scene.add(grid);

// Cube
const cubeSize = 1;
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
  new THREE.MeshStandardMaterial({ color: '#6366f1', roughness: 0.35, metalness: 0.15, flatShading:true, wireframe:false }),
);
cube.position.set(0, cubeSize / 2, 0);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

// Sphere
const sphereRadius = 0.1;
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(sphereRadius, 48, 32),
  new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.25, metalness: 0.35 }),
);
sphere.position.set(0, 10, 0);
sphere.castShadow = true;
scene.add(sphere);

// Physics
const physics = await createPhysics({ cube, cubeSize, sphere, sphereRadius, scene });

// Spawn a ball on Space
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return;
  event.preventDefault();
  physics.spawnBall();
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Frame loop
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  physics.update(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
});
