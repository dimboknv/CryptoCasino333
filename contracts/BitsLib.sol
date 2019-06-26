pragma solidity 0.5.2;


// solium-disable security/no-assign-params

library BitsLib {

  // popcnt returns the number of one bits ("population count") in x.
  // https://en.wikipedia.org/wiki/Hamming_weight 
  function popcnt(uint16 x) internal pure returns(uint) {
    x -= (x >> 1) & 0x5555;
    x = (x & 0x3333) + ((x >> 2) & 0x3333);
    x = (x + (x >> 4)) & 0x0f0f;
    return (x * 0x0101) >> 8;
  }
}