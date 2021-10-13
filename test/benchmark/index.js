const bench = require('micro-bmark');
const { run, mark } = bench; // or bench.mark
const { base64, base58, hex } = require('../..');
const stableBase64 = require('@stablelib/base64');
const microBase58 = require('micro-base58');
const stableHex = require('@stablelib/hex');
const nodeBase58 = require('@faustbrian/node-base58');
const bs58 = require('bs58');

const CODERS = {
  Hex: {
    encode: {
      node: (buf) => Buffer.from(buf).toString('hex'),
      stable: (buf) => stableHex.encode(buf),
      noble: (buf) => hex.encode(buf),
    },
    decode: {
      node: (str) => Buffer.from(str, 'hex'),
      stable: (str) => stableHex.decode(str),
      noble: (str) => hex.decode(str),
    },
  },
  Base64: {
    encode: {
      node: (buf) => Buffer.from(buf).toString('base64'),
      stable: (buf) => stableBase64.encode(buf),
      noble: (buf) => base64.encode(buf),
    },
    decode: {
      node: (str) => Buffer.from(str, 'base64'),
      stable: (str) => stableBase64.decode(str),
      noble: (str) => base64.decode(str),
    },
  },
  Base58: {
    encode: {
      nodeBase58: (buf) => nodeBase58.encode(buf),
      bs58: (buf) => bs58.encode(buf),
      micro: (buf) => microBase58.encode(buf),
      noble: (buf) => base58.encode(buf),
    },
    decode: {
      nodeBase58: (str) => nodeBase58.decode(str),
      bs58: (str) => bs58.decode(str),
      micro: (str) => microBase58.decode(str),
      noble: (str) => base58.decode(str),
    },
  },
};

// buffer title, sample count, data
const buffers = {
  '32 B': [20000, new Uint8Array(32).fill(1)],
  '64 B': [20000, new Uint8Array(64).fill(1)],
  '1 KB': [500, new Uint8Array(1024).fill(2)],
  '8 KB': [10, new Uint8Array(1024 * 8).fill(3)],
  // Slow, but 100 doesn't show difference, probably opt doesn't happen or something
  //'1 MB': [10, new Uint8Array(1024 * 1024).fill(4)],
};

const main = () =>
  run(async () => {
    for (let [k, libs] of Object.entries(CODERS)) {
      console.log(`==== ${k} ====`);
      for (const [size, [samples, buf]] of Object.entries(buffers)) {
        for (const [lib, fn] of Object.entries(libs.encode))
          await mark(`${k} (encode) ${size} ${lib}`, samples, () => fn(buf));
        console.log();
        const str = libs.encode.noble(buf);
        for (const [lib, fn] of Object.entries(libs.decode))
          await mark(`${k} (decode) ${size} ${lib}`, samples, () => fn(str));
        console.log();
      }
    }
    // Log current RAM
    bench.logMem();
  });

module.exports = { main };
if (require.main === module) main();
