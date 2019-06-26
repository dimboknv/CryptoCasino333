pragma solidity 0.5.2;

import "../Casino.sol";
import "../RollGameLib.sol";
import "../SlotGameLib.sol";


contract TestCasino is Casino {
  function setJackpotMagicHelper(uint magic) external {
    jackpotMagic = magic;
  }

  function rollSetBetHelper(
    bytes32 hostSeedHash,
    RollGameLib.Type t,
    uint amount,
    uint16 mask,
    uint8 rollUnder,
    uint40 blockNumber,
    address payable gambler,
    bool exist
  ) 
    public 
  {
    RollGameLib.Bet storage b = roll.bets[hostSeedHash];
    b.t = t;
    b.amount = amount;
    b.mask = mask;
    b.rollUnder = rollUnder;
    b.blockNumber = blockNumber;
    b.gambler = gambler;
    b.exist = exist;
  }

   function slotSetBetHelper(
    bytes32 hostSeedHash,
    uint amount,
    uint40 blockNumber,
    address payable gambler,
    bool exist
  ) 
    public 
  {
    SlotGameLib.Bet storage b = slot.bets[hostSeedHash];
    b.amount = amount;
    b.blockNumber = blockNumber;
    b.gambler = gambler;
    b.exist = exist;
  }
}
