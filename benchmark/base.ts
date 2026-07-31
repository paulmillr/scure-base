import bench from '@paulmillr/jsbt/bench.js';
import type { Bech32, BytesCoder } from '../index.ts';
import { __TESTS, base16, base32, base58, base64, base64nopad, bech32, bech32m, utf8 } from '../index.ts';

type CoderName = 'base16' | 'base32' | 'base64' | 'base64nopad' | 'base58';
type CoderSet = Record<CoderName, BytesCoder>;
const coders: CoderSet = { base16, base32, base64, base64nopad, base58 };
const sizes = {
  '32 B': 32,
  '1MB': 1024 * 1024,
};

const benchOpts = (bytes?: number) => (bytes === undefined ? {} : { bytes });

function sampleBytes(size: number): Uint8Array {
  const out = new Uint8Array(size);
  let state = 0xdecafbad;
  for (let i = 0; i < out.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    out[i] = state & 0xff;
  }
  if (out.length > 0 && out[0] === 0) out[0] = 1;
  return out;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function assertSame(label: string, a: Uint8Array, b: Uint8Array): void {
  if (!sameBytes(a, b)) throw new Error(`${label}: byte mismatch`);
}

const BYTES = sampleBytes(1024);
const UTF8_STRING =
  'hello \u041f\u0440\u0438\u0432\u0435\u0442 \u3053\u3093\u306b\u3061\u306f \u{1f600} '.repeat(64);
const UTF8_BYTES = utf8.decode(UTF8_STRING);
const BECH32_BYTES = BYTES.subarray(0, 32);

async function benchCoder(name: string, coder: BytesCoder, data: Uint8Array): Promise<void> {
  const encoded = coder.encode(data);
  assertSame(`${name} roundtrip`, coder.decode(encoded), data);
  await bench(`${name} encode`, () => coder.encode(data), benchOpts(data.length));
  await bench(`${name} decode`, () => coder.decode(encoded), benchOpts(data.length));
}
async function benchBech32(name: string, codec: Bech32): Promise<void> {
  const words = codec.toWords(BECH32_BYTES);
  const text = codec.encode('bc', words);
  assertSame(`${name} fromWords`, codec.fromWords(words), BECH32_BYTES);
  assertSame(`${name} decodeToBytes`, codec.decodeToBytes(text).bytes, BECH32_BYTES);
  await bench(`${name} toWords`, () => codec.toWords(BECH32_BYTES), benchOpts(BECH32_BYTES.length));
  await bench(`${name} fromWords`, () => codec.fromWords(words), benchOpts(BECH32_BYTES.length));
  await bench(`${name} fromWordsUnsafe`, () => codec.fromWordsUnsafe(words) ?? false, benchOpts());
  await bench(`${name} encode`, () => codec.encode('bc', words), benchOpts());
  await bench(`${name} decode`, () => codec.decode(text), benchOpts());
  await bench(`${name} decodeUnsafe`, () => codec.decodeUnsafe(text) ?? false, benchOpts());
  await bench(
    `${name} encodeFromBytes`,
    () => codec.encodeFromBytes('bc', BECH32_BYTES),
    benchOpts()
  );
  await bench(`${name} decodeToBytes`, () => codec.decodeToBytes(text), benchOpts());
}

async function main(): Promise<void> {
  for (const [sizeName, size] of Object.entries(sizes)) {
    for (const [coderName, coder] of Object.entries(coders) as [CoderName, BytesCoder][]) {
      if (coderName === 'base58' && size > 1024) continue;
      const bytes = sampleBytes(size);
      const encoded = coder.encode(bytes);
      assertSame(`${coderName} ${sizeName} roundtrip`, coder.decode(encoded), bytes);
      await bench(`${coderName} encode ${sizeName}`, () => coder.encode(bytes), {
        bytes: size,
      });
      await bench(`${coderName} decode ${sizeName}`, () => coder.decode(encoded), {
        bytes: size,
      });
    }
  }

  await benchCoder('utf8', utf8, UTF8_BYTES);
  await benchBech32('bech32', bech32);
  await benchBech32('bech32m', bech32m);
  await bench(
    '__TESTS.utf8Fallback encode',
    () => __TESTS.utf8Fallback.encode(UTF8_BYTES),
    benchOpts(UTF8_BYTES.length)
  );
  await bench(
    '__TESTS.utf8Fallback decode',
    () => __TESTS.utf8Fallback.decode(UTF8_STRING),
    benchOpts(UTF8_BYTES.length)
  );
  await bench(
    '__TESTS._isWellFormedShim',
    () => __TESTS._isWellFormedShim(UTF8_STRING),
    benchOpts()
  );
}

main();
