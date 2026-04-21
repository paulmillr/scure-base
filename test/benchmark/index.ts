import * as nodeBase58 from '@faustbrian/node-base58';
import bench from '@paulmillr/jsbt/bench.js';
import * as stableBase64 from '@stablelib/base64';
import * as stableHex from '@stablelib/hex';
import bs58 from 'bs58';
import * as microBase58 from 'micro-base58';
import { __TESTS, base58, base64, base64url, hex, utf8 } from '../../index.ts';

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

const utf8DefaultDecode = new TextDecoder();
const utf8DefaultEncode = new TextEncoder();
const { utf8Fallback } = __TESTS;
const utf8Old = {
  encode: (buf) => new TextDecoder().decode(buf),
  decode: (str) => new TextEncoder().encode(str),
};
const UTF8 = {
  encode: {
    old: (buf) => utf8Old.encode(buf),
    scure: (buf) => utf8.encode(buf),
    fallback: (buf) => utf8Fallback.encode(buf),
  },
  decode: {
    old: (str) => utf8Old.decode(str),
    scure: (str) => utf8.decode(str),
    fallback: (str) => utf8Fallback.decode(str),
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
const utf8Buffers = {
  '64 B': new Uint8Array(64).fill(0x41),
  '64 KB': new Uint8Array(64 * 1024).fill(0x41),
  '1 MB': new Uint8Array(1024 * 1024).fill(0x41),
};
const validUtf8 = (buf) => {
  const str = utf8DefaultDecode.decode(buf);
  const bytes = utf8DefaultEncode.encode(str);
  return bytes.length === buf.length && bytes.every((b, i) => b === buf[i]);
};
const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const checkUtf8 = (buf) => {
  if (!validUtf8(buf)) throw new Error('UTF8 benchmark buffer must stay in the valid UTF-8 domain');
  const str = utf8DefaultDecode.decode(buf);
  const encode = Object.entries(UTF8.encode).filter(([lib, fn]) => {
    try {
      return fn(buf) === str;
    } catch (error) {
      console.log(`skip UTF8 encode ${lib}: ${error}`);
      return false;
    }
  });
  const decode = Object.entries(UTF8.decode).filter(([lib, fn]) => {
    try {
      return sameBytes(fn(str), buf);
    } catch (error) {
      console.log(`skip UTF8 decode ${lib}: ${error}`);
      return false;
    }
  });
  return { str, encode, decode };
};

const main = () =>
  (async () => {
    console.log(`==== UTF8 ====`);
    for (const [size, buf] of Object.entries(utf8Buffers)) {
      const { str, encode, decode } = checkUtf8(buf);
      for (const [lib, fn] of encode)
        await bench(`UTF8 (encode) ${size} ${lib}`, () => fn(buf));
      console.log();
      for (const [lib, fn] of decode)
        await bench(`UTF8 (decode) ${size} ${lib}`, () => fn(str));
      console.log();
    }
    for (let [k, libs] of Object.entries(CODERS)) {
      console.log(`==== ${k} ====`);
      for (const [size, buf] of Object.entries(buffers)) {
        for (const [lib, fn] of Object.entries(libs.encode))
          await bench(`${k} (encode) ${size} ${lib}`, () => fn(buf));
        console.log();
        const str = libs.encode.scure(buf);
        for (const [lib, fn] of Object.entries(libs.decode))
          await bench(`${k} (decode) ${size} ${lib}`, () => fn(str));
        console.log();
      }
    }
  })();

main();
