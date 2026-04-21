import { should } from '@paulmillr/jsbt/test.js';
import fc from 'fast-check';
import { deepStrictEqual as eql, throws } from 'node:assert';
import { __TESTS, utf8 } from '../index.ts';

const { utf8Fallback, _isWellFormedShim } = __TESTS;
// Unicode scalar values exclude surrogate code points; fromCodePoint(0xd800) would create malformed input.
const scalar = fc.oneof(
  fc.integer({ min: 0, max: 0xd7ff }),
  fc.integer({ min: 0xe000, max: 0x10ffff })
);
const validString = fc.array(scalar, { maxLength: 64 }).map((arr) => String.fromCodePoint(...arr));
const filler = fc.array(scalar, { maxLength: 16 }).map((arr) => String.fromCodePoint(...arr));
const hi = fc.integer({ min: 0xd800, max: 0xdbff }).map((c) => String.fromCharCode(c));
const lo = fc.integer({ min: 0xdc00, max: 0xdfff }).map((c) => String.fromCharCode(c));
const malformedString = fc.oneof(
  fc.tuple(filler, hi).map(([a, b]) => a + b),
  fc.tuple(filler, lo).map(([a, b]) => a + b),
  fc.tuple(filler, hi, filler).map(([a, b, c]) => a + b + c),
  fc.tuple(filler, lo, filler).map(([a, b, c]) => a + b + c)
);
const invalidSeed = fc.constantFrom(
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
const invalidBytes = fc
  .tuple(validString, invalidSeed, validString)
  .map(([a, b, c]) => Uint8Array.from([...utf8.decode(a), ...b, ...utf8.decode(c)]));
const utf16String = fc
  .array(fc.integer({ min: 0, max: 0xffff }), { maxLength: 128 })
  .map((arr) => arr.map((c) => String.fromCharCode(c)).join(''));
const isWellFormedUri = (str: string): boolean => {
  try {
    return encodeURI(str) !== null;
  } catch {
    return false;
  }
};

should('utf8 fuzz: valid strings', () =>
  fc.assert(
    fc.property(validString, (str) => {
      const bytes = utf8.decode(str);
      eql(utf8Fallback.decode(str), bytes);
      eql(utf8Fallback.encode(bytes), str);
      eql(utf8Fallback.encode(bytes), utf8.encode(bytes));
    }),
    { numRuns: 10000 }
  )
);

should('utf8 fuzz: invalid bytes', () =>
  fc.assert(
    fc.property(invalidBytes, (bytes) => {
      throws(() => utf8.encode(bytes), TypeError);
      throws(() => utf8Fallback.encode(bytes), TypeError);
    }),
    { numRuns: 10000 }
  )
);

should('utf8 fuzz: malformed strings', () =>
  fc.assert(
    fc.property(malformedString, (str) => {
      throws(() => utf8.decode(str), TypeError);
      throws(() => utf8Fallback.decode(str), TypeError);
    }),
    { numRuns: 10000 }
  )
);

should('_isWellFormedShim fuzz: parity with native isWellFormed', () => {
  if (typeof ''.isWellFormed !== 'function') return;
  fc.assert(
    fc.property(utf16String, (str) => {
      eql(_isWellFormedShim(str), str.isWellFormed());
    }),
    { numRuns: 20000 }
  );
});

should('encodeURI well-formed check fuzz: parity with native isWellFormed', () => {
  if (typeof ''.isWellFormed !== 'function') return;
  fc.assert(
    fc.property(utf16String, (str) => {
      eql(isWellFormedUri(str), str.isWellFormed());
    }),
    { numRuns: 20000 }
  );
});

should.runWhen(import.meta.url);
