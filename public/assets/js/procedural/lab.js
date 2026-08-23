import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createArtDirection } from '../systems/art-direction.js';
import { createProceduralBuilding } from './building.js';
import { createProceduralTree } from './tree.js';
import {
  createBarrel,
  createFence,
  createGrassPatch,
  createRock,
  createWell,
  updateGrass
} from './props.js';
import { createMountainRange } from './terrain.js';
import { createRiver, createRiverBank, createSea, updateWater } from './water.js';

// 手続き生成の見本を、既存の購入モデルと並べて見比べるためのページ。
// 本編(editions.html)と同じライティング・同じアートディレクション層を通すので、
// ここで成立すれば本編にそのまま持ち込める。

const PAPER = 0xf2e6cf;
const ISLAND_RADIUS = 36;
const HOUSE_MODEL = new URL('../../models/Fantasy_House_6.glb', import.meta.url).href;
const TREE_MODEL = new URL('../../models/tree_LOD0.glb', import.meta.url).href;

const canvas = document.getElementById('lab-canvas');
const labelLayer = document.getElementById('labels');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAPER, 110, 300);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 700);
camera.position.set(6, 22, 52);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const artDirection = createArtDirection({ renderer, scene });

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(2, 2, 4);
controls.maxPolarAngle = Math.PI * 0.49;

initLighting();
initGround();

const labels = [];
const grassPatches = [];
const waterMeshes = [];

buildBuildingRow();
buildTreeRow();
buildPropRow();
buildTerrainAndWater();

artDirection.applyToScene();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, { passive: true });

const clock = new THREE.Clock();

requestAnimationFrame(function frame() {
  requestAnimationFrame(frame);
  const elapsed = clock.getElapsedTime();
  grassPatches.forEach((patch) => updateGrass(patch, elapsed));
  waterMeshes.forEach((mesh) => updateWater(mesh, elapsed));
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
});

function initLighting() {
  scene.add(new THREE.AmbientLight(0xfff0d8, 0.34));

  const sun = new THREE.DirectionalLight(0xffe0b0, 2.9);
  sun.position.set(-24, 26, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32;
  sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0006;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);
}

function initGround() {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(ISLAND_RADIUS, 84),
    new THREE.MeshStandardMaterial({ color: 0x5d7f45, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 草地が海へ直に落ちると硬いので、縁に砂の帯を挟む
  const shore = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS - 2.4, ISLAND_RADIUS + 1.2, 84),
    new THREE.MeshStandardMaterial({ color: 0xcbb894, roughness: 1, metalness: 0 })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = 0.008;
  shore.receiveShadow = true;
  scene.add(shore);
}

// ---- 建物 ----
function buildBuildingRow() {
  const z = -5;

  loadModel(HOUSE_MODEL).then((model) => {
    model.position.set(-11, 0, z);
    model.scale.setScalar(1.02);
    scene.add(model);
    artDirection.applyToScene(model);
  });
  addLabel('既存モデル (GLB 4.5MB)', new THREE.Vector3(-11, 5.4, z), 'is-existing');

  const twoFloor = createProceduralBuilding({ seed: 7, width: 3.2, depth: 2.8, floors: 2 });
  twoFloor.position.set(-3.6, 0, z);
  scene.add(twoFloor);
  addLabel('手続き生成 2階建て', new THREE.Vector3(-3.6, 6.2, z));

  const threeFloor = createProceduralBuilding({
    seed: 23,
    width: 2.9,
    depth: 2.6,
    floors: 3,
    roofPitch: 0.72
  });
  threeFloor.position.set(3.4, 0, z);
  threeFloor.rotation.y = -0.3;
  scene.add(threeFloor);
  addLabel('手続き生成 3階建て', new THREE.Vector3(3.4, 8.4, z));

  const wide = createProceduralBuilding({
    seed: 91,
    width: 4.6,
    depth: 3.2,
    floors: 2,
    roofPitch: 0.5,
    jetty: 0.1
  });
  wide.position.set(11, 0, z);
  wide.rotation.y = 0.42;
  scene.add(wide);
  addLabel('手続き生成 横長', new THREE.Vector3(11, 6.4, z));
}

// ---- 木 ----
function buildTreeRow() {
  const z = 5;

  loadModel(TREE_MODEL).then((model) => {
    model.position.set(-11, 0, z);
    model.scale.setScalar(0.4);
    scene.add(model);
    artDirection.applyToScene(model);
  });
  addLabel('既存モデル (GLB 3.0MB)', new THREE.Vector3(-11, 8.6, z), 'is-existing');

  [
    { species: 'oak', x: -4, seed: 3 },
    { species: 'oak', x: -0.6, seed: 88, scale: 0.8 },
    { species: 'birch', x: 3, seed: 12 },
    { species: 'pine', x: 6.6, seed: 41 }
  ].forEach(({ species, x, seed, scale = 1 }) => {
    const tree = createProceduralTree({ seed, species, scale });
    tree.position.set(x, 0, z);
    scene.add(tree);
  });

  addLabel('手続き生成 oak / birch / pine', new THREE.Vector3(1.3, 6.4, z));
}

// ---- 小物 ----
function buildPropRow() {
  const z = 13;

  const well = createWell({ seed: 5 });
  well.position.set(-9, 0, z);
  scene.add(well);
  addLabel('井戸', new THREE.Vector3(-9, 2.7, z));

  [0, 1, 2].forEach((index) => {
    const barrel = createBarrel({ seed: 11 + index });
    barrel.position.set(-4.6 + index * 0.62, 0, z + (index % 2) * 0.5);
    scene.add(barrel);
  });
  addLabel('樽', new THREE.Vector3(-4, 1.3, z));

  const fence = createFence({ seed: 2, length: 5 });
  fence.position.set(1.6, 0, z);
  scene.add(fence);
  addLabel('柵', new THREE.Vector3(1.6, 1.6, z));

  [
    { x: 7.4, radius: 0.85, seed: 31 },
    { x: 8.6, radius: 0.5, seed: 32 },
    { x: 6.6, radius: 0.34, seed: 33 }
  ].forEach(({ x, radius, seed }) => {
    const rock = createRock({ seed, radius });
    rock.position.set(x, 0, z + (seed % 3) * 0.4);
    scene.add(rock);
  });
  addLabel('岩', new THREE.Vector3(7.6, 1.6, z));

  const grass = createGrassPatch({ seed: 9, count: 320, radius: 2.6 });
  grass.position.set(13, 0.01, z);
  scene.add(grass);
  grassPatches.push(grass);
  addLabel('草むら (風で揺れる)', new THREE.Vector3(13, 1.2, z));
}

// ---- 山・川・海 ----
function buildTerrainAndWater() {
  // 海。島より少し低い位置に敷いて、島が水面から出ているようにする。
  const sea = createSea({ size: 340, segments: 96, waveHeight: 0.5 });
  sea.position.y = -0.55;
  scene.add(sea);
  waterMeshes.push(sea);
  addLabel('海（うねりと泡はシェーダ）', new THREE.Vector3(26, 1.6, 34));

  // 山脈。裾野を海面より下に沈めると、なだらかな台座が水に隠れて稜線だけが立つ。
  const mountains = createMountainRange({
    seed: 12,
    width: 150,
    depth: 54,
    maxHeight: 26,
    peakCount: 8
  });
  mountains.position.set(0, -1.4, -52);
  scene.add(mountains);
  addLabel('山（高さマップ＋雪冠）', new THREE.Vector3(-18, 27, -52));

  // 川。山から島を抜けて海へ注ぐ。
  const riverPoints = [
    [-25, 0.03, -34],
    [-23, 0.03, -22],
    [-26, 0.03, -10],
    [-22, 0.03, 2],
    [-25, 0.03, 14],
    [-21, 0.03, 26],
    [-23, 0.03, 42]
  ];
  const river = createRiver({ points: riverPoints, width: 3.6, waveHeight: 0.12 });
  scene.add(river);
  waterMeshes.push(river);
  scene.add(createRiverBank(river.userData.curve, { width: 3.6, count: 110, seed: 4 }));
  addLabel('川（流れと岸の泡）', new THREE.Vector3(-23, 2.2, 6));
}

// ---- 読み込みと表示ラベル ----
function loadModel(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      // 足元を原点に合わせる
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      const wrapper = new THREE.Group();
      model.position.sub(center);
      model.position.y += size.y / 2;
      wrapper.add(model);
      resolve(wrapper);
    }, undefined, reject);
  });
}

function addLabel(text, position, modifier = '') {
  const element = document.createElement('div');
  element.className = `lab-label ${modifier}`.trim();
  element.textContent = text;
  labelLayer.append(element);
  labels.push({ element, position });
}

const projected = new THREE.Vector3();

function updateLabels() {
  labels.forEach(({ element, position }) => {
    projected.copy(position).project(camera);
    const visible = projected.z < 1;
    element.style.opacity = visible ? '1' : '0';
    if (!visible) return;
    element.style.transform = `translate(-50%, -100%) translate(${
      (projected.x * 0.5 + 0.5) * window.innerWidth
    }px, ${(-projected.y * 0.5 + 0.5) * window.innerHeight}px)`;
  });
}
