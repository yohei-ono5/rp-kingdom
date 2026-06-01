import * as THREE from 'three';

const ROAD_Y = 0.028;
const SEGMENTS_PER_UNIT = 3.2;

export function initRoads({
  paths,
  parentGroup
}) {
  if (!parentGroup || !Array.isArray(paths)) return;

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: createAsphaltTexture(),
    color: 0xb4bfbb,
    roughness: 0.96,
    metalness: 0.0
  });

  paths.forEach((path, pathIndex) => {
    const curvePoints = resolveCurvePoints(path.points);
    if (curvePoints.length < 2) return;

    const layerLift = pathIndex * 0.0012;
    const roadMesh = new THREE.Mesh(
      createRoadGeometry({
        points: curvePoints,
        width: path.width || 3.2,
        y: ROAD_Y + layerLift,
        textureRepeat: path.textureRepeat || 2
      }),
      roadMaterial
    );
    roadMesh.receiveShadow = true;
    roadMesh.userData = { id: path.id, isRoad: true };
    parentGroup.add(roadMesh);
  });
}

function resolveCurvePoints(points = []) {
  const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  if (vectors.length < 3) return vectors;

  const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0.35);
  const length = curve.getLength();
  return curve.getPoints(Math.max(10, Math.ceil(length * SEGMENTS_PER_UNIT)));
}

function createRoadGeometry({
  points,
  width,
  y,
  textureRepeat
}) {
  const halfWidth = width / 2;
  const vertices = [];
  const uvs = [];
  const indices = [];
  let distance = 0;

  points.forEach((point, index) => {
    if (index > 0) {
      distance += point.distanceTo(points[index - 1]);
    }

    const normal = getFlatNormal(points, index);
    const left = point.clone().addScaledVector(normal, halfWidth);
    const right = point.clone().addScaledVector(normal, -halfWidth);
    const u = distance / Math.max(0.001, width * textureRepeat);

    vertices.push(left.x, y, left.z, right.x, y, right.z);
    uvs.push(u, 0, u, 1);

    if (index > 0) {
      const row = index * 2;
      indices.push(row - 2, row, row - 1, row - 1, row, row + 1);
    }
  });

  return buildGeometry(vertices, uvs, indices);
}

function buildGeometry(vertices, uvs, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function getFlatNormal(points, index) {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const tangent = next.clone().sub(previous);

  if (tangent.lengthSq() < 0.0001) {
    tangent.set(0, 0, 1);
  }

  tangent.y = 0;
  tangent.normalize();
  return new THREE.Vector3(-tangent.z, 0, tangent.x);
}

function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const context = canvas.getContext('2d');
  context.fillStyle = '#9ca8a5';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 5000; i += 1) {
    const shade = 120 + Math.floor(Math.random() * 92);
    const alpha = 0.05 + Math.random() * 0.16;
    const size = Math.random() < 0.86 ? 1 : 2;
    context.fillStyle = `rgba(${shade}, ${shade + 4}, ${shade + 2}, ${alpha})`;
    context.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      size,
      size
    );
  }

  for (let i = 0; i < 130; i += 1) {
    context.fillStyle = `rgba(235, 242, 238, ${0.08 + Math.random() * 0.14})`;
    context.beginPath();
    context.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      0.7 + Math.random() * 1.6,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
