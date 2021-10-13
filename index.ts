/*! micro-base - MIT License (c) 2021 Paul Miller (paulmillr.com) */

// Utilities
export interface Coder<F, T> {
  encode(from: F): T;
  decode(to: T): F;
}

export interface BytesCoder extends Coder<Uint8Array, string> {
  encode: (data: Uint8Array) => string;
  decode: (str: string) => Uint8Array;
}
// TODO: some recusive type inference so it would check correct order of input/output inside rest?
// like <string, number>, <number, bytes>, <bytes, float>
type Chain = [Coder<any, any>, ...Coder<any, any>[]];
// Extract info from Coder type
type Input<F> = F extends Coder<infer T, any> ? T : never;
type Output<F> = F extends Coder<any, infer T> ? T : never;
// Generic function for arrays
type First<T> = T extends [infer U, ...any[]] ? U : never;
type Last<T> = T extends [...any[], infer U] ? U : never;
type Tail<T> = T extends [any, ...infer U] ? U : never;

type AsChain<C extends Chain, Rest = Tail<C>> = {
  // C[K] = Coder<Input<C[K]>, Input<Rest[k]>>
  [K in keyof C]: Coder<Input<C[K]>, Input<K extends keyof Rest ? Rest[K] : any>>;
};

function chain<T extends Chain & AsChain<T>>(...args: T): Coder<Input<First<T>>, Output<Last<T>>> {
  // Wrap call in closure so JIT can inline calls
  const wrap = (a: any, b: any) => (c: any) => a(b(c));
  // Construct chain of args[-1].encode(args[-2].encode([...]))
  const encode = Array.from(args)
    .reverse()
    .reduce((acc, i: any) => (acc ? wrap(acc, i.encode) : i.encode), undefined) as any;
  // Construct chain of args[0].decode(args[1].decode(...))
  const decode = args.reduce(
    (acc, i: any) => (acc ? wrap(acc, i.decode) : i.decode),
    undefined
  ) as any;
  return { encode, decode };
}

type Alphabet = string[] | string;

// Encodes integer radix representation to array of strings using alphabet and back
function alphabet(alphabet: Alphabet): Coder<number[], string[]> {
  return {
    encode: (digits: number[]) => {
      if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
        throw new Error('alphabet.encode input should be array of numbers');
      return digits.map((i) => {
        if (i < 0 || i >= alphabet.length)
          throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
        return alphabet[i];
      });
    },
    decode: (input: string[]) => {
      if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
        throw new Error('alphabet.decode input should be array of strings');
      return input.map((letter) => {
        const index = alphabet.indexOf(letter);
        if (index === -1) throw new Error(`Unknown letter: "${letter}"`);
        return index;
      });
    },
  };
}

function join(separator = ''): Coder<string[], string> {
  return {
    encode: (from) => {
      if (!Array.isArray(from) || (from.length && typeof from[0] !== 'string'))
        throw new Error('join.encode input should be array of strings');
      return from.join(separator);
    },
    decode: (to) => {
      if (typeof to !== 'string') throw new Error('join.decode input should be string');
      return to.split(separator);
    },
  };
}

// Pad strings array so it has integer number of bits
function padding(bits: number, chr = '='): Coder<string[], string[]> {
  return {
    encode(data: string[]): string[] {
      if (!Array.isArray(data) || (data.length && typeof data[0] !== 'string'))
        throw new Error('padding.encode input should be array of strings');
      while ((data.length * bits) % 8) data.push(chr);
      return data;
    },
    decode(input: string[]): string[] {
      if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
        throw new Error('padding.encode input should be array of strings');
      let end = input.length;
      if ((end * bits) % 8)
        throw new Error('Invalid padding: string should have whole number of bytes');
      while (end > 0 && input[end - 1] === chr) {
        end--;
        if (!((end * bits) % 8)) throw new Error('Invalid padding: string has too much padding');
      }
      return input.slice(0, end);
    },
  };
}

function normalize<T>(fn: (val: T) => T): Coder<T, T> {
  return { encode: (from: T) => from, decode: (to: T) => fn(to) };
}

// NOTE: it has quadratic time complexity
function convertRadix(data: number[], from: number, to: number) {
  if (!data.length) return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data);
  while (true) {
    let carry = 0;
    let done = true;
    for (let i = pos; i < digits.length; i++) {
      const digit = from * carry + digits[i];
      carry = digit % to;
      digits[i] = Math.floor(digit / to);
      if (!done) continue;
      else if (!digits[i]) pos = i;
      else done = false;
    }
    res.push(carry);
    if (done) break;
  }
  for (let i = 0; i < data.length - 1 && data[i] === 0; i++) res.push(0);
  return res.reverse();
}

function convertRadix2(data: number[], from: number, to: number, padding: boolean): number[] {
  let carry = 0;
  let pos = 0; // bitwise position in current element
  const mask = 2 ** to - 1;
  const res: number[] = [];
  for (const n of data) {
    carry = (carry << from) | n;
    pos += from;
    for (; pos >= to; pos -= to) res.push((carry >> (pos - to)) & mask);
  }
  carry = (carry << (to - pos)) & mask;
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res.push(carry);
  return res;
}

function radix(num: number): Coder<Uint8Array, number[]> {
  return {
    encode: (bytes: Uint8Array) => {
      if (!(bytes instanceof Uint8Array))
        throw new Error('radix.encode input should be Uint8Array');
      return convertRadix(Array.from(bytes), 2 ** 8, num);
    },
    decode: (digits: number[]) => {
      if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
        throw new Error('radix.decode input should be array of strings');
      return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
    },
  };
}
function radix2(bits: number, revPadding = false): Coder<Uint8Array, number[]> {
  return {
    encode: (bytes: Uint8Array) => {
      if (!(bytes instanceof Uint8Array))
        throw new Error('radix2.encode input should be Uint8Array');
      return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
    },
    decode: (digits: number[]) => {
      if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
        throw new Error('radix2.decode input should be array of strings');
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    },
  };
}

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
function unsafeWrapper<T extends (...args: any) => any>(fn: T) {
  return function (...args: ArgumentTypes<T>): ReturnType<T> | undefined {
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}

function checksum(
  len: number,
  fn: (data: Uint8Array) => Uint8Array
): Coder<Uint8Array, Uint8Array> {
  return {
    encode(data: Uint8Array) {
      if (!(data instanceof Uint8Array))
        throw new Error('checksum.encode: input should be Uint8Array');
      const checksum = fn(data).slice(0, len);
      const res = new Uint8Array(data.length + len);
      res.set(data);
      res.set(checksum, data.length);
      return res;
    },
    decode(data: Uint8Array) {
      if (!(data instanceof Uint8Array))
        throw new Error('checksum.decode: input should be Uint8Array');
      const payload = data.slice(0, -len);
      const newChecksum = fn(payload).slice(0, len);
      const oldChecksum = data.slice(-len);
      for (let i = 0; i < len; i++)
        if (newChecksum[i] !== oldChecksum[i]) throw new Error('Invalid checksum');
      return payload;
    },
  };
}

// RFC 4648 aka RFC 3548
// ---------------------
export const base16: BytesCoder = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
export const base32: BytesCoder = chain(
  radix2(5),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'),
  padding(5),
  join('')
);
export const base32hex: BytesCoder = chain(
  radix2(5),
  alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'),
  padding(5),
  join('')
);
export const base32crockford: BytesCoder = chain(
  radix2(5),
  alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'),
  join(''),
  normalize((s: string) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1'))
);
export const base64: BytesCoder = chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'),
  padding(6),
  join('')
);
export const base64url: BytesCoder = chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'),
  padding(6),
  join('')
);

// base58 code
// -----------
const genBase58 = (abc: string) => chain(radix(58), alphabet(abc), join(''));

export const base58: BytesCoder = genBase58(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
);
export const base58flickr: BytesCoder = genBase58(
  '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
);
export const base58xrp: BytesCoder = genBase58(
  'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'
);

// xmr ver is done in 8-byte blocks.
// This gives us eight full-sized blocks and one 5-byte block.
// Eight bytes converts to 11 or less Base58 characters;
// if a particular block converts to <11 characters,
// the conversion pads it with "1"s (1 is 0 in Base58).
// Likewise, the final 5-byte block can convert to 7 or less Base58 digits;
// the conversion will ensure the result is 7 digits. Due to the conditional padding,
// the 69-byte string will always convert to 95 Base58 characters (8 * 11 + 7).
// Significantly reduces quadratic complexity of base58
export const base58xmr: BytesCoder = {
  encode(data: Uint8Array) {
    let res = '';
    for (let i = 0; i < data.length; i += 8) {
      const slice = data.subarray(i, i + 8);
      res += base58.encode(slice).padStart(slice.length === 8 ? 11 : 7, '1');
    }
    return res;
  },
  decode(str: string) {
    let res: number[] = [];
    for (let i = 0; i < str.length; i += 11)
      res = res.concat(Array.from(base58.decode(str.slice(i, i + 11))));
    return Uint8Array.from(res);
  },
};

export const base58check = (sha256: (data: Uint8Array) => Uint8Array): BytesCoder =>
  chain(
    checksum(4, (data) => sha256(sha256(data))),
    base58
  );

// Bech32 code
// -----------
export interface Bech32Decoded {
  prefix: string;
  words: number[];
}
export interface Bech32DecodedWithArray {
  prefix: string;
  words: number[];
  bytes: Uint8Array;
}

const BECH_ALPHABET: Coder<number[], string> = chain(
  alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'),
  join('')
);

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
  return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}

function genBech32(encoding: 'bech32' | 'bech32m') {
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
  const _words = radix2(5);
  const fromWords = _words.decode;
  const toWords = _words.encode;
  const fromWordsUnsafe = unsafeWrapper(fromWords);

  function encode(
    prefix: string,
    words: number[] | Uint8Array,
    limit: number | false = 90
  ): string {
    if (typeof prefix !== 'string')
      throw new Error(`bech32.decode prefix should be string, not ${typeof prefix}`);
    if (words instanceof Uint8Array) words = toWords(words);
    if (!Array.isArray(words) || (words.length && typeof words[0] !== 'number'))
      throw new Error(`bech32.decode words should be array of numbers, not ${typeof words}`);
    const actualLength = prefix.length + 7 + words.length;
    if (limit !== false && actualLength > limit)
      throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    prefix = prefix.toLowerCase();
    return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
  }

  function decode(str: string, limit: number | false = 90): Bech32Decoded {
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

  const decodeUnsafe = unsafeWrapper(decode);

  function decodeToBytes(str: string): Bech32DecodedWithArray {
    const { prefix, words } = decode(str, false);
    return { prefix, words, bytes: fromWords(words) };
  }

  return { encode, decode, decodeToBytes, decodeUnsafe, fromWords, fromWordsUnsafe, toWords };
}

export const bech32 = genBech32('bech32');
export const bech32m = genBech32('bech32m');

// export const utils = {
//   toBech32Words: _words.encode,
//   fromBech32Words: _words.decode,
//   fromBech32WordsUnsafe: unsafeWrapper(_words.decode),
// };

export const utf8: BytesCoder = {
  encode: (data) => new TextDecoder().decode(data),
  decode: (str) => new TextEncoder().encode(str),
};

export const hex: BytesCoder = chain(
  radix2(4),
  alphabet('0123456789abcdef'),
  join(''),
  normalize((s: string) => {
    if (typeof s !== 'string' || s.length % 2)
      throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
    return s.toLowerCase();
  })
);

// prettier-ignore
const CODERS = {
  utf8, hex, base16, base32, base64, base64url, base58, base58xmr
};
type CoderType = keyof typeof CODERS;
const coderTypeError = `Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`;

export const bytesToString = (type: CoderType, bytes: Uint8Array): string => {
  if (typeof type !== 'string' || !CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (!(bytes instanceof Uint8Array)) throw new TypeError('bytesToString() expects Uint8Array');
  return CODERS[type].encode(bytes);
};
export const str = bytesToString; // as in python, but for bytes only

export const stringToBytes = (type: CoderType, str: string): Uint8Array => {
  if (!CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (typeof str !== 'string') throw new TypeError('stringToBytes() expects string');
  return CODERS[type].decode(str);
};
export const bytes = stringToBytes;
