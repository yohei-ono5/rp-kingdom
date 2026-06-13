import * as THREE from 'three';

const BANK_Y = 0.012;
const WATER_Y = 0.022;
const SEGMENTS_PER_UNIT = 2.2;

// 水面シェーダー: UV の U軸が川の流れ方向(北→南)
const WATER_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WATER_FRAG = `
  uniform float time;
  uniform vec3 shallowColor;
  uniform vec3 deepColor;
  uniform vec3 foamColor;
  uniform float opacity;
  uniform sampler2D noiseMap;
  varying vec2 vUv;

  float sampleNoise(vec2 uv) {
    return texture2D(noiseMap, fract(uv)).r;
  }

  void main() {
    // 2層ノイズを速度差でスクロール(北→南 = U増加方向)
    vec2 uv1 = vec2(vUv.x - time * 0.11, vUv.y * 1.8);
    vec2 uv2 = vec2(vUv.x - time * 0.065 + 0.42, vUv.y * 2.6 + 0.17);
    vec2 uv3 = vec2(vUv.x - time * 0.14 + 0.78, vUv.y * 1.1 + 0.61);

    float n1 = sampleNoise(uv1);
    float n2 = sampleNoise(uv2);
    float n3 = sampleNoise(uv3);
    float ripple = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;

    // 川岸(V=0/1)に泡を出す
    float bankDist = min(vUv.y, 1.0 - vUv.y);
    float edgeFoam = 1.0 - smoothstep(0.0, 0.22, bankDist);
    float rippleFoam = smoothstep(0.72, 1.0, ripple) * 0.28;
    float foam = clamp(edgeFoam + rippleFoam, 0.0, 1.0);

    // 中央が深く暗い、岸が浅く明るい
    float depth = smoothstep(0.0, 0.38, bankDist);
    vec3 baseColor = mix(shallowColor, deepColor, depth);

    // 波紋による輝度変化
    baseColor += vec3((ripple - 0.5) * 0.09);

    // ハイライト
    float highlight = pow(max(n1 - 0.64, 0.0) * 2.8, 2.2);
    baseColor += vec3(highlight * 0.28);

    vec3 color = mix(baseColor, foamColor, foam * 0.6);

    gl_FragColor = vec4(color, opacity);
  }
`;

const DAY_SHALLOW  = new THREE.Color(0x6ab4d8);
const DAY_DEEP     = new THREE.Color(0x2d6e9e);
const NIGHT_SHALLOW = new THREE.Color(0x2a4a72);
const NIGHT_DEEP    = new THREE.Color(0x112238);
const FOAM_COLOR   = new THREE.Color(0xd4eeff);

const tempShallow = new THREE.Color();
const tempDeep    = new THREE.Color();

export function initRivers({
  rivers,
  bridges = [],
  parentGroup
}) {
  if (!parentGroup || !Array.isArray(rivers)) {
    return { update: () => {} };
  }

  const noiseMap = createNoiseTexture();
  const waterUniforms = [];

  rivers.forEach((river) => {
    const curvePoints = resolveCurvePoints(river.points);
    if (curvePoints.length < 2) return;

    const width  = river.width      || 4.5;
    const bankW  = width + (river.bankPadding || 2.6);

    // 川岸(砂・土)
    const bankMesh = new THREE.Mesh(
      createRibbonGeometry({ points: curvePoints, width: bankW, y: BANK_Y }),
      new THREE.MeshStandardMaterial({ color: 0x8a8468, roughness: 1, metalness: 0 })
    );
    bankMesh.receiveShadow = true;
    parentGroup.add(bankMesh);

    // 水面シェーダー
    const uniforms = {
      time:         { value: 0 },
      shallowColor: { value: DAY_SHALLOW.clone() },
      deepColor:    { value: DAY_DEEP.clone() },
      foamColor:    { value: FOAM_COLOR.clone() },
      opacity:      { value: 0.88 },
      noiseMap:     { value: noiseMap }
    };
    waterUniforms.push(uniforms);

    const waterMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent:    true,
      depthWrite:     false,
      side:           THREE.FrontSide
    });
    // リビールシステムが material.opacity を書き換えるので、
    // onBeforeRender でシェーダー uniform に同期する
    waterMaterial.opacity = 0.88;

    const waterMesh = new THREE.Mesh(
      createRibbonGeometry({ points: curvePoints, width, y: WATER_Y }),
      waterMaterial
    );
    waterMesh.onBeforeRender = () => {
      uniforms.opacity.value = waterMaterial.opacity;
    };
    waterMesh.receiveShadow = false;
    waterMesh.userData = { id: river.id, isRiver: true };
    parentGroup.add(waterMesh);
  });

  bridges.forEach((bridge) => {
    parentGroup.add(createBridge(bridge));
  });

  return {
    update({ deltaSeconds = 0, timeOfDayState }) {
      const dayFactor = timeOfDayState
        ? THREE.MathUtils.clamp(timeOfDayState.sunIntensity / 2.15, 0, 1)
        : 1;

      tempShallow.copy(NIGHT_SHALLOW).lerp(DAY_SHALLOW, dayFactor);
      tempDeep.copy(NIGHT_DEEP).lerp(DAY_DEEP, dayFactor);

      waterUniforms.forEach((u) => {
        u.time.value += deltaSeconds;
        u.shallowColor.value.lerp(tempShallow, 0.04);
        u.deepColor.value.lerp(tempDeep, 0.04);
      });
    }
  };
}

// -------- 橋 --------

function createBridge({
  position = [0, 0, 0],
  rotationY = 0,
  length = 6.6,
  width = 3.0
}) {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5433, roughness: 0.92, metalness: 0 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x5e3e24, roughness: 0.95, metalness: 0 });

  const deckH = 0.34;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(length, 0.14, width), woodMat);
  deck.position.y = deckH;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  [-1, 1].forEach((side) => {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, width), woodMat);
    ramp.position.set(side * (length / 2 + 0.65), deckH - 0.13, 0);
    ramp.rotation.z = -side * 0.22;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    group.add(ramp);
  });

  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.09, 0.09), darkMat);
    rail.position.set(0, deckH + 0.74, side * (width / 2 - 0.1));
    rail.castShadow = true;
    group.add(rail);

    for (let p = 0; p <= 3; p += 1) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.78, 6), darkMat);
      post.position.set(
        -length / 2 + 0.35 + p * ((length - 0.7) / 3),
        deckH + 0.36,
        side * (width / 2 - 0.1)
      );
      post.castShadow = true;
      group.add(post);
    }
  });

  group.position.set(...position);
  group.rotation.y = rotationY;
  return group;
}

// -------- ジオメトリ --------

function resolveCurvePoints(points = []) {
  const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  if (vectors.length < 3) return vectors;

  const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0.4);
  const len = curve.getLength();
  return curve.getPoints(Math.max(16, Math.ceil(len * SEGMENTS_PER_UNIT)));
}

function createRibbonGeometry({ points, width, y }) {
  const halfW = width / 2;
  const vertices = [];
  const uvs = [];
  const indices = [];
  let dist = 0;
  const totalLength = points.reduce((acc, p, i) => (
    i === 0 ? acc : acc + p.distanceTo(points[i - 1])
  ), 0);

  points.forEach((point, index) => {
    if (index > 0) dist += point.distanceTo(points[index - 1]);

    const normal = getFlatNormal(points, index);
    const left  = point.clone().addScaledVector(normal,  halfW);
    const right = point.clone().addScaledVector(normal, -halfW);
    const u = dist / Math.max(0.001, totalLength);

    vertices.push(left.x, y, left.z, right.x, y, right.z);
    uvs.push(u, 0, u, 1);

    if (index > 0) {
      const row = index * 2;
      indices.push(row - 2, row, row - 1, row - 1, row, row + 1);
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function getFlatNormal(points, index) {
  const prev = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const tangent = next.clone().sub(prev);
  if (tangent.lengthSq() < 0.0001) tangent.set(0, 0, 1);
  tangent.y = 0;
  tangent.normalize();
  return new THREE.Vector3(-tangent.z, 0, tangent.x);
}

// -------- ノイズテクスチャ(タイル可能) --------

function createNoiseTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4a7a9b';
  ctx.fillRect(0, 0, size, size);

  const random = createSeededRandom(0xdeadbeef);

  // ガウシアンブロブを複数配置。端でラップするよう±size オフセットにも描画
  for (let i = 0; i < 80; i += 1) {
    const bx     = random() * size;
    const by     = random() * size;
    const radius = 8 + random() * 22;
    const alpha  = 0.18 + random() * 0.35;

    for (const ox of [0, size, -size]) {
      for (const oy of [0, size, -size]) {
        const grd = ctx.createRadialGradient(bx + ox, by + oy, 0, bx + ox, by + oy, radius);
        grd.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(bx + ox, by + oy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 流れ方向(横=U軸)の細い筋を追加
  for (let i = 0; i < 30; i += 1) {
    const ly    = random() * size;
    const alpha = 0.08 + random() * 0.18;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth   = 0.8 + random() * 1.8;
    ctx.beginPath();
    let cy = ly;
    ctx.moveTo(0, cy);
    for (let x = 0; x <= size; x += 12) {
      cy = ly + Math.sin((x / size) * Math.PI * (3 + random() * 3)) * 4;
      ctx.lineTo(x, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createSeededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
