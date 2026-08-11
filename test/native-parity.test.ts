import { it } from '@paulmillr/jsbt/test.js';
import fc from 'fast-check';
import { deepStrictEqual as eql } from 'node:assert';
import { __TESTS, base64, base64url, hex, type BytesCoder } from '../index.ts';

type Outcome = { ok: true; value: Uint8Array } | { ok: false };

const outcome = (fn: () => Uint8Array): Outcome => {
  try {
    return { ok: true, value: fn() };
  } catch {
    return { ok: false };
  }
};

const hasBase64Builtin =
  typeof (Uint8Array as any).from([]).toBase64 === 'function' &&
  typeof (Uint8Array as any).fromBase64 === 'function';
const hasHexBuiltin =
  typeof (Uint8Array as any).from([]).toHex === 'function' &&
  typeof (Uint8Array as any).fromHex === 'function';

const ascii = fc.integer({ min: 0, max: 0x7f }).map((code) => String.fromCharCode(code));
const base64Char = fc.constantFrom(
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=_- \t\n\r'
);
const hexChar = fc.constantFrom(...'0123456789abcdefABCDEFxyz+- ');
const stringInput = (targeted: fc.Arbitrary<string>) =>
  fc.oneof(
    fc.string({ unit: targeted, maxLength: 128 }),
    fc.string({ unit: ascii, maxLength: 128 })
  );

const NUM_RUNS = 262_144;

function assertRandom<Ts>(property: fc.IProperty<Ts>) {
  const seed = (Math.random() * 0x1_0000_0000) | 0;
  try {
    fc.assert(property, { numRuns: NUM_RUNS, seed });
  } catch (error) {
    const prefix = `Differential test failed (seed=${seed}, numRuns=${NUM_RUNS})`;
    if (error instanceof Error) {
      error.message = `${prefix}: ${error.message}`;
      throw error;
    }
    throw new Error(`${prefix}: ${String(error)}`);
  }
}

function differential(
  name: string,
  selected: BytesCoder,
  fallback: BytesCoder,
  input: fc.Arbitrary<string>,
  enabled: boolean
) {
  it(`native parity: ${name}`, () => {
    if (!enabled) return;
    assertRandom(
      fc.property(fc.uint8Array({ maxLength: 256 }), (bytes) => {
        eql(selected.encode(bytes), fallback.encode(bytes));
      })
    );
    assertRandom(
      fc.property(input, (str) => {
        eql(
          outcome(() => selected.decode(str)),
          outcome(() => fallback.decode(str))
        );
      })
    );
  });
}

differential('base64', base64, __TESTS.base64Fallback, stringInput(base64Char), hasBase64Builtin);
differential(
  'base64url',
  base64url,
  __TESTS.base64urlFallback,
  stringInput(base64Char),
  hasBase64Builtin
);
differential('hex', hex, __TESTS.hexFallback, stringInput(hexChar), hasHexBuiltin);

it.runWhen(import.meta.url);
