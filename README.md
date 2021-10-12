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
const {bech32, bytesToString, stringToBytes} = require('micro-base');
const base64Encoded = bytesToString(new Uint8Array([1, 2,3]), 'base64');
const data = stringToBytes(base64Encoded, 'base64');
const be = bech32.encode(bech32.toWords(new Uint8Array([1, 2, 3])))
const dataBe = bech32.decode(be);
```

### RFC 4648 (base64, base32, base16)

```js
const { bytesToString, stringToBytes } = require('micro-base');
const base64Encoded = bytesToString(new Uint8Array([1, 2,3]), 'base64');
const data = stringToBytes(base64Encoded, 'base64');
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
