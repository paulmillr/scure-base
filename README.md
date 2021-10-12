# micro-base

Fast, secure & minimal implementation of bech32, rfc 4648 (base64, base32, base16), base58.

Matches following specs:

- Bech32, Bech32m: https://en.bitcoin.it/wiki/BIP_0173, https://en.bitcoin.it/wiki/BIP_0350
- RFC 4648 (aka RFC 3548): Base16, Base32, Base32Hex, Base64, Base64Url
- Base32 Crockford: https://www.crockford.com/base32.html
- Base58: https://www.ietf.org/archive/id/draft-msporny-base58-03.txt

## Usage

> npm install micro-base


```js
const {base64, bech32, str, bytes} = require('micro-base');
const b64Encoded = str('base64', Uint8Array.from([1, 2,3]));
const data = bytes('base64', b64Encoded);
const be = bech32.encode(bech32.toWords(Uint8Array.from([1, 2, 3])))
const dataBe = bech32.decode(be);
```

### RFC 4648 (base64, base32, base16)

```js
const { base64, str, bytes } = require('micro-base');
const data = Uint8Array.from([1, 2,3]);
const encoded = base64.encode(data);
const decoded = base64.decode(encoded);
// same
str('base64', data);
bytes('base64', encoded);
```

Second argument (type) could be:

```
base16
base32
base32hex
base32crockford
base64
base64url
base58
base58xmr
base58check
base58xrp
```

### bech32

We support bech32 (BIP-0173) and bech32m (BIP-0350).

```js
const { bech32, bech32m } = require('micro-base');
const be = bech32.encode(bech32.toWords(new Uint8Array([1, 2, 3])))
const dataBe = bech32.decode(be);

// bech32m
bech32m.encode(bech32.toWords(new Uint8Array([1, 2, 3])))
```

## License

MIT (c) Paul Miller [(https://paulmillr.com)](https://paulmillr.com), see LICENSE file.
