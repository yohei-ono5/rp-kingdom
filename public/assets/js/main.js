import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  BRIDGES,
  FRONT_HOUSE_DESTINATION,
  HOUSE_DESTINATIONS,
  LAND_PLOTS,
  RIVER_PATHS,
  ROAD_PATHS,
  TREE_SCATTER,
  VIDEO_BILLBOARDS,
  WEST_TREE_SCATTER
} from './site-config.js';
import {
  applyFocusCamera as applyDoorFocusCamera,
  getHouseDoorAnchorWorld,
  worldToScreen
} from './camera/focus-camera.js';
import {
  createCameraTransitionPath,
  resolveCameraTransitionMode
} from './camera/transition-paths.js';
import { loadWorldObjects, renderDestinationButtons } from './scene/world-objects.js';
import { initLandPlots, updateLandPlotLanguage, updateLandPlots } from './scene/land-plots.js';
import { initRoads } from './scene/roads.js';
import { initRivers } from './scene/river.js';
import { createTreeExclusions, initTrees } from './scene/trees.js';
import { initVideoBillboards, updateVideoBillboardPlayback } from './scene/video-billboards.js';
import { createSkyObjects } from './scene/sky-objects.js';
import { createParticleField } from './scene/particle-field.js';
import { createSceneInteractionController } from './interaction/scene-interactions.js';
import { createTimeOfDayController } from './systems/time-of-day.js';
import { createArtDirection } from './systems/art-direction.js';
import { createLinkPopup } from './ui/link-popup.js';
import { createI18nController } from './i18n.js';

const VIEW_BLEND_SPEED = 0.08;
const CAMERA_BLEND_SPEED = 0.07;
const HOUSE_SCALE_BLEND_SPEED = 0.1;
const DRAG_THRESHOLD = 6;
const CAMERA_TRANSITION_DURATION = 1800;
const MAP_PULLBACK_DISTANCE = 5.5;
const MAP_PULLBACK_HEIGHT = 3.8;
const INTRO_TRANSITION_DURATION = 3800;
const PARTICLE_FORMATION_DURATION = 4000;
const PARTICLE_WORLD_REVEAL_START = 0.76;
const PARTICLE_WORLD_REVEAL_END = 1;
const INTRO_GROUND_PREVIEW_OPACITY = 0.14;
const FOG_NEAR = 48;
const FOG_FAR = 130;
const MAP_FOG_NEAR = 60;
const MAP_FOG_FAR = 180;
const MAP_CAMERA_HEIGHT = 75;
const MAP_MIN_DISTANCE = 40;
const MAP_MAX_DISTANCE = 95;
const MAX_RENDER_PIXEL_RATIO = 1.35;
const SHADOW_MAP_SIZE = 1024;
const DOOR_POPUP_HEIGHT = 1.85;
const ACTIVE_FRAME_INTERVAL = 1000 / 60;
const IDLE_FRAME_INTERVAL = 1000 / 20;
const INTERACTION_ACTIVE_WINDOW = 900;
const FOCUS_CAMERA_OPTIONS = Object.freeze({
  cameraDistance: 4.4,
  cameraHeight: 1.95,
  targetInset: 0.28,
  targetHeight: 1.15
});
const PLOT_FOCUS_OPTIONS = Object.freeze({
  cameraDistancePadding: 4.0,
  cameraHeight: 3.2,
  targetHeight: 0.4
});
const fixedHour = resolveFixedHour();
const destinations = [FRONT_HOUSE_DESTINATION, ...HOUSE_DESTINATIONS, ...VIDEO_BILLBOARDS];
const i18n = createI18nController({
  onChange: () => applyLanguage()
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x24283d, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(
  resolveCameraFov(),
  window.innerWidth / window.innerHeight,
  0.1,
  180
);
camera.position.set(-0.8, MAP_CAMERA_HEIGHT, 5.0);

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

const artDirection = createArtDirection({ renderer, scene });
document.body.dataset.artStyle = artDirection.style;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.zoomToCursor = true;
controls.target.set(-0.8, 0, 1.2);
controls.minDistance = 0.1;
controls.maxDistance = 250;
controls.maxPolarAngle = Math.PI * 0.5;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const villageGroup = new THREE.Group();
const mapOverlayGroup = new THREE.Group();
const sceneryGroup = new THREE.Group();
const landPlotGroup = new THREE.Group();
const roadGroup = new THREE.Group();
const riverGroup = new THREE.Group();
const videoBillboardGroup = new THREE.Group();
scene.add(villageGroup);
scene.add(mapOverlayGroup);
scene.add(roadGroup);
scene.add(riverGroup);
scene.add(sceneryGroup);
scene.add(landPlotGroup);
scene.add(videoBillboardGroup);

renderDestinationButtons(destinations, document.getElementById('view-nav'), {
  getLabel: getDestinationLabel
});

const desiredCameraPosition = camera.position.clone();
const desiredTarget = controls.target.clone();

const backgroundColors = {
  village: new THREE.Color(0x1a1a2e),
  map: new THREE.Color(0x315f3d)
};

const fogColors = {
  village: new THREE.Color(0x24283d),
  map: new THREE.Color(0x315f3d)
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
const houseLights = [];
const mapMarkerMeta = [];
const mapLabelMeta = [];
const landPlotTargets = [];
const landPlotMeta = [];
const videoBillboardTargets = [];
const animationClock = new THREE.Clock();
const revealMaterialStates = new WeakMap();
const revealMaterialTargets = [];
let worldRevealComplete = false;

const ui = {
  introOverlay: document.getElementById('intro-overlay'),
  introEnter: document.getElementById('intro-enter'),
  resetView: document.getElementById('reset-view'),
  mapToggle: document.getElementById('map-toggle'),
  languageMenu: document.getElementById('language-menu'),
  languageToggle: document.getElementById('language-toggle'),
  languageOptions: document.getElementById('language-options'),
  topNav: document.getElementById('top-nav'),
  navMenuToggle: document.getElementById('nav-menu-toggle'),
  viewButtons: Array.from(document.querySelectorAll('.nav-btn[data-view]')),
  hudNote: document.getElementById('hud-note'),
  houseTooltip: document.getElementById('house-tooltip'),
  houseTooltipLabel: document.querySelector('.house-tooltip-label'),
  houseTooltipName: document.querySelector('.house-tooltip-name'),
  todClock: document.getElementById('tod-clock'),
  compass: document.getElementById('compass-widget'),
  mapLabelLayer: document.getElementById('map-label-layer'),
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
let currentFocusBillboard = null;
let currentFocusPlot = null;
let popupDelayTimer = 0;
let introActive = true;
let particleFormationStartedAt = 0;
let animationFrameId = 0;
let pageVisible = document.visibilityState !== 'hidden';
let videoPlaybackReady = false;
let lastFrameTime = 0;
let lastInteractionAt = performance.now();
const BILLBOARD_FOCUS_DISTANCE = 5.5;
const BILLBOARD_FOCUS_FRAME_PADDING = 1.18;

let focusRequest = null;

const viewTransition = {
  progress: 0
};

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
    position: new THREE.Vector3(-0.8, MAP_CAMERA_HEIGHT, 5.0),
    target: new THREE.Vector3(-0.8, 0, 1.2)
  },
  village: {
    position: new THREE.Vector3(6.5, 18.5, 31.0),
    target: new THREE.Vector3(-2.8, 0.95, 2.8)
  },
  map: {
    position: new THREE.Vector3(-0.8, MAP_CAMERA_HEIGHT, 5.0),
    target: new THREE.Vector3(-0.8, 0, 1.2)
  }
};

const timeOfDay = createTimeOfDayController({
  clockElement: ui.todClock,
  fixedHour,
  getLocale: () => i18n.locale,
  getLanguage: () => i18n.language,
  getLanguageTimeZone: () => i18n.timeZone,
  getText: (key, fallback) => i18n.t(key, fallback)
});
const timeOfDayState = timeOfDay.state;
const skyObjects = createSkyObjects(scene);
const particleField = createParticleField(scene);

const popup = createLinkPopup({
  onResetFocus: () => resetToVillageView({ skipPopupClose: true }),
  onNavigate: (url) => {
    if (url.startsWith('#')) {
      window.location.hash = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },
  getAnchorWorld: (subject) => {
    if (subject?.userData?.isVideoBillboard) {
      const liftHeight = (subject.userData.height || 2.25) / 2 + 0.5;
      return subject.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, liftHeight, 0));
    }
    return getHouseDoorAnchorWorld(subject, DOOR_POPUP_HEIGHT);
  },
  projectWorldToScreen: (worldPosition) => worldToScreen(worldPosition, camera),
  getText: (key, fallback) => i18n.t(key, fallback)
});
const interaction = createSceneInteractionController({
  camera,
  renderer,
  controls,
  raycaster,
  mouse,
  villageGroup,
  landPlotGroup,
  landPlotTargets,
  videoBillboardTargets,
  ui,
  dragThreshold: DRAG_THRESHOLD,
  getRenderPixelRatio,
  getIntroActive: () => introActive,
  getCurrentView: () => currentView,
  getCameraTransitionActive: () => cameraTransition.active,
  isPopupOpen: () => popup.isOpen(),
  onStartIntro: () => startIntroExperience(),
  onClosePopup: () => closeLinkPopup(),
  onToggleMap: () => setView(currentView === 'map' ? 'village' : 'map', { preserveFocus: false }),
  onResetView: () => resetToVillageView(),
  onFocusHouse: (house) => triggerHouseFocus(house),
  onFocusPlot: (plot) => triggerPlotFocus(plot),
  onClickVideoBillboard: (billboard) => triggerVideoBillboardClick(billboard),
  onCameraManualChange: () => {
    markInteractionActive();
    desiredCameraPosition.copy(camera.position);
    desiredTarget.copy(controls.target);
  },
  onToggleNavMenu: () => toggleNavMenu(),
  onCloseNavMenu: () => closeNavMenu()
});

buildLanguageMenu();

function getDestinationLabel(destination) {
  return i18n.t(`destinations.${destination.id}.label`, formatDestinationFallback(destination.id));
}

function getDestinationName(destination) {
  return i18n.t(`destinations.${destination.id}.name`, getDestinationLabel(destination));
}

function formatDestinationFallback(id) {
  if (!id) return '';
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPlotText(plot) {
  const basePath = `plots.${plot.id}`;
  return {
    title: i18n.t(`${basePath}.title`, i18n.t('plotFallbackTitle', 'Available Plot')),
    status: i18n.t(`${basePath}.status`, 'FOR SALE'),
    price: i18n.t(`${basePath}.price`, i18n.t('plotFallbackPrice', 'Contact us')),
    description: i18n.t(`${basePath}.description`, ''),
    plotPrefix: i18n.t('plotPrefix', 'Plot'),
    inquiry: i18n.t('plotInquiry', 'inquiries welcome')
  };
}

function buildLanguageMenu() {
  if (!ui.languageOptions) return;

  ui.languageOptions.replaceChildren(
    ...i18n.languages.map((language) => {
      const option = document.createElement('button');
      option.className = 'language-option';
      option.type = 'button';
      option.role = 'menuitemradio';
      option.dataset.language = language.code;
      option.textContent = language.label;
      return option;
    })
  );
}

function bindLanguageEvents() {
  ui.languageToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !ui.languageMenu?.classList.contains('is-open');
    setLanguageMenuOpen(open);
  });

  ui.languageOptions?.addEventListener('click', (event) => {
    const option = event.target.closest('.language-option');
    if (!option) return;
    i18n.setLanguage(option.dataset.language);
    setLanguageMenuOpen(false);
    closeNavMenu();
  });

  document.addEventListener('click', (event) => {
    if (!ui.languageMenu || ui.languageMenu.contains(event.target)) {
      return;
    }
    setLanguageMenuOpen(false);
  });
}

function setLanguageMenuOpen(open) {
  ui.languageMenu?.classList.toggle('is-open', open);
  ui.languageToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function applyLanguage() {
  ui.resetView.textContent = i18n.t('resetView', 'HOME');
  ui.mapToggle.textContent = i18n.t('map', 'MAP');
  ui.navMenuToggle?.setAttribute('aria-label', i18n.t('menu', 'メニュー'));
  ui.introEnter.textContent = 'Enter';
  document.querySelector('.intro-hint').textContent = i18n.t('introHint', 'Press Enter');

  updateLanguageMenuState();
  updateDestinationButtonLabels();
  updateWorldObjectTranslations();
  updateBillboardTranslations();
  updateMapLabelTexts();
  updateLandPlotTranslations();
  popup.updateTexts();
  timeOfDay.update(true);
  syncUiState();
}

function updateLanguageMenuState() {
  if (ui.languageToggle) {
    ui.languageToggle.textContent = `${i18n.t('language', 'Language')}: ${i18n.currentLabel}`;
  }

  ui.languageOptions?.querySelectorAll('.language-option').forEach((option) => {
    const active = option.dataset.language === i18n.language;
    option.classList.toggle('is-active', active);
    option.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function updateDestinationButtonLabels() {
  ui.viewButtons.forEach((button) => {
    const destination = destinations.find((item) => item.id === button.dataset.view);
    if (destination) {
      button.textContent = getDestinationLabel(destination);
    }
  });
}

function rebuildMapLabels() {
  if (!ui.mapLabelLayer) return;

  mapLabelMeta.length = 0;
  ui.mapLabelLayer.replaceChildren();

  const subjects = [...villageGroup.children, ...videoBillboardTargets]
    .filter((subject) => subject.userData?.id);

  subjects.forEach((subject) => {
    const element = document.createElement('div');
    element.className = 'map-label';
    element.tabIndex = 0;
    element.role = 'button';

    const title = document.createElement('span');
    title.className = 'map-label-title';
    const name = document.createElement('span');
    name.className = 'map-label-name';

    element.append(title, name);
    ui.mapLabelLayer.appendChild(element);

    element.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      focusMapLabelSubject(subject);
    });

    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      focusMapLabelSubject(subject);
    });

    mapLabelMeta.push({
      subject,
      element,
      title,
      name
    });
  });

  updateMapLabelTexts();
}

function updateMapLabelTexts() {
  mapLabelMeta.forEach((meta) => {
    const destination = destinations.find((item) => item.id === meta.subject.userData.id);
    const label = destination ? getDestinationLabel(destination) : formatDestinationFallback(meta.subject.userData.id);
    const name = destination ? getDestinationName(destination) : label;
    const showName = name && name.toLocaleLowerCase() !== label.toLocaleLowerCase();

    meta.title.textContent = label;
    meta.name.textContent = showName ? name : '';
    meta.name.hidden = !showName;
    meta.element.setAttribute('aria-label', showName ? `${label} ${name}` : label);
  });
}

function focusMapLabelSubject(subject) {
  if (!subject) return;

  if (subject.userData?.isVideoBillboard) {
    triggerVideoBillboardClick(subject);
  } else {
    triggerHouseFocus(subject);
  }

  closeNavMenu();
}

function updateWorldObjectTranslations() {
  villageGroup.children.forEach((house) => {
    const destination = destinations.find((item) => item.id === house.userData.id);
    if (!destination) return;
    house.userData.label = getDestinationLabel(destination);
    house.userData.name = getDestinationName(destination);
  });
}

function updateBillboardTranslations() {
  videoBillboardTargets.forEach((billboard) => {
    const destination = destinations.find((item) => item.id === billboard.userData.id);
    if (!destination) return;
    billboard.userData.name = getDestinationName(destination);
  });
}

function updateLandPlotTranslations() {
  updateLandPlotLanguage({
    landPlotMeta,
    getPlotText
  });
}

function toggleNavMenu() {
  if (!ui.topNav) return;
  const open = !ui.topNav.classList.contains('is-nav-open');
  ui.topNav.classList.toggle('is-nav-open', open);
  ui.navMenuToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeNavMenu() {
  if (!ui.topNav) return;
  if (!ui.topNav.classList.contains('is-nav-open')) return;
  ui.topNav.classList.remove('is-nav-open');
  ui.navMenuToggle?.setAttribute('aria-expanded', 'false');
  setLanguageMenuOpen(false);
}

document.body.classList.add('intro-active');

initLights();
initGround();
initMapOverlay();
initRoads({
  paths: ROAD_PATHS,
  parentGroup: roadGroup
});
const riverController = initRivers({
  rivers: RIVER_PATHS,
  bridges: BRIDGES,
  parentGroup: riverGroup
});
initLandPlots({
  plots: LAND_PLOTS,
  landPlotGroup,
  landPlotTargets,
  landPlotMeta,
  getPlotText
});
try {
  initVideoBillboards({
    billboards: VIDEO_BILLBOARDS,
    parentGroup: videoBillboardGroup,
    clickTargets: videoBillboardTargets
  });
} catch (error) {
  console.error('Failed to initialize video billboards.', error);
}
refreshParticleFormationTargets();
const treeExclusions = createTreeExclusions({
  houses: [...HOUSE_DESTINATIONS, FRONT_HOUSE_DESTINATION],
  plots: LAND_PLOTS,
  roads: [...ROAD_PATHS, ...RIVER_PATHS],
  billboards: VIDEO_BILLBOARDS,
  padding: TREE_SCATTER.exclusionPadding
});

[TREE_SCATTER, WEST_TREE_SCATTER].forEach((treeConfig) => {
  void initTrees({
    treeConfig,
    parentGroup: sceneryGroup,
    exclusions: treeExclusions
  }).then(() => {
    artDirection.applyToScene();
    refreshWorldRevealMaterials();
  }).catch((error) => {
    console.error('Failed to initialize trees.', error);
  });
});
rebuildMapLabels();
void loadWorldObjects({
  objects: [...HOUSE_DESTINATIONS, FRONT_HOUSE_DESTINATION],
  renderer,
  villageGroup,
  mapOverlayGroup,
  overlayMaterials,
  mapMarkerMeta,
  houseMaterials,
  houseLights
}).then(() => {
  updateWorldObjectTranslations();
  rebuildMapLabels();
  refreshParticleFormationTargets();
  artDirection.applyToScene();
  refreshWorldRevealMaterials();
});
artDirection.applyToScene();
refreshWorldRevealMaterials();
interaction.bindEvents();
bindRenderPerformanceEvents();
bindLanguageEvents();
applyLanguage();
timeOfDay.update(true);
applyViewState({ preserveFocus: true });
startAnimationLoop();

function startIntroExperience() {
  if (!introActive) {
    return;
  }

  markInteractionActive();
  introActive = false;
  particleFormationStartedAt = performance.now();
  document.body.classList.remove('intro-active');
  ui.introOverlay?.classList.add('is-hidden');
  ui.introOverlay?.setAttribute('aria-hidden', 'true');
  resetToVillageView({ transitionMode: 'intro-enter' });
}

function refreshParticleFormationTargets() {
  particleField.setFormationSubjects([
    { subject: villageGroup, weight: 3.6 },
    { subject: videoBillboardGroup, weight: 1.5 },
    { subject: landPlotGroup, weight: 0.65 },
    { subject: roadGroup, weight: 0.34 },
    { subject: sceneryGroup, weight: 0.28 },
    { subject: ground, weight: 0.08 }
  ]);
}

function openLinkPopup(name, destination) {
  const subject = currentFocusBillboard || currentFocusHouse;
  popup.openPopup(name, destination, subject);
}

function closeLinkPopup() {
  markInteractionActive();
  popup.closePopup();
}

function bindRenderPerformanceEvents() {
  document.addEventListener('visibilitychange', () => {
    pageVisible = document.visibilityState !== 'hidden';
    updateVideoPlaybackState();

    if (pageVisible) {
      animationClock.getDelta();
      lastFrameTime = 0;
      markInteractionActive();
      startAnimationLoop();
    } else if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  });

  ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'].forEach((eventName) => {
    window.addEventListener(eventName, markInteractionActive, { passive: true });
  });
}

function startAnimationLoop() {
  if (!pageVisible || animationFrameId) {
    return;
  }

  animationFrameId = requestAnimationFrame(animate);
}

function getRenderPixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO);
}

function resolveCameraFov() {
  const params = new URLSearchParams(window.location.search);
  const parsed = Number(params.get('fov'));
  return Number.isFinite(parsed) && parsed >= 15 && parsed <= 80 ? parsed : 50;
}

function resolveFixedHour() {
  const params = new URLSearchParams(window.location.search);
  const hourParam = params.get('hour');
  if (hourParam === null) {
    return null;
  }

  const parsedHour = Number(hourParam);
  if (!Number.isFinite(parsedHour)) {
    return null;
  }

  return ((parsedHour % 24) + 24) % 24;
}

function initLights() {
  ambientLight = new THREE.AmbientLight(0xfff2dd, 1.12);
  scene.add(ambientLight);

  sunLight = new THREE.DirectionalLight(0xffe6c4, 2.15);
  sunLight.position.set(8, 12, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sunLight.shadow.camera.left = -25;
  sunLight.shadow.camera.right = 25;
  sunLight.shadow.camera.top = 25;
  sunLight.shadow.camera.bottom = -25;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.camera.updateProjectionMatrix();
  scene.add(sunLight);
  scene.add(sunLight.target);

  fillLight = new THREE.DirectionalLight(0x8ba1ff, 0.82);
  fillLight.position.set(-6, 5, -4);
  scene.add(fillLight);
}

function initGround() {
  const geometry = new THREE.PlaneGeometry(220, 220, 96, 96);
  applyGroundVertexColors(geometry);

  ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x2f6b3b,
      roughness: 0.96,
      metalness: 0.0,
      vertexColors: true
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

// 地面のベタ塗りを避けるための明度ムラ。頂点カラーは material.color に乗算されるので
// 時刻連動の色を壊さずにディテールだけを足せる。メッシュは1枚のまま。
function applyGroundVertexColors(geometry) {
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const random = createGroundRandom(20260822);
  const patches = Array.from({ length: 26 }, () => ({
    x: (random() - 0.5) * 200,
    y: (random() - 0.5) * 200,
    radius: 14 + random() * 34,
    strength: (random() - 0.42) * 0.26
  }));

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);

    let shade = 1;
    patches.forEach((patch) => {
      const distance = Math.hypot(x - patch.x, y - patch.y);
      if (distance > patch.radius) return;
      const falloff = 1 - distance / patch.radius;
      shade += patch.strength * falloff * falloff;
    });

    // 細かいざらつき
    shade += (random() - 0.5) * 0.05;
    // 外周に向かって落として奥行きを出す
    const edge = Math.min(1, Math.hypot(x, y) / 105);
    shade -= edge * edge * 0.34;

    const value = THREE.MathUtils.clamp(shade, 0.42, 1.16);
    colors[index * 3] = value;
    colors[index * 3 + 1] = value * 1.02;
    colors[index * 3 + 2] = value * 0.94;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function createGroundRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function initMapOverlay() {
  mapOverlayGroup.userData.rings = [];
}

function setView(view, options = {}) {
  markInteractionActive();
  const previousView = currentView;
  const transitionMode = options.transitionMode || resolveCameraTransitionMode(previousView, view);
  currentView = view;

  if (!options.preserveFocus) {
    currentFocusHouse = null;
    currentFocusBillboard = null;
    currentFocusPlot = null;
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
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minPolarAngle = 0;
    controls.minDistance = 0.1;
    controls.maxDistance = 250;
  } else if (currentView === 'map') {
    desiredCameraPosition.copy(cameraState.map.position);
    desiredTarget.copy(cameraState.map.target);
    const deferMapLock = options.transitionMode === 'map-enter';
    controls.enableRotate = deferMapLock;
    controls.maxPolarAngle = deferMapLock ? Math.PI * 0.48 : 0.08;
    controls.minPolarAngle = 0;
    controls.minDistance = MAP_MIN_DISTANCE;
    controls.maxDistance = MAP_MAX_DISTANCE;
  } else if (currentFocusHouse && options.preserveFocus !== false) {
    applyFocusCamera(currentFocusHouse);
    controls.enableRotate = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0;
    controls.minDistance = 1.5;
    controls.maxDistance = 80;
  } else if (currentFocusBillboard && options.preserveFocus !== false) {
    applyBillboardFocusCamera(currentFocusBillboard);
    controls.enableRotate = true;
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minPolarAngle = 0;
    controls.minDistance = 1.5;
    controls.maxDistance = 80;
  } else if (currentFocusPlot && options.preserveFocus !== false) {
    applyPlotFocusCamera(currentFocusPlot);
    controls.enableRotate = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0;
    controls.minDistance = 1.5;
    controls.maxDistance = 80;
  } else {
    desiredCameraPosition.copy(cameraState.village.position);
    desiredTarget.copy(cameraState.village.target);
    controls.enableRotate = options.transitionMode === 'intro-enter' ? false : true;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0;
    controls.minDistance = 8;
    controls.maxDistance = 80;
  }

  syncUiState();
}

function applyFocusCamera(house) {
  applyDoorFocusCamera({
    house,
    desiredCameraPosition,
    desiredTarget,
    options: FOCUS_CAMERA_OPTIONS
  });
}

function applyBillboardFocusCamera(billboard) {
  const billboardWorldPos = billboard.getWorldPosition(new THREE.Vector3());
  const rotY = billboard.rotation.y;
  const normalX = Math.sin(rotY);
  const normalZ = Math.cos(rotY);
  const distance = getBillboardFocusDistance(billboard);

  desiredCameraPosition.set(
    billboardWorldPos.x + normalX * distance,
    billboardWorldPos.y,
    billboardWorldPos.z + normalZ * distance
  );
  desiredTarget.copy(billboardWorldPos);
}

function getBillboardFocusDistance(billboard) {
  const width = billboard.userData.width || 4;
  const height = billboard.userData.height || 2.25;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const widthFitDistance = (width / 2) / Math.tan(horizontalFov / 2);
  const heightFitDistance = (height / 2) / Math.tan(verticalFov / 2);
  const frameFitDistance = Math.max(widthFitDistance, heightFitDistance) * BILLBOARD_FOCUS_FRAME_PADDING;

  return Math.max(BILLBOARD_FOCUS_DISTANCE, frameFitDistance);
}

function applyPlotFocusCamera(plot) {
  const plotWorldPos = plot.getWorldPosition(new THREE.Vector3());
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(plot.quaternion).setY(0).normalize();
  const width = plot.userData.width || 4.5;
  const depth = plot.userData.depth || 4.5;
  const distance = Math.max(width, depth) * 0.72 + PLOT_FOCUS_OPTIONS.cameraDistancePadding;

  desiredCameraPosition.copy(plotWorldPos)
    .addScaledVector(forward, distance)
    .add(new THREE.Vector3(0, PLOT_FOCUS_OPTIONS.cameraHeight, 0));

  desiredTarget.copy(plotWorldPos)
    .add(new THREE.Vector3(0, PLOT_FOCUS_OPTIONS.targetHeight, 0));
}

function startCameraTransition(mode) {
  cameraTransition.mode = mode;
  cameraTransition.startedAt = performance.now();
  cameraTransition.fromPosition.copy(camera.position);
  cameraTransition.fromTarget.copy(controls.target);
  cameraTransition.toPosition.copy(desiredCameraPosition);
  cameraTransition.toTarget.copy(desiredTarget);
  cameraTransition.path = createCameraTransitionPath({
    mode,
    fromPosition: cameraTransition.fromPosition,
    fromTarget: cameraTransition.fromTarget,
    toPosition: cameraTransition.toPosition,
    toTarget: cameraTransition.toTarget,
    mapPullbackDistance: MAP_PULLBACK_DISTANCE,
    mapPullbackHeight: MAP_PULLBACK_HEIGHT
  });
  cameraTransition.active =
    cameraTransition.fromPosition.distanceTo(cameraTransition.toPosition) > 0.01
    || cameraTransition.fromTarget.distanceTo(cameraTransition.toTarget) > 0.01;

  if (cameraTransition.active) {
    controls.enableDamping = false;
    controls.enableRotate = false;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.5;
    controls.minDistance = 0.1;
    controls.maxDistance = 250;
  }
}

function smootherStep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
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

  if ((cameraTransition.mode === 'map-enter' || cameraTransition.mode === 'intro-enter' || cameraTransition.mode === 'map-exit') && cameraTransition.path) {
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
    desiredCameraPosition.copy(cameraTransition.toPosition);
    desiredTarget.copy(cameraTransition.toTarget);
    controls.update();
    controls.enableDamping = true;

    if (currentView === 'map') {
      controls.enableRotate = false;
      controls.maxPolarAngle = 0.08;
      controls.minPolarAngle = 0;
      controls.minDistance = MAP_MIN_DISTANCE;
      controls.maxDistance = MAP_MAX_DISTANCE;
    } else if (currentFocusBillboard) {
      controls.enableRotate = true;
      controls.maxPolarAngle = Math.PI * 0.5;
      controls.minPolarAngle = 0;
      controls.minDistance = 1.5;
      controls.maxDistance = 80;
    } else if (currentFocusHouse || currentFocusPlot) {
      controls.enableRotate = true;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.minPolarAngle = 0;
      controls.minDistance = 1.5;
      controls.maxDistance = 80;
    } else {
      controls.enableRotate = !introActive;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.minPolarAngle = 0;
      controls.minDistance = 8;
      controls.maxDistance = 80;
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
  currentFocusBillboard = null;
  currentFocusPlot = null;
  focusRequest = null;
  setView('village', { preserveFocus: false, ...viewOptions });
}

function triggerHouseFocus(house) {
  markInteractionActive();
  clearTimeout(popupDelayTimer);
  closeLinkPopup();

  currentFocusHouse = house;
  currentFocusBillboard = null;
  currentFocusPlot = null;
  setView('village', { preserveFocus: true });

  focusRequest = {
    name: house.userData.name,
    destination: house.userData.links?.length
      ? house.userData.links
      : house.userData.url
  };
}

function triggerVideoBillboardClick(billboard) {
  if (!billboard?.userData?.url) return;
  markInteractionActive();
  clearTimeout(popupDelayTimer);
  closeLinkPopup();

  currentFocusBillboard = billboard;
  currentFocusHouse = null;
  currentFocusPlot = null;
  setView('village', { preserveFocus: true });

  focusRequest = {
    name: billboard.userData.name,
    destination: billboard.userData.url
  };
}

function triggerPlotFocus(plot) {
  if (!plot) return;
  markInteractionActive();
  clearTimeout(popupDelayTimer);
  closeLinkPopup();

  currentFocusPlot = plot;
  currentFocusHouse = null;
  currentFocusBillboard = null;
  setView('village', { preserveFocus: true });
}

function syncUiState() {
  ui.mapToggle?.classList.toggle('is-active', currentView === 'map');
  ui.compass?.classList.toggle('is-visible', currentView === 'map');
  if (currentView !== 'village') {
    interaction.hideHoverOverlays();
    interaction.resetHoverState();
  }

  ui.viewButtons.forEach((button) => {
    const focusedId = currentFocusHouse?.userData?.id || currentFocusBillboard?.userData?.id;
    const isActive = focusedId === button.dataset.view && currentView === 'village';
    button.classList.toggle('is-active', isActive);
  });

  if (ui.hudNote) {
    ui.hudNote.classList.toggle('is-map', currentView === 'map');
    ui.hudNote.textContent = introActive
      ? i18n.t('hudIntro', 'Enter the clouds to begin.')
      : currentView === 'map'
        ? i18n.t('hudMap', 'MAP view: top-down overview.')
        : i18n.t('hudVillage', 'Drag to orbit. Wheel zooms toward the cursor. Click a house to zoom.');
  }
}

function updateFocusPopup() {
  if (!focusRequest) return;

  if (cameraTransition.active) {
    return;
  }

  const { name, destination } = focusRequest;
  focusRequest = null;

  popupDelayTimer = window.setTimeout(() => {
    openLinkPopup(name, destination);
  }, 120);
}

function updateViewTransition() {
  const targetProgress = currentView === 'map' ? 1 : 0;
  viewTransition.progress += (targetProgress - viewTransition.progress) * VIEW_BLEND_SPEED;

  renderSkyColor.copy(timeOfDayState.sky).lerp(backgroundColors.map, viewTransition.progress);
  renderFogColor.copy(timeOfDayState.fog).lerp(fogColors.map, viewTransition.progress);
  scene.background.lerp(renderSkyColor, 0.045);
  scene.fog.color.lerp(renderFogColor, 0.045);

  const targetFogNear = THREE.MathUtils.lerp(FOG_NEAR, MAP_FOG_NEAR, viewTransition.progress);
  const targetFogFar = THREE.MathUtils.lerp(FOG_FAR, MAP_FOG_FAR, viewTransition.progress);
  scene.fog.near += (targetFogNear - scene.fog.near) * 0.045;
  scene.fog.far += (targetFogFar - scene.fog.far) * 0.045;

  if (ground) {
    renderGroundColor.copy(timeOfDayState.ground).lerp(mapGroundColor, viewTransition.progress * 0.45);
    ground.material.color.lerp(renderGroundColor, 0.045);
    ground.material.roughness = THREE.MathUtils.lerp(0.96, 0.9, viewTransition.progress);
    ground.material.metalness = THREE.MathUtils.lerp(0.0, 0.0, viewTransition.progress);
  }

  if (ambientLight) {
    renderAmbientColor.copy(timeOfDayState.ambientColor).lerp(mapAmbientColor, viewTransition.progress * 0.16);
    ambientLight.color.lerp(renderAmbientColor, 0.045);
    const ambientTarget = artDirection.scaleAmbient(THREE.MathUtils.lerp(
      timeOfDayState.ambientIntensity,
      timeOfDayState.ambientIntensity * 0.72,
      viewTransition.progress
    ));
    ambientLight.intensity += (ambientTarget - ambientLight.intensity) * 0.045;
  }

  if (sunLight) {
    sunLight.color.lerp(timeOfDayState.sunColor, 0.045);
    const sunTarget = artDirection.scaleSun(THREE.MathUtils.lerp(
      timeOfDayState.sunIntensity,
      Math.max(0.35, timeOfDayState.sunIntensity * 0.68),
      viewTransition.progress
    ));
    sunLight.intensity += (sunTarget - sunLight.intensity) * 0.045;
    renderSunPosition.copy(timeOfDayState.sunPosition).lerp(sunPositions.map, viewTransition.progress);
    sunLight.position.lerp(renderSunPosition, 0.04);
  }

  if (fillLight) {
    renderFillColor.copy(timeOfDayState.fillColor).lerp(mapFillColor, viewTransition.progress * 0.22);
    fillLight.color.lerp(renderFillColor, 0.045);
    const fillTarget = artDirection.scaleFill(THREE.MathUtils.lerp(
      timeOfDayState.fillIntensity,
      timeOfDayState.fillIntensity + 0.24,
      viewTransition.progress
    ));
    fillLight.intensity += (fillTarget - fillLight.intensity) * 0.045;
  }

  renderer.toneMappingExposure += (artDirection.scaleExposure(timeOfDayState.exposure) - renderer.toneMappingExposure) * 0.035;

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

  const roughnessFloor = artDirection.preset.roughnessFloor;
  houseMaterials.forEach((material) => {
    if (!('roughness' in material)) return;
    material.roughness = roughnessFloor !== null
      ? roughnessFloor
      : THREE.MathUtils.lerp(0.96, 0.58, viewTransition.progress);
  });

  const nightFactor = THREE.MathUtils.clamp(
    (0.65 - timeOfDayState.sunIntensity) / 0.55,
    0,
    1
  );
  const mapDim = 1 - viewTransition.progress * 0.55;
  houseLights.forEach((light) => {
    const baseIntensity = light.color.getHex() === 0xffd08a ? 1.4 : 2.2;
    const target = baseIntensity * nightFactor * mapDim;
    light.intensity += (target - light.intensity) * 0.08;
  });
}

function updatePopupAnchor() {
  if (popup.isOpen()) {
    popup.updatePosition();
  }
}

function updateMapLabels() {
  if (!ui.mapLabelLayer) return;

  const visible = viewTransition.progress > 0.18;
  ui.mapLabelLayer.classList.toggle('is-visible', visible);
  ui.mapLabelLayer.setAttribute('aria-hidden', visible ? 'false' : 'true');

  mapLabelMeta.forEach((meta) => {
    if (!visible) {
      meta.element.style.opacity = '0';
      meta.element.style.pointerEvents = 'none';
      return;
    }

    const anchorWorld = getMapLabelAnchorWorld(meta.subject);
    const screenPoint = worldToScreen(anchorWorld, camera);
    const labelOpacity = THREE.MathUtils.smoothstep(viewTransition.progress, 0.18, 0.72);

    if (!screenPoint.visible) {
      meta.element.style.opacity = '0';
      meta.element.style.pointerEvents = 'none';
      return;
    }

    meta.element.style.opacity = String(labelOpacity);
    meta.element.style.pointerEvents = labelOpacity > 0.35 ? 'auto' : 'none';
    meta.element.style.left = `${screenPoint.x}px`;
    meta.element.style.top = `${screenPoint.y - 12}px`;
  });
}

function getMapLabelAnchorWorld(subject) {
  const anchor = subject.getWorldPosition(new THREE.Vector3());

  if (subject.userData?.isVideoBillboard) {
    anchor.y += (subject.userData.height || 2.25) / 2 + 1.0;
    return anchor;
  }

  anchor.y += 3.0;
  return anchor;
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

function animate(timestamp) {
  animationFrameId = 0;
  if (!pageVisible) {
    return;
  }

  const frameInterval = shouldUseActiveFrameRate(timestamp)
    ? ACTIVE_FRAME_INTERVAL
    : IDLE_FRAME_INTERVAL;

  if (lastFrameTime && timestamp - lastFrameTime < frameInterval) {
    startAnimationLoop();
    return;
  }

  lastFrameTime = timestamp;
  startAnimationLoop();

  const deltaSeconds = Math.min(animationClock.getDelta(), 0.25);

  timeOfDay.update();

  if (cameraTransition.active) {
    updateCameraTransition();
  } else {
    camera.position.lerp(desiredCameraPosition, CAMERA_BLEND_SPEED);
    controls.target.lerp(desiredTarget, CAMERA_BLEND_SPEED);
  }

  updateViewTransition();
  const particleFormationElapsed = getParticleFormationElapsed();
  const particleFormationProgress = getParticleFormationProgress(particleFormationElapsed);
  if (!videoPlaybackReady && !introActive && particleFormationProgress >= 1) {
    videoPlaybackReady = true;
  }
  skyObjects.update({
    timeOfDayState,
    camera,
    viewTransitionProgress: viewTransition.progress
  });
  riverController.update({
    deltaSeconds,
    timeOfDayState
  });
  particleField.update({
    elapsedTime: animationClock.elapsedTime,
    introActive,
    formationProgress: particleFormationProgress,
    viewTransitionProgress: viewTransition.progress,
    pixelRatio: renderer.getPixelRatio()
  });
  updateHouseScales();
  updateLandPlots({
    landPlotMeta,
    currentHoverPlot: interaction.getCurrentHoverPlot(),
    viewTransitionProgress: viewTransition.progress
  });
  updateVideoPlaybackState();
  updateWorldReveal(particleFormationProgress);
  updateFocusPopup();

  controls.update();
  updatePopupAnchor();
  updateMapLabels();
  renderer.render(scene, camera);
}

function updateVideoPlaybackState() {
  updateVideoBillboardPlayback({
    billboards: videoBillboardTargets,
    pageVisible,
    currentView,
    playbackReady: videoPlaybackReady
  });
}

function shouldUseActiveFrameRate(timestamp) {
  return introActive
    || cameraTransition.active
    || getParticleFormationProgress(getParticleFormationElapsed()) < 1
    || popup.isOpen()
    || timestamp - lastInteractionAt < INTERACTION_ACTIVE_WINDOW;
}

function markInteractionActive() {
  lastInteractionAt = performance.now();
}

function getParticleFormationElapsed() {
  if (introActive || particleFormationStartedAt <= 0) {
    return 0;
  }

  return performance.now() - particleFormationStartedAt;
}

function getParticleFormationProgress(elapsed) {
  return THREE.MathUtils.clamp(elapsed / PARTICLE_FORMATION_DURATION, 0, 1);
}

function updateWorldReveal(formationProgress) {
  if (worldRevealComplete) {
    return;
  }

  const revealOpacity = introActive
    ? 0
    : THREE.MathUtils.smoothstep(
      formationProgress,
      PARTICLE_WORLD_REVEAL_START,
      PARTICLE_WORLD_REVEAL_END
    );

  revealMaterialTargets.forEach(({ material, minimumOpacity }) => {
    applyRevealOpacity(material, Math.max(minimumOpacity, revealOpacity));
  });

  if (!introActive && formationProgress >= 1) {
    revealMaterialTargets.forEach(({ material }) => restoreRevealMaterial(material));
    revealMaterialTargets.length = 0;
    worldRevealComplete = true;
  }
}

function refreshWorldRevealMaterials() {
  if (worldRevealComplete) {
    return;
  }

  const materialTargets = new Map();
  [
    { subject: ground, minimumOpacity: INTRO_GROUND_PREVIEW_OPACITY },
    { subject: villageGroup, minimumOpacity: 0 },
    { subject: mapOverlayGroup, minimumOpacity: 0 },
    { subject: roadGroup, minimumOpacity: 0 },
    { subject: riverGroup, minimumOpacity: 0 },
    { subject: sceneryGroup, minimumOpacity: 0 },
    { subject: landPlotGroup, minimumOpacity: 0 },
    { subject: videoBillboardGroup, minimumOpacity: 0 }
  ].filter(({ subject }) => Boolean(subject)).forEach(({ subject, minimumOpacity }) => {
    subject.traverse?.((child) => {
      if ((!child.isMesh && !child.isLine && !child.isPoints) || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        materialTargets.set(
          material,
          Math.max(materialTargets.get(material) || 0, minimumOpacity)
        );
      });
    });
  });

  revealMaterialTargets.length = 0;
  materialTargets.forEach((minimumOpacity, material) => {
    revealMaterialTargets.push({ material, minimumOpacity });
  });
  updateWorldReveal(getParticleFormationProgress(getParticleFormationElapsed()));
}

function applyRevealOpacity(material, revealOpacity) {
  if (!revealMaterialStates.has(material)) {
    revealMaterialStates.set(material, {
      transparent: material.transparent,
      opacity: Number.isFinite(material.opacity) ? material.opacity : 1,
      depthWrite: material.depthWrite,
      alphaHash: material.alphaHash,
      alphaTest: material.alphaTest
    });
  }

  const original = revealMaterialStates.get(material);

  let needsUpdate = false;
  if ('alphaHash' in material && !original.transparent) {
    needsUpdate = setMaterialFlag(material, 'transparent', false) || needsUpdate;
    needsUpdate = setMaterialFlag(material, 'alphaHash', true) || needsUpdate;
    needsUpdate = setMaterialFlag(material, 'depthWrite', original.depthWrite) || needsUpdate;
  } else {
    needsUpdate = setMaterialFlag(material, 'transparent', true) || needsUpdate;
    needsUpdate = setMaterialFlag(material, 'depthWrite', false) || needsUpdate;
  }

  material.opacity = original.opacity * revealOpacity;
  if (needsUpdate) material.needsUpdate = true;
}

function restoreRevealMaterial(material) {
  const original = revealMaterialStates.get(material);
  if (!original) return;

  let needsUpdate = false;
  needsUpdate = setMaterialFlag(material, 'transparent', original.transparent) || needsUpdate;
  needsUpdate = setMaterialFlag(material, 'depthWrite', original.depthWrite) || needsUpdate;
  if ('alphaHash' in material) {
    needsUpdate = setMaterialFlag(material, 'alphaHash', original.alphaHash) || needsUpdate;
  }
  needsUpdate = setMaterialFlag(material, 'alphaTest', original.alphaTest) || needsUpdate;
  material.opacity = original.opacity;
  if (needsUpdate) material.needsUpdate = true;
}

function setMaterialFlag(material, property, value) {
  if (material[property] === value) {
    return false;
  }

  material[property] = value;
  return true;
}
