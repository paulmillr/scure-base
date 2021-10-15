"use strict";
/*! micro-base - MIT License (c) 2021 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bytes = exports.stringToBytes = exports.str = exports.bytesToString = exports.hex = exports.utf8 = exports.bech32m = exports.bech32 = exports.base58check = exports.base58xmr = exports.base58xrp = exports.base58flickr = exports.base58 = exports.base64url = exports.base64 = exports.base32crockford = exports.base32hex = exports.base32 = exports.base16 = exports.utils = void 0;
function chain(...args) {
    const wrap = (a, b) => (c) => a(b(c));
    const encode = Array.from(args)
        .reverse()
        .reduce((acc, i) => (acc ? wrap(acc, i.encode) : i.encode), undefined);
    const decode = args.reduce((acc, i) => (acc ? wrap(acc, i.decode) : i.decode), undefined);
    return { encode, decode };
}
function alphabet(alphabet) {
    return {
        encode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('alphabet.encode input should be an array of numbers');
            return digits.map((i) => {
                if (i < 0 || i >= alphabet.length)
                    throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
                return alphabet[i];
            });
        },
        decode: (input) => {
            if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                throw new Error('alphabet.decode input should be array of strings');
            return input.map((letter) => {
                const index = alphabet.indexOf(letter);
                if (index === -1)
                    throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet}`);
                return index;
            });
        },
    };
}
function join(separator = '') {
    return {
        encode: (from) => {
            if (!Array.isArray(from) || (from.length && typeof from[0] !== 'string'))
                throw new Error('join.encode input should be array of strings');
            return from.join(separator);
        },
        decode: (to) => {
            if (typeof to !== 'string')
                throw new Error('join.decode input should be string');
            return to.split(separator);
        },
    };
}
function padding(bits, chr = '=') {
    return {
        encode(data) {
            if (!Array.isArray(data) || (data.length && typeof data[0] !== 'string'))
                throw new Error('padding.encode input should be array of strings');
            while ((data.length * bits) % 8)
                data.push(chr);
            return data;
        },
        decode(input) {
            if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                throw new Error('padding.encode input should be array of strings');
            let end = input.length;
            if ((end * bits) % 8)
                throw new Error('Invalid padding: string should have whole number of bytes');
            while (end > 0 && input[end - 1] === chr) {
                end--;
                if (!((end * bits) % 8))
                    throw new Error('Invalid padding: string has too much padding');
            }
            return input.slice(0, end);
        },
    };
}
function normalize(fn) {
    return { encode: (from) => from, decode: (to) => fn(to) };
}
function convertRadix(data, from, to) {
    if (!data.length)
        return [];
    let pos = 0;
    const res = [];
    const digits = Array.from(data);
    while (true) {
        let carry = 0;
        let done = true;
        for (let i = pos; i < digits.length; i++) {
            const digit = from * carry + digits[i];
            carry = digit % to;
            digits[i] = Math.floor(digit / to);
            if (!done)
                continue;
            else if (!digits[i])
                pos = i;
            else
                done = false;
        }
        res.push(carry);
        if (done)
            break;
    }
    for (let i = 0; i < data.length - 1 && data[i] === 0; i++)
        res.push(0);
    return res.reverse();
}
function convertRadix2(data, from, to, padding) {
    let carry = 0;
    let pos = 0;
    const mask = 2 ** to - 1;
    const res = [];
    for (const n of data) {
        carry = (carry << from) | n;
        pos += from;
        for (; pos >= to; pos -= to)
            res.push((carry >> (pos - to)) & mask);
    }
    carry = (carry << (to - pos)) & mask;
    if (!padding && pos >= from)
        throw new Error('Excess padding');
    if (!padding && carry)
        throw new Error(`Non-zero padding: ${carry}`);
    if (padding && pos > 0)
        res.push(carry);
    return res;
}
function radix(num) {
    return {
        encode: (bytes) => {
            if (!(bytes instanceof Uint8Array))
                throw new Error('radix.encode input should be Uint8Array');
            return convertRadix(Array.from(bytes), 2 ** 8, num);
        },
        decode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('radix.decode input should be array of strings');
            return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
        },
    };
}
function radix2(bits, revPadding = false) {
    return {
        encode: (bytes) => {
            if (!(bytes instanceof Uint8Array))
                throw new Error('radix2.encode input should be Uint8Array');
            return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
        },
        decode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('radix2.decode input should be array of strings');
            return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
        },
    };
}
function unsafeWrapper(fn) {
    return function (...args) {
        try {
            return fn.apply(null, args);
        }
        catch (e) { }
    };
}
function checksum(len, fn) {
    return {
        encode(data) {
            if (!(data instanceof Uint8Array))
                throw new Error('checksum.encode: input should be Uint8Array');
            const checksum = fn(data).slice(0, len);
            const res = new Uint8Array(data.length + len);
            res.set(data);
            res.set(checksum, data.length);
            return res;
        },
        decode(data) {
            if (!(data instanceof Uint8Array))
                throw new Error('checksum.decode: input should be Uint8Array');
            const payload = data.slice(0, -len);
            const newChecksum = fn(payload).slice(0, len);
            const oldChecksum = data.slice(-len);
            for (let i = 0; i < len; i++)
                if (newChecksum[i] !== oldChecksum[i])
                    throw new Error('Invalid checksum');
            return payload;
        },
    };
}
exports.utils = { alphabet, chain, checksum, radix2 };
exports.base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
exports.base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
exports.base32hex = chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
exports.base32crockford = chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize((s) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
exports.base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
exports.base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));
const genBase58 = (abc) => chain(radix(58), alphabet(abc), join(''));
exports.base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
exports.base58flickr = genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
exports.base58xrp = genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
exports.base58xmr = {
    encode(data) {
        let res = '';
        for (let i = 0; i < data.length; i += 8) {
            const slice = data.subarray(i, i + 8);
            res += exports.base58.encode(slice).padStart(slice.length === 8 ? 11 : 7, '1');
        }
        return res;
    },
    decode(str) {
        let res = [];
        for (let i = 0; i < str.length; i += 11)
            res = res.concat(Array.from(exports.base58.decode(str.slice(i, i + 11))));
        return Uint8Array.from(res);
    },
};
const base58check = (sha256) => chain(checksum(4, (data) => sha256(sha256(data))), exports.base58);
exports.base58check = base58check;
const BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(pre) {
    const b = pre >> 25;
    let chk = (pre & 0x1ffffff) << 5;
    for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
        if (((b >> i) & 1) === 1)
            chk ^= POLYMOD_GENERATORS[i];
    }
    return chk;
}
function bechChecksum(prefix, words, encodingConst = 1) {
    const len = prefix.length;
    let chk = 1;
    for (let i = 0; i < len; i++) {
        const c = prefix.charCodeAt(i);
        if (c < 33 || c > 126)
            throw new Error(`Invalid prefix (${prefix})`);
        chk = bech32Polymod(chk) ^ (c >> 5);
    }
    chk = bech32Polymod(chk);
    for (let i = 0; i < len; i++)
        chk = bech32Polymod(chk) ^ (prefix.charCodeAt(i) & 0x1f);
    for (let v of words)
        chk = bech32Polymod(chk) ^ v;
    for (let i = 0; i < 6; i++)
        chk = bech32Polymod(chk);
    chk ^= encodingConst;
    return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}
function genBech32(encoding) {
    const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
    const _words = radix2(5);
    const fromWords = _words.decode;
    const toWords = _words.encode;
    const fromWordsUnsafe = unsafeWrapper(fromWords);
    function encode(prefix, words, limit = 90) {
        if (typeof prefix !== 'string')
            throw new Error(`bech32.decode prefix should be string, not ${typeof prefix}`);
        if (!Array.isArray(words) || (words.length && typeof words[0] !== 'number'))
            throw new Error(`bech32.decode words should be array of numbers, not ${typeof words}`);
        const actualLength = prefix.length + 7 + words.length;
        if (limit !== false && actualLength > limit)
            throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
        prefix = prefix.toLowerCase();
        return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
    }
    function decode(str, limit = 90) {
        if (typeof str !== 'string')
            throw new Error(`bech32.decode input should be string, not ${typeof str}`);
        if (str.length < 8 || (limit !== false && str.length > limit))
            throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
        const lowered = str.toLowerCase();
        if (str !== lowered && str !== str.toUpperCase())
            throw new Error(`String must be lowercase or uppercase`);
        str = lowered;
        const sepIndex = str.lastIndexOf('1');
        if (sepIndex === 0 || sepIndex === -1)
            throw new Error(`Letter "1" must be present between prefix and data only`);
        const [prefix, _words] = [str.slice(0, sepIndex), str.slice(sepIndex + 1)];
        if (_words.length < 6)
            throw new Error('Data must be at least 6 characters long');
        const words = BECH_ALPHABET.decode(_words).slice(0, -6);
        const sum = bechChecksum(prefix, words, ENCODING_CONST);
        if (!_words.endsWith(sum))
            throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
        return { prefix, words };
    }
    const decodeUnsafe = unsafeWrapper(decode);
    function decodeToBytes(str) {
        const { prefix, words } = decode(str, false);
        return { prefix, words, bytes: fromWords(words) };
    }
    return { encode, decode, decodeToBytes, decodeUnsafe, fromWords, fromWordsUnsafe, toWords };
}
exports.bech32 = genBech32('bech32');
exports.bech32m = genBech32('bech32m');
exports.utf8 = {
    encode: (data) => new TextDecoder().decode(data),
    decode: (str) => new TextEncoder().encode(str),
};
exports.hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize((s) => {
    if (typeof s !== 'string' || s.length % 2)
        throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
    return s.toLowerCase();
}));
const CODERS = {
    utf8: exports.utf8, hex: exports.hex, base16: exports.base16, base32: exports.base32, base64: exports.base64, base64url: exports.base64url, base58: exports.base58, base58xmr: exports.base58xmr
};
const coderTypeError = `Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`;
const bytesToString = (type, bytes) => {
    if (typeof type !== 'string' || !CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (!(bytes instanceof Uint8Array))
        throw new TypeError('bytesToString() expects Uint8Array');
    return CODERS[type].encode(bytes);
};
exports.bytesToString = bytesToString;
exports.str = exports.bytesToString;
const stringToBytes = (type, str) => {
    if (!CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (typeof str !== 'string')
        throw new TypeError('stringToBytes() expects string');
    return CODERS[type].decode(str);
};
exports.stringToBytes = stringToBytes;
exports.bytes = exports.stringToBytes;
