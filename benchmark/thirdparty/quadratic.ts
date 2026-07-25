import * as nodeBase58 from '@faustbrian/node-base58';
import { should } from '@paulmillr/jsbt/test.js';
import * as assert from 'node:assert';
import bs58 from 'bs58';
import * as microBase58 from 'micro-base58';
import { RANDOM, stats } from '../../test/utils.ts';

const getTime = () => Number(process.hrtime.bigint());

async function bench(callback, iters = 10) {
  const timings = [];
  for (let i = 0; i < iters; i++) {
    const ts = getTime();
    const val = callback();
    if (val instanceof Promise) await val;
    timings.push(getTime() - ts);
  }
  return stats(timings).median;
}

const retry =
  (callback, retries = 5) =>
  async () => {
    for (let i = 0; i < retries - 1; i++) {
      try {
        return await callback();
      } catch (e) {}
    }
    return await callback();
  };

function linear(buf) {
  for (let i = 0; i < buf.length; i++);
}

function linearConst(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < 16 * 1024; j++);
}

function log2(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < Math.log2(buf.length); j++);
}

function log10(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < Math.log10(buf.length); j++);
}

function quadratic(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < buf.length; j++);
}

const MARGIN = (() => {
  const timings = [];
  for (let i = 0; i < 5; i++) {
    const ts = getTime();
    linearConst(1024);
    timings.push((getTime() - ts) / 1024);
  }
  const diff = Math.max(...stats(timings).difference.map((i) => Math.abs(i)));
  return Math.max(1, diff);
})();

const SMALL_BUF = new Uint8Array(1024);

async function isLinear(callback, iters = 128) {
  for (let i = 0; i < 1024; i++) await callback(SMALL_BUF);
  const timings = [];
  for (let i = 1; i < iters; i++) {
    const buf = RANDOM.subarray(0, 1024 * i);
    const time = await bench(() => callback(buf));
    timings.push(time / buf.length);
  }
  const medianDifference = stats(stats(timings.map((i) => i)).difference).median;
  assert.deepStrictEqual(
    medianDifference < MARGIN,
    true,
    `medianDifference(${medianDifference}) should be less than ${MARGIN}`
  );
}

should(
  'detect quadratic functions',
  retry(async () => {
    await isLinear((buf) => linear(buf), 16);
    await isLinear((buf) => linearConst(buf), 16);
    await isLinear((buf) => log2(buf), 16);
    await isLinear((buf) => log10(buf), 16);
    await assert.rejects(() => isLinear((buf) => quadratic(buf), 16));
  })
);

should(
  'DoS: bs58 is quadratic',
  retry(async () => {
    await assert.rejects(() => isLinear((buf) => bs58.decode(bs58.encode(buf)), 16));
  })
);

should(
  'DoS: microBase58 is quadratic',
  retry(async () => {
    await assert.rejects(() => isLinear((buf) => microBase58.decode(microBase58.encode(buf)), 16));
  })
);

should(
  'DoS: nodeBase58 is quadratic',
  retry(async () => {
    await assert.rejects(() => isLinear((buf) => nodeBase58.decode(nodeBase58.encode(buf)), 16));
  })
);

should.runWhen(import.meta.url);
