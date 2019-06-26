pragma solidity 0.5.2;

//solium-disable security/no-block-members


contract Accessibility {
  enum AccessRank { None, Croupier, Games, Withdraw, Full }
  mapping(address => AccessRank) public admins;
  modifier onlyAdmin(AccessRank  r) {
    require(
      admins[msg.sender] == r || admins[msg.sender] == AccessRank.Full,
      "accessibility: access denied"
    );
    _;
  }
  event LogProvideAccess(address indexed whom, uint when,  AccessRank rank);

  constructor() public {
    admins[msg.sender] = AccessRank.Full;
    emit LogProvideAccess(msg.sender, now, AccessRank.Full);
  }
  
  function provideAccess(address addr, AccessRank rank) public onlyAdmin(AccessRank.Full) {
    require(admins[addr] != AccessRank.Full, "accessibility: can`t change full access rank");
    if (admins[addr] != rank) {
      admins[addr] = rank;
      emit LogProvideAccess(addr, now, rank);
    }
  }
}