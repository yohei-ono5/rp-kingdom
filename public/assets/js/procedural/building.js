import * as THREE from 'three';
import { createPartCollector, createSeededRandom } from './common.js';

// 手続き生成の建物。
// 中世ファンタジーの家は「箱 + 三角柱 + 梁」に還元できるので、
// 石の土台 → 各階の壁(上階をせり出す) → 木組み → 切妻屋根 → 煙突 → 開口部
// という順に積み上げるだけで成立する。

const MATERIALS = Object.freeze({
  stone: 0x8b8479,
  plaster: 0xe4d7bd,
  timber: 0x4a3a2c,
  roof: 0x54637f,
  roofRidge: 0x45526b,
  door: 0x3d2f24,
  glass: 0xf3e2b4
});

export function createProceduralBuilding({
  seed = 1,
  width = 3.2,
  depth = 2.8,
  floors = 2,
  roofPitch = 0.62,
  jetty = 0.17,
  palette = MATERIALS
} = {}) {
  const random = createSeededRandom(seed);
  const parts = createPartCollector();
  const opts = { random };

  // ---- 石の土台 ----
  const baseHeight = 0.32;
  parts.add(
    new THREE.BoxGeometry(width + 0.34, baseHeight, depth + 0.34),
    palette.stone,
    { position: [0, baseHeight / 2, 0], ...opts, jitter: 0.16 }
  );

  // ---- 各階 ----
  let y = baseHeight;
  let floorWidth = width;
  let floorDepth = depth;

  for (let floor = 0; floor < floors; floor += 1) {
    const height = floor === 0 ? 2.15 : 1.85 + random() * 0.2;

    parts.add(
      new THREE.BoxGeometry(floorWidth, height, floorDepth),
      palette.plaster,
      { position: [0, y + height / 2, 0], ...opts, jitter: 0.05 }
    );

    addTimberFrame(parts, {
      width: floorWidth,
      depth: floorDepth,
      height,
      y,
      color: palette.timber,
      random
    });

    addOpenings(parts, {
      floor,
      width: floorWidth,
      depth: floorDepth,
      height,
      y,
      palette,
      random
    });

    y += height;
    // 上階を張り出させると中世の街並みらしいシルエットになる
    floorWidth += jetty * 2;
    floorDepth += jetty * 2;
  }

  // ---- 切妻屋根 ----
  const roofHeight = floorWidth * roofPitch;
  addGableRoof(parts, {
    width: floorWidth,
    depth: floorDepth,
    y,
    roofHeight,
    palette,
    random
  });

  // ---- 煙突 ----
  const chimneyX = (floorWidth / 2) * (0.3 + random() * 0.28) * (random() > 0.5 ? 1 : -1);
  const chimneyHeight = roofHeight * 0.85 + 0.5;
  parts.add(
    new THREE.BoxGeometry(0.42, chimneyHeight, 0.42),
    palette.stone,
    { position: [chimneyX, y + chimneyHeight / 2, floorDepth * 0.16], ...opts, jitter: 0.18 }
  );
  parts.add(
    new THREE.BoxGeometry(0.56, 0.14, 0.56),
    palette.stone,
    { position: [chimneyX, y + chimneyHeight, floorDepth * 0.16], ...opts, jitter: 0.12 }
  );

  return parts.build({ name: `procedural-building-${seed}` });
}

// 柱・胴差し・筋交いを面ごとに置く。ハーフティンバーの見た目はこれで決まる。
function addTimberFrame(parts, { width, depth, height, y, color, random }) {
  const beam = 0.13;
  const opts = { random, jitter: 0.12 };
  const halfW = width / 2;
  const halfD = depth / 2;

  // 四隅の柱
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    parts.add(
      new THREE.BoxGeometry(beam * 1.3, height, beam * 1.3),
      color,
      { position: [sx * (halfW - beam * 0.3), y + height / 2, sz * (halfD - beam * 0.3)], ...opts }
    );
  });

  // 上下の横架材
  [y + beam / 2, y + height - beam / 2].forEach((railY) => {
    parts.add(
      new THREE.BoxGeometry(width + 0.01, beam, beam),
      color,
      { position: [0, railY, halfD], ...opts }
    );
    parts.add(
      new THREE.BoxGeometry(width + 0.01, beam, beam),
      color,
      { position: [0, railY, -halfD], ...opts }
    );
    parts.add(
      new THREE.BoxGeometry(beam, beam, depth + 0.01),
      color,
      { position: [halfW, railY, 0], ...opts }
    );
    parts.add(
      new THREE.BoxGeometry(beam, beam, depth + 0.01),
      color,
      { position: [-halfW, railY, 0], ...opts }
    );
  });

  // 正面と背面の筋交い
  const braceLength = Math.hypot(width * 0.42, height * 0.78);
  const braceAngle = Math.atan2(width * 0.42, height * 0.78);
  [1, -1].forEach((sz) => {
    [1, -1].forEach((sx) => {
      if (random() < 0.35) return;
      parts.add(
        new THREE.BoxGeometry(beam, braceLength, beam),
        color,
        {
          position: [sx * width * 0.22, y + height / 2, sz * halfD],
          rotation: [0, 0, sx * braceAngle],
          ...opts
        }
      );
    });
  });
}

// 扉と窓。壁面から少しだけ手前に出して、影で開口に見せる。
function addOpenings(parts, { floor, width, depth, height, y, palette, random }) {
  const opts = { random, jitter: 0.08 };
  const halfD = depth / 2;

  if (floor === 0) {
    const doorWidth = 0.78;
    const doorHeight = 1.5;
    parts.add(
      new THREE.BoxGeometry(doorWidth, doorHeight, 0.1),
      palette.door,
      { position: [0, y + doorHeight / 2, halfD + 0.03], ...opts }
    );
    parts.add(
      new THREE.BoxGeometry(doorWidth + 0.16, doorHeight + 0.14, 0.07),
      palette.timber,
      { position: [0, y + (doorHeight + 0.14) / 2, halfD + 0.01], ...opts }
    );
  }

  const windowCount = floor === 0 ? 2 : 1 + Math.floor(random() * 2);
  const windowWidth = 0.5;
  const windowHeight = 0.66;
  const windowY = y + height * (floor === 0 ? 0.62 : 0.52);

  for (let index = 0; index < windowCount; index += 1) {
    const spread = width * 0.3;
    const offset = windowCount === 1
      ? (random() - 0.5) * width * 0.3
      : THREE.MathUtils.lerp(-spread, spread, index / Math.max(1, windowCount - 1));

    [halfD + 0.03, -halfD - 0.03].forEach((z, side) => {
      if (side === 1 && random() < 0.4) return;
      parts.add(
        new THREE.BoxGeometry(windowWidth, windowHeight, 0.06),
        palette.glass,
        { position: [offset, windowY, z], ...opts }
      );
      parts.add(
        new THREE.BoxGeometry(windowWidth + 0.13, windowHeight + 0.13, 0.04),
        palette.timber,
        { position: [offset, windowY, z * 0.995], ...opts }
      );
    });
  }
}

// 妻壁(三角形)と2枚の屋根面。軒を出すと影が落ちてシルエットが締まる。
function addGableRoof(parts, { width, depth, y, roofHeight, palette, random }) {
  const opts = { random, jitter: 0.06 };
  const overhang = 0.34;
  const halfW = width / 2;

  // 妻壁
  const gable = new THREE.Shape();
  gable.moveTo(-halfW, 0);
  gable.lineTo(halfW, 0);
  gable.lineTo(0, roofHeight);
  gable.closePath();

  [depth / 2, -depth / 2].forEach((z) => {
    parts.add(
      new THREE.ExtrudeGeometry(gable, { depth: 0.12, bevelEnabled: false }),
      palette.plaster,
      { position: [0, y, z - (z > 0 ? 0 : 0.12)], ...opts }
    );
  });

  // 屋根面
  const slopeWidth = Math.hypot(halfW + overhang * 0.4, roofHeight);
  const slopeAngle = Math.atan2(roofHeight, halfW + overhang * 0.4);

  [1, -1].forEach((side) => {
    parts.add(
      new THREE.BoxGeometry(slopeWidth, 0.14, depth + overhang * 2),
      palette.roof,
      {
        position: [
          side * (halfW + overhang * 0.4) / 2,
          y + roofHeight / 2,
          0
        ],
        rotation: [0, 0, -side * slopeAngle],
        ...opts
      }
    );
  });

  // 棟
  parts.add(
    new THREE.BoxGeometry(0.2, 0.16, depth + overhang * 2 + 0.04),
    palette.roofRidge,
    { position: [0, y + roofHeight + 0.02, 0], ...opts }
  );
}
