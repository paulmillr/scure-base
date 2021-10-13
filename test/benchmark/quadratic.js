const assert = require('assert');
const { should } = require('micro-should');
const { RANDOM, stats } = require('../test/utils');

const microBase58 = require('micro-base58');
const nodeBase58 = require('@faustbrian/node-base58');
const bs58 = require('bs58');

const getTime = () => Number(process.hrtime.bigint());

// Median execution time for callback (reduce noise)
async function bench(callback, iters = 10) {
  const timings = [];
  for (let i = 0; i < iters; i++) {
    const ts = getTime();
    let val = callback();
    if (val instanceof Promise) await val;
    timings.push(getTime() - ts);
  }
  return stats(timings).median;
}
// Handle flaky tests. If complexity test passed even 1 of 5 attempts, then its ok.
// Only when all attempts failed, test is failed.
const retry =
  (callback, retries = 5) =>
  async () => {
    for (let i = 0; i < retries - 1; i++) {
      try {
        return await callback();
      } catch (e) {}
    }
    // last attempt, throw exception if failed
    return await callback();
  };

// O(N)
function linear(buf) {
  for (let i = 0; i < buf.length; i++);
}
// O(128*1024*N)
function linearConst(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < 16 * 1024; j++);
}
// O(N*log2(N))
function log2(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < Math.log2(buf.length); j++);
}
// O(N*log10(N))
function log10(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < Math.log10(buf.length); j++);
}
// O(N^2)
function quadratic(buf) {
  for (let i = 0; i < buf.length; i++) for (let j = 0; j < buf.length; j++);
}
// Should be around 0.1, but its significantly depends on environment, GC, other processes that run in parallel. Which makes tests too flaky.
const MARGIN = (() => {
  const timings = [];
  for (let i = 0; i < 5; i++) {
    let ts = getTime();
    linearConst(1024);
    timings.push((getTime() - ts) / 1024);
  }
  const diff = Math.max(...stats(timings).difference.map((i) => Math.abs(i)));
  return Math.max(1, diff);
})();

console.log(`Time margin: ${MARGIN}`);

const SMALL_BUF = new Uint8Array(1024);
// Check that there is linear relation between input size and running time of callback
async function isLinear(callback, iters = 128) {
  // Warmup && trigger JIT
  for (let i = 0; i < 1024; i++) await callback(SMALL_BUF);
  // Measure difference between relative execution time (per byte)
  const timings = [];
  for (let i = 1; i < iters; i++) {
    const buf = RANDOM.subarray(0, 1024 * i);
    const time = await bench(() => callback(buf));
    timings.push(time / buf.length); // time per byte
  }
  // Median of differences. Should be close to zero for linear functions (+/- some noise).
  const medianDifference = stats(stats(timings.map((i) => i)).difference).median;
  console.log({ medianDifference });
  assert.deepStrictEqual(
    medianDifference < MARGIN,
    true,
    `medianDifference(${medianDifference}) should be less than ${MARGIN}`
  );
}

// Verify that it correctly detects functions with quadratic complexity
should(
  'detect quadratic functions',
  retry(async () => {
    // 16 iters since quadratic is very slow
    console.log('Linear');
    await isLinear((buf) => linear(buf), 16);
    console.log('Linear const');
    await isLinear((buf) => linearConst(buf), 16);
    // Very close to linear, not much impact
    console.log('Log2');
    await isLinear((buf) => log2(buf), 16);
    console.log('Log10');
    await isLinear((buf) => log10(buf), 16);
    console.log('Quadratic');
    await assert.rejects(() => isLinear((buf) => quadratic(buf), 16));
  })
);

should(
  `DoS: bs58 is quadratic :(`,
  retry(async () => {
    await assert.rejects(() => isLinear((buf) => bs58.decode(bs58.encode(buf)), 16));
  })
);

should(
  `DoS: microBase58 is quadratic :(`,
  retry(async () => {
    await assert.rejects(() => isLinear((buf) => microBase58.decode(microBase58.encode(buf)), 16));
  })
);

should(
  `DoS: nodeBase58 is quadratic :(`,
  retry(async () => {
    await assert.rejects(() => isLinear((buf) => nodeBase58.decode(nodeBase58.encode(buf)), 16));
  })
);

if (require.main === module) should.run();
