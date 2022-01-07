use base58;
use base58_monero;
use bech32::{self, ToBase32};
use bs58;
use data_encoding;
use genTestsBases::utils;
use serde::Serialize;
use serde_with::{serde_as, skip_serializing_none};

#[serde_as]
#[skip_serializing_none]
#[derive(Serialize)]
struct TestCase {
    fn_name: String,
    #[serde_as(as = "serde_with::hex::Hex")]
    data: Vec<u8>,
    exp: String,
}

#[derive(Serialize)]
struct TestCases {
    v: Vec<TestCase>,
}

impl TestCases {
    fn new() -> Self { TestCases { v: vec![] } }

    fn base32(&mut self, data: &[u8]) {
        let exp = data_encoding::BASE32.encode(data).to_string();
        self.v.push(TestCase { fn_name: "base32".to_string(), data: data.to_vec(), exp })
    }

    fn base32hex(&mut self, data: &[u8]) {
        let exp = data_encoding::BASE32HEX.encode(data).to_string();
        self.v.push(TestCase { fn_name: "base32hex".to_string(), data: data.to_vec(), exp })
    }

    fn base58_monero(&mut self, data: &[u8]) {
        let exp = base58_monero::encode(data).unwrap();
        self.v.push(TestCase { fn_name: "base58xmr".to_string(), data: data.to_vec(), exp })
    }

    fn base58(&mut self, data: &[u8]) {
        let exp = bs58::encode(data).into_string();
        self.v.push(TestCase { fn_name: "base58".to_string(), data: data.to_vec(), exp })
    }

    fn base64(&mut self, data: &[u8]) {
        let exp = data_encoding::BASE64.encode(data).to_string();
        self.v.push(TestCase { fn_name: "base64".to_string(), data: data.to_vec(), exp })
    }

    fn base64url(&mut self, data: &[u8]) {
        let exp = data_encoding::BASE64URL.encode(data).to_string();
        self.v.push(TestCase { fn_name: "base64url".to_string(), data: data.to_vec(), exp })
    }

    fn bech32(&mut self, data: &[u8]) {
        // static prefix, not much reason to test
        let exp = bech32::encode("bech32", data.to_base32(), bech32::Variant::Bech32).unwrap();
        self.v.push(TestCase { fn_name: "bech32".to_string(), data: data.to_vec(), exp })
    }

    fn bech32m(&mut self, data: &[u8]) {
        // static prefix, not much reason to test
        let exp = bech32::encode("bech32m", data.to_base32(), bech32::Variant::Bech32m).unwrap();
        self.v.push(TestCase { fn_name: "bech32m".to_string(), data: data.to_vec(), exp })
    }

    fn add_all(&mut self, data: &[u8]) {
        self.bech32(data);
        self.bech32m(data);
        self.base32(data);
        self.base32hex(data);
        self.base58_monero(data);
        self.base58(data);
        self.base64(data);
        self.base64url(data);
    }

    fn to_json(&self) -> String { serde_json::to_string(&self).unwrap() }
}

fn main() {
    let R1 = utils::random(1, 4096);

    let mut a = TestCases::new();
    for i in 0..512 {
        a.add_all(&R1[0..i]);
        let zeros = vec![0u8; i];
        a.add_all(&zeros);
        let ones = vec![0xffu8; i];
        a.add_all(&ones);
    }
    // Main idea: test different bit level masks: [left, middle, right], middle is always 0xff (all bits is 1)
    // left & right -- kinda sliding window
    const edges: [u8; 16] = [
        0b1111_1111,
        0b0111_1111,
        0b0011_1111,
        0b0001_1111,
        0b0000_1111,
        0b0000_0111,
        0b0000_0011,
        0b0000_0001,
        0b0000_0000,
        0b1000_0000,
        0b1100_0000,
        0b1110_0000,
        0b1111_0000,
        0b1111_1000,
        0b1111_1100,
        0b1111_1110,
    ];
    for l in edges {
        for r in edges {
            let data: [u8; 3] = [l, 0b1111_1111, r];
            a.add_all(&data)
        }
    }

    println!("{}", a.to_json());
}
