import * as THREE from 'three';
import {
  FRONT_HOUSE_DESTINATION,
  HOUSE_DESTINATIONS,
  ROAD_PATHS,
  VIDEO_BILLBOARDS
} from '../site-config.js';
import { initRoads } from '../scene/roads.js';
import { createTreeExclusions, initTrees } from '../scene/trees.js';
import { loadWorldObjects } from '../scene/world-objects.js';
import { createArtDirection } from '../systems/art-direction.js';

// Editions 版のワールド。
// 3D は「紙の上に置かれた挿画」として扱うので、背景は描かず canvas を透過させる。
// 遠景はフォグで紙の色に溶かし、世界は浮島として明示的に縁を持たせる。

const PAPER = 0xf2e6cf;
const ISLAND_RADIUS = 44;
const ISLAND_DEPTH = 19;

const TREE_SCATTER_EDITIONS = Object.freeze({
  modelUrl: new URL('../../models/tree_LOD0.glb', import.meta.url).href,
  count: 78,
  seed: 20260822,
  bounds: { minX: -27, maxX: 25, minZ: -27, maxZ: -5 },
  centerClearRadius: 13,
  scaleRange: [0.2, 0.34],
  minDistance: 1.5,
  exclusionPadding: 1.7
});

const WEST_TREE_SCATTER_EDITIONS = Object.freeze({
  ...TREE_SCATTER_EDITIONS,
  count: 40,
  seed: 20260823,
  bounds: { minX: -28, maxX: -16, minZ: -5, maxZ: 22 },
  centerClearRadius: 0,
  scaleRange: [0.22, 0.4]
});

export function createWorld({ canvas }) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAPER, 95, 235);

  // 縦長の画面でも横方向の画角を保つ。単に aspect だけ変えると
  // 望遠(34度)では左右が大きく切り落とされて構図が壊れる。
  const BASE_FOV = 34;
  const BASE_ASPECT = 16 / 9;

  const camera = new THREE.PerspectiveCamera(BASE_FOV, BASE_ASPECT, 0.1, 400);

  const applyViewportFraming = () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;

    if (aspect < BASE_ASPECT) {
      const baseHalf = THREE.MathUtils.degToRad(BASE_FOV) / 2;
      const horizontalHalf = Math.atan(Math.tan(baseHalf) * BASE_ASPECT);
      const preserved = THREE.MathUtils.radToDeg(
        2 * Math.atan(Math.tan(horizontalHalf) / aspect)
      );
      // 完全に横を保つと縦長画面で被写体が小さくなりすぎるので 65% だけ補正する
      camera.fov = THREE.MathUtils.lerp(BASE_FOV, preserved, 0.65);
    } else {
      camera.fov = BASE_FOV;
    }

    camera.updateProjectionMatrix();
  };

  applyViewportFraming();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // 太陽は動かさないので影は焼きっぱなしで良い。毎フレームの影パスをまるごと省ける。
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const artDirection = createArtDirection({ renderer, scene });

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const sunLight = initLighting(scene);
  worldGroup.add(createIsland());

  // 入場演出で上から降りてくるときに通り抜ける雲。スプライトなので実質無料。
  const clouds = createClouds();
  scene.add(clouds.group);

  initRoads({ paths: ROAD_PATHS, parentGroup: worldGroup });

  const destinations = [...HOUSE_DESTINATIONS, FRONT_HOUSE_DESTINATION];
  const anchors = new Map();

  const ready = loadWorldObjects({
    objects: destinations,
    renderer,
    villageGroup: worldGroup,
    mapOverlayGroup: new THREE.Group(),
    overlayMaterials: [],
    mapMarkerMeta: [],
    houseMaterials: [],
    houseLights: []
  }).then(() => {
    worldGroup.children.forEach((child) => {
      if (child.userData?.id) anchors.set(child.userData.id, child);
    });
    artDirection.applyToScene();
    renderer.shadowMap.needsUpdate = true;
  });

  const exclusions = createTreeExclusions({
    houses: destinations,
    plots: [],
    roads: ROAD_PATHS,
    billboards: VIDEO_BILLBOARDS,
    padding: TREE_SCATTER_EDITIONS.exclusionPadding
  });

  [TREE_SCATTER_EDITIONS, WEST_TREE_SCATTER_EDITIONS].forEach((treeConfig) => {
    void initTrees({ treeConfig, parentGroup: worldGroup, exclusions })
      .then(() => {
        artDirection.applyToScene();
        renderer.shadowMap.needsUpdate = true;
      })
      .catch((error) => console.error('Failed to scatter trees.', error));
  });

  artDirection.applyToScene();

  window.addEventListener('resize', () => {
    applyViewportFraming();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  return {
    scene,
    camera,
    renderer,
    worldGroup,
    sunLight,
    anchors,
    ready,
    clouds,
    setFogRange(near, far) {
      scene.fog.near = near;
      scene.fog.far = far;
    },
    render() {
      renderer.render(scene, camera);
    }
  };
}

function initLighting(scene) {
  // 環境光は絞り、太陽1灯で形を作る。影が伸びるマジックアワーの角度で固定。
  scene.add(new THREE.AmbientLight(0xfff0d8, 0.34));

  // 半球光は art-direction 側が preset に応じて足すので、ここでは持たない。

  const sunLight = new THREE.DirectionalLight(0xffe0b0, 2.9);
  sunLight.position.set(-34, 30, 26);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  // 島の直径(=半径*2)を必ず覆う。覆えていないと範囲外が影として黒く出る。
  const shadowExtent = ISLAND_RADIUS + 6;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 180;
  sunLight.shadow.bias = -0.0006;
  sunLight.shadow.camera.updateProjectionMatrix();
  scene.add(sunLight);
  scene.add(sunLight.target);

  return sunLight;
}

// 浮島。上面(草地)と側面(岩肌)を別メッシュで作る。
// CylinderGeometry の天面は中心からの三角ファンなので、頂点カラーを載せると
// 放射状の筋が出てしまう。上面はリング分割した円盤を自前で組んで回避する。
function createIsland() {
  const group = new THREE.Group();
  group.add(createIslandTop());
  group.add(createIslandSide());
  return group;
}

function createIslandTop() {
  const rings = 26;
  const segments = 88;
  const random = createSeededRandom(20260824);

  const positions = [];
  const colors = [];
  const indices = [];

  const grass = new THREE.Color(0x87927a);
  const dry = new THREE.Color(0xa39a76);
  const temp = new THREE.Color();

  // 2次元の斑点。半径方向だけの変化にしないことで筋を消す。
  const patches = Array.from({ length: 30 }, () => {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * ISLAND_RADIUS;
    return {
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      radius: 6 + random() * 20,
      strength: (random() - 0.45) * 0.3
    };
  });

  for (let ring = 0; ring <= rings; ring += 1) {
    const radiusRatio = ring / rings;
    const radius = radiusRatio * ISLAND_RADIUS;

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // 縁だけ落として丸みをつける。中央は完全に平坦(建物が浮かないように)。
      const edge = THREE.MathUtils.smoothstep(radiusRatio, 0.84, 1);
      positions.push(x, -edge * 1.8, z);

      let shade = 1;
      patches.forEach((patch) => {
        const distance = Math.hypot(x - patch.x, z - patch.z);
        if (distance > patch.radius) return;
        const falloff = 1 - distance / patch.radius;
        shade += patch.strength * falloff * falloff;
      });
      shade += (random() - 0.5) * 0.04;

      temp.copy(grass).lerp(dry, THREE.MathUtils.clamp(radiusRatio * 0.7, 0, 0.55));
      temp.multiplyScalar(THREE.MathUtils.clamp(shade, 0.6, 1.2));
      colors.push(temp.r, temp.g, temp.b);
    }
  }

  const stride = segments + 1;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * stride + segment;
      const b = a + stride;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  // ほぼ平坦な円盤なので法線は真上で固定する。
  // computeVertexNormals は巻き順に依存して裏返りやすいため使わない。
  const normals = new Float32Array(positions.length);
  for (let index = 1; index < normals.length; index += 3) normals[index] = 1;
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  const top = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0
    })
  );
  top.receiveShadow = true;
  return top;
}

function createIslandSide() {
  const geometry = new THREE.CylinderGeometry(
    ISLAND_RADIUS,
    ISLAND_RADIUS * 0.46,
    ISLAND_DEPTH,
    88,
    10,
    true
  );

  const random = createSeededRandom(20260825);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);

  const rock = new THREE.Color(0x8c7d68);
  const deep = new THREE.Color(0x453c37);
  const temp = new THREE.Color();
  const vertex = new THREE.Vector3();

  const ridges = Array.from({ length: 13 }, () => ({
    angle: random() * Math.PI * 2,
    width: 0.22 + random() * 0.5,
    amount: 0.02 + random() * 0.07
  }));

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);

    const heightRatio = THREE.MathUtils.clamp(
      (vertex.y + ISLAND_DEPTH / 2) / ISLAND_DEPTH,
      0,
      1
    );
    const angle = Math.atan2(vertex.z, vertex.x);

    let bulge = 0;
    ridges.forEach((ridge) => {
      let delta = Math.abs(angle - ridge.angle);
      if (delta > Math.PI) delta = Math.PI * 2 - delta;
      if (delta > ridge.width) return;
      const falloff = 1 - delta / ridge.width;
      bulge += ridge.amount * falloff * falloff * (1 - heightRatio);
    });

    // 張り出しは必ず上面の半径以内に収める。加算で膨らむと上面から食み出して
    // 巨大な影のような塊に見えてしまう。
    const scale = 1 + Math.min(bulge, 0.1);
    const radius = Math.hypot(vertex.x, vertex.z) * scale;
    const limit = Math.min(radius, ISLAND_RADIUS * 0.995);
    const ratio = radius > 0.0001 ? limit / Math.hypot(vertex.x, vertex.z) : 1;
    position.setXYZ(index, vertex.x * ratio, vertex.y, vertex.z * ratio);

    const rockMix = THREE.MathUtils.smoothstep(heightRatio, 0.02, 0.95);
    temp.copy(deep).lerp(rock, rockMix).multiplyScalar(0.85 + random() * 0.26);
    colors[index * 3] = temp.r;
    colors[index * 3 + 1] = temp.g;
    colors[index * 3 + 2] = temp.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const side = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      flatShading: true
    })
  );
  side.position.y = -ISLAND_DEPTH / 2;
  return side;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// ---------- 雲 ----------

const CLOUD_COUNT = 34;
const CLOUD_MIN_Y = 46;
const CLOUD_MAX_Y = 96;

function createClouds() {
  const group = new THREE.Group();
  const texture = createCloudTexture();
  const random = createSeededRandom(20260901);
  const sprites = [];

  for (let index = 0; index < CLOUD_COUNT; index += 1) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.3 + random() * 0.3,
      color: new THREE.Color(0xfffaf0).lerp(new THREE.Color(0xe4d6b8), random() * 0.5)
    });

    const sprite = new THREE.Sprite(material);
    const angle = random() * Math.PI * 2;
    const distance = 18 + Math.sqrt(random()) * 120;
    const scale = 34 + random() * 58;

    sprite.position.set(
      Math.cos(angle) * distance,
      THREE.MathUtils.lerp(CLOUD_MIN_Y, CLOUD_MAX_Y, random()),
      Math.sin(angle) * distance
    );
    sprite.scale.set(scale, scale * (0.42 + random() * 0.2), 1);

    sprite.userData.driftSpeed = (0.35 + random() * 0.7) * (random() > 0.5 ? 1 : -1);
    sprite.userData.baseOpacity = material.opacity;

    group.add(sprite);
    sprites.push(sprite);
  }

  return {
    group,
    // 雲は常にゆっくり流れる。JS側の更新はこれだけに留める。
    update(deltaSeconds) {
      sprites.forEach((sprite) => {
        sprite.position.x += sprite.userData.driftSpeed * deltaSeconds;
        if (sprite.position.x > 150) sprite.position.x = -150;
        if (sprite.position.x < -150) sprite.position.x = 150;
      });
    },
    // 島に降り立ったあとは雲を薄くして、村の視界を邪魔しないようにする
    setVisibility(amount) {
      sprites.forEach((sprite) => {
        sprite.material.opacity = sprite.userData.baseOpacity * amount;
      });
      group.visible = amount > 0.01;
    }
  };
}

function createCloudTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  const gradient = context.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.72)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
