/**
 * 常用表情包：Twemoji 72x72 资源 codepoint（小写十六进制，不含 .png）
 * 见 https://github.com/twitter/twemoji
 */
export const COMMON_TWEMOJI_CODES: string[] = [
  '1f600',
  '1f603',
  '1f604',
  '1f601',
  '1f606',
  '1f605',
  '1f602',
  '1f923',
  '1f642',
  '1f643',
  '1fae0',
  '1f972',
  '1f979',
  '1f970',
  '1f60d',
  '1f929',
  '1f618',
  '1f617',
  '1f619',
  '1f61a',
  '1f60b',
  '1f61b',
  '1f61c',
  '1f92d',
  '1f910',
  '1f928',
  '1f612',
  '1f611',
  '1f614',
  '1f622',
  '1f62d',
  '1f621',
  '1f624',
  '1f620',
  '1f92c',
  '1f631',
  '1f634',
  '1f4a4',
  '1f525',
  '1f48b',
  '2764',
  '1f9e1',
  '1f49b',
  '1f49a',
  '1f499',
  '1f44d',
  '1f44e',
  '1f44f',
  '1f389',
  '1f38a',
  '1f947',
  '1f3c6',
  '1f440',
  '2728',
  '1f37a',
  '1f37b',
  '1f355',
  '1f36a',
  '1f984',
  '1f431',
  '1f436',
  '1f435',
  '1f648',
  '1f649',
  '1f64a',
];

/**
 * Twemoji 72x72 PNG（cdnjs 较稳定；旧版 jsdelivr/gh 路径常 404/500）
 * 见 https://cdnjs.com/libraries/twemoji
 */
export const TWEMOJI_CDN_TEMPLATE =
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/{code}.png';

export function twemojiAssetUrl(code: string): string {
  return TWEMOJI_CDN_TEMPLATE.replace('{code}', code.toLowerCase());
}

/**
 * 将单个或连写的十六进制码位转为展示用 Unicode 字符（不依赖外链图片，弹窗主展示用）
 * 支持 `1f600` 或 `2764`（红心会附加 VS16 以尽量彩色呈现）
 */
export function twemojiHexToEmojiChar(hex: string): string {
  const parts = hex
    .toLowerCase()
    .trim()
    .split('-')
    .map(function trimPart(p) {
      return p.trim();
    })
    .filter(Boolean);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const n = Number.parseInt(parts[i], 16);
    if (!Number.isFinite(n)) {
      return '\uFFFD';
    }
    out += String.fromCodePoint(n);
  }
  if (parts.length === 1 && parts[0] === '2764') {
    out += '\uFE0F';
  }
  return out;
}

/** 常见颜文字（插入为文字图层） */
export const COMMON_KAOMOJI: string[] = [
  '(๑•̀ㅂ•́)و✧',
  '(╯°□°）╯︵ ┻━┻',
  '¯\\_(ツ)_/¯',
  '(｡•́︿•̀｡)',
  '(づ￣ ³￣)づ',
  '(๑˃̵ᴗ˂̵)و',
  'ヽ(✿ﾟ▽ﾟ)ノ',
  '(ง •̀_•́)ง',
  '(っ´ω`c)',
  '（´-`）',
  '(๑>◡<๑)',
  '٩(ˊᗜˋ*)و',
  '(´；ω；`)',
  '(⊙_⊙)？',
  '(￣▽￣)',
  '(｀・ω・´)',
  '→_→',
  '(๑¯ω¯๑)',
  '(｡ì _ í｡)',
  'ヾ(≧▽≦*)o',
];
