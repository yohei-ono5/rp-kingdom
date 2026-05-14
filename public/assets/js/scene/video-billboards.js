import * as THREE from 'three';

const SCREEN_FORWARD_OFFSET = 0.025;
const FRAME_DEPTH = 0.15;
const FRAME_THICKNESS = 0.18;
const POST_RADIUS = 0.07;
const AUTOPLAY_PRELOAD_TIMEOUT = 1600;

const pendingPlayback = [];
let gestureListenerBound = false;

export function initVideoBillboards({
  billboards,
  parentGroup,
  clickTargets
}) {
  const meta = [];

  for (const data of billboards) {
    try {
      const wrapper = createBillboard(data);
      parentGroup.add(wrapper);
      clickTargets.push(wrapper);
      meta.push(wrapper);
    } catch (error) {
      console.error(`Failed to create video billboard "${data.id}".`, error);
    }
  }

  ensureGestureFallback();
  return meta;
}

function createBillboard(data) {
  const wrapper = new THREE.Group();
  const width = data.width;
  const height = data.height;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + FRAME_THICKNESS, height + FRAME_THICKNESS, FRAME_DEPTH),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1f,
      roughness: 0.7,
      metalness: 0.4
    })
  );
  frame.castShadow = true;
  frame.receiveShadow = true;
  wrapper.add(frame);

  const video = createVideoElement(data.videoUrl);
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      toneMapped: false
    })
  );
  screen.position.z = FRAME_DEPTH / 2 + SCREEN_FORWARD_OFFSET;
  wrapper.add(screen);

  addSupportPosts(wrapper, data, width, height);

  wrapper.position.set(...data.position);
  wrapper.rotation.y = data.rotationY || 0;

  wrapper.userData = {
    id: data.id,
    url: data.url,
    isVideoBillboard: true,
    width,
    height,
    video,
    texture,
    shouldPlayVideo: false,
    videoPlaybackRequested: false
  };

  return wrapper;
}

function createVideoElement(src) {
  const video = document.createElement('video');
  video.loop = true;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.autoplay = false;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.style.display = 'none';
  video.src = src;
  document.body.appendChild(video);

  window.setTimeout(() => {
    if (!video.paused) {
      video.pause();
    }
  }, AUTOPLAY_PRELOAD_TIMEOUT);

  video.addEventListener('error', () => {
    console.warn(`Video element failed to load: ${src}`);
  });

  return video;
}

function addSupportPosts(wrapper, data, width, height) {
  const elevationY = data.position?.[1] ?? 2.5;
  const postLength = elevationY - height / 2 - FRAME_THICKNESS / 2;
  if (postLength <= 0.1) return;

  const postOffsetX = width * 0.32;
  const postY = -(height / 2 + FRAME_THICKNESS / 2 + postLength / 2);

  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x222226,
    roughness: 0.85,
    metalness: 0.3
  });

  for (const sign of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, postLength, 12),
      postMaterial
    );
    post.position.set(sign * postOffsetX, postY, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    wrapper.add(post);
  }
}

function ensureGestureFallback() {
  if (gestureListenerBound) return;
  gestureListenerBound = true;

  const flush = () => {
    while (pendingPlayback.length) {
      const video = pendingPlayback.shift();
      if (!video.dataset.playbackRequested) {
        continue;
      }
      video.play().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', flush, { passive: true });
  window.addEventListener('keydown', flush);
}

export function updateVideoBillboardPlayback({
  billboards,
  pageVisible = true,
  currentView = 'village'
}) {
  if (!Array.isArray(billboards)) return;

  billboards.forEach((billboard) => {
    const video = billboard.userData?.video;
    if (!video) return;

    const shouldPlay = pageVisible && currentView === 'village';

    billboard.userData.shouldPlayVideo = shouldPlay;

    if (shouldPlay) {
      playVideo(video, billboard);
    } else {
      pauseVideo(video, billboard);
    }
  });
}

function playVideo(video, billboard) {
  if (billboard.userData.videoPlaybackRequested && !video.paused) {
    return;
  }

  billboard.userData.videoPlaybackRequested = true;
  video.dataset.playbackRequested = 'true';
  const playPromise = video.play();

  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      billboard.userData.videoPlaybackRequested = false;
      if (!pendingPlayback.includes(video)) {
        pendingPlayback.push(video);
      }
    });
  }
}

function pauseVideo(video, billboard) {
  billboard.userData.videoPlaybackRequested = false;
  delete video.dataset.playbackRequested;

  if (!video.paused) {
    video.pause();
  }
}
