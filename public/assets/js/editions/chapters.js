// 章の定義。1章 = 1つの遷移先(= 販売可能な1区画)という構造にしてある。
// camera は世界を巡るレールのキーフレーム。position から target を見る。

export const CHAPTERS = [
  {
    id: 'kingdom',
    numeral: 'I',
    label: 'The Kingdom',
    kicker: 'Rujie Official',
    title: 'The Kingdom\nEdition',
    body: 'ひとつの世界に、すべての入口を。\n村を巡りながら、音楽・作品・物語へ辿り着く。',
    side: 'center',
    camera: { position: [0, 27, 112], target: [-2, -1, 2] }
  },
  {
    id: 'artist',
    numeral: 'II',
    label: 'Artist',
    kicker: 'The Manor',
    title: 'Artist',
    body: 'アーティスト Rujie の公式サイト。作品と歩みのすべてが、この館に。',
    cta: { text: 'Rujie Official Site', url: 'https://artist.rujie-official.com/' },
    side: 'left',
    camera: { position: [27, 12, 34], target: [9.8, 2.2, 8.6] }
  },
  {
    id: 'music',
    numeral: 'III',
    label: 'Music',
    kicker: 'The Music House',
    title: 'Music',
    body: '配信中の楽曲へ。Spotify と Apple Music で聴けます。',
    cta: { text: 'Spotify', url: 'https://open.spotify.com/intl-ja/artist/72jZx00qFvEw8QOerhRuL5' },
    ctaSecondary: { text: 'Apple Music', url: 'https://music.apple.com/jp/artist/rujie/1733652933' },
    side: 'right',
    camera: { position: [5, 11, 31], target: [-11.5, 2.0, 6.8] }
  },
  {
    id: 'store',
    numeral: 'IV',
    label: 'Store',
    kicker: 'The Trading Post',
    title: 'Store',
    body: 'オフィシャルグッズの店。ここでしか手に入らないものを。',
    cta: { text: 'Official Store', url: 'https://store.rujie-official.com/' },
    side: 'left',
    camera: { position: [31, 12, 17], target: [7.8, 2.0, -6.5] }
  },
  {
    id: 'sns',
    numeral: 'V',
    label: 'Social',
    kicker: 'The Windmill',
    title: 'Social',
    body: '風車は今日も回る。日々の景色は Instagram で。',
    cta: { text: 'Instagram', url: 'https://www.instagram.com/rujie.official/' },
    side: 'right',
    camera: { position: [-6.8, 9.5, 1.1], target: [-17.36, 4.0, 2.96] }
  },
  {
    id: 'film',
    // 世界の中でこの章に対応するオブジェクト(看板)のID
    anchorId: 'youtube',
    numeral: 'VI',
    label: 'Film',
    kicker: 'The Screen',
    title: 'Film',
    body: '広場のスクリーンには、最新の映像が流れている。',
    cta: { text: 'YouTube Channel', url: 'https://www.youtube.com/@Rujie-official' },
    side: 'left',
    camera: { position: [-6.5, 5.4, 24.0], target: [-15, 3.0, 18] }
  },
  {
    id: 'company',
    numeral: 'VII',
    label: 'Company',
    kicker: 'The Hall',
    title: 'Company',
    body: 'この王国をつくる会社、The Crown Production。',
    cta: { text: 'The Crown Production', url: 'https://thecrown-pro.com/' },
    side: 'right',
    camera: { position: [3.77, 7.5, 12.58], target: [-4.33, 4.0, -0.82] }
  },
  {
    id: 'land',
    numeral: 'VIII',
    label: 'Land',
    kicker: 'For Sale',
    title: 'Own a\nplot',
    body: 'この世界には、まだ空いている土地がある。\n一区画を持てば、あなたの入口がここに建つ。',
    cta: { text: '区画について問い合わせる', url: 'https://thecrown-pro.com/' },
    side: 'center',
    camera: { position: [52, 9, 70], target: [0, -9, 4] }
  }
];
