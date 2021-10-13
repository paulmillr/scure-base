const assert = require('assert');
const { should } = require('micro-should');
const { bech32, bech32m } = require('..');

const BECH32_VALID = [
  { string: 'A12UEL5L', prefix: 'A', words: [] },
  {
    string:
      'an83characterlonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1tt5tgs',
    prefix: 'an83characterlonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio',
    words: [],
  },
  {
    string: 'abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw',
    prefix: 'abcdef',
    words: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31,
    ],
  },
  {
    string:
      '11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8247j',
    prefix: '1',
    words: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    string: 'split1checkupstagehandshakeupstreamerranterredcaperred2y9e3w',
    prefix: 'split',
    words: [
      24, 23, 25, 24, 22, 28, 1, 16, 11, 29, 8, 25, 23, 29, 19, 13, 16, 23, 29, 22, 25, 28, 1, 16,
      11, 3, 25, 29, 27, 25, 3, 3, 29, 19, 11, 25, 3, 3, 25, 13, 24, 29, 1, 25, 3, 3, 25, 13,
    ],
  },
  {
    string:
      '11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq978ear',
    prefix: '1',
    words: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    limit: 300,
  },
];

const BECH32_INVALID_DECODE = [
  'A12Uel5l',
  ' 1nwldj5',
  'abc1rzg',
  'an84characterslonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1569pvx',
  'x1b4n0q5v',
  '1pzry9x0s0muk',
  'pzry9x0s0muk',
  'abc1rzgt4',
  's1vcsyn',
  '11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8247j',
  'li1dgmt3',
  Buffer.from('6465316c67377774ff', 'hex').toString('binary'),
];

const BECH32_INVALID_ENCODE = [
  {
    prefix: 'abc',
    words: [128],
  },
  {
    prefix:
      'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzfoobarfoobar',
    words: [128],
  },
  {
    prefix: 'foobar',
    words: [
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    ],
  },
  {
    prefix:
      'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzfoobarfoobarfoobarfoobar',
    words: [128],
    limit: 104,
  },
];

const BECH32M_VALID = [
  {
    string: 'A1LQFN3A',
    prefix: 'A',
    words: [],
  },
  {
    string: 'a1lqfn3a',
    prefix: 'a',
    words: [],
  },
  {
    string:
      'an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11sg7hg6',
    prefix: 'an83characterlonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber1',
    words: [],
  },
  {
    string: 'abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx',
    prefix: 'abcdef',
    words: [
      31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8,
      7, 6, 5, 4, 3, 2, 1, 0,
    ],
  },
  {
    string:
      '11llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllludsr8',
    prefix: '1',
    words: [
      31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31,
      31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31,
      31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31,
      31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31,
    ],
  },
  {
    string: 'split1checkupstagehandshakeupstreamerranterredcaperredlc445v',
    prefix: 'split',
    words: [
      24, 23, 25, 24, 22, 28, 1, 16, 11, 29, 8, 25, 23, 29, 19, 13, 16, 23, 29, 22, 25, 28, 1, 16,
      11, 3, 25, 29, 27, 25, 3, 3, 29, 19, 11, 25, 3, 3, 25, 13, 24, 29, 1, 25, 3, 3, 25, 13,
    ],
  },
  {
    string: '?1v759aa',
    prefix: '?',
    words: [],
  },
  {
    string:
      '11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqszh4cp',
    prefix: '1',
    words: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    limit: 300,
  },
];

const BECH32M_INVALID_DECODE = [
  'A1LQfN3A',
  ' 1xj0phk',
  'abc1rzg',
  'an84characterslonghumanreadablepartthatcontainsthetheexcludedcharactersbioandnumber11d6pts4',
  'qyrz8wqd2c9m',
  '1qyrz8wqd2c9m',
  'y1b0jsk6g',
  'lt1igcx5c0',
  'in1muywd',
  'mm1crxm3i',
  'au1s5cgom',
  'M1VUXWEZ',
  '16plkw9',
  '1p2gdwpf',
  '11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8247j',
  'in1muywd',
  Buffer.from('6465316c67377774ff', 'hex').toString('binary'),
];

const BECH32M_INVALID_ENCODE = [
  {
    prefix: 'abc',
    words: [128],
  },
  {
    prefix:
      'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzfoobarfoobar',
    words: [128],
  },
  {
    prefix: 'foobar',
    words: [
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
      20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    ],
  },
  {
    prefix:
      'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzfoobarfoobarfoobarfoobar',
    words: [128],
    limit: 104,
  },
];

const INVALID_WORDS = [
  [14, 20, 15, 7, 13, 26, 0, 25, 18, 6, 11, 13, 8, 21, 4, 20, 3, 17, 2, 29, 3, 0],
  [
    3, 1, 17, 17, 8, 15, 0, 20, 24, 20, 11, 6, 16, 1, 5, 29, 3, 4, 16, 3, 6, 21, 22, 26, 2, 13, 22,
    9, 16, 21, 19, 24, 25, 21, 6, 18, 15, 8, 13, 24, 24, 24, 25, 9, 12, 1, 4, 16, 6, 9, 17, 1,
  ],
];

const VALID_WORDS = [
  {
    hex: '00443214c74254b635cf84653a56d7c675be77df',
    words: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31,
    ],
  },
  {
    hex: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    words: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    hex: 'c5f38b70305f519bf66d85fb6cf03058f3dde463ecd7918f2dc743918f2d',
    words: [
      24, 23, 25, 24, 22, 28, 1, 16, 11, 29, 8, 25, 23, 29, 19, 13, 16, 23, 29, 22, 25, 28, 1, 16,
      11, 3, 25, 29, 27, 25, 3, 3, 29, 19, 11, 25, 3, 3, 25, 13, 24, 29, 1, 25, 3, 3, 25, 13,
    ],
  },
  {
    hex: 'ffbbcdeb38bdab49ca307b9ac5a928398a418820',
    words: [
      31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8,
      7, 6, 5, 4, 3, 2, 1, 0,
    ],
  },
  {
    hex: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    words: [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
];

for (let v of BECH32M_VALID) {
  should(`encode ${v.prefix} ${v.words}`, () => {
    assert.deepStrictEqual(bech32m.encode(v.prefix, v.words, v.limit), v.string.toLowerCase());
  });
  should(`encode/decode ${v.prefix} ${v.words}`, () => {
    const expected = { prefix: v.prefix.toLowerCase(), words: v.words };
    assert.deepStrictEqual(
      bech32m.decode(bech32m.encode(v.prefix, v.words, v.limit), v.limit),
      expected
    );
  });
  should(`decode ${v.string}`, () => {
    const expected = { prefix: v.prefix.toLowerCase(), words: v.words };
    assert.deepStrictEqual(bech32m.decodeUnsafe(v.string, v.limit), expected);
    assert.deepStrictEqual(bech32m.decode(v.string, v.limit), expected);
  });
  should(`throw on ${v.string} with 1 bit flipped`, () => {
    const buffer = Buffer.from(v.string, 'utf8');
    buffer[v.string.lastIndexOf('1') + 1] ^= 0x1; // flip a bit, after the prefix
    const str = buffer.toString('utf8');
    assert.deepStrictEqual(bech32m.decodeUnsafe(str, v.limit), undefined);
    assert.throws(() => bech32m.decode(str, v.limit));
  });
  should(`throw on bech32m vector with bech32 ${v.string} `, () => {
    assert.deepStrictEqual(bech32.decodeUnsafe(v.string, v.limit), undefined);
    assert.throws(() => bech32.decode(v.string, v.limit));
  });
}

for (let v of BECH32_VALID) {
  should(`encode ${v.prefix} ${v.words}`, () => {
    assert.deepStrictEqual(bech32.encode(v.prefix, v.words, v.limit), v.string.toLowerCase());
  });
  should(`encode/decode ${v.prefix} ${v.words}`, () => {
    const expected = { prefix: v.prefix.toLowerCase(), words: v.words };
    assert.deepStrictEqual(
      bech32.decode(bech32.encode(v.prefix, v.words, v.limit), v.limit),
      expected
    );
  });
  should(`decode ${v.string}`, () => {
    const expected = { prefix: v.prefix.toLowerCase(), words: v.words };
    assert.deepStrictEqual(bech32.decodeUnsafe(v.string, v.limit), expected);
    assert.deepStrictEqual(bech32.decode(v.string, v.limit), expected);
  });
  should(`throw on ${v.string} with 1 bit flipped`, () => {
    const buffer = Buffer.from(v.string, 'utf8');
    buffer[v.string.lastIndexOf('1') + 1] ^= 0x1; // flip a bit, after the prefix
    const str = buffer.toString('utf8');
    assert.deepStrictEqual(bech32.decodeUnsafe(str, v.limit), undefined);
    assert.throws(() => bech32.decode(str, v.limit));
  });
  should(`throw on bech32 vector with bech32m ${v.string} `, () => {
    assert.deepStrictEqual(bech32m.decodeUnsafe(v.string, v.limit), undefined);
    assert.throws(() => bech32m.decode(v.string, v.limit));
  });
}

for (const str of BECH32_INVALID_DECODE) {
  should(`throw on decode ${str}`, () => {
    assert.deepStrictEqual(bech32.decodeUnsafe(str), undefined);
    assert.throws(() => bech32.decode(str));
  });
}

for (let v of BECH32_INVALID_ENCODE) {
  should(`throw on encode`, () => {
    assert.throws(() => bech32.encode(v.prefix, v.words, v.limit));
  });
}

for (const str of BECH32M_INVALID_DECODE) {
  should(`throw on decode ${str} (bech32m)`, () => {
    assert.deepStrictEqual(bech32m.decodeUnsafe(str), undefined);
    assert.throws(() => bech32m.decode(str));
  });
}

for (let v of BECH32M_INVALID_ENCODE) {
  should(`throw on encode`, () => {
    assert.throws(() => bech32m.encode(v.prefix, v.words, v.limit));
  });
}

for (let v of VALID_WORDS) {
  should(`fromWords/toWords ${v.hex}`, () => {
    const words = bech32.toWords(Buffer.from(v.hex, 'hex'));
    assert.deepStrictEqual(Array.from(words), Array.from(v.words));
    const bytes = Buffer.from(bech32.fromWords(v.words));
    assert.deepStrictEqual(bytes.toString('hex'), v.hex);
    const bytes2 = Buffer.from(bech32.fromWordsUnsafe(v.words));
    assert.deepStrictEqual(bytes2.toString('hex'), v.hex);
  });
}

for (let v of INVALID_WORDS) {
  should(`throw om fromWords`, () => {
    assert.deepStrictEqual(bech32.fromWordsUnsafe(v), undefined);
    assert.throws(() => bech32.fromWords(v));
  });
}

should('toWords/toWordsUnsafe accept Uint8Array', () => {
  const bytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0xff]);
  const words = bech32.toWords(bytes);
  assert.deepStrictEqual(words, [0, 0, 8, 18, 4, 12, 31, 31]);
});

if (require.main === module) should.run();
