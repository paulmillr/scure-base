/**
 * Reference ("slow") implementations, extracted verbatim from index.ts when the library
 * moved to the fast-path links exclusively. They are kept here as the semantic baseline:
 * differential tests compare the shipped fast codecs against chains built from these.
 * Do not "improve" them — their value is that they are the audited originals.
 */
import type { Coder } from '../index.ts';

// Assert helpers (copies of the private ones in index.ts)
function isBytes(a: unknown): a is Uint8Array {
  return (
    a instanceof Uint8Array ||
    (ArrayBuffer.isView(a) &&
      a.constructor.name === 'Uint8Array' &&
      'BYTES_PER_ELEMENT' in a &&
      a.BYTES_PER_ELEMENT === 1)
  );
}
function abytes(b: Uint8Array | undefined): void {
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
function astr(label: string, input: unknown): input is string {
  if (typeof input !== 'string') throw new TypeError(`${label}: string expected`);
  return true;
}
function anumber(n: number, title = 'number'): void {
  if (typeof n !== 'number') throw new TypeError(`${title}: expected number, got ${typeof n}`);
  if (!Number.isSafeInteger(n)) throw new RangeError(`${title}: expected safe integer, got ${n}`);
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

type ChainT = [Coder<any, any>, ...Coder<any, any>[]];
/** Copy of index.ts chain(): composes encodes forward, decodes backward. */
export function chain(...args: ChainT): Coder<any, any> {
  const id = (a: any) => a;
  const wrap = (a: any, b: any) => (c: any) => a(b(c));
  const encode = args.map((x) => x.encode).reduceRight(wrap, id);
  const decode = args.map((x) => x.decode).reduce(wrap, id);
  return { encode, decode };
}

/**
 * Encodes integer radix representation to array of strings using alphabet and back.
 * Supports multi-char letters (like BIP-39 wordlists) and any digit range.
 */
export function alphabetSlow(letters: string | string[]): Coder<number[], string[]> {
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
          throw new Error(`alphabet.encode: invalid digit ${i}`);
        return lettersA[i]!;
      });
    },
    decode: (input: string[]): number[] => {
      aArr(input);
      return input.map((letter) => {
        astr('alphabet.decode', letter);
        const i = indexes.get(letter);
        if (i === undefined) throw new Error(`Unknown letter "${letter}". Allowed: ${letters}`);
        return i;
      });
    },
  };
}

export function join(separator = ''): Coder<string[], string> {
  astr('join', separator);
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

/** Pad strings array so it has integer number of bits. */
export function paddingSlow(bits: number, chr = '='): Coder<string[], string[]> {
  anumber(bits);
  astr('padding', chr);
  return {
    encode(data: string[]): string[] {
      astrArr('padding.encode', data);
      while ((data.length * bits) % 8) data.push(chr);
      return data;
    },
    decode(input: string[]): string[] {
      astrArr('padding.decode', input);
      let end = input.length;
      if ((end * bits) % 8) throw new Error('padding: invalid length');
      for (; end > 0 && input[end - 1] === chr; end--) {
        const last = end - 1;
        const byte = last * bits;
        if (byte % 8 === 0) throw new Error('padding: excess padding');
      }
      return input.slice(0, end);
    },
  };
}

/**
 * Slow: O(n^2) time complexity
 */
export function convertRadix(data: number[], from: number, to: number): number[] {
  // base 1 is impossible
  if (from < 2) throw new RangeError(`convertRadix: invalid from=${from}`);
  if (to < 2) throw new RangeError(`convertRadix: invalid to=${to}`);
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
  for (let i = 0; i < data.length - 1 && data[i] === 0; i++) res.push(0);
  return res.reverse();
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const radix2carry = (from: number, to: number) => from + (to - gcd(from, to));
const powers: number[] = (() => {
  let res = [];
  for (let i = 0; i < 40; i++) res.push(2 ** i);
  return res;
})();
/**
 * Implemented with numbers, because BigInt is 5x slower
 */
export function convertRadix2(data: number[], from: number, to: number, padding: boolean): number[] {
  aArr(data);
  if (from <= 0 || from > 32) throw new RangeError(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 32) throw new RangeError(`convertRadix2: wrong to=${to}`);
  if (radix2carry(from, to) > 32)
    throw new Error(`convertRadix2: carry overflow from=${from} to=${to}`);
  let carry = 0;
  let pos = 0; // bitwise position in current element
  const max = powers[from]!;
  const mask = powers[to]! - 1;
  const res: number[] = [];
  for (const n of data) {
    anumber(n);
    if (n >= max) throw new Error(`convertRadix2: invalid word=${n}`);
    carry = (carry << from) | n;
    if (pos + from > 32) throw new Error(`convertRadix2: carry overflow pos=${pos}`);
    pos += from;
    for (; pos >= to; pos -= to) res.push(((carry >> (pos - to)) & mask) >>> 0);
    const pow = powers[pos];
    if (pow === undefined) throw new Error('invalid carry');
    carry &= pow - 1; // clean carry, otherwise it will cause overflow
  }
  carry = (carry << (to - pos)) & mask;
  if (!padding && pos >= from) throw new Error('Excess padding');
  if (!padding && carry > 0) throw new Error(`Non-zero padding: ${carry}`);
  if (padding && pos > 0) res.push(carry >>> 0);
  return res;
}

/** Old number[]-digit radix link, as shipped before the Uint8Array fast-link protocol. */
export function radixSlow(num: number): Coder<Uint8Array, number[]> {
  anumber(num);
  const _256 = 2 ** 8;
  return {
    encode: (bytes: Uint8Array) => {
      abytes(bytes);
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
 * Supports bits up to 32 and number[] digits.
 */
export function radix2Slow(bits: number, revPadding = false): Coder<Uint8Array, number[]> {
  anumber(bits);
  if (bits <= 0 || bits > 32) throw new RangeError('radix2: bits should be in (0..32]');
  if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32)
    throw new RangeError('radix2: carry overflow');
  const padding = !revPadding;
  const mask = powers[bits]! - 1;
  return {
    encode: (bytes: Uint8Array): number[] => {
      abytes(bytes);
      const len = bytes.length;
      const res = new Array<number>(
        padding ? Math.ceil((len * 8) / bits) : Math.floor((len * 8) / bits)
      );
      let carry = 0;
      let pos = 0;
      let j = 0;
      for (let i = 0; i < len; i++) {
        carry = (carry << 8) | bytes[i]!;
        pos += 8;
        for (; pos >= bits; pos -= bits) res[j++] = ((carry >> (pos - bits)) & mask) >>> 0;
      }
      carry = pos > 0 ? (carry << (bits - pos)) & mask : 0;
      if (!padding && pos >= 8) throw new Error('Excess padding');
      if (!padding && carry > 0) throw new Error(`Non-zero padding: ${carry}`);
      if (padding && pos > 0) res[j] = carry >>> 0;
      return res;
    },
    decode: (digits: number[]) => {
      anumArr('radix2.decode', digits);
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    },
  };
}

/** Slow base58-style chain, as shipped before the fast-link port. */
export const genBase58Slow = (abc: string): Coder<Uint8Array, string> =>
  chain(radixSlow(58), alphabetSlow(abc), join(''));

/** Slow BIP 173 word<->char codec, as shipped before the fast-link port. */
export const BECH_ALPHABET_SLOW: Coder<number[], string> = chain(
  alphabetSlow('qpzry9x8gf2tvdw0s3jn54khce6mua7l'),
  join('')
);
