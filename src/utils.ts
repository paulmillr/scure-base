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

export function chain<T extends Chain & AsChain<T>>(
  ...args: T
): Coder<Input<First<T>>, Output<Last<T>>> {
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

export type Alphabet = string[] | string;

// Encodes integer radix representation to array of strings using alphabet and back
export function alphabet(alphabet: Alphabet): Coder<number[], string[]> {
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

export function join(separator = ''): Coder<string[], string> {
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
export function padding(bits: number, chr = '='): Coder<string[], string[]> {
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

export function normalize<T>(fn: (val: T) => T): Coder<T, T> {
  return { encode: (from: T) => from, decode: (to: T) => fn(to) };
}

// NOTE: it has quadratic time complexity
export function convertRadix(data: number[], from: number, to: number) {
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

export function convertRadix2(
  data: number[],
  from: number,
  to: number,
  padding: boolean
): number[] {
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

export function radix(num: number): Coder<Uint8Array, number[]> {
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

export function radix2(bits: number, revPadding = false): Coder<Uint8Array, number[]> {
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
export function unsafeWrapper<T extends (...args: any) => any>(fn: T) {
  return function (...args: ArgumentTypes<T>): ReturnType<T> | undefined {
    try {
      return fn.apply(null, args);
    } catch (e) {}
  };
}

export function checksum(
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
