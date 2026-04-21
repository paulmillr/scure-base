import { should } from '@paulmillr/jsbt/test.js';
import { deepStrictEqual as eql } from 'node:assert';
import { __TESTS, utf8 } from '../index.ts';
import { json } from './utils.ts';

const { utf8Fallback } = __TESTS;
const fatal = json('./vectors/utf8/decoder-fatal.json');
const bom = json('./vectors/utf8/decoder-bom.json');
const surrogates = json('./vectors/utf8/encoder-surrogates.json');

const run = (fn) => {
  // Capture both sides independently; nested try/catch can accidentally turn throw/success mismatches into false parity.
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    return { ok: false, error };
  }
};
const same = (a, b) => {
  const left = run(a);
  const right = run(b);
  if (left.ok || right.ok) return eql(left, right);
  // Native TextDecoder(..., { fatal: true }) messages are host-owned, so stable parity is:
  // same success value, or both throw TypeError on the same input domain.
  return eql(
    {
      ok: false,
      type: left.error instanceof Error ? left.error.constructor.name : typeof left.error,
    },
    {
      ok: false,
      type: right.error instanceof Error ? right.error.constructor.name : typeof right.error,
    }
  );
};

should('utf8 vectors: fatal decode parity', () => {
  for (const t of fatal.fatal_invalid) {
    const input = Uint8Array.from(t.input);
    same(
      () => utf8.encode(input),
      () => utf8Fallback.encode(input)
    );
  }
  const recovery = Uint8Array.from(fatal.recovery_case.bytes);
  same(
    () => utf8.encode(recovery),
    () => utf8Fallback.encode(recovery)
  );
});

should('utf8 vectors: BOM parity', () => {
  const plain = Uint8Array.from(bom.byte_order_marks.bytes);
  const withBom = Uint8Array.from([...bom.byte_order_marks.bom, ...bom.byte_order_marks.bytes]);
  const ignoredBom = Uint8Array.from(bom.ignore_bom.bytes);
  const wrongBom = Uint8Array.from([
    ...bom.byte_order_marks.wrong_boms_as_garbage['utf-16le'],
    ...bom.byte_order_marks.bytes,
  ]);
  same(
    () => utf8.encode(plain),
    () => utf8Fallback.encode(plain)
  );
  same(
    () => utf8.encode(withBom),
    () => utf8Fallback.encode(withBom)
  );
  same(
    () => utf8.encode(ignoredBom),
    () => utf8Fallback.encode(ignoredBom)
  );
  same(
    () => utf8.encode(wrongBom),
    () => utf8Fallback.encode(wrongBom)
  );
});

should('utf8 vectors: surrogate parity', () => {
  for (const t of surrogates.cases)
    same(
      () => utf8.decode(t.input),
      () => utf8Fallback.decode(t.input)
    );
});

should.runWhen(import.meta.url);
