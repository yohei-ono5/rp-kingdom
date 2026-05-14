import * as THREE from 'three';

const PARTICLE_COUNT_DESKTOP = 5600;
const PARTICLE_COUNT_MOBILE = 2200;
const FIELD_RADIUS = 34;
const FIELD_HEIGHT = 20;
const BASE_OPACITY = 0.82;
const MAP_OPACITY_MULTIPLIER = 0.18;
const INTRO_OPACITY_BOOST = 1.18;
const PARTICLE_SETTLE_FADE_START = 0.96;

const tempVector = new THREE.Vector3();
const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();
const tempC = new THREE.Vector3();
const tempUv = new THREE.Vector2();
const fallbackParticleColor = new THREE.Color(0xd9f5ff);
const pastelLiftColor = new THREE.Color(0xf3fbff);
const pastelCoolTint = new THREE.Color(0xcfeeff);
const textureCanvasCache = new WeakMap();

export function createParticleField(scene) {
  const count = isCompactViewport() ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const radius = Math.sqrt(Math.random()) * FIELD_RADIUS;
    const angle = Math.random() * Math.PI * 2;
    const heightBias = Math.random() ** 1.7;
    const positionIndex = index * 3;
    const seedIndex = index * 4;

    positions[positionIndex] = Math.cos(angle) * radius + THREE.MathUtils.randFloatSpread(3.2);
    positions[positionIndex + 1] = 1.8 + heightBias * FIELD_HEIGHT;
    positions[positionIndex + 2] = Math.sin(angle) * radius + THREE.MathUtils.randFloatSpread(3.2);

    targets[positionIndex] = positions[positionIndex];
    targets[positionIndex + 1] = positions[positionIndex + 1];
    targets[positionIndex + 2] = positions[positionIndex + 2];

    seeds[seedIndex] = Math.random() * Math.PI * 2;
    seeds[seedIndex + 1] = THREE.MathUtils.randFloat(0.45, 1.55);
    seeds[seedIndex + 2] = THREE.MathUtils.randFloat(0.8, 2.8);
    seeds[seedIndex + 3] = THREE.MathUtils.randFloat(0.35, 1.0);

    sizes[index] = THREE.MathUtils.randFloat(5.5, 13.5);
    colors[positionIndex] = fallbackParticleColor.r;
    colors[positionIndex + 1] = fallbackParticleColor.g;
    colors[positionIndex + 2] = fallbackParticleColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: BASE_OPACITY },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.8) },
      uDriftStrength: { value: 1 },
      uFormationProgress: { value: 0 }
    },
    vertexShader: `
      attribute vec3 aTarget;
      attribute vec4 aSeed;
      attribute float aSize;
      attribute vec3 aColor;

      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uDriftStrength;
      uniform float uFormationProgress;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float easedFormation = smoothstep(0.0, 1.0, uFormationProgress);
        vec3 transformed = mix(position, aTarget, easedFormation);
        float slowTime = uTime * aSeed.y + aSeed.x;
        float verticalLoop = mod(position.y + uTime * (0.34 + aSeed.w * 0.46), ${FIELD_HEIGHT.toFixed(1)});
        float driftFade = 1.0 - easedFormation * 0.78;

        transformed.x += sin(slowTime * 0.74 + position.z * 0.12) * aSeed.z * uDriftStrength * driftFade;
        transformed.z += cos(slowTime * 0.63 + position.x * 0.1) * aSeed.z * 0.72 * uDriftStrength * driftFade;
        transformed.y = mix(1.6 + verticalLoop, transformed.y, easedFormation);
        transformed.y += sin(slowTime * 1.5) * 0.08 * easedFormation;

        vec4 modelViewPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * modelViewPosition;
        gl_PointSize = aSize * uPixelRatio * (34.0 / max(8.0, -modelViewPosition.z));

        vColor = aColor;
        vAlpha = smoothstep(0.0, 3.6, verticalLoop) * (1.0 - smoothstep(${(FIELD_HEIGHT - 2.6).toFixed(1)}, ${FIELD_HEIGHT.toFixed(1)}, verticalLoop));
      }
    `,
    fragmentShader: `
      uniform float uOpacity;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        float distanceToCenter = length(point);
        float alpha = (1.0 - smoothstep(0.18, 0.5, distanceToCenter)) * vAlpha * uOpacity;

        if (alpha < 0.01) discard;

        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 4;
  scene.add(points);

  return {
    setFormationSubjects(subjects) {
      const sampledTargets = sampleTargetData(subjects, count);
      if (!sampledTargets) return;

      geometry.attributes.aTarget.array.set(sampledTargets.targets);
      geometry.attributes.aColor.array.set(sampledTargets.colors);
      geometry.attributes.aTarget.needsUpdate = true;
      geometry.attributes.aColor.needsUpdate = true;
    },

    update({
      elapsedTime,
      introActive = false,
      formationProgress = 0,
      viewTransitionProgress = 0,
      pixelRatio = window.devicePixelRatio || 1
    }) {
      const mapFade = THREE.MathUtils.lerp(1, MAP_OPACITY_MULTIPLIER, viewTransitionProgress);
      const introBoost = introActive ? INTRO_OPACITY_BOOST : 1;
      const settleFade = introActive ? 1 : 1 - THREE.MathUtils.smoothstep(formationProgress, PARTICLE_SETTLE_FADE_START, 1);
      material.uniforms.uTime.value = elapsedTime;
      material.uniforms.uOpacity.value = BASE_OPACITY * mapFade * introBoost * settleFade;
      material.uniforms.uPixelRatio.value = Math.min(pixelRatio, 1.8);
      material.uniforms.uDriftStrength.value = THREE.MathUtils.lerp(1, 0.42, viewTransitionProgress);
      material.uniforms.uFormationProgress.value = introActive ? 0 : formationProgress;
    }
  };
}

function isCompactViewport() {
  return window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
}

function sampleTargetData(subjects, count) {
  const meshes = [];

  subjects
    .filter(Boolean)
    .forEach((entry) => {
      const subject = entry?.subject || entry;
      const subjectWeight = entry?.weight ?? 1;
      if (!subject) return;
      subject.updateWorldMatrix(true, true);
      subject.traverse((child) => {
        const position = child.geometry?.attributes?.position;
        if (!child.isMesh || !position?.count) return;

        const meshData = buildMeshSampler(child, position, subjectWeight);
        if (!meshData) return;

        meshes.push({
          ...meshData,
          mesh: child,
          position
        });
      });
    });

  if (!meshes.length) {
    return null;
  }

  const totalWeight = meshes.reduce((sum, item) => sum + item.weight, 0);
  const targets = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const meshData = pickWeightedMesh(meshes, totalWeight);
    const targetIndex = index * 3;
    const color = sampleMeshPoint(meshData, tempVector, tempUv);

    targets[targetIndex] = tempVector.x + THREE.MathUtils.randFloatSpread(0.045);
    targets[targetIndex + 1] = tempVector.y + THREE.MathUtils.randFloatSpread(0.045);
    targets[targetIndex + 2] = tempVector.z + THREE.MathUtils.randFloatSpread(0.045);
    colors[targetIndex] = color.r;
    colors[targetIndex + 1] = color.g;
    colors[targetIndex + 2] = color.b;
  }

  return { targets, colors };
}

function pickWeightedMesh(meshes, totalWeight) {
  let cursor = Math.random() * totalWeight;

  for (const meshData of meshes) {
    cursor -= meshData.weight;
    if (cursor <= 0) {
      return meshData;
    }
  }

  return meshes[meshes.length - 1];
}

function buildMeshSampler(mesh, position, subjectWeight = 1) {
  const index = mesh.geometry.index;
  const uv = mesh.geometry.attributes.uv;
  const triangleCount = index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);
  if (triangleCount <= 0) return null;

  const cumulativeAreas = new Float32Array(triangleCount);
  let totalArea = 0;

  mesh.updateWorldMatrix(true, false);

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    const vertexA = getTriangleVertexIndex(index, triangleIndex, 0);
    const vertexB = getTriangleVertexIndex(index, triangleIndex, 1);
    const vertexC = getTriangleVertexIndex(index, triangleIndex, 2);

    tempA.fromBufferAttribute(position, vertexA).applyMatrix4(mesh.matrixWorld);
    tempB.fromBufferAttribute(position, vertexB).applyMatrix4(mesh.matrixWorld);
    tempC.fromBufferAttribute(position, vertexC).applyMatrix4(mesh.matrixWorld);

    const area = tempB.sub(tempA).cross(tempC.sub(tempA)).length() * 0.5;
    totalArea += Math.max(area, 0.0001);
    cumulativeAreas[triangleIndex] = totalArea;
  }

  return {
    cumulativeAreas,
    totalArea,
    uv,
    weight: Math.max(0.0001, Math.pow(totalArea, 0.58) * subjectWeight)
  };
}

function getTriangleVertexIndex(index, triangleIndex, cornerIndex) {
  const attributeIndex = triangleIndex * 3 + cornerIndex;
  return index ? index.getX(attributeIndex) : attributeIndex;
}

function sampleMeshPoint(meshData, target, uvTarget) {
  const triangleIndex = pickTriangleIndex(meshData);
  const index = meshData.mesh.geometry.index;
  const position = meshData.position;
  const vertexA = getTriangleVertexIndex(index, triangleIndex, 0);
  const vertexB = getTriangleVertexIndex(index, triangleIndex, 1);
  const vertexC = getTriangleVertexIndex(index, triangleIndex, 2);
  const randomA = Math.random();
  const randomB = Math.random();
  const sqrtA = Math.sqrt(randomA);
  const weightA = 1 - sqrtA;
  const weightB = sqrtA * (1 - randomB);
  const weightC = sqrtA * randomB;

  tempA.fromBufferAttribute(position, vertexA).applyMatrix4(meshData.mesh.matrixWorld);
  tempB.fromBufferAttribute(position, vertexB).applyMatrix4(meshData.mesh.matrixWorld);
  tempC.fromBufferAttribute(position, vertexC).applyMatrix4(meshData.mesh.matrixWorld);

  target
    .copy(tempA).multiplyScalar(weightA)
    .addScaledVector(tempB, weightB)
    .addScaledVector(tempC, weightC);

  if (meshData.uv) {
    const uvA = new THREE.Vector2().fromBufferAttribute(meshData.uv, vertexA);
    const uvB = new THREE.Vector2().fromBufferAttribute(meshData.uv, vertexB);
    const uvC = new THREE.Vector2().fromBufferAttribute(meshData.uv, vertexC);
    uvTarget
      .copy(uvA).multiplyScalar(weightA)
      .addScaledVector(uvB, weightB)
      .addScaledVector(uvC, weightC);
  } else {
    uvTarget.set(-1, -1);
  }

  return getMaterialSampleColor(meshData.mesh.material, uvTarget);
}

function pickTriangleIndex(meshData) {
  const cursor = Math.random() * meshData.totalArea;
  const areas = meshData.cumulativeAreas;

  for (let index = 0; index < areas.length; index += 1) {
    if (cursor <= areas[index]) {
      return index;
    }
  }

  return areas.length - 1;
}

function getMaterialSampleColor(materialInput, uv) {
  const material = Array.isArray(materialInput)
    ? materialInput.find((item) => item?.map || item?.color || item?.emissive)
    : materialInput;
  const textureColor = sampleTextureColor(material?.map, uv);

  if (textureColor) {
    return toPastelParticleColor(textureColor);
  }

  const color = material?.color?.clone?.() || fallbackParticleColor.clone();
  if (material?.emissive) {
    color.lerp(material.emissive, 0.35);
  }

  return toPastelParticleColor(color);
}

function toPastelParticleColor(color) {
  const pastelColor = color.clone();
  const hsl = { h: 0, s: 0, l: 0 };
  pastelColor.getHSL(hsl);

  hsl.s = THREE.MathUtils.clamp(hsl.s * 0.38, 0.12, 0.34);
  hsl.l = THREE.MathUtils.clamp(hsl.l * 0.52 + 0.46, 0.64, 0.86);
  pastelColor.setHSL(hsl.h, hsl.s, hsl.l);
  pastelColor.lerp(pastelCoolTint, 0.16);
  pastelColor.lerp(pastelLiftColor, 0.22);

  return pastelColor;
}

function sampleTextureColor(texture, uv) {
  const image = texture?.image;
  if (!image || uv.x < 0 || uv.y < 0) return null;

  let cache = textureCanvasCache.get(texture);
  if (cache === false) return null;

  if (!cache) {
    try {
      const width = image.width || image.videoWidth;
      const height = image.height || image.videoHeight;
      if (!width || !height) return null;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, width, height);
      cache = { context, width, height };
      textureCanvasCache.set(texture, cache);
    } catch (error) {
      textureCanvasCache.set(texture, false);
      return null;
    }
  }

  try {
    const x = Math.floor(THREE.MathUtils.euclideanModulo(uv.x, 1) * (cache.width - 1));
    const y = Math.floor((1 - THREE.MathUtils.euclideanModulo(uv.y, 1)) * (cache.height - 1));
    const pixel = cache.context.getImageData(x, y, 1, 1).data;
    return new THREE.Color(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255);
  } catch (error) {
    textureCanvasCache.set(texture, false);
    return null;
  }
}
