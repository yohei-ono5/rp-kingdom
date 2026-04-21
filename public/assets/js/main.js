import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VIEW_BLEND_SPEED = 0.08;
const CAMERA_BLEND_SPEED = 0.07;
const HOUSE_SCALE_BLEND_SPEED = 0.1;
const DRAG_THRESHOLD = 6;
const FOCUS_COMPLETE_DISTANCE = 0.32;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 18, 36);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(10, 7, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.4, 0);
controls.minDistance = 8;
controls.maxDistance = 28;
controls.maxPolarAngle = Math.PI * 0.48;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const loader = new GLTFLoader();

const villageGroup = new THREE.Group();
const mapOverlayGroup = new THREE.Group();
scene.add(villageGroup);
scene.add(mapOverlayGroup);

const desiredCameraPosition = camera.position.clone();
const desiredTarget = controls.target.clone();

const backgroundColors = {
  village: new THREE.Color(0x1a1a2e),
  map: new THREE.Color(0x10232d)
};

const fogColors = {
  village: new THREE.Color(0x1a1a2e),
  map: new THREE.Color(0x10232d)
};

const sunPositions = {
  village: new THREE.Vector3(8, 12, 6),
  map: new THREE.Vector3(3.5, 16, 1.2)
};

const overlayMaterials = [];
const houseMaterials = [];
const mapMarkerMeta = [];

const ui = {
  mapToggle: document.getElementById('map-toggle'),
  viewButtons: Array.from(document.querySelectorAll('.nav-btn[data-view]')),
  hudNote: document.getElementById('hud-note')
};

let ground = null;
let ambientLight = null;
let sunLight = null;
let fillLight = null;

let currentView = 'village';
let currentFocusHouse = null;
let pendingUrl = null;
let popupDelayTimer = 0;

let pointerDown = false;
let dragMoved = false;
let pointerStartX = 0;
let pointerStartY = 0;

let focusRequest = null;

const viewTransition = {
  progress: 0
};

const cameraState = {
  village: {
    position: new THREE.Vector3(10, 7, 18),
    target: new THREE.Vector3(0, 1.4, 0)
  },
  map: {
    position: new THREE.Vector3(0, 19.5, 0.01),
    target: new THREE.Vector3(0, 0, 0)
  }
};

const popup = createLinkPopup();

initLights();
initGround();
initMapOverlay();
loadVillage();
addEvents();
applyViewState({ preserveFocus: true });
animate();

function createLinkPopup() {
  const overlay = document.createElement('div');
  overlay.style.display = 'none';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.25)';
  overlay.style.zIndex = '999';

  const popupEl = document.createElement('div');
  popupEl.style.display = 'none';
  popupEl.style.position = 'fixed';
  popupEl.style.left = '50%';
  popupEl.style.top = '50%';
  popupEl.style.transform = 'translate(-50%, -50%)';
  popupEl.style.background = 'rgba(20,16,40,0.96)';
  popupEl.style.color = '#fff4d8';
  popupEl.style.padding = '20px 24px';
  popupEl.style.borderRadius = '16px';
  popupEl.style.border = '1px solid rgba(255,220,140,0.35)';
  popupEl.style.boxShadow = '0 20px 60px rgba(0,0,0,0.45)';
  popupEl.style.zIndex = '1000';
  popupEl.style.minWidth = '300px';
  popupEl.style.fontFamily = 'Georgia, serif';

  const title = document.createElement('div');
  title.id = 'popup-title';
  title.style.fontSize = '20px';
  title.style.marginBottom = '10px';
  title.style.color = '#ffe7a8';
  popupEl.appendChild(title);

  const desc = document.createElement('div');
  desc.textContent = 'この建物のリンク先へ移動しますか？';
  desc.style.fontSize = '14px';
  desc.style.marginBottom = '16px';
  popupEl.appendChild(desc);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '10px';

  const cancel = document.createElement('button');
  cancel.textContent = 'キャンセル';
  cancel.type = 'button';
  cancel.style.padding = '10px 14px';
  cancel.style.borderRadius = '10px';
  cancel.style.border = '1px solid rgba(255,255,255,0.18)';
  cancel.style.background = 'rgba(255,255,255,0.08)';
  cancel.style.color = '#fff';
  cancel.style.cursor = 'pointer';

  const go = document.createElement('button');
  go.textContent = '移動する';
  go.type = 'button';
  go.style.padding = '10px 14px';
  go.style.borderRadius = '10px';
  go.style.border = '1px solid rgba(255,220,140,0.28)';
  go.style.background = 'linear-gradient(135deg, #f0b54a, #d98a2b)';
  go.style.color = '#2a1808';
  go.style.cursor = 'pointer';
  go.style.fontWeight = 'bold';

  actions.appendChild(cancel);
  actions.appendChild(go);
  popupEl.appendChild(actions);

  document.body.appendChild(overlay);
  document.body.appendChild(popupEl);

  const close = () => {
    pendingUrl = null;
    popupEl.style.display = 'none';
    overlay.style.display = 'none';
  };

  cancel.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    close();
  });

  go.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (pendingUrl) {
      if (pendingUrl.startsWith('#')) {
        window.location.hash = pendingUrl;
      } else {
        window.open(pendingUrl, '_blank', 'noopener,noreferrer');
      }
    }

    close();
  });

  overlay.addEventListener('click', close);

  popupEl.openPopup = (name, url) => {
    pendingUrl = url;
    title.textContent = name || 'リンク先';
    overlay.style.display = 'block';
    popupEl.style.display = 'block';
  };

  popupEl.closePopup = close;
  return popupEl;
}

function openLinkPopup(name, url) {
  popup.openPopup(name, url);
}

function closeLinkPopup() {
  popup.closePopup();
}

function initLights() {
  ambientLight = new THREE.AmbientLight(0xfff2dd, 0.95);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffe6c4, 2.0);
  sunLight.position.set(8, 12, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  scene.add(sunLight);

  fillLight = new THREE.DirectionalLight(0x6f86ff, 0.55);
  fillLight.position.set(-6, 5, -4);
  scene.add(fillLight);
}

function initGround() {
  ground = new THREE.Mesh(
    new THREE.CircleGeometry(14, 64),
    new THREE.MeshStandardMaterial({
      color: 0x2f6b3b,
      roughness: 0.96,
      metalness: 0.0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

function initMapOverlay() {
  const gridPositions = [];
  const radius = 13;
  const step = 0.9;

  for (let x = -radius; x <= radius; x += step) {
    for (let z = -radius; z <= radius; z += step) {
      if (Math.hypot(x, z) <= radius) {
        gridPositions.push(x, 0.08, z);
      }
    }
  }

  const dotsGeometry = new THREE.BufferGeometry();
  dotsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(gridPositions, 3)
  );

  const dotsMaterial = new THREE.PointsMaterial({
    color: 0x9ce6ff,
    size: 0.11,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true
  });

  overlayMaterials.push(dotsMaterial);

  const dots = new THREE.Points(dotsGeometry, dotsMaterial);
  mapOverlayGroup.add(dots);

  const rings = [];
  for (let i = 0; i < 3; i += 1) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8dd8ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    overlayMaterials.push(ringMaterial);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.8 + i * 2.3, 3.95 + i * 2.3, 96),
      ringMaterial
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04 + i * 0.015;
    mapOverlayGroup.add(ring);
    rings.push(ring);
  }

  mapOverlayGroup.userData.rings = rings;
}

function loadVillage() {
  const houses = [
    { id: 'home', name: 'Home House', url: '#home', position: [0, 0, 0], scale: 0.72, rotationY: 0.08 },
    { id: 'gallery', name: 'Gallery House', url: '#gallery', position: [-4, 0, 3], scale: 0.68, rotationY: -0.28 },
    { id: 'shop', name: 'Shop House', url: '#shop', position: [4, 0, -3], scale: 0.7, rotationY: 0.35 }
  ];

  houses.forEach(loadHouse);
}

function applyOpaqueMaterialFix(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;

      // GLB側に半透明指定が入っていても、建物が透けて見えないように補正する。
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

function createMapMarker(wrapper) {
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

function loadHouse(data) {
  loader.load('../models/Fantasy_House_6.glb', (gltf) => {
    const model = gltf.scene;

    applyOpaqueMaterialFix(model);
    centerModelOnGround(model);

    const wrapper = new THREE.Group();
    wrapper.userData = {
      id: data.id,
      name: data.name,
      url: data.url,
      isHouse: true,
      baseScale: data.scale,
      targetHoverScale: 1,
      mapLift: 0
    };

    wrapper.add(model);
    wrapper.position.set(...data.position);
    wrapper.rotation.y = data.rotationY || 0;
    wrapper.scale.setScalar(data.scale);

    villageGroup.add(wrapper);
    createMapMarker(wrapper);
  });
}

function addEvents() {
  window.addEventListener('resize', onResize);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLinkPopup();
  });

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  ui.mapToggle?.addEventListener('click', () => {
    setView(currentView === 'map' ? 'village' : 'map', { preserveFocus: false });
  });

  ui.viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.view;
      const house = villageGroup.children.find((item) => item.userData.id === id);

      if (!house) return;
      triggerHouseFocus(house);
    });
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerDown(event) {
  pointerDown = true;
  dragMoved = false;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
}

function onPointerMove(event) {
  if (pointerDown) {
    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragMoved = true;
    }
  }

  if (popup.style.display === 'block') {
    document.body.style.cursor = 'default';
    return;
  }

  const hoveredHouse = getHoveredHouse(event);
  document.body.style.cursor = hoveredHouse ? 'pointer' : 'default';

  villageGroup.children.forEach((house) => {
    const isHovered = hoveredHouse === house && currentView === 'village';
    house.userData.targetHoverScale = isHovered ? 1.04 : 1;
  });
}

function onPointerUp(event) {
  if (!pointerDown) return;
  pointerDown = false;

  // OrbitControlsの回転が入った時点でクリック扱いを止める。
  if (dragMoved) return;
  if (popup.style.display === 'block') return;

  const clickedHouse = getHoveredHouse(event);
  if (!clickedHouse || !clickedHouse.userData.url) return;

  triggerHouseFocus(clickedHouse);
}

function onPointerLeave() {
  pointerDown = false;
  dragMoved = false;
  document.body.style.cursor = 'default';

  villageGroup.children.forEach((house) => {
    house.userData.targetHoverScale = 1;
  });
}

function updateMouseFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getHoveredHouse(event) {
  updateMouseFromEvent(event);
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(villageGroup.children, true);
  if (intersects.length === 0) return null;

  let object = intersects[0].object;
  while (object && !object.userData.isHouse && object.parent) {
    object = object.parent;
  }

  return object?.userData?.isHouse ? object : null;
}

function setView(view, options = {}) {
  currentView = view;

  if (!options.preserveFocus) {
    currentFocusHouse = null;
  }

  if (view !== 'village' || !options.preserveFocus) {
    focusRequest = null;
    clearTimeout(popupDelayTimer);
    closeLinkPopup();
  }

  applyViewState(options);
}

function applyViewState(options = {}) {
  if (currentView === 'map') {
    desiredCameraPosition.copy(cameraState.map.position);
    desiredTarget.copy(cameraState.map.target);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minPolarAngle = 0;
    controls.minDistance = 10;
    controls.maxDistance = 30;
  } else if (currentFocusHouse && options.preserveFocus !== false) {
    applyFocusCamera(currentFocusHouse);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0;
    controls.minDistance = 6.5;
    controls.maxDistance = 28;
  } else {
    desiredCameraPosition.copy(cameraState.village.position);
    desiredTarget.copy(cameraState.village.target);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0;
    controls.minDistance = 8;
    controls.maxDistance = 28;
  }

  syncUiState();
}

function applyFocusCamera(house) {
  const worldPosition = new THREE.Vector3();
  house.getWorldPosition(worldPosition);

  desiredCameraPosition.copy(worldPosition).add(new THREE.Vector3(3.2, 2.4, 4.5));
  desiredTarget.copy(worldPosition).add(new THREE.Vector3(0, 1.1, 0));
}

function triggerHouseFocus(house) {
  clearTimeout(popupDelayTimer);
  closeLinkPopup();

  currentFocusHouse = house;
  setView('village', { preserveFocus: true });
  applyFocusCamera(house);

  focusRequest = {
    name: house.userData.name,
    url: house.userData.url
  };
}

function syncUiState() {
  ui.mapToggle?.classList.toggle('is-active', currentView === 'map');

  ui.viewButtons.forEach((button) => {
    const isActive = currentFocusHouse?.userData?.id === button.dataset.view && currentView === 'village';
    button.classList.toggle('is-active', isActive);
  });

  if (ui.hudNote) {
    ui.hudNote.classList.toggle('is-map', currentView === 'map');
    ui.hudNote.textContent = currentView === 'map'
      ? 'MAP view: top-down camera with dotted overlay.'
      : 'Drag to orbit. Click a house to zoom, then confirm.';
  }
}

function updateFocusPopup() {
  if (!focusRequest) return;

  const cameraDistance = camera.position.distanceTo(desiredCameraPosition);
  const targetDistance = controls.target.distanceTo(desiredTarget);

  if (cameraDistance > FOCUS_COMPLETE_DISTANCE || targetDistance > FOCUS_COMPLETE_DISTANCE) {
    return;
  }

  const { name, url } = focusRequest;
  focusRequest = null;

  popupDelayTimer = window.setTimeout(() => {
    openLinkPopup(name, url);
  }, 120);
}

function updateViewTransition() {
  const targetProgress = currentView === 'map' ? 1 : 0;
  viewTransition.progress += (targetProgress - viewTransition.progress) * VIEW_BLEND_SPEED;

  scene.background.lerpColors(
    backgroundColors.village,
    backgroundColors.map,
    viewTransition.progress
  );
  scene.fog.color.lerpColors(
    fogColors.village,
    fogColors.map,
    viewTransition.progress
  );

  if (ground) {
    ground.material.color.setRGB(
      THREE.MathUtils.lerp(0.184, 0.082, viewTransition.progress),
      THREE.MathUtils.lerp(0.42, 0.19, viewTransition.progress),
      THREE.MathUtils.lerp(0.231, 0.24, viewTransition.progress)
    );
    ground.material.roughness = THREE.MathUtils.lerp(0.96, 0.72, viewTransition.progress);
    ground.material.metalness = THREE.MathUtils.lerp(0.0, 0.12, viewTransition.progress);
  }

  if (ambientLight) {
    ambientLight.intensity = THREE.MathUtils.lerp(0.95, 0.62, viewTransition.progress);
  }

  if (sunLight) {
    sunLight.intensity = THREE.MathUtils.lerp(2.0, 1.1, viewTransition.progress);
    sunLight.position.lerp(
      currentView === 'map' ? sunPositions.map : sunPositions.village,
      0.04
    );
  }

  if (fillLight) {
    fillLight.intensity = THREE.MathUtils.lerp(0.55, 1.1, viewTransition.progress);
  }

  overlayMaterials.forEach((material) => {
    const baseOpacity = material.color?.getHex() === 0xfff3b5 ? 0.95 : 0.6;
    material.opacity = baseOpacity * viewTransition.progress;
  });

  mapOverlayGroup.rotation.y += 0.0015 + viewTransition.progress * 0.0025;

  const rings = mapOverlayGroup.userData.rings || [];
  rings.forEach((ring, index) => {
    ring.scale.setScalar(1 + Math.sin(performance.now() * 0.0014 + index) * 0.015);
  });

  mapMarkerMeta.forEach((marker, index) => {
    marker.mesh.position.y = marker.homeY + Math.sin(performance.now() * 0.002 + index) * 0.03 * viewTransition.progress;
  });

  villageGroup.children.forEach((house) => {
    house.userData.mapLift += ((currentView === 'map' ? 0.2 : 0) - house.userData.mapLift) * 0.08;
    house.position.y = house.userData.mapLift;
  });

  houseMaterials.forEach((material) => {
    if ('roughness' in material) {
      material.roughness = THREE.MathUtils.lerp(0.96, 0.58, viewTransition.progress);
    }
  });
}

function updateHouseScales() {
  villageGroup.children.forEach((house) => {
    const baseScale = house.userData.baseScale || 0.7;
    const hoverScale = house.userData.targetHoverScale || 1;
    const mapScale = THREE.MathUtils.lerp(1, 0.88, viewTransition.progress);
    const finalScale = baseScale * hoverScale * mapScale;

    house.scale.x += (finalScale - house.scale.x) * HOUSE_SCALE_BLEND_SPEED;
    house.scale.y += (finalScale - house.scale.y) * HOUSE_SCALE_BLEND_SPEED;
    house.scale.z += (finalScale - house.scale.z) * HOUSE_SCALE_BLEND_SPEED;
  });
}

function animate() {
  requestAnimationFrame(animate);

  camera.position.lerp(desiredCameraPosition, CAMERA_BLEND_SPEED);
  controls.target.lerp(desiredTarget, CAMERA_BLEND_SPEED);

  updateViewTransition();
  updateHouseScales();
  updateFocusPopup();

  controls.update();
  renderer.render(scene, camera);
}
