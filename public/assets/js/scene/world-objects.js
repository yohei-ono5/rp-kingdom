import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEFAULT_DOOR_FACING, DEFAULT_DOOR_OFFSET } from '../camera/focus-camera.js';

export function renderDestinationButtons(destinations, viewNav, { getLabel } = {}) {
  if (!viewNav) return;

  viewNav.replaceChildren(
    ...destinations.map((item) => {
      const button = document.createElement('button');
      button.className = 'nav-btn';
      button.type = 'button';
      button.dataset.view = item.id;
      button.textContent = getLabel?.(item) || item.id;
      return button;
    })
  );
}

export async function loadWorldObjects({
  objects,
  villageGroup,
  mapOverlayGroup,
  overlayMaterials,
  mapMarkerMeta,
  houseMaterials,
  houseLights
}) {
  const loader = new GLTFLoader();
  const templateCache = new Map();

  for (const data of objects) {
    if (!data.modelUrl) {
      console.error(`Missing modelUrl for object "${data.id}".`);
      continue;
    }

    let template = templateCache.get(data.modelUrl);

    if (!template) {
      try {
        template = await loadModelTemplate(loader, data.modelUrl, houseMaterials);
        templateCache.set(data.modelUrl, template);
      } catch (error) {
        console.error(`Failed to load model for object "${data.id}".`, error);
        continue;
      }
    }

    addWorldObject({
      template,
      data,
      villageGroup,
      mapOverlayGroup,
      overlayMaterials,
      mapMarkerMeta,
      houseLights
    });
  }
}

function addWorldObject({
  template,
  data,
  villageGroup,
  mapOverlayGroup,
  overlayMaterials,
  mapMarkerMeta,
  houseLights
}) {
  const model = template.clone(true);
  const wrapper = new THREE.Group();

  wrapper.userData = {
    id: data.id,
    url: data.url,
    links: data.links,
    isHouse: true,
    baseScale: data.scale,
    doorOffset: data.doorOffset || DEFAULT_DOOR_OFFSET,
    doorFacing: data.doorFacing || DEFAULT_DOOR_FACING,
    targetHoverScale: 1,
    mapLift: 0
  };

  wrapper.add(model);
  wrapper.position.set(...data.position);
  wrapper.rotation.y = data.rotationY || 0;
  wrapper.scale.setScalar(data.scale);

  if (houseLights) {
    const windowLight = new THREE.PointLight(0xffb566, 0, 6.5, 1.6);
    windowLight.position.set(0, 1.9, 0);
    wrapper.add(windowLight);

    const lanternLight = new THREE.PointLight(0xffd08a, 0, 3.2, 1.8);
    lanternLight.position.set(
      data.doorOffset ? data.doorOffset[0] : DEFAULT_DOOR_OFFSET[0],
      0.6,
      data.doorOffset ? data.doorOffset[2] + 0.25 : DEFAULT_DOOR_OFFSET[2] + 0.25
    );
    wrapper.add(lanternLight);

    houseLights.push(windowLight, lanternLight);
  }

  villageGroup.add(wrapper);
  createMapMarker({
    wrapper,
    mapOverlayGroup,
    overlayMaterials,
    mapMarkerMeta
  });
}

function createMapMarker({
  wrapper,
  mapOverlayGroup,
  overlayMaterials,
  mapMarkerMeta
}) {
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff3b5,
    transparent: true,
    opacity: 0
  });
  overlayMaterials.push(markerMaterial);

  const marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 24),
    markerMaterial
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(wrapper.position.x, 0.16, wrapper.position.z);
  mapOverlayGroup.add(marker);

  mapMarkerMeta.push({
    mesh: marker,
    homeY: marker.position.y
  });
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

async function loadModelTemplate(loader, url, houseMaterials) {
  const model = await loadModelScene(loader, url);
  applyOpaqueMaterialFix(model, houseMaterials);
  centerModelOnGround(model);
  return model;
}

function applyOpaqueMaterialFix(root, houseMaterials) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;

      const hadTransparency = material.transparent || material.opacity < 1;
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
      material.depthTest = true;

      if (!material.alphaMap && material.side !== THREE.FrontSide) {
        material.side = THREE.FrontSide;
      }

      if (material.alphaMap || hadTransparency) {
        material.alphaTest = Math.max(material.alphaTest || 0, 0.45);
      } else {
        material.alphaTest = 0;
      }

      material.needsUpdate = true;
      houseMaterials.push(material);
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
