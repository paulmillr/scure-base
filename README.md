# micro-base

Fast and minimal implementation of bech32, base64, base58, base32 & base16.

Matches following specs:

- Bech32, Bech32m: [BIP173](https://en.bitcoin.it/wiki/BIP_0173), [BIP350](https://en.bitcoin.it/wiki/BIP_0350)
- Base16, Base32, Base32Hex, Base64, Base64Url: [RFC 4648](https://datatracker.ietf.org/doc/html/rfc4648) (aka RFC 3548)
- [Base58](https://www.ietf.org/archive/id/draft-msporny-base58-03.txt), [Base58check](https://en.bitcoin.it/wiki/Base58Check_encoding), [Base32 Crockford](https://www.crockford.com/base32.html)

## Usage

> npm install micro-base

```js
const {base16, base32, base64, base58} = require('micro-base');
// Flavors
const {base58xmr, base58xrp, base32hex, base32crockford, base64url} = require('micro-base');

const data = Uint8Array.from([1, 2, 3]);
base64.decode(base64.encode(data));

// Everything has the same API except for bech32 and base58check
base32.encode(data);
base16.encode(data);
base32hex.encode(data);

// bech32
const {bech32, bech32m} = require('micro-base');
const words = bech32.toWords(data);
const be = bech32.encode('prefix', words);
const {prefix, words} = bech32.decode(be);
bech32m.encode('prefix', words);

// base58check is special-case
// you need to pass sha256() function that returns Uint8Array
const {base58check} = require('micro-base');
base58check(sha256).encode(data);

// Alternative API
const {str, bytes} = require('micro-base');
const encoded = str('base64', data);
const data = bytes('base64', encoded);
```

## License

MIT (c) Paul Miller [(https://paulmillr.com)](https://paulmillr.com), see LICENSE file.
