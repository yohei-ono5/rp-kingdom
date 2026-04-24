import * as THREE from 'three';

export const DEFAULT_DOOR_OFFSET = Object.freeze([0, 0, 0.9]);
export const DEFAULT_DOOR_FACING = Object.freeze([0, 0, 1]);

const DEFAULT_CAMERA_OPTIONS = Object.freeze({
  cameraDistance: 2.8,
  cameraHeight: 1.55,
  targetInset: 0.28,
  targetHeight: 1.05
});

export function applyFocusCamera({
  house,
  desiredCameraPosition,
  desiredTarget,
  options = DEFAULT_CAMERA_OPTIONS
}) {
  const doorwayWorld = getHouseDoorwayWorld(house);
  const outwardDirection = getHouseDoorFacingWorld(house);

  desiredCameraPosition.copy(doorwayWorld)
    .addScaledVector(outwardDirection, options.cameraDistance)
    .add(new THREE.Vector3(0, options.cameraHeight, 0));

  desiredTarget.copy(doorwayWorld)
    .addScaledVector(outwardDirection, -options.targetInset)
    .add(new THREE.Vector3(0, options.targetHeight, 0));
}

export function getHouseDoorOffset(house) {
  return new THREE.Vector3(...(house.userData.doorOffset || DEFAULT_DOOR_OFFSET));
}

export function getHouseDoorFacing(house) {
  return new THREE.Vector3(...(house.userData.doorFacing || DEFAULT_DOOR_FACING));
}

export function getHouseDoorwayWorld(house) {
  return house.localToWorld(getHouseDoorOffset(house));
}

export function getHouseDoorFacingWorld(house) {
  const doorwayWorld = getHouseDoorwayWorld(house);
  const forwardSampleWorld = house.localToWorld(
    getHouseDoorOffset(house).add(getHouseDoorFacing(house))
  );
  const outwardDirection = forwardSampleWorld.sub(doorwayWorld).setY(0);

  if (outwardDirection.lengthSq() < 1e-5) {
    outwardDirection.set(0, 0, 1).applyQuaternion(house.quaternion).setY(0);
  }

  return outwardDirection.normalize();
}

export function getHouseDoorAnchorWorld(house, heightOffset = 0) {
  return getHouseDoorwayWorld(house).add(new THREE.Vector3(0, heightOffset, 0));
}

export function worldToScreen(worldPosition, camera, viewport = {}) {
  const projected = worldPosition.clone().project(camera);
  const width = viewport.width || window.innerWidth;
  const height = viewport.height || window.innerHeight;

  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
    visible: projected.z >= -1 && projected.z <= 1
  };
}
