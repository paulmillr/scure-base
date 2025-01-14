import { deepStrictEqual, throws } from 'node:assert';
import fc from 'fast-check';
import { describe, should } from 'micro-should';
import { hex } from '../lib/index.js';
import { getTypeTests } from './utils.js';

// const concatBytes = utils.concatBytes;
const hexToBytes = hex.decode;
const bytesToHex = hex.encode;

describe('utils', () => {
  const staticHexVectors = [
    { bytes: Uint8Array.from([]), hex: '' },
    { bytes: Uint8Array.from([0xbe]), hex: 'be' },
    { bytes: Uint8Array.from([0xca, 0xfe]), hex: 'cafe' },
    { bytes: Uint8Array.from(new Array(1024).fill(0x69)), hex: '69'.repeat(1024) },
  ];
  should('hexToBytes', () => {
    for (let v of staticHexVectors) deepStrictEqual(hexToBytes(v.hex), v.bytes);
    for (let v of staticHexVectors) deepStrictEqual(hexToBytes(v.hex.toUpperCase()), v.bytes);
    for (let [v, repr] of getTypeTests()) {
      if (repr === '""') continue;
      throws(() => hexToBytes(v));
    }
  });
  should('bytesToHex', () => {
    for (let v of staticHexVectors) deepStrictEqual(bytesToHex(v.bytes), v.hex);
    for (let [v, repr] of getTypeTests()) {
      if (repr.startsWith('ui8a')) continue;
      throws(() => bytesToHex(v));
    }
  });
  should('hexToBytes <=> bytesToHex roundtrip', () =>
    fc.assert(
      fc.property(fc.hexaString({ minLength: 2, maxLength: 64 }), (hex) => {
        if (hex.length % 2 !== 0) return;
        deepStrictEqual(hex, bytesToHex(hexToBytes(hex)));
        deepStrictEqual(hex, bytesToHex(hexToBytes(hex.toUpperCase())));
        deepStrictEqual(hexToBytes(hex), Uint8Array.from(Buffer.from(hex, 'hex')));
      })
    )
  );
  // should('concatBytes', () => {
  //   const a = 1;
  //   const b = 2;
  //   const c = 0xff;
  //   const aa = Uint8Array.from([a]);
  //   const bb = Uint8Array.from([b]);
  //   const cc = Uint8Array.from([c]);
  //   deepStrictEqual(concatBytes(), new Uint8Array());
  //   deepStrictEqual(concatBytes(aa, bb), Uint8Array.from([a, b]));
  //   deepStrictEqual(concatBytes(aa, bb, cc), Uint8Array.from([a, b, c]));
  //   for (let [v, repr] of getTypeTests()) {
  //     if (repr.startsWith('ui8a')) continue;
  //     throws(() => {
  //       concatBytes(v);
  //     });
  //     throws(() => {
  //       concatBytes(aa, v);
  //     });
  //   }
  // });
  // should('concatBytes random', () =>
  //   fc.assert(
  //     fc.property(fc.uint8Array(), fc.uint8Array(), fc.uint8Array(), (a, b, c) => {
  //       const expected = Uint8Array.from(Buffer.concat([a, b, c]));
  //       deepStrictEqual(concatBytes(a.slice(), b.slice(), c.slice()), expected);
  //     })
  //   )
  // );
});

// ESM is broken.
// import url from 'node:url';
// if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
//   should.run();
// }
should.runWhen(import.meta.url);
