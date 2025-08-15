import { sha256 } from '@noble/hashes/sha2.js';
import { readFileSync } from 'node:fs';
import { dirname, join as joinPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const _dirname = dirname(fileURLToPath(import.meta.url));

export function jsonGZ(path) {
  const unz = gunzipSync(readFileSync(joinPath(_dirname, path)));
  return JSON.parse(unz.toString('utf8'));
}

export function json(path) {
  try {
    // Node.js
    return JSON.parse(readFileSync(joinPath(_dirname, path), { encoding: 'utf-8' }));
  } catch (error) {
    // Bundler
    const file = path.replace(/^\.\//, '').replace(/\.json$/, '');
    if (path !== './' + file + '.json') throw new Error('Can not load non-json file');
    // return require('./' + file + '.json'); // in this form so that bundler can glob this
  }
}

function median(list) {
  const values = list.slice().sort((a, b) => a - b);
  const half = (values.length / 2) | 0;
  return values.length % 2 ? values[half] : (values[half - 1] + values[half]) / 2.0;
}

function stats(list) {
  let [min, max, cnt, sum, absSum] = [+Infinity, -Infinity, 0, 0, 0];
  for (let value of list) {
    const num = Number(value);
    min = Math.min(min, num);
    max = Math.max(max, num);
    cnt++;
    sum += num;
    absSum += Math.abs(num);
  }
  const sumDiffPercent = (absSum / sum) * 100;
  const difference = [];
  for (let i = 1; i < list.length; i++) difference.push(list[i] - list[i - 1]);
  return {
    min,
    max,
    avg: sum / cnt,
    sum,
    median: median(list),
    absSum,
    cnt,
    sumDiffPercent,
    difference,
  };
}

// Random data, by using hash we trying to achieve uniform distribution of each byte values
let start = new Uint8Array([1, 2, 3, 4, 5]);
let RANDOM = Uint8Array.of();
// Fill with random data (1MB)
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}

for (let i = 0; i < 32 * 1024; i++) RANDOM = concatBytes(RANDOM, (start = sha256(start)));

const getTypeTests = () => [
  [0, '0'],
  [123, '123'],
  [123.456, '123.456'],
  [-5n, '-5n'],
  [1.0000000000001, '1.0000000000001'],
  [10e9999, '10e9999'],
  [Infinity, 'Infinity'],
  [-Infinity, '-Infinity'],
  [NaN, 'NaN'],
  [true, 'true'],
  [false, 'false'],
  [null, 'null'],
  [undefined, 'undefined'],
  ['', '""'],
  ['1', '"1"'],
  ['1 ', '"1 "'],
  [' 1', '" 1"'],
  ['0xbe', '"0xbe"'],
  ['keys', '"keys"'],
  [new String('1234'), 'String(1234)'],
  [Uint8Array.of(), 'ui8a([])'],
  [Uint8Array.of(0), 'ui8a([0])'],
  [Uint8Array.of(1), 'ui8a([1])'],
  // [new Uint8Array(32).fill(1), 'ui8a(32*[1])'],
  [new Uint8Array(4096).fill(1), 'ui8a(4096*[1])'],
  [new Uint16Array(32).fill(1), 'ui16a(32*[1])'],
  [new Uint32Array(32).fill(1), 'ui32a(32*[1])'],
  [new Float32Array(32), 'f32a(32*0)'],
  [new BigUint64Array(32).fill(1n), 'ui64a(32*[1])'],
  [new ArrayBuffer(100), 'arraybuf'],
  [new DataView(new ArrayBuffer(100)), 'dataview'],
  [{ constructor: { name: 'Uint8Array' }, length: '1e30' }, 'fake(ui8a)'],
  [Array(32).fill(1), 'array'],
  [new Set([1, 2, 3]), 'set'],
  [new Map([['aa', 'bb']]), 'map'],
  [() => {}, 'fn'],
  [async () => {}, 'fn async'],
  [class Test {}, 'class'],
  [Symbol.for('a'), 'symbol("a")'],
];

export { concatBytes, getTypeTests, RANDOM, stats };

