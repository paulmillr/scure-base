const assert = require('assert');
const { should } = require('micro-should');
const { base16, base32, base32hex, base32crockford, base64, base64url } = require('..');

const BASE16_VECTORS = [
  ['', ''],
  ['66', '66'],
  ['666f', '666F'],
  ['666f6f', '666F6F'],
  ['666f6f62', '666F6F62'],
  ['666f6f6261', '666F6F6261'],
  ['666f6f626172', '666F6F626172'],
  ['0123456789abcdef', '0123456789ABCDEF'],
];

const BASE16_BAD = ['0', '0=', '00=', 'что', 'M😴'];

const BASE32_VECTORS = [
  ['', ''],
  ['66', 'MY======'],
  ['666f', 'MZXQ===='],
  ['666f6f', 'MZXW6==='],
  ['666f6f62', 'MZXW6YQ='],
  ['666f6f6261', 'MZXW6YTB'],
  ['666f6f626172', 'MZXW6YTBOI======'],
  ['73', 'OM======'],
  ['f80c', '7AGA===='],
  ['6450', 'MRIA===='],
  ['cc91d0', 'ZSI5A==='],
  ['6c60c0', 'NRQMA==='],
  ['4f6a23', 'J5VCG==='],
  ['88b44f18', 'RC2E6GA='],
  ['90bad04714', 'SC5NARYU'],
  ['e9ef1def8086', '5HXR334AQY======'],
  ['83fe3f9c1e9302', 'QP7D7HA6SMBA===='],
  ['15aa1f7cafc17cb8', 'CWVB67FPYF6LQ==='],
  ['da51d4fed48b4c32dc', '3JI5J7WURNGDFXA='],
  ['c4be14228512d7299831', 'YS7BIIUFCLLSTGBR'],
  ['2f273c5b5ef04724fab944', 'F4TTYW266BDSJ6VZIQ======'],
  ['969da1b80ec2442d2bdd4bdb', 'S2O2DOAOYJCC2K65JPNQ===='],
  ['31f5adb50792f549d3714f3f99', 'GH223NIHSL2UTU3RJ47ZS==='],
  ['6a654f7a072c29951930700c0a61', 'NJSU66QHFQUZKGJQOAGAUYI='],
  ['0fe29d6825ad999e87d9b7cac3589d', 'B7RJ22BFVWMZ5B6ZW7FMGWE5'],
  ['0f960ab44e165973a5172ccd294b3412', 'B6LAVNCOCZMXHJIXFTGSSSZUCI======'],
  ['325b9fd847a41fb0d485c207a1a5b02dcf', 'GJNZ7WCHUQP3BVEFYID2DJNQFXHQ===='],
  ['ddf80ebe21bf1b1e12a64c5cc6a74b5d92dd', '3X4A5PRBX4NR4EVGJROMNJ2LLWJN2==='],
  ['c0cae52c6f641ce04a7ee5b9a8fa8ded121bca', 'YDFOKLDPMQOOAST64W42R6UN5UJBXSQ='],
  ['872840a355c8c70586f462c9e669ee760cb3537e', 'Q4UEBI2VZDDQLBXUMLE6M2POOYGLGU36'],
  ['5773fe22662818a120c5688824c935fe018208a496', 'K5Z74ITGFAMKCIGFNCECJSJV7YAYECFESY======'],
  ['416e23abc524d1b85736e2bea6cfecd5192789034a28', 'IFXCHK6FETI3QVZW4K7KNT7M2UMSPCIDJIUA===='],
  ['83d2386ebdd7e8e818ec00e3ccd882aa933b905b7e2e44', 'QPJDQ3V527UOQGHMADR4ZWECVKJTXEC3PYXEI==='],
  ['a2fa8b881f3b8024f52745763c4ae08ea12bdf8bef1a72f8', 'UL5IXCA7HOACJ5JHIV3DYSXAR2QSXX4L54NHF6A='],
  [
    'b074ae8b9efde0f17f37bccadde006d039997b59c8efb05add',
    'WB2K5C467XQPC7ZXXTFN3YAG2A4ZS62ZZDX3AWW5',
  ],
  [
    '764fef941aee7e416dc204ae5ab9c5b9ce644567798e6849aea9',
    'OZH67FA25Z7EC3OCASXFVOOFXHHGIRLHPGHGQSNOVE======',
  ],
  [
    '4995d9811f37f59797d7c3b9b9e5325aa78277415f70f4accf588c',
    'JGK5TAI7G72ZPF6XYO43TZJSLKTYE52BL5YPJLGPLCGA====',
  ],
  [
    '24f0812ca8eed58374c11a7008f0b262698b72fd2792709208eaacb2',
    'ETYICLFI53KYG5GBDJYAR4FSMJUYW4X5E6JHBEQI5KWLE===',
  ],
  [
    'd70692543810d4bf50d81cf44a55801a557a388a341367c7ea077ca306',
    '24DJEVBYCDKL6UGYDT2EUVMADJKXUOEKGQJWPR7KA56KGBQ=',
  ],
  [
    '6e08a89ca36b677ff8fe99e68a1241c8d8cef2570a5f60b6417d2538b30c',
    'NYEKRHFDNNTX76H6THTIUESBZDMM54SXBJPWBNSBPUSTRMYM',
  ],
  [
    'f2fc2319bd29457ccd01e8e194ee9bd7e97298b6610df4ab0f3d5baa0b2d7ccf69829edb74edef',
    '6L6CGGN5FFCXZTIB5DQZJ3U327UXFGFWMEG7JKYPHVN2UCZNPTHWTAU63N2O33Y=',
  ],
  ['00443214c74254b635cf84653a56d7c675be77df', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'],
];

const BASE32_BAD = [
  'A1======',
  'A9======',
  'Aa======',
  'He1l0===',
  'A=======',
  'A7======',
  'AAA=====',
  'AAAAAA==',
  'AA',
  'AA==',
  'AAAA',
  'AAAAA',
  'AAAAAAA',
  'AAAAAAAA========',
  'что',
  'M😴',
];

const BASE32_HEX = [
  ['', ''],
  ['66', 'CO======'],
  ['666f', 'CPNG===='],
  ['666f6f', 'CPNMU==='],
  ['666f6f62', 'CPNMUOG='],
  ['666f6f6261', 'CPNMUOJ1'],
  ['666f6f626172', 'CPNMUOJ1E8======'],
  ['00443214c74254b635cf84653a56d7c675be77df', '0123456789ABCDEFGHIJKLMNOPQRSTUV'],
];

const BASE32_CROCKFORD = [
  ['', ''],
  ['61', 'C4'],
  ['61', 'c4'],
  ['74657374', 'EHJQ6X0'],
  ['74657374', 'EHJQ6XO'],
  ['6c696e7573', 'DHMPWXBK'],
  ['6c696e7573', 'DhmPWXbK'],
  ['666f6f626172', 'CSQPYRK1E8'],
  ['666f6f626172', 'CSQPYRKLE8'],
  ['666f6f626172', 'CSQPYRKIE8'],
];

const BASE64_VECTORS = [
  ['', ''],
  ['66', 'Zg=='],
  ['666f', 'Zm8='],
  ['666f6f', 'Zm9v'],
  ['666f6f62', 'Zm9vYg=='],
  ['666f6f6261', 'Zm9vYmE='],
  ['666f6f626172', 'Zm9vYmFy'],
  ['68656c6c6f20776f726c64', 'aGVsbG8gd29ybGQ='],
  ['00', 'AA=='],
  ['0000', 'AAA='],
  ['000000', 'AAAA'],
  ['00000000', 'AAAAAA=='],
  ['0000000000', 'AAAAAAA='],
  ['000000000000', 'AAAAAAAA'],
  ['6f10a42826d83d78f77673524d41aa9b', 'bxCkKCbYPXj3dnNSTUGqmw=='],
  ['d808d57d3d85fec084e52f970e3f8ee63b8fe8e4', '2AjVfT2F/sCE5S+XDj+O5juP6OQ='],

  ['00108310518720928b30d38f41149351559761969b71d79f', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'],
  ['8218a39259a7a29aabb2dbafc31cb3d35db7e39ebbf3dfbf', 'ghijklmnopqrstuvwxyz0123456789+/'],
  ['fbff', '+/8='],
];

const BASE64_BAD = [
  'A===',
  '+/+=',
  'AAAAA',
  'AA=',
  'AAAA====',
  '=',
  '==',
  'Zg===',
  'AAA',
  '=Zm8',
  'что',
  'M😴',
];

const BASE64_URL = [['fbff', '-_8=']];

function genTests(name, coder, VECTORS, BAD_VECTORS, encode = true) {
  for (const [hex, expected] of VECTORS) {
    if (encode) {
      should(`encode ${name} ${hex}`, () => {
        assert.deepStrictEqual(coder.encode(new Uint8Array(Buffer.from(hex, 'hex'))), expected);
      });
    }
    should(`decode ${name}: ${hex}`, () => {
      assert.deepStrictEqual(coder.decode(expected), new Uint8Array(Buffer.from(hex, 'hex')));
    });
    // X=decode(encode(X))
    should(`encode/decode ${name}: ${hex}`, () => {
      const hexBytes = new Uint8Array(Buffer.from(hex, 'hex'));
      assert.deepStrictEqual(coder.decode(coder.encode(hexBytes)), hexBytes);
    });
  }
  if (BAD_VECTORS) {
    should('throw on decode base16 bad vectors', () => {
      for (let v of BAD_VECTORS) assert.throws(() => coder.decode(v));
    });
  }
}

genTests('base16', base16, BASE16_VECTORS, BASE16_BAD);
genTests('base32', base32, BASE32_VECTORS, BASE32_BAD);
genTests('base32hex', base32hex, BASE32_HEX);
genTests('base32crockford', base32crockford, BASE32_CROCKFORD, undefined, false);
genTests('base64', base64, BASE64_VECTORS, BASE64_BAD);
genTests('base64url', base64url, BASE64_URL);

if (require.main === module) should.run();
