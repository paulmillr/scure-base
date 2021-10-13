const crypto = require('crypto');

function concatBytes(...arrays) {
  if (arrays.length === 1) return arrays[0];
  const length = arrays.reduce((a, arr) => a + arr.length, 0);
  const result = new Uint8Array(length);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const arr = arrays[i];
    result.set(arr, pad);
    pad += arr.length;
  }
  return result;
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
let RANDOM = new Uint8Array();
// Fill with random data (1MB)
for (let i = 0; i < 32 * 1024; i++)
  RANDOM = concatBytes(RANDOM, (start = crypto.createHash('sha256').update(start).digest()));

module.exports = { concatBytes, RANDOM, stats };
