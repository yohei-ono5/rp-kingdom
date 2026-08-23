import * as THREE from 'three';
import { createPartCollector, createSeededRandom } from './common.js';

// 小物。世界の密度を上げる役。どれもプリミティブの組み合わせで作れる。

const WOOD = 0x6b533a;
const DARK_WOOD = 0x4a3a2c;
const STONE = 0x8b8479;
const METAL = 0x55524d;

// 井戸。村の広場の中心に置くと生活感が出る。
export function createWell({ seed = 1 } = {}) {
  const random = createSeededRandom(seed);
  const parts = createPartCollector();
  const opts = { random, jitter: 0.16 };

  // 石積みのリング
  const ringCount = 14;
  for (let index = 0; index < ringCount; index += 1) {
    const angle = (index / ringCount) * Math.PI * 2;
    const radius = 0.78;
    parts.add(
      new THREE.BoxGeometry(0.34, 0.24, 0.26),
      STONE,
      {
        position: [Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius],
        rotation: [0, -angle, 0],
        ...opts
      }
    );
    parts.add(
      new THREE.BoxGeometry(0.3, 0.2, 0.24),
      STONE,
      {
        position: [Math.cos(angle + 0.2) * radius, 0.34, Math.sin(angle + 0.2) * radius],
        rotation: [0, -angle - 0.2, 0],
        ...opts
      }
    );
  }

  // 屋根を支える2本の柱
  [-1, 1].forEach((side) => {
    parts.add(
      new THREE.CylinderGeometry(0.07, 0.08, 1.5, 6),
      WOOD,
      { position: [side * 0.66, 1.05, 0], ...opts }
    );
  });

  // 巻き上げの軸
  parts.add(
    new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8),
    DARK_WOOD,
    { position: [0, 1.42, 0], rotation: [0, 0, Math.PI / 2], ...opts }
  );

  // 小屋根
  const slopeAngle = 0.62;
  [-1, 1].forEach((side) => {
    parts.add(
      new THREE.BoxGeometry(1.0, 0.09, 1.25),
      DARK_WOOD,
      { position: [side * 0.42, 1.92, 0], rotation: [0, 0, -side * slopeAngle], ...opts }
    );
  });

  // 吊り下げた桶
  parts.add(
    new THREE.CylinderGeometry(0.17, 0.15, 0.26, 8),
    WOOD,
    { position: [0, 0.92, 0], ...opts }
  );
  parts.add(
    new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4),
    METAL,
    { position: [0, 1.22, 0], ...opts }
  );

  return parts.build({ name: `procedural-well-${seed}` });
}

// 樽。並べるだけで市場や倉庫の気配が出る。
export function createBarrel({ seed = 1 } = {}) {
  const random = createSeededRandom(seed);
  const parts = createPartCollector();
  const opts = { random, jitter: 0.12 };

  const height = 0.62;
  // 胴を3段に分けて中央を膨らませると樽らしい輪郭になる
  parts.add(
    new THREE.CylinderGeometry(0.26, 0.23, height * 0.34, 10),
    WOOD,
    { position: [0, height * 0.17, 0], ...opts }
  );
  parts.add(
    new THREE.CylinderGeometry(0.26, 0.26, height * 0.32, 10),
    WOOD,
    { position: [0, height * 0.5, 0], ...opts }
  );
  parts.add(
    new THREE.CylinderGeometry(0.23, 0.26, height * 0.34, 10),
    WOOD,
    { position: [0, height * 0.83, 0], ...opts }
  );

  // 金属のたが
  [0.24, 0.76].forEach((t) => {
    parts.add(
      new THREE.CylinderGeometry(0.265, 0.265, 0.05, 10),
      METAL,
      { position: [0, height * t, 0], ...opts }
    );
  });

  return parts.build({ name: `procedural-barrel-${seed}` });
}

// 柵。区画の境界を示すのに使える。長さを指定すると自動で支柱を割り付ける。
export function createFence({ seed = 1, length = 4, segments = null } = {}) {
  const random = createSeededRandom(seed);
  const parts = createPartCollector();
  const opts = { random, jitter: 0.14 };

  const postCount = segments ?? Math.max(2, Math.round(length / 1.1) + 1);
  const step = length / (postCount - 1);

  for (let index = 0; index < postCount; index += 1) {
    const x = -length / 2 + step * index;
    const height = 0.86 + random() * 0.12;
    parts.add(
      new THREE.BoxGeometry(0.1, height, 0.1),
      WOOD,
      { position: [x, height / 2, 0], rotation: [0, 0, (random() - 0.5) * 0.06], ...opts }
    );
  }

  // 横木は2段
  [0.32, 0.66].forEach((t) => {
    parts.add(
      new THREE.BoxGeometry(length, 0.075, 0.06),
      DARK_WOOD,
      { position: [0, 0.9 * t, 0.02], ...opts }
    );
  });

  return parts.build({ name: `procedural-fence-${seed}` });
}

// 岩。正二十面体を歪めてフラットシェーディングにするだけで様になる。
export function createRock({ seed = 1, radius = 0.7, detail = 0 } = {}) {
  const random = createSeededRandom(seed);
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    // 上下に潰し、横方向にばらつかせると座りの良い塊になる
    vertex.multiplyScalar(0.78 + random() * 0.44);
    vertex.y *= 0.62;
    position.setXYZ(index, vertex.x, Math.max(vertex.y, -radius * 0.1), vertex.z);
  }

  const parts = createPartCollector();
  parts.add(geometry, 0x7f7a71, { position: [0, radius * 0.34, 0], random, jitter: 0.2 });
  return parts.build({ flatShading: true, name: `procedural-rock-${seed}` });
}

// 草むら。交差板をインスタンス化して散らす。頂点シェーダで風に揺らす。
export function createGrassPatch({
  seed = 1,
  count = 160,
  radius = 3.2,
  color = 0x93a173
} = {}) {
  const random = createSeededRandom(seed);

  const mesh = new THREE.InstancedMesh(
    createBladeGeometry(),
    createGrassMaterial(color),
    count * 2
  );

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  let instance = 0;

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * radius;
    position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
    const size = 0.8 + random() * 0.6;
    scale.set(size, size * (0.8 + random() * 0.5), size);
    const facing = random() * Math.PI;

    // 1株につき2枚を直交させて、どの角度から見ても葉があるようにする
    for (const offset of [0, Math.PI / 2]) {
      euler.set(0, facing + offset, (random() - 0.5) * 0.2);
      quaternion.setFromEuler(euler);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(instance, matrix);
      instance += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.name = `procedural-grass-${seed}`;
  return mesh;
}

// 上へ向かって細くなる葉。長方形のままだと板が並んでいるようにしか見えない。
function createBladeGeometry() {
  const halfWidth = 0.075;
  const height = 0.3;
  const tip = 0.012;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -halfWidth, 0, 0,
    halfWidth, 0, 0,
    tip, height, 0,

    -halfWidth, 0, 0,
    tip, height, 0,
    -tip, height, 0
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1
  ], 2));
  geometry.computeVertexNormals();
  return geometry;
}

function createGrassMaterial(color) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: false
  });

  // 揺れは頂点シェーダで完結させる。JS 側の毎フレーム更新を増やさない。
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
{
  float sway = sin( uTime * 1.6 + instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.6 );
  transformed.x += sway * 0.09 * transformed.y;
  transformed.z += sway * 0.05 * transformed.y;
}`
      );
  };

  return material;
}

export function updateGrass(mesh, elapsedSeconds) {
  const shader = mesh?.material?.userData?.shader;
  if (shader) shader.uniforms.uTime.value = elapsedSeconds;
}
