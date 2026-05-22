import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_BOUNDS = Object.freeze({
  minX: -24,
  maxX: 24,
  minZ: -24,
  maxZ: 24
});

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler();
const tempScale = new THREE.Vector3();

export async function initTrees({
  treeConfig,
  parentGroup,
  exclusions = []
}) {
  if (!treeConfig?.modelUrl || !parentGroup) {
    return [];
  }

  const loader = new GLTFLoader();
  const model = await loadModelScene(loader, treeConfig.modelUrl);
  prepareTreeTemplate(model);
  centerModelOnGround(model);

  const placements = generateTreePlacements({
    treeConfig,
    exclusions
  });

  addInstancedTrees({
    model,
    placements,
    parentGroup
  });

  return placements;
}

function addInstancedTrees({
  model,
  placements,
  parentGroup
}) {
  if (!placements.length) return;

  const sourceMeshes = [];
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (child.isMesh) {
      sourceMeshes.push(child);
    }
  });

  sourceMeshes.forEach((sourceMesh) => {
    const instancedMesh = new THREE.InstancedMesh(
      sourceMesh.geometry,
      sourceMesh.material,
      placements.length
    );

    instancedMesh.castShadow = sourceMesh.castShadow;
    instancedMesh.receiveShadow = sourceMesh.receiveShadow;
    instancedMesh.frustumCulled = false;

    placements.forEach((placement, index) => {
      tempPosition.set(placement.x, 0, placement.z);
      tempEuler.set(0, placement.rotationY, 0);
      tempQuaternion.setFromEuler(tempEuler);
      tempScale.setScalar(placement.scale);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      tempMatrix.multiply(sourceMesh.matrixWorld);
      instancedMesh.setMatrixAt(index, tempMatrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    parentGroup.add(instancedMesh);
  });
}

export function createTreeExclusions({
  houses = [],
  plots = [],
  billboards = [],
  padding = 1.7
}) {
  const zones = [];

  houses.forEach((house) => {
    zones.push({
      type: 'circle',
      x: house.position[0],
      z: house.position[2],
      radius: (house.clearRadius || 3.1) + padding
    });
  });

  plots.forEach((plot) => {
    zones.push({
      type: 'box',
      x: plot.position[0],
      z: plot.position[2],
      halfWidth: (plot.width || 4.5) / 2 + padding,
      halfDepth: (plot.depth || 4.5) / 2 + padding,
      rotationY: plot.rotationY || 0
    });
  });

  billboards.forEach((billboard) => {
    zones.push({
      type: 'circle',
      x: billboard.position[0],
      z: billboard.position[2],
      radius: Math.max(billboard.width || 4, billboard.height || 2.25) * 0.65 + padding
    });
  });

  return zones;
}

function generateTreePlacements({
  treeConfig,
  exclusions
}) {
  const bounds = treeConfig.bounds || DEFAULT_BOUNDS;
  const random = createSeededRandom(treeConfig.seed || 1);
  const count = treeConfig.count || 24;
  const minDistance = treeConfig.minDistance || 2.0;
  const scaleRange = treeConfig.scaleRange || [0.65, 1.0];
  const placements = [];
  const maxAttempts = count * 80;

  for (let attempt = 0; attempt < maxAttempts && placements.length < count; attempt += 1) {
    const x = THREE.MathUtils.lerp(bounds.minX, bounds.maxX, random());
    const z = THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, random());

    if (treeConfig.centerClearRadius && Math.hypot(x, z) < treeConfig.centerClearRadius) {
      continue;
    }

    if (isInExclusion(x, z, exclusions)) {
      continue;
    }

    const tooCloseToTree = placements.some((placement) => {
      const dx = placement.x - x;
      const dz = placement.z - z;
      return Math.hypot(dx, dz) < minDistance;
    });

    if (tooCloseToTree) {
      continue;
    }

    placements.push({
      x,
      z,
      rotationY: random() * Math.PI * 2,
      scale: THREE.MathUtils.lerp(scaleRange[0], scaleRange[1], random())
    });
  }

  return placements;
}

function isInExclusion(x, z, exclusions) {
  return exclusions.some((zone) => {
    if (zone.type === 'circle') {
      return Math.hypot(x - zone.x, z - zone.z) < zone.radius;
    }

    if (zone.type === 'box') {
      const dx = x - zone.x;
      const dz = z - zone.z;
      const cos = Math.cos(-(zone.rotationY || 0));
      const sin = Math.sin(-(zone.rotationY || 0));
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      return Math.abs(localX) < zone.halfWidth && Math.abs(localZ) < zone.halfDepth;
    }

    return false;
  });
}

function prepareTreeTemplate(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;
      material.depthWrite = true;
      material.depthTest = true;
      material.side = THREE.FrontSide;
      material.needsUpdate = true;
    });
  });
}

function centerModelOnGround(modelRoot) {
  const box = new THREE.Box3().setFromObject(modelRoot);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  modelRoot.position.sub(center);
  modelRoot.position.y += size.y / 2;
}

function loadModelScene(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject
    );
  });
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
