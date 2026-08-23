import * as THREE from 'three';
import { createSeededRandom } from './common.js';

// 山脈。高さマップを作って板を持ち上げるだけだが、地形はモデリングするより
// ノイズで作った方が良い結果になる典型例。稜線・岩肌・雪冠を高さと傾きで塗り分ける。

const GRASS = new THREE.Color(0x7a8a63);
const ROCK = new THREE.Color(0x7d7468);
const ROCK_DARK = new THREE.Color(0x554e47);
const SNOW = new THREE.Color(0xece7dc);

export function createMountainRange({
  seed = 1,
  width = 120,
  depth = 46,
  segmentsX = 128,
  segmentsZ = 52,
  maxHeight = 24,
  peakCount = 7,
  snowLine = 0.62
} = {}) {
  const random = createSeededRandom(seed);
  const noise = createValueNoise(random);

  // 稜線に沿って峰を並べる。高さと幅をばらすと同じ山が並ばない。
  const peaks = Array.from({ length: peakCount }, (unused, index) => {
    const t = (index + 0.5) / peakCount;
    return {
      x: THREE.MathUtils.lerp(-width / 2, width / 2, t) + (random() - 0.5) * width * 0.08,
      z: (random() - 0.5) * depth * 0.3,
      height: maxHeight * (0.45 + random() * 0.55),
      radius: width / peakCount * (0.7 + random() * 0.7)
    };
  });

  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const temp = new THREE.Color();

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);

    let height = 0;
    peaks.forEach((peak) => {
      const distance = Math.hypot(x - peak.x, (z - peak.z) * 1.5);
      if (distance > peak.radius) return;
      const falloff = 1 - distance / peak.radius;
      // 二乗より鋭いカーブにすると、なだらかな丘ではなく山の稜線になる
      height += peak.height * Math.pow(falloff, 1.4 + (peak.radius % 1) * 0.7);
    });

    // 多重ノイズで岩肌の起伏を足す。低い場所ほど控えめに。
    const detail =
      noise(x * 0.035, z * 0.035) * 3.4 +
      noise(x * 0.09, z * 0.09) * 1.5 +
      noise(x * 0.22, z * 0.22) * 0.6;
    height += detail * THREE.MathUtils.clamp(height / maxHeight + 0.25, 0, 1.2);

    // 手前と奥は裾野として地面へ落とす
    const edgeFade = 1 - Math.pow(Math.abs(z) / (depth / 2), 2.2);
    height *= THREE.MathUtils.clamp(edgeFade, 0, 1);

    position.setY(index, Math.max(height, 0));
  }

  // 色は高さと傾きで決める。急な面ほど岩、高い場所ほど雪。
  for (let index = 0; index < position.count; index += 1) {
    const height = position.getY(index);
    const ratio = THREE.MathUtils.clamp(height / maxHeight, 0, 1);
    const slope = estimateSlope(position, index, segmentsX);

    temp.copy(GRASS);
    temp.lerp(ROCK, THREE.MathUtils.smoothstep(ratio, 0.08, 0.4));
    temp.lerp(ROCK_DARK, THREE.MathUtils.clamp(slope * 0.9, 0, 0.55));
    temp.lerp(SNOW, THREE.MathUtils.smoothstep(ratio, snowLine, snowLine + 0.13));
    temp.multiplyScalar(0.9 + noise(index * 0.7, index * 0.31) * 0.14);

    colors[index * 3] = temp.r;
    colors[index * 3 + 1] = temp.g;
    colors[index * 3 + 2] = temp.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      flatShading: true
    })
  );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.name = `procedural-mountains-${seed}`;
  return mesh;
}

// 隣の頂点との高低差から傾きを見る。厳密な法線でなくても塗り分けには十分。
function estimateSlope(position, index, segmentsX) {
  const stride = segmentsX + 1;
  const right = index + 1;
  const down = index + stride;
  if (right >= position.count || down >= position.count) return 0;

  const height = position.getY(index);
  return (
    Math.abs(position.getY(right) - height) +
    Math.abs(position.getY(down) - height)
  ) * 0.5;
}

// 格子点の乱数を補間する古典的なバリューノイズ。外部ライブラリを持ち込まずに済む。
function createValueNoise(random) {
  const size = 256;
  const table = new Float32Array(size * size);
  for (let index = 0; index < table.length; index += 1) {
    table[index] = random();
  }

  const at = (x, y) => table[(Math.abs(y % size) * size + Math.abs(x % size)) % table.length];

  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);

    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(a, b, ux),
      THREE.MathUtils.lerp(c, d, ux),
      uy
    ) * 2 - 1;
  };
}
