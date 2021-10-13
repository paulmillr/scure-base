const assert = require('assert');
const { base58, base58xmr, base58check: _base58check, base58xrp } = require('..');
const base58check = _base58check((buf) =>
  Uint8Array.from(require('crypto').createHash('sha256').update(buf).digest())
);
const { base32, base32hex, base32crockford, base64, base64url, str, bytes } = require('..');
const { Buffer } = require('buffer');
const { should } = require('micro-should');
const { RANDOM } = require('./utils');

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

module.exports = { CODERS };
if (require.main === module) should.run();
