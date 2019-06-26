pragma solidity 0.5.2;


import "../BytesLib.sol";


contract TestBytesLib {
  using BytesLib for bytes;
  
  function Index(bytes memory a, bytes memory b, uint start) public pure returns(int) {
    return a.index(b, start);
  }
  
  function Count(bytes memory a, bytes memory b) public pure returns(uint) {
    return a.count(b);
  }
  
  function Equals(bytes memory a, bytes memory b) public pure returns(bool) {
    return a.equals(b);
  }

  function Copy(bytes memory a) public pure returns(bytes memory b) {
    return a.copy();
  }

  function Slice(bytes memory a, uint start, uint end) public pure returns(bytes memory) {
    return a.slice(start,end);
  }
  
  function Append(bytes memory a, bytes memory b) public pure returns(bytes memory r) {
    r = a.append(b);
  }
  
  function Replace(bytes memory a, bytes memory oldb, bytes memory newb) public pure returns(bytes memory) {
    return a.replace(oldb, newb);
  }

  function ReplaceTx(bytes memory a, bytes memory oldb, bytes memory newb) public returns(bytes memory) {
    return a.replace(oldb, newb);
  }
  
  function FillPattern(bytes memory a, bytes memory pattern, byte newb) public pure returns(bytes memory) {
    a.fillPattern(pattern, newb);
    return a;
  }

  function FillPatternTx(bytes memory a, bytes memory pattern, byte newb) public returns(bytes memory) {
    a.fillPattern(pattern, newb);
    return a;
  }
}
