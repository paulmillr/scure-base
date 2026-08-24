import { it } from '@paulmillr/jsbt/test.js';
import { deepStrictEqual as eql, throws } from 'node:assert';
import { Buffer } from 'node:buffer';
import { base36 } from '../index.ts';

const hexToArray = (hex) => Uint8Array.from(Buffer.from(hex, 'hex'));
const asciiToArray = (str) => new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));

const VECTORS = [
  { decoded: asciiToArray(''), encoded: '' },
  { decoded: hexToArray('00'), encoded: '0' },
  { decoded: hexToArray('0000'), encoded: '00' },
  { decoded: hexToArray('01'), encoded: '1' },
  { decoded: hexToArray('24'), encoded: '10' },
  { decoded: asciiToArray('hello world'), encoded: 'fuvrsivvnfrbjwajo' },
  { decoded: asciiToArray('\0\0hello world'), encoded: '00fuvrsivvnfrbjwajo' },
  { decoded: hexToArray('516b6fcd0f'), encoded: '4gnba1hr' },
  {
    decoded: hexToArray('0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20'),
    encoded: 'wjzlh5yt3uk0mzpcor0i12ol0rrpxdydzggt4b2fvr8yealc',
  },
  {
    // IPNS address payload (multibase 'k' stripped): CIDv1 libp2p-key of an ed25519 pubkey
    decoded: hexToArray(
      '017200240801122012c8299ec2c51dffbbcb4f9fccadcee1424cb237e9b30d3cd72d47c18103689d'
    ),
    encoded: '51qzi5uqu5dgnfwbc46une4upw1vc9hxznymyeykmg6rev1513yrnbyrwmmql',
  },
];

it('base36: vectors', () => {
  for (const vector of VECTORS) {
    const encoded = base36.encode(vector.decoded);
    eql(encoded, vector.encoded);
    eql(base36.decode(encoded), vector.decoded);
  }
});

it('base36: parity with bigint reference', () => {
  const letters = '0123456789abcdefghijklmnopqrstuvwxyz';
  const refEncode = (bytes) => {
    let zeros = 0;
    while (zeros < bytes.length - 1 && bytes[zeros] === 0) zeros++;
    let num = 0n;
    for (const b of bytes) num = (num << 8n) | BigInt(b);
    let res = '';
    for (; num > 0n; num /= 36n) res = letters[Number(num % 36n)] + res;
    if (!res && bytes.length) res = '0';
    return letters[0].repeat(zeros) + res;
  };
  let seed = 0x2f6e2b1;
  const rand = () => (seed = (seed * 48271) % 0x7fffffff) & 0xff;
  for (let len = 0; len < 130; len++) {
    const bytes = new Uint8Array(len).map(() => rand());
    if (len > 2) {
      bytes[0] = 0;
      bytes[1] = 0;
    }
    const encoded = base36.encode(bytes);
    eql(encoded, refEncode(bytes));
    eql(base36.decode(encoded), bytes);
  }
});

it('base36: invalid input', () => {
  throws(() => base36.decode('ABC')); // uppercase is not in the alphabet
  throws(() => base36.decode('a-b'));
  throws(() => base36.decode(1));
  throws(() => base36.encode('str'));
});

it('base36: public length limits', () => {
  const bytes = new Uint8Array(2048).fill(0xff);
  const encoded = base36.encode(bytes);
  eql(base36.decode(encoded), bytes);
  throws(() => base36.encode(new Uint8Array(2049)), /invalid length/);
  // Length must be rejected before the invalid character reaches alphabet decoding.
  throws(() => base36.decode('*'.repeat(4097)), /invalid length/);
});

it.runWhen(import.meta.url);
