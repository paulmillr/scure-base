import * as utils from './utils';
import { base16, base32, base64 } from './rfc4648';
import { base58 } from './base58';

export const utf8: utils.BytesCoder = {
  encode: (data) => new TextDecoder().decode(data),
  decode: (str) => new TextEncoder().encode(str),
};

export const hex: utils.BytesCoder = utils.chain(
  utils.radix2(4),
  utils.alphabet('0123456789abcdef'),
  utils.join(''),
  utils.normalize((s: string) => {
    if (typeof s !== 'string' || s.length % 2)
      throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
    return s.toLowerCase();
  })
);

const CODERS = { utf8, hex, base16, base32, base58, base64 };

export const bytesToString = (bytes: Uint8Array, type: keyof typeof CODERS): string =>
  CODERS[type].encode(bytes);
export const stringToBytes = (str: string, type: keyof typeof CODERS): Uint8Array =>
  CODERS[type].decode(str);

export const bytes = stringToBytes;
export const str = bytesToString; // as in python, but for bytes only
