const STANDARD_HOUSE_MODEL_URL = new URL('../models/Fantasy_House_6.glb', import.meta.url).href;
const ARTIST_HOUSE_MODEL_URL = new URL('../models/Fantasy_House.glb', import.meta.url).href;
const YOUTUBE_PROMO_VIDEO_URL = new URL('../videos/youtube-promo.mp4', import.meta.url).href;

export const HOUSE_DESTINATIONS = [
  {
    id: 'home',
    label: 'COMPANY',
    name: 'Company',
    url: 'https://thecrown-pro.com/',
    modelUrl: STANDARD_HOUSE_MODEL_URL,
    position: [-4.5, 0, -1.8],
    scale: 0.72,
    rotationY: 0.08,
    doorOffset: [0.08, 0, 0.92],
    doorFacing: [0, 0, 1]
  },
  {
    id: 'music',
    label: 'MUSIC',
    name: 'Music',
    url: 'https://open.spotify.com/intl-ja/artist/72jZx00qFvEw8QOerhRuL5',
    modelUrl: STANDARD_HOUSE_MODEL_URL,
    position: [-11.5, 0, 6.8],
    scale: 0.68,
    rotationY: -0.28,
    doorOffset: [0.08, 0, 0.92],
    doorFacing: [0, 0, 1]
  },
  {
    id: 'shop',
    label: 'SHOP',
    name: 'Official Store',
    url: 'https://store.rujie-official.com/',
    modelUrl: STANDARD_HOUSE_MODEL_URL,
    position: [7.8, 0, -6.5],
    scale: 0.7,
    rotationY: 0.35,
    doorOffset: [0.08, 0, 0.92],
    doorFacing: [0, 0, 1]
  }
];

export const FRONT_HOUSE_DESTINATION = {
  id: 'artist',
  label: 'ARTIST',
  name: 'Artist House',
  url: 'https://artist.rujie-official.com/',
  modelUrl: ARTIST_HOUSE_MODEL_URL,
  position: [9.8, 0, 8.6],
  scale: 0.76,
  rotationY: -0.18,
  doorOffset: [0.48, 0, 0.58],
  doorFacing: [0, 0, 1]
};

export const VIDEO_BILLBOARDS = [
  {
    id: 'youtube',
    label: 'YOUTUBE',
    name: 'Latest Video',
    url: 'https://www.youtube.com/@Rujie-official',
    videoUrl: YOUTUBE_PROMO_VIDEO_URL,
    position: [-12.0, 3.0, 13.0],
    rotationY: 0,
    width: 4.0,
    height: 2.25
  }
];

export const LAND_PLOTS = [
  {
    id: 'A-01',
    title: '広告枠募集中',
    status: 'FOR SALE',
    price: 'お問い合わせください',
    size: '4.8m x 4.2m',
    description: '村の入口に近い目立つ区画',
    position: [-15.2, 0, -4.8],
    width: 4.8,
    depth: 4.2,
    rotationY: 0.18
  },
  {
    id: 'A-02',
    title: '分譲地',
    status: 'FOR SALE',
    price: 'スポンサー枠',
    size: '4.2m x 4.6m',
    description: 'MAPビューでも見つけやすい角地',
    position: [13.4, 0, 2.8],
    width: 4.2,
    depth: 4.6,
    rotationY: -0.14
  },
  {
    id: 'B-01',
    title: '広告枠募集中',
    status: 'FOR SALE',
    price: '掲載相談可',
    size: '4.6m x 4.0m',
    description: 'SHOPエリア横の空きスペース',
    position: [2.2, 0, -15.4],
    width: 4.6,
    depth: 4.0,
    rotationY: 0.05
  },
  {
    id: 'B-02',
    title: '分譲地',
    status: 'FOR SALE',
    price: 'お問い合わせください',
    size: '4.4m x 4.4m',
    description: '広場に面したプロモーション区画',
    position: [-4.5, 0, 13.8],
    width: 4.4,
    depth: 4.4,
    rotationY: -0.08
  }
];
