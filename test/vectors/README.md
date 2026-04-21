# Test Vectors

This directory contains checked-in test data used by `scure-base` tests.

## UTF-8 / TextEncoder / TextDecoder

- Extracted from the local checkout of `web-platform-tests/wpt`
  - repo: `https://github.com/web-platform-tests/wpt`
  - commit: `ac2702c221740523e04191b2fb232b53d5f84e71`
- Source files used for the extracted vectors in `utf8/`:
  - `encoding/textdecoder-fatal.any.js`
  - `encoding/textdecoder-byte-order-marks.any.js`
  - `encoding/textdecoder-ignorebom.any.js`
  - `encoding/textencoder-utf16-surrogates.any.js`
  - `encoding/api-surrogates-utf8.any.js`
  - `encoding/encodeInto.any.js`
- Files created from those sources:
  - `utf8/decoder-fatal.json`
    - invalid UTF-8 byte sequences that `TextDecoder(..., { fatal: true })` must reject
  - `utf8/decoder-bom.json`
    - BOM, `ignoreBOM`, and canonical UTF-8 BOM handling cases
  - `utf8/encoder-surrogates.json`
    - `TextEncoder` / UTF-8 handling for lone surrogates, swapped pairs, valid pairs, and default input
  - `utf8/encode-into.json`
    - `TextEncoder#encodeInto` read/written fixtures
