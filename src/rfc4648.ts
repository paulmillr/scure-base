import { radix2, alphabet, padding, normalize, join, BytesCoder, chain } from './utils';

// RFC 4648 aka RFC 3548
export const base16: BytesCoder = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
export const base32: BytesCoder = chain(
  radix2(5),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'),
  padding(5),
  join('')
);
export const base32hex: BytesCoder = chain(
  radix2(5),
  alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'),
  padding(5),
  join('')
);
export const base32crockford: BytesCoder = chain(
  radix2(5),
  alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'),
  join(''),
  normalize((s: string) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1'))
);
export const base64: BytesCoder = chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'),
  padding(6),
  join('')
);
export const base64url: BytesCoder = chain(
  radix2(6),
  alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'),
  padding(6),
  join('')
);
