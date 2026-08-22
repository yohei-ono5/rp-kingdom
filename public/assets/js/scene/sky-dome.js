import * as THREE from 'three';

const DOME_RADIUS = 150;
const SUN_DISTANCE = DOME_RADIUS * 0.92;
const CLOUD_COUNT = 11;
const CLOUD_WRAP_X = 130;

const tempTopColor = new THREE.Color();
const tempHorizonColor = new THREE.Color();
const tempSunColor = new THREE.Color();
const tempCloudColor = new THREE.Color();
const tempSunDirection = new THREE.Vector3();

export function createSkyDome(scene) {
  const anchor = new THREE.Group();
  scene.add(anchor);

  const dome = createDomeMesh();
  anchor.add(dome);

  const sunGlow = createSunGlow();
  anchor.add(sunGlow);

  const clouds = createClouds();
  scene.add(clouds.group);

  return {
    update({ timeOfDayState, camera, scene: liveScene, viewTransitionProgress = 0, deltaSeconds = 0 }) {
      anchor.position.copy(camera.position);

      tempHorizonColor.copy(liveScene.fog.color).lerp(new THREE.Color(0xffffff), 0.16);
      tempTopColor.copy(liveScene.background).multiplyScalar(0.94);
      dome.material.uniforms.topColor.value.lerp(tempTopColor, 0.06);
      dome.material.uniforms.horizonColor.value.lerp(tempHorizonColor, 0.06);

      const dayFactor = THREE.MathUtils.clamp(timeOfDayState.sunIntensity / 2.15, 0, 1);

      tempSunDirection.copy(timeOfDayState.sunPosition).normalize();
      sunGlow.position.copy(tempSunDirection).multiplyScalar(SUN_DISTANCE);
      tempSunColor.copy(timeOfDayState.sunColor).lerp(new THREE.Color(0xfff6e0), 0.35);
      sunGlow.material.color.copy(tempSunColor);
      sunGlow.material.opacity = dayFactor * 0.85 * (1 - viewTransitionProgress * 0.5);
      sunGlow.visible = sunGlow.material.opacity > 0.02;
      const sunScale = 26 + dayFactor * 10;
      sunGlow.scale.set(sunScale, sunScale, 1);

      const cloudBrightness = 0.3 + dayFactor * 0.7;
      tempCloudColor
        .set(0xffffff)
        .multiplyScalar(cloudBrightness)
        .lerp(timeOfDayState.sunColor, dayFactor < 0.6 ? 0.32 : 0.12);
      const cloudOpacity = (0.3 + dayFactor * 0.26) * (1 - viewTransitionProgress * 0.65);

      clouds.items.forEach((item) => {
        item.sprite.position.x += item.speed * deltaSeconds;
        if (item.sprite.position.x > CLOUD_WRAP_X) {
          item.sprite.position.x = -CLOUD_WRAP_X;
        }
        item.sprite.material.color.copy(tempCloudColor);
        item.sprite.material.opacity = cloudOpacity * item.opacityScale;
      });
      clouds.group.visible = cloudOpacity > 0.02;
    }
  };
}

function createDomeMesh() {
  const uniforms = {
    topColor: { value: new THREE.Color(0x7fb8df) },
    horizonColor: { value: new THREE.Color(0xa8d4e8) },
    exponent: { value: 0.62 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform float exponent;
      varying vec3 vDirection;
      void main() {
        float h = max(vDirection.y, 0.0);
        float blend = pow(h, exponent);
        gl_FragColor = vec4(mix(horizonColor, topColor, blend), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 24, 14), material);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  return dome;
}

function createSunGlow() {
  const material = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xfff6e0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    fog: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(30, 30, 1);
  sprite.renderOrder = -9;
  return sprite;
}

function createClouds() {
  const group = new THREE.Group();
  const texture = createCloudTexture();
  const random = createSeededRandom(20260612);
  const items = [];

  for (let index = 0; index < CLOUD_COUNT; index += 1) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false
    });

    const sprite = new THREE.Sprite(material);
    const width = 22 + random() * 30;
    sprite.scale.set(width, width * (0.3 + random() * 0.14), 1);
    sprite.position.set(
      THREE.MathUtils.lerp(-CLOUD_WRAP_X, CLOUD_WRAP_X, random()),
      40 + random() * 32,
      THREE.MathUtils.lerp(-110, 60, random())
    );

    items.push({
      sprite,
      speed: 0.5 + random() * 0.7,
      opacityScale: 0.55 + random() * 0.45
    });
    group.add(sprite);
  }

  return { group, items };
}

function createCloudTexture() {
  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const random = createSeededRandom(99173);

  for (let i = 0; i < 26; i += 1) {
    const x = width * (0.16 + random() * 0.68);
    const y = height * (0.34 + random() * 0.36);
    const radius = 14 + random() * 26;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGlowTexture() {
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

  gradient.addColorStop(0, 'rgba(255,252,238,0.95)');
  gradient.addColorStop(0.18, 'rgba(255,244,214,0.55)');
  gradient.addColorStop(0.5, 'rgba(255,236,196,0.16)');
  gradient.addColorStop(1, 'rgba(255,236,196,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
