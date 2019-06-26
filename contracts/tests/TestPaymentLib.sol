pragma solidity 0.5.2;


import "../PaymentLib.sol";


contract TestPaymentLib {
  using PaymentLib for PaymentLib.Payment;
  event LogPayment(address indexed beneficiary, uint amount, bytes32 indexed message);
  event LogFailedPayment(address indexed beneficiary, uint amount, bytes32 indexed message);
  // event LogJactpot(address indexed beneficiary, uint amount, bytes32 indexed message);


  function eth() external payable {}

  function Send(address payable beneficiary, uint amount, bytes32 message) public {
    PaymentLib.Payment(beneficiary, amount, message).send();
  }

  // function SendJactpot(address payable beneficiary, uint amount, bytes32 message) public {
  //   PaymentLib.Payment(beneficiary, amount, message).sendJactpot();
  // }
}
