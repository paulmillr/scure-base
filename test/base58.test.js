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

should('base58xmr: wrong blockLen', () => {
  const vectors = [
    '1',
    'z',
    '1111',
    'zzzz',
    '11111111',
    'zzzzzzzz',
    '123456789AB1',
    '123456789ABz',
    '123456789AB1111',
    '123456789ABzzzz',
    '123456789AB11111111',
    '123456789ABzzzzzzzz',
  ];
  for (const v of vectors) assert.throws(() => base58xmr.decode(v));
});

should('base58xmr: wrong base', () => {
  const vectors = [
    '5R',
    'zz',
    'LUw',
    'zzz',
    '2UzHM',
    'zzzzz',
    '7YXq9H',
    'zzzzzz',
    'VtB5VXd',
    'zzzzzzz',
    '3CUsUpv9u',
    'zzzzzzzzz',
    'Ahg1opVcGX',
    'zzzzzzzzzz',
    'jpXCZedGfVR',
    'zzzzzzzzzzz',
    '123456789AB5R',
    '123456789ABzz',
    '123456789ABLUw',
    '123456789ABzzz',
    '123456789AB2UzHM',
    '123456789ABzzzzz',
    '123456789AB7YXq9H',
    '123456789ABzzzzzz',
    '123456789ABVtB5VXd',
    '123456789ABzzzzzzz',
    '123456789AB3CUsUpv9u',
    '123456789ABzzzzzzzzz',
    '123456789ABAhg1opVcGX',
    '123456789ABzzzzzzzzzz',
    '123456789ABjpXCZedGfVR',
    '123456789ABzzzzzzzzzzz',
    'zzzzzzzzzzz11',
  ];
  for (const v of vectors) assert.throws(() => base58xmr.decode(v));
});

should('base58xmr: wrong chars', () => {
  const vectors = [
    '10',
    '11I',
    '11O11',
    '11l111',
    '11_11111111',
    '1101111111111',
    '11I11111111111111',
    '11O1111111111111111111',
    '1111111111110',
    '111111111111l1111',
    '111111111111_111111111',
  ];
  for (const v of vectors) assert.throws(() => base58xmr.decode(v));
});

if (require.main === module) should.run();
