import * as THREE from 'three';

const SKY_RADIUS = 56;
const STAR_COUNT = 240;

export function createSkyObjects(scene) {
  const anchor = new THREE.Group();
  scene.add(anchor);

  const stars = createStarField();
  const moon = createMoonGroup();
  const moonBasePosition = new THREE.Vector3(18, 20, -34);
  moon.position.copy(moonBasePosition);

  anchor.add(stars);
  anchor.add(moon);

  return {
    update({ timeOfDayState, camera, viewTransitionProgress = 0 }) {
      anchor.position.copy(camera.position);

      const nightProgress = getNightProgress(timeOfDayState.hour);
      const visibility = nightProgress * (1 - viewTransitionProgress * 0.22);

      stars.material.opacity = 0.08 + visibility * 0.82;
      stars.visible = visibility > 0.01;
      stars.rotation.y += 0.00012;
      stars.rotation.z = Math.sin(performance.now() * 0.00008) * 0.03;

      moon.visible = visibility > 0.01;
      moon.material.opacity = 0.1 + visibility * 0.92;
      moon.material.color.copy(timeOfDayState.sunColor).lerp(new THREE.Color(0xf4f6ff), 0.72);
      moon.position.copy(moonBasePosition);
      moon.position.y += Math.sin(performance.now() * 0.00035) * 0.45;
      moon.scale.setScalar(0.88 + visibility * 0.22);

      const haloMaterial = moon.userData.haloMaterial;
      haloMaterial.opacity = visibility * 0.26;
      haloMaterial.color.copy(timeOfDayState.fillColor).lerp(new THREE.Color(0xdfe8ff), 0.64);
    }
  };
}

function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);

  for (let index = 0; index < STAR_COUNT; index += 1) {
    const vector = randomUpperHemisphereVector().multiplyScalar(
      THREE.MathUtils.randFloat(SKY_RADIUS * 0.72, SKY_RADIUS)
    );
    positions[index * 3] = vector.x;
    positions[index * 3 + 1] = Math.max(10, vector.y);
    positions[index * 3 + 2] = vector.z;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xf4f6ff,
    size: 0.38,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false
  });

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.renderOrder = 2;
  return points;
}

function createMoonGroup() {
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.25, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf4f6ff,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );
  moon.visible = false;
  moon.renderOrder = 3;

  const haloMaterial = new THREE.SpriteMaterial({
    map: createHaloTexture(),
    color: 0xdfe8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    fog: false
  });
  const halo = new THREE.Sprite(haloMaterial);
  halo.scale.set(8.2, 8.2, 1);
  moon.add(halo);
  moon.userData.haloMaterial = haloMaterial;

  return moon;
}

function createHaloTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );

  gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.26, 'rgba(242,246,255,0.42)');
  gradient.addColorStop(0.6, 'rgba(214,226,255,0.12)');
  gradient.addColorStop(1, 'rgba(214,226,255,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function randomUpperHemisphereVector() {
  const vector = new THREE.Vector3(
    THREE.MathUtils.randFloatSpread(2),
    Math.abs(THREE.MathUtils.randFloatSpread(1.35)) + 0.12,
    THREE.MathUtils.randFloatSpread(2)
  );

  return vector.normalize();
}

function getNightProgress(hour) {
  const normalizedHour = ((hour % 24) + 24) % 24;

  if (normalizedHour >= 21 || normalizedHour < 4.5) {
    return 1;
  }

  if (normalizedHour >= 19.25 && normalizedHour < 21) {
    return THREE.MathUtils.smoothstep(normalizedHour, 19.25, 21);
  }

  if (normalizedHour >= 4.5 && normalizedHour < 6.25) {
    return 1 - THREE.MathUtils.smoothstep(normalizedHour, 4.5, 6.25);
  }

  return 0;
}
