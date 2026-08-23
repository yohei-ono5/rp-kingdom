import * as THREE from 'three';

// 水。モデルではなくシェーダで作る領域なので、手続き生成が最も効くところ。
// 写実的な反射は狙わず、色の帯と動く泡でトゥーン寄りに寄せる。

const WATER_UNIFORMS = () => ({
  uTime: { value: 0 },
  uDeep: { value: new THREE.Color(0x3f6b7a) },
  uShallow: { value: new THREE.Color(0x6f9aa3) },
  uFoam: { value: new THREE.Color(0xeef0e6) },
  uWaveHeight: { value: 0.34 },
  uFlow: { value: 0 },
  uFoamEdge: { value: 0 }
});

const VERTEX_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uWaveHeight;

  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vWave;

  #include <fog_pars_vertex>

  void main() {
    vUv = uv;

    vec3 transformed = position;
    vec4 world = modelMatrix * vec4( position, 1.0 );

    // うねりは正弦波を数本重ねるだけで十分に見える
    float wave =
      sin( world.x * 0.11 + uTime * 0.75 ) * 0.44 +
      sin( world.z * 0.16 - uTime * 0.55 ) * 0.32 +
      sin( ( world.x + world.z ) * 0.06 + uTime * 1.05 ) * 0.24;

    transformed.z += wave * uWaveHeight;
    vWave = wave;

    vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
    vWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform float uFlow;
  uniform float uFoamEdge;

  varying vec2 vUv;
  varying vec3 vWorld;
  varying float vWave;

  #include <fog_pars_fragment>

  void main() {
    // うねりの山を明るく、谷を暗くして水面の起伏を色で見せる
    float lift = smoothstep( -0.5, 0.7, vWave );
    vec3 color = mix( uDeep, uShallow, lift );

    // 泡は塊ではなく、うねりに沿って走る細い筋にする。
    // 波形を横に蛇行させると、等間隔の縞に見えない。
    float scroll = uTime * ( 0.5 + uFlow * 1.1 );
    float meander = sin( vWorld.x * 0.075 ) * 3.4 + sin( vWorld.x * 0.021 + 1.7 ) * 5.2;
    float streak = sin( vWorld.z * 0.42 + meander + scroll + vWave * 1.6 );
    float crest = smoothstep( 0.1, 0.85, vWave );
    color = mix( color, uFoam, smoothstep( 0.9, 0.995, streak ) * ( 0.35 + crest * 0.5 ) );

    // 岸際の泡。川ではUVの端、海では使わない。
    if ( uFoamEdge > 0.5 ) {
      float edge = min( vUv.y, 1.0 - vUv.y );
      float ripple = sin( vUv.x * 46.0 - uTime * 2.1 ) * 0.02;
      color = mix( uFoam, color, smoothstep( 0.02, 0.14 + ripple, edge ) );
    }

    gl_FragColor = vec4( color, 1.0 );

    #include <fog_fragment>
  }
`;

function createWaterMaterial({ flow = 0, foamEdge = false, waveHeight = 0.34, deep, shallow }) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    WATER_UNIFORMS()
  ]);

  uniforms.uFlow.value = flow;
  uniforms.uFoamEdge.value = foamEdge ? 1 : 0;
  uniforms.uWaveHeight.value = waveHeight;
  if (deep) uniforms.uDeep.value = new THREE.Color(deep);
  if (shallow) uniforms.uShallow.value = new THREE.Color(shallow);

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    fog: true,
    side: THREE.DoubleSide
  });
}

// 海。板1枚とシェーダだけ。分割はうねりを出すぶんだけあればよい。
export function createSea({
  size = 320,
  segments = 90,
  waveHeight = 0.5
} = {}) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const mesh = new THREE.Mesh(
    geometry,
    createWaterMaterial({ waveHeight, deep: 0x3a6474, shallow: 0x74a0a6 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = 'procedural-sea';
  return mesh;
}

// 川。曲線に沿ってリボンを張り、UVのvを幅方向に取って岸際に泡を出す。
export function createRiver({
  points,
  width = 4,
  segments = 160,
  waveHeight = 0.1
} = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point))
  );

  const positions = [];
  const uvs = [];
  const indices = [];

  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent);
    // 水面は水平なので、法線は上向き固定でよい
    side.set(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);

    positions.push(point.x - side.x, point.y, point.z - side.z);
    positions.push(point.x + side.x, point.y, point.z + side.z);
    uvs.push(t * segments * 0.12, 0);
    uvs.push(t * segments * 0.12, 1);
  }

  for (let index = 0; index < segments; index += 1) {
    const a = index * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geometry,
    createWaterMaterial({
      flow: 1,
      foamEdge: true,
      waveHeight,
      deep: 0x4a7382,
      shallow: 0x82a8ac
    })
  );
  mesh.name = 'procedural-river';
  mesh.userData.curve = curve;
  return mesh;
}

// 川岸の小石。川だけだと地面から浮いて見えるので縁を石で締める。
export function createRiverBank(curve, {
  width = 4,
  count = 90,
  seed = 1
} = {}) {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b8479,
    roughness: 1,
    metalness: 0,
    flatShading: true
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count * 2);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  let instance = 0;

  for (let index = 0; index < count; index += 1) {
    const t = index / count;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent);
    side.set(-tangent.z, 0, tangent.x).normalize();

    for (const direction of [-1, 1]) {
      const offset = (width / 2) * (0.92 + random() * 0.3) * direction;
      const size = 0.16 + random() * 0.26;
      position.set(
        point.x + side.x * offset + (random() - 0.5) * 0.4,
        point.y - size * 0.2,
        point.z + side.z * offset + (random() - 0.5) * 0.4
      );
      euler.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      quaternion.setFromEuler(euler);
      scale.set(size, size * 0.7, size);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(instance, matrix);
      instance += 1;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'procedural-river-bank';
  return mesh;
}

// 水面の更新はこれだけ。JS 側の計算はほぼゼロで、動きは全部シェーダが持つ。
export function updateWater(mesh, elapsedSeconds) {
  const uniforms = mesh?.material?.uniforms;
  if (uniforms?.uTime) uniforms.uTime.value = elapsedSeconds;
}
