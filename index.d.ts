/*! micro-base - MIT License (c) 2021 Paul Miller (paulmillr.com) */
export interface Coder<F, T> {
    encode(from: F): T;
    decode(to: T): F;
}
export interface BytesCoder extends Coder<Uint8Array, string> {
    encode: (data: Uint8Array) => string;
    decode: (str: string) => Uint8Array;
}
export declare const base16: BytesCoder;
export declare const base32: BytesCoder;
export declare const base32hex: BytesCoder;
export declare const base32crockford: BytesCoder;
export declare const base64: BytesCoder;
export declare const base64url: BytesCoder;
export declare const base58: BytesCoder;
export declare const base58flickr: BytesCoder;
export declare const base58xrp: BytesCoder;
export declare const base58xmr: BytesCoder;
export declare const base58check: (sha256: (data: Uint8Array) => Uint8Array) => BytesCoder;
export interface Bech32Decoded {
    prefix: string;
    words: number[];
}
export interface Bech32DecodedWithArray {
    prefix: string;
    words: number[];
    bytes: Uint8Array;
}
export declare const bech32: {
    encode: (prefix: string, words: number[] | Uint8Array, limit?: number | false) => string;
    decode: (str: string, limit?: number | false) => Bech32Decoded;
    decodeToBytes: (str: string) => Bech32DecodedWithArray;
    decodeUnsafe: (str: string, limit?: number | false | undefined) => Bech32Decoded | undefined;
    fromWords: (to: number[]) => Uint8Array;
    fromWordsUnsafe: (to: number[]) => Uint8Array | undefined;
    toWords: (from: Uint8Array) => number[];
};
export declare const bech32m: {
    encode: (prefix: string, words: number[] | Uint8Array, limit?: number | false) => string;
    decode: (str: string, limit?: number | false) => Bech32Decoded;
    decodeToBytes: (str: string) => Bech32DecodedWithArray;
    decodeUnsafe: (str: string, limit?: number | false | undefined) => Bech32Decoded | undefined;
    fromWords: (to: number[]) => Uint8Array;
    fromWordsUnsafe: (to: number[]) => Uint8Array | undefined;
    toWords: (from: Uint8Array) => number[];
};
export declare const utf8: BytesCoder;
export declare const hex: BytesCoder;
declare const CODERS: {
    utf8: BytesCoder;
    hex: BytesCoder;
    base16: BytesCoder;
    base32: BytesCoder;
    base64: BytesCoder;
    base64url: BytesCoder;
    base58: BytesCoder;
    base58xmr: BytesCoder;
};
declare type CoderType = keyof typeof CODERS;
export declare const bytesToString: (type: CoderType, bytes: Uint8Array) => string;
export declare const str: (type: CoderType, bytes: Uint8Array) => string;
export declare const stringToBytes: (type: CoderType, str: string) => Uint8Array;
export declare const bytes: (type: CoderType, str: string) => Uint8Array;
export {};
