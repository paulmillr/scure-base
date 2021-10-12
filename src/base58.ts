import * as utils from './utils';

export const genBase58 = (alphabet: string) =>
  utils.chain(utils.radix(58), utils.alphabet(alphabet), utils.join(''));

export const base58: utils.BytesCoder = genBase58(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
);
export const base58flickr: utils.BytesCoder = genBase58(
  '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
);
export const base58xrp: utils.BytesCoder = genBase58(
  'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'
);

// xmr ver is done in 8-byte blocks.
// This gives us eight full-sized blocks and one 5-byte block.
// Eight bytes converts to 11 or less Base58 characters;
// if a particular block converts to <11 characters,
// the conversion pads it with "1"s (1 is 0 in Base58).
// Likewise, the final 5-byte block can convert to 7 or less Base58 digits;
// the conversion will ensure the result is 7 digits. Due to the conditional padding,
// the 69-byte string will always convert to 95 Base58 characters (8 * 11 + 7).
// Significantly reduces quadratic complexity of base58
export const base58xmr: utils.BytesCoder = {
  encode(data: Uint8Array) {
    let res = '';
    for (let i = 0; i < data.length; i += 8) {
      const slice = data.subarray(i, i + 8);
      res += base58.encode(slice).padStart(slice.length === 8 ? 11 : 7, '1');
    }
    return res;
  },
  decode(str: string) {
    let res: number[] = [];
    for (let i = 0; i < str.length; i += 11)
      res = res.concat(Array.from(base58.decode(str.slice(i, i + 11))));
    return Uint8Array.from(res);
  },
};

export const base58check = {
  encode: (sha256: (data: Uint8Array) => Uint8Array): utils.BytesCoder =>
    utils.chain(
      utils.checksum(4, (data) => sha256(sha256(data))),
      base58
    ),
};
