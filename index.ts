/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */

/** Transforms values between two representations. */
export interface Coder<F, T> {
  /**
   * Converts a value from the input representation to the output representation.
   * @param from - Value in the source representation.
   * @returns Converted value.
   */
  encode(from: F): T;
  /**
   * Converts a value from the output representation back to the input representation.
   * @param to - Value in the target representation.
   * @returns Converted value.
   */
  decode(to: T): F;
}

/** Coder that works with byte arrays and strings. */
export interface BytesCoder extends Coder<Uint8Array, string> {
  /**
   * Encodes bytes into a string representation.
   * @param data - Bytes to encode.
   * @returns Encoded string.
   */
  encode: (data: Uint8Array) => string;
  /**
   * Decodes a string representation into raw bytes.
   * @param str - Encoded string.
   * @returns Decoded bytes.
   */
  decode: (str: string) => Uint8Array;
}

/**
 * Bytes API type helpers for old + new TypeScript.
 *
 * TS 5.6 has `Uint8Array`, while TS 5.9+ made it generic `Uint8Array<ArrayBuffer>`.
 * We can't use specific return type, because TS 5.6 will error.
 * We can't use generic return type, because most TS 5.9 software will expect specific type.
 *
 * Maps typed-array input leaves to broad forms.
 * These are compatibility adapters, not ownership guarantees.
 *
 * - `TArg` keeps byte inputs broad.
 * - `TRet` marks byte outputs for TS 5.6 and TS 5.9+ compatibility.
 */
export type TypedArg<T> = T extends BigInt64Array
  ? BigInt64Array
  : T extends BigUint64Array
    ? BigUint64Array
    : T extends Float32Array
      ? Float32Array
      : T extends Float64Array
        ? Float64Array
        : T extends Int16Array
          ? Int16Array
          : T extends Int32Array
            ? Int32Array
            : T extends Int8Array
              ? Int8Array
              : T extends Uint16Array
                ? Uint16Array
                : T extends Uint32Array
                  ? Uint32Array
                  : T extends Uint8ClampedArray
                    ? Uint8ClampedArray
                    : T extends Uint8Array
                      ? Uint8Array
                      : never;
/** Maps typed-array output leaves to narrow TS-compatible forms. */
export type TypedRet<T> = T extends BigInt64Array
  ? ReturnType<typeof BigInt64Array.of>
  : T extends BigUint64Array
    ? ReturnType<typeof BigUint64Array.of>
    : T extends Float32Array
      ? ReturnType<typeof Float32Array.of>
      : T extends Float64Array
        ? ReturnType<typeof Float64Array.of>
        : T extends Int16Array
          ? ReturnType<typeof Int16Array.of>
          : T extends Int32Array
            ? ReturnType<typeof Int32Array.of>
            : T extends Int8Array
              ? ReturnType<typeof Int8Array.of>
              : T extends Uint16Array
                ? ReturnType<typeof Uint16Array.of>
                : T extends Uint32Array
                  ? ReturnType<typeof Uint32Array.of>
                  : T extends Uint8ClampedArray
                    ? ReturnType<typeof Uint8ClampedArray.of>
                    : T extends Uint8Array
                      ? ReturnType<typeof Uint8Array.of>
                      : never;
/** Recursively adapts byte-carrying API input types. See {@link TypedArg}. */
export type TArg<T> =
  | T
  | ([TypedArg<T>] extends [never]
      ? T extends (...args: infer A) => infer R
        ? ((...args: { [K in keyof A]: TRet<A[K]> }) => TArg<R>) & {
            [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TArg<T[K]>;
          }
        : T extends [infer A, ...infer R]
          ? [TArg<A>, ...{ [K in keyof R]: TArg<R[K]> }]
          : T extends readonly [infer A, ...infer R]
            ? readonly [TArg<A>, ...{ [K in keyof R]: TArg<R[K]> }]
            : T extends (infer A)[]
              ? TArg<A>[]
              : T extends readonly (infer A)[]
                ? readonly TArg<A>[]
                : T extends Promise<infer A>
                  ? Promise<TArg<A>>
                  : T extends object
                    ? { [K in keyof T]: TArg<T[K]> }
                    : T
      : TypedArg<T>);
/** Recursively adapts byte-carrying API output types. See {@link TypedArg}. */
export type TRet<T> = T extends unknown
  ? T &
      ([TypedRet<T>] extends [never]
        ? T extends (...args: infer A) => infer R
          ? ((...args: { [K in keyof A]: TArg<A[K]> }) => TRet<R>) & {
              [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TRet<T[K]>;
            }
          : T extends [infer A, ...infer R]
            ? [TRet<A>, ...{ [K in keyof R]: TRet<R[K]> }]
            : T extends readonly [infer A, ...infer R]
              ? readonly [TRet<A>, ...{ [K in keyof R]: TRet<R[K]> }]
              : T extends (infer A)[]
                ? TRet<A>[]
                : T extends readonly (infer A)[]
                  ? readonly TRet<A>[]
                  : T extends Promise<infer A>
                    ? Promise<TRet<A>>
                    : T extends object
                      ? { [K in keyof T]: TRet<T[K]> }
                      : T
        : TypedRet<T>)
  : never;

function isBytes(a: unknown): a is Uint8Array {
  // Plain `instanceof Uint8Array` is too strict for some Buffer / proxy / cross-realm cases. The
  // fallback still requires a real ArrayBuffer view, so plain JSON-deserialized
  // `{ constructor: ... }` spoofing is rejected. `BYTES_PER_ELEMENT === 1` keeps the
  // fallback on byte-oriented views.
  return (
    a instanceof Uint8Array ||
    (ArrayBuffer.isView(a) &&
      a.constructor.name === 'Uint8Array' &&
      'BYTES_PER_ELEMENT' in a &&
      a.BYTES_PER_ELEMENT === 1)
  );
}
/** Asserts something is Uint8Array. */
function abytes(b: TArg<Uint8Array | undefined>): void {
  if (!isBytes(b)) throw new TypeError('Uint8Array expected');
}

function isArrayOf(isString: boolean, arr: any[]) {
  if (!Array.isArray(arr)) return false;
  if (arr.length === 0) return true;
  if (isString) {
    return arr.every((item) => typeof item === 'string');
  } else {
    return arr.every((item) => Number.isSafeInteger(item));
  }
}

function afn(input: Function): input is Function {
  if (typeof input !== 'function') throw new TypeError('function expected');
  return true;
}

function astr(label: string, input: unknown): input is string {
  if (typeof input !== 'string') throw new TypeError(`${label}: string expected`);
  return true;
}

function anumber(n: number): void {
  if (typeof n !== 'number') throw new TypeError(`number expected, got ${typeof n}`);
  if (!Number.isSafeInteger(n)) throw new RangeError(`invalid integer: ${n}`);
}

function aArr(input: any[]) {
  if (!Array.isArray(input)) throw new TypeError('array expected');
}
function astrArr(label: string, input: string[]) {
  if (!isArrayOf(true, input)) throw new TypeError(`${label}: array of strings expected`);
}
function anumArr(label: string, input: number[]) {
  if (!isArrayOf(false, input)) throw new TypeError(`${label}: array of numbers expected`);
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
 * Encodes integer radix representation to array of strings using alphabet and back.
 * Could also be array of strings.
 * @__NO_SIDE_EFFECTS__
 */
function alphabet(letters: string | string[]): Coder<number[], string[]> {
  // mapping 1 to "b"
  const lettersA = typeof letters === 'string' ? letters.split('') : letters;
  const len = lettersA.length;
  astrArr('alphabet', lettersA);

  // mapping "b" to 1
  const indexes = new Map(lettersA.map((l, i) => [l, i]));
  return {
    encode: (digits: number[]) => {
      aArr(digits);
      return digits.map((i) => {
        if (!Number.isSafeInteger(i) || i < 0 || i >= len)
          throw new Error(
            `alphabet.encode: digit index outside alphabet "${i}". Allowed: ${letters}`
          );
        return lettersA[i]!;
      });
    },
    decode: (input: string[]): number[] => {
      aArr(input);
      return input.map((letter) => {
        astr('alphabet.decode', letter);
        const i = indexes.get(letter);
        if (i === undefined) throw new Error(`Unknown letter: "${letter}". Allowed: ${letters}`);
        return i;
      });
    },
  };
}

/**
 * @__NO_SIDE_EFFECTS__
 */
function join(separator = ''): Coder<string[], string> {
  astr('join', separator);
  // join('') is only lossless when each chunk is already unambiguous, such as single-symbol alphabets.
  // Multi-character tokens need a separator that cannot appear inside the chunks.
  return {
    encode: (from) => {
      astrArr('join.decode', from);
      return from.join(separator);
    },
    decode: (to) => {
      astr('join.decode', to);
      return to.split(separator);
    },
  };
}

/**
 * Pad strings array so it has integer number of bits
 * @__NO_SIDE_EFFECTS__
 */
function padding(bits: number, chr = '='): Coder<string[], string[]> {
  anumber(bits);
  astr('padding', chr);
  return {
    encode(data: string[]): string[] {
      astrArr('padding.encode', data);
      // Mutates the intermediate token array in place while appending pad chars.
      // utils.padding callers that need to preserve their input should pass a copy.
      while ((data.length * bits) % 8) data.push(chr);
      return data;
    },
    decode(input: string[]): string[] {
      astrArr('padding.decode', input);
      let end = input.length;
      if ((end * bits) % 8)
        throw new Error('padding: invalid, string should have whole number of bytes');
      for (; end > 0 && input[end - 1] === chr; end--) {
        const last = end - 1;
        const byte = last * bits;
        if (byte % 8 === 0) throw new Error('padding: invalid, string has too much padding');
      }
      return input.slice(0, end);
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
function convertRadix(data: number[], from: number, to: number): number[] {
  // base 1 is impossible
  if (from < 2)
    throw new RangeError(`convertRadix: invalid from=${from}, base cannot be less than 2`);
  if (to < 2) throw new RangeError(`convertRadix: invalid to=${to}, base cannot be less than 2`);
  aArr(data);
  if (!data.length) return [];
  let pos = 0;
  const res = [];
  const digits = Array.from(data, (d) => {
    anumber(d);
    if (d < 0 || d >= from) throw new Error(`invalid integer: ${d}`);
    return d;
  });
  const dlen = digits.length;
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
    res.push(carry);
    if (done) break;
  }
  // Preserve explicit leading zero digits so callers like base58 keep zero-prefix semantics.
  for (let i = 0; i < data.length - 1 && data[i] === 0; i++) res.push(0);
  return res.reverse();
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
// Maximum carry width before the `pos` cycle repeats.
// Residues advance in gcd(from, to) steps, so the largest pre-drain width is from + (to - gcd).
const radix2carry = /* @__NO_SIDE_EFFECTS__ */ (from: number, to: number) =>
  from + (to - gcd(from, to));
const powers: number[] = /* @__PURE__ */ (() => {
  let res = [];
  for (let i = 0; i < 40; i++) res.push(2 ** i);
  return res;
})();
/**
 * Implemented with numbers, because BigInt is 5x slower
 */
function convertRadix2(data: number[], from: number, to: number, padding: boolean): number[] {
  aArr(data);
  if (from <= 0 || from > 32) throw new RangeError(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 32) throw new RangeError(`convertRadix2: wrong to=${to}`);
  if (radix2carry(from, to) > 32) {
    throw new Error(
      `convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`
    );
  }
  let carry = 0;
  let pos = 0; // bitwise position in current element
  const max = powers[from]!;
  const mask = powers[to]! - 1;
  const res: number[] = [];
  for (const n of data) {
    anumber(n);
    if (n >= max) throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
    carry = (carry << from) | n;
    if (pos + from > 32) throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
    pos += from;
    for (; pos >= to; pos -= to) res.push(((carry >> (pos - to)) & mask) >>> 0);
    const pow = powers[pos];
    if (pow === undefined) throw new Error('invalid carry');
    carry &= pow - 1; // clean carry, otherwise it will cause overflow
  }
  carry = (carry << (to - pos)) & mask;
  // Canonical decode paths reject leftover whole input words and non-zero pad bits.
  // For Bech32 5->8 regrouping, this is the "4 bits or less, all zeroes" tail rule.
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry > 0) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res.push(carry >>> 0);
  return res;
}

/**
 * @__NO_SIDE_EFFECTS__
 */
function radix(num: number): TRet<Coder<Uint8Array, number[]>> {
  anumber(num);
  const _256 = 2 ** 8;
  // Base-range and carry-overflow checks live in convertRadix so encode/decode reject unsupported bases symmetrically.
  return {
    encode: (bytes: TArg<Uint8Array>) => {
      if (!isBytes(bytes)) throw new TypeError('radix.encode input should be Uint8Array');
      return convertRadix(Array.from(bytes), _256, num);
    },
    decode: (digits: number[]) => {
      anumArr('radix.decode', digits);
      return Uint8Array.from(convertRadix(digits, num, _256));
    },
  };
}

/**
 * If both bases are power of same number (like `2**8 <-> 2**64`),
 * there is a linear algorithm. For now we have implementation for power-of-two bases only.
 * @__NO_SIDE_EFFECTS__
 */
function radix2(bits: number, revPadding = false): TRet<Coder<Uint8Array, number[]>> {
  anumber(bits);
  if (bits <= 0 || bits > 32) throw new RangeError('radix2: bits should be in (0..32]');
  if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32)
    throw new RangeError('radix2: carry overflow');
  // revPadding flips which direction allows a partial zero tail.
  // Default pads 8->bits and rejects extra bits on bits->8; `true` does the opposite.
  return {
    encode: (bytes: TArg<Uint8Array>) => {
      if (!isBytes(bytes)) throw new TypeError('radix2.encode input should be Uint8Array');
      return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
    },
    decode: (digits: number[]) => {
      anumArr('radix2.decode', digits);
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    },
  };
}

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type BytesFn = (data: TArg<Uint8Array>) => TRet<Uint8Array>;
function unsafeWrapper<T extends (...args: any) => any>(fn: T) {
  afn(fn);
  return function (...args: ArgumentTypes<T>): ReturnType<T> | void {
    // Only for *Unsafe APIs that intentionally collapse validation failures to `undefined`.
    // Do not wrap code that needs to preserve exception details.
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}

function checksum(len: number, fn: TArg<BytesFn>): TRet<Coder<Uint8Array, Uint8Array>> {
  anumber(len);
  // Reject degenerate zero-byte checksums up front so callers don't accidentally
  // build a no-op checksum stage.
  if (len <= 0) throw new RangeError(`checksum length must be positive: ${len}`);
  afn(fn);
  const _fn = fn as BytesFn;
  // Uses the first `len` bytes of fn(data) in both directions.
  // Current call sites rely on `len > 0` and checksum functions that return at least that many bytes.
  return {
    encode(data: TArg<Uint8Array>) {
      if (!isBytes(data)) throw new TypeError('checksum.encode: input should be Uint8Array');
      const sum = _fn(data).slice(0, len);
      const res = new Uint8Array(data.length + len);
      res.set(data);
      res.set(sum, data.length);
      return res;
    },
    decode(data: TArg<Uint8Array>) {
      if (!isBytes(data)) throw new TypeError('checksum.decode: input should be Uint8Array');
      const payload = data.slice(0, -len);
      const oldChecksum = data.slice(-len);
      const newChecksum = _fn(payload).slice(0, len);
      for (let i = 0; i < len; i++)
        if (newChecksum[i] !== oldChecksum[i]) throw new Error('Invalid checksum');
      return payload;
    },
  };
}

// prettier-ignore
/**
 * Low-level building blocks used by the exported codecs.
 * @example
 * Build a radix-32 coder from the low-level helpers.
 * ```ts
 * import { utils } from '@scure/base';
 * utils.radix2(5).encode(Uint8Array.from([1, 2, 3]));
 * ```
 */
export const utils: { alphabet: typeof alphabet; chain: typeof chain; checksum: typeof checksum; convertRadix: typeof convertRadix; convertRadix2: typeof convertRadix2; radix: typeof radix; radix2: typeof radix2; join: typeof join; padding: typeof padding; } = /* @__PURE__ */ Object.freeze({
  alphabet, chain, checksum, convertRadix, convertRadix2, radix, radix2, join, padding,
});

// RFC 4648 aka RFC 3548
// ---------------------

/**
 * base16 encoding from RFC 4648.
 * This codec uses RFC 4648 Table 5's uppercase alphabet directly.
 * RFC 4648 §8 calls base16 "case-insensitive hex encoding", but we intentionally do not case-fold decode input here.
 * Use `hex` for case-insensitive hex decoding.
 * @example
 * ```js
 * base16.encode(Uint8Array.from([0x12, 0xab]));
 * // => '12AB'
 * ```
 */
export const base16: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(radix2(4), alphabet('0123456789ABCDEF'), join(''))
);

/**
 * base32 encoding from RFC 4648. Has padding.
 * RFC 4648 §6 Table 3 uses uppercase letters, and RFC 4648 §3.4 allows applications to choose
 * upper- or lowercase alphabets. We keep the published uppercase table and do not case-fold decode input.
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
export const base32: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''))
);

/**
 * base32 encoding from RFC 4648. No padding.
 * This variant inherits RFC 4648 base32's uppercase table and intentionally does not case-fold decode input.
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
export const base32nopad: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), join(''))
);
/**
 * base32 encoding from RFC 4648. Padded. Compared to ordinary `base32`, slightly different alphabet.
 * RFC 4648 §7 Table 4 uses uppercase letters, and we intentionally keep that table without case-folding decode input.
 * Use `base32hexnopad` for unpadded version.
 * @example
 * ```js
 * base32hex.encode(Uint8Array.from([0x12, 0xab]));
 * // => '2ALG===='
 * base32hex.decode('2ALG====');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32hex: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''))
);

/**
 * base32 encoding from RFC 4648. No padding. Compared to ordinary `base32`, slightly different alphabet.
 * This variant inherits RFC 4648 base32hex's uppercase table and intentionally does not case-fold decode input.
 * Use `base32hex` for padded version.
 * @example
 * ```js
 * base32hexnopad.encode(Uint8Array.from([0x12, 0xab]));
 * // => '2ALG'
 * base32hexnopad.decode('2ALG');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32hexnopad: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), join(''))
);
/**
 * base32 encoding from RFC 4648. Doug Crockford's version.
 * See {@link https://www.crockford.com/base32.html | Douglas Crockford's Base32}.
 * @example
 * ```js
 * base32crockford.encode(Uint8Array.from([0x12, 0xab]));
 * // => '2ANG'
 * base32crockford.decode('2ANG');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
export const base32crockford: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(
    radix2(5),
    alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'),
    join(''),
    normalize((s: string) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1'))
  )
);

// Built-in base64 conversion https://caniuse.com/mdn-javascript_builtins_uint8array_frombase64
// Require both directions before taking the native fast path, so base64/base64url don't mix native and JS behavior.
// prettier-ignore
const hasBase64Builtin: boolean = /* @__PURE__ */ (() =>
  typeof (Uint8Array as any).from([]).toBase64 === 'function' &&
  typeof (Uint8Array as any).fromBase64 === 'function')();

// Native `Uint8Array.fromBase64()` accepts these ASCII whitespace chars.
// Reject them first so the native base64 path still follows RFC 4648 §3.3.
// ASCII whitespace is U+0009 TAB, U+000A LF, U+000C FF, U+000D CR, or U+0020 SPACE
const ASCII_WHITESPACE = /[\t\n\f\r ]/;

const decodeBase64Builtin = (s: string, isUrl: boolean) => {
  astr('base64', s);
  const alphabet = isUrl ? 'base64url' : 'base64';
  // Per spec, .fromBase64 already throws on any other non-alphabet symbols except ASCII whitespace
  // And checking just for whitespace makes decoding about 3x faster than a full range check.
  // lastChunkHandling: 'strict' rejects loose tails and non-zero pad bits so native decoding stays canonical.
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
export const base64: BytesCoder = /* @__PURE__ */ Object.freeze(hasBase64Builtin ? {
  encode(b) { abytes(b); return (b as any).toBase64(); },
  decode(s) { return decodeBase64Builtin(s, false); },
} : chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'),
  padding(6),
  join('')
));
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
export const base64nopad: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(
    radix2(6),
    alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'),
    join('')
  )
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
export const base64url: BytesCoder = /* @__PURE__ */ Object.freeze(hasBase64Builtin ? {
  encode(b) { abytes(b); return (b as any).toBase64({ alphabet: 'base64url' }); },
  decode(s) { return decodeBase64Builtin(s, true); },
} : chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'),
  padding(6),
  join('')
));

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
export const base64urlnopad: BytesCoder = /* @__PURE__ */ Object.freeze(
  chain(
    radix2(6),
    alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'),
    join('')
  )
);

// base58 code
// -----------
const genBase58 = /* @__NO_SIDE_EFFECTS__ */ (abc: string) =>
  chain(radix(58), alphabet(abc), join(''));

/**
 * base58: base64 without ambigous characters +, /, 0, O, I, l.
 * Quadratic (O(n^2)) - so, can't be used on large inputs.
 * @example
 * ```js
 * const text = base58.encode(Uint8Array.from([0, 1, 2]));
 * base58.decode(text);
 * // => Uint8Array.from([0, 1, 2])
 * ```
 */
export const base58: BytesCoder = /* @__PURE__ */ Object.freeze(
  genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
);
/**
 * base58: flickr version. Check out `base58`.
 * @example
 * Round-trip bytes with the Flickr alphabet.
 * ```ts
 * const text = base58flickr.encode(Uint8Array.from([0, 1, 2]));
 * base58flickr.decode(text);
 * ```
 */
export const base58flickr: BytesCoder = /* @__PURE__ */ Object.freeze(
  genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ')
);
/**
 * base58: XRP version. Check out `base58`.
 * @example
 * Round-trip bytes with the XRP alphabet.
 * ```ts
 * const text = base58xrp.encode(Uint8Array.from([0, 1, 2]));
 * base58xrp.decode(text);
 * ```
 */
export const base58xrp: BytesCoder = /* @__PURE__ */ Object.freeze(
  genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz')
);

// Data len (index) -> encoded block len.
// Monero pads each 1..8-byte block to this fixed base58 width so decode can recover the tail length.
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];

/**
 * base58: XMR version. Check out `base58`.
 * Done in 8-byte blocks (which equals 11 chars in decoding). Last (non-full) block padded with '1' to size in XMR_BLOCK_LEN.
 * Block encoding significantly reduces quadratic complexity of base58.
 * @example
 * Round-trip bytes with the Monero block codec.
 * ```ts
 * const text = base58xmr.encode(Uint8Array.from([0, 1, 2]));
 * base58xmr.decode(text);
 * ```
 */
export const base58xmr: BytesCoder = /* @__PURE__ */ Object.freeze({
  encode(data: TArg<Uint8Array>) {
    abytes(data);
    let res = '';
    for (let i = 0; i < data.length; i += 8) {
      const block = data.subarray(i, i + 8);
      res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length]!, '1');
    }
    return res;
  },
  decode(str: string) {
    astr('base58xmr.decode', str);
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
});

/**
 * Method, which creates base58check encoder.
 * Requires function, calculating sha256.
 * Callers must include any version bytes in `data`; this helper only applies the
 * 4-byte double-SHA256 checksum used by Bitcoin Base58Check.
 * @param sha256 - Function used to calculate the checksum hash.
 * @returns base58check codec using 4 checksum bytes.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Create a base58check codec from a SHA-256 implementation.
 * ```ts
 * import { createBase58check } from '@scure/base';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const coder = createBase58check(sha256);
 * coder.encode(Uint8Array.from([1, 2, 3]));
 * ```
 */
export const createBase58check = (sha256: TArg<BytesFn>): BytesCoder => {
  // Validate the hash function at construction time so wrong inputs fail before returning a coder.
  afn(sha256);
  const _sha256 = sha256 as BytesFn;
  return chain(
    checksum(4, (data: TArg<Uint8Array>) => _sha256(_sha256(data))),
    base58
  );
};

/**
 * Use `createBase58check` instead.
 * @deprecated Use {@link createBase58check} instead.
 * Callers must include any version bytes in `data`; this alias keeps the same
 * 4-byte double-SHA256 checksum behavior as `createBase58check`.
 * @param sha256 - Function used to calculate the checksum hash.
 * @returns base58check codec using 4 checksum bytes.
 * @example
 * Create a base58check codec with the deprecated alias.
 * ```ts
 * import { base58check } from '@scure/base';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const coder = base58check(sha256);
 * coder.encode(Uint8Array.from([1, 2, 3]));
 * ```
 */
export const base58check: (sha256: TArg<BytesFn>) => BytesCoder = createBase58check;

// Bech32 code
// -----------
/** Result of bech32 decoding. */
export interface Bech32Decoded<Prefix extends string = string> {
  /** Human-readable bech32 prefix. */
  prefix: Prefix;
  /** Decoded 5-bit word payload. */
  words: number[];
}
/** Result of bech32 decoding with original bytes attached. */
export interface Bech32DecodedWithArray<Prefix extends string = string> {
  /** Human-readable bech32 prefix. */
  prefix: Prefix;
  /** Decoded 5-bit word payload. */
  words: number[];
  /** Decoded payload converted back into raw bytes. */
  bytes: Uint8Array;
}

// BIP 173 character table: data values 0..31 map to `qpzry9x8gf2tvdw0s3jn54khce6mua7l`.
const BECH_ALPHABET: Coder<number[], string> = chain(
  alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'),
  join('')
);

// BIP 173 `bech32_polymod` GEN coefficients.
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
// BIP 173 step split: this applies the polymod state transition before callers xor in the next 5-bit value.
function bech32Polymod(pre: number): number {
  const b = pre >> 25;
  let chk = (pre & 0x1ffffff) << 5;
  for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
    if (((b >> i) & 1) === 1) chk ^= POLYMOD_GENERATORS[i]!;
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
  // BIP 173/BIP 350: xor the final checksum constant, then emit the 30-bit state as six 5-bit symbols.
  chk ^= encodingConst;
  return BECH_ALPHABET.encode(convertRadix2([chk % powers[30]!], 30, 5, false));
}

/** bech32 codec surface. */
export interface Bech32 {
  /**
   * Encodes a human-readable prefix and 5-bit words into a bech32 string.
   * @param prefix - Human-readable prefix.
   * @param words - 5-bit words or raw bytes.
   * @param limit - Maximum accepted output length, or `false` to disable the limit.
   * @returns Encoded bech32 string.
   */
  encode<Prefix extends string>(
    prefix: Prefix,
    words: number[] | Uint8Array,
    limit?: number | false
  ): `${Lowercase<Prefix>}1${string}`;
  /**
   * Decodes a bech32 string into prefix and words.
   * @param str - Encoded bech32 string.
   * @param limit - Maximum accepted input length, or `false` to disable the limit.
   * @returns Decoded prefix and 5-bit words.
   */
  decode<Prefix extends string>(
    str: `${Prefix}1${string}`,
    limit?: number | false
  ): Bech32Decoded<Prefix>;
  decode(str: string, limit?: number | false): Bech32Decoded;
  /**
   * Encodes raw bytes by first converting them to 5-bit words.
   * @param prefix - Human-readable prefix.
   * @param bytes - Raw bytes to encode.
   * @returns Encoded bech32 string.
   */
  encodeFromBytes(prefix: string, bytes: Uint8Array): string;
  /**
   * Decodes a bech32 string and converts the payload back into bytes.
   * @param str - Encoded bech32 string.
   * @returns Decoded prefix, words, and bytes.
   */
  decodeToBytes(str: string): Bech32DecodedWithArray;
  /**
   * Decodes a bech32 string, returning `undefined` instead of throwing on invalid input.
   * @param str - Encoded bech32 string.
   * @param limit - Maximum accepted input length, or `false` to disable the limit.
   * @returns Decoded prefix and words, or `undefined` for invalid input.
   */
  decodeUnsafe(str: string, limit?: number | false): void | Bech32Decoded<string>;
  /**
   * Converts 5-bit words back into raw bytes.
   * @param to - 5-bit words to decode.
   * @returns Decoded bytes.
   */
  fromWords(to: number[]): Uint8Array;
  /**
   * Converts 5-bit words back into raw bytes, returning `undefined` instead of throwing.
   * @param to - 5-bit words to decode.
   * @returns Decoded bytes, or `undefined` for invalid input.
   */
  fromWordsUnsafe(to: number[]): void | Uint8Array;
  /**
   * Converts raw bytes into 5-bit words for bech32 encoding.
   * @param from - Raw bytes to convert.
   * @returns 5-bit words.
   */
  toWords(from: Uint8Array): number[];
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function genBech32(encoding: 'bech32' | 'bech32m'): TRet<Bech32> {
  // BIP 173 uses final xor constant 1; BIP 350 swaps in 0x2bc830a3 for Bech32m.
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
  const _words = radix2(5);
  const fromWords = _words.decode;
  const toWords = _words.encode;
  const fromWordsUnsafe = unsafeWrapper(fromWords);

  function encode<Prefix extends string>(
    prefix: Prefix,
    words: TArg<number[] | Uint8Array>,
    limit: number | false = 90
  ): `${Lowercase<Prefix>}1${string}` {
    astr('bech32.encode prefix', prefix);
    if (isBytes(words)) words = Array.from(words);
    anumArr('bech32.encode', words);
    const plen = prefix.length;
    if (plen === 0) throw new TypeError(`Invalid prefix length ${plen}`);
    // Total output is hrp + `1` separator + payload words + 6 checksum chars.
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
    // Minimum length is 1-char hrp + `1` separator + 6-char checksum.
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

  function decodeToBytes(str: string): TRet<Bech32DecodedWithArray> {
    // Keep the byte helper unbounded; callers that need the default BIP 173 length cap should use decode(str).
    const { prefix, words } = decode(str, false);
    return {
      prefix,
      words,
      bytes: fromWords(words) as TRet<Uint8Array>,
    } as TRet<Bech32DecodedWithArray>;
  }

  function encodeFromBytes(prefix: string, bytes: TArg<Uint8Array>) {
    // Keep the convenience wrapper on encode()'s default 90-char cap; custom limits should call encode(prefix, toWords(bytes), limit).
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
 * For high-level helpers, check out {@link https://github.com/paulmillr/scure-btc-signer | scure-btc-signer}.
 * @example
 * Convert bytes to words, encode them, then decode back.
 * ```ts
 * const words = bech32.toWords(Uint8Array.from([1, 2, 3]));
 * const text = bech32.encode('bc', words);
 * bech32.decode(text);
 * ```
 */
export const bech32: TRet<Bech32> = /* @__PURE__ */ Object.freeze(genBech32('bech32'));

/**
 * bech32m from BIP 350. Operates on words.
 * It was to mitigate `bech32` weaknesses.
 * For high-level helpers, check out {@link https://github.com/paulmillr/scure-btc-signer | scure-btc-signer}.
 * @example
 * Convert bytes to words, encode them with bech32m, then decode back.
 * ```ts
 * const words = bech32m.toWords(Uint8Array.from([1, 2, 3]));
 * const text = bech32m.encode('bc', words);
 * bech32m.decode(text);
 * ```
 */
export const bech32m: TRet<Bech32> = /* @__PURE__ */ Object.freeze(genBech32('bech32m'));

declare const TextEncoder: any;
declare const TextDecoder: any;

/**
 * ASCII-to-byte decoder. Rejects non-ASCII text and bytes instead of doing UTF-8 replacement.
 * Method names follow `BytesCoder`, so `encode(bytes)` returns a string and `decode(string)` returns bytes.
 * @example
 * ```js
 * const b = ascii.decode("ABC"); // => new Uint8Array([ 65, 66, 67 ])
 * const str = ascii.encode(b); // "ABC"
 * ```
 */
export const ascii: TRet<BytesCoder> = /* @__PURE__ */ Object.freeze({
  encode(data: TArg<Uint8Array>) {
    abytes(data);
    let res = '';
    for (let i = 0; i < data.length; i++) {
      const byte = data[i]!;
      // ASCII is 7-bit; reject bytes outside 0x00..0x7f instead of silently widening to
      // Latin-1/UTF-8.
      if (byte > 127) throw new RangeError(`bytes contain non-ASCII byte ${byte} at position ${i}`);
      res += String.fromCharCode(byte);
    }
    return res;
  },
  decode(str: string) {
    if (typeof str !== 'string') throw new TypeError('ascii string expected, got ' + typeof str);
    const res = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      // Indexed access is much faster than Uint8Array.from(str, mapFn) here and keeps
      // exact error positions.
      const charCode = str.charCodeAt(i);
      if (charCode > 127) {
        throw new RangeError(
          `string contains non-ASCII character "${str[i]}" with code ${charCode} at position ${i}`
        );
      }
      res[i] = charCode;
    }
    return res;
  },
});

const _isWellFormedShim = (str: string): boolean => {
  // encodeURI rejects malformed UTF-16, giving a compact fallback that matches native
  // isWellFormed on our tests/fuzz corpus.
  try {
    return encodeURI(str) !== null;
  } catch {
    return false;
  }
};
const _isWellFormed: (str: string) => boolean = /* @__PURE__ */ (() =>
  // Pick the native check once so utf8.decode doesn't re-probe String.prototype on every call.
  typeof ('' as any).isWellFormed === 'function'
    ? (str) => (str as any).isWellFormed()
    : _isWellFormedShim)();
// This fallback stays small because strict UTF-8 only needs fatal decoding plus well-formed
// UTF-16 checks, not the replacement, streaming, or legacy-encoding behavior of full platform
// text codecs.
const utf8Fallback: BytesCoder = /* @__PURE__ */ Object.freeze({
  encode(data: TArg<Uint8Array>) {
    abytes(data);
    let res = '';
    for (let i = 0; i < data.length; ) {
      const a = data[i++]!;
      if (a < 0b1000_0000) {
        res += String.fromCharCode(a);
        continue;
      }
      if (a < 0b1100_0010 || i >= data.length) throw new TypeError(`invalid utf8 at byte ${i - 1}`);
      const b = data[i++]!;
      if ((b & 0b1100_0000) !== 0b1000_0000) throw new TypeError(`invalid utf8 at byte ${i - 1}`);
      let cp = ((a & 0b0001_1111) << 6) | (b & 0b0011_1111);
      if (a >= 0b1110_0000) {
        if (i >= data.length) throw new TypeError(`invalid utf8 at byte ${i - 1}`);
        const c = data[i++]!;
        if (
          (c & 0b1100_0000) !== 0b1000_0000 ||
          (a === 0b1110_0000 && b < 0b1010_0000) ||
          (a === 0xed && b >= 0b1010_0000)
        )
          throw new TypeError(`invalid utf8 at byte ${i - 1}`);
        cp = ((a & 0b0000_1111) << 12) | ((b & 0b0011_1111) << 6) | (c & 0b0011_1111);
        if (a >= 0b1111_0000) {
          if (i >= data.length) throw new TypeError(`invalid utf8 at byte ${i - 1}`);
          const d = data[i++]!;
          if (
            a > 0b1111_0100 ||
            (d & 0b1100_0000) !== 0b1000_0000 ||
            (a === 0b1111_0000 && b < 0b1001_0000) ||
            (a === 0b1111_0100 && b >= 0b1001_0000)
          )
            throw new TypeError(`invalid utf8 at byte ${i - 1}`);
          cp =
            ((a & 7) << 18) |
            ((b & 0b0011_1111) << 12) |
            ((c & 0b0011_1111) << 6) |
            (d & 0b0011_1111);
        }
      }
      if (cp < 0x10000) res += String.fromCharCode(cp);
      else {
        cp -= 0x10000;
        res += String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
      }
    }
    return res;
  },
  decode(str: string) {
    astr('utf8', str);
    if (!_isWellFormed(str)) throw new TypeError('utf8 expected well-formed string');
    // Direct Uint8Array writes are much faster than number[] + Uint8Array.from on Hermes and
    // large Node inputs.
    const res = new Uint8Array(str.length * 3);
    let pos = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0b1000_0000) {
        res[pos++] = c;
        continue;
      }
      if (c >= 0xd800 && c <= 0xdfff) {
        const d = str.charCodeAt(++i);
        c = 0x10000 + ((c - 0xd800) << 10) + d - 0xdc00;
      }
      if (c >= 0x10000) {
        res[pos++] = (c >> 18) | 0b1111_0000;
        res[pos++] = ((c >> 12) & 0b0011_1111) | 0b1000_0000;
      } else if (c >= 0x800) res[pos++] = (c >> 12) | 0b1110_0000;
      else res[pos++] = (c >> 6) | 0b1100_0000;
      if (c >= 0x800) res[pos++] = ((c >> 6) & 0b0011_1111) | 0b1000_0000;
      res[pos++] = (c & 0b0011_1111) | 0b1000_0000;
    }
    return res.subarray(0, pos);
  },
});

/**
 * Strict UTF-8-to-byte decoder. Uses built-in TextDecoder / TextEncoder when available.
 * Method names follow `BytesCoder`, so `encode(bytes)` returns a string and
 * `decode(string)` returns bytes.
 * `encode(bytes)` requires Uint8Array input, preserves an explicit leading BOM, and
 *   throws on invalid UTF-8 bytes.
 * `decode(string)` requires a primitive string and throws on malformed UTF-16 strings with
 *   lone surrogates.
 * @example
 * ```js
 * const b = utf8.decode("hey"); // => new Uint8Array([ 104, 101, 121 ])
 * const str = utf8.encode(b); // "hey"
 * ```
 */
export const utf8: BytesCoder = /* @__PURE__ */ (() => {
  let _utf8Encoder: any;
  let _utf8Decoder: any;
  const utf8Builtin: BytesCoder = {
    // ignoreBOM preserves an explicit leading U+FEFF;
    // fatal rejects invalid UTF-8 bytes instead of replacing them.
    encode(data) {
      abytes(data);
      return (
        _utf8Decoder || (_utf8Decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }))
      ).decode(data);
    },
    decode(str) {
      astr('utf8', str);
      if (!_isWellFormed(str)) throw new TypeError('utf8 expected well-formed string');
      return (_utf8Encoder || (_utf8Encoder = new TextEncoder())).encode(str);
    },
  };
  return Object.freeze({
    // Select each direction once at module init, since
    // TextEncoder and TextDecoder can exist independently.
    encode: typeof TextDecoder === 'function' ? utf8Builtin.encode : utf8Fallback.encode,
    decode: typeof TextEncoder === 'function' ? utf8Builtin.decode : utf8Fallback.decode,
  });
})();
// Keep fallback parity probes behind a test-only export until runtime fallback behavior is decided.
export const __TESTS: {
  utf8Fallback: BytesCoder;
  _isWellFormedShim: (str: string) => boolean;
} = /* @__PURE__ */ Object.freeze({
  utf8Fallback: utf8Fallback,
  _isWellFormedShim: _isWellFormedShim,
});

// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
// prettier-ignore
const hasHexBuiltin: boolean = /* @__PURE__ */ (() =>
  // Require both directions before enabling the native hex path so encode/decode stay symmetric.
  typeof (Uint8Array as any).from([]).toHex === 'function' &&
  typeof (Uint8Array as any).fromHex === 'function')();
// prettier-ignore
const hexBuiltin: BytesCoder = {
  // Keep local type guards so the native path preserves library-level input errors.
  // Native toHex emits lowercase hex, matching the fallback alphabet and Node's hex strings.
  encode(data) { abytes(data); return (data as any).toHex(); },
  // Native fromHex accepts either hex case and rejects odd-length / non-hex syntax.
  decode(s) { astr('hex', s); return (Uint8Array as any).fromHex(s); },
};
/**
 * hex string decoder. Uses built-in function, when available.
 * Lowercase codec; unlike `base16`, this variant accepts either hex case and emits lowercase.
 * @example
 * ```js
 * const b = hex.decode("0102ff"); // => new Uint8Array([ 1, 2, 255 ])
 * const str = hex.encode(b); // "0102ff"
 * ```
 */
export const hex: BytesCoder = /* @__PURE__ */ Object.freeze(
  hasHexBuiltin
    ? hexBuiltin
    : chain(
        radix2(4),
        alphabet('0123456789abcdef'),
        join(''),
        normalize((s: string) => {
          if (typeof s !== 'string' || s.length % 2 !== 0)
            throw new TypeError(
              `hex.decode: expected string, got ${typeof s} with length ${s.length}`
            );
          return s.toLowerCase();
        })
      )
);

/** Built-in codecs exposed through the deprecated string conversion helpers. */
export type SomeCoders = {
  /** UTF-8 string codec. */
  utf8: BytesCoder;
  /** Hex codec. */
  hex: BytesCoder;
  /** Uppercase RFC 4648 base16 codec. */
  base16: BytesCoder;
  /** RFC 4648 base32 codec with padding. */
  base32: BytesCoder;
  /** RFC 4648 base64 codec with padding. */
  base64: BytesCoder;
  /** URL-safe base64 codec without `+` or `/`. */
  base64url: BytesCoder;
  /** Bitcoin-style base58 codec. */
  base58: BytesCoder;
  /** Monero-style base58 codec. */
  base58xmr: BytesCoder;
};
// prettier-ignore
// Keep this registry aligned with CoderType/coderTypeError; only byte<->string codecs belong here.
const CODERS: SomeCoders = {
  utf8, hex, base16, base32, base64, base64url, base58, base58xmr
};
type CoderType = keyof SomeCoders;
const coderTypeError =
  'Invalid encoding type. Available types: utf8, hex, base16, base32, base64, base64url, base58, base58xmr';

/**
 * Encodes bytes with one of the built-in codecs.
 * @deprecated Use the codec directly, for example `hex.encode(bytes)`.
 * @param type - Codec name.
 * @param bytes - Bytes to encode.
 * @returns Encoded string.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * ```ts
 * bytesToString('hex', Uint8Array.from([1, 2, 255]));
 * ```
 */
export const bytesToString = (type: CoderType, bytes: TArg<Uint8Array>): string => {
  if (typeof type !== 'string' || !CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (!isBytes(bytes)) throw new TypeError('bytesToString() expects Uint8Array');
  return CODERS[type].encode(bytes);
};

/**
 * Alias for `bytesToString`.
 * @deprecated Use {@link bytesToString} or the codec directly instead.
 * @param type - Codec name.
 * @param bytes - Bytes to encode.
 * @returns Encoded string.
 * @example
 * ```ts
 * str('hex', Uint8Array.from([1, 2, 255]));
 * ```
 */
export const str: (type: CoderType, bytes: TArg<Uint8Array>) => string = bytesToString; // as in python, but for bytes only

/**
 * Decodes a string with one of the built-in codecs.
 * @deprecated Use the codec directly, for example `hex.decode(text)`.
 * @param type - Codec name.
 * @param str - Encoded string.
 * @returns Decoded bytes.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * ```ts
 * stringToBytes('hex', '0102ff');
 * ```
 */
export const stringToBytes = (type: CoderType, str: string): TRet<Uint8Array> => {
  // Match bytesToString's selector validation so hostile `toString()` coercions can't leak custom errors.
  if (typeof type !== 'string' || !CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (typeof str !== 'string') throw new TypeError('stringToBytes() expects string');
  return CODERS[type].decode(str) as TRet<Uint8Array>;
};
/**
 * Alias for `stringToBytes`.
 * @deprecated Use {@link stringToBytes} or the codec directly instead.
 * @param type - Codec name.
 * @param str - Encoded string.
 * @returns Decoded bytes.
 * @example
 * ```ts
 * bytes('hex', '0102ff');
 * ```
 */
export const bytes: (type: CoderType, str: string) => TRet<Uint8Array> = stringToBytes;
