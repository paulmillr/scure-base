# scure-base

Audited & minimal implementation of bech32, base64, base58, base32 & base16.

- 🔒 [Audited](#security) by an independent security firm
- 🔻 Tree-shakeable: unused code is excluded from your builds
- ✍️ Written in [functional style](#design-rationale), easily composable
- 💼 Matches specs
  - [BIP173](https://en.bitcoin.it/wiki/BIP_0173), [BIP350](https://en.bitcoin.it/wiki/BIP_0350) for bech32 / bech32m
  - [RFC 4648](https://datatracker.ietf.org/doc/html/rfc4648) (aka RFC 3548) for Base16, Base32, Base32Hex, Base64, Base64Url
  - [Base58](https://www.ietf.org/archive/id/draft-msporny-base58-03.txt),
    [Base58check](https://en.bitcoin.it/wiki/Base58Check_encoding),
    [Base32 Crockford](https://www.crockford.com/base32.html)
- 🪶 4KB (gzipped)

Check out [Projects using scure-base](#projects-using-scure-base).

### This library belongs to _scure_

> **scure** — audited micro-libraries.

- Zero or minimal dependencies
- Highly readable TypeScript / JS code
- PGP-signed releases and transparent NPM builds
- Check out [homepage](https://paulmillr.com/noble/#scure) & all libraries:
  [base](https://github.com/paulmillr/scure-base),
  [bip32](https://github.com/paulmillr/scure-bip32),
  [bip39](https://github.com/paulmillr/scure-bip39),
  [btc-signer](https://github.com/paulmillr/scure-btc-signer),
  [sr25519](https://github.com/paulmillr/scure-sr25519),
  [starknet](https://github.com/paulmillr/scure-starknet)

## Usage

> `npm install @scure/base`

> `deno add jsr:@scure/base`

We support all major platforms and runtimes. The library is hybrid ESM / Common.js package.

```js
import { base16, base32, base64, base58 } from '@scure/base';
// Flavors
import {
  base58xmr,
  base58xrp,
  base32nopad,
  base32hex,
  base32hexnopad,
  base32crockford,
  base64nopad,
  base64url,
  base64urlnopad,
} from '@scure/base';

const data = Uint8Array.from([1, 2, 3]);
base64.decode(base64.encode(data));

// Convert utf8 string to Uint8Array
const data2 = new TextEncoder().encode('hello');
base58.encode(data2);

// Everything has the same API except for bech32 and base58check
base32.encode(data);
base16.encode(data);
base32hex.encode(data);
```

base58check is a special case: you need to pass `sha256()` function:

> `npm install @noble/hashes`

```js
import { createBase58check } from '@scure/base';
import { sha256 } from '@noble/hashes/sha2.js';

const data = Uint8Array.from([1, 2, 3]);
createBase58check(sha256).encode(data);
```


## Bech32, Bech32m and Bitcoin

```js
import { bech32 } from '@scure/base';

const words = bech32.toWords(new TextEncoder().encode('hello'));
const addr = bech32.encode('test', words);
console.log(addr); // "test1w508d6qejxtdg4"

const { prefix, words: decoded } = bech32.decode(addr);
console.log(prefix); // "test"
console.log(new TextDecoder().decode(bech32.fromWords(decoded))); // "hello"

console.log(bech32.decodeUnsafe('invalid')); // undefined

```

We provide low-level bech32 operations.
If you need high-level methods for BTC (addresses, and others), use
[scure-btc-signer](https://github.com/paulmillr/scure-btc-signer) instead.

Bitcoin addresses use both 5-bit words and bytes representations.
They can't be parsed using `bech32.decodeToBytes`.

Same applies to Lightning Invoice Protocol
[BOLT-11](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md).
We have many tests in `./test/bip173.test.js` that serve as minimal examples of
Bitcoin address and Lightning Invoice Protocol parsers.
Keep in mind that you'll need to verify the examples before using them in your code.

Do something like this:

```ts
import { bech32 } from '@scure/base';

const address = bech32.encode('bc', [0, ...bech32.toWords(new Uint8Array(20))]);
const decoded = bech32.decode(address);
// NOTE: words in bitcoin addresses contain version as first element,
// with actual witness program words in rest
// BIP-141: The value of the first push is called the "version byte".
// The following byte vector pushed is called the "witness program".
const [version, ...dataW] = decoded.words;
const program = bech32.fromWords(dataW); // actual witness program
```

## Design rationale

The code may feel unnecessarily complicated; but actually it's much easier to reason about.
Any encoding library consists of two functions:

```
encode(A) -> B
decode(B) -> A
  where X = decode(encode(X))
  # encode(decode(X)) can be !== X!
  # because decoding can normalize input

e.g.
base58checksum = {
  encode(): {
    // checksum
    // radix conversion
    // alphabet
  },
  decode(): {
    // alphabet
    // radix conversion
    // checksum
  }
}
```

But instead of creating two big functions for each specific case,
we create them from tiny composable building blocks:

```
base58checksum = chain(checksum(), radix(), alphabet())
```

Which is the same as chain/pipe/sequence function in Functional Programming,
but significantly more useful since it enforces same order of execution of encode/decode.
Basically you only define encode (in declarative way) and get correct decode for free.
So, instead of reasoning about two big functions you need only reason about primitives and encode chain.
The design revealed obvious bug in older version of the lib,
where xmr version of base58 had errors in decode's block processing.

Besides base-encodings, we can reuse the same approach with any encode/decode function
(`bytes2number`, `bytes2u32`, etc).
For example, you can easily encode entropy to mnemonic (BIP-39):

```ts
export function getCoder(wordlist: string[]) {
  if (!Array.isArray(wordlist) || wordlist.length !== 2 ** 11 || typeof wordlist[0] !== 'string') {
    throw new Error('Wordlist: expected array of 2048 strings');
  }
  return mbc.chain(mbu.checksum(1, checksum), mbu.radix2(11, true), mbu.alphabet(wordlist));
}
```

### base58 is O(n^2) and radixes

`Uint8Array` is represented as big-endian number:

```
[1, 2, 3, 4, 5] -> 1*(256**4) + 2*(256**3) 3*(256**2) + 4*(256**1) + 5*(256**0)
where 256 = 2**8 (8 bits per byte)
```

which is then converted to a number in another radix/base (16/32/58/64, etc).

However, generic conversion between bases has [quadratic O(n^2) time complexity](https://cs.stackexchange.com/q/21799).

Which means base58 has quadratic time complexity too. Use base58 only when you have small
constant sized input, because variable length sized input from user can cause DoS.

On the other hand, if both bases are power of same number (like `2**8 <-> 2**64`),
there is linear algorithm. For now we have implementation for power-of-two bases only (radix2).

## Security

The library has been audited:

- at version 2.2.0, in Apr 2026, by ourselves (self-audited)
  - Scope: everything
  - [Changes since audit](https://github.com/paulmillr/scure-base/compare/2.2.0..main)
- at version 1.0.0, in Jan 2022, independently, by [cure53](https://cure53.de)
  - PDFs: [online](https://cure53.de/pentest-report_hashing-libs.pdf), [offline](./audit/2022-01-05-cure53-audit-nbl2.pdf)
  - The audit has been funded by [Ethereum Foundation](https://ethereum.org/en/) with help of [Nomic Labs](https://nomiclabs.io)

The library was initially developed for [js-ethereum-cryptography](https://github.com/ethereum/js-ethereum-cryptography).
At commit [ae00e6d7](https://github.com/ethereum/js-ethereum-cryptography/commit/ae00e6d7d24fb3c76a1c7fe10039f6ecd120b77e),
it was extracted to a separate package called `micro-base`.
After the audit we've decided to use `@scure` NPM namespace for security.

### Supply chain security

- **Commits** are signed with PGP keys to prevent forgery. Be sure to verify the commit signatures
- **Releases** are made transparently through token-less GitHub CI and Trusted Publishing. Be sure to verify the [provenance logs](https://docs.npmjs.com/generating-provenance-statements) for authenticity.
- **Rare releasing** is practiced to minimize the need for re-audits by end-users.
- **Dependencies** are minimized and strictly pinned to reduce supply-chain risk.
  - We use as few dependencies as possible.
  - Version ranges are locked, and changes are checked with npm-diff.
- **Dev dependencies** are excluded from end-user installs; they’re only used for development and build steps.

For this package, there are 0 dependencies; and a few dev dependencies:

- jsbt is used for benchmarking / testing / build tooling and developed by the same author
- prettier, fast-check and typescript are used for code quality / test generation / ts compilation

## Contributing & testing

- `npm install && npm run build && npm test` will build the code and run tests.
- `npm run lint` / `npm run format` will run linter / fix linter issues.
- `npm run build:release` will build single file

### Projects using scure-base

- [scure-btc-signer](https://github.com/paulmillr/scure-btc-signer)
- [prefixed-api-key](https://github.com/truestamp/prefixed-api-key)
- [coinspace](https://github.com/CoinSpace/CoinSpace) wallet and its modules:
  [ada](https://github.com/CoinSpace/cs-cardano-wallet),
  [btc](https://github.com/CoinSpace/cs-bitcoin-wallet)
  [eos](https://github.com/CoinSpace/cs-eos-wallet),
  [sol](https://github.com/CoinSpace/cs-solana-wallet),
  [xmr](https://github.com/CoinSpace/cs-monero-wallet)

## License

MIT (c) Paul Miller [(https://paulmillr.com)](https://paulmillr.com), see LICENSE file.
