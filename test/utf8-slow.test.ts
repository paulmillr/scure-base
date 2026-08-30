import * as random from '@paulmillr/jsbt/random.js';
import { it } from '@paulmillr/jsbt/test.js';
import { deepStrictEqual as eql, throws } from 'node:assert';
import { __TESTS, utf8 } from '../index.ts';

const { utf8Fallback, _isWellFormedShim } = __TESTS;
// Unicode scalar values exclude surrogate code points; fromCodePoint(0xd800) would create malformed input.
const scalar = random.oneof(
  random.integer({ min: 0, max: 0xd7ff }),
  random.integer({ min: 0xe000, max: 0x10ffff })
);
const validString = random
  .array(scalar, { maxLength: 64 })
  .map((arr) => String.fromCodePoint(...arr));
const filler = random.array(scalar, { maxLength: 16 }).map((arr) => String.fromCodePoint(...arr));
const hi = random.integer({ min: 0xd800, max: 0xdbff }).map((c) => String.fromCharCode(c));
const lo = random.integer({ min: 0xdc00, max: 0xdfff }).map((c) => String.fromCharCode(c));
const malformedString = random.oneof(
  random.tuple(filler, hi).map(([a, b]) => a + b),
  random.tuple(filler, lo).map(([a, b]) => a + b),
  random.tuple(filler, hi, filler).map(([a, b, c]) => a + b + c),
  random.tuple(filler, lo, filler).map(([a, b, c]) => a + b + c)
);
const invalidSeed = random.constantFrom(
  Uint8Array.of(0xff),
  Uint8Array.of(0xc0, 0x80),
  Uint8Array.of(0xe0, 0x80, 0x80),
  Uint8Array.of(0xf0, 0x80, 0x80, 0x80),
  Uint8Array.of(0xed, 0xa0, 0x80),
  Uint8Array.of(0xf4, 0x90, 0x80, 0x80),
  Uint8Array.of(0xe2, 0x28, 0xa1),
  Uint8Array.of(0xf0, 0x28, 0x8c, 0xbc),
  Uint8Array.of(0xc2),
  Uint8Array.of(0x80)
);
const invalidBytes = random
  .tuple(validString, invalidSeed, validString)
  .map(([a, b, c]) => Uint8Array.from([...utf8.decode(a), ...b, ...utf8.decode(c)]));
const utf16String = random
  .array(random.integer({ min: 0, max: 0xffff }), { maxLength: 128 })
  .map((arr) => arr.map((c) => String.fromCharCode(c)).join(''));
const isWellFormedUri = (str: string): boolean => {
  try {
    return encodeURI(str) !== null;
  } catch {
    return false;
  }
};

it('utf8 fuzz: valid strings', () =>
  random.assert(
    random.property(validString, (str) => {
      const bytes = utf8.decode(str);
      eql(utf8Fallback.decode(str), bytes);
      eql(utf8Fallback.encode(bytes), str);
      eql(utf8Fallback.encode(bytes), utf8.encode(bytes));
    }),
    { numRuns: 10000 }
  ));

it('utf8 fuzz: invalid bytes', () =>
  random.assert(
    random.property(invalidBytes, (bytes) => {
      throws(() => utf8.encode(bytes), TypeError);
      throws(() => utf8Fallback.encode(bytes), TypeError);
    }),
    { numRuns: 10000 }
  ));

it('utf8 fuzz: malformed strings', () =>
  random.assert(
    random.property(malformedString, (str) => {
      throws(() => utf8.decode(str), TypeError);
      throws(() => utf8Fallback.decode(str), TypeError);
    }),
    { numRuns: 10000 }
  ));

it('_isWellFormedShim fuzz: parity with native isWellFormed', () => {
  if (typeof ''.isWellFormed !== 'function') return;
  random.assert(
    random.property(utf16String, (str) => {
      eql(_isWellFormedShim(str), str.isWellFormed());
    }),
    { numRuns: 20000 }
  );
});

it('encodeURI well-formed check fuzz: parity with native isWellFormed', () => {
  if (typeof ''.isWellFormed !== 'function') return;
  random.assert(
    random.property(utf16String, (str) => {
      eql(isWellFormedUri(str), str.isWellFormed());
    }),
    { numRuns: 20000 }
  );
});

it.runWhen(import.meta.url);
