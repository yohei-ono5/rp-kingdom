import * as THREE from 'three';

export function resolveCameraTransitionMode(previousView, nextView) {
  if (previousView === 'intro' && nextView === 'village') {
    return 'intro-enter';
  }

  if (previousView !== 'map' && nextView === 'map') {
    return 'map-enter';
  }

  if (previousView === 'map' && nextView === 'village') {
    return 'map-exit';
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

  if (mode === 'map-exit') {
    return createMapExitTransitionPath({
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
  toTarget
}) {
  const ascendControl = new THREE.Vector3(
    THREE.MathUtils.lerp(fromPosition.x, toPosition.x, 0.12),
    THREE.MathUtils.lerp(fromPosition.y, toPosition.y, 0.7),
    THREE.MathUtils.lerp(fromPosition.z, toPosition.z, 0.12)
  );
  const cruiseControl = new THREE.Vector3(
    THREE.MathUtils.lerp(fromPosition.x, toPosition.x, 0.55),
    THREE.MathUtils.lerp(fromPosition.y, toPosition.y, 0.92),
    THREE.MathUtils.lerp(fromPosition.z, toPosition.z, 0.55)
  );

  const targetMidpoint = fromTarget.clone().lerp(toTarget, 0.5).add(
    new THREE.Vector3(0, 0.4, 0)
  );

  return {
    positionCurve: new THREE.CubicBezierCurve3(
      fromPosition,
      ascendControl,
      cruiseControl,
      toPosition
    ),
    targetCurve: new THREE.QuadraticBezierCurve3(
      fromTarget,
      targetMidpoint,
      toTarget
    )
  };
}

function createMapExitTransitionPath({
  fromPosition,
  fromTarget,
  toPosition,
  toTarget
}) {
  const overTargetControl = new THREE.Vector3(
    toTarget.x,
    THREE.MathUtils.lerp(fromPosition.y, toPosition.y, 0.1),
    toTarget.z
  );
  const settlingControl = new THREE.Vector3(
    toPosition.x,
    THREE.MathUtils.lerp(fromPosition.y, toPosition.y, 0.7),
    toPosition.z
  );

  const targetMidpoint = fromTarget.clone().lerp(toTarget, 0.65).add(
    new THREE.Vector3(0, 0.3, 0)
  );

  return {
    positionCurve: new THREE.CubicBezierCurve3(
      fromPosition,
      overTargetControl,
      settlingControl,
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
  const driftControl = new THREE.Vector3(
    THREE.MathUtils.lerp(fromPosition.x, toPosition.x, 0.22),
    THREE.MathUtils.lerp(fromPosition.y, toPosition.y, 0.32),
    THREE.MathUtils.lerp(fromPosition.z, toPosition.z, 0.22)
  );
  const settlingControl = new THREE.Vector3(
    THREE.MathUtils.lerp(fromPosition.x, toPosition.x, 0.78),
    THREE.MathUtils.lerp(fromPosition.y, toPosition.y, 0.78),
    THREE.MathUtils.lerp(fromPosition.z, toPosition.z, 0.78)
  );
  const targetMidpoint = fromTarget.clone().lerp(toTarget, 0.5).add(
    new THREE.Vector3(0, 0.5, 0)
  );

  return {
    positionCurve: new THREE.CubicBezierCurve3(
      fromPosition,
      driftControl,
      settlingControl,
      toPosition
    ),
    targetCurve: new THREE.QuadraticBezierCurve3(
      fromTarget,
      targetMidpoint,
      toTarget
    )
  };
}
