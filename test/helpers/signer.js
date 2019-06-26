import elliptic from 'elliptic';
import sha3 from 'js-sha3';
import wallet from 'ethereumjs-wallet';
const ec = new elliptic.ec('secp256k1'); // eslint-disable-line new-cap
const utils = web3.utils;
export function randomKeyPair () {
  return ec.genKeyPair();
}

export function hextToBytes (str) {
  return new Uint8Array(str.replace('0x', '').match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

export function hextToBuffer (str) {
  // eslint-disable-next-line new-cap
  return new Buffer.from(str.replace('0x', '').match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

export function Signature (raw, hash, v, r, s) {
  this.raw = raw;
  this.hash = hash;
  this.v = v;
  this.r = r;
  this.s = s;
}
  
export function Signer (privateKey) {
  if (typeof privateKey === 'undefined') {
    this.keyPairETH = wallet.generate(true);
    this.keyPair = ec.keyFromPrivate(this.keyPairETH.getPrivateKey());
  } else {
    this.keyPair = ec.keyFromPrivate(privateKey);
    this.keyPairETH = wallet.fromPrivateKey(hextToBuffer(this.keyPair.getPrivate('hex')));
  }
}
  
Signer.prototype.privKey = function (enc) {
  enc = typeof enc === 'undefined' ? 'hex' : enc;
  return this.keyPair.getPrivate(enc);
};
  
Signer.prototype.pubKey = function (enc) {
  enc = typeof enc === 'undefined' ? 'hex' : enc;
  return this.keyPair.getPublic(enc);
};

Signer.prototype.pubKeyETH = function (enc) {
  enc = typeof enc === 'undefined' ? 'hex' : enc;
  return `0x${this.keyPairETH.getAddress().toString(enc)}`;
};

Signer.prototype.privKeyETH = function (enc) {
  enc = typeof enc === 'undefined' ? 'hex' : enc;
  return `0x${this.keyPairETH.getPrivateKey().toString(enc)}`;
};
  
Signer.prototype.keccak256 = function (message) {
  return sha3.keccak256(hextToBytes(message));
};
  
Signer.prototype.sign = function (message) {
  let msgHash = sha3.keccak256(hextToBytes(message));
  let sig = ec.sign(msgHash, this.privKey(), 'hex', { canonical: true });
  
  // utils.padRight(utils.asciiToHex(refundLogMsg), 64)
  return new Signature(
    message,
    `0x${utils.padLeft(msgHash, 64)}`,
    27 + sig.recoveryParam,
    `0x${utils.padLeft(sig.r.toString(16), 64)}`,
    `0x${utils.padLeft(sig.s.toString(16), 64)}`
  );
};

Signer.prototype.signWithExp = function (message, expBlock) {
  let msgHash = sha3.keccak256(hextToBytes(message));
  let msgWithExpHash = sha3.keccak256(hextToBytes(msgHash + utils.padLeft(expBlock.toString(16), 64)));
  let sig = ec.sign(msgWithExpHash, this.privKey(), 'hex', { canonical: true });
  
  return new Signature(
    message,
    `0x${utils.padLeft(msgHash, 64)}`,
    27 + sig.recoveryParam,
    `0x${utils.padLeft(sig.r.toString(16), 64)}`,
    `0x${utils.padLeft(sig.s.toString(16), 64)}`
  );
};
