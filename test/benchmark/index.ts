import * as nodeBase58 from '@faustbrian/node-base58';
import * as stableBase64 from '@stablelib/base64';
import * as stableHex from '@stablelib/hex';
import * as bs58 from 'bs58';
import * as microBase58 from 'micro-base58';
import { mark } from 'micro-bmark';
import { base58, base64, base64url, hex } from '../../index.ts';

const CODERS = {
  Hex: {
    encode: {
      node: (buf) => Buffer.from(buf).toString('hex'),
      stable: (buf) => stableHex.encode(buf),
      scure: (buf) => hex.encode(buf),
    },
    decode: {
      node: (str) => Buffer.from(str, 'hex'),
      stable: (str) => stableHex.decode(str),
      scure: (str) => hex.decode(str),
    },
  },
  Base64: {
    encode: {
      node: (buf) => Buffer.from(buf).toString('base64'),
      stable: (buf) => stableBase64.encode(buf),
      scure: (buf) => base64.encode(buf),
      scure_url: (buf) => base64url.encode(buf),
    },
    decode: {
      node: (str) => Buffer.from(str, 'base64'),
      stable: (str) => stableBase64.decode(str),
      scure: (str) => base64.decode(str),
      scure_url: (str) => base64url.decode(str),
    },
  },
  Base58: {
    encode: {
      nodeBase58: (buf) => nodeBase58.encode(buf),
      bs58: (buf) => bs58.encode(buf),
      micro: (buf) => microBase58.encode(buf),
      scure: (buf) => base58.encode(buf),
    },
    decode: {
      nodeBase58: (str) => nodeBase58.decode(str),
      bs58: (str) => bs58.decode(str),
      micro: (str) => microBase58.decode(str),
      scure: (str) => base58.decode(str),
    },
  },
};

// buffer title, sample count, data
const buffers = {
  // '32 B': new Uint8Array(32).fill(1),
  // '64 B': new Uint8Array(64).fill(1),
  '1 KB': new Uint8Array(1024).fill(2),
  // '8 KB': new Uint8Array(1024 * 8).fill(3),
  // Slow, but 100 doesn't show difference, probably opt doesn't happen or something
  // '1 MB': new Uint8Array(1024 * 1024).fill(4),
};

const main = () =>
  (async () => {
    for (let [k, libs] of Object.entries(CODERS)) {
      console.log(`==== ${k} ====`);
      for (const [size, buf] of Object.entries(buffers)) {
        for (const [lib, fn] of Object.entries(libs.encode))
          await mark(`${k} (encode) ${size} ${lib}`, () => fn(buf));
        console.log();
        const str = libs.encode.scure(buf);
        for (const [lib, fn] of Object.entries(libs.decode))
          await mark(`${k} (decode) ${size} ${lib}`, () => fn(str));
        console.log();
      }
    }
  })();

main();
