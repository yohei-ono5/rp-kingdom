import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HOUSE_DESTINATIONS, LAND_PLOTS } from './site-config.js';

const VIEW_BLEND_SPEED = 0.08;
const CAMERA_BLEND_SPEED = 0.07;
const HOUSE_SCALE_BLEND_SPEED = 0.1;
const DRAG_THRESHOLD = 6;
const FOCUS_COMPLETE_DISTANCE = 0.32;
const CAMERA_TRANSITION_DURATION = 1800;
const MAP_PULLBACK_DISTANCE = 5.5;
const MAP_PULLBACK_HEIGHT = 3.8;
const INTRO_TRANSITION_DURATION = 2600;
const FOG_NEAR = 28;
const FOG_FAR = 70;
const CLOCK_UPDATE_INTERVAL = 1000;
const MAX_RENDER_PIXEL_RATIO = 1.35;
const SHADOW_MAP_SIZE = 1024;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x24283d, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(-1.5, 31, 24);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(getRenderPixelRatio());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 10, 0);
controls.minDistance = 8;
controls.maxDistance = 28;
controls.maxPolarAngle = Math.PI * 0.48;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const loader = new GLTFLoader();
const houseModelUrl = new URL('../models/Fantasy_House_6.glb', import.meta.url).href;
const frontHouseModelUrl = new URL('../models/Fantasy_House.glb', import.meta.url).href;
const frontHouseConfig = {
  position: new THREE.Vector3(9.8, 0, 8.6),
  scale: 0.76,
  rotationY: -0.18
};

const villageGroup = new THREE.Group();
const mapOverlayGroup = new THREE.Group();
const sceneryGroup = new THREE.Group();
const landPlotGroup = new THREE.Group();
scene.add(villageGroup);
scene.add(mapOverlayGroup);
scene.add(sceneryGroup);
scene.add(landPlotGroup);

renderViewButtons();

const desiredCameraPosition = camera.position.clone();
const desiredTarget = controls.target.clone();

const backgroundColors = {
  village: new THREE.Color(0x1a1a2e),
  map: new THREE.Color(0x1a1a2e)
};

const fogColors = {
  village: new THREE.Color(0x24283d),
  map: new THREE.Color(0x202534)
};

const mapGroundColor = new THREE.Color(0x3b7852);
const mapAmbientColor = new THREE.Color(0xd9f5ff);
const mapFillColor = new THREE.Color(0xd9f5ff);
const renderSkyColor = new THREE.Color();
const renderFogColor = new THREE.Color();
const renderGroundColor = new THREE.Color();
const renderAmbientColor = new THREE.Color();
const renderFillColor = new THREE.Color();
const renderSunPosition = new THREE.Vector3();

const sunPositions = {
  village: new THREE.Vector3(8, 12, 6),
  map: new THREE.Vector3(3.5, 16, 1.2)
};

const overlayMaterials = [];
const houseMaterials = [];
const mapMarkerMeta = [];
const landPlotTargets = [];
const landPlotMeta = [];

const ui = {
  introOverlay: document.getElementById('intro-overlay'),
  introEnter: document.getElementById('intro-enter'),
  resetView: document.getElementById('reset-view'),
  mapToggle: document.getElementById('map-toggle'),
  viewButtons: Array.from(document.querySelectorAll('.nav-btn[data-view]')),
  hudNote: document.getElementById('hud-note'),
  houseTooltip: document.getElementById('house-tooltip'),
  houseTooltipLabel: document.querySelector('.house-tooltip-label'),
  houseTooltipName: document.querySelector('.house-tooltip-name'),
  todClock: document.getElementById('tod-clock'),
  todLabel: document.getElementById('tod-label'),
  plotPanel: document.getElementById('plot-panel'),
  plotPanelStatus: document.querySelector('.plot-panel-status'),
  plotPanelId: document.querySelector('.plot-panel-id'),
  plotPanelTitle: document.querySelector('.plot-panel-title'),
  plotPanelPrice: document.querySelector('.plot-panel-price'),
  plotPanelSize: document.querySelector('.plot-panel-size'),
  plotPanelDesc: document.querySelector('.plot-panel-desc')
};

let ground = null;
let ambientLight = null;
let sunLight = null;
let fillLight = null;

let currentView = 'intro';
let currentFocusHouse = null;
let currentHoverPlot = null;
let pendingUrl = null;
let popupDelayTimer = 0;

let pointerDown = false;
let dragMoved = false;
let pointerStartX = 0;
let pointerStartY = 0;
let introActive = true;

let focusRequest = null;

const viewTransition = {
  progress: 0
};

const timeOfDayState = {
  lastClockUpdate: 0,
  hour: 12,
  label: '昼',
  sky: new THREE.Color(0x7fb8df),
  fog: new THREE.Color(0xa8d4e8),
  ground: new THREE.Color(0x2f6b3b),
  ambientColor: new THREE.Color(0xfff2dd),
  sunColor: new THREE.Color(0xffe6c4),
  fillColor: new THREE.Color(0x8ba1ff),
  sunPosition: new THREE.Vector3(8, 12, 6),
  ambientIntensity: 1.12,
  sunIntensity: 2.15,
  fillIntensity: 0.82,
  exposure: 1.22
};

const timeOfDayStops = [
  createTimeOfDayStop(0, 0x0d1026, 0x151a2d, 0x1f4a34, 0x6476c8, 0x8ba1ff, 0x7f8cff, [-9, 4, -4], 0.38, 0.06, 0.92, 0.92),
  createTimeOfDayStop(5, 0x394365, 0x4b526d, 0x285c37, 0xffc59a, 0xff9f5a, 0x788cff, [-7, 5, -3], 0.74, 0.95, 0.82, 1.02),
  createTimeOfDayStop(8, 0x8fbfdc, 0xb4d8e8, 0x327341, 0xfff1dc, 0xffdfab, 0x8aa6ff, [7, 10, 5], 1.02, 1.75, 0.76, 1.16),
  createTimeOfDayStop(12, 0x7fb8df, 0xa8d4e8, 0x347943, 0xfff2dd, 0xffe6c4, 0x8ba1ff, [8, 13, 6], 1.12, 2.15, 0.82, 1.22),
  createTimeOfDayStop(16, 0x6fa8cf, 0x8fbfd2, 0x306f3f, 0xffe4c4, 0xffc277, 0x8598ff, [6, 8, 5], 0.98, 1.55, 0.9, 1.12),
  createTimeOfDayStop(18, 0x49385b, 0x665064, 0x275c37, 0xffba88, 0xff8245, 0x7e78ff, [4, 4.8, 3], 0.68, 0.9, 1.0, 1.02),
  createTimeOfDayStop(20, 0x151a33, 0x20263f, 0x214d35, 0x7d8ed8, 0x9aaeff, 0x7e89ff, [-7, 4.2, -4], 0.44, 0.12, 1.05, 0.94),
  createTimeOfDayStop(24, 0x0d1026, 0x151a2d, 0x1f4a34, 0x6476c8, 0x8ba1ff, 0x7f8cff, [-9, 4, -4], 0.38, 0.06, 0.92, 0.92)
];

const cameraTransition = {
  active: false,
  startedAt: 0,
  mode: 'direct',
  fromPosition: camera.position.clone(),
  fromTarget: controls.target.clone(),
  toPosition: camera.position.clone(),
  toTarget: controls.target.clone(),
  path: null
};

const cameraState = {
  intro: {
    position: new THREE.Vector3(-1.5, 31, 24),
    target: new THREE.Vector3(0, 10, 0)
  },
  village: {
    position: new THREE.Vector3(13.5, 15.5, 25.5),
    target: new THREE.Vector3(-1.6, 0.8, 1.6)
  },
  map: {
    position: new THREE.Vector3(-0.8, 28, 1.2),
    target: new THREE.Vector3(-0.8, 0, 1.2)
  }
};

const popup = createLinkPopup();

document.body.classList.add('intro-active');

initLights();
initGround();
initMapOverlay();
initLandPlots();
void loadVillage();
addEvents();
updateTimeOfDayState(true);
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

  const close = ({ resetFocus = false } = {}) => {
    pendingUrl = null;
    popupEl.style.display = 'none';
    overlay.style.display = 'none';

    if (resetFocus) {
      resetToVillageView({ skipPopupClose: true });
    }
  };

  cancel.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    close({ resetFocus: true });
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

  overlay.addEventListener('click', () => {
    close({ resetFocus: true });
  });

  popupEl.openPopup = (name, url) => {
    pendingUrl = url;
    title.textContent = name || 'リンク先';
    overlay.style.display = 'block';
    popupEl.style.display = 'block';
  };

  popupEl.closePopup = close;
  return popupEl;
}

function startIntroExperience() {
  if (!introActive) {
    return;
  }

  introActive = false;
  document.body.classList.remove('intro-active');
  ui.introOverlay?.classList.add('is-hidden');
  ui.introOverlay?.setAttribute('aria-hidden', 'true');
  resetToVillageView({ transitionMode: 'intro-enter' });
}

function openLinkPopup(name, url) {
  popup.openPopup(name, url);
}

function closeLinkPopup() {
  popup.closePopup();
}

function createTimeOfDayStop(
  hour,
  sky,
  fog,
  groundColor,
  ambientColor,
  sunColor,
  fillColor,
  sunPosition,
  ambientIntensity,
  sunIntensity,
  fillIntensity,
  exposure
) {
  return {
    hour,
    sky: new THREE.Color(sky),
    fog: new THREE.Color(fog),
    ground: new THREE.Color(groundColor),
    ambientColor: new THREE.Color(ambientColor),
    sunColor: new THREE.Color(sunColor),
    fillColor: new THREE.Color(fillColor),
    sunPosition: new THREE.Vector3(...sunPosition),
    ambientIntensity,
    sunIntensity,
    fillIntensity,
    exposure
  };
}

function getJstHour() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  );

  const hour = (values.hour || 0) % 24;
  const minute = values.minute || 0;
  const second = values.second || 0;
  return hour + minute / 60 + second / 3600;
}

function getJstClockText() {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
}

function getRenderPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO);
}

function getTimeOfDayLabel(hour) {
  if (hour < 5) return '深夜';
  if (hour < 8) return '朝焼け';
  if (hour < 16) return '昼';
  if (hour < 18) return '午後';
  if (hour < 20) return '夕暮れ';
  return '夜';
}

function sampleTimeOfDay(hour) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const lastIndex = timeOfDayStops.length - 1;
  let start = timeOfDayStops[0];
  let end = timeOfDayStops[lastIndex];

  for (let index = 0; index < lastIndex; index += 1) {
    const candidateStart = timeOfDayStops[index];
    const candidateEnd = timeOfDayStops[index + 1];

    if (normalizedHour >= candidateStart.hour && normalizedHour < candidateEnd.hour) {
      start = candidateStart;
      end = candidateEnd;
      break;
    }
  }

  const span = end.hour - start.hour || 1;
  const progress = smootherStep((normalizedHour - start.hour) / span);

  return {
    label: getTimeOfDayLabel(normalizedHour),
    sky: start.sky.clone().lerp(end.sky, progress),
    fog: start.fog.clone().lerp(end.fog, progress),
    ground: start.ground.clone().lerp(end.ground, progress),
    ambientColor: start.ambientColor.clone().lerp(end.ambientColor, progress),
    sunColor: start.sunColor.clone().lerp(end.sunColor, progress),
    fillColor: start.fillColor.clone().lerp(end.fillColor, progress),
    sunPosition: start.sunPosition.clone().lerp(end.sunPosition, progress),
    ambientIntensity: THREE.MathUtils.lerp(start.ambientIntensity, end.ambientIntensity, progress),
    sunIntensity: THREE.MathUtils.lerp(start.sunIntensity, end.sunIntensity, progress),
    fillIntensity: THREE.MathUtils.lerp(start.fillIntensity, end.fillIntensity, progress),
    exposure: THREE.MathUtils.lerp(start.exposure, end.exposure, progress)
  };
}

function updateTimeOfDayState(force = false) {
  const now = performance.now();
  if (!force && now - timeOfDayState.lastClockUpdate < CLOCK_UPDATE_INTERVAL) {
    return;
  }

  timeOfDayState.lastClockUpdate = now;
  timeOfDayState.hour = getJstHour();
  const sampled = sampleTimeOfDay(timeOfDayState.hour);
  timeOfDayState.label = sampled.label;
  timeOfDayState.sky.copy(sampled.sky);
  timeOfDayState.fog.copy(sampled.fog);
  timeOfDayState.ground.copy(sampled.ground);
  timeOfDayState.ambientColor.copy(sampled.ambientColor);
  timeOfDayState.sunColor.copy(sampled.sunColor);
  timeOfDayState.fillColor.copy(sampled.fillColor);
  timeOfDayState.sunPosition.copy(sampled.sunPosition);
  timeOfDayState.ambientIntensity = sampled.ambientIntensity;
  timeOfDayState.sunIntensity = sampled.sunIntensity;
  timeOfDayState.fillIntensity = sampled.fillIntensity;
  timeOfDayState.exposure = sampled.exposure;

  if (ui.todClock) {
    ui.todClock.textContent = `日本時間 ${getJstClockText()}`;
  }

  if (ui.todLabel) {
    ui.todLabel.textContent = timeOfDayState.label;
  }
}

function initLights() {
  ambientLight = new THREE.AmbientLight(0xfff2dd, 1.12);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffe6c4, 2.15);
  sunLight.position.set(8, 12, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  scene.add(sunLight);

  fillLight = new THREE.DirectionalLight(0x8ba1ff, 0.82);
  fillLight.position.set(-6, 5, -4);
  scene.add(fillLight);
}

function initGround() {
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
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
  mapOverlayGroup.userData.rings = [];
}

function makeForSaleTexture(plot) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  context.fillStyle = '#c48a42';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 22) {
    context.fillStyle = y % 44 === 0
      ? 'rgba(92, 48, 14, 0.18)'
      : 'rgba(255, 234, 184, 0.12)';
    context.fillRect(0, y, canvas.width, 14);
  }

  context.strokeStyle = '#6f3810';
  context.lineWidth = 18;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  context.fillStyle = '#b83218';
  context.fillRect(0, 126, canvas.width, 86);
  context.fillStyle = '#fff8e6';
  context.font = 'bold 54px Georgia, serif';
  context.textAlign = 'center';
  context.fillText(plot.status || 'FOR SALE', canvas.width / 2, 184);

  context.fillStyle = '#3b2108';
  context.font = 'bold 44px sans-serif';
  context.fillText(plot.title || '分譲地', canvas.width / 2, 86);

  context.fillStyle = '#6f3810';
  context.font = '32px Georgia, serif';
  context.fillText(`Plot ${plot.id}`, canvas.width / 2, 266);

  context.fillStyle = '#b83218';
  context.font = 'bold 34px sans-serif';
  context.fillText(plot.price || 'お問い合わせください', canvas.width / 2, 330);

  context.fillStyle = '#6f3810';
  context.font = '24px sans-serif';
  context.fillText(plot.size || '', canvas.width / 2, 382);

  context.fillStyle = 'rgba(75, 43, 11, 0.72)';
  context.font = '22px sans-serif';
  context.fillText('inquiries welcome', canvas.width / 2, 438);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function initLandPlots() {
  LAND_PLOTS.forEach((plot) => {
    const width = plot.width || 4.5;
    const depth = plot.depth || 4.5;
    const group = new THREE.Group();

    group.position.set(...plot.position);
    group.rotation.y = plot.rotationY || 0;
    group.userData = {
      ...plot,
      isLandPlot: true,
      baseY: plot.position?.[1] || 0,
      targetHoverScale: 1,
      targetLift: 0
    };

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x49a655,
      transparent: true,
      opacity: 0.2,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.035;
    floor.userData = { isLandPlotTarget: true, parentPlot: group };
    group.add(floor);
    landPlotTargets.push(floor);

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(width, 0.03, depth)),
      new THREE.LineBasicMaterial({ color: 0xd7f08a, transparent: true, opacity: 0.85 })
    );
    border.position.y = 0.07;
    group.add(border);

    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0xb99361,
      roughness: 0.78
    });

    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([xSign, zSign]) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.58, 6),
        postMaterial
      );
      post.position.set(
        xSign * (width / 2 - 0.16),
        0.29,
        zSign * (depth / 2 - 0.16)
      );
      post.castShadow = true;
      group.add(post);
    });

    const stake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 1.55, 6),
      postMaterial
    );
    stake.position.set(0, 0.78, -depth * 0.28);
    stake.castShadow = true;
    group.add(stake);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.75),
      new THREE.MeshBasicMaterial({
        map: makeForSaleTexture(plot),
        side: THREE.DoubleSide
      })
    );
    sign.position.set(0, 1.72, -depth * 0.28);
    sign.userData = { isLandPlotTarget: true, parentPlot: group };
    group.add(sign);
    landPlotTargets.push(sign);

    landPlotGroup.add(group);
    landPlotMeta.push({
      group,
      floorMaterial,
      borderMaterial: border.material,
      homeY: group.position.y
    });
  });
}

async function loadVillage() {
  const [houseTemplateResult, frontHouseTemplateResult] = await Promise.allSettled([
    loadModelTemplate(houseModelUrl),
    loadModelTemplate(frontHouseModelUrl)
  ]);

  if (houseTemplateResult.status === 'fulfilled') {
    HOUSE_DESTINATIONS.forEach((data) => {
      loadHouseFromTemplate(houseTemplateResult.value, data);
    });
  } else {
    console.error('Failed to load house template.', houseTemplateResult.reason);
  }

  if (frontHouseTemplateResult.status === 'fulfilled') {
    loadFrontHouse(frontHouseTemplateResult.value);
  } else {
    console.error('Failed to load front house model.', frontHouseTemplateResult.reason);
  }
}

function renderViewButtons() {
  const viewNav = document.getElementById('view-nav');
  if (!viewNav) return;

  viewNav.replaceChildren(
    ...HOUSE_DESTINATIONS.map((item) => {
      const button = document.createElement('button');
      button.className = 'nav-btn';
      button.type = 'button';
      button.dataset.view = item.id;
      button.textContent = item.label;
      return button;
    })
  );
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

function loadModelScene(url) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject
    );
  });
}

async function loadModelTemplate(url) {
  const model = await loadModelScene(url);
  applyOpaqueMaterialFix(model);
  centerModelOnGround(model);
  return model;
}

function loadHouseFromTemplate(template, data) {
  const model = template.clone(true);

  const wrapper = new THREE.Group();
  wrapper.userData = {
    id: data.id,
    label: data.label,
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
}

function loadFrontHouse(template) {
  const model = template.clone(true);

  const wrapper = new THREE.Group();
  wrapper.add(model);
  wrapper.position.copy(frontHouseConfig.position);
  wrapper.rotation.y = frontHouseConfig.rotationY;
  wrapper.scale.setScalar(frontHouseConfig.scale);

  sceneryGroup.add(wrapper);
}

function addEvents() {
  window.addEventListener('resize', onResize);

  window.addEventListener('keydown', (event) => {
    if (introActive && event.key === 'Enter') {
      event.preventDefault();
      startIntroExperience();
      return;
    }

    if (event.key === 'Escape') closeLinkPopup();
  });

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  controls.addEventListener('change', onControlsChange);

  ui.mapToggle?.addEventListener('click', () => {
    setView(currentView === 'map' ? 'village' : 'map', { preserveFocus: false });
  });

  ui.resetView?.addEventListener('click', () => {
    resetToVillageView();
  });

  ui.introEnter?.addEventListener('click', () => {
    startIntroExperience();
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
  renderer.setPixelRatio(getRenderPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onControlsChange() {
  if (introActive || cameraTransition.active || currentView === 'map') {
    return;
  }

  desiredCameraPosition.copy(camera.position);
  desiredTarget.copy(controls.target);
}

function onPointerDown(event) {
  if (introActive) return;
  pointerDown = true;
  dragMoved = false;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
}

function onPointerMove(event) {
  if (introActive) {
    hideHouseTooltip();
    hidePlotPanel();
    document.body.style.cursor = 'default';
    return;
  }

  if (pointerDown) {
    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragMoved = true;
    }
  }

  if (popup.style.display === 'block') {
    hideHouseTooltip();
    hidePlotPanel();
    document.body.style.cursor = 'default';
    return;
  }

  const hoveredTarget = getHoveredTarget(event);
  const hoveredHouse = hoveredTarget?.type === 'house' ? hoveredTarget.object : null;
  const hoveredPlot = hoveredTarget?.type === 'plot' ? hoveredTarget.object : null;
  const showHoverState = hoveredHouse && currentView === 'village';
  const showPlotState = hoveredPlot && currentView === 'village';
  document.body.style.cursor = showHoverState || showPlotState ? 'pointer' : 'default';

  villageGroup.children.forEach((house) => {
    const isHovered = hoveredHouse === house && currentView === 'village';
    house.userData.targetHoverScale = isHovered ? 1.04 : 1;
  });

  landPlotGroup.children.forEach((plot) => {
    const isHovered = hoveredPlot === plot && currentView === 'village';
    plot.userData.targetHoverScale = isHovered ? 1.035 : 1;
    plot.userData.targetLift = isHovered ? 0.18 : 0;
  });

  currentHoverPlot = showPlotState ? hoveredPlot : null;

  if (showHoverState) {
    showHouseTooltip(hoveredHouse, event);
    hidePlotPanel();
  } else if (showPlotState) {
    hideHouseTooltip();
    showPlotPanel(hoveredPlot);
  } else {
    hideHouseTooltip();
    hidePlotPanel();
  }
}

function onPointerUp(event) {
  if (introActive) return;
  if (!pointerDown) return;
  pointerDown = false;

  // OrbitControlsの回転が入った時点でクリック扱いを止める。
  if (dragMoved) return;
  if (popup.style.display === 'block') return;

  const clickedTarget = getHoveredTarget(event);
  if (clickedTarget?.type === 'plot') {
    return;
  }

  const clickedHouse = clickedTarget?.type === 'house' ? clickedTarget.object : null;
  if (!clickedHouse?.userData.url) return;

  triggerHouseFocus(clickedHouse);
}

function onPointerLeave() {
  pointerDown = false;
  dragMoved = false;
  document.body.style.cursor = 'default';
  hideHouseTooltip();
  hidePlotPanel();
  currentHoverPlot = null;

  villageGroup.children.forEach((house) => {
    house.userData.targetHoverScale = 1;
  });

  landPlotGroup.children.forEach((plot) => {
    plot.userData.targetHoverScale = 1;
    plot.userData.targetLift = 0;
  });
}

function showHouseTooltip(house, event) {
  if (!ui.houseTooltip || !ui.houseTooltipLabel || !ui.houseTooltipName) {
    return;
  }

  ui.houseTooltipLabel.textContent = house.userData.label || house.userData.id?.toUpperCase() || 'HOUSE';
  ui.houseTooltipName.textContent = house.userData.name || '';
  ui.houseTooltip.style.left = `${event.clientX + 16}px`;
  ui.houseTooltip.style.top = `${event.clientY + 18}px`;
  ui.houseTooltip.classList.add('is-visible');
}

function hideHouseTooltip() {
  ui.houseTooltip?.classList.remove('is-visible');
}

function showPlotPanel(plot) {
  if (!ui.plotPanel) {
    return;
  }

  const data = plot.userData;
  if (ui.plotPanelStatus) ui.plotPanelStatus.textContent = data.status || 'FOR SALE';
  if (ui.plotPanelId) ui.plotPanelId.textContent = `Plot ${data.id}`;
  if (ui.plotPanelTitle) ui.plotPanelTitle.textContent = data.title || '分譲地';
  if (ui.plotPanelPrice) ui.plotPanelPrice.textContent = data.price || '';
  if (ui.plotPanelSize) ui.plotPanelSize.textContent = data.size || '';
  if (ui.plotPanelDesc) ui.plotPanelDesc.textContent = data.description || '';

  ui.plotPanel.classList.add('is-visible');
  ui.plotPanel.setAttribute('aria-hidden', 'false');
}

function hidePlotPanel() {
  ui.plotPanel?.classList.remove('is-visible');
  ui.plotPanel?.setAttribute('aria-hidden', 'true');
}

function updateMouseFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function getHoveredHouse(event) {
  const target = getHoveredTarget(event);
  return target?.type === 'house' ? target.object : null;
}

function getHoveredTarget(event) {
  updateMouseFromEvent(event);
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(
    [...villageGroup.children, ...landPlotTargets],
    true
  );
  if (intersects.length === 0) return null;

  for (const intersect of intersects) {
    let object = intersect.object;
    while (object && !object.userData.isHouse && !object.userData.parentPlot && object.parent) {
      object = object.parent;
    }

    if (object?.userData?.isHouse) {
      return { type: 'house', object };
    }

    if (object?.userData?.parentPlot?.userData?.isLandPlot) {
      return { type: 'plot', object: object.userData.parentPlot };
    }
  }

  return null;
}

function setView(view, options = {}) {
  const previousView = currentView;
  const transitionMode = options.transitionMode || resolveCameraTransitionMode(previousView, view);
  currentView = view;

  if (!options.preserveFocus) {
    currentFocusHouse = null;
  }

  if (view !== 'village' || !options.preserveFocus) {
    focusRequest = null;
    clearTimeout(popupDelayTimer);
    closeLinkPopup();
  }

  applyViewState({ ...options, transitionMode });
  startCameraTransition(transitionMode);
}

function applyViewState(options = {}) {
  if (currentView === 'intro') {
    desiredCameraPosition.copy(cameraState.intro.position);
    desiredTarget.copy(cameraState.intro.target);
    controls.enableRotate = false;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0;
    controls.minDistance = 8;
    controls.maxDistance = 28;
  } else if (currentView === 'map') {
    desiredCameraPosition.copy(cameraState.map.position);
    desiredTarget.copy(cameraState.map.target);
    const deferMapLock = options.transitionMode === 'map-enter';
    controls.enableRotate = deferMapLock;
    controls.maxPolarAngle = deferMapLock ? Math.PI * 0.48 : 0.02;
    controls.minPolarAngle = 0;
    controls.minDistance = 16;
    controls.maxDistance = 34;
  } else if (currentFocusHouse && options.preserveFocus !== false) {
    applyFocusCamera(currentFocusHouse);
    controls.enableRotate = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0;
    controls.minDistance = 6.5;
    controls.maxDistance = 28;
  } else {
    desiredCameraPosition.copy(cameraState.village.position);
    desiredTarget.copy(cameraState.village.target);
    controls.enableRotate = options.transitionMode === 'intro-enter' ? false : true;
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

function resolveCameraTransitionMode(previousView, nextView) {
  if (previousView === 'intro' && nextView === 'village') {
    return 'intro-enter';
  }

  if (previousView !== 'map' && nextView === 'map') {
    return 'map-enter';
  }

  return 'direct';
}

function startCameraTransition(mode) {
  cameraTransition.mode = mode;
  cameraTransition.startedAt = performance.now();
  cameraTransition.fromPosition.copy(camera.position);
  cameraTransition.fromTarget.copy(controls.target);
  cameraTransition.toPosition.copy(desiredCameraPosition);
  cameraTransition.toTarget.copy(desiredTarget);
  cameraTransition.path = mode === 'map-enter'
    ? createMapEnterTransitionPath()
    : mode === 'intro-enter'
      ? createIntroEnterTransitionPath()
      : null;
  cameraTransition.active =
    cameraTransition.fromPosition.distanceTo(cameraTransition.toPosition) > 0.01
    || cameraTransition.fromTarget.distanceTo(cameraTransition.toTarget) > 0.01;
}

function smootherStep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function createMapEnterTransitionPath() {
  const fromPosition = cameraTransition.fromPosition.clone();
  const fromTarget = cameraTransition.fromTarget.clone();
  const toPosition = cameraTransition.toPosition.clone();
  const toTarget = cameraTransition.toTarget.clone();

  const viewDirection = fromPosition.clone().sub(fromTarget).normalize();
  const sideDirection = new THREE.Vector3()
    .crossVectors(viewDirection, new THREE.Vector3(0, 1, 0))
    .normalize();

  const pullbackControl = fromPosition.clone()
    .add(viewDirection.clone().multiplyScalar(MAP_PULLBACK_DISTANCE))
    .add(new THREE.Vector3(0, MAP_PULLBACK_HEIGHT, 0))
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

function createIntroEnterTransitionPath() {
  const fromPosition = cameraTransition.fromPosition.clone();
  const fromTarget = cameraTransition.fromTarget.clone();
  const toPosition = cameraTransition.toPosition.clone();
  const toTarget = cameraTransition.toTarget.clone();

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

function updateCameraTransition() {
  if (!cameraTransition.active) {
    return;
  }

  const duration = cameraTransition.mode === 'intro-enter'
    ? INTRO_TRANSITION_DURATION
    : CAMERA_TRANSITION_DURATION;
  const elapsed = performance.now() - cameraTransition.startedAt;
  const progress = Math.min(elapsed / duration, 1);
  const eased = smootherStep(progress);

  if ((cameraTransition.mode === 'map-enter' || cameraTransition.mode === 'intro-enter') && cameraTransition.path) {
    camera.position.copy(cameraTransition.path.positionCurve.getPoint(eased));
    controls.target.copy(cameraTransition.path.targetCurve.getPoint(eased));
  } else {
    camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, eased);
    controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, eased);
  }

  if (progress >= 1) {
    cameraTransition.active = false;
    cameraTransition.path = null;
    camera.position.copy(cameraTransition.toPosition);
    controls.target.copy(cameraTransition.toTarget);

    if (currentView === 'map') {
      controls.enableRotate = false;
      controls.maxPolarAngle = 0.02;
      controls.minPolarAngle = 0;
      controls.minDistance = 16;
      controls.maxDistance = 34;
    } else {
      controls.enableRotate = !introActive;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.minPolarAngle = 0;
      controls.minDistance = 8;
      controls.maxDistance = 28;
    }
  }
}

function resetToVillageView(options = {}) {
  const { skipPopupClose = false, ...viewOptions } = options;
  clearTimeout(popupDelayTimer);
  if (!skipPopupClose) {
    closeLinkPopup();
  }
  currentFocusHouse = null;
  focusRequest = null;
  setView('village', { preserveFocus: false, ...viewOptions });
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
  if (currentView !== 'village') {
    hideHouseTooltip();
    hidePlotPanel();
    currentHoverPlot = null;
    landPlotGroup.children.forEach((plot) => {
      plot.userData.targetHoverScale = 1;
      plot.userData.targetLift = 0;
    });
  }

  ui.viewButtons.forEach((button) => {
    const isActive = currentFocusHouse?.userData?.id === button.dataset.view && currentView === 'village';
    button.classList.toggle('is-active', isActive);
  });

  if (ui.hudNote) {
    ui.hudNote.classList.toggle('is-map', currentView === 'map');
    ui.hudNote.textContent = introActive
      ? 'Enter the clouds to begin.'
      : currentView === 'map'
        ? 'MAP view: top-down overview.'
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

  renderSkyColor.copy(timeOfDayState.sky).lerp(backgroundColors.map, viewTransition.progress * 0.35);
  renderFogColor.copy(timeOfDayState.fog).lerp(fogColors.map, viewTransition.progress * 0.42);
  scene.background.lerp(renderSkyColor, 0.045);
  scene.fog.color.lerp(renderFogColor, 0.045);

  if (ground) {
    renderGroundColor.copy(timeOfDayState.ground).lerp(mapGroundColor, viewTransition.progress * 0.45);
    ground.material.color.lerp(renderGroundColor, 0.045);
    ground.material.roughness = THREE.MathUtils.lerp(0.96, 0.9, viewTransition.progress);
    ground.material.metalness = THREE.MathUtils.lerp(0.0, 0.0, viewTransition.progress);
  }

  if (ambientLight) {
    renderAmbientColor.copy(timeOfDayState.ambientColor).lerp(mapAmbientColor, viewTransition.progress * 0.16);
    ambientLight.color.lerp(renderAmbientColor, 0.045);
    const ambientTarget = THREE.MathUtils.lerp(
      timeOfDayState.ambientIntensity,
      timeOfDayState.ambientIntensity * 0.72,
      viewTransition.progress
    );
    ambientLight.intensity += (ambientTarget - ambientLight.intensity) * 0.045;
  }

  if (sunLight) {
    sunLight.color.lerp(timeOfDayState.sunColor, 0.045);
    const sunTarget = THREE.MathUtils.lerp(
      timeOfDayState.sunIntensity,
      Math.max(0.35, timeOfDayState.sunIntensity * 0.68),
      viewTransition.progress
    );
    sunLight.intensity += (sunTarget - sunLight.intensity) * 0.045;
    renderSunPosition.copy(timeOfDayState.sunPosition).lerp(sunPositions.map, viewTransition.progress);
    sunLight.position.lerp(renderSunPosition, 0.04);
  }

  if (fillLight) {
    renderFillColor.copy(timeOfDayState.fillColor).lerp(mapFillColor, viewTransition.progress * 0.22);
    fillLight.color.lerp(renderFillColor, 0.045);
    const fillTarget = THREE.MathUtils.lerp(
      timeOfDayState.fillIntensity,
      timeOfDayState.fillIntensity + 0.24,
      viewTransition.progress
    );
    fillLight.intensity += (fillTarget - fillLight.intensity) * 0.045;
  }

  renderer.toneMappingExposure += (timeOfDayState.exposure - renderer.toneMappingExposure) * 0.035;

  overlayMaterials.forEach((material) => {
    const baseOpacity = material.color?.getHex() === 0xfff3b5 ? 0.95 : 0.6;
    material.opacity = baseOpacity * viewTransition.progress;
  });

  const rings = mapOverlayGroup.userData.rings || [];
  rings.forEach((ring, index) => {
    ring.scale.setScalar(1 + Math.sin(performance.now() * 0.0014 + index) * 0.015);
  });

  mapMarkerMeta.forEach((marker, index) => {
    marker.mesh.position.y = marker.homeY + Math.sin(performance.now() * 0.002 + index) * 0.03 * viewTransition.progress;
  });

  const targetMapLift = 0;
  villageGroup.children.forEach((house) => {
    house.userData.mapLift += (targetMapLift - house.userData.mapLift) * 0.08;
    house.position.y = house.userData.mapLift;
  });

  houseMaterials.forEach((material) => {
    if ('roughness' in material) {
      material.roughness = THREE.MathUtils.lerp(0.96, 0.58, viewTransition.progress);
    }
  });
}

function updateLandPlots() {
  landPlotMeta.forEach((meta, index) => {
    const { group, floorMaterial, borderMaterial, homeY } = meta;
    const hoverScale = group.userData.targetHoverScale || 1;
    const hoverLift = group.userData.targetLift || 0;
    const mapScale = THREE.MathUtils.lerp(1, 0.96, viewTransition.progress);
    const finalScale = hoverScale * mapScale;

    group.position.y += (homeY + hoverLift - group.position.y) * 0.12;
    group.scale.x += (finalScale - group.scale.x) * 0.12;
    group.scale.y += (finalScale - group.scale.y) * 0.12;
    group.scale.z += (finalScale - group.scale.z) * 0.12;

    const pulse = Math.sin(performance.now() * 0.0024 + index) * 0.04;
    floorMaterial.opacity = (0.18 + pulse + (currentHoverPlot === group ? 0.08 : 0)) * (1 - viewTransition.progress * 0.18);
    borderMaterial.opacity = 0.72 + Math.max(0, pulse) + (currentHoverPlot === group ? 0.16 : 0);
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

  updateTimeOfDayState();

  if (cameraTransition.active) {
    updateCameraTransition();
  } else {
    camera.position.lerp(desiredCameraPosition, CAMERA_BLEND_SPEED);
    controls.target.lerp(desiredTarget, CAMERA_BLEND_SPEED);
  }

  updateViewTransition();
  updateHouseScales();
  updateLandPlots();
  updateFocusPopup();

  controls.update();
  renderer.render(scene, camera);
}
