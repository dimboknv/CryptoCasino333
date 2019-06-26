
pragma solidity 0.5.2;


library NumberLib {
  struct Number {
    uint num;
    uint den;
  }

  function muluint(Number memory a, uint b) internal pure returns (uint) {
    return b * a.num / a.den;
  }

  function mmul(Number memory a, uint b) internal pure returns(Number memory) {
    a.num = a.num * b;
    return a;
  }

  function maddm(Number memory a, Number memory b) internal pure returns(Number memory) {
    a.num = a.num * b.den + b.num * a.den;
    a.den = a.den * b.den;
    return a;
  }

  function madds(Number memory a, Number storage b) internal view returns(Number memory) {
    a.num = a.num * b.den + b.num * a.den;
    a.den = a.den * b.den;
    return a;
  }
}