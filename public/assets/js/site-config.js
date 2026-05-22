const STANDARD_HOUSE_MODEL_URL = new URL('../models/Fantasy_House_6.glb', import.meta.url).href;
const ARTIST_HOUSE_MODEL_URL = new URL('../models/Fantasy_House.glb', import.meta.url).href;
const TREE_MODEL_URL = new URL('../models/tree_LOD0.glb', import.meta.url).href;
const YOUTUBE_PROMO_VIDEO_URL = 'https://pub-8c47d9817fce4e86a82d02fad188f8e8.r2.dev/youtube-promo.mp4';
const CHARACTER_MODEL_URL = 'https://pub-8c47d9817fce4e86a82d02fad188f8e8.r2.dev/3D_object/character.glb';
const WINDMILL_MODEL_URL = 'https://pub-8c47d9817fce4e86a82d02fad188f8e8.r2.dev/3D_object/windmill.glb';

export const HOUSE_DESTINATIONS = [
  {
    id: 'company',
    url: 'https://thecrown-pro.com/',
    modelUrl: STANDARD_HOUSE_MODEL_URL,
    position: [-4.5, 0, -1.8],
    scale: 1.08,
    rotationY: 0.08,
    doorOffset: [0.08, 0, 0.92],
    doorFacing: [0, 0, 1]
  },
  {
    id: 'music',
    links: [
      {
        id: 'spotify',
        label: 'Spotify',
        url: 'https://open.spotify.com/intl-ja/artist/72jZx00qFvEw8QOerhRuL5'
      },
      {
        id: 'appleMusic',
        label: 'Apple Music',
        url: 'https://music.apple.com/jp/artist/rujie/1733652933'
      }
    ],
    modelUrl: STANDARD_HOUSE_MODEL_URL,
    position: [-11.5, 0, 6.8],
    scale: 1.02,
    rotationY: -0.28,
    doorOffset: [0.08, 0, 0.92],
    doorFacing: [0, 0, 1]
  },
  {
    id: 'sns',
    url: 'https://www.instagram.com/rujie.official/',
    modelUrl: WINDMILL_MODEL_URL,
    position: [-20.4, 0, 6.0],
    scale: 8.6,
    rotationY: -0.18,
    doorOffset: [0, 0, -0.5],
    doorFacing: [0, 0, -1],
    clearRadius: 5.4
  },
  {
    id: 'store',
    url: 'https://store.rujie-official.com/',
    modelUrl: STANDARD_HOUSE_MODEL_URL,
    position: [7.8, 0, -6.5],
    scale: 1.05,
    rotationY: 0.35,
    doorOffset: [0.08, 0, 0.92],
    doorFacing: [0, 0, 1]
  }
];

export const FRONT_HOUSE_DESTINATION = {
  id: 'artist',
  url: 'https://artist.rujie-official.com/',
  modelUrl: ARTIST_HOUSE_MODEL_URL,
  position: [9.8, 0, 8.6],
  scale: 0.76,
  rotationY: -0.18,
  doorOffset: [-1.1, 0, 0.1],
  doorFacing: [-1, 0, 0]
};

export const VIDEO_BILLBOARDS = [
  {
    id: 'youtube',
    url: 'https://www.youtube.com/@Rujie-official',
    videoUrl: YOUTUBE_PROMO_VIDEO_URL,
    position: [-12.0, 3.0, 13.0],
    rotationY: 0,
    width: 4.0,
    height: 2.25
  }
];

export const CHARACTERS = [
  {
    id: 'main-character',
    modelUrl: CHARACTER_MODEL_URL,
    position: [1.4, 0, 4.2],
    rotationY: -0.55,
    height: 0.57,
    animationIndex: 0,
    movement: {
      enabled: true,
      bounds: {
        minX: -23,
        maxX: 23,
        minZ: 1.8,
        maxZ: 8.2
      },
      speedRange: [0.45, 0.76],
      pauseRange: [1.4, 5.6],
      facingOffset: -Math.PI / 2
    }
  }
];

export const TREE_SCATTER = {
  modelUrl: TREE_MODEL_URL,
  count: 38,
  seed: 20260501,
  bounds: {
    minX: -31,
    maxX: 29,
    minZ: -31,
    maxZ: -8
  },
  centerClearRadius: 14,
  scaleRange: [0.55, 0.95],
  minDistance: 2.15,
  exclusionPadding: 1.7
};

export const WEST_TREE_SCATTER = {
  modelUrl: TREE_MODEL_URL,
  count: 18,
  seed: 20260522,
  bounds: {
    minX: -33,
    maxX: -18,
    minZ: -6,
    maxZ: 18
  },
  centerClearRadius: 0,
  scaleRange: [0.6, 1.05],
  minDistance: 2.4,
  exclusionPadding: 1.9
};

export const LAND_PLOTS = [
  {
    id: 'A-01',
    size: '4.8m x 4.2m',
    position: [-15.2, 0, -4.8],
    width: 4.8,
    depth: 4.2,
    rotationY: 0.18
  },
  {
    id: 'B-01',
    size: '4.6m x 4.0m',
    position: [2.2, 0, -15.4],
    width: 4.6,
    depth: 4.0,
    rotationY: 0.05
  },
  {
    id: 'B-02',
    size: '4.4m x 4.4m',
    position: [-4.5, 0, 13.8],
    width: 4.4,
    depth: 4.4,
    rotationY: -0.08
  }
];
