# Changelog for scure-base

## 2.4.0 (2026-08-28)

- Added `base36` coder (lowercase alphanumeric, multibase `k` payload as used by IPFS/IPNS addresses)
- Limit base58 and base36 to 2048 bytes due to quadratic complexity. Real-world inputs are less than that.
- `bech32.decodeToBytes` / `bech32m.decodeToBytes` now enforce the 90-char BIP-173 length limit by default (previously unbounded); pass `limit: false` or a number to override
- `bech32`/`bech32m`: `encode` rejects non-printable-ASCII prefixes, and `decode` rejects non-printable-ASCII input instead of letting case folding normalize non-ASCII characters into valid strings
- `base32crockford.decode`: non-ASCII input that only becomes valid via case folding is now rejected

## 2.3.0 (2026-08-08)

- Massive speed-up of all algorithms. 1 MB speed:
    - base64 encode: 18x, 22mb/s => 395 mb/s
    - base32 encode: 23x, 16mb/s => 367 mb/s
    - base16 encode: 20x, 15mb/s => 294 mb/s
    - bech32 toWords: 8x, 38mb/s => 296 mb/s
    - base58 decode: 8x,  8mb/s  => 67.2 mb/s
- -3.4% reduce of minified bundle size. 
- Reduce on-disk package size: 163kb → 136kb (-27.4kb), by disabling source maps (they became less relevant).
- Better error messages and stricter type checks
- **Breaking:** we've removed **internal** utils: `utils`, `bytesToString` / `str`, `stringToBytes` / `bytes`,
  and the `SomeCoders` type. Those were always internal. The coders (`base16`, `base64`, …) are unaffected.

## 2.2.0 (2026-04-21)

* **April 2026 self-audit** (all files): no major issues found
  * Audited for spec compliance and security
* Fix all Byte Array types, to ensure proper work in both TypeScript 5.6 & TypeScript 5.9+
  * TS 5.6 has `Uint8Array`, while TS 5.9+ made it generic `Uint8Array<ArrayBuffer>`
  * This creates incompatibility of code between versions
  * Previously, it was hard to use and constantly emitted errors similar to `TS2345`
  * See [typescript#62240](https://github.com/microsoft/TypeScript/issues/62240) for more context
* Fix compilation issues on TypeScript v6
* Improve tree-shaking, reduce bundle sizes
* utf8: make decoder strict, use isWellFormed (polyfilled in some envs)
* Add strict ascii decoder (char range 0..127)
* Bech32 examples in the docs by @davay42 in https://github.com/paulmillr/scure-base/pull/44
* Add overload to Bech32.decode to handle arbitrary string input by @webmaster128 in https://github.com/paulmillr/scure-base/pull/45
* perf: trust Uint8Array.fromBase64 to check non-whitespace chars by @ChALkeR in https://github.com/paulmillr/scure-base/pull/47

### New Contributors
* @davay42 made their first contribution in https://github.com/paulmillr/scure-base/pull/44
* @webmaster128 made their first contribution in https://github.com/paulmillr/scure-base/pull/45
* @ChALkeR made their first contribution in https://github.com/paulmillr/scure-base/pull/47

*(We're skipping v2.1, to align with other noble / scure packages)*

## 2.0.0 (2025-08-25)

- The package is now ESM-only. ESM can finally be loaded from common.js on node v20.19+
    - Node v20.19 is now the minimum required version
    - Package imports now work correctly in bundler-less environments, such as browsers
    - Reduces npm package size (traffic consumed): 26.1KB => 24.5KB
    - Reduces unpacked npm size (on-disk space): 165KB => 102KB
- Make bundle sizes smaller, compared to v1.x
- Upgrade typescript compilation env to ts5.9 and es2022

## 1.2.6 (2025-05-29)

* base64: prohibit spaces when native mode is selected.

## 1.2.5 (2025-04-24)

- base64: use native coding [when available](https://caniuse.com/mdn-javascript_builtins_uint8array_frombase64). 167x faster encoding on 1KB inputs
- hex: use native coding [when available](https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex). 216x faster encoding on 1KB inputs.
- Standalone build files are now attested and can be verified, check out README

## 1.2.4 (2025-01-18)

Fix broken common.js version

## 1.2.3 (2025-01-18)

- Fix unpublished common.js version

## 1.2.2 (2025-01-18)

- Publish to JSR.io
- Use typescript isolatedDeclarations and "safe types" for automatically generated documentation
- Use typescript verbatimModuleSyntax to support native type stripping

## 1.2.1 (2024-11-23)

- Bring back NO_SIDE_EFFECTS directive for tree-shaking.
- Optimize performance

## 1.2.0 (2024-11-22)

Improve encoding and decoding speed up to 4x. Decoding speed benchmarks:

  - 32B hex: 240,442 => 1,046,025 ops per second
  - 8KB hex: 1,026 => 4,096
  - 32B base64: 346,981 => 1,148,105
  - 8KB base64: 1,482 => 5,394

Reduce minified size. Speed-up bytes testing.

## 1.1.9 (2024-09-18)

* Add Bech32.encodeFromBytes
* Fix typeof Bech32.encode

## 1.1.8 (2024-09-03)

### What's Changed
* Add Bech32 interface. Use explicit types for jsr
* Improve esm / typescript compatibility

### New Contributors
* @Sjlver made their first contribution in https://github.com/paulmillr/scure-base/pull/35

## 1.1.7 (2024-06-13)

### What's Changed
* Add base32nopad and base32hexnopad by @benjreinhart in https://github.com/paulmillr/scure-base/pull/34
* Remove wrong pure annotation for rollup. Closes gh-31
* pkg.json: add source maps. Closes gh-32

### New Contributors
* @benjreinhart made their first contribution in https://github.com/paulmillr/scure-base/pull/34

## 1.1.6 (2024-03-20)

* Refactor bech32 a bit https://github.com/paulmillr/scure-base/pull/27
* fix: bech32 prefix length by @mahnunchik in https://github.com/paulmillr/scure-base/pull/28
* Add base64nopad by @FiloSottile in https://github.com/paulmillr/scure-base/pull/29

### New Contributors
* @FiloSottile made their first contribution in https://github.com/paulmillr/scure-base/pull/29

## 1.1.5 (2023-12-13)

utils: export `convertRadix` and `convertRadix2`

## 1.1.4 (2023-12-11)

* fix: error messages (strings => numbers) by @mahnunchik in https://github.com/paulmillr/scure-base/pull/23
* refine: branchless `chain` by @imcotton in https://github.com/paulmillr/scure-base/pull/26
* Improve `Uint8Array` type check reliability in bad, jsdom-like environments

### New Contributors
* @mahnunchik made their first contribution in https://github.com/paulmillr/scure-base/pull/23
* @imcotton made their first contribution in https://github.com/paulmillr/scure-base/pull/26

## 1.1.3 (2023-08-31)

- bech32: fix type issue introduced by gh-15

## 1.1.2 (2023-08-25)

* Add `base64urlnopad`
* Improve tree-shaking, reduce package size by utilizing pure functions and `sideEffects: false`
* Add TS types field to exports map by @jacogr in https://github.com/paulmillr/scure-base/pull/9
* bech32: use template literal typescript type by @alexgleason in https://github.com/paulmillr/scure-base/pull/15
* Add deno `mod.ts`
* docs(readme): add example usage by @sambacha in https://github.com/paulmillr/scure-base/pull/19

### New Contributors
* @jacogr made their first contribution in https://github.com/paulmillr/scure-base/pull/9
* @alexgleason made their first contribution in https://github.com/paulmillr/scure-base/pull/15
* @sambacha made their first contribution in https://github.com/paulmillr/scure-base/pull/19

## 1.1.1 (2022-06-20)

Fix ESM support

## 1.1.0 (2022-06-12)

- Improve ESM support
- Remove viral `esModuleInterop` option from typescript compiling

## 1.0.0 (2022-06-12)

First stable post-audit release

## 0.9.0 (2021-10-27)

- Initial release
