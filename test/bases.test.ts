import { sha256 } from '@noble/hashes/sha2.js';
import { should } from '@paulmillr/jsbt/test.js';
import { deepStrictEqual as eql, throws } from 'node:assert';
import { Buffer } from 'node:buffer';
import {
  __TESTS,
  ascii,
  base16,
  base32,
  base32crockford,
  base32hex,
  base32hexnopad,
  base32nopad,
  base58,
  base58xmr,
  base58xrp,
  base64,
  base64nopad,
  base64url,
  base64urlnopad,
  bech32,
  bech32m,
  createBase58check,
  hex,
  utf8,
} from '../index.ts';
import { alphabetSlow, convertRadix2, join, paddingSlow, radix2Slow, radixSlow } from './slow.ts';
import { json, RANDOM } from './utils.ts';

const base58check = createBase58check(sha256);
const vectors = json('./vectors/base_vectors.json').v;
const base64Fallback = __TESTS.base64Fallback;

const CODERS = {
  base32,
  base32hex,
  base32crockford,
  base64,
  base64url,
  base58,
  base58xmr,
  base58check,
  base58xrp,
};

const NODE_CODERS = {
  hex: {
    lib: hex,
    encode: (buf) => Buffer.from(buf).toString('hex'),
    decode: (str) => Buffer.from(str, 'hex'),
  },
  base64: {
    lib: base64,
    encode: (buf) => Buffer.from(buf).toString('base64'),
    decode: (str) => Buffer.from(str, 'base64'),
  },
};

for (const c in NODE_CODERS) {
  const node = NODE_CODERS[c];
  should(`${c} against node`, () => {
    for (let i = 0; i < 1024; i++) {
      const buf = RANDOM.slice(0, i);

      const nodeStr = node.encode(buf);
      eql(nodeStr, node.lib.encode(buf), '111');

      eql(
        hex.encode(node.lib.decode(nodeStr)),
        hex.encode(Uint8Array.from(node.decode(nodeStr))),
        '222'
      );
    }
  });
}

should('ascii', () => {
  const strings = [
    'H2C-OVERSIZE-DST-',
    'Seed-',
    'SigEd448',
    'SigEd25519 no Ed25519 collisions',
    'HashToGroup-',
    'DeriveKeyPair',
    'OPRFV1-',
    'SigEd448\0\0',
    '`',
  ];
  for (const s of strings) {
    const bytes = new TextEncoder().encode(s);
    eql(ascii.decode(s), bytes);
    eql(ascii.encode(bytes), s);
  }
  throws(() => ascii.decode(1 as any), TypeError);
  throws(() => ascii.encode(1 as any), TypeError);
  const UTF8 = ['┌─────', 'some 🦁 ', '\x80', 'e\u0301', '\uD83D', '\uDE00'];
  for (const s of UTF8) throws(() => ascii.decode(s), RangeError);
  const bytesOK = [
    new Uint8Array([72, 101, 108, 108, 111]),
    Uint8Array.of(0),
    Uint8Array.of(),
    new Uint8Array([127]),
  ];
  const bytesFAIL = [
    new Uint8Array([233]),
    new Uint8Array([0xff, 0xfe]),
    new Uint8Array([128]),
    new Uint8Array([0xe9]),
    new Uint8Array([0xc2]),
    new Uint8Array([0xe2, 0x82]),
    new Uint8Array([0xe2, 0x82, 0xac]),
  ];
  for (const b of bytesOK) {
    const s = new TextDecoder().decode(b);
    eql(ascii.encode(b), s);
    eql(ascii.decode(s), b);
  }
  for (const b of bytesFAIL) throws(() => ascii.encode(b), RangeError);
});

should('utf8: valid roundtrip', () => {
  const strings = [
    'hello',
    'Привет hello 世界',
    'some 🦁 ',
    '\0',
    '\x7f',
    '\u0080',
    '\u07ff',
    '\u0800',
    '\uffff',
    '\u{10000}',
    '\u{10ffff}',
    '\uD83E\uDD81',
    'a\uFEFFb',
  ];
  for (const s of strings) {
    const bytes = new TextEncoder().encode(s);
    eql(utf8.decode(s), bytes);
    eql(utf8.encode(bytes), s);
  }
});

should('utf8Fallback: fixed-case parity with utf8', () => {
  const { utf8Fallback } = __TESTS;
  const strings = [
    'hello',
    'Привет hello 世界',
    'some 🦁 ',
    '\0',
    '\x7f',
    '\u0080',
    '\u07ff',
    '\u0800',
    '\uffff',
    '\u{10000}',
    '\u{10ffff}',
    '\uD83E\uDD81',
    '\uFEFF',
    'a\uFEFFb',
    'a\uFEFF',
    '\uFEFF\uFEFFx',
  ];
  for (const s of strings) {
    const bytes = new TextEncoder().encode(s);
    eql(utf8Fallback.decode(s), utf8.decode(s));
    eql(utf8Fallback.encode(bytes), utf8.encode(bytes));
  }
  const invalidBytes = [
    Uint8Array.of(0xff),
    Uint8Array.of(0xc0, 0x80),
    Uint8Array.of(0xe0, 0x80, 0x80),
    Uint8Array.of(0xf0, 0x80, 0x80, 0x80),
    Uint8Array.of(0xed, 0xa0, 0x80),
    Uint8Array.of(0xf4, 0x90, 0x80, 0x80),
    Uint8Array.of(0xe2, 0x28, 0xa1),
    Uint8Array.of(0xc2),
    Uint8Array.of(0x80),
  ];
  for (const b of invalidBytes) {
    throws(() => utf8.encode(b), TypeError);
    throws(() => utf8Fallback.encode(b), TypeError);
  }
  const invalidStrings = [
    '\uD83D',
    '\uDE00',
    'a\uD83Db',
    'ab\uDE00',
    '\uD83D\uD83D',
    '\uDE00\uDE00',
  ];
  for (const s of invalidStrings) {
    throws(() => utf8.decode(s), TypeError);
    throws(() => utf8Fallback.decode(s), TypeError);
  }
  throws(() => utf8.encode(new Uint16Array([0x6869]) as any), TypeError);
  throws(() => utf8Fallback.encode(new Uint16Array([0x6869]) as any), TypeError);
  throws(
    () =>
      utf8.decode({
        toString() {
          throw new Error('boom');
        },
      } as any),
    TypeError
  );
  throws(
    () =>
      utf8Fallback.decode({
        toString() {
          throw new Error('boom');
        },
      } as any),
    TypeError
  );
});

should('utf8: preserve leading BOM', () => {
  const s = '\uFEFF';
  const bytes = new TextEncoder().encode(s);
  eql(utf8.decode(s), bytes);
  eql(utf8.encode(bytes), s);
});

should('utf8: preserve interior and trailing BOM', () => {
  const strings = ['a\uFEFFb', 'a\uFEFF', '\uFEFF\uFEFFx'];
  for (const s of strings) {
    const bytes = new TextEncoder().encode(s);
    eql(utf8.decode(s), bytes);
    eql(utf8.encode(bytes), s);
  }
});

should('utf8: reject invalid byte sequences', () => {
  const invalidBytes = [
    Uint8Array.of(0xff),
    Uint8Array.of(0xc0, 0x80), // overlong NUL
    Uint8Array.of(0xc0, 0xaf), // overlong '/'
    Uint8Array.of(0xe0, 0x80, 0x80), // overlong 3-byte
    Uint8Array.of(0xf0, 0x80, 0x80, 0x80), // overlong 4-byte
    Uint8Array.of(0xed, 0xa0, 0x80), // UTF-8 encoded surrogate
    Uint8Array.of(0xed, 0xbf, 0xbf), // UTF-8 encoded surrogate upper end
    Uint8Array.of(0xf4, 0x90, 0x80, 0x80), // > U+10FFFF
    Uint8Array.of(0xf8, 0x88, 0x80, 0x80, 0x80), // obsolete 5-byte start
    Uint8Array.of(0xfc, 0x84, 0x80, 0x80, 0x80, 0x80), // obsolete 6-byte start
    Uint8Array.of(0xe2, 0x28, 0xa1), // bad continuation
    Uint8Array.of(0xf0, 0x28, 0x8c, 0xbc), // bad continuation
    Uint8Array.of(0xc2), // truncated 2-byte
    Uint8Array.of(0xe0, 0xa0), // truncated 3-byte
    Uint8Array.of(0xf0, 0x90, 0x80), // truncated 4-byte
    Uint8Array.of(0xe2, 0x82), // truncated sequence
    Uint8Array.of(0x80), // lone continuation
  ];
  for (const b of invalidBytes) throws(() => utf8.encode(b), TypeError);
});

should('utf8: reject malformed JS strings', () => {
  const invalidStrings = [
    '\uD83D',
    '\uDE00',
    'a\uD83Db',
    'a\uDE00b',
    '\uD83Da',
    '\uDE00a',
    'ab\uD83D',
    'ab\uDE00',
    '\uD83D\uD83D',
    '\uDE00\uDE00',
  ];
  for (const s of invalidStrings) throws(() => utf8.decode(s), TypeError);
});

should('_isWellFormedShim: fixed cases', () => {
  const { _isWellFormedShim } = __TESTS;
  const uri = (str: string) => {
    try {
      return encodeURI(str) !== null;
    } catch {
      return false;
    }
  };
  const cases = [
    ['hello', true],
    ['A🦁B', true],
    ['\uFEFFa', true],
    ['\uD83D\uDE00', true],
    ['\uD800', false],
    ['\uDC00', false],
    ['ab\uD800', false],
    ['\uDC00\uD800', false],
    ['\uD800a', false],
  ] as const;
  for (const [str, ok] of cases) {
    eql(_isWellFormedShim(str), ok);
    eql(uri(str), ok);
  }
});

should('utf8: reject non-string input', () => {
  throws(() => utf8.decode(1 as any), TypeError);
  throws(() => utf8.decode(Symbol('x') as any), TypeError);
  throws(
    () =>
      utf8.decode({
        toString() {
          throw new Error('boom');
        },
      } as any),
    TypeError
  );
});

should('utf8: reject non-Uint8Array byte input', () => {
  throws(() => utf8.encode(new Uint16Array([0x6869]) as any), TypeError);
  throws(() => utf8.encode(new Uint8Array([0x68, 0x69]).buffer as any), TypeError);
  throws(() => utf8.encode(new DataView(Uint8Array.of(0x68, 0x69).buffer) as any), TypeError);
});

should('14335 vectors, base32/64 58/hex/url/xmr, bech32/m', () => {
  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i];
    const data = Uint8Array.from(Buffer.from(v.data, 'hex'));
    const coders = {
      base32,
      base32hex,
      base64,
      base64url,
      base58,
      base58xmr,
      bech32: {
        encode: (data) => bech32.encode('bech32', bech32.toWords(data), 9000),
        decode: (str) => bech32.fromWords(bech32.decode(str, 9000).words),
      },
      bech32m: {
        encode: (data) => bech32m.encode('bech32m', bech32m.toWords(data), 9000),
        decode: (str) => bech32m.fromWords(bech32m.decode(str, 9000).words),
      },
    };
    const coder = coders[v.fn_name];
    eql(coder.encode(data), v.exp, 'encode ' + i);
    eql(coder.decode(v.exp), data, 'decode ' + i);
    if (v.fn_name === 'base64') {
      const fcoder = base64Fallback;
      eql(fcoder.encode(data), v.exp, 'fallback encode ' + i);
      eql(fcoder.decode(v.exp), data, 'fallback decode ' + i);
    }
  }
});

const TEST_BYTES = new TextEncoder().encode('@scure/base encoding / decoding');

should('nopad variants: base32', () => {
  eql(base32nopad.encode(TEST_BYTES), 'IBZWG5LSMUXWEYLTMUQGK3TDN5SGS3THEAXSAZDFMNXWI2LOM4');
  eql(base32nopad.decode('IBZWG5LSMUXWEYLTMUQGK3TDN5SGS3THEAXSAZDFMNXWI2LOM4'), TEST_BYTES);
  eql(base32hexnopad.encode(TEST_BYTES), '81PM6TBICKNM4OBJCKG6ARJ3DTI6IRJ740NI0P35CDNM8QBECS');
  eql(base32hexnopad.decode('81PM6TBICKNM4OBJCKG6ARJ3DTI6IRJ740NI0P35CDNM8QBECS'), TEST_BYTES);
});

should('nopad variants: base64', () => {
  eql(base64nopad.encode(TEST_BYTES), 'QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw');
  eql(base64nopad.decode('QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw'), TEST_BYTES);
  eql(base64urlnopad.encode(TEST_BYTES), 'QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw');
  eql(base64urlnopad.decode('QHNjdXJlL2Jhc2UgZW5jb2RpbmcgLyBkZWNvZGluZw'), TEST_BYTES);
});

should('native base64 should ban spaces', () => {
  throws(() => {
    base64.decode('sxJ+knIJ1hI2snFHWiQEJb   qEvknAX3vUieb0K7KmcHI=');
  });
});

should('slow radix2', () => {
  const t = (bits) => {
    const coder = radix2Slow(bits);
    const val = new Uint8Array(1024).fill(0xff);
    const valPattern = Uint8Array.from({ length: 1024 }, (i, j) => j);
    eql(coder.decode(coder.encode(val)).slice(0, 1024), val, `radix2(${bits}, 0xff)`);
    eql(
      coder.decode(coder.encode(valPattern)).slice(0, 1024),
      valPattern,
      `radix2(${bits}, pattern)`
    );
  };
  throws(() => t(0));
  for (let i = 1; i < 27; i++) t(i);
  throws(() => t(27)); // 34 bits
  t(28);
  throws(() => t(29)); // 36 bits
  throws(() => t(30)); // 36 bits
  throws(() => t(31)); // 38 bits
  t(32); // ok
  // true is not a number
  throws(() => radix2Slow(4).decode([1, true, 1, 1]));
});

should('slow radix2 encode size parity', () => {
  const outcome = (fn: () => number[]) => {
    try {
      return { ok: true, value: fn() };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return { ok: false, name: error.name, message: error.message };
    }
  };
  const widths = [...Array.from({ length: 26 }, (_, i) => i + 1), 28, 32];
  // Dense short lengths cover every output-width residue cycle; larger inputs catch allocation drift.
  const sizes = [...Array.from({ length: 66 }, (_, i) => i), 1024, 4097];
  for (const bits of widths) {
    for (const revPadding of [false, true]) {
      const coder = radix2Slow(bits, revPadding);
      for (const len of sizes)
        for (const zero of [false, true]) {
          const data = Uint8Array.from(
            { length: len + 4 },
            (_, i) => (zero ? 0 : i * 197 + len) & 0xff
          ).subarray(2, len + 2);
          eql(
            outcome(() => coder.encode(data)),
            outcome(() => convertRadix2(Array.from(data), 8, bits, !revPadding))
          );
        }
    }
  }
});

should('fast radix2 encode size parity', () => {
  // The large triplet leaves zero, one, and two bytes after repeated three-byte batches.
  const sizes = [...Array.from({ length: 66 }, (_, i) => i), 4095, 4096, 4097];
  const signedTail = Uint8Array.of(0xff, 0xff, 0xff, 0, 0);
  for (let bits = 1; bits <= 8; bits++) {
    const coder = __TESTS.radix2(bits);
    for (const len of sizes) {
      const data = Uint8Array.from({ length: len + 4 }, (_, i) => (i * 197 + len) & 0xff).subarray(
        2,
        len + 2
      );
      eql(coder.encode(data), Uint8Array.from(convertRadix2(Array.from(data), 8, bits, true)));
    }
    eql(
      coder.encode(signedTail),
      Uint8Array.from(convertRadix2(Array.from(signedTail), 8, bits, true))
    );
  }

  const cases = [
    [4, '0123456789ABCDEF', base16],
    [5, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', base32nopad],
    [6, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', base64nopad],
  ] as const;
  for (const [bits, alphabet, coder] of cases) {
    for (const len of sizes) {
      const data = Uint8Array.from({ length: len + 4 }, (_, i) => (i * 197 + len) & 0xff).subarray(
        2,
        len + 2
      );
      const expected = convertRadix2(Array.from(data), 8, bits, true)
        .map((digit) => alphabet[digit])
        .join('');
      const actual = coder.encode(data);
      eql(actual, expected);
      eql(coder.decode(actual), data);
    }
  }
  throws(
    () => __TESTS.alphabet('01').encode(Uint8Array.of(0, 2)),
    /alphabet\.encode: invalid digit/
  );
});

should('slow radix', () => {
  const t = (base) => {
    const coder = radixSlow(base);
    const val = new Uint8Array(128).fill(0xff);
    const valPattern = Uint8Array.from({ length: 128 }, (i, j) => j);
    eql(coder.decode(coder.encode(val)).slice(0, 128), val, `radix(${base}, 0xff)`);
    eql(
      coder.decode(coder.encode(valPattern)).slice(0, 128),
      valPattern,
      `radix(${base}, pattern)`
    );
  };
  throws(() => t(1));
  for (let i = 1; i < 46; i++) t(2 ** i);
  for (let i = 2; i < 46; i++) t(2 ** i - 1);
  for (let i = 1; i < 46; i++) t(2 ** i + 1);
  // carry overflows here
  t(35195299949887);
  throws(() => t(35195299949887 + 1));
  throws(() => t(2 ** i));
  // true is not a number
  throws(() => radixSlow(2 ** 4).decode([1, true, 1, 1]));
});

should('slow alphabet', () => {
  const a = alphabetSlow('12345');
  const ab = alphabetSlow(['11', '2', '3', '4', '5']);
  eql(a.encode([1]), ['2']);
  eql(ab.encode([0]), ['11']);
  eql(a.encode([2]), ab.encode([2]));
  throws(() => a.encode([1, 2, true, 3]));
  throws(() => a.decode(['1', 2, true]));
  throws(() => a.decode(['1', 2]));
  throws(() => a.decode(['toString']));
});

should('slow join', () => {
  throws(() => join('1').encode(['1', 1, true]));
});

should('slow padding', () => {
  const coder = paddingSlow(4, '=');
  throws(() => coder.encode(['1', 1, true]));
  throws(() => coder.decode(['1', 1, true, '=']));
});

export { CODERS };
should.runWhen(import.meta.url);
