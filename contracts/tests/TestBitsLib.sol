pragma solidity 0.5.2;


import "../BitsLib.sol";


contract TestBitsLib {

  function Popcnt(uint16 x) public pure returns(uint) {
    return BitsLib.popcnt(x);
  }
}
