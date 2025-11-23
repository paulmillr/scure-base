import { describe, should } from '@paulmillr/jsbt/test.js';
import { deepStrictEqual as eql, throws } from 'node:assert';
import { Buffer } from 'node:buffer';
import { bech32, bech32m } from '../index.ts';

const VALID = [
  ['BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4', '751e76e8199196d454941c45d1b3a323f1433bd6'],
  [
    'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7',
    '1863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262',
  ],
  ['BC1SW50QA3JX3S', '751e'],
  ['bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj', '751e76e8199196d454941c45d1b3a323'],
  [
    'tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy',
    '000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433',
  ],
];

const INVALID = [
  [
    'an84characterslonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1569pvx',
    'overall max length exceeded',
  ],
  ['pzry9x0s0muk', 'No separator character'],
  ['1pzry9x0s0muk', 'Empty HRP'],
  ['x1b4n0q5v', 'Invalid data character'],
  ['li1dgmt3', 'Too short checksum'],
  ['A1G7SGD8', 'checksum calculated with uppercase form of HRP'],
  ['10a06t8', 'empty HRP'],
  ['1qzzfhee', 'empty HRP'],
  ['bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5', 'Invalid checksum'],
  ['BC13W508D6QEJXTDG4Y5R3ZARVARY0C5XW7KN40WF2', 'Invalid witness version'],
  ['bc1rw5uspcuh', 'Invalid program length'],
  [
    'bc10w508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kw5rljs90',
    'Invalid program length',
  ],
  ['bc1zw508d6qejxtdg4y5r3zarvaryvqyzf3du', 'zero padding of more than 4 bits'],
  [
    'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3pjxtptv',
    'Non-zero padding in 8-to-5 conversion',
  ],
  ['bc1gmk9yu', 'Empty data section'],
];

// GH-17
function decodeBtc(address) {
  const decoded = bech32.decode(address);
  // NOTE: words in bitcoin addresses contain version as first element,
  // with actual witnes program words in rest
  // BIP-141: The value of the first push is called the "version byte".
  // The following byte vector pushed is called the "witness program".
  const [ver] = decoded.words;
  const dataW = decoded.words.subarray(1)
  // MUST verify that the first decoded data value (the witness version)
  // is between 0 and 16, inclusive.
  if (ver < 0 || ver > 16) throw new Error('wrong version');
  const program = bech32.fromWords(dataW);
  // BIP141 specifies If the version byte is 0, but the witness program
  // is neither 20 nor 32 bytes, the script must fail.
  if (ver === 0 && program.length !== 20 && program.length !== 32)
    throw new Error('wrong program length');
  //  followed by a data push between 2 and 40 bytes gets a new special meaning.
  if (program.length < 2 || program.length > 40) throw new Error('wrong program length');
  return Buffer.from(program).toString('hex');
}

describe('bip173', () => {
  describe('valid', () => {
    for (const [v, hex] of VALID) {
      should(`valid ${v}`, () => eql(decodeBtc(v), hex));
    }
  });
  for (const [v, description] of INVALID) {
    should(`invalid: ${v} (${description})`, () => throws(() => decodeBtc(v)));
  }
});

// Official vectors include checksum by some reason, and we don't export
// checksum from parser. We cross-tested against official demo at
// https://bitcoin.sipa.be/bech32/demo/demo.html
// prettier-ignore
const VALID_BIP350 = [
  // [address, realHex, hexWithChecksumFromBip350]
  [
    'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4',
        '751e76e8199196d454941c45d1b3a323f1433bd6',
    '0014751e76e8199196d454941c45d1b3a323f1433bd6',
  ],
  [
    'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7',
        '1863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262',
    '00201863143c14c5166804bd19203356da136c985678cd4d27a1b8c6329604903262',
  ],
  [
    'bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7kt5nd6y',
        '751e76e8199196d454941c45d1b3a323f1433bd6751e76e8199196d454941c45d1b3a323f1433bd6',
    '5128751e76e8199196d454941c45d1b3a323f1433bd6751e76e8199196d454941c45d1b3a323f1433bd6',
  ],
  [
    'BC1SW50QGDZ25J',
        '751e',
    '6002751e'
  ],
  ['bc1zw508d6qejxtdg4y5r3zarvaryvaxxpcs',
        '751e76e8199196d454941c45d1b3a323',
    '5210751e76e8199196d454941c45d1b3a323'
  ],
  [
    'tb1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy',
        '000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433',
    '0020000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433',
  ],
  [
    'tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c',
        '000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433',
    '5120000000c4a5cad46221b2a187905e5266362b99d5e91c6ce24d165dab93e86433',
  ],
  [
    'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
        '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    '512079be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  ],
];

const INVALID_BIP350 = [
  ['tc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq5zuyut', 'Invalid human-readable part'],
  [
    'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd',
    'Invalid checksum (Bech32 instead of Bech32m)',
  ],
  [
    'tb1z0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqglt7rf',
    'Invalid checksum (Bech32 instead of Bech32m)',
  ],
  [
    'BC1S0XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ54WELL',
    'Invalid checksum (Bech32 instead of Bech32m)',
  ],
  ['bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kemeawh', 'Invalid checksum (Bech32m instead of Bech32)'],
  [
    'tb1q0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq24jc47',
    'Invalid checksum (Bech32m instead of Bech32)',
  ],
  [
    'bc1p38j9r5y49hruaue7wxjce0updqjuyyx0kh56v8s25huc6995vvpql3jow4',
    'Invalid character in checksum',
  ],
  ['BC130XLXVLHEMJA6C4DQV22UAPCTQUPFHLXM9H8Z3K2E72Q4K9HCZ7VQ7ZWS8R', 'Invalid witness version'],
  ['bc1pw5dgrnzv', 'Invalid program length (1 byte)'],
  [
    'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v8n0nx0muaewav253zgeav',
    'Invalid program length (41 bytes)',
  ],
  [
    'BC1QR508D6QEJXTDG4Y5R3ZARVARYV98GJ9P',
    'Invalid program length for witness version 0 (per BIP141)',
  ],
  ['tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vq47Zagq', 'Mixed case'],
  [
    'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7v07qwwzcrf',
    'zero padding of more than 4 bits',
  ],
  [
    'tb1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vpggkg4j',
    'Non-zero padding in 8-to-5 conversion',
  ],
  ['bc1gmk9yu', 'Empty data section'],
];

function decodeBtc350(address) {
  let decoded,
    err,
    isb32m = false;
  try {
    decoded = bech32.decode(address);
  } catch (err) {
    err = err;
  }
  try {
    decoded = bech32m.decode(address);
    isb32m = true;
  } catch (err) {
    err = err;
  }
  if (!decoded) throw err;
  // The human-readable part "bc"[7] for mainnet, and "tb"[8] for testnet.
  if (!['bc', 'tb'].includes(decoded.prefix)) throw new Error('Invalid prefix');
  const [ver] = decoded.words;
  const dataW = decoded.words.subarray(1);
  if (isb32m && ver === 0) throw new Error('Witness program version 0 should use bech32');
  if (!isb32m && ver >= 1) throw new Error('Witness program with version >=1 should use bech32m');
  // MUST verify that the first decoded data value (the witness version)
  // is between 0 and 16, inclusive.
  if (ver < 0 || ver > 16) throw new Error('wrong version');
  // NOTE: words in bitcoin addresses contain version as first element,
  // with actual witnes program words in rest
  // BIP-141: The value of the first push is called the "version byte".
  // The following byte vector pushed is called the "witness program".
  const program = (isb32m ? bech32m : bech32).fromWords(dataW);
  // BIP141 specifies If the version byte is 0, but the witness program
  // is neither 20 nor 32 bytes, the script must fail.
  if (ver === 0 && program.length !== 20 && program.length !== 32)
    throw new Error('wrong program length');
  // followed by a data push between 2 and 40 bytes gets a new special meaning.
  if (program.length < 2 || program.length > 40) throw new Error('wrong program length');
  return Buffer.from(program).toString('hex');
}

describe('bip350', () => {
  describe('valid', () => {
    for (const [v, hex] of VALID_BIP350) {
      should(`valid ${v}`, () => eql(decodeBtc350(v), hex));
    }
  });
  for (const [v, description] of INVALID_BIP350) {
    should(`invalid: ${v} (${description})`, () => throws(() => decodeBtc350(v)));
  }
});

// BOLT11 (https://github.com/lightning/bolts/blob/master/11-payment-encoding.md)
// NOTE: this is just example how parsing can be done,
// it is not a production-ready library for parsing lightning invoices.
// This protocol uses 5-bit words as is for significant part of parser and
// convert to bytes only inside tagged fields. Can be very nice small parser
// using micro-packed, but unfortunately micro-packed only works with bytes
// for now, and this protocol is based on 5-bit words.
should('lightning invoices (GH-18)', () => {
  /*
URL: https://lightningdecoder.com/lnbc1u1pjvy84epp5zrapr3w7tqelvjzwm0rwsac2ga79m982uruducydr2u6zwlhpasqhp5fe47lwjexge0lff7ru2g6757g35qajscy39hsz4dvqe97gnt3d3scqzzsxqyz5vqsp5ptv9dz544r5pxd3gkulqelakrtmx4nf47xw4mmm8a0u8j2up7mqs9qyyssqumxjespzkuwzdppw3hzkawgdedjyu2e0wnsk3t3y8g7mkpz49nn9rlrzsj07tz3hjnld80j749069puz9uanhr55p9ngw46cy2w295qpktsz9y
Recovery Flag: 1
Transaction Signature:
e6cd2cc022b71c26842e8dc56eb90dcb644e2b2f74e168ae243a3dbb04552ce651fc62849fe58a3794fed3be5ea95fa287822f3b3b8e940966875758229ca2d0
Timestamp: 1690443449
Payment Hash
10fa11c5de5833f6484edbc6e8770a477c5d94eae0f8de608d1ab9a13bf70f60
Commit Hash
4e6befba593232ffa53e1f148d7a9e44680eca18244b780aad60325f226b8b63
Minimum Final CLTV Expiry
80
Expire Time
86400
  */
  const test_enc =
    'lnbc1u1pjvy84epp5zrapr3w7tqelvjzwm0rwsac2ga79m982uruducydr2u6zwlhpasqhp5fe47lwjexge0lff7ru2g6757g35qajscy39hsz4dvqe97gnt3d3scqzzsxqyz5vqsp5ptv9dz544r5pxd3gkulqelakrtmx4nf47xw4mmm8a0u8j2up7mqs9qyyssqumxjespzkuwzdppw3hzkawgdedjyu2e0wnsk3t3y8g7mkpz49nn9rlrzsj07tz3hjnld80j749069puz9uanhr55p9ngw46cy2w295qpktsz9y';
  const decoded = bech32.decode(test_enc, false); // Disable length limit
  // lnbc -- mainnet
  // amount: 1
  // quantity: u (micro): multiply by 0.000001
  eql(decoded.prefix, 'lnbc1u');
  // signature: Bitcoin-style signature of above (520 bits), 104 words
  const sigTmp = decoded.words.slice(-104);
  const recoveryFlag = decoded.words[decoded.words.length - 1];
  eql(recoveryFlag, 1, 'Recovery Flag');
  const signature = bech32.fromWords(sigTmp.slice(0, -1)); // Strip recovery flag
  eql(signature.length, 64);
  eql(
    Buffer.from(signature).toString('hex'),
    'e6cd2cc022b71c26842e8dc56eb90dcb644e2b2f74e168ae243a3dbb04552ce651fc62849fe58a3794fed3be5ea95fa287822f3b3b8e940966875758229ca2d0',
    'Transaction Signature'
  );
  // Convert array of 5 bit words to big-endian number
  const toInt = (words) => {
    // 2**52 < Number.MAX_SAFE_INTEGER = true
    // 10x5bits maximum (would be 2**50). 2**55 is not safe.
    if (words.length <= 0 || words.length > 10) throw new Error('Words array should be (0, 10]');
    let res = 0;
    for (let i = 0; i < words.length; i++) {
      res += words[i];
      // Cannot use shifts here, since number can be bigger than 32 bits
      if (i !== words.length - 1) res *= 2 ** 5;
    }
    return res;
  };
  // timestamp: seconds-since-1970 (35 bits, big-endian), 7 words
  const ts = toInt(decoded.words.slice(0, 7));
  eql(ts, 1690443449, 'Timestamp');
  // zero or more tagged parts
  let words = decoded.words.slice(7, -104); // without signature && timestamp
  const tags = [];
  while (words.length) {
    const tag = words[0];
    words = words.slice(1); // skip tag
    const len = toInt(words.slice(0, 2));
    words = words.slice(2); // skip tagLength
    const data = words.slice(0, len);
    tags.push({ tag, data });
    words = words.slice(len); // skip data
  }
  // p (1): data_length 52. 256-bit SHA256 payment_hash. Preimage of this
  // provides proof of payment.
  eql(tags[0].tag, 1); // tagged type: preimage
  const preimage = bech32.fromWords(tags[0].data);
  eql(
    Buffer.from(preimage).toString('hex'),
    '10fa11c5de5833f6484edbc6e8770a477c5d94eae0f8de608d1ab9a13bf70f60',
    'Payment Hash'
  );
  // h (23): data_length 52. 256-bit description of purpose of payment (SHA256).
  // This is used to commit to an associated description that is over 639 bytes,
  // but the transport mechanism for the description in that case is transport
  // specific and not defined here.
  eql(tags[1].tag, 23);
  const h = bech32.fromWords(tags[1].data);
  eql(
    Buffer.from(h).toString('hex'),
    '4e6befba593232ffa53e1f148d7a9e44680eca18244b780aad60325f226b8b63',
    'Commit Hash'
  );
  // c (24): data_length variable. min_final_cltv_expiry_delta to use for the
  // last HTLC in the route. Default is 18 if not specified.
  eql(tags[2].tag, 24);
  eql(toInt(tags[2].data), 80);
  // x (6): data_length variable. expiry time in seconds (big-endian). Default
  // is 3600 (1 hour) if not specified.
  eql(tags[3].tag, 6);
  eql(toInt(tags[3].data), 86400);
  // s (16): data_length 52. This 256-bit secret
  // prevents forwarding nodes from probing the payment recipient.
  eql(tags[4].tag, 16);
  // NOTE: Not shown in web decoder
  eql(
    Buffer.from(bech32.fromWords(tags[4].data)).toString('hex'),
    '0ad8568a95a8e8133628b73e0cffb61af66acd35f19d5def67ebf8792b81f6c1',
    'Secret'
  );
  // 9 (5): data_length variable. One or more 5-bit values containing features
  // supported or required for receiving this payment. See Feature Bits.
  eql(tags[5].tag, 5);
  // NOTE: not shown in web decoder
  eql(Buffer.from(bech32.fromWords(tags[5].data)).toString('hex'), '2420', 'Feature bits');
  eql(tags.length, 6);
});

should.runWhen(import.meta.url);
