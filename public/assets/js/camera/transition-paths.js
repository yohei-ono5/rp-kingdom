import * as THREE from 'three';

export function resolveCameraTransitionMode(previousView, nextView) {
  if (previousView === 'intro' && nextView === 'village') {
    return 'intro-enter';
  }

  if (previousView !== 'map' && nextView === 'map') {
    return 'map-enter';
  }

  return 'direct';
}

export function createCameraTransitionPath({
  mode,
  fromPosition,
  fromTarget,
  toPosition,
  toTarget,
  mapPullbackDistance,
  mapPullbackHeight
}) {
  if (mode === 'map-enter') {
    return createMapEnterTransitionPath({
      fromPosition,
      fromTarget,
      toPosition,
      toTarget,
      mapPullbackDistance,
      mapPullbackHeight
    });
  }

  if (mode === 'intro-enter') {
    return createIntroEnterTransitionPath({
      fromPosition,
      fromTarget,
      toPosition,
      toTarget
    });
  }

  return null;
}

function createMapEnterTransitionPath({
  fromPosition,
  fromTarget,
  toPosition,
  toTarget,
  mapPullbackDistance,
  mapPullbackHeight
}) {
  const viewDirection = fromPosition.clone().sub(fromTarget).normalize();
  const sideDirection = new THREE.Vector3()
    .crossVectors(viewDirection, new THREE.Vector3(0, 1, 0))
    .normalize();

  const pullbackControl = fromPosition.clone()
    .add(viewDirection.clone().multiplyScalar(mapPullbackDistance))
    .add(new THREE.Vector3(0, mapPullbackHeight, 0))
    .add(sideDirection.multiplyScalar(0.9));

  const topApproachControl = toPosition.clone()
    .lerp(pullbackControl, 0.22)
    .add(new THREE.Vector3(0, 2.6, 0))
    .add(sideDirection.multiplyScalar(0.35));

  const targetMidpoint = fromTarget.clone().lerp(toTarget, 0.35).add(
    new THREE.Vector3(0, 0.55, 0)
  );

  return {
    positionCurve: new THREE.CubicBezierCurve3(
      fromPosition,
      pullbackControl,
      topApproachControl,
      toPosition
    ),
    targetCurve: new THREE.QuadraticBezierCurve3(
      fromTarget,
      targetMidpoint,
      toTarget
    )
  };
}

function createIntroEnterTransitionPath({
  fromPosition,
  fromTarget,
  toPosition,
  toTarget
}) {
  const firstControl = fromPosition.clone().lerp(toPosition, 0.18).add(
    new THREE.Vector3(-1.6, 5.5, 2.8)
  );
  const secondControl = fromPosition.clone().lerp(toPosition, 0.72).add(
    new THREE.Vector3(1.8, 3.4, -2.6)
  );
  const targetMidpoint = fromTarget.clone().lerp(toTarget, 0.56).add(
    new THREE.Vector3(0, -1.2, 0)
  );

  return {
    positionCurve: new THREE.CubicBezierCurve3(
      fromPosition,
      firstControl,
      secondControl,
      toPosition
    ),
    targetCurve: new THREE.QuadraticBezierCurve3(
      fromTarget,
      targetMidpoint,
      toTarget
    )
  };
}
