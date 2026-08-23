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
import { initVideoBillboards, updateVideoBillboardPlayback } from '../scene/video-billboards.js';
import { createArtDirection } from '../systems/art-direction.js';

// Editions 版のワールド。
// 3D は「紙の上に置かれた挿画」として扱うので、背景は描かず canvas を透過させる。
// 遠景はフォグで紙の色に溶かし、世界は浮島として明示的に縁を持たせる。

const PAPER = 0xf2e6cf;
const ISLAND_RADIUS = 44;
const ISLAND_DEPTH = 19;
// 上面の縁がどれだけ落ちるか。側面の上端もここに合わせないと輪状の隙間が開く。
const ISLAND_EDGE_DROP = 1.2;
const ISLAND_EDGE_START = 0.93;

const TREE_SCATTER_EDITIONS = Object.freeze({
  modelUrl: new URL('../../models/tree_LOD0.glb', import.meta.url).href,
  count: 78,
  seed: 20260822,
  bounds: { minX: -27, maxX: 25, minZ: -27, maxZ: -5 },
  centerClearRadius: 13,
  scaleRange: [0.3, 0.5],
  minDistance: 2.1,
  exclusionPadding: 1.7
});

const WEST_TREE_SCATTER_EDITIONS = Object.freeze({
  ...TREE_SCATTER_EDITIONS,
  count: 40,
  seed: 20260823,
  bounds: { minX: -28, maxX: -16, minZ: -5, maxZ: 22 },
  centerClearRadius: 0,
  scaleRange: [0.32, 0.56]
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

  initRoads({
    paths: extendRoadsToIslandEdge(ROAD_PATHS),
    parentGroup: worldGroup
  });

  // 動画看板を復活。src は再生要求が来るまで設定されないので初期ロードは重くならない。
  const videoBillboards = initVideoBillboards({
    billboards: VIDEO_BILLBOARDS,
    parentGroup: worldGroup,
    clickTargets: []
  });

  const destinations = [...HOUSE_DESTINATIONS, FRONT_HOUSE_DESTINATION];
  const anchors = new Map();
  const anchorsSeed = [];

  const worldObjectsReady = loadWorldObjects({
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
    videoBillboards.forEach((billboard) => {
      if (billboard.userData?.id) anchors.set(billboard.userData.id, billboard);
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

  const treesReady = [TREE_SCATTER_EDITIONS, WEST_TREE_SCATTER_EDITIONS].map((treeConfig) =>
    initTrees({ treeConfig, parentGroup: worldGroup, exclusions })
      .then(() => {
        artDirection.applyToScene();
        renderer.shadowMap.needsUpdate = true;
      })
      .catch((error) => console.error('Failed to scatter trees.', error))
  );

  // ENTER を押せるようになる条件。建物と木が揃うまで待つ。
  const ready = Promise.all([worldObjectsReady, ...treesReady]);

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
    // 動画は再生要求が出て初めて src が設定される。Film 章に近づいたときだけ呼ぶ。
    setVideoActive(active) {
      updateVideoBillboardPlayback({
        billboards: videoBillboards,
        pageVisible: true,
        currentView: active ? 'village' : 'map',
        playbackReady: active
      });
    },
    setFogRange(near, far) {
      scene.fog.near = near;
      scene.fog.far = far;
    },
    render() {
      renderer.render(scene, camera);
    }
  };
}

// 元の道は島の中ほどで途切れてしまうので、両端を接線方向に延ばして縁まで通す。
// 縁の手前(上面が下がり始める半径)で止めるため、道が浮くことはない。
const ROAD_EDGE_RADIUS = ISLAND_RADIUS * 0.91;

function extendRoadsToIslandEdge(paths) {
  return paths.map((path) => {
    const points = path.points.map((point) => [...point]);
    if (points.length < 2) return path;

    const head = extendPastEdge(points[1], points[0]);
    const tail = extendPastEdge(points[points.length - 2], points[points.length - 1]);

    return {
      ...path,
      points: [
        ...(head ? [head] : []),
        ...points,
        ...(tail ? [tail] : [])
      ]
    };
  });
}

// inner から outer への向きに進み、島の縁の半径に達する点を返す
function extendPastEdge(inner, outer) {
  const dirX = outer[0] - inner[0];
  const dirZ = outer[2] - inner[2];
  const length = Math.hypot(dirX, dirZ);
  if (length < 0.0001) return null;

  const nx = dirX / length;
  const nz = dirZ / length;
  const dot = outer[0] * nx + outer[2] * nz;
  const distanceSquared = outer[0] * outer[0] + outer[2] * outer[2];
  const discriminant = dot * dot - distanceSquared + ROAD_EDGE_RADIUS * ROAD_EDGE_RADIUS;
  if (discriminant <= 0) return null;

  const step = -dot + Math.sqrt(discriminant);
  if (step <= 0.2) return null;

  return [outer[0] + nx * step, 0, outer[2] + nz * step];
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

      // 縁だけ落として丸みをつける。中央は完全に平坦(建物や道が浮かないように)。
      const edge = THREE.MathUtils.smoothstep(radiusRatio, ISLAND_EDGE_START, 1);
      positions.push(x, -edge * ISLAND_EDGE_DROP, z);

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
  const rings = 30;
  const segments = 96;
  const random = createSeededRandom(20260825);

  const positions = [];
  const colors = [];
  const indices = [];

  const rock = new THREE.Color(0x8c7d68);
  const deep = new THREE.Color(0x453c37);
  const temp = new THREE.Color();

  // 岩の張り出し。上端と下端では必ず 0 になるので、上面から食み出したり
  // 縁に段差が出たりしない。
  const ridges = Array.from({ length: 13 }, () => ({
    angle: random() * Math.PI * 2,
    width: 0.24 + random() * 0.52,
    amount: 0.04 + random() * 0.1
  }));

  for (let ring = 0; ring <= rings; ring += 1) {
    // t = 0 が最下端の先、t = 1 が上面の縁
    const t = ring / rings;
    // 縁は断崖(ほぼ垂直)から始めて、下へ向かうほど内側へ丸め込む。
    // 縁が斜めだと太陽を正面から受けて白く飛び、裂け目のように見えてしまう。
    const profile = 1 - Math.pow(1 - t, 2.4);
    // t=1 のとき上面の縁とちょうど同じ高さになるようにする
    const y = -ISLAND_EDGE_DROP - (ISLAND_DEPTH - ISLAND_EDGE_DROP) * (1 - t);
    const bulgeScale = 4 * t * (1 - t);

    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;

      let bulge = 0;
      ridges.forEach((ridge) => {
        let delta = Math.abs(angle - ridge.angle);
        if (delta > Math.PI) delta = Math.PI * 2 - delta;
        if (delta > ridge.width) return;
        const falloff = 1 - delta / ridge.width;
        bulge += ridge.amount * falloff * falloff;
      });

      // 外向きに膨らませると草地の半径を超えて庇のように突き出し、
      // そこが陽を受けて白い裂け目に見える。凹凸は必ず内向きにする。
      const inset = Math.min(bulge, 0.22) * bulgeScale;
      const radius = ISLAND_RADIUS * profile * (1 - inset);
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

      const rockMix = THREE.MathUtils.smoothstep(t, 0.02, 0.92);
      // 草の庇の下は陰になる。ここを暗く落とすと上面との境目が締まる。
      const overhang = 1 - THREE.MathUtils.smoothstep(t, 0.86, 1) * 0.42;
      temp.copy(deep).lerp(rock, rockMix)
        .multiplyScalar((0.86 + random() * 0.22) * overhang);
      colors.push(temp.r, temp.g, temp.b);
    }
  }

  const stride = segments + 1;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * stride + segment;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const side = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0
    })
  );
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
