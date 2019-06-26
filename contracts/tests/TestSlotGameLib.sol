pragma solidity 0.5.2;

import "../SlotGameLib.sol";
import "../PaymentLib.sol";


contract TestSlotGameLib {
  using SlotGameLib for SlotGameLib.Bet;
  using SlotGameLib for SlotGameLib.SpecialCombination;
  using SlotGameLib for SlotGameLib.Game;

  SlotGameLib.Game public game;
  PaymentLib.Payment public payment;
  SlotGameLib.Bet public bet;
  SlotGameLib.SpecialCombination private specialCombination;
  



  event LogSlotNewBet(
    bytes32 indexed hostSeedHash,
    address indexed gambler,
    uint amount,
    address indexed referrer
  );

  event LogSlotHandleBet(
    bytes32 indexed hostSeedHash,
    address indexed gambler,
    bytes32 hostSeed,
    bytes32 clientSeed,
    bytes symbols,
    uint multiplierNum,
    uint multiplierDen,
    uint amount,
    uint winnings
  );

  event LogSlotRefundBet(
    bytes32 indexed hostSeedHash,
    address indexed gambler, 
    uint amount
  );

  constructor() public payable {}

  function() external payable {}

// reels
  function gameSafeSetReels(uint n, bytes calldata symbols) external {
    game.setReel(n, symbols);
  }

  function gameReels(uint n) external view returns (bytes memory) {
    return game.reels[n];
  }
////

// payTable
  function gamePayLine(uint n) external view returns (bytes memory symbols, uint num, uint den) {
    symbols = new bytes(game.payTable[n].symbols.length);
    symbols = game.payTable[n].symbols;
    num = game.payTable[n].multiplier.num;
    den = game.payTable[n].multiplier.den;
  }

  function gameSafeSetPayLine(uint n, bytes calldata symbols, uint num, uint den) external {
    game.setPayLine(n, SlotGameLib.Combination(symbols, NumberLib.Number(num, den)));
  }
///

// specialPayTable
  function gameSpecialPayLine(uint n) external view returns (byte symbol, uint num, uint den, uint[] memory indexes) {
    indexes = new uint[](game.specialPayTable[n].indexes.length);
    indexes = game.specialPayTable[n].indexes;
    num = game.specialPayTable[n].multiplier.num;
    den = game.specialPayTable[n].multiplier.den;
    symbol = game.specialPayTable[n].symbol;
  }

  function gameSafeSetSpecialPayLine(uint n, byte symbol, uint num, uint den, uint[] calldata indexes) external {
    SlotGameLib.SpecialCombination memory scomb = SlotGameLib.SpecialCombination(symbol, NumberLib.Number(num, den), indexes);
    game.setSpecialPayLine(n, scomb);
  }
///

// min max bet amount
  function gameSetMinMaxAmount(uint minBetAmount, uint maxBetAmount) external {
    game.minBetAmount = minBetAmount;
    game.maxBetAmount = maxBetAmount;
  }

  function gameMinMaxBetAmount() external view returns (uint minBetAmount, uint maxBetAmount) {
    minBetAmount = game.minBetAmount;
    maxBetAmount = game.maxBetAmount;
  }

  function gameSafeSetMinMaxBetAmount(uint minBetAmount, uint maxBetAmount) external {
    game.setMinMaxBetAmount(minBetAmount, maxBetAmount);
  }
///

// lockedInBets
  function gameSetLockedInBets(uint128 lockedInBets) external {
    game.lockedInBets = lockedInBets;
  }

  function gameLockedInBets() external view returns(uint128) {
    return game.lockedInBets;
  }
///

// jackpot
  function gameJackpot() external view returns(uint128) {
    return game.jackpot;
  }

  function gameSetJackpot(uint128 newJackpot) external {
    game.jackpot = newJackpot;
  }
///

// secretSigner
  function gameSetSecretSigner(address secretSigner) external {
    game.secretSigner = secretSigner;
  }

  function gameSecretSigner() external view returns(address) {
    return game.secretSigner;
  }

// bets
  function gameSetBet(
    bytes32 hostSeedHash,
    uint amount,
    uint40 blockNumber,
    address payable gambler,
    bool exist,
    address referrer
  ) 
    external 
  {
    SlotGameLib.Bet storage b = game.bets[hostSeedHash];
    b.amount = amount;
    b.blockNumber = blockNumber;
    b.gambler = gambler;
    b.exist = exist;

    emit LogSlotNewBet(
      hostSeedHash, 
      b.gambler, 
      b.amount,
      referrer
    );
  }

  function gameBet(bytes32 hostSeedHash) 
    external 
    view 
    returns (
      uint amount,
      uint blockNumber,
      address payable gambler,
      bool exist
    ) 
  {
    SlotGameLib.Bet storage b = game.bets[hostSeedHash];
    amount = b.amount;
    blockNumber = b.blockNumber;
    gambler = b.gambler;
    exist = b.exist;  
  }

  // function gamePlaceBet(
  //   address referrer,
  //   bytes32 hostSeedHash, 
  //   uint8 v, 
  //   bytes32 r, 
  //   bytes32 s
  // ) 
  //   external 
  //   payable 
  // {
  //   game.placeBet(referrer, hostSeedHash, v, r, s);
  // }

  function gamePlaceBet(
    address referrer,
    uint sigExpirationBlock,
    bytes32 hostSeedHash, 
    uint8 v, 
    bytes32 r, 
    bytes32 s
  ) 
    external 
    payable 
  {
    game.placeBet(referrer, sigExpirationBlock, hostSeedHash, v, r, s);
  }

  function gameRefundBet(bytes32 hostSeedHash) external {
    payment = game.refundBet(hostSeedHash);
  }

  function gameHandleBet(bytes32 hostSeed, bytes32 clientSeed) external {
    payment = game.handleBet(hostSeed, clientSeed);
  }

  function gameHandleBetWithoutPayment(bytes32 hostSeed, bytes32 clientSeed) external {
    game.handleBet(hostSeed, clientSeed);
  }
///

// spin
  function gameSpin(
    bytes32 hostSeed,
    bytes32 clientSeed
  ) 
    external 
    view 
    returns (
      bytes memory, 
      uint, 
      uint
    ) 
  {
    SlotGameLib.Combination memory c = game.spin(hostSeed, clientSeed);
    return (c.symbols, c.multiplier.num, c.multiplier.den);
  }

  function gameSpinTx(
    bytes32 hostSeed,
    bytes32 clientSeed
  ) 
    external  
    returns (
      bytes memory, 
      uint, 
      uint
    ) 
  {
    SlotGameLib.Combination memory c = game.spin(hostSeed, clientSeed);
    return (c.symbols, c.multiplier.num, c.multiplier.den);
  }

  function setBet(
    uint amount,
    uint40 blockNumber,
    address payable gambler,
    bool exist
  ) 
    external 
  {
    bet.amount = amount;
    bet.blockNumber = blockNumber;
    bet.gambler = gambler;
    bet.exist = exist;   
  }

  function removeBet() public {
    bet.remove();
  }

  function setSpecialCombination(byte symbol, uint num, uint den, uint8[] memory indexes) public {
    specialCombination.symbol = symbol;
    specialCombination.multiplier.num = num;
    specialCombination.multiplier.den = den;
    specialCombination.indexes = indexes;
  }

  function specialCombinationHasIn(bytes memory symbols) public view returns(bool) {
    return specialCombination.hasIn(symbols);
  }
}
