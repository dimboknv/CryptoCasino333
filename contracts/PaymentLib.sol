pragma solidity 0.5.2;


library PaymentLib {
  struct Payment {
    address payable beneficiary;
    uint amount;
    bytes32 message;
  }

  event LogPayment(address indexed beneficiary, uint amount, bytes32 indexed message);
  event LogFailedPayment(address indexed beneficiary, uint amount, bytes32 indexed message);

  function send(Payment memory p) internal {
    if (p.beneficiary.send(p.amount)) {
      emit LogPayment(p.beneficiary, p.amount, p.message);
    } else {
      emit LogFailedPayment(p.beneficiary, p.amount, p.message);
    }
  }
}