pragma solidity 0.5.2;


import "../RollGameLib.sol";
import "../PaymentLib.sol";



contract TestRollGameLib {
  using RollGameLib for RollGameLib.Type;
  using RollGameLib for RollGameLib.Bet;
  using RollGameLib for RollGameLib.Game;
  RollGameLib.Game public game;
  PaymentLib.Payment public payment;
  RollGameLib.Bet public bet;
  
  // event LogRollNewBet(
  //   bytes32 hostSeedHash, 
  //   uint amount,
  //   uint8 indexed t,
  //   address indexed gambler, 
  //   uint16 mask, 
  //   uint8 rollUnder,
  //   address indexed referrer
  // );

  event LogRollNewBet(
    bytes32 indexed hostSeedHash, 
    uint8 t,
    address indexed gambler, 
    uint amount,
    uint mask, 
    uint rollUnder,
    address indexed referrer
  );

  event LogRollHandleBet(
    bytes32 indexed hostSeedHash, 
    uint8 t,
    address indexed gambler, 
    bytes32 hostSeed, 
    bytes32 clientSeed, 
    uint roll, 
    uint multiplierNum, 
    uint multiplierDen,
    uint amount,
    uint winnings
  );

  event LogRollRefundBet(
    bytes32 indexed hostSeedHash, 
    uint8 t,
    address indexed gambler, 
    uint amount
  );


  constructor() public payable {}

  function gameBet(bytes32 hostSeedHash) 
    external 
    view 
    returns (
      RollGameLib.Type t,
      uint amount,
      uint mask,
      uint rollUnder,
      uint blockNumber,
      address payable gambler,
      bool exist
    ) 
  {
    RollGameLib.Bet storage b = game.bets[hostSeedHash];
    t = b.t;
    amount = b.amount;
    mask = b.mask;
    rollUnder = b.rollUnder;
    blockNumber = b.blockNumber;
    gambler = b.gambler;
    exist = b.exist;  
  }

  function gameSetBet(
    bytes32 hostSeedHash,
    RollGameLib.Type t,
    uint amount,
    uint16 mask,
    uint8 rollUnder,
    uint40 blockNumber,
    address payable gambler,
    bool exist,
    address referrer
  ) 
    external 
  {
    RollGameLib.Bet storage b = game.bets[hostSeedHash];
    b.t = t;
    b.amount = amount;
    b.mask = mask;
    b.rollUnder = rollUnder;
    b.blockNumber = blockNumber;
    b.gambler = gambler;
    b.exist = exist;
    emit LogRollNewBet(
      hostSeedHash, 
      uint8(b.t),
      b.gambler,
      b.amount,
      b.mask,
      b.rollUnder,
      referrer
    );
  }

  function gameSetMinMaxAmount(uint minBetAmount, uint maxBetAmount) external {
    game.minBetAmount = minBetAmount;
    game.maxBetAmount = maxBetAmount;
  }

  function gameSafeSetMinMaxBetAmount(uint minBetAmount, uint maxBetAmount) external {
    game.setMinMaxBetAmount(minBetAmount, maxBetAmount);
  }

  function gameMinMaxBetAmount() external view returns (uint minBetAmount, uint maxBetAmount) {
    minBetAmount = game.minBetAmount;
    maxBetAmount = game.maxBetAmount;
  }

  function gameSetSecretSigner(address secretSigner) external {
    game.secretSigner = secretSigner;
  }

  // function gamePlaceBet(
  //   RollGameLib.Type t,
  //   uint16 mask, 
  //   uint8 rollUnder,
  //   address referrer,
  //   bytes32 hostSeedHash, 
  //   uint8 v, 
  //   bytes32 r, 
  //   bytes32 s
  // ) 
  //   external 
  //   payable 
  // {
  //   game.placeBet(t, mask, rollUnder, referrer, hostSeedHash, v, r, s);
  // }

  function gamePlaceBet(
    RollGameLib.Type t,
    uint16 mask, 
    uint8 rollUnder,
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
    game.placeBet(t, mask, rollUnder, referrer, sigExpirationBlock, hostSeedHash, v, r, s);
  }

  function gameHandleBet(bytes32 hostSeed, bytes32 clientHash) external {
    payment = game.handleBet(hostSeed, clientHash);
  }

  function gameHandleBetWithoutPayment(bytes32 hostSeed, bytes32 clientSeed) external {
    game.handleBet(hostSeed, clientSeed);
  }

  function gameRefundBet(bytes32 hostSeedHash) external {
    payment = game.refundBet(hostSeedHash);
  }

  function gameSetLockedInBets(uint128 lockedInBets) external {
    game.lockedInBets = lockedInBets;
  }

  function gameLockedInBets() external view returns(uint) {
    return game.lockedInBets;
  }

  function gameJackpot() external view returns(uint) {
    return game.jackpot;
  }

  function gameSetJackpot(uint128 newJackpot) external {
    game.jackpot = newJackpot;
  }

  function tmod(RollGameLib.Type t) external pure returns(uint) {
    return t.module();
  }

  function tlogMsg(RollGameLib.Type t) external pure returns(bytes32) {
    return t.logMsg();
  }

  function tmaskRange(RollGameLib.Type t) external pure returns(uint, uint) {
    return t.maskRange();
  }

  function trollUnderRange(RollGameLib.Type t) external pure returns(uint, uint) {
    return t.rollUnderRange();
  }

  function removeBet() external {
    bet.remove();
  }

  function setBet(
    RollGameLib.Type t,
    uint amount,
    uint16 mask,
    uint8 rollUnder,
    uint40 blockNumber,
    address payable gambler,
    bool exist
  ) 
    external 
  {
    bet = RollGameLib.Bet(amount, t, rollUnder, mask, blockNumber, gambler, exist);
  }

  function betRoll(bytes32 hostSeed, bytes32 clientSeed) external view returns(uint, uint, uint) {
    (uint r, NumberLib.Number memory multiplier) = bet.roll(hostSeed, clientSeed);
    return (r, multiplier.num, multiplier.den);
  }
}
