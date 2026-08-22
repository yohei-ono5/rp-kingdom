import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// アートディレクション層。
// ?style=toon | pbr | current で質感を切り替えて見比べるための仕組み。
// マテリアルは差し替えず onBeforeCompile で加工する(既存の houseMaterials 等の参照を壊さないため)。

const STYLES = Object.freeze({
  CURRENT: 'current',
  TOON: 'toon',
  PBR: 'pbr'
});

// 5色 + アクセント1色に制限したパレット
export const PALETTE = Object.freeze({
  cream: 0xf2e6cf,
  sage: 0x6f8a63,
  terracotta: 0xb2683f,
  slate: 0x54637f,
  shadow: 0x2e2a3d,
  gold: 0xc9a227
});

const PRESETS = {
  [STYLES.CURRENT]: {
    saturation: 1.0,
    tint: PALETTE.cream,
    tintAmount: 0.0,
    toonSteps: 0,
    roughnessFloor: null,
    ambientScale: 1.0,
    fillScale: 1.0,
    sunScale: 1.0,
    hemiIntensity: 0.0,
    envIntensity: 0.0,
    exposureScale: 1.0
  },
  [STYLES.TOON]: {
    // 写真テクスチャの彩度を大きく落とし、パレット側へ寄せてから階調を段化する
    saturation: 0.48,
    tint: PALETTE.cream,
    tintAmount: 0.26,
    toonSteps: 4,
    roughnessFloor: 1.0,
    // 環境光を絞って太陽を強くしないと階調のバンドが出ない
    ambientScale: 0.34,
    fillScale: 0.34,
    sunScale: 1.42,
    hemiIntensity: 1.25,
    envIntensity: 0.0,
    exposureScale: 1.16
  },
  [STYLES.PBR]: {
    // テクスチャは活かしたまま、環境光と軽い色寄せだけで馴染ませる
    saturation: 0.88,
    tint: PALETTE.cream,
    tintAmount: 0.08,
    toonSteps: 0,
    roughnessFloor: null,
    ambientScale: 0.30,
    fillScale: 0.36,
    sunScale: 1.18,
    hemiIntensity: 0.88,
    envIntensity: 0.85,
    exposureScale: 1.06
  }
};

export function resolveArtStyle() {
  const params = new URLSearchParams(window.location.search);
  const requested = (params.get('style') || '').toLowerCase();
  return Object.values(STYLES).includes(requested) ? requested : STYLES.TOON;
}

export function createArtDirection({ renderer, scene }) {
  const style = resolveArtStyle();
  const preset = PRESETS[style];

  const uniforms = {
    adSaturation: { value: preset.saturation },
    adTint: { value: new THREE.Color(preset.tint) },
    adTintAmount: { value: preset.tintAmount },
    adToonSteps: { value: preset.toonSteps }
  };

  let hemisphereLight = null;

  if (preset.hemiIntensity > 0) {
    hemisphereLight = new THREE.HemisphereLight(
      new THREE.Color(PALETTE.cream).lerp(new THREE.Color(0xbcd4ff), 0.5),
      new THREE.Color(PALETTE.sage).lerp(new THREE.Color(PALETTE.shadow), 0.45),
      preset.hemiIntensity
    );
    scene.add(hemisphereLight);
  }

  if (preset.envIntensity > 0) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }

  return {
    style,
    preset,
    hemisphereLight,

    // シーン内の未処理マテリアルにだけ加工を適用する(多重適用を防ぐ)
    applyToScene(root = scene) {
      if (style === STYLES.CURRENT) return;

      root.traverse((object) => {
        if (!object.isMesh && !object.isInstancedMesh && !object.isPoints) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => treatMaterial(material, style, preset, uniforms));
      });
    },

    // 時刻連動の強度計算にかけるスケール
    scaleAmbient: (value) => value * preset.ambientScale,
    scaleFill: (value) => value * preset.fillScale,
    scaleSun: (value) => value * preset.sunScale,
    scaleExposure: (value) => value * preset.exposureScale
  };
}

function treatMaterial(material, style, preset, uniforms) {
  if (!material || !material.isMaterial) return;
  if (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial) return;
  if (material.userData.artDirection === style) return;

  material.userData.artDirection = style;

  if (preset.roughnessFloor !== null && 'roughness' in material) {
    material.roughness = preset.roughnessFloor;
    material.metalness = 0;
  }

  if (preset.envIntensity > 0 && 'envMapIntensity' in material) {
    material.envMapIntensity = preset.envIntensity;
  }

  const previous = material.onBeforeCompile;

  material.onBeforeCompile = (shader, ...rest) => {
    if (typeof previous === 'function') previous(shader, ...rest);

    shader.uniforms.adSaturation = uniforms.adSaturation;
    shader.uniforms.adTint = uniforms.adTint;
    shader.uniforms.adTintAmount = uniforms.adTintAmount;
    shader.uniforms.adToonSteps = uniforms.adToonSteps;

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float adSaturation;
uniform vec3 adTint;
uniform float adTintAmount;
uniform float adToonSteps;`
      )
      // ベースカラーを脱彩度 → パレットへ寄せる
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  float adLuma = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  diffuseColor.rgb = mix( vec3( adLuma ), diffuseColor.rgb, adSaturation );
  diffuseColor.rgb = mix( diffuseColor.rgb, adTint * ( 0.34 + adLuma * 0.86 ), adTintAmount );
}`
      )
      // 直接光の拡散成分を階調化してトゥーンのバンドを作る
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
if ( adToonSteps > 0.5 ) {
  float adBand = dot( reflectedLight.directDiffuse, vec3( 0.3333 ) );
  if ( adBand > 0.0001 ) {
    float adQuantized = floor( adBand * adToonSteps + 0.5 ) / adToonSteps;
    reflectedLight.directDiffuse *= adQuantized / adBand;
  }
}`
      );
  };

  material.customProgramCacheKey = () => `art-direction-${style}`;
  material.needsUpdate = true;
}
