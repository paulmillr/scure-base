const assert = require('assert');
const { should } = require('micro-should');
const { base58, base58xmr, base58check: _base58check, base58xrp } = require('..');
const VECTORS_2 = require('./vectors/base58.json');
// https://github.com/bigreddmachine/MoneroPy/blob/master/tests/testdata.py (BSD license)
const XMR_VECTORS = require('./vectors/base58_xmr.json');
// https://github.com/bitcoinjs/bs58check/blob/master/test/fixtures.json (MIT license)
const B58CHK_VECTORS = require('./vectors/base58_check.json');
const hexToArray = (hex) => Uint8Array.from(Buffer.from(hex, 'hex'));
const asciiToArray = (str) => new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));

const VECTORS_1 = [
  { decoded: asciiToArray('hello world'), encoded: 'StV1DL6CwTryKyV' },
  { decoded: Uint8Array.from(Buffer.from('hello world')), encoded: 'StV1DL6CwTryKyV' },
  { decoded: asciiToArray('hello world'), encoded: 'StV1DL6CwTryKyV' },
  { decoded: asciiToArray('hello world'), encoded: 'StVrDLaUATiyKyV', isXRP: true },
  { decoded: asciiToArray('\0\0hello world'), encoded: '11StV1DL6CwTryKyV' },
  { decoded: asciiToArray(''), encoded: '' },
  { decoded: Uint8Array.from(Buffer.from([0x51, 0x6b, 0x6f, 0xcd, 0x0f])), encoded: 'ABnLTmg' },
  { decoded: new Uint8Array([0x51, 0x6b, 0x6f, 0xcd, 0x0f]), encoded: 'ABnLTmg' },
  { decoded: asciiToArray('Hello World!'), encoded: '2NEpo7TZRRrLZSi2U' },
  {
    decoded: asciiToArray('The quick brown fox jumps over the lazy dog.'),
    encoded: 'USm3fpXnKG5EUBx2ndxBDMPVciP5hGey2Jh4NDv6gmeo1LkMeiKrLJUUBk6Z',
  },
  { decoded: new Uint8Array([0x00, 0x00, 0x28, 0x7f, 0xb4, 0xcd]), encoded: '11233QC4' },
];

should('base58: vectors1', () => {
  for (const vector of VECTORS_1) {
    const dec = vector.decoded;
    const vectorDecodedArr = typeof dec === 'string' ? asciiToArray(dec) : dec;
    const coder = vector.isXRP ? base58xrp : base58;

    const encoded = coder.encode(vector.decoded);
    assert.deepStrictEqual(encoded, vector.encoded);
    assert.deepStrictEqual(coder.decode(encoded), vectorDecodedArr);
  }
});

should('base58: vectors2', () => {
  for (const { decodedHex, encoded } of VECTORS_2) {
    const txt = hexToArray(decodedHex);
    assert.deepStrictEqual(base58.encode(txt), encoded);
  }
});

for (let i = 0; i < XMR_VECTORS.validAddrs.length; i++) {
  should(`base58: xmr vectors (${i})`, () => {
    const decAddr = XMR_VECTORS.decodedAddrs[i];
    const validAddr = XMR_VECTORS.validAddrs[i];
    assert.deepStrictEqual(base58xmr.encode(hexToArray(decAddr)), validAddr, 'encode');
    assert.deepStrictEqual(base58xmr.decode(validAddr), hexToArray(decAddr), 'decode');
  });
}

const base58check = _base58check((buf) =>
  Uint8Array.from(require('crypto').createHash('sha256').update(buf).digest())
);

for (const v of B58CHK_VECTORS.valid) {
  should(`b58-check: decode ${v}`, () => {
    const actual = base58check.decode(v.string);
    assert.deepStrictEqual(Buffer.from(actual).toString('hex'), v.payload);
  });
  should(`b58-check: decode ${v}`, () => {
    assert.deepStrictEqual(base58check.encode(Buffer.from(v.payload, 'hex')), v.string);
  });
}
for (const v of B58CHK_VECTORS.invalid) {
  should(`b58-check: decode throws on ${v.exception}`, () => {
    assert.throws(() => base58check.decode(v.string));
  });
}

if (require.main === module) should.run();
