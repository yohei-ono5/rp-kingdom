import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 手続き生成の共通部品。
// 生成物は最終的に1メッシュへマージするので、部品をいくら足してもドローコールは1のまま。
// 色はテクスチャではなく頂点カラーで持つ(トゥーン統一と相性が良く、転送量もゼロ)。

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const tempColor = new THREE.Color();

// ジオメトリに頂点カラーを焼き込む。わずかな明度のばらつきが単調さを消す。
export function paint(geometry, color, { random, jitter = 0.07 } = {}) {
  tempColor.set(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const shade = random ? 1 + (random() - 0.5) * jitter : 1;
    colors[index * 3] = tempColor.r * shade;
    colors[index * 3 + 1] = tempColor.g * shade;
    colors[index * 3 + 2] = tempColor.b * shade;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// 部品を集めるための箱。位置・回転を与えて溜め込み、最後に1つへマージする。
export function createPartCollector() {
  const parts = [];

  return {
    add(geometry, color, {
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      random,
      jitter
    } = {}) {
      geometry.rotateX(rotation[0]);
      geometry.rotateY(rotation[1]);
      geometry.rotateZ(rotation[2]);
      geometry.translate(position[0], position[1], position[2]);
      paint(geometry, color, { random, jitter });
      parts.push(geometry);
      return geometry;
    },

    build({ flatShading = false, name = 'procedural' } = {}) {
      if (!parts.length) return null;

      // マージ前に属性を揃える。
      // ExtrudeGeometry だけインデックスを持たないので、全部を非インデックスに寄せる。
      // 部品はどれも小さいので、頂点が増えても実害はない。
      const normalized = parts.map((geometry) => {
        const flat = geometry.index ? geometry.toNonIndexed() : geometry;
        if (flat !== geometry) geometry.dispose();

        if (!flat.attributes.uv) {
          const count = flat.attributes.position.count;
          flat.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        }
        flat.deleteAttribute('normal');
        return flat;
      });

      const merged = mergeGeometries(normalized, false);
      normalized.forEach((geometry) => geometry.dispose());
      merged.computeVertexNormals();

      const mesh = new THREE.Mesh(
        merged,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 1,
          metalness: 0,
          flatShading
        })
      );
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
  };
}
