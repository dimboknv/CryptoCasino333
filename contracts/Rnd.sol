pragma solidity 0.5.2;


library Rnd {
  byte internal constant NONCE_SEP = "\x3a"; // ':'

  function uintn(bytes32 hostSeed, bytes32 clientSeed, uint n) internal pure returns(uint) {
    return uint(keccak256(abi.encodePacked(hostSeed, clientSeed))) % n;
  }

  function uintn(bytes32 hostSeed, bytes32 clientSeed, uint n, bytes memory nonce) internal pure returns(uint) {
    return uint(keccak256(abi.encodePacked(hostSeed, clientSeed, NONCE_SEP, nonce))) % n;
  }
}