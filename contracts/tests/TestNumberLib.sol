pragma solidity 0.5.2;


import "../NumberLib.sol";


contract TestNumberLib {
  using NumberLib for NumberLib.Number;
  NumberLib.Number public ns;

  function Muluint(uint num, uint den, uint b) public pure returns(uint) {
    return NumberLib.Number(num, den).muluint(b);
  }

  function Mmul(
    uint num, 
    uint den, 
    uint b
  ) 
    public pure returns(uint, uint) 
  {
    NumberLib.Number memory nm = NumberLib.Number(num, den).mmul(b);
    return (nm.num, nm.den);
  }

  function Maddm(
    uint mnum1, 
    uint mden1, 
    uint mnum2, 
    uint mden2
  ) 
    public pure returns(uint, uint) 
  {
    NumberLib.Number memory nm1 = NumberLib.Number(mnum1, mden1);
    NumberLib.Number memory nm2 = NumberLib.Number(mnum2, mden2);
    nm1.maddm(nm2);
    return (nm1.num, nm1.den);
  }

  function Madds(
    uint mnum, 
    uint mden, 
    uint snum, 
    uint sden
  ) 
    public returns(uint, uint) 
  {
    NumberLib.Number memory nm = NumberLib.Number(mnum, mden);
    ns = NumberLib.Number(snum, sden);
    nm.madds(ns);
    ns = nm;
    return (nm.num, nm.den);
  }
}
