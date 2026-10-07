import type { Locale } from './model'

/** Resolve supported system languages without changing saved documents. */
export function systemLocale(language?: string): Locale {
  if (!language) return 'zh-CN'
  const tag = language.toLowerCase().replaceAll('_', '-')
  if (tag.startsWith('zh'))
    return /(^|-)hant(-|$)|(^|-)(tw|hk|mo)(-|$)/.test(tag) ? 'zh-TW' : 'zh-CN'
  const supported: Record<string, Locale> = {
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES'
  }
  return supported[tag.split('-')[0]] ?? 'en-US'
}

type Sample = {
  title: string
  cards: readonly [readonly [string, string], readonly [string, string], readonly [string, string]]
  relation: string
}

export const walkSamples: Record<Locale, Sample> = {
  'zh-CN': {
    title: '从散步开始的一篇随想',
    cards: [
      ['先留住', '有时候，离开屏幕走一走，想法反而会浮上来。'],
      ['观察', '街角的树影、听到的一句话，都可以先留成一片。'],
      ['慢慢拼起来', '先把相关的片段靠在一起，再决定它们的顺序。']
    ],
    relation: '让我想到'
  },
  'zh-TW': {
    title: '從散步開始的一篇隨想',
    cards: [
      ['先留下來', '有時候，離開螢幕走一走，想法反而會浮上來。'],
      ['觀察', '街角的樹影、聽到的一句話，都可以先留成一片。'],
      ['慢慢拼起來', '先把相關的片段靠在一起，再決定它們的順序。']
    ],
    relation: '讓我想到'
  },
  'en-US': {
    title: 'A few thoughts that began with a walk',
    cards: [
      [
        'Catch it first',
        'Sometimes, stepping away from the screen for a walk lets an idea surface.'
      ],
      [
        'Notice',
        'A tree’s shadow on a street corner, a sentence overheard: either can become a small note.'
      ],
      [
        'Piece it together slowly',
        'Bring related fragments together first, then decide what order they belong in.'
      ]
    ],
    relation: 'reminds me of'
  },
  'ja-JP': {
    title: '散歩から始まった小さな随想',
    cards: [
      ['まず残しておく', '画面から離れて少し歩くと、かえって考えが浮かんでくることがある。'],
      ['気づいたこと', '街角の木陰や耳にしたひと言も、まずは小さなメモにしておける。'],
      ['ゆっくりつなげる', '関係のありそうな断片を近くに置いてから、並べる順番を考えてみる。']
    ],
    relation: 'ここから思い出した'
  },
  'ko-KR': {
    title: '산책에서 시작된 짧은 생각',
    cards: [
      ['먼저 남겨 두기', '가끔은 화면에서 벗어나 잠깐 걸을 때 오히려 생각이 떠오른다.'],
      ['눈여겨보기', '길모퉁이의 나무 그림자나 우연히 들은 한마디도 작은 메모로 남겨 둘 수 있다.'],
      ['천천히 이어 보기', '관련 있어 보이는 조각들을 먼저 가까이 놓고, 순서는 나중에 정해 본다.']
    ],
    relation: '떠오르게 한 생각'
  },
  'fr-FR': {
    title: 'Quelques pensées nées d’une promenade',
    cards: [
      [
        'Garder l’idée',
        'Parfois, s’éloigner de l’écran pour marcher un peu fait émerger une idée.'
      ],
      [
        'Observer',
        'L’ombre d’un arbre au coin d’une rue, une phrase entendue : tout peut devenir une petite note.'
      ],
      [
        'Assembler doucement',
        'Rapprocher d’abord les fragments qui semblent liés, puis choisir leur ordre.'
      ]
    ],
    relation: 'me fait penser à'
  },
  'de-DE': {
    title: 'Ein paar Gedanken, die beim Spazieren kamen',
    cards: [
      [
        'Erst einmal festhalten',
        'Manchmal taucht eine Idee gerade dann auf, wenn man den Bildschirm verlässt und ein wenig spazieren geht.'
      ],
      [
        'Beobachten',
        'Der Schatten eines Baumes an der Straßenecke, ein aufgeschnappter Satz: Beides lässt sich als kleine Notiz festhalten.'
      ],
      [
        'Langsam zusammenfügen',
        'Zusammengehörige Fragmente erst nebeneinanderlegen und danach über ihre Reihenfolge entscheiden.'
      ]
    ],
    relation: 'erinnert mich an'
  },
  'es-ES': {
    title: 'Unas ideas que empezaron con un paseo',
    cards: [
      [
        'Guardarla primero',
        'A veces, alejarse de la pantalla y caminar un poco hace que aparezca una idea.'
      ],
      [
        'Observar',
        'La sombra de un árbol en una esquina, una frase que escuchaste: todo puede convertirse en una pequeña nota.'
      ],
      [
        'Unirlas poco a poco',
        'Acerca primero los fragmentos relacionados y decide después en qué orden colocarlos.'
      ]
    ],
    relation: 'me recuerda a'
  }
}
