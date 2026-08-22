import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isInExclusion } from './trees.js';

const MOUNTAIN_RING_MIN_RADIUS = 56;
const MOUNTAIN_RING_MAX_RADIUS = 88;
const FOOTHILL_MIN_RADIUS = 40;
const FOOTHILL_MAX_RADIUS = 56;
const SNOW_HEIGHT_THRESHOLD = 24;

const GRASS_COLOR = new THREE.Color(0x4d8d55);
const ROCK_COLOR = new THREE.Color(0x77698a);
const SNOW_COLOR = new THREE.Color(0xf0f3fb);
const HILL_COLORS = [0x47854f, 0x52935a, 0x3f7c48];
const BUSH_COLORS = [0x356b3e, 0x3f7a47, 0x2e6038];
const FLOWER_COLORS = [0xff8fb5, 0xfff0a8, 0xc9a8ff, 0xfafafa, 0xffb08a];

export function initEnvironment({
  parentGroup,
  exclusions = []
}) {
  if (!parentGroup) return;

  parentGroup.add(createMountains());
  parentGroup.add(createHills());

  const bushes = createBushes(exclusions);
  if (bushes) parentGroup.add(bushes);

  const flowers = createFlowers(exclusions);
  if (flowers) parentGroup.add(flowers);
}

function createMountains() {
  const random = createSeededRandom(20260601);
  const geometries = [];
  const peakCount = 15;

  for (let index = 0; index < peakCount; index += 1) {
    const angle = (index / peakCount) * Math.PI * 2 + random() * 0.32;
    // 南(デフォルトカメラ)と東(川と橋)のセクターは裾野が届かないよう外側に寄せる
    const pushedOut = Math.sin(angle) > 0.35 || Math.cos(angle) > 0.7;
    const radius = pushedOut
      ? THREE.MathUtils.lerp(78, 94, random())
      : THREE.MathUtils.lerp(MOUNTAIN_RING_MIN_RADIUS, MOUNTAIN_RING_MAX_RADIUS, random());
    const height = 15 + random() * 21;
    const baseRadius = height * (0.7 + random() * 0.3);

    geometries.push(createPeakGeometry({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height,
      baseRadius,
      random
    }));
  }

  const foothillCount = 8;
  for (let index = 0; index < foothillCount; index += 1) {
    // 裾野の小山は西〜北の扇形にだけ置き、川・橋・カメラ動線を塞がない
    const angle = THREE.MathUtils.lerp(Math.PI * 0.85, Math.PI * 1.65, index / (foothillCount - 1)) + random() * 0.16;
    const radius = THREE.MathUtils.lerp(FOOTHILL_MIN_RADIUS, FOOTHILL_MAX_RADIUS, random());
    const height = 6 + random() * 7;

    geometries.push(createPeakGeometry({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      height,
      baseRadius: height * (1.4 + random() * 0.7),
      random
    }));
  }

  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());

  const mountains = new THREE.Mesh(
    merged,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0
    })
  );
  mountains.castShadow = false;
  mountains.receiveShadow = false;
  return mountains;
}

function createPeakGeometry({
  x,
  z,
  height,
  baseRadius,
  random
}) {
  const radialSegments = 9;
  const heightSegments = 5;
  const geometry = new THREE.ConeGeometry(baseRadius, height, radialSegments, heightSegments);
  geometry.translate(0, height / 2, 0);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  const snowy = height > SNOW_HEIGHT_THRESHOLD;
  const grassTint = 0.88 + random() * 0.24;
  const jitterStrength = baseRadius * 0.16;
  const vertexJitter = new Map();

  for (let index = 0; index < positions.count; index += 1) {
    const vx = positions.getX(index);
    const vy = positions.getY(index);
    const vz = positions.getZ(index);
    const heightRatio = THREE.MathUtils.clamp(vy / height, 0, 1);

    // 同一座標の頂点(継ぎ目)には同じ揺らぎを与えて割れを防ぐ
    const key = `${vx.toFixed(3)},${vy.toFixed(3)},${vz.toFixed(3)}`;
    let jitter = vertexJitter.get(key);
    if (!jitter) {
      jitter = {
        x: (random() - 0.5) * 2 * jitterStrength * (1 - heightRatio * 0.85),
        y: (random() - 0.5) * height * 0.05,
        z: (random() - 0.5) * 2 * jitterStrength * (1 - heightRatio * 0.85)
      };
      vertexJitter.set(key, jitter);
    }

    if (vy > 0.01) {
      positions.setXYZ(index, vx + jitter.x, Math.max(0, vy + jitter.y), vz + jitter.z);
    }

    if (snowy && heightRatio > 0.66) {
      color.copy(ROCK_COLOR).lerp(SNOW_COLOR, THREE.MathUtils.smoothstep(heightRatio, 0.66, 0.84));
    } else if (heightRatio > 0.3) {
      color.copy(GRASS_COLOR).lerp(ROCK_COLOR, THREE.MathUtils.smoothstep(heightRatio, 0.3, 0.78));
    } else {
      color.copy(GRASS_COLOR);
    }
    color.multiplyScalar(grassTint);

    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.translate(x, -0.4, z);
  return geometry;
}

function createHills() {
  const random = createSeededRandom(20260602);
  const geometries = [];
  const hillCount = 10;
  const color = new THREE.Color();

  for (let index = 0; index < hillCount; index += 1) {
    const angle = (index / hillCount) * Math.PI * 2 + random() * 0.55;
    const radius = 36 + random() * 14;
    const hillRadius = 7 + random() * 9;

    // 東側は川が流れるので丘を置かない
    if (Math.cos(angle) * radius > 16) continue;
    const geometry = new THREE.SphereGeometry(hillRadius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    geometry.scale(1 + random() * 0.5, 0.22 + random() * 0.12, 1 + random() * 0.5);

    color.set(HILL_COLORS[index % HILL_COLORS.length]).multiplyScalar(0.92 + random() * 0.18);
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let vertex = 0; vertex < geometry.attributes.position.count; vertex += 1) {
      colors[vertex * 3] = color.r;
      colors[vertex * 3 + 1] = color.g;
      colors[vertex * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.translate(Math.cos(angle) * radius, -0.18, Math.sin(angle) * radius);
    geometries.push(geometry);
  }

  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());

  const hills = new THREE.Mesh(
    merged,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0
    })
  );
  hills.castShadow = false;
  hills.receiveShadow = true;
  return hills;
}

function createBushes(exclusions) {
  const random = createSeededRandom(20260603);
  const placements = scatterPoints({
    random,
    count: 46,
    bounds: { minX: -30, maxX: 27, minZ: -28, maxZ: 22 },
    minDistance: 2.6,
    exclusions
  });

  if (!placements.length) return null;

  const geometry = new THREE.IcosahedronGeometry(0.62, 1);
  geometry.scale(1, 0.72, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0
  });

  const bushes = new THREE.InstancedMesh(geometry, material, placements.length);
  bushes.castShadow = true;
  bushes.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();

  placements.forEach((placement, index) => {
    const size = 0.65 + random() * 0.75;
    euler.set(0, random() * Math.PI * 2, 0);
    quaternion.setFromEuler(euler);
    scale.set(size, size * (0.8 + random() * 0.3), size);
    matrix.compose(new THREE.Vector3(placement.x, 0.28 * size, placement.z), quaternion, scale);
    bushes.setMatrixAt(index, matrix);
    color.set(BUSH_COLORS[Math.floor(random() * BUSH_COLORS.length)]);
    bushes.setColorAt(index, color);
  });

  bushes.instanceMatrix.needsUpdate = true;
  if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
  return bushes;
}

function createFlowers(exclusions) {
  const random = createSeededRandom(20260604);
  const clusterCenters = scatterPoints({
    random,
    count: 16,
    bounds: { minX: -26, maxX: 24, minZ: -24, maxZ: 20 },
    minDistance: 6,
    exclusions
  });

  const blossoms = [];
  clusterCenters.forEach((center) => {
    const blossomCount = 7 + Math.floor(random() * 8);
    for (let index = 0; index < blossomCount; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * (1.1 + random() * 1.2);
      const x = center.x + Math.cos(angle) * distance;
      const z = center.z + Math.sin(angle) * distance;
      if (isInExclusion(x, z, exclusions)) continue;
      blossoms.push({ x, z });
    }
  });

  if (!blossoms.length) return null;

  const geometry = new THREE.SphereGeometry(0.11, 6, 5);
  geometry.scale(1, 0.7, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0
  });

  const flowers = new THREE.InstancedMesh(geometry, material, blossoms.length);
  flowers.castShadow = false;
  flowers.receiveShadow = false;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();

  blossoms.forEach((blossom, index) => {
    const size = 0.7 + random() * 0.7;
    scale.setScalar(size);
    matrix.compose(new THREE.Vector3(blossom.x, 0.09 * size, blossom.z), quaternion, scale);
    flowers.setMatrixAt(index, matrix);
    color.set(FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)]);
    flowers.setColorAt(index, color);
  });

  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  return flowers;
}

function scatterPoints({
  random,
  count,
  bounds,
  minDistance,
  exclusions
}) {
  const placements = [];
  const maxAttempts = count * 60;

  for (let attempt = 0; attempt < maxAttempts && placements.length < count; attempt += 1) {
    const x = THREE.MathUtils.lerp(bounds.minX, bounds.maxX, random());
    const z = THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, random());

    if (isInExclusion(x, z, exclusions)) continue;

    const tooClose = placements.some((placement) => {
      return Math.hypot(placement.x - x, placement.z - z) < minDistance;
    });
    if (tooClose) continue;

    placements.push({ x, z });
  }

  return placements;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
