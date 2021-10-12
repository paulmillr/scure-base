import * as utils from './utils';
import { base16, base32, base64, base64url } from './rfc4648';
import { base58, base58check, base58xmr } from './base58';
import { bech32, bech32m } from './bech32';

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

export { base16, base32, base64, base64url, base58, base58check, base58xmr, bech32, bech32m };

// prettier-ignore
const CODERS = {
  utf8, hex, base16, base32, base64, base64url, base58, base58xmr
};
type CoderType = keyof typeof CODERS;
const coderTypeError = `Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`;

export const bytesToString = (type: CoderType, bytes: Uint8Array): string => {
  if (typeof type !== 'string' || !CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (!(bytes instanceof Uint8Array)) throw new TypeError('bytesToString() expects Uint8Array');
  return CODERS[type].encode(bytes);
};
export const str = bytesToString; // as in python, but for bytes only

export const stringToBytes = (type: CoderType, str: string): Uint8Array => {
  if (!CODERS.hasOwnProperty(type)) throw new TypeError(coderTypeError);
  if (typeof str !== 'string') throw new TypeError('stringToBytes() expects string');
  return CODERS[type].decode(str);
};
export const bytes = stringToBytes;
