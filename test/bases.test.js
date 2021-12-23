const assert = require('assert');
const {
  base58,
  base58xmr,
  base58check: _base58check,
  base58xrp,
  bech32,
  bech32m,
  utils,
} = require('..');
const base58check = _base58check((buf) =>
  Uint8Array.from(require('crypto').createHash('sha256').update(buf).digest())
);
const { base32, base32hex, base32crockford, base64, base64url, str, bytes } = require('..');
const { Buffer } = require('buffer');
const { should } = require('micro-should');
const { RANDOM } = require('./utils');
const vectors = require('./vectors/base_vectors.json').v;

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
    encode: (buf) => Buffer.from(buf).toString('hex'),
    decode: (str) => Buffer.from(str, 'hex'),
  },
  base64: {
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
      assert.deepStrictEqual(nodeStr, str(c, buf));
      assert.deepStrictEqual(buf, bytes(c, nodeStr));
    }
  });
}

for (let i = 0; i < vectors.length; i++) {
  const v = vectors[i];
  const data = Uint8Array.from(Buffer.from(v.data, 'hex'));
  should(`${v.fn_name} (${i})`, () => {
    const coder = {
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
    assert.deepStrictEqual(coder[v.fn_name].encode(data), v.exp, 'encode');
    assert.deepStrictEqual(coder[v.fn_name].decode(v.exp), data, 'decode');
  });
}

should('utils: radix2', () => {
  const t = (bits) => {
    const coder = utils.radix2(bits);
    const val = new Uint8Array(1024).fill(0xff);
    const valPattern = Uint8Array.from({ length: 1024 }, (i, j) => j);
    assert.deepStrictEqual(
      coder.decode(coder.encode(val)).slice(0, 1024),
      val,
      `radix2(${bits}, 0xff)`
    );
    assert.deepStrictEqual(
      coder.decode(coder.encode(valPattern)).slice(0, 1024),
      valPattern,
      `radix2(${bits}, pattern)`
    );
  };
  assert.throws(() => t(0));
  for (let i = 1; i < 27; i++) t(i);
  assert.throws(() => t(27)); // 34 bits
  t(28);
  assert.throws(() => t(29)); // 36 bits
  assert.throws(() => t(30)); // 36 bits
  assert.throws(() => t(31)); // 38 bits
  t(32); // ok
  // true is not a number
  assert.throws(() => utils.radix2(4).decode([1, true, 1, 1]));
});

should('utils: radix', () => {
  const t = (base) => {
    const coder = utils.radix(base);
    const val = new Uint8Array(128).fill(0xff);
    const valPattern = Uint8Array.from({ length: 128 }, (i, j) => j);
    assert.deepStrictEqual(
      coder.decode(coder.encode(val)).slice(0, 128),
      val,
      `radix(${base}, 0xff)`
    );
    assert.deepStrictEqual(
      coder.decode(coder.encode(valPattern)).slice(0, 128),
      valPattern,
      `radix(${base}, pattern)`
    );
  };
  assert.throws(() => t(1));
  for (let i = 1; i < 46; i++) t(2 ** i);
  for (let i = 2; i < 46; i++) t(2 ** i - 1);
  for (let i = 1; i < 46; i++) t(2 ** i + 1);
  // carry overflows here
  t(35195299949887);
  assert.throws(() => t(35195299949887 + 1));
  for (let i = 46; i < 53; i++) assert.throws(() => t(2 ** i));
  // true is not a number
  assert.throws(() => utils.radix(2 ** 4).decode([1, true, 1, 1]));
});

should('utils: alphabet', () => {
  const a = utils.alphabet('12345');
  assert.throws(() => a.encode([1, 2, true, 3]));
  assert.throws(() => a.decode(['1', 2, true]));
  assert.throws(() => a.decode(['1', 2]));
});

should('utils: join', () => {
  assert.throws(() => utils.join('1').encode(['1', 1, true]));
});

should('utils: padding', () => {
  const coder = utils.padding(4, '=');
  assert.throws(() => coder.encode(['1', 1, true]));
  assert.throws(() => coder.decode(['1', 1, true, '=']));
});

module.exports = { CODERS };
if (require.main === module) should.run();
