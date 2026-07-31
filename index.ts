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

// Freeze the result of a thunk. `/* @__PURE__ */ freeze(() => expr)` keeps the whole
// initializer tree-shakable: the annotated call's only argument is a function literal,
// so bundlers drop everything (inner chain()/alphabet() calls included) when unused.
const freeze = <T>(fn: () => T): Readonly<T> => Object.freeze(fn());

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

function anumber(n: number, title = 'number'): void {
  if (typeof n !== 'number') throw new TypeError(`${title}: expected number, got ${typeof n}`);
  if (!Number.isSafeInteger(n)) throw new RangeError(`${title}: expected safe integer, got ${n}`);
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

function normalize<T>(fn: (val: T) => T): Coder<T, T> {
  afn(fn);
  return { encode: (from: T) => from, decode: (to: T) => fn(to) };
}

const powers: number[] = /* @__PURE__ */ (() => {
  let res = [];
  for (let i = 0; i < 40; i++) res.push(2 ** i);
  return res;
})();
// Indexed copy loops instead of Array.from / Uint8Array.from: those go through the
// iterator protocol on typed arrays, which is ~10x slower and would swamp the fast
// links' gains on the conversion boundaries.
function u8ToNumArr(u8: TArg<Uint8Array>, len: number = u8.length): number[] {
  const res = new Array<number>(len);
  for (let i = 0; i < len; i++) res[i] = u8[i]!;
  return res;
}
// Fast-path links
// ---------------
// Used by every built-in codec. Links exchange Uint8Array buffers of digit values /
// char codes instead of number[] / string[] of single-char strings, avoiding per-symbol
// heap allocations. Only usable for single-char ASCII alphabets of <= 128 symbols
// (Int8Array reverse-table limit) with bits in (0..8]. The generic "Slow" originals
// (multi-char alphabets, digits above 255, bits up to 32) were removed from the library;
// they live on in test/slow.ts as the differential-testing reference.
// Validation must stay in sync with the Slow versions: same canonical-padding
// strictness on decode, same rejection of unknown letters.

declare const TextEncoder: any;
declare const TextDecoder: any;

// UTF-8 TextDecoder builds a string from ASCII codes 2x faster than `TextDecoder('latin1')`
// (4x on freshly allocated, our exact case).
// All codes here are < 128 (range is validated elsewhere): UTF-8 agrees with ASCII byte-for-byte.
// UTF-8 needs no ICU, so the probe only guards runtimes without TextDecoder at all (Hermes).
const asciiDecoder: { decode: (codes: Uint8Array) => string } | undefined = /* @__PURE__ */ (() => {
  try {
    const decoder = new TextDecoder();
    // Self-check on the domain we use (codes < 128): reject broken polyfills at
    // probe time instead of producing corrupted codec output later.
    return decoder.decode(Uint8Array.of(0x41, 0x30, 0x2b, 0x7f)) === 'A0+\x7f'
      ? decoder
      : undefined;
  } catch (e) {
    return undefined;
  }
})();

const B2S_CHUNK = 8192; // char codes per String.fromCharCode call, avoids arg-count limits
function charcodesToString(codes: TArg<Uint8Array>): string {
  const len = codes.length;
  // Measured crossover: the TextDecoder's per-call setup dominates below ~12 chars,
  // where String.fromCharCode wins (bech32 checksums, base58xmr blocks).
  if (asciiDecoder !== undefined && len >= 12) return asciiDecoder.decode(codes);
  if (len <= B2S_CHUNK) return String.fromCharCode.apply(null, codes as unknown as number[]);
  let res = '';
  for (let i = 0; i < len; i += B2S_CHUNK)
    res += String.fromCharCode.apply(null, codes.subarray(i, i + B2S_CHUNK) as unknown as number[]);
  return res;
}

/**
 * Linear 8 <-> bits regrouping (radix2Slow semantics), with Uint8Array digits and
 * preallocated output.
 */
function radix2(bits: number): TRet<Coder<Uint8Array, Uint8Array>> {
  anumber(bits);
  if (bits <= 0 || bits > 8) throw new RangeError('radix2: bits should be in (0..8]');
  const mask = powers[bits]! - 1;
  return {
    encode: (bytes: TArg<Uint8Array>) => {
      abytes(bytes);
      const len = bytes.length;
      // 8->bits with zero-bit padding of the last digit, like convertRadix2(padding=true)
      const res = new Uint8Array(Math.ceil((len * 8) / bits));
      let carry = 0;
      let pos = 0;
      let j = 0;
      for (let i = 0; i < len; ) {
        // At most 7 residual bits plus 24 new bits fit in the signed 32-bit carry.
        if (i + 2 < len) {
          carry = (carry << 24) | (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
          pos += 24;
          i += 3;
        } else {
          // Constant mask instead of convertRadix2's exact powers[pos]-1 cleanup: with
          // bits <= 8 the residual is pos <= 7 bits, so carry needs at most pos + 8 <= 15
          // meaningful bits. Stale bits in [pos, 16) shift to >= bits on extraction and
          // are removed by `& mask` there and in the tail below.
          carry = ((carry << 8) | bytes[i]!) & 0xffff;
          pos += 8;
          i++;
        }
        // Each input adds at least `bits`, so the first extraction is unconditional.
        for (;;) {
          pos -= bits;
          res[j++] = (carry >> pos) & mask;
          if (pos < bits) break;
        }
      }
      if (pos > 0) res[j] = (carry << (bits - pos)) & mask;
      return res as TRet<Uint8Array>;
    },
    decode: (digits: TArg<Uint8Array>) => {
      // bits->8, strict canonical form, like convertRadix2(padding=false):
      // rejects leftover whole input words and non-zero pad bits.
      const len = digits.length;
      const res = new Uint8Array(Math.floor((len * bits) / 8));
      let carry = 0;
      let pos = 0;
      let j = 0;
      for (let i = 0; i < len; i++) {
        // Same constant-mask carry bound as encode: pos <= 7 residual plus bits <= 8
        // incoming keeps meaningful carry within 15 bits; stale bits above pos are
        // masked out on extraction and in the tail check below.
        carry = ((carry << bits) | digits[i]!) & 0xffff;
        pos += bits;
        for (; pos >= 8; pos -= 8) res[j++] = (carry >> (pos - 8)) & 0xff;
      }
      carry = (carry << (8 - pos)) & 0xff;
      if (pos >= bits) throw new Error('Excess padding');
      if (carry > 0) throw new Error(`Non-zero padding: ${carry}`);
      return res as TRet<Uint8Array>;
    },
  };
}

/**
 * Digit <-> letter mapping fused with string join (chain(alphabetSlow(letters), join(''))
 * semantics), via char-code lookup tables.
 */
function alphabet(
  letters: string,
  aliases?: Record<string, string>
): TRet<Coder<Uint8Array, string>> {
  const len = letters.length;
  // Larger indexes would wrap in the Int8Array reverse table and decode to wrong digits.
  if (len > 128) throw new Error('alphabet: max 128 letters');
  const encTable = new Uint8Array(len);
  const decTable = new Int8Array(128).fill(-1);
  for (let i = 0; i < len; i++) {
    const code = letters.charCodeAt(i);
    if (letters.codePointAt(i) !== code || code > 127)
      throw new Error('alphabet: single-char ASCII letters only');
    encTable[i] = code;
    decTable[code] = i;
  }
  // Aliases decode like their canonical letter (e.g. hex case-folding), without a
  // separate normalization pass over the input string.
  if (aliases !== undefined) {
    for (const alias of Object.keys(aliases)) {
      const code = alias.charCodeAt(0);
      const target = decTable[aliases[alias]!.charCodeAt(0)];
      if (alias.length !== 1 || code > 127 || target === undefined || target === -1)
        throw new Error(`alphabet: invalid alias ${alias}`);
      decTable[code] = target;
    }
  }
  return {
    encode: (digits: TArg<Uint8Array>): string => {
      const codes = new Uint8Array(digits.length);
      for (let i = 0; i < digits.length; i++) {
        const d = digits[i]!;
        const code = encTable[d];
        // Reuse the table lookup's bounds result for the required per-digit range check.
        // Chained radix2 always emits digits < 2**bits === len; check anyway so a
        // mismatched chain throws (like alphabetSlow) instead of silently emitting letter 0.
        if (code === undefined) throw new Error(`alphabet.encode: invalid digit ${d}`);
        codes[i] = code;
      }
      return charcodesToString(codes);
    },
    decode: (input: string): TRet<Uint8Array> => {
      // Uniform label: this is the decode entry link for nopad codecs, padding for padded
      // ones. Keeps "decode: string expected" identical across all built-in codecs
      // (released 2.x said "join.decode: string expected").
      astr('decode', input);
      const slen = input.length;
      const digits = new Uint8Array(slen);
      for (let i = 0; i < slen; i++) {
        const code = input.charCodeAt(i);
        const digit = code < 128 ? decTable[code]! : -1;
        if (digit === -1) throw new Error(`Unknown letter "${input[i]}". Allowed: ${letters}`);
        digits[i] = digit;
      }
      return digits as TRet<Uint8Array>;
    },
  };
}

/**
 * Pad / unpad (paddingSlow semantics), on the joined string.
 */
function padding(bits: number, chr = '='): Coder<string, string> {
  anumber(bits);
  astr('padding', chr);
  return {
    encode(data: string): string {
      while ((data.length * bits) % 8) data += chr;
      return data;
    },
    decode(input: string): string {
      // Uniform label, see alphabet.decode above.
      astr('decode', input);
      let end = input.length;
      if ((end * bits) % 8) throw new Error('padding: invalid length');
      for (; end > 0 && input[end - 1] === chr; end--) {
        const byte = (end - 1) * bits;
        if (byte % 8 === 0) throw new Error('padding: excess padding');
      }
      return input.slice(0, end);
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
      abytes(data);
      const sum = _fn(data).slice(0, len);
      const res = new Uint8Array(data.length + len);
      res.set(data);
      res.set(sum, data.length);
      return res;
    },
    decode(data: TArg<Uint8Array>) {
      abytes(data);
      const payload = data.slice(0, -len);
      const oldChecksum = data.slice(-len);
      const newChecksum = _fn(payload).slice(0, len);
      for (let i = 0; i < len; i++)
        if (newChecksum[i] !== oldChecksum[i]) throw new Error('Invalid checksum');
      return payload;
    },
  };
}

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
export const base16: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(radix2(4), alphabet('0123456789ABCDEF'))
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
export const base32: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5))
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
export const base32nopad: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'))
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
export const base32hex: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5))
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
export const base32hexnopad: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'))
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
export const base32crockford: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(
    radix2(5),
    alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'),
    normalize((s: string) => {
      astr('base32crockford.decode', s);
      return s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
    })
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

/** base64 from RFC 4648. Padded. Pure JS version */
const base64Fallback: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(
    radix2(6),
    alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'),
    padding(6)
  )
);

/**
 * base64 from RFC 4648. Padded.
 * Alternative variants: `base64nopad`, `base64url`, `base64urlnopad`.
 * Utilizes native `Uint8Array.fromBase64` builtin, otherwise falls back to `base64fallback` when it's unavailable.
 * @example
 * ```js
 * base64.encode(Uint8Array.from([0x12, 0xab]));
 * // => 'Eqs='
 * base64.decode('Eqs=');
 * // => Uint8Array.from([0x12, 0xab])
 * ```
 */
// prettier-ignore
export const base64: BytesCoder = /* @__PURE__ */ freeze(() => hasBase64Builtin ? {
  encode(b) { abytes(b); return (b as any).toBase64(); },
  decode(s) { return decodeBase64Builtin(s, false); },
} : base64Fallback);
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
export const base64nopad: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'))
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
export const base64url: BytesCoder = /* @__PURE__ */ freeze(() => hasBase64Builtin ? {
  encode(b) { abytes(b); return (b as any).toBase64({ alphabet: 'base64url' }); },
  decode(s) { return decodeBase64Builtin(s, true); },
} : chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'),
  padding(6)
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
export const base64urlnopad: BytesCoder = /* @__PURE__ */ freeze(() =>
  chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'))
);

// base58 code
// -----------
// Base conversion 256 <-> 58 done on 16-bit limbs, five base58 digits (one divmod by
// 58**5) per pass, ~10x fewer inner-loop iterations than digit-at-a-time conversion.
// Exactness: every intermediate is a non-negative integer below 2**53, so float64
// arithmetic (including Math.floor of the quotients) is exact:
// - encode: carry * 2**16 + limb < 58**5 * 2**16 < 2**46
// - decode: limb * 58**5 + carry < 2**16 * 58**5 + 2**30 < 2**46
// Still O(n^2) overall like any positional-base conversion — see the base58 DoS note.
const B58_GROUP = 656356768; // 58**5 < 2**30; literal (not `58 ** 5`) so bundlers can drop it as dead code

const radix58: TRet<Coder<Uint8Array, Uint8Array>> = {
  encode: (bytes: TArg<Uint8Array>) => {
    abytes(bytes);
    const blen = bytes.length;
    if (blen === 0) return new Uint8Array(0) as TRet<Uint8Array>;
    // Leading zero bytes map 1:1 to leading zero digits (at most blen-1 explicit zeros;
    // an all-zero value still contributes one digit below).
    let zeros = 0;
    while (zeros < blen - 1 && bytes[zeros] === 0) zeros++;
    // Pack big-endian 16-bit limbs; odd length makes the top limb a single byte.
    const nlimbs = Math.ceil(blen / 2);
    const limbs = new Uint16Array(nlimbs);
    const odd = blen & 1;
    if (odd) limbs[0] = bytes[0]!;
    for (let i = odd, j = odd; i < blen; i += 2, j++) limbs[j] = (bytes[i]! << 8) | bytes[i + 1]!;
    // Repeated divmod by 58**5; each pass emits one 5-digit group, least significant
    // first. No carry-overflow guard like convertRadix had: that one faced arbitrary
    // caller-chosen bases, while these bounds are static and proven exact above.
    const groups: number[] = [];
    let pos = 0; // limbs before pos are known zero
    while (pos < nlimbs) {
      let carry = 0;
      for (let i = pos; i < nlimbs; i++) {
        const cur = carry * 0x10000 + limbs[i]!;
        const q = Math.floor(cur / B58_GROUP);
        carry = cur - q * B58_GROUP;
        limbs[i] = q;
        if (q === 0 && i === pos) pos++;
      }
      groups.push(carry);
    }
    // The top group is nonzero unless the whole value is zero, so total significant
    // digit count is 5 per full group plus the top group's own width. (Writing 5 digits
    // per group and trimming via subarray is smaller code, but the offset view slows
    // encode ~25% and base58xmr 2x — measured.)
    const top = groups.length - 1;
    let sig = top * 5;
    for (let v = groups[top]!; ; v = Math.floor(v / 58)) {
      sig++;
      if (v < 58) break;
    }
    const res = new Uint8Array(zeros + sig); // leading zero digits are already 0
    let j = res.length - 1;
    for (let g = 0; g < top; g++) {
      let v = groups[g]!;
      for (let k = 0; k < 5; k++) {
        res[j--] = v % 58;
        v = Math.floor(v / 58);
      }
    }
    for (let v = groups[top]!; j >= zeros; v = Math.floor(v / 58)) res[j--] = v % 58;
    return res as TRet<Uint8Array>;
  },
  decode: (digits: TArg<Uint8Array>) => {
    abytes(digits);
    const dlen = digits.length;
    if (dlen === 0) return new Uint8Array(0) as TRet<Uint8Array>;
    if (dlen >= 65536) throw new Error('invalid length');
    let zeros = 0;
    while (zeros < dlen - 1 && digits[zeros] === 0) zeros++;
    // Multiply-accumulate 16-bit limbs (little-endian, `used` live) group by group,
    // most significant group first; the first group may be shorter than 5 digits, and
    // its 58**group factor falls out of the digit fold.
    const limbs = new Uint16Array(Math.ceil((dlen * 6) / 16) + 1);
    let used = 0;
    let i = 0;
    let group = dlen % 5 || 5;
    while (i < dlen) {
      let gval = 0;
      let factor = 1;
      for (const end = i + group; i < end; i++) {
        const d = digits[i]!;
        // Unreachable through the public chain (alphabet emits digits < 58); guards
        // internal misuse from silently corrupting output.
        if (d >= 58) throw new Error(`invalid integer: ${d}`);
        gval = gval * 58 + d;
        factor *= 58;
      }
      group = 5;
      let carry = gval;
      for (let k = 0; k < used; k++) {
        const cur = limbs[k]! * factor + carry;
        carry = Math.floor(cur / 0x10000);
        limbs[k] = cur - carry * 0x10000;
      }
      for (; carry > 0; carry = Math.floor(carry / 0x10000)) limbs[used++] = carry % 0x10000;
    }
    // used === 0 means the value is zero: it still contributes one byte, like a lone
    // zero digit does.
    const valueBytes = used === 0 ? 1 : used * 2 - (limbs[used - 1]! < 256 ? 1 : 0);
    const res = new Uint8Array(zeros + valueBytes); // leading zero bytes are already 0
    let j = res.length - 1;
    for (let k = 0; k < used; k++) {
      const limb = limbs[k]!;
      res[j--] = limb & 0xff;
      if (j >= zeros) res[j--] = limb >> 8;
    }
    return res as TRet<Uint8Array>;
  },
};

const genBase58 = (abc: string) => chain(radix58, alphabet(abc));

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
export const base58: BytesCoder = /* @__PURE__ */ freeze(() =>
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
export const base58flickr: BytesCoder = /* @__PURE__ */ freeze(() =>
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
export const base58xrp: BytesCoder = /* @__PURE__ */ freeze(() =>
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
export const base58xmr: BytesCoder = /* @__PURE__ */ freeze(() => ({
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
    const strLen = str.length;
    // Only the last block may be short, and only to one of the XMR_BLOCK_LEN widths —
    // so the output length is known up front and blocks write into place. Growing a
    // number[] via concat per block was quadratic; this keeps decode linear like the
    // block encoding always intended.
    const tailChars = strLen % 11;
    const tailBytes = tailChars === 0 ? 0 : XMR_BLOCK_LEN.indexOf(tailChars);
    if (tailBytes === -1) throw new Error(`base58xmr: invalid block length ${tailChars}`);
    const res = new Uint8Array(Math.floor(strLen / 11) * 8 + tailBytes);
    let w = 0;
    for (let i = 0; i < strLen; i += 11) {
      const slice = str.slice(i, i + 11);
      const blockLen = slice.length === 11 ? 8 : tailBytes;
      const block = base58.decode(slice);
      for (let j = 0; j < block.length - blockLen; j++) {
        if (block[j] !== 0) throw new Error('base58xmr: wrong padding');
      }
      for (let j = block.length - blockLen; j < block.length; j++) res[w++] = block[j]!;
    }
    return res;
  },
}));

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

// BIP 173 character table.
// Callers adapt the public number[] words API to Uint8Array at the edges (wordsToU8 below):
// feeding number[] into alphabet.encode would work at runtime, but it turns the shared
// hot loop polymorphic and measurably slows the RFC 4648 codecs using the same literal.
const BECH_ALPHABET: Coder<Uint8Array, string> = /* @__PURE__ */ alphabet(
  'qpzry9x8gf2tvdw0s3jn54khce6mua7l'
);

// Range-checks while packing: a plain copy would silently wrap out-of-range words
// (256 -> 0 would encode to a valid letter). Same message the old slow alphabet threw.
function wordsToU8(words: number[]): Uint8Array {
  const len = words.length;
  const res = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const w = words[i]!;
    if (w < 0 || w >= 32) throw new Error(`alphabet.encode: invalid digit ${w}`);
    res[i] = w;
  }
  return res;
}

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
  const sum = new Uint8Array(6);
  for (let i = 0; i < 6; i++) sum[i] = (chk >>> (5 * (5 - i))) & 31;
  return BECH_ALPHABET.encode(sum);
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
function genBech32(encoding: 'bech32' | 'bech32m'): TRet<Bech32> {
  // BIP 173 uses final xor constant 1; BIP 350 swaps in 0x2bc830a3 for Bech32m.
  const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
  // Public API words are number[], so adapt the fast radix2's Uint8Array protocol at the edge.
  const _words = radix2(5);
  const toWords = (from: TArg<Uint8Array>): number[] => {
    abytes(from);
    // Dedicated 8->5 regrouping (radix2(5).encode semantics) writing the public number[]
    // directly; encode-into-Uint8Array plus a copy loop measurably regressed this hot path.
    const len = from.length;
    const res = new Array<number>(Math.ceil((len * 8) / 5));
    let carry = 0;
    let pos = 0;
    let j = 0;
    for (let i = 0; i < len; i++) {
      // No carry cleanup needed: stale bits sit above pos and every extraction (including
      // the tail below) masks with `& 31`, so they never reach the output. Masking carry
      // here measurably slowed the loop.
      carry = (carry << 8) | from[i]!;
      pos += 8;
      for (; pos >= 5; pos -= 5) res[j++] = (carry >> (pos - 5)) & 31;
    }
    if (pos > 0) res[j] = (carry << (5 - pos)) & 31;
    return res;
  };
  const fromWords = (to: number[]): TRet<Uint8Array> => {
    anumArr('radix2.decode', to);
    // Range-check while packing into the byte buffer: a plain copy would silently
    // truncate out-of-range words. Rejecting negatives is a deliberate fix — the old
    // convertRadix2 path silently corrupted output for them.
    const len = to.length;
    const digits = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const w = to[i]!;
      if (w < 0 || w >= 32) throw new Error(`convertRadix2: invalid word=${w}`);
      digits[i] = w;
    }
    return _words.decode(digits) as TRet<Uint8Array>;
  };
  const fromWordsUnsafe = unsafeWrapper(fromWords);

  function encode<Prefix extends string>(
    prefix: Prefix,
    words: TArg<number[] | Uint8Array>,
    limit: number | false = 90
  ): `${Lowercase<Prefix>}1${string}` {
    astr('bech32.encode prefix', prefix);
    if (limit !== false) anumber(limit, 'limit');
    if (isBytes(words)) words = u8ToNumArr(words);
    anumArr('bech32.encode', words);
    const plen = prefix.length;
    if (plen === 0) throw new TypeError(`Invalid prefix length ${plen}`);
    // Total output is hrp + `1` separator + payload words + 6 checksum chars.
    const actualLength = plen + 7 + words.length;
    if (limit !== false && actualLength > limit)
      throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
    const lowered = prefix.toLowerCase();
    const sum = bechChecksum(lowered, words, ENCODING_CONST);
    return `${lowered}1${BECH_ALPHABET.encode(wordsToU8(words))}${sum}` as `${Lowercase<Prefix>}1${string}`;
  }

  function decode<Prefix extends string>(
    str: `${Prefix}1${string}`,
    limit?: number | false
  ): Bech32Decoded<Prefix>;
  function decode(str: string, limit?: number | false): Bech32Decoded;
  function decode(str: string, limit: number | false = 90): Bech32Decoded {
    astr('bech32.decode input', str);
    if (limit !== false) anumber(limit, 'limit');
    const slen = str.length;
    // Minimum length is 1-char hrp + `1` separator + 6-char checksum.
    if (slen < 8 || (limit !== false && slen > limit))
      throw new TypeError(`invalid string length ${slen}, expected (8..${limit})`);
    // don't allow mixed case
    const lowered = str.toLowerCase();
    if (str !== lowered && str !== str.toUpperCase())
      throw new Error(`mixed-case string not allowed`);
    const sepIndex = lowered.lastIndexOf('1');
    if (sepIndex === 0 || sepIndex === -1) throw new Error(`invalid separator "1"`);
    const prefix = lowered.slice(0, sepIndex);
    const data = lowered.slice(sepIndex + 1);
    if (data.length < 6) throw new Error('invalid data length');
    const digits = BECH_ALPHABET.decode(data);
    const words = u8ToNumArr(digits, digits.length - 6);
    const sum = bechChecksum(prefix, words, ENCODING_CONST);
    if (!data.endsWith(sum)) throw new Error(`Invalid checksum in ${str}`);
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
export const bech32: TRet<Bech32> = /* @__PURE__ */ freeze(() => genBech32('bech32'));

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
export const bech32m: TRet<Bech32> = /* @__PURE__ */ freeze(() => genBech32('bech32m'));

/**
 * ASCII-to-byte decoder. Rejects non-ASCII text and bytes instead of doing UTF-8 replacement.
 * Method names follow `BytesCoder`, so `encode(bytes)` returns a string and `decode(string)` returns bytes.
 * @example
 * ```js
 * const b = ascii.decode("ABC"); // => new Uint8Array([ 65, 66, 67 ])
 * const str = ascii.encode(b); // "ABC"
 * ```
 */
export const ascii: TRet<BytesCoder> = /* @__PURE__ */ freeze(() => ({
  encode(data: TArg<Uint8Array>) {
    abytes(data);
    for (let i = 0; i < data.length; i++) {
      const byte = data[i]!;
      // ASCII is 7-bit; reject bytes outside 0x00..0x7f instead of silently widening to
      // Latin-1/UTF-8. Validating up front keeps the error position exact while the
      // string itself is built in bulk (~3x faster at 1KB than per-char concat).
      if (byte > 127) throw new RangeError(`non-ASCII byte ${byte} at ${i}`);
    }
    return charcodesToString(data);
  },
  decode(str: string) {
    if (typeof str !== 'string') throw new TypeError('ascii string expected, got ' + typeof str);
    const res = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      // Indexed access is much faster than Uint8Array.from(str, mapFn) here and keeps
      // exact error positions.
      const charCode = str.charCodeAt(i);
      if (charCode > 127) throw new RangeError(`non-ASCII char "${str[i]}" (${charCode}) at ${i}`);
      res[i] = charCode;
    }
    return res;
  },
}));

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
const utf8err = (i: number) => new TypeError(`invalid utf8 at byte ${i}`);
const utf8Fallback: BytesCoder = /* @__PURE__ */ freeze(() => ({
  encode(data: TArg<Uint8Array>) {
    abytes(data);
    let res = '';
    for (let i = 0; i < data.length; ) {
      const a = data[i++]!;
      if (a < 0b1000_0000) {
        res += String.fromCharCode(a);
        continue;
      }
      if (a < 0b1100_0010 || i >= data.length) throw utf8err(i - 1);
      const b = data[i++]!;
      if ((b & 0b1100_0000) !== 0b1000_0000) throw utf8err(i - 1);
      let cp = ((a & 0b0001_1111) << 6) | (b & 0b0011_1111);
      if (a >= 0b1110_0000) {
        if (i >= data.length) throw utf8err(i - 1);
        const c = data[i++]!;
        if (
          (c & 0b1100_0000) !== 0b1000_0000 ||
          (a === 0b1110_0000 && b < 0b1010_0000) ||
          (a === 0xed && b >= 0b1010_0000)
        )
          throw utf8err(i - 1);
        cp = ((a & 0b0000_1111) << 12) | ((b & 0b0011_1111) << 6) | (c & 0b0011_1111);
        if (a >= 0b1111_0000) {
          if (i >= data.length) throw utf8err(i - 1);
          const d = data[i++]!;
          if (
            a > 0b1111_0100 ||
            (d & 0b1100_0000) !== 0b1000_0000 ||
            (a === 0b1111_0000 && b < 0b1001_0000) ||
            (a === 0b1111_0100 && b >= 0b1001_0000)
          )
            throw utf8err(i - 1);
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
}));

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
export const utf8: BytesCoder = /* @__PURE__ */ freeze(() => {
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
  return {
    // Select each direction once at module init, since
    // TextEncoder and TextDecoder can exist independently.
    encode: typeof TextDecoder === 'function' ? utf8Builtin.encode : utf8Fallback.encode,
    decode: typeof TextEncoder === 'function' ? utf8Builtin.decode : utf8Fallback.decode,
  };
});
// Keep internal parity probes behind a test-only export.
export const __TESTS: {
  alphabet: typeof alphabet;
  base64Fallback: BytesCoder;
  radix2: typeof radix2;
  radix58: typeof radix58;
  checksum: typeof checksum;
  utf8Fallback: BytesCoder;
  _isWellFormedShim: (str: string) => boolean;
} = /* @__PURE__ */ freeze(() => ({
  alphabet: alphabet,
  base64Fallback: base64Fallback,
  radix2: radix2,
  radix58: radix58,
  checksum: checksum,
  utf8Fallback: utf8Fallback,
  _isWellFormedShim: _isWellFormedShim,
}));

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
export const hex: BytesCoder = /* @__PURE__ */ freeze(() =>
  hasHexBuiltin
    ? hexBuiltin
    : chain(
        radix2(4),
        // Case-insensitive decode via table aliases instead of a toLowerCase pass.
        alphabet('0123456789abcdef', { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e', F: 'f' }),
        normalize((s: string) => {
          // astr first: same non-string message as the native path, and no `s.length`
          // access on null / undefined while building the error.
          astr('hex', s);
          if (s.length % 2 !== 0)
            throw new TypeError(`hex.decode: odd-length string (${s.length})`);
          return s;
        })
      )
);
