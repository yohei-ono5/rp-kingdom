import * as THREE from 'three';
import { CHAPTERS } from './chapters.js';
import { createWorld } from './world.js';

const ARC_HEIGHT = 6.5;
const CAMERA_DAMPING = 0.075;
const INTRO_DURATION = 4000;
const INTRO_START_POSITION = new THREE.Vector3(6, 142, 226);
const INTRO_START_TARGET = new THREE.Vector3(0, 34, 0);
const CLOUD_RESIDUAL_OPACITY = 0.22;
// 入場中は霧を遠くまで飛ばし、降りるにつれて通常値へ寄せる。
// こうしないと開始位置(遠い)では島が霧に溶けて何も見えない。
const FOG_INTRO = { near: 230, far: 560 };
const FOG_SETTLED = { near: 95, far: 235 };
// 紙が横切る一連の動き。覆っている間にカメラを瞬間移動させるので、
// 飛行時間を待たせずに切り替わる。
const WIPE_DURATION = 1180;
const WIPE_COVER_AT = 0.4;
// 軽いオービット。構図が壊れない範囲だけ振れるように上限を決める。
const ORBIT_MAX_YAW = THREE.MathUtils.degToRad(20);
const ORBIT_MAX_PITCH = THREE.MathUtils.degToRad(11);
const ORBIT_SENSITIVITY = 0.0032;
const ORBIT_RECENTER = 0.012;

const canvas = document.getElementById('world-canvas');
const world = createWorld({ canvas });

const scrollRoot = document.getElementById('chapters');
const indexRoot = document.getElementById('chapter-index');

buildChapterSections();
buildChapterIndex();

const keyframes = CHAPTERS.map((chapter) => ({
  position: new THREE.Vector3(...chapter.camera.position),
  target: new THREE.Vector3(...chapter.camera.target)
}));

const desiredPosition = keyframes[0].position.clone();
const desiredTarget = keyframes[0].target.clone();
const currentPosition = keyframes[0].position.clone();
const currentTarget = keyframes[0].target.clone();

let activeChapter = 0;
let introState = 'waiting';
let wiping = false;
const orbit = { yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0, moved: 0 };
const orbitOffset = new THREE.Vector3();
const orbitSpherical = new THREE.Spherical();
let introStartedAt = 0;
let lastFrameAt = performance.now();

const introFrom = INTRO_START_POSITION.clone();
const introTo = keyframes[0].position.clone();
const introTargetFrom = INTRO_START_TARGET.clone();
const introTargetTo = keyframes[0].target.clone();

currentPosition.copy(introFrom);
currentTarget.copy(introTargetFrom);
world.camera.position.copy(currentPosition);
world.camera.lookAt(currentTarget);

const introOverlay = document.getElementById('intro');
const introEnter = document.getElementById('intro-enter');

// 世界が揃うまで ENTER は押せない。押せてしまうと空の島に降りてしまう。
let worldReady = false;
if (introEnter) introEnter.disabled = true;

world.ready.then(() => {
  worldReady = true;
  document.body.classList.add('is-world-ready');
  document.body.classList.add('is-loaded');
  if (introEnter) introEnter.disabled = false;
});

introEnter?.addEventListener('click', startIntro);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && introState === 'waiting') startIntro();
});

window.addEventListener('scroll', updateRailFromScroll, { passive: true });
window.addEventListener('resize', updateRailFromScroll, { passive: true });
bindWorldPicking();
bindOrbit();
bindMastheadLink();
updateRailFromScroll();

function startIntro() {
  if (introState !== 'waiting' || !worldReady) return;
  introState = 'flying';
  introStartedAt = performance.now();
  introOverlay?.classList.add('is-hidden');
}

requestAnimationFrame(function frame() {
  requestAnimationFrame(frame);

  // フレームゲートは置かない。rAF 自体が vsync に同期しているので、
  // 自前で間引くと不規則な取りこぼしが起きて逆にカクつく。
  const now = performance.now();
  const deltaSeconds = Math.min((now - lastFrameAt) / 1000, 0.25);
  lastFrameAt = now;

  world.clouds.update(deltaSeconds);

  if (introState === 'flying') {
    updateIntroFlight(now);
  } else if (introState === 'done') {
    currentPosition.lerp(desiredPosition, CAMERA_DAMPING);
    currentTarget.lerp(desiredTarget, CAMERA_DAMPING);
  }

  if (!orbit.dragging) {
    orbit.yaw += (0 - orbit.yaw) * ORBIT_RECENTER;
    orbit.pitch += (0 - orbit.pitch) * ORBIT_RECENTER;
  }

  // 完全な静止を作らない。ごく僅かな呼吸で世界が生きて見える。
  const breathScale = introState === 'done' ? 1 : 0;
  const breathX = Math.sin(now * 0.00013) * 0.9 * breathScale;
  const breathY = Math.sin(now * 0.00021 + 1.3) * 0.55 * breathScale;

  world.camera.position.set(
    currentPosition.x + breathX,
    currentPosition.y + breathY,
    currentPosition.z
  );

  if (introState === 'done') {
    applyOrbit(world.camera.position, currentTarget);
  }

  world.camera.lookAt(currentTarget);

  world.render();
});

// 雲の上から島へ降りていく入場カット。
function updateIntroFlight(now) {
  const elapsed = now - introStartedAt;
  const linear = THREE.MathUtils.clamp(elapsed / INTRO_DURATION, 0, 1);
  // 序盤ゆっくり → 中盤加速 → 着地で減速
  const eased = linear < 0.5
    ? 4 * linear * linear * linear
    : 1 - Math.pow(-2 * linear + 2, 3) / 2;

  currentPosition.lerpVectors(introFrom, introTo, eased);
  currentTarget.lerpVectors(introTargetFrom, introTargetTo, eased);

  // まっすぐ降りると単調なので、軌道を少しだけ横に膨らませる
  currentPosition.x += Math.sin(eased * Math.PI) * 26;

  // 雲は抜けきったところで薄くする
  const cloudFade = THREE.MathUtils.clamp((eased - 0.3) / 0.45, 0, 1);
  world.clouds.setVisibility(THREE.MathUtils.lerp(1, CLOUD_RESIDUAL_OPACITY, cloudFade));

  world.setFogRange(
    THREE.MathUtils.lerp(FOG_INTRO.near, FOG_SETTLED.near, eased),
    THREE.MathUtils.lerp(FOG_INTRO.far, FOG_SETTLED.far, eased)
  );

  if (linear >= 1) {
    introState = 'done';
    document.body.classList.remove('is-intro');
    desiredPosition.copy(keyframes[0].position);
    desiredTarget.copy(keyframes[0].target);
    updateRailFromScroll();
  }
}

// 建物を直接クリックしてその章へ飛べるようにする。
// スクロールでの巡回は残したまま、「選ぶ」操作を足す。
function bindWorldPicking() {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const canvas = world.renderer.domElement;
  let pressedAt = null;
  let lastHoverCheck = 0;

  const pickAt = (event) => {
    if (introState !== 'done' || world.anchors.size === 0) return null;
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, world.camera);
    const targets = [...world.anchors.values()];
    const hit = raycaster.intersectObjects(targets, true)[0];
    if (!hit) return null;

    let node = hit.object;
    while (node && !node.userData?.id) node = node.parent;
    return node?.userData?.id || null;
  };

  window.addEventListener('pointermove', (event) => {
    const now = performance.now();
    // 毎フレームのレイキャストは無駄なので間引く
    if (now - lastHoverCheck < 90) return;
    lastHoverCheck = now;
    canvas.classList.toggle('is-pointing', Boolean(pickAt(event)));
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    pressedAt = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  window.addEventListener('pointerup', (event) => {
    if (!pressedAt) return;
    const moved = Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y);
    pressedAt = null;
    if (moved > 6) return;

    const id = pickAt(event);
    if (!id) return;

    const index = CHAPTERS.findIndex(
      (chapter) => (chapter.anchorId || chapter.id) === id
    );
    if (index < 0) return;

    navigateToChapter(index);
  }, { passive: true });
}

// レール上を辿ると間の章のカメラ位置を全部経由してしまい、行ったり来たりに見える。
// 紙で画面を覆っている隙にカメラを移してしまうことで、経由も待ち時間もなくす。
function navigateToChapter(index) {
  if (wiping) return;
  wiping = true;

  const chapter = CHAPTERS[index];
  const wipe = document.getElementById('wipe');
  const sheet = wipe.querySelector('.wipe__sheet');
  const label = wipe.querySelector('.wipe__label');

  wipe.querySelector('.wipe__numeral').textContent = `${chapter.numeral} — ${chapter.kicker}`;
  wipe.querySelector('.wipe__name').textContent = chapter.label;

  sheet.animate([
    { transform: 'translateX(-105%)', easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    { transform: 'translateX(0)', offset: WIPE_COVER_AT, easing: 'linear' },
    { transform: 'translateX(0)', offset: 0.6, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    { transform: 'translateX(105%)' }
  ], { duration: WIPE_DURATION, fill: 'forwards' });

  label.animate([
    { opacity: 0, transform: 'translateY(14px)', offset: 0 },
    { opacity: 0, transform: 'translateY(14px)', offset: WIPE_COVER_AT * 0.72 },
    { opacity: 1, transform: 'translateY(0)', offset: WIPE_COVER_AT + 0.04, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    { opacity: 1, transform: 'translateY(0)', offset: 0.58 },
    { opacity: 0, transform: 'translateY(-10px)', offset: 0.74 },
    { opacity: 0, offset: 1 }
  ], { duration: WIPE_DURATION, fill: 'forwards' });

  // 紙が覆いきった瞬間に世界を差し替える
  window.setTimeout(() => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: (index / (keyframes.length - 1)) * scrollable,
      behavior: 'instant'
    });

    orbit.yaw = 0;
    orbit.pitch = 0;

    desiredPosition.copy(keyframes[index].position);
    desiredTarget.copy(keyframes[index].target);
    currentPosition.copy(desiredPosition);
    currentTarget.copy(desiredTarget);

    activeChapter = index;
    syncActiveChapter();
  }, WIPE_DURATION * WIPE_COVER_AT);

  window.setTimeout(() => {
    wiping = false;
  }, WIPE_DURATION);
}

// ドラッグで少しだけ見回せるようにする。離すとゆっくり正面へ戻る。
function bindOrbit() {
  const canvas = world.renderer.domElement;

  window.addEventListener('pointerdown', (event) => {
    if (introState !== 'done') return;
    if (event.target.closest('.chapter__panel, .masthead, .chapter-index')) return;
    orbit.dragging = true;
    orbit.moved = 0;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
  }, { passive: true });

  window.addEventListener('pointermove', (event) => {
    if (!orbit.dragging) return;
    const deltaX = event.clientX - orbit.lastX;
    const deltaY = event.clientY - orbit.lastY;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;
    orbit.moved += Math.hypot(deltaX, deltaY);

    orbit.yaw = THREE.MathUtils.clamp(
      orbit.yaw - deltaX * ORBIT_SENSITIVITY,
      -ORBIT_MAX_YAW,
      ORBIT_MAX_YAW
    );
    orbit.pitch = THREE.MathUtils.clamp(
      orbit.pitch + deltaY * ORBIT_SENSITIVITY,
      -ORBIT_MAX_PITCH,
      ORBIT_MAX_PITCH
    );
    canvas.classList.add('is-grabbing');
  }, { passive: true });

  window.addEventListener('pointerup', () => {
    orbit.dragging = false;
    canvas.classList.remove('is-grabbing');
  }, { passive: true });
}

// カメラをターゲット周りに少しだけ回す
function applyOrbit(position, target) {
  orbitOffset.copy(position).sub(target);
  orbitSpherical.setFromVector3(orbitOffset);
  orbitSpherical.theta += orbit.yaw;
  orbitSpherical.phi = THREE.MathUtils.clamp(
    orbitSpherical.phi + orbit.pitch,
    0.12,
    Math.PI * 0.495
  );
  orbitOffset.setFromSpherical(orbitSpherical);
  position.copy(target).add(orbitOffset);
}

function updateRailFromScroll() {
  if (introState !== 'done' || wiping) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  const progress = THREE.MathUtils.clamp(ratio, 0, 1) * (keyframes.length - 1);

  const index = Math.min(Math.floor(progress), keyframes.length - 2);
  const local = THREE.MathUtils.clamp(progress - index, 0, 1);
  const eased = local * local * (3 - 2 * local);

  const from = keyframes[index];
  const to = keyframes[index + 1];

  desiredPosition.lerpVectors(from.position, to.position, eased);
  desiredTarget.lerpVectors(from.target, to.target, eased);

  // 章と章の間はカメラを持ち上げて、建物を突き抜けないようにする
  desiredPosition.y += Math.sin(eased * Math.PI) * ARC_HEIGHT;

  const nearest = Math.round(progress);
  if (nearest !== activeChapter) {
    activeChapter = nearest;
    syncActiveChapter();
  }
}

let videoActive = false;

function syncActiveChapter() {
  // Film 章の前後にいるときだけ動画を読み込んで再生する
  const filmIndex = CHAPTERS.findIndex((chapter) => chapter.id === 'film');
  const shouldPlay = Math.abs(activeChapter - filmIndex) <= 1;
  if (shouldPlay !== videoActive) {
    videoActive = shouldPlay;
    world.setVideoActive(shouldPlay);
  }

  indexRoot.querySelectorAll('.chapter-index__item').forEach((item, index) => {
    item.classList.toggle('is-active', index === activeChapter);
  });
  scrollRoot.querySelectorAll('.chapter').forEach((section, index) => {
    section.classList.toggle('is-active', index === activeChapter);
  });
  document.body.dataset.chapter = CHAPTERS[activeChapter].id;
}

function buildChapterSections() {
  scrollRoot.replaceChildren(...CHAPTERS.map((chapter, index) => {
    const section = document.createElement('section');
    section.className = `chapter chapter--${chapter.side}`;
    section.id = `chapter-${chapter.id}`;
    if (index === 0) section.classList.add('is-active');

    const panel = document.createElement('div');
    panel.className = 'chapter__panel';

    panel.append(
      element('div', 'chapter__numeral', chapter.numeral),
      element('div', 'chapter__kicker', chapter.kicker),
      element('h2', 'chapter__title', chapter.title),
      element('p', 'chapter__body', chapter.body)
    );

    if (chapter.cta || chapter.ctaSecondary) {
      const actions = document.createElement('div');
      actions.className = 'chapter__actions';
      if (chapter.cta) actions.append(link(chapter.cta, 'is-primary'));
      if (chapter.ctaSecondary) actions.append(link(chapter.ctaSecondary, ''));
      panel.append(actions);
    }

    section.append(panel);
    return section;
  }));
}

function bindMastheadLink() {
  const cta = document.querySelector('.masthead__cta');
  cta?.addEventListener('click', (event) => {
    event.preventDefault();
    navigateToChapter(CHAPTERS.length - 1);
  });
}

function buildChapterIndex() {
  indexRoot.replaceChildren(...CHAPTERS.map((chapter, index) => {
    const item = document.createElement('a');
    item.className = 'chapter-index__item';
    if (index === 0) item.classList.add('is-active');
    item.href = `#chapter-${chapter.id}`;
    item.addEventListener('click', (event) => {
      event.preventDefault();
      navigateToChapter(index);
    });
    item.append(
      element('span', 'chapter-index__label', chapter.label),
      element('span', 'chapter-index__numeral', chapter.numeral)
    );
    return item;
  }));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  // 改行を含む原稿をそのまま流し込む
  String(text).split('\n').forEach((line, index) => {
    if (index > 0) node.append(document.createElement('br'));
    node.append(document.createTextNode(line));
  });
  return node;
}

function link({ text, url }, modifier) {
  const anchor = document.createElement('a');
  anchor.className = `chapter__cta ${modifier}`.trim();
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = text;
  return anchor;
}
