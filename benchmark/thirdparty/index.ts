// @ts-expect-error package has declarations, but its exports map does not expose them.
import {
  fromBase58 as exodusFromBase58,
  toBase58 as exodusToBase58,
} from '@exodus/bytes/base58.js';
import {
  fromBase64 as exodusFromBase64,
  fromBase64url as exodusFromBase64url,
  toBase64 as exodusToBase64,
  toBase64url as exodusToBase64url,
} from '@exodus/bytes/base64.js';
import { fromHex as exodusFromHex, toHex as exodusToHex } from '@exodus/bytes/hex.js';
import * as nodeBase58 from '@faustbrian/node-base58';
import compare from '@paulmillr/jsbt/benchmark-compare.js';
import { setMaxRunTime } from '@paulmillr/jsbt/benchmark.js';
import * as stableBase64 from '@stablelib/base64';
import * as stableHex from '@stablelib/hex';
// @ts-expect-error package does not ship TypeScript declarations.
import bs58 from 'bs58';
import * as microBase58 from 'micro-base58';
import { __TESTS, base58, base64, base64url, hex, utf8 } from '../../index.ts';

const MAX_RUN_TIME_SEC = Number(process.env.JSBT_RUNTIME ?? 0.25);
if (!Number.isFinite(MAX_RUN_TIME_SEC) || MAX_RUN_TIME_SEC < 0.1 || MAX_RUN_TIME_SEC > 60)
  throw new Error('JSBT_RUNTIME must be a number between 0.1 and 60 seconds');
setMaxRunTime(MAX_RUN_TIME_SEC);

type BaseFixture = {
  bytes: Uint8Array;
  Hex: string;
  Base64: string;
  Base64url: string;
  Base58: string;
};
type Utf8Fixture = { bytes: Uint8Array; text: string };

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const { utf8Fallback } = __TESTS;

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function assertSame(label: string, a: Uint8Array, b: Uint8Array): void {
  if (!sameBytes(a, b)) throw new Error(`${label}: byte mismatch`);
}

function baseFixture(size: number): BaseFixture {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 197 + (i >>> 1) + size) & 0xff;
  if (bytes.length > 0 && bytes[0] === 0) bytes[0] = 1;
  return {
    bytes,
    Hex: hex.encode(bytes),
    Base64: base64.encode(bytes),
    Base64url: base64url.encode(bytes),
    Base58: base58.encode(bytes),
  };
}

function utf8Fixture(size: number): Utf8Fixture {
  const bytes = new Uint8Array(size).fill(0x41);
  const text = textDecoder.decode(bytes);
  const encoded = textEncoder.encode(text);
  assertSame(`UTF8 fixture ${size}`, encoded, bytes);
  return { bytes, text };
}

const baseFixtures = {
  '1 KB': baseFixture(1024),
};
const utf8Fixtures = {
  '64 B': utf8Fixture(64),
  '64 KB': utf8Fixture(64 * 1024),
  '1 MB': utf8Fixture(1024 * 1024),
};

assertSame('Hex stable', stableHex.decode(baseFixtures['1 KB'].Hex), baseFixtures['1 KB'].bytes);
assertSame('Hex exodus', exodusFromHex(baseFixtures['1 KB'].Hex), baseFixtures['1 KB'].bytes);
assertSame('Hex scure', hex.decode(baseFixtures['1 KB'].Hex), baseFixtures['1 KB'].bytes);
assertSame(
  'Base64 stable',
  stableBase64.decode(baseFixtures['1 KB'].Base64),
  baseFixtures['1 KB'].bytes
);
assertSame(
  'Base64 exodus',
  exodusFromBase64(baseFixtures['1 KB'].Base64),
  baseFixtures['1 KB'].bytes
);
assertSame('Base64 scure', base64.decode(baseFixtures['1 KB'].Base64), baseFixtures['1 KB'].bytes);
assertSame(
  'Base64url exodus',
  exodusFromBase64url(baseFixtures['1 KB'].Base64url, { padding: true }),
  baseFixtures['1 KB'].bytes
);
assertSame(
  'Base64url scure',
  base64url.decode(baseFixtures['1 KB'].Base64url),
  baseFixtures['1 KB'].bytes
);
assertSame('Base58 bs58', bs58.decode(baseFixtures['1 KB'].Base58), baseFixtures['1 KB'].bytes);
assertSame(
  'Base58 exodus',
  exodusFromBase58(baseFixtures['1 KB'].Base58),
  baseFixtures['1 KB'].bytes
);
assertSame(
  'Base58 micro',
  microBase58.decode(baseFixtures['1 KB'].Base58),
  baseFixtures['1 KB'].bytes
);
assertSame(
  'Base58 nodeBase58',
  nodeBase58.decode(baseFixtures['1 KB'].Base58),
  baseFixtures['1 KB'].bytes
);
assertSame('Base58 scure', base58.decode(baseFixtures['1 KB'].Base58), baseFixtures['1 KB'].bytes);

await compare(
  'thirdparty utf8',
  {
    encode: {
      scure: (fixture: Utf8Fixture) => utf8.encode(fixture.bytes),
      fallback: (fixture: Utf8Fixture) => utf8Fallback.encode(fixture.bytes),
    },
    decode: {
      scure: (fixture: Utf8Fixture) => utf8.decode(fixture.text),
      fallback: (fixture: Utf8Fixture) => utf8Fallback.decode(fixture.text),
    },
  },
  {
    inputs: { size: utf8Fixtures },
    levels: ['op', 'library'],
    bytes: ({ args }) => args[0].bytes.length,
  }
);

await compare(
  'thirdparty base',
  {
    Hex: {
      encode: {
        node: (fixture: BaseFixture) => Buffer.from(fixture.bytes).toString('hex'),
        stable: (fixture: BaseFixture) => stableHex.encode(fixture.bytes),
        exodus: (fixture: BaseFixture) => exodusToHex(fixture.bytes),
        scure: (fixture: BaseFixture) => hex.encode(fixture.bytes),
      },
      decode: {
        node: (fixture: BaseFixture) => Buffer.from(fixture.Hex, 'hex'),
        stable: (fixture: BaseFixture) => stableHex.decode(fixture.Hex),
        exodus: (fixture: BaseFixture) => exodusFromHex(fixture.Hex),
        scure: (fixture: BaseFixture) => hex.decode(fixture.Hex),
      },
    },
    Base64: {
      encode: {
        node: (fixture: BaseFixture) => Buffer.from(fixture.bytes).toString('base64'),
        stable: (fixture: BaseFixture) => stableBase64.encode(fixture.bytes),
        exodus: (fixture: BaseFixture) => exodusToBase64(fixture.bytes),
        exodus_url: (fixture: BaseFixture) => exodusToBase64url(fixture.bytes, { padding: true }),
        scure: (fixture: BaseFixture) => base64.encode(fixture.bytes),
        scure_url: (fixture: BaseFixture) => base64url.encode(fixture.bytes),
      },
      decode: {
        node: (fixture: BaseFixture) => Buffer.from(fixture.Base64, 'base64'),
        stable: (fixture: BaseFixture) => stableBase64.decode(fixture.Base64),
        exodus: (fixture: BaseFixture) => exodusFromBase64(fixture.Base64),
        exodus_url: (fixture: BaseFixture) =>
          exodusFromBase64url(fixture.Base64url, { padding: true }),
        scure: (fixture: BaseFixture) => base64.decode(fixture.Base64),
        scure_url: (fixture: BaseFixture) => base64url.decode(fixture.Base64url),
      },
    },
    Base58: {
      encode: {
        nodeBase58: (fixture: BaseFixture) => nodeBase58.encode(fixture.bytes),
        bs58: (fixture: BaseFixture) => bs58.encode(fixture.bytes),
        exodus: (fixture: BaseFixture) => exodusToBase58(fixture.bytes),
        micro: (fixture: BaseFixture) => microBase58.encode(fixture.bytes),
        scure: (fixture: BaseFixture) => base58.encode(fixture.bytes),
      },
      decode: {
        nodeBase58: (fixture: BaseFixture) => nodeBase58.decode(fixture.Base58),
        bs58: (fixture: BaseFixture) => bs58.decode(fixture.Base58),
        exodus: (fixture: BaseFixture) => exodusFromBase58(fixture.Base58),
        micro: (fixture: BaseFixture) => microBase58.decode(fixture.Base58),
        scure: (fixture: BaseFixture) => base58.decode(fixture.Base58),
      },
    },
  },
  {
    inputs: { size: baseFixtures },
    levels: ['codec', 'op', 'library'],
    bytes: ({ args }) => args[0].bytes.length,
  }
);
