pragma solidity 0.5.2;


import "../Rnd.sol";


contract TestRndLib {

  function Uintn(bytes32 serverSeed, bytes32 clientSeed, uint n) public pure returns(uint) {
    return Rnd.uintn(serverSeed, clientSeed, n);
  }

  function Uintn1(bytes32 serverSeed, bytes32 clientSeed, bytes memory nonce, uint n) public pure returns(uint) {
    return Rnd.uintn(serverSeed, clientSeed, n, nonce);
  }
}
