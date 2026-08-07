import { it } from '@paulmillr/jsbt/test.js';
import fc from 'fast-check';
import { deepStrictEqual as eql, throws } from 'node:assert';
import {
  base16,
  base32,
  base32nopad,
  base58,
  base58flickr,
  base58xrp,
  base64nopad,
  bech32,
  bech32m,
} from '../index.ts';
import {
  BECH_ALPHABET_SLOW,
  alphabetSlow,
  chain,
  genBase58Slow,
  join,
  paddingSlow,
  radix2Slow,
} from './slow.ts';

// Differential testing of the shipped fast codecs against the extracted slow reference
// implementations (test/slow.ts). Values must match exactly; for invalid inputs we only
// require that both sides throw — error messages were allowed to drift when the slow
// chains were removed from the library.

const FC_OPTS = { numRuns: 2048 };

type Outcome = { ok: true; value: string | Uint8Array | number[] } | { ok: false };
const outcome = (fn: () => string | Uint8Array | number[]): Outcome => {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false };
  }
};
const eqlOutcome = (a: Outcome, b: Outcome, msg: string) => {
  eql(a.ok, b.ok, msg);
  if (a.ok && b.ok) eql(a.value, b.value, msg);
};

const B58_ABC = {
  base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  base58flickr: '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
  base58xrp: 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz',
};
const B58_FAST = { base58, base58flickr, base58xrp };

it('slow parity: base58 encode', () => {
  for (const name of Object.keys(B58_ABC) as (keyof typeof B58_ABC)[]) {
    const fast = B58_FAST[name];
    const slow = genBase58Slow(B58_ABC[name]);
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 128 }), (data) => {
        eql(fast.encode(data), slow.encode(data), `${name}.encode`);
      }),
      FC_OPTS
    );
    // Leading-zero handling
    for (const data of [[], [0], [0, 0], [0, 0, 1], [0, 255, 0]]) {
      const b = Uint8Array.from(data);
      eql(fast.encode(b), slow.encode(b), `${name}.encode zeros [${data}]`);
    }
  }
});

it('slow parity: base58 decode', () => {
  for (const name of Object.keys(B58_ABC) as (keyof typeof B58_ABC)[]) {
    const fast = B58_FAST[name];
    const abc = B58_ABC[name];
    const slow = genBase58Slow(abc);
    // Valid strings, plus mutations that inject arbitrary chars (often outside the alphabet)
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 64 }),
        fc.nat(70),
        fc.integer({ min: 0, max: 0x7e }),
        (data, pos, code) => {
          const valid = slow.encode(data);
          eql(fast.decode(valid), slow.decode(valid), `${name}.decode valid`);
          const mutated = valid.slice(0, pos) + String.fromCharCode(code) + valid.slice(pos + 1);
          eqlOutcome(
            outcome(() => fast.decode(mutated)),
            outcome(() => slow.decode(mutated)),
            `${name}.decode mutated "${mutated}"`
          );
        }
      ),
      FC_OPTS
    );
    throws(() => fast.decode(1 as any), TypeError);
    // Unknown-letter error message is preserved verbatim
    const bad = abc.includes('l') ? 'I' : 'l';
    throws(() => fast.decode(bad), new RegExp(`Unknown letter "${bad}"`));
  }
});

it('slow parity: base58 limb/group boundaries', () => {
  // The chunked conversion works in 16-bit limbs and 58**5 digit groups: exercise
  // every length residue and saturated/zero/sparse patterns around those boundaries.
  const slow = genBase58Slow(B58_ABC.base58);
  const patterns = [
    (len: number) => new Uint8Array(len).fill(0xff),
    (len: number) => new Uint8Array(len), // all zero
    (len: number) => Uint8Array.from({ length: len }, (_, i) => (i === len - 1 ? 1 : 0)),
    (len: number) => Uint8Array.from({ length: len }, (_, i) => (i === 0 ? 1 : 0)),
    (len: number) => Uint8Array.from({ length: len }, (_, i) => (i % 2 ? 0 : 0xff)),
  ];
  for (let len = 0; len <= 81; len++) {
    for (const gen of patterns) {
      const data = gen(len);
      const enc = base58.encode(data);
      eql(enc, slow.encode(data), `encode len=${len}`);
      eql(base58.decode(enc), data, `roundtrip len=${len}`);
    }
  }
  // Values around 58**5 group boundaries (top group exactly zero / one)
  for (const v of [58 ** 5 - 1, 58 ** 5, 58 ** 5 + 1, 58 ** 10 - 58 ** 5, 2 ** 32, 2 ** 48]) {
    let x = BigInt(v);
    const bytes = [];
    for (; x > 0n; x >>= 8n) bytes.unshift(Number(x & 0xffn));
    const data = Uint8Array.from(bytes);
    const enc = base58.encode(data);
    eql(enc, slow.encode(data), `encode value=${v}`);
    eql(base58.decode(enc), data, `roundtrip value=${v}`);
  }
});

it('slow parity: rfc4648 chains', () => {
  const cases = [
    { fast: base16, bits: 4, abc: '0123456789ABCDEF', pad: false },
    { fast: base32, bits: 5, abc: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', pad: true },
    { fast: base32nopad, bits: 5, abc: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', pad: false },
    {
      fast: base64nopad,
      bits: 6,
      abc: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      pad: false,
    },
  ] as const;
  for (const { fast, bits, abc, pad } of cases) {
    // paddingSlow works on string[] tokens, so it sits before join('') like the old chains did.
    const slow = pad
      ? chain(radix2Slow(bits), alphabetSlow(abc), paddingSlow(bits), join(''))
      : chain(radix2Slow(bits), alphabetSlow(abc), join(''));
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 256 }),
        fc.nat(300),
        fc.integer({ min: 0x20, max: 0x7e }),
        (data, pos, code) => {
          const enc = fast.encode(data);
          eql(enc, slow.encode(data), `encode(${bits})`);
          eql(fast.decode(enc), data, `roundtrip(${bits})`);
          const mutated = enc.slice(0, pos) + String.fromCharCode(code) + enc.slice(pos + 1);
          eqlOutcome(
            outcome(() => fast.decode(mutated)),
            outcome(() => slow.decode(mutated)),
            `decode(${bits}) mutated "${mutated}"`
          );
        }
      ),
      FC_OPTS
    );
  }
});

it('slow parity: bech32 words', () => {
  const slowWords = radix2Slow(5);
  fc.assert(
    fc.property(fc.uint8Array({ maxLength: 256 }), (data) => {
      const words = bech32.toWords(data);
      eql(words, slowWords.encode(data), 'toWords');
      eql(bech32.fromWords(words), slowWords.decode(words), 'fromWords');
    }),
    FC_OPTS
  );
  // Same canonical-padding rejections as the slow version
  fc.assert(
    fc.property(fc.array(fc.integer({ min: 0, max: 31 }), { maxLength: 64 }), (words) => {
      eqlOutcome(
        outcome(() => bech32.fromWords(words)),
        outcome(() => slowWords.decode(words)),
        `fromWords [${words}]`
      );
    }),
    FC_OPTS
  );
  // Out-of-range words throw. For negatives this is a deliberate fix: the slow version
  // silently corrupted output, so it is not differentially compared here.
  throws(() => bech32.fromWords([32]), /invalid word/);
  throws(() => bech32.fromWords([-1]), /invalid word/);
  throws(() => bech32.fromWords([1.5]), TypeError);
  throws(() => bech32.fromWords(['a'] as any), TypeError);
  throws(() => bech32.toWords('a' as any), TypeError);
});

it('slow parity: bech32 alphabet + checksum', () => {
  const words5 = fc.array(fc.integer({ min: 0, max: 31 }), { minLength: 0, maxLength: 64 });
  fc.assert(
    fc.property(words5, (words) => {
      // encode() path feeds number[] words through the fast alphabet
      const encoded = bech32.encode('bc', words, false);
      const slowPayload = BECH_ALPHABET_SLOW.encode(words);
      eql(encoded.slice('bc1'.length, 'bc1'.length + words.length), slowPayload, 'payload chars');
      const dec = bech32.decode(encoded, false);
      eql(dec.words, words, 'roundtrip words');
      const decM = bech32m.decode(bech32m.encode('tb', words, false), false);
      eql(decM.words, words, 'bech32m roundtrip words');
    }),
    FC_OPTS
  );
});

it.runWhen(import.meta.url);
