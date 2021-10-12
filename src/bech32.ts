import * as utils from './utils';

// Bech32
export interface Decoded {
  prefix: string;
  words: number[];
}

const BECH_ALPHABET: utils.Coder<number[], string> = utils.chain(
  utils.alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'),
  utils.join('')
);

export const { encode: toWords, decode: fromWords } = utils.radix2(5);
export const fromWordsUnsafe = utils.unsafeWrapper(fromWords);

const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(pre: number): number {
  const b = pre >> 25;
  let chk = (pre & 0x1ffffff) << 5;
  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if (((b >> i) & 1) === 1) chk ^= POLYMOD_GENERATORS[i];
  }
  return chk;
}

function bechChecksum(prefix: string, words: number[], encodingConst = 1): string {
  const len = prefix.length;
  let chk = 1;
  for (let i = 0; i < len; i++) {
    const c = prefix.charCodeAt(i);
    if (c < 33 || c > 126) throw new Error(`Invalid prefix (${prefix})`);
    chk = bech32Polymod(chk) ^ (c >> 5);
  }
  chk = bech32Polymod(chk);
  for (let i = 0; i < len; i++) chk = bech32Polymod(chk) ^ (prefix.charCodeAt(i) & 0x1f);
  for (let v of words) chk = bech32Polymod(chk) ^ v;
  for (let i = 0; i < 6; i++) chk = bech32Polymod(chk);
  chk ^= encodingConst;
  return BECH_ALPHABET.encode(utils.convertRadix2([chk % 2 ** 30], 30, 5, false));
}

export function genBech32(encoding: 'bech32' | 'bech32m') {
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;

  function encode(prefix: string, words: number[], limit: number | false = 90): string {
    if (typeof prefix !== 'string')
      throw new Error(`bech32.decode prefix should be string, not ${typeof prefix}`);
    if (!Array.isArray(words) || (words.length && typeof words[0] !== 'number'))
      throw new Error(`bech32.decode words should be array of numbers, not ${typeof words}`);
    const actualLength = prefix.length + 7 + words.length;
    if (limit !== false && actualLength > limit)
      throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    prefix = prefix.toLowerCase();
    return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
  }

  function decode(str: string, limit: number | false = 90): Decoded {
    if (typeof str !== 'string')
      throw new Error(`bech32.decode input should be string, not ${typeof str}`);
    if (str.length < 8 || (limit !== false && str.length > limit))
      throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
    // don't allow mixed case
    const lowered = str.toLowerCase();
    if (str !== lowered && str !== str.toUpperCase())
      throw new Error(`String must be lowercase or uppercase`);
    str = lowered;
    const sepIndex = str.lastIndexOf('1');
    if (sepIndex === 0 || sepIndex === -1)
      throw new Error(`Letter "1" must be present between prefix and data only`);
    const [prefix, _words] = [str.slice(0, sepIndex), str.slice(sepIndex + 1)];
    if (_words.length < 6) throw new Error('Data must be at least 6 characters long');
    const words = BECH_ALPHABET.decode(_words).slice(0, -6);
    const sum = bechChecksum(prefix, words, ENCODING_CONST);
    if (!_words.endsWith(sum)) throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
    return { prefix, words };
  }

  return { encode, decode, decodeUnsafe: utils.unsafeWrapper(decode) };
}

export const bech32 = genBech32('bech32');
export const bech32m = genBech32('bech32m');
