export const LANGUAGE_STORAGE_KEY = 'rp-kingdom-language';

export const LANGUAGES = [
  { code: 'ja', label: '日本語', locale: 'ja-JP', timeZone: 'Asia/Tokyo' },
  { code: 'en', label: 'English', locale: 'en-US', timeZone: 'America/Los_Angeles' },
  { code: 'ko', label: '한국어', locale: 'ko-KR', timeZone: 'Asia/Seoul' },
  { code: 'fr', label: 'Français', locale: 'fr-FR', timeZone: 'Europe/Paris' },
  { code: 'zh-TW', label: '繁體中文', locale: 'zh-TW', timeZone: 'Asia/Taipei' }
];

export const DEFAULT_POPUP_TEXT = {
  popupQuestion: 'リンク先へ移動しますか？',
  cancel: 'キャンセル',
  go: '移動する',
  fallbackLinkTitle: 'リンク先'
};

const LANGUAGE_CODES = new Set(LANGUAGES.map((language) => language.code));

const translations = {
  ja: {
    language: 'Language',
    menu: 'メニュー',
    resetView: 'HOME',
    map: 'MAP',
    introHint: 'Press Enter',
    hudIntro: 'Enter the clouds to begin.',
    hudMap: 'MAP view: top-down overview.',
    hudVillage: 'Drag to orbit. Click a house to zoom, then confirm.',
    popupQuestion: DEFAULT_POPUP_TEXT.popupQuestion,
    cancel: DEFAULT_POPUP_TEXT.cancel,
    go: DEFAULT_POPUP_TEXT.go,
    fallbackLinkTitle: DEFAULT_POPUP_TEXT.fallbackLinkTitle,
    clockJapan: 'Asia/Tokyo',
    clockLocal: 'Local',
    clockFixed: '固定時間',
    plotPrefix: 'Plot',
    plotFallbackTitle: '分譲地',
    plotFallbackPrice: 'お問い合わせください',
    plotInquiry: 'inquiries welcome',
    destinations: {
      artist: { label: 'Artist', name: 'Rujie Official Site' },
      company: { label: 'Company', name: 'The Crown Production' },
      music: { label: 'Music', name: 'Music' },
      store: { label: 'Store', name: 'Rujie Official Store' },
      youtube: { label: 'Youtube', name: 'Youtube' }
    },
    plots: {
      'A-01': {
        title: '広告枠募集中',
        status: 'FOR SALE',
        price: 'お問い合わせください',
        description: '村の入口に近い目立つ区画'
      },
      'A-02': {
        title: '分譲地',
        status: 'FOR SALE',
        price: 'スポンサー枠',
        description: 'MAPビューでも見つけやすい角地'
      },
      'B-01': {
        title: '広告枠募集中',
        status: 'FOR SALE',
        price: '掲載相談可',
        description: 'SHOPエリア横の空きスペース'
      },
      'B-02': {
        title: '分譲地',
        status: 'FOR SALE',
        price: 'お問い合わせください',
        description: '広場に面したプロモーション区画'
      }
    }
  },
  en: {
    language: 'Language',
    menu: 'Menu',
    resetView: 'Home',
    map: 'Map',
    introHint: 'Press Enter',
    hudIntro: 'Enter the clouds to begin.',
    hudMap: 'MAP view: top-down overview.',
    hudVillage: 'Drag to orbit. Click a house to zoom, then confirm.',
    popupQuestion: 'Open this destination?',
    cancel: 'Cancel',
    go: 'Go',
    fallbackLinkTitle: 'Destination',
    clockJapan: 'Asia/Tokyo',
    clockLocal: 'Local',
    clockFixed: 'Fixed',
    plotPrefix: 'Plot',
    plotFallbackTitle: 'Available Plot',
    plotFallbackPrice: 'Contact us',
    plotInquiry: 'inquiries welcome',
    destinations: {
      artist: { label: 'Artist', name: 'Rujie Official Site' },
      company: { label: 'Company', name: 'The Crown Production' },
      music: { label: 'Music', name: 'Music' },
      store: { label: 'Store', name: 'Rujie Official Store' },
      youtube: { label: 'Youtube', name: 'Youtube' }
    },
    plots: {
      'A-01': {
        title: 'Ad Space Available',
        status: 'FOR SALE',
        price: 'Contact us',
        description: 'A highly visible plot near the village entrance'
      },
      'A-02': {
        title: 'Available Plot',
        status: 'FOR SALE',
        price: 'Sponsor slot',
        description: 'A corner plot that is easy to find in MAP view'
      },
      'B-01': {
        title: 'Ad Space Available',
        status: 'FOR SALE',
        price: 'Listing available',
        description: 'Open space beside the SHOP area'
      },
      'B-02': {
        title: 'Available Plot',
        status: 'FOR SALE',
        price: 'Contact us',
        description: 'A promotion plot facing the village plaza'
      }
    }
  },
  ko: {
    language: 'Language',
    menu: '메뉴',
    resetView: '홈',
    map: '지도',
    introHint: 'Enter 키를 누르세요',
    hudIntro: '구름 속으로 들어가 시작하세요.',
    hudMap: 'MAP 보기: 위에서 보는 전체 지도.',
    hudVillage: '드래그해 둘러보고, 집을 클릭한 뒤 확인하세요.',
    popupQuestion: '이 목적지로 이동할까요?',
    cancel: '취소',
    go: '이동',
    fallbackLinkTitle: '링크',
    clockJapan: 'Asia/Tokyo',
    clockLocal: 'Local',
    clockFixed: '고정',
    plotPrefix: 'Plot',
    plotFallbackTitle: '분양지',
    plotFallbackPrice: '문의해 주세요',
    plotInquiry: '문의 환영',
    destinations: {
      artist: { label: 'Artist', name: 'Rujie Official Site' },
      company: { label: 'Company', name: 'The Crown Production' },
      music: { label: 'Music', name: 'Music' },
      store: { label: 'Store', name: 'Rujie Official Store' },
      youtube: { label: 'Youtube', name: 'Youtube' }
    },
    plots: {
      'A-01': {
        title: '광고 공간 모집 중',
        status: 'FOR SALE',
        price: '문의해 주세요',
        description: '마을 입구와 가까운 눈에 잘 띄는 구역'
      },
      'A-02': {
        title: '분양지',
        status: 'FOR SALE',
        price: '스폰서 구역',
        description: 'MAP 보기에서도 찾기 쉬운 코너 구역'
      },
      'B-01': {
        title: '광고 공간 모집 중',
        status: 'FOR SALE',
        price: '게재 상담 가능',
        description: 'SHOP 구역 옆의 빈 공간'
      },
      'B-02': {
        title: '분양지',
        status: 'FOR SALE',
        price: '문의해 주세요',
        description: '광장을 마주한 프로모션 구역'
      }
    }
  },
  fr: {
    language: 'Language',
    menu: 'Menu',
    resetView: 'Accueil',
    map: 'Carte',
    introHint: 'Appuyez sur Entrée',
    hudIntro: 'Entrez dans les nuages pour commencer.',
    hudMap: 'Vue MAP : aperçu de dessus.',
    hudVillage: 'Faites glisser pour explorer. Cliquez sur une maison, puis confirmez.',
    popupQuestion: 'Ouvrir cette destination ?',
    cancel: 'Annuler',
    go: 'Ouvrir',
    fallbackLinkTitle: 'Destination',
    clockJapan: 'Asia/Tokyo',
    clockLocal: 'Local',
    clockFixed: 'Fixe',
    plotPrefix: 'Plot',
    plotFallbackTitle: 'Terrain disponible',
    plotFallbackPrice: 'Nous contacter',
    plotInquiry: 'demandes bienvenues',
    destinations: {
      artist: { label: 'Artist', name: 'Rujie Official Site' },
      company: { label: 'Company', name: 'The Crown Production' },
      music: { label: 'Music', name: 'Music' },
      store: { label: 'Store', name: 'Rujie Official Store' },
      youtube: { label: 'Youtube', name: 'Youtube' }
    },
    plots: {
      'A-01': {
        title: 'Espace publicitaire',
        status: 'FOR SALE',
        price: 'Nous contacter',
        description: 'Un emplacement très visible près de l’entrée du village'
      },
      'A-02': {
        title: 'Terrain disponible',
        status: 'FOR SALE',
        price: 'Emplacement sponsor',
        description: 'Un angle facile à trouver dans la vue MAP'
      },
      'B-01': {
        title: 'Espace publicitaire',
        status: 'FOR SALE',
        price: 'Publication possible',
        description: 'Espace libre à côté de la zone SHOP'
      },
      'B-02': {
        title: 'Terrain disponible',
        status: 'FOR SALE',
        price: 'Nous contacter',
        description: 'Un emplacement promotionnel face à la place'
      }
    }
  },
  'zh-TW': {
    language: 'Language',
    menu: '選單',
    resetView: '首頁',
    map: '地圖',
    introHint: '按 Enter',
    hudIntro: '進入雲中開始體驗。',
    hudMap: 'MAP 視角：俯瞰全景。',
    hudVillage: '拖曳旋轉視角。點擊房屋後確認前往。',
    popupQuestion: '要前往這個目的地嗎？',
    cancel: '取消',
    go: '前往',
    fallbackLinkTitle: '連結',
    clockJapan: 'Asia/Tokyo',
    clockLocal: 'Local',
    clockFixed: '固定',
    plotPrefix: 'Plot',
    plotFallbackTitle: '可用地塊',
    plotFallbackPrice: '請洽詢',
    plotInquiry: '歡迎洽詢',
    destinations: {
      artist: { label: 'Artist', name: 'Rujie Official Site' },
      company: { label: 'Company', name: 'The Crown Production' },
      music: { label: 'Music', name: 'Music' },
      store: { label: 'Store', name: 'Rujie Official Store' },
      youtube: { label: 'Youtube', name: 'Youtube' }
    },
    plots: {
      'A-01': {
        title: '廣告欄位招募中',
        status: 'FOR SALE',
        price: '請洽詢',
        description: '靠近村莊入口、容易看見的地塊'
      },
      'A-02': {
        title: '可用地塊',
        status: 'FOR SALE',
        price: '贊助欄位',
        description: '在 MAP 視角也容易找到的角落地塊'
      },
      'B-01': {
        title: '廣告欄位招募中',
        status: 'FOR SALE',
        price: '可洽談刊登',
        description: 'SHOP 區旁的空間'
      },
      'B-02': {
        title: '可用地塊',
        status: 'FOR SALE',
        price: '請洽詢',
        description: '面向廣場的推廣地塊'
      }
    }
  }
};

export function createI18nController({ onChange } = {}) {
  let language = resolveInitialLanguage();

  function t(path, fallback = '') {
    const value = getPath(translations[language], path)
      ?? getPath(translations.ja, path)
      ?? fallback;
    return value;
  }

  function setLanguage(nextLanguage) {
    if (!LANGUAGE_CODES.has(nextLanguage) || nextLanguage === language) {
      return;
    }

    language = nextLanguage;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    onChange?.(language);
  }

  document.documentElement.lang = language;

  return {
    get language() {
      return language;
    },
    get locale() {
      return getLanguageMeta(language).locale;
    },
    get timeZone() {
      return getLanguageMeta(language).timeZone;
    },
    get currentLabel() {
      return getLanguageMeta(language).label;
    },
    languages: LANGUAGES,
    t,
    setLanguage,
    isJapanese() {
      return language === 'ja';
    }
  };
}

function resolveInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const requestedLanguage = params.get('lang');
  if (LANGUAGE_CODES.has(requestedLanguage)) {
    return requestedLanguage;
  }

  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (LANGUAGE_CODES.has(storedLanguage)) {
    return storedLanguage;
  }

  const browserLanguage = navigator.language;
  if (browserLanguage === 'zh-TW' || browserLanguage === 'zh-Hant') {
    return 'zh-TW';
  }

  const baseLanguage = browserLanguage?.split('-')[0];
  if (LANGUAGE_CODES.has(baseLanguage)) {
    return baseLanguage;
  }

  return 'ja';
}

function getLanguageMeta(language) {
  return LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];
}

function getPath(source, path) {
  if (!source) return undefined;
  return path.split('.').reduce((current, part) => current?.[part], source);
}
