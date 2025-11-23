/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */

export interface Coder<F, T> {
  encode(from: F): T;
  decode(to: T): F;
}

export interface BytesCoder extends Coder<Uint8Array, string> {
  encode: (data: Uint8Array) => string;
  decode: (str: string) => Uint8Array;
}

function isBytes(a: unknown): a is Uint8Array {
  return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
}
/** Asserts something is Uint8Array. */
function abytes(b: Uint8Array | undefined): void {
  if (!isBytes(b)) throw new Error('Uint8Array expected');
}

function afn(input: Function): input is Function {
  if (typeof input !== 'function') throw new Error('function expected');
  return true;
}

function astr(label: string, input: unknown): input is string {
  if (typeof input !== 'string') throw new Error(`${label}: string expected`);
  return true;
}

function anumber(n: number): void {
  if (!Number.isSafeInteger(n)) throw new Error(`invalid integer: ${n}`);
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

/**
 * @__NO_SIDE_EFFECTS__
 */
function chain<T extends Chain & AsChain<T>>(...args: T): Coder<Input<First<T>>, Output<Last<T>>> {
  const id = (a: any) => a;
  // Wrap call in closure so JIT can inline calls
  const wrap = (a: any, b: any) => (c: any) => a(b(c));
  // Construct chain of args[-1].encode(args[-2].encode([...]))
  const encode = args.map((x) => x.encode).reduceRight(wrap, id);
  // Construct chain of args[0].decode(args[1].decode(...))
  const decode = args.map((x) => x.decode).reduce(wrap, id);
  return { encode, decode };
}

/**
 * Encodes integer radix representation in Uint8Array to a string in alphabet and back, with optional padding
 * @__NO_SIDE_EFFECTS__
 */
function alphabet(letters: string, paddingBits: number = 0, paddingChr = '='): Coder<Uint8Array, string> {
  // mapping 1 to "b"
  astr('alphabet', letters);
  const lettersA = letters.split('');
  const len = lettersA.length;
  const paddingCode = paddingChr.codePointAt(0)!;
  if (paddingChr.length !== 1 || paddingCode > 128) throw new Error('Wrong padding char');

  // mapping "b" to 1
  const indexes = new Int8Array(256).fill(-1);
  lettersA.forEach((l, i) => {
    const code = l.codePointAt(0)!;
    if (code > 127 || indexes[code] !== -1) throw new Error(`Non-ascii or duplicate symbol: "${l}"`);
    indexes[code] = i;
  });
  return {
    encode: (digits: Uint8Array): string => {
      abytes(digits);
      const out = []
      for (const i of digits) {
        if (i >= len)
          throw new Error(
            `alphabet.encode: digit index outside alphabet "${i}". Allowed: ${letters}`
          );
        out.push(lettersA[i]!);
      }
      if (paddingBits > 0) {
        while ((out.length * paddingBits) % 8) out.push(paddingChr);
      }
      return out.join('');
    },
    decode: (str: string): Uint8Array => {
      astr('alphabet.decode', str);
      let end = str.length;
      if (paddingBits > 0) {
        if ((end * paddingBits) % 8)
          throw new Error('padding: invalid, string should have whole number of bytes');
        for (; end > 0 && str.charCodeAt(end - 1) === paddingCode; end--) {
          const last = end - 1;
          const byte = last * paddingBits;
          if (byte % 8 === 0) throw new Error('padding: invalid, string has too much padding');
        }
      }
      const out = new Uint8Array(end);
      let at = 0
      for (let j = 0; j < end; j++) {
        const c = str.charCodeAt(j)!;
        const i = indexes[c]!;
        if (c > 127 || i < 0) throw new Error(`Unknown letter: "${String.fromCharCode(c)}". Allowed: ${letters}`);
        out[at++] = i;
      }
      return out;
    },
  };
}

/**
 * @__NO_SIDE_EFFECTS__
 */
function normalize<T>(fn: (val: T) => T): Coder<T, T> {
  afn(fn);
  return { encode: (from: T) => from, decode: (to: T) => fn(to) };
}

/**
 * Slow: O(n^2) time complexity
 */
function convertRadix(data: Uint8Array, from: number, to: number): Uint8Array {
  // base 1 is impossible
  if (from < 2 || from > 256) throw new Error(`convertRadix: wrong from=${from}`);
  if (to < 2 || to > 256) throw new Error(`convertRadix: wrong to=${to}`);
  abytes(data);
  if (!data.length) return new Uint8Array();
  let pos = 0;
  const digits = Uint8Array.from(data, (d) => {
    if (d >= from) throw new Error(`invalid integer: ${d}`);
    return d;
  });
  const dlen = digits.length;
  let zeros = 0
  while (zeros < dlen && data[zeros] === 0) zeros++
  if (zeros === dlen) return new Uint8Array(zeros);
  const significant = dlen - zeros;
  const res = new Uint8Array(zeros + 1 + Math.ceil(significant * Math.log(from) / Math.log(to))); // + 1 to overshoot due to float calculation
  let writtenLow = res.length;
  while (true) {
    let carry = 0;
    let done = true;
    for (let i = pos; i < dlen; i++) {
      const digit = digits[i]!;
      const fromCarry = from * carry;
      const digitBase = fromCarry + digit;
      if (
        !Number.isSafeInteger(digitBase) ||
        fromCarry / from !== carry ||
        digitBase - digit !== fromCarry
      ) {
        throw new Error('convertRadix: carry overflow');
      }
      const div = digitBase / to;
      carry = digitBase % to;
      const rounded = Math.floor(div);
      digits[i] = rounded;
      if (!Number.isSafeInteger(rounded) || rounded * to + carry !== digitBase)
        throw new Error('convertRadix: carry overflow');
      if (!done) continue;
      else if (!rounded) pos = i;
      else done = false;
    }
    res[--writtenLow] = carry;
    if (done) break;
  }
  writtenLow -= zeros;
  if (writtenLow < 0) throw new Error('convertRadix: data did not fit'); // unreachable
  return res.subarray(writtenLow);
}

const powers: number[] = /* @__PURE__ */ (() => {
  let res = [];
  for (let i = 0; i < 40; i++) res.push(2 ** i);
  return res;
})();
/**
 * Implemented with numbers, because BigInt is 5x slower
 */
function convertRadix2(data: Uint8Array, from: number, to: number, padding: boolean): Uint8Array {
  abytes(data);
  if (from <= 0 || from > 8) throw new Error(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 8) throw new Error(`convertRadix2: wrong to=${to}`);
  let carry = 0;
  let pos = 0; // bitwise position in current element
  const max = powers[from]!;
  const mask = powers[to]! - 1;
  const dataLength = data.length;
  const bits = dataLength * from;
  if (!Number.isSafeInteger(bits)) throw new Error('Input too large'); // math safeguard, nothing below 32 TiB should trigger this
  const res = new Uint8Array(Math.ceil(bits / to));
  let written = 0;
  for (const n of data) {
    if (n >= max) throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
    carry = (carry << from) | n;
    if (pos + from > 32) throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
    pos += from;
    for (; pos >= to; pos -= to) res[written++] = ((carry >> (pos - to)) & mask) >>> 0;
    const pow = powers[pos];
    if (pow === undefined) throw new Error('invalid carry');
    carry &= pow - 1; // clean carry, otherwise it will cause overflow
  }
  carry = (carry << (to - pos)) & mask;
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry > 0) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res[written++] = carry >>> 0;
  if (written > res.length) throw new Error('convertRadix2: data did not fit'); // unreachable
  return res.subarray(0, written);
}

/**
 * @__NO_SIDE_EFFECTS__
 */
function radix(num: number): Coder<Uint8Array, Uint8Array> {
  anumber(num);
  const _256 = 2 ** 8;
  return {
    encode: (bytes: Uint8Array) => {
      if (!isBytes(bytes)) throw new Error('radix.encode input should be Uint8Array');
      return convertRadix(bytes, _256, num);
    },
    decode: (digits: Uint8Array) => {
      if (!isBytes(digits)) throw new Error('radix.decode input should be Uint8Array');
      return convertRadix(digits, num, _256);
    },
  };
}

/**
 * If both bases are power of same number (like `2**8 <-> 2**64`),
 * there is a linear algorithm. For now we have implementation for power-of-two bases only.
 * @__NO_SIDE_EFFECTS__
 */
function radix2(bits: number, revPadding = false): Coder<Uint8Array, Uint8Array> {
  anumber(bits);
  if (bits <= 0 || bits > 8) throw new Error('radix2: bits should be in (0..8]');
  return {
    encode: (bytes: Uint8Array) => {
      if (!isBytes(bytes)) throw new Error('radix2.encode input should be Uint8Array');
      return convertRadix2(bytes, 8, bits, !revPadding);
    },
    decode: (digits: Uint8Array) => {
      if (!isBytes(digits)) throw new Error('radix2.decode input should be Uint8Array');
      return convertRadix2(digits, bits, 8, revPadding);
    },
  };
}

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
function unsafeWrapper<T extends (...args: any) => any>(fn: T) {
  afn(fn);
  return function (...args: ArgumentTypes<T>): ReturnType<T> | void {
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}

function checksum(
  len: number,
  fn: (data: Uint8Array) => Uint8Array
): Coder<Uint8Array, Uint8Array> {
  anumber(len);
  afn(fn);
  return {
    encode(data: Uint8Array) {
      if (!isBytes(data)) throw new Error('checksum.encode: input should be Uint8Array');
      const sum = fn(data).slice(0, len);
      const res = new Uint8Array(data.length + len);
      res.set(data);
      res.set(sum, data.length);
      return res;
    },
    decode(data: Uint8Array) {
      if (!isBytes(data)) throw new Error('checksum.decode: input should be Uint8Array');
      const payload = data.slice(0, -len);
      const oldChecksum = data.slice(-len);
      const newChecksum = fn(payload).slice(0, len);
      for (let i = 0; i < len; i++)
        if (newChecksum[i] !== oldChecksum[i]) throw new Error('Invalid checksum');
      return payload;
    },
  };
}

// prettier-ignore
export const utils: { alphabet: typeof alphabet; chain: typeof chain; checksum: typeof checksum; convertRadix: typeof convertRadix; convertRadix2: typeof convertRadix2; radix: typeof radix; radix2: typeof radix2; } = {
  alphabet, chain, checksum, convertRadix, convertRadix2, radix, radix2,
};

// RFC 4648 aka RFC 3548
// ---------------------

/**
 * base16 encoding from RFC 4648.
 * @example
 * ```js
 * base16.encode(Uint8Array.from([0x12, 0xab]));
 * // => '12AB'
 * ```
 */
export const base16: BytesCoder = chain(radix2(4), alphabet('0123456789ABCDEF'));

/**
 * base32 encoding from RFC 4648. Has padding.
 * Use `base32nopad` for unpadded version.
 * Also check out `base32hex`, `base32hexnopad`, `base32crockford`.
 * @example
 * ```js
 * base32.encode(Uint8Array.from([0x12, 0xab]));
 * // => 'CKVQ===='
 * base32.decode('CKVQ====');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32: BytesCoder = chain(
  radix2(5),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 5)
);

/**
 * base32 encoding from RFC 4648. No padding.
 * Use `base32` for padded version.
 * Also check out `base32hex`, `base32hexnopad`, `base32crockford`.
 * @example
 * ```js
 * base32nopad.encode(Uint8Array.from([0x12, 0xab]));
 * // => 'CKVQ'
 * base32nopad.decode('CKVQ');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32nopad: BytesCoder = chain(
  radix2(5),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567')
);
/**
 * base32 encoding from RFC 4648. Padded. Compared to ordinary `base32`, slightly different alphabet.
 * Use `base32hexnopad` for unpadded version.
 * @example
 * ```js
 * base32hex.encode(Uint8Array.from([0x12, 0xab]));
 * // => '2ALG===='
 * base32hex.decode('2ALG====');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32hex: BytesCoder = chain(
  radix2(5),
  alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV', 5)
);

/**
 * base32 encoding from RFC 4648. No padding. Compared to ordinary `base32`, slightly different alphabet.
 * Use `base32hex` for padded version.
 * @example
 * ```js
 * base32hexnopad.encode(Uint8Array.from([0x12, 0xab]));
 * // => '2ALG'
 * base32hexnopad.decode('2ALG');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32hexnopad: BytesCoder = chain(
  radix2(5),
  alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV')
);
/**
 * base32 encoding from RFC 4648. Doug Crockford's version.
 * https://www.crockford.com/base32.html
 * @example
 * ```js
 * base32crockford.encode(Uint8Array.from([0x12, 0xab]));
 * // => '2ANG'
 * base32crockford.decode('2ANG');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32crockford: BytesCoder = chain(
  radix2(5),
  alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'),
  normalize((s: string) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1'))
);

// Built-in base64 conversion https://caniuse.com/mdn-javascript_builtins_uint8array_frombase64
// prettier-ignore
const hasBase64Builtin: boolean = /* @__PURE__ */ (() =>
  typeof (Uint8Array as any).from([]).toBase64 === 'function' &&
  typeof (Uint8Array as any).fromBase64 === 'function')();

// ASCII whitespace is U+0009 TAB, U+000A LF, U+000C FF, U+000D CR, or U+0020 SPACE
const ASCII_WHITESPACE = /[\t\n\f\r ]/

const decodeBase64Builtin = (s: string, isUrl: boolean) => {
  astr('base64', s);
  const alphabet = isUrl ? 'base64url' : 'base64';
  // Per spec, .fromBase64 already throws on any other non-alphabet symbols except ASCII whitespace
  // And checking just for whitspace makes decoding about 3x faster than a full range check
  if (s.length > 0 && ASCII_WHITESPACE.test(s)) throw new Error('invalid base64');
  return (Uint8Array as any).fromBase64(s, { alphabet, lastChunkHandling: 'strict' });
};

/**
 * base64 from RFC 4648. Padded.
 * Use `base64nopad` for unpadded version.
 * Also check out `base64url`, `base64urlnopad`.
 * Falls back to built-in function, when available.
 * @example
 * ```js
 * base64.encode(Uint8Array.from([0x12, 0xab]));
 * // => 'Eqs='
 * base64.decode('Eqs=');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
// prettier-ignore
export const base64: BytesCoder = hasBase64Builtin ? {
  encode(b) { abytes(b); return (b as any).toBase64(); },
  decode(s) { return decodeBase64Builtin(s, false); },
} : chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', 6)
);
/**
 * base64 from RFC 4648. No padding.
 * Use `base64` for padded version.
 * @example
 * ```js
 * base64nopad.encode(Uint8Array.from([0x12, 0xab]));
 * // => 'Eqs'
 * base64nopad.decode('Eqs');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base64nopad: BytesCoder = chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')
);

/**
 * base64 from RFC 4648, using URL-safe alphabet. Padded.
 * Use `base64urlnopad` for unpadded version.
 * Falls back to built-in function, when available.
 * @example
 * ```js
 * base64url.encode(Uint8Array.from([0x12, 0xab]));
 * // => 'Eqs='
 * base64url.decode('Eqs=');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
// prettier-ignore
export const base64url: BytesCoder = hasBase64Builtin ? {
  encode(b) { abytes(b); return (b as any).toBase64({ alphabet: 'base64url' }); },
  decode(s) { return decodeBase64Builtin(s, true); },
} : chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', 6)
);

/**
 * base64 from RFC 4648, using URL-safe alphabet. No padding.
 * Use `base64url` for padded version.
 * @example
 * ```js
 * base64urlnopad.encode(Uint8Array.from([0x12, 0xab]));
 * // => 'Eqs'
 * base64urlnopad.decode('Eqs');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base64urlnopad: BytesCoder = chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_')
);

// base58 code
// -----------
const genBase58 = /* @__NO_SIDE_EFFECTS__ */ (abc: string) =>
  chain(radix(58), alphabet(abc));

/**
 * base58: base64 without ambigous characters +, /, 0, O, I, l.
 * Quadratic (O(n^2)) - so, can't be used on large inputs.
 * @example
 * ```js
 * base58.decode('01abcdef');
 * // => '3UhJW'
 * ```
 */
export const base58: BytesCoder = genBase58(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
);
/**
 * base58: flickr version. Check out `base58`.
 */
export const base58flickr: BytesCoder = genBase58(
  '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
);
/**
 * base58: XRP version. Check out `base58`.
 */
export const base58xrp: BytesCoder = genBase58(
  'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'
);

// Data len (index) -> encoded block len
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];

/**
 * base58: XMR version. Check out `base58`.
 * Done in 8-byte blocks (which equals 11 chars in decoding). Last (non-full) block padded with '1' to size in XMR_BLOCK_LEN.
 * Block encoding significantly reduces quadratic complexity of base58.
 */
export const base58xmr: BytesCoder = {
  encode(data: Uint8Array) {
    let res = '';
    for (let i = 0; i < data.length; i += 8) {
      const block = data.subarray(i, i + 8);
      res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length]!, '1');
    }
    return res;
  },
  decode(str: string) {
    let res: number[] = [];
    for (let i = 0; i < str.length; i += 11) {
      const slice = str.slice(i, i + 11);
      const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
      const block = base58.decode(slice);
      for (let j = 0; j < block.length - blockLen; j++) {
        if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
      }
      res = res.concat(Array.from(block.slice(block.length - blockLen)));
    }
    return Uint8Array.from(res);
  },
};

/**
 * Method, which creates base58check encoder.
 * Requires function, calculating sha256.
 */
export const createBase58check = (sha256: (data: Uint8Array) => Uint8Array): BytesCoder =>
  chain(
    checksum(4, (data) => sha256(sha256(data))),
    base58
  );

/**
 * Use `createBase58check` instead.
 * @deprecated
 */
export const base58check: (sha256: (data: Uint8Array) => Uint8Array) => BytesCoder =
  createBase58check;

// Bech32 code
// -----------
export interface Bech32Decoded<Prefix extends string = string> {
  prefix: Prefix;
  words: Uint8Array;
}
export interface Bech32DecodedWithArray<Prefix extends string = string> {
  prefix: Prefix;
  words: Uint8Array;
  bytes: Uint8Array;
}

const BECH_ALPHABET: Coder<Uint8Array, string> = chain(
  alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l')
);

const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(pre: number): number {
  const b = pre >> 25;
  let chk = (pre & 0x1ffffff) << 5;
  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if (((b >> i) & 1) === 1) chk ^= POLYMOD_GENERATORS[i]!;
  }
  return chk;
}

function bechChecksum(prefix: string, words: Uint8Array, encodingConst = 1): string {
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
  const v = chk & 0x3fffffff; // 30 bits, we need to convert to 6 5-bit values
  const v5bit = Uint8Array.of(v >>> 25, (v >>> 20) & 0x1f, (v >>> 15) & 0x1f, (v >>> 10) & 0x1f, (v >>> 5) & 0x1f, v & 0x1f);
  return BECH_ALPHABET.encode(v5bit);
}

export interface Bech32 {
  encode<Prefix extends string>(
    prefix: Prefix,
    words: Uint8Array,
    limit?: number | false
  ): `${Lowercase<Prefix>}1${string}`;
  decode<Prefix extends string>(
    str: `${Prefix}1${string}`,
    limit?: number | false
  ): Bech32Decoded<Prefix>;
  decode(str: string, limit?: number | false): Bech32Decoded;
  encodeFromBytes(prefix: string, bytes: Uint8Array): string;
  decodeToBytes(str: string): Bech32DecodedWithArray;
  decodeUnsafe(str: string, limit?: number | false): void | Bech32Decoded<string>;
  fromWords(to: Uint8Array): Uint8Array;
  fromWordsUnsafe(to: Uint8Array): void | Uint8Array;
  toWords(from: Uint8Array): Uint8Array;
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function genBech32(encoding: 'bech32' | 'bech32m'): Bech32 {
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
  const _words = radix2(5);
  const fromWords = _words.decode;
  const toWords = _words.encode;
  const fromWordsUnsafe = unsafeWrapper(fromWords);

  function encode<Prefix extends string>(
    prefix: Prefix,
    words: Uint8Array,
    limit: number | false = 90
  ): `${Lowercase<Prefix>}1${string}` {
    astr('bech32.encode prefix', prefix);
    if (!isBytes(words)) throw new Error('bech32.encode: input should be Uint8Array');
    const plen = prefix.length;
    if (plen === 0) throw new TypeError(`Invalid prefix length ${plen}`);
    const actualLength = plen + 7 + words.length;
    if (limit !== false && actualLength > limit)
      throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    const lowered = prefix.toLowerCase();
    const sum = bechChecksum(lowered, words, ENCODING_CONST);
    return `${lowered}1${BECH_ALPHABET.encode(words)}${sum}` as `${Lowercase<Prefix>}1${string}`;
  }

  function decode<Prefix extends string>(
    str: `${Prefix}1${string}`,
    limit?: number | false
  ): Bech32Decoded<Prefix>;
  function decode(str: string, limit?: number | false): Bech32Decoded;
  function decode(str: string, limit: number | false = 90): Bech32Decoded {
    astr('bech32.decode input', str);
    const slen = str.length;
    if (slen < 8 || (limit !== false && slen > limit))
      throw new TypeError(`invalid string length: ${slen} (${str}). Expected (8..${limit})`);
    // don't allow mixed case
    const lowered = str.toLowerCase();
    if (str !== lowered && str !== str.toUpperCase())
      throw new Error(`String must be lowercase or uppercase`);
    const sepIndex = lowered.lastIndexOf('1');
    if (sepIndex === 0 || sepIndex === -1)
      throw new Error(`Letter "1" must be present between prefix and data only`);
    const prefix = lowered.slice(0, sepIndex);
    const data = lowered.slice(sepIndex + 1);
    if (data.length < 6) throw new Error('Data must be at least 6 characters long');
    const words = BECH_ALPHABET.decode(data).slice(0, -6);
    const sum = bechChecksum(prefix, words, ENCODING_CONST);
    if (!data.endsWith(sum)) throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
    return { prefix, words };
  }

  const decodeUnsafe = unsafeWrapper(decode);

  function decodeToBytes(str: string): Bech32DecodedWithArray {
    const { prefix, words } = decode(str, false);
    return { prefix, words, bytes: fromWords(words) };
  }

  function encodeFromBytes(prefix: string, bytes: Uint8Array) {
    return encode(prefix, toWords(bytes));
  }

  return {
    encode,
    decode,
    encodeFromBytes,
    decodeToBytes,
    decodeUnsafe,
    fromWords,
    fromWordsUnsafe,
    toWords,
  };
}

/**
 * bech32 from BIP 173. Operates on words.
 * For high-level, check out scure-btc-signer:
 * https://github.com/paulmillr/scure-btc-signer.
 */
export const bech32: Bech32 = genBech32('bech32');

/**
 * bech32m from BIP 350. Operates on words.
 * It was to mitigate `bech32` weaknesses.
 * For high-level, check out scure-btc-signer:
 * https://github.com/paulmillr/scure-btc-signer.
 */
export const bech32m: Bech32 = genBech32('bech32m');

declare const TextEncoder: any;
declare const TextDecoder: any;

/**
 * UTF-8-to-byte decoder. Uses built-in TextDecoder / TextEncoder.
 * @example
 * ```js
 * const b = utf8.decode("hey"); // => new Uint8Array([ 104, 101, 121 ])
 * const str = utf8.encode(b); // "hey"
 * ```
 */
export const utf8: BytesCoder = {
  encode: (data) => new TextDecoder().decode(data),
  decode: (str) => new TextEncoder().encode(str),
};

// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
// prettier-ignore
const hasHexBuiltin: boolean = /* @__PURE__ */ (() =>
  typeof (Uint8Array as any).from([]).toHex === 'function' &&
  typeof (Uint8Array as any).fromHex === 'function')();
// prettier-ignore
const hexBuiltin: BytesCoder = {
  encode(data) { abytes(data); return (data as any).toHex(); },
  decode(s) { astr('hex', s); return (Uint8Array as any).fromHex(s); },
};
/**
 * hex string decoder. Uses built-in function, when available.
 * @example
 * ```js
 * const b = hex.decode("0102ff"); // => new Uint8Array([ 1, 2, 255 ])
 * const str = hex.encode(b); // "0102ff"
 * ```
 */
export const hex: BytesCoder = hasHexBuiltin
  ? hexBuiltin
  : chain(
      radix2(4),
      alphabet('0123456789abcdef'),
      normalize((s: string) => {
        if (typeof s !== 'string' || s.length % 2 !== 0)
          throw new TypeError(
            `hex.decode: expected string, got ${typeof s} with length ${s.length}`
          );
        return s.toLowerCase();
      })
    );

export type SomeCoders = {
  utf8: BytesCoder;
  hex: BytesCoder;
  base16: BytesCoder;
  base32: BytesCoder;
  base64: BytesCoder;
  base64url: BytesCoder;
  base58: BytesCoder;
  base58xmr: BytesCoder;
};
// prettier-ignore
const CODERS: SomeCoders = {
  utf8, hex, base16, base32, base64, base64url, base58, base58xmr
};
type CoderType = keyof SomeCoders;
const coderTypeError =
  'Invalid encoding type. Available types: utf8, hex, base16, base32, base64, base64url, base58, base58xmr';

/** @deprecated */
export const bytesToString = (type: CoderType, bytes: Uint8Array): string => {
  if (typeof type !== 'string' || !CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (!isBytes(bytes)) throw new TypeError('bytesToString() expects Uint8Array');
  return CODERS[type].encode(bytes);
};

/** @deprecated */
export const str: (type: CoderType, bytes: Uint8Array) => string = bytesToString; // as in python, but for bytes only

/** @deprecated */
export const stringToBytes = (type: CoderType, str: string): Uint8Array => {
  if (!CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (typeof str !== 'string') throw new TypeError('stringToBytes() expects string');
  return CODERS[type].decode(str);
};
/** @deprecated */
export const bytes: (type: CoderType, str: string) => Uint8Array = stringToBytes;
