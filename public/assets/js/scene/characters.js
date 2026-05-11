import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_CHARACTER_HEIGHT = 1.7;
const DEFAULT_MOVEMENT_BOUNDS = Object.freeze({
  minX: -24,
  maxX: 24,
  minZ: 0,
  maxZ: 9
});
const DEFAULT_SPEED_RANGE = Object.freeze([0.45, 0.75]);
const DEFAULT_PAUSE_RANGE = Object.freeze([1.2, 5.0]);
const DEFAULT_OBSTACLE_RADIUS = 0.36;
const ROOT_MOTION_NODE_NAMES = new Set(['Root', 'Armature']);

export async function initCharacters({
  characters = [],
  parentGroup,
  mixers = [],
  actors = [],
  obstacles = []
}) {
  if (!parentGroup || !characters.length) {
    return [];
  }

  const loader = new GLTFLoader();
  const instances = [];

  for (const character of characters) {
    if (!character.modelUrl) continue;

    try {
      const gltf = await loadGltf(loader, character.modelUrl);
      const instance = createCharacterInstance(gltf, character, mixers, obstacles);
      parentGroup.add(instance);
      actors.push(instance);
      instances.push(instance);
    } catch (error) {
      console.error(`Failed to load character "${character.id}".`, error);
    }
  }

  return instances;
}

export function createCharacterObstacles({
  houses = [],
  plots = [],
  billboards = [],
  padding = 0.55
}) {
  const obstacles = [];

  houses.forEach((house) => {
    obstacles.push({
      type: 'circle',
      x: house.position[0],
      z: house.position[2],
      radius: (house.clearRadius || 2.45) + padding
    });
  });

  plots.forEach((plot) => {
    obstacles.push({
      type: 'box',
      x: plot.position[0],
      z: plot.position[2],
      halfWidth: (plot.width || 4.5) / 2 + padding,
      halfDepth: (plot.depth || 4.5) / 2 + padding,
      rotationY: plot.rotationY || 0
    });
  });

  billboards.forEach((billboard) => {
    obstacles.push({
      type: 'circle',
      x: billboard.position[0],
      z: billboard.position[2],
      radius: Math.max(billboard.width || 4, billboard.height || 2.25) * 0.55 + padding
    });
  });

  return obstacles;
}

export function updateCharacterAnimations({
  mixers,
  actors = [],
  deltaTime
}) {
  mixers.forEach((mixer) => mixer.update(deltaTime));
  actors.forEach((actor) => updateNpcMovement(actor, deltaTime));
}

function createCharacterInstance(gltf, character, mixers, obstacles) {
  const model = gltf.scene;
  const wrapper = new THREE.Group();

  prepareCharacterModel(model);
  normalizeModelHeight(model, character.height || DEFAULT_CHARACTER_HEIGHT);
  alignModelToGround(model);

  wrapper.add(model);
  wrapper.position.set(...(character.position || [0, 0, 0]));
  wrapper.rotation.y = character.rotationY || 0;
  wrapper.userData = {
    id: character.id,
    isCharacter: true,
    npcState: createNpcState(character, wrapper.position, obstacles)
  };

  const clip = gltf.animations?.[character.animationIndex || 0];
  if (clip) {
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(removeRootMotionTracks(clip));
    action.play();
    if (wrapper.userData.npcState) {
      wrapper.userData.npcState.action = action;
    }
    mixers.push(mixer);
  }

  return wrapper;
}

function createNpcState(character, startPosition, obstacles) {
  const movement = character.movement || {};

  if (!movement.enabled) {
    return null;
  }

  const bounds = {
    ...DEFAULT_MOVEMENT_BOUNDS,
    ...(movement.bounds || {})
  };
  const direction = startPosition.x > (bounds.minX + bounds.maxX) / 2 ? -1 : 1;
  const random = createSeededRandom(hashString(character.id || 'character'));

  const state = {
    bounds,
    random,
    status: 'walking',
    direction,
    speed: pickRange(movement.speedRange || DEFAULT_SPEED_RANGE, random),
    speedRange: movement.speedRange || DEFAULT_SPEED_RANGE,
    pauseRange: movement.pauseRange || DEFAULT_PAUSE_RANGE,
    obstacles,
    obstacleRadius: movement.obstacleRadius || DEFAULT_OBSTACLE_RADIUS,
    waitTime: 0,
    facingOffset: movement.facingOffset || 0
  };

  state.target = pickWalkTarget({
    state,
    y: startPosition.y,
    preferDirection: direction,
    currentPosition: startPosition
  });

  return state;
}

function updateNpcMovement(actor, deltaTime) {
  const state = actor.userData?.npcState;
  if (!state) return;

  if (state.status === 'waiting') {
    if (state.action) {
      state.action.timeScale = 0;
    }
    state.waitTime -= deltaTime;
    if (state.waitTime > 0) return;
    beginNextWalk(actor, state);
  }

  const toTarget = state.target.clone().sub(actor.position);
  const distance = toTarget.length();

  if (distance <= 0.04) {
    actor.position.copy(state.target);
    state.status = 'waiting';
    state.waitTime = pickRange(state.pauseRange, state.random);
    return;
  }

  const direction = toTarget.normalize();
  const step = Math.min(distance, state.speed * deltaTime);
  const nextPosition = actor.position.clone().addScaledVector(direction, step);

  if (isBlocked(nextPosition, state)) {
    redirectNpc(actor, state);
    return;
  }

  actor.position.copy(nextPosition);
  actor.rotation.y = Math.atan2(direction.x, direction.z) + state.facingOffset;
}

function beginNextWalk(actor, state) {
  state.status = 'walking';
  if (state.action) {
    state.action.timeScale = 1;
  }
  state.direction *= -1;
  state.speed = pickRange(state.speedRange, state.random);
  state.target.copy(pickWalkTarget({
    state,
    y: actor.position.y,
    preferDirection: state.direction,
    currentPosition: actor.position
  }));
}

function redirectNpc(actor, state) {
  state.direction = state.random() < 0.35 ? -state.direction : state.direction;
  state.speed = pickRange(state.speedRange, state.random);
  state.target.copy(pickWalkTarget({
    state,
    y: actor.position.y,
    preferDirection: state.direction,
    currentPosition: actor.position,
    avoidCurrentLine: true
  }));
}

function pickWalkTarget({
  state,
  y,
  preferDirection,
  currentPosition,
  avoidCurrentLine = false
}) {
  const edgeX = preferDirection > 0 ? state.bounds.maxX : state.bounds.minX;
  const fallbackZ = THREE.MathUtils.clamp(
    currentPosition.z + (state.random() < 0.5 ? -1 : 1) * 2.2,
    state.bounds.minZ,
    state.bounds.maxZ
  );

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const z = pickRange([state.bounds.minZ, state.bounds.maxZ], state.random);
    const candidate = new THREE.Vector3(edgeX, y, z);

    if (avoidCurrentLine && Math.abs(candidate.z - currentPosition.z) < 1.15) {
      continue;
    }

    if (!isBlocked(candidate, state)) {
      return candidate;
    }
  }

  return new THREE.Vector3(edgeX, y, fallbackZ);
}

function isBlocked(position, state) {
  return state.obstacles.some((obstacle) => isInsideObstacle(position, obstacle, state.obstacleRadius));
}

function isInsideObstacle(position, obstacle, radius) {
  if (obstacle.type === 'circle') {
    return Math.hypot(position.x - obstacle.x, position.z - obstacle.z) < obstacle.radius + radius;
  }

  if (obstacle.type === 'box') {
    const dx = position.x - obstacle.x;
    const dz = position.z - obstacle.z;
    const cos = Math.cos(-(obstacle.rotationY || 0));
    const sin = Math.sin(-(obstacle.rotationY || 0));
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return Math.abs(localX) < obstacle.halfWidth + radius
      && Math.abs(localZ) < obstacle.halfDepth + radius;
  }

  return false;
}

function removeRootMotionTracks(clip) {
  const tracks = clip.tracks.filter((track) => !isRootMotionTrack(track));
  return new THREE.AnimationClip(`${clip.name || 'character'}-without-root-motion`, clip.duration, tracks);
}

function isRootMotionTrack(track) {
  const [targetName, propertyName] = track.name.split('.');
  return propertyName === 'position' && ROOT_MOTION_NODE_NAMES.has(targetName);
}

function pickRange(range, random) {
  return THREE.MathUtils.lerp(range[0], range[1], random());
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function prepareCharacterModel(root) {
  root.traverse((child) => {
    if (!child.isMesh && !child.isSkinnedMesh) return;

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

function normalizeModelHeight(modelRoot, targetHeight) {
  const box = new THREE.Box3().setFromObject(modelRoot);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.y <= 0) return;
  modelRoot.scale.multiplyScalar(targetHeight / size.y);
}

function alignModelToGround(modelRoot) {
  const box = new THREE.Box3().setFromObject(modelRoot);
  modelRoot.position.y -= box.min.y;
}

function loadGltf(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      resolve,
      undefined,
      reject
    );
  });
}
