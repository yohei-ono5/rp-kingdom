import * as THREE from 'three';
import { createPartCollector, createSeededRandom } from './common.js';

// 手続き生成の木。
// 幹をわずかに曲げながら積み、樹冠は低ポリの塊を寄せて作る。
// 写真テクスチャの木と違い、樹種・樹高・傾き・色をパラメータで無限に振れる。

const SPECIES = {
  // 丸く広がる広葉樹。村の主役になる木。
  oak: {
    trunkHeight: [1.5, 2.3],
    trunkRadius: [0.16, 0.24],
    lean: 0.12,
    blobs: [5, 8],
    canopyRadius: [0.95, 1.35],
    canopySpread: [0.8, 1.15],
    canopyLift: [0.2, 0.7],
    bark: 0x5a4632,
    leaves: [0x5f7d4c, 0x6d8a55, 0x53733f]
  },
  // 細く高い木。群れで置くと林の奥行きが出る。
  birch: {
    // 幹が高すぎると樹冠が点に見えて棒立ちになる。幹を抑えて樹冠を厚くする。
    trunkHeight: [1.9, 2.5],
    trunkRadius: [0.11, 0.15],
    lean: 0.2,
    blobs: [5, 7],
    canopyRadius: [0.72, 0.95],
    canopySpread: [0.5, 0.78],
    canopyLift: [0.25, 0.8],
    bark: 0x9a9484,
    leaves: [0x7c9159, 0x8a9c62, 0x6d834b]
  },
  // 円錐を積んだ針葉樹。シルエットに変化をつける役。
  pine: {
    trunkHeight: [1.0, 1.5],
    trunkRadius: [0.14, 0.2],
    lean: 0.05,
    cones: [3, 5],
    coneRadius: [0.85, 1.15],
    bark: 0x4c3b2b,
    leaves: [0x3f5c3c, 0x496a44, 0x365030]
  }
};

export function createProceduralTree({
  seed = 1,
  species = 'oak',
  scale = 1
} = {}) {
  const preset = SPECIES[species] || SPECIES.oak;
  const random = createSeededRandom(seed);
  const parts = createPartCollector();
  const opts = { random, jitter: 0.1 };

  const trunkHeight = range(random, preset.trunkHeight) * scale;
  const trunkRadius = range(random, preset.trunkRadius) * scale;
  const leanAngle = (random() - 0.5) * preset.lean;
  const leanDirection = random() * Math.PI * 2;

  // ---- 幹 ----
  // 2段に分けてわずかに折ることで、まっすぐな棒に見えないようにする
  const lowerHeight = trunkHeight * 0.6;
  const upperHeight = trunkHeight * 0.45;

  parts.add(
    new THREE.CylinderGeometry(trunkRadius * 0.82, trunkRadius * 1.25, lowerHeight, 7),
    preset.bark,
    { position: [0, lowerHeight / 2, 0], ...opts, jitter: 0.16 }
  );

  const tiltX = Math.cos(leanDirection) * leanAngle;
  const tiltZ = Math.sin(leanDirection) * leanAngle;
  const upperY = lowerHeight + upperHeight / 2;
  const upperX = Math.sin(tiltZ) * upperHeight * 0.5;
  const upperZ = -Math.sin(tiltX) * upperHeight * 0.5;

  parts.add(
    new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius * 0.84, upperHeight, 7),
    preset.bark,
    { position: [upperX, upperY, upperZ], rotation: [tiltX, 0, tiltZ], ...opts, jitter: 0.16 }
  );

  // 根張り。地面との接点が太いと安定して見える。
  const rootCount = 3 + Math.floor(random() * 3);
  for (let index = 0; index < rootCount; index += 1) {
    const angle = (index / rootCount) * Math.PI * 2 + random() * 0.5;
    parts.add(
      new THREE.CylinderGeometry(trunkRadius * 0.18, trunkRadius * 0.42, trunkRadius * 1.7, 5),
      preset.bark,
      {
        position: [
          Math.cos(angle) * trunkRadius * 0.9,
          trunkRadius * 0.5,
          Math.sin(angle) * trunkRadius * 0.9
        ],
        rotation: [Math.sin(angle) * 0.5, 0, -Math.cos(angle) * 0.5],
        ...opts,
        jitter: 0.2
      }
    );
  }

  const canopyBaseY = lowerHeight + upperHeight * 0.9;
  const canopyBaseX = upperX * 1.7;
  const canopyBaseZ = upperZ * 1.7;

  if (species === 'pine') {
    addConeCanopy(parts, { preset, random, scale, canopyBaseY, canopyBaseX, canopyBaseZ });
  } else {
    addBlobCanopy(parts, { preset, random, scale, canopyBaseY, canopyBaseX, canopyBaseZ });
  }

  return parts.build({ flatShading: true, name: `procedural-tree-${species}-${seed}` });
}

// 低ポリの塊を寄せて樹冠にする。塊ごとに緑を変えると単色の団子にならない。
function addBlobCanopy(parts, { preset, random, scale, canopyBaseY, canopyBaseX, canopyBaseZ }) {
  const blobCount = Math.round(range(random, preset.blobs));
  const canopyRadius = range(random, preset.canopyRadius) * scale;
  const spread = range(random, preset.canopySpread) * scale;

  for (let index = 0; index < blobCount; index += 1) {
    const angle = (index / blobCount) * Math.PI * 2 + random() * 0.7;
    const distance = index === 0 ? 0 : spread * (0.4 + random() * 0.6);
    const blobRadius = canopyRadius * (index === 0 ? 1 : 0.55 + random() * 0.4);
    const lift = range(random, preset.canopyLift) * scale * (index === 0 ? 1 : random());

    parts.add(
      new THREE.IcosahedronGeometry(blobRadius, 0),
      pick(random, preset.leaves),
      {
        position: [
          canopyBaseX + Math.cos(angle) * distance,
          canopyBaseY + lift,
          canopyBaseZ + Math.sin(angle) * distance
        ],
        rotation: [random() * Math.PI, random() * Math.PI, random() * Math.PI],
        ...{ random, jitter: 0.16 }
      }
    );
  }
}

// 円錐を細くしながら積む。針葉樹のシルエット。
function addConeCanopy(parts, { preset, random, scale, canopyBaseY, canopyBaseX, canopyBaseZ }) {
  const coneCount = Math.round(range(random, preset.cones));
  const baseRadius = range(random, preset.coneRadius) * scale;
  let y = canopyBaseY;

  for (let index = 0; index < coneCount; index += 1) {
    const t = index / coneCount;
    const radius = baseRadius * (1 - t * 0.62);
    const height = baseRadius * (1.25 - t * 0.35);

    parts.add(
      new THREE.ConeGeometry(radius, height, 7),
      pick(random, preset.leaves),
      { position: [canopyBaseX, y + height / 2, canopyBaseZ], ...{ random, jitter: 0.14 } }
    );

    y += height * 0.55;
  }
}

function range(random, [min, max]) {
  return min + random() * (max - min);
}

function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

export const TREE_SPECIES = Object.keys(SPECIES);
