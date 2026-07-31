# scure-base

Audited & minimal implementation of bech32, base64, base58, base32 & base16.

- 🔒 [Audited](#security) by an independent security firm
- 🔻 Tree-shakeable: unused code is excluded from your builds
- 🏎 Fast: hand-optimized for caveats of JS engines
- 🛡️ [Strict](#strict-decoding): decoding rejects non-canonical padding and unknown characters
- ✍️ Written in [functional style](#design-rationale), easily composable, uses native methods when available
- 🪶 4KB (gzipped)

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

- [Codecs](#codecs)
- [base58check](#base58check)
- [Bech32, Bech32m and Bitcoin](#bech32-bech32m-and-bitcoin)
- [hex, utf8 and ascii](#hex-utf8-and-ascii)
- [Strict decoding](#strict-decoding)
- [Design rationale](#design-rationale)
- [Security](#security)
- [Speed](#speed)
- [License](#license)

### Codecs

Every codec has the same API: `encode(bytes: Uint8Array): string` and
`decode(str: string): Uint8Array`. Invalid input throws `Error` —
see [Strict decoding](#strict-decoding). Exceptions are bech32 / bech32m
(words-based API) and base58check (requires external sha256); both are
described below.

| Codec                            | Spec                                                                       | Padding  | Notes                                                                         |
| :------------------------------- | :------------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------------- |
| `base16`                         | RFC 4648 §8                                                                | —        | Uppercase; decode is case-sensitive. Use `hex` for case-insensitive decoding  |
| `hex`                            | —                                                                          | —        | Lowercase; decode accepts both cases. Native `Uint8Array.fromHex` when available |
| `base32`, `base32nopad`          | RFC 4648 §6                                                                | `=` / no | Uppercase; decode is case-sensitive                                            |
| `base32hex`, `base32hexnopad`    | RFC 4648 §7                                                                | `=` / no | Different alphabet ordering than `base32`                                      |
| `base32crockford`                | [Crockford](https://www.crockford.com/base32.html)                         | —        | Decode is case-insensitive and normalizes `O→0`, `I→1`, `L→1`                  |
| `base64`, `base64nopad`          | RFC 4648 §4                                                                | `=` / no | Native `Uint8Array.fromBase64` when available                                  |
| `base64url`, `base64urlnopad`    | RFC 4648 §5                                                                | `=` / no | URL-safe alphabet; native builtin when available                               |
| `base58`, `base58flickr`, `base58xrp` | [draft-msporny](https://www.ietf.org/archive/id/draft-msporny-base58-03.txt) | —   | O(n²), only for small constant-size inputs — see [below](#base58-is-on2-and-radixes) |
| `base58xmr`                      | Monero                                                                     | —        | Processes 8-byte blocks, which makes it linear                                 |
| `createBase58check(sha256)`      | [Base58check](https://en.bitcoin.it/wiki/Base58Check_encoding)             | —        | Returns a codec; caller injects sha256                                         |
| `bech32`, `bech32m`              | BIP173, BIP350                                                             | —        | Words-based API with `(prefix, words)`                                         |
| `utf8`, `ascii`                  | —                                                                          | —        | String ↔ bytes coders, strict validation                                       |

```js
import { base16, base32, base64, base58 } from '@scure/base';
// Flavors
import {
  base58flickr,
  base58xmr,
  base58xrp,
  base32nopad,
  base32hex,
  base32hexnopad,
  base32crockford,
  base64nopad,
  base64url,
  base64urlnopad,
  hex,
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

Also, the internal export `__TESTS.base64Fallback` is identical to `base64`, but never uses native code.

### base58check

base58check is a special case: you need to pass `sha256()` function:

> `npm install @noble/hashes`

```js
import { createBase58check } from '@scure/base';
import { sha256 } from '@noble/hashes/sha2.js';

const base58check = createBase58check(sha256);

const data = Uint8Array.from([1, 2, 3]);
base58check.encode(data);
```

### Bech32, Bech32m and Bitcoin

```js
import { bech32, bech32m } from '@scure/base';

const words = bech32.toWords(new TextEncoder().encode('hello'));
const addr = bech32.encode('test', words);
console.log(addr); // "test1dpjkcmr09ys0qs"

const { prefix, words: decoded } = bech32.decode(addr);
console.log(prefix); // "test"
console.log(new TextDecoder().decode(bech32.fromWords(decoded))); // "hello"

console.log(bech32.decodeUnsafe('invalid')); // undefined, instead of throwing

// bech32m (BIP350) has the same API
bech32m.decode(bech32m.encode('test', words));

// Shortcuts which convert bytes to words and back for you
const addr2 = bech32.encodeFromBytes('test', new TextEncoder().encode('hello'));
const { bytes } = bech32.decodeToBytes(addr2);
```

Per BIP173, encoded strings are limited to 90 characters. `encode` and `decode`
accept an optional `limit` argument to raise the limit (Lightning invoices are
longer), or `false` to disable it entirely.

We provide low-level bech32 operations.
If you need high-level methods for BTC (addresses, and others), use
[scure-btc-signer](https://github.com/paulmillr/scure-btc-signer) instead.

Bitcoin addresses use both 5-bit words and bytes representations.
They can't be parsed using `bech32.decodeToBytes`.

Same applies to Lightning Invoice Protocol
[BOLT-11](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md).
We have many tests in `./test/bip173.test.ts` that serve as minimal examples of
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

### hex, utf8 and ascii

`hex`, `utf8` and `ascii` are string ↔ bytes coders. They follow the same
`BytesCoder` interface, so `encode` takes bytes and returns a string,
while `decode` takes a string and returns bytes:

```js
import { hex, utf8, ascii } from '@scure/base';

hex.decode('0102ff'); // Uint8Array([1, 2, 255]); accepts "0102FF" too
hex.encode(Uint8Array.from([1, 2, 255])); // "0102ff", always lowercase

utf8.decode('hey'); // Uint8Array([104, 101, 121])
utf8.encode(Uint8Array.from([104, 101, 121])); // "hey"

ascii.decode('ABC'); // Uint8Array([65, 66, 67])
```

Unlike `base16`, `hex` emits lowercase and decodes either case, matching
Node.js `Buffer` hex strings. `utf8` is strict: it throws on invalid UTF-8
bytes and on malformed UTF-16 strings with lone surrogates, instead of
silently emitting replacement characters. `ascii` rejects anything outside
of 7-bit ASCII.

`hex`, `base64` and `base64url` transparently use native
`Uint8Array.fromHex` / `fromBase64` builtins when the runtime provides them,
falling back to the pure-JS implementation otherwise. Validation behavior is
identical on both paths.

### Strict decoding

If `decode(str)` succeeds, the input was canonical, with a small documented
set of normalizations (`hex` and `base32crockford` case-folding, bech32
accepting all-uppercase strings). Everything else throws:

- Unknown characters, including whitespace: `base64.decode('aGk=\n')` throws
- Non-canonical or missing padding: `base64.decode('aGk')` throws (use `base64nopad`)
- Non-zero bits in the final partial group: `base64.decode('aGl=')` throws
- Mixed-case bech32 strings, per BIP173
- Wrong input types: passing a non-string to `decode` or a non-`Uint8Array` to `encode` throws

This matters for security-sensitive code: malleable encodings enable
transaction-ID and signature malleability, cache-poisoning and
double-spending of allowlists. It also guarantees `encode(decode(str))`
either returns an equivalent canonical string or throws — unlike `atob`,
which accepts and silently normalizes malformed input.

## Design rationale

The code may look unnecessarily complicated; but the structure actually makes
it much easier to reason about. Any encoding library consists of two functions:

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
we create them from tiny composable building blocks
(`alphabet`, `radix`, `padding`, `checksum`, `chain`):

```
base58checksum = chain(checksum(), radix(), alphabet())
```

Which is the same as chain/pipe/sequence function in Functional Programming,
but significantly more useful since it enforces same order of execution of encode/decode.
Basically you only define encode (in declarative way) and get correct decode for free.
So, instead of reasoning about two big functions you need only reason about primitives and encode chain.
The design revealed obvious bug in older version of the lib,
where xmr version of base58 had errors in decode's block processing.

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
`base58xmr` sidesteps the issue differently: it encodes in fixed 8-byte blocks,
which keeps it linear at the cost of a slightly different (Monero-specific) format.

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

## Speed

Run benchmarks with `npm run benchmark`. Results on Apple M4, Node.js v24:

```
base16 encode x 344 mib/sec
base16 decode x 142 mib/sec
base32 encode x 427 mib/sec
base32 decode x 165 mib/sec
base64 encode x 18.7 gib/sec
base64 decode x 6.63 gib/sec
base64nopad encode x 486 mib/sec
base64nopad decode x 214 mib/sec
base58 encode 32 B x 32.2 mib/sec
base58 decode 32 B x 60.2 mib/sec
utf8 encode x 1.81 gib/sec
utf8 decode x 1.78 gib/sec
bech32 toWords x 351 mib/sec
bech32 fromWords x 161 mib/sec
```

## License

MIT (c) Paul Miller [(https://paulmillr.com)](https://paulmillr.com), see LICENSE file.
