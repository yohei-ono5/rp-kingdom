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
const JUMP_DURATION = 1250;
// 外部サイトへ離脱するときの演出。紙の扉が閉じてから遷移する。
const DEPART_DOOR_DURATION = 640;
const DEPART_TOTAL = 1020;
// 軽いオービット。構図が壊れない範囲だけ振れるように上限を決める。
const ORBIT_MAX_YAW = THREE.MathUtils.degToRad(20);
const ORBIT_MAX_PITCH = THREE.MathUtils.degToRad(11);
const ORBIT_SENSITIVITY = 0.0032;
const ORBIT_RECENTER = 0.012;

// ブラウザはリロードや戻る操作でスクロール位置を復元する。
// そのままだと ENTER 直後に前回いた章へ飛んでしまうので、必ず先頭から始める。
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

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
let jump = null;
let departing = false;
let departure = null;
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
  } else if (departure) {
    updateDeparture(now);
  } else if (jump) {
    updateJump(now);
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
    window.scrollTo(0, 0);
    desiredPosition.copy(keyframes[0].position);
    desiredTarget.copy(keyframes[0].target);
    activeChapter = 0;
    syncActiveChapter();
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
// 直接クリックしたときは現在地から目的地へ直行させる。
function navigateToChapter(index) {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({
    top: (index / (keyframes.length - 1)) * scrollable,
    behavior: 'instant'
  });

  jump = {
    startedAt: performance.now(),
    fromPosition: currentPosition.clone(),
    fromTarget: currentTarget.clone(),
    toPosition: keyframes[index].position.clone(),
    toTarget: keyframes[index].target.clone()
  };

  activeChapter = index;
  syncActiveChapter();
}

function updateJump(now) {
  const linear = THREE.MathUtils.clamp((now - jump.startedAt) / JUMP_DURATION, 0, 1);
  const eased = 1 - Math.pow(1 - linear, 3);

  currentPosition.lerpVectors(jump.fromPosition, jump.toPosition, eased);
  currentTarget.lerpVectors(jump.fromTarget, jump.toTarget, eased);
  // 建物をすり抜けないように途中だけ持ち上げる
  currentPosition.y += Math.sin(eased * Math.PI) * ARC_HEIGHT;

  if (linear >= 1) {
    jump = null;
    desiredPosition.copy(currentPosition);
    desiredTarget.copy(currentTarget);
    updateRailFromScroll();
  }
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
  if (introState !== 'done' || jump) return;
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
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = text;

  anchor.addEventListener('click', (event) => {
    // 修飾キー付きや中クリックは新規タブで開きたいはずなので、演出は挟まない
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    departTo(url, text);
  });

  return anchor;
}

// 外部サイトへ出ていくときの演出。
//
// 新規タブで開きたいが、演出を挟んでから window.open するとポップアップブロックに
// 引っかかる(クリックのコールスタックを抜けた時点で許可が切れるため)。
// そこでタブだけクリック直後に同期で開き、演出はその新規タブ側に持たせる。
// 元のタブではカメラだけ寄せて戻す。
function departTo(url, label) {
  if (departing) return;

  const tab = window.open('', '_blank');

  if (!tab) {
    // ブロックされた場合だけ、紙の扉を閉じて同じタブで遷移する
    departInPlace(url, label);
    return;
  }

  tab.document.write(buildDepartureSplash(url, label));
  tab.document.close();

  // 元のタブは目的地へ少しだけ寄って戻る。戻ってきたときには元の景色に復帰している。
  departure = { startedAt: performance.now(), fromPosition: currentPosition.clone(), returning: true };
}

// 新規タブに書き込む「出発中」の画面。世界観を引き継いだまま行き先へ送り出す。
function buildDepartureSplash(url, label) {
  const payload = JSON.stringify({ url, label });
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8" />
<title>${escapeHtml(label)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&display=swap" rel="stylesheet" />
<style>
  html, body { height: 100%; margin: 0; background: #f2e6cf; }
  body {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; color: #1b1a17;
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    background:
      radial-gradient(ellipse at 24% 16%, rgba(255,255,255,0.6), transparent 60%),
      radial-gradient(ellipse at 80% 82%, rgba(196,168,118,0.26), transparent 62%),
      #f2e6cf;
  }
  .rule { width: 210px; height: 1px; background: rgba(27,26,23,0.18); }
  .kicker { font-size: 11px; letter-spacing: 0.42em; text-transform: uppercase; color: #c9a227; }
  .name { font-size: clamp(34px, 5vw, 68px); font-weight: 500; line-height: 1.08; text-align: center; padding: 0 24px; }
  .seam { width: 1px; height: 84px; background: linear-gradient(to bottom, transparent, #c9a227, transparent); }
  body > * { animation: rise 260ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  @keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
</style></head>
<body>
  <div class="rule"></div>
  <div class="kicker">Departing</div>
  <div class="name">${escapeHtml(label)}</div>
  <div class="seam"></div>
<script>
  var target = ${payload};
  setTimeout(function () {
    // 遷移先から元のタブを触れないようにしてから送り出す
    try { window.opener = null; } catch (error) {}
    location.replace(target.url);
  }, 450);
<\/script>
</body></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

// ポップアップがブロックされたときの退避路。紙の扉を閉じて同じタブで遷移する。
function departInPlace(url, label) {
  departing = true;

  const overlay = document.getElementById('depart');
  overlay.classList.add('is-active');
  overlay.querySelector('.depart__name').textContent = label;

  [
    [overlay.querySelector('.depart__panel--left'), '-101%'],
    [overlay.querySelector('.depart__panel--right'), '101%']
  ].forEach(([panel, offscreen]) => {
    panel.animate(
      [{ transform: `translateX(${offscreen})` }, { transform: 'translateX(0)' }],
      { duration: DEPART_DOOR_DURATION, easing: 'cubic-bezier(0.66, 0, 0.2, 1)', fill: 'forwards' }
    );
  });

  overlay.querySelector('.depart__label').animate(
    [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 320, delay: DEPART_DOOR_DURATION - 90, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
  );

  departure = { startedAt: performance.now(), fromPosition: currentPosition.clone(), returning: false };
  window.setTimeout(() => { window.location.href = url; }, DEPART_TOTAL);
}

function updateDeparture(now) {
  const elapsed = now - departure.startedAt;

  if (!departure.returning) {
    const linear = THREE.MathUtils.clamp(elapsed / DEPART_DOOR_DURATION, 0, 1);
    currentPosition.lerpVectors(departure.fromPosition, currentTarget, linear * linear * 0.5);
    return;
  }

  // 寄ってから戻る。戻り終えたら通常のレール制御に返す。
  const linear = THREE.MathUtils.clamp(elapsed / (DEPART_DOOR_DURATION * 2), 0, 1);
  const push = Math.sin(linear * Math.PI);
  currentPosition.lerpVectors(departure.fromPosition, currentTarget, push * 0.3);

  if (linear >= 1) {
    departure = null;
    updateRailFromScroll();
  }
}
