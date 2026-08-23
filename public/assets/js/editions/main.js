import * as THREE from 'three';
import { CHAPTERS } from './chapters.js';
import { createWorld } from './world.js';

const ARC_HEIGHT = 6.5;
const CAMERA_DAMPING = 0.075;

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

world.camera.position.copy(currentPosition);
world.camera.lookAt(currentTarget);

world.ready.then(() => {
  document.body.classList.add('is-world-ready');
});

window.addEventListener('scroll', updateRailFromScroll, { passive: true });
window.addEventListener('resize', updateRailFromScroll, { passive: true });
updateRailFromScroll();

requestAnimationFrame(function frame() {
  requestAnimationFrame(frame);

  // フレームゲートは置かない。rAF 自体が vsync に同期しているので、
  // 自前で間引くと不規則な取りこぼしが起きて逆にカクつく。
  currentPosition.lerp(desiredPosition, CAMERA_DAMPING);
  currentTarget.lerp(desiredTarget, CAMERA_DAMPING);

  // 完全な静止を作らない。ごく僅かな呼吸で世界が生きて見える。
  const now = performance.now();
  const breathX = Math.sin(now * 0.00013) * 0.9;
  const breathY = Math.sin(now * 0.00021 + 1.3) * 0.55;

  world.camera.position.set(
    currentPosition.x + breathX,
    currentPosition.y + breathY,
    currentPosition.z
  );
  world.camera.lookAt(currentTarget);

  world.render();
});

function updateRailFromScroll() {
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

function syncActiveChapter() {
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

function buildChapterIndex() {
  indexRoot.replaceChildren(...CHAPTERS.map((chapter, index) => {
    const item = document.createElement('a');
    item.className = 'chapter-index__item';
    if (index === 0) item.classList.add('is-active');
    item.href = `#chapter-${chapter.id}`;
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
