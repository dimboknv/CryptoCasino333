pragma solidity 0.5.2;


import "../ProtLib.sol";


contract TestProtLib {
  function CheckBlockHash(uint blockNumber, bytes32 blockHash) public {
    ProtLib.checkBlockHash(blockNumber, blockHash);
  }

  function CheckSigner(address signer, bytes32 message, uint8 v, bytes32 r, bytes32 s) public {
    ProtLib.checkSigner(signer, message, v, r, s);
  }
  function a() public {}
}
