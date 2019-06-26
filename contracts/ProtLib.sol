pragma solidity 0.5.2;


library ProtLib {
  function checkBlockHash(uint blockNumber, bytes32 blockHash) internal view {
    require(block.number > blockNumber, "protection lib: current block must be great then block number");
    require(blockhash(blockNumber) != bytes32(0), "protection lib: blockhash can't be queried by EVM");
    require(blockhash(blockNumber) == blockHash, "protection lib: invalid block hash");
  }

  function checkSigner(address signer, bytes32 message, uint8 v, bytes32 r, bytes32 s) internal pure {
    require(signer == ecrecover(message, v, r, s), "protection lib: ECDSA signature is not valid");
  }

  function checkSigner(address signer, uint expirationBlock, bytes32 message, uint8 v, bytes32 r, bytes32 s) internal view {
    require(block.number <= expirationBlock, "protection lib: signature has expired");
    checkSigner(signer, keccak256(abi.encodePacked(message, expirationBlock)), v, r, s);
  }
}