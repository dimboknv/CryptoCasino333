pragma solidity 0.5.2;

import "./Rnd.sol";
import "./PaymentLib.sol";
import "./ProtLib.sol";
import "./NumberLib.sol";
import "./BitsLib.sol";
import "./SafeMath.sol";
import "./ProofLib.sol";



library RollGameLib {
  using NumberLib for NumberLib.Number;
  using SafeMath for uint;
  using SafeMath for uint128;

  // Types
  enum Type {Coin, Square3x3, Roll}
  uint private constant COIN_MOD = 2;
  uint private constant SQUARE_3X3_MOD = 9;
  uint private constant ROLL_MOD = 100;
  bytes32 private constant COIN_PAYMENT_LOG_MSG = "roll.coin";
  bytes32 private constant SQUARE_3X3_PAYMENT_LOG_MSG = "roll.square_3x3";
  bytes32 private constant ROLL_PAYMENT_LOG_MSG = "roll.roll";
  bytes32 private constant REFUND_LOG_MSG = "roll.refund";
  uint private constant HOUSE_EDGE_PERCENT = 1;
  uint private constant JACKPOT_PERCENT = 1;
  uint private constant HANDLE_BET_COST = 0.0005 ether;
  uint private constant MIN_BET_AMOUNT = 10 + (HANDLE_BET_COST * 100) / (100 - HOUSE_EDGE_PERCENT - JACKPOT_PERCENT);

  function MinBetAmount() internal pure returns(uint) {
    return MIN_BET_AMOUNT;
  }

  // solium-disable lbrace, whitespace
  function module(Type t) internal pure returns(uint) {
    if (t == Type.Coin) { return COIN_MOD; } 
    else if (t == Type.Square3x3) { return SQUARE_3X3_MOD; } 
    else { return ROLL_MOD; }
  }

  function logMsg(Type t) internal pure returns(bytes32) {
    if (t == Type.Coin) { return COIN_PAYMENT_LOG_MSG; } 
    else if (t == Type.Square3x3) { return SQUARE_3X3_PAYMENT_LOG_MSG; }
    else { return ROLL_PAYMENT_LOG_MSG; }
  }

  function maskRange(Type t) internal pure returns(uint, uint) {
    if (t == Type.Coin) { return (1, 2 ** COIN_MOD - 2); } 
    else if (t == Type.Square3x3) { return (1, 2 ** SQUARE_3X3_MOD - 2); }
  }

  function rollUnderRange(Type t) internal pure returns(uint, uint) {
    if (t == Type.Roll) { return (1, ROLL_MOD - 1); } // 0..99
  }
  // solium-enable lbrace, whitespace



  struct Bet {
    uint amount;
    Type t; // 8
    uint8 rollUnder; // 8
    uint16 mask;  // 16
    uint40 blockNumber; // 40
    address payable gambler; // 160
    bool exist; // 1
  }

  function roll(
    Bet storage bet,
    bytes32 hostSeed,
    bytes32 clientSeed
  ) 
    internal 
    view 
    returns (
      uint rnd,
      NumberLib.Number memory multiplier
    ) 
  {
    uint m = module(bet.t);
    rnd = Rnd.uintn(hostSeed, clientSeed, m);
    multiplier.den = 1; // prevent divide to zero
    
    uint mask = bet.mask;
    if (mask != 0) {
      if (((2 ** rnd) & mask) != 0) {
        multiplier.den = BitsLib.popcnt(uint16(mask));
        multiplier.num = m;
      }
    } else {
      uint rollUnder = bet.rollUnder;
      if (rollUnder > rnd) {
        multiplier.den = rollUnder;
        multiplier.num = m;
      }
    }
  }

  function remove(Bet storage bet) internal {
    delete bet.amount;
    delete bet.t;
    delete bet.mask;
    delete bet.rollUnder;
    delete bet.blockNumber;
    delete bet.gambler;
  }



  struct Game {
    address secretSigner;
    uint128 lockedInBets;
    uint128 jackpot;
    uint maxBetAmount;
    uint minBetAmount;
    
    mapping(bytes32 => Bet) bets;
  }

  event LogRollNewBet(
    bytes32 indexed hostSeedHash, 
    uint8 t,
    address indexed gambler, 
    uint amount,
    uint mask, 
    uint rollUnder,
    address indexed referrer
  );

  event LogRollRefundBet(
    bytes32 indexed hostSeedHash, 
    uint8 t,
    address indexed gambler, 
    uint amount
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

  function setMinMaxBetAmount(Game storage game, uint minBetAmount, uint maxBetAmount) internal {
    require(minBetAmount >= MIN_BET_AMOUNT, "roll game: invalid min of bet amount");
    require(minBetAmount <= maxBetAmount, "roll game: invalid [min, max] range of bet amount");
    game.minBetAmount = minBetAmount;
    game.maxBetAmount = maxBetAmount;
  }

  function placeBet(
    Game storage game, 
    Type t, 
    uint16 mask, 
    uint8 rollUnder,
    address referrer,
    uint sigExpirationBlock,
    bytes32 hostSeedHash, 
    uint8 v, 
    bytes32 r, 
    bytes32 s
  ) 
    internal 
  {
    ProtLib.checkSigner(game.secretSigner, sigExpirationBlock, hostSeedHash, v, r, s);
    Bet storage bet = game.bets[hostSeedHash];
    require(!bet.exist, "roll game: bet already exist");
    require(game.minBetAmount <= msg.value && msg.value <= game.maxBetAmount, "roll game: invalid bet amount");

    {  // solium-disable indentation
      // prevent stack to deep
      (uint minMask, uint maxMask) = maskRange(t);
      require(minMask <= mask && mask <= maxMask, "roll game: invalid bet mask");
      (uint minRollUnder, uint maxRollUnder) = rollUnderRange(t);
      require(minRollUnder <= rollUnder && rollUnder <= maxRollUnder, "roll game: invalid bet roll under");
    }  // solium-enable indentation

    // * do not touch it! this order is the best for optimization
    bet.amount = msg.value;
    bet.blockNumber = uint40(block.number);
    bet.gambler = msg.sender;
    bet.exist = true;
    bet.mask = mask;
    bet.rollUnder = rollUnder;
    bet.t = t;
    // *

    game.lockedInBets += uint128(msg.value);
    game.jackpot += uint128(msg.value * JACKPOT_PERCENT / 100);

    emit LogRollNewBet(
      hostSeedHash,
      uint8(t),
      msg.sender,
      msg.value,
      mask,
      rollUnder,
      referrer
    );
  }


  function handleBetPrepare(
    Game storage game,
    bytes32 hostSeed
  ) 
    internal view
    returns(
      Bet storage bet,
      bytes32 hostSeedHash, // return it for optimization
      uint betAmount // return it for optimization
    ) 
  {
    hostSeedHash = keccak256(abi.encodePacked(hostSeed));
    bet = game.bets[hostSeedHash];
    betAmount = bet.amount;
    require(bet.exist, "slot game: bet does not exist");
    require(betAmount > 0, "slot game: bet already handled");
  }


  function handleBetCommon(
    Game storage game,
    Bet storage bet,
    bytes32 hostSeed,
    bytes32 hostSeedHash,
    bytes32 clientSeed,
    uint betAmount
  ) 
    internal 
    returns(
      PaymentLib.Payment memory p
    ) 
  {
    game.lockedInBets -= uint128(betAmount);
    (uint rnd, NumberLib.Number memory multiplier) = roll(bet, hostSeed, clientSeed);
    uint winnings = multiplier.muluint(betAmount);
  
    if (winnings > 0) {
      winnings = winnings * (100 - HOUSE_EDGE_PERCENT - JACKPOT_PERCENT) / 100;
      winnings = winnings.sub(HANDLE_BET_COST);
    } else {
      winnings = 1;
    }
    p.beneficiary = bet.gambler; 
    p.amount = winnings; 
    p.message = logMsg(bet.t); 

    emit LogRollHandleBet(
      hostSeedHash,
      uint8(bet.t),
      p.beneficiary,
      hostSeed,
      clientSeed,
      rnd,
      multiplier.num,
      multiplier.den,
      betAmount,
      winnings
    );
    remove(bet);
  }

  function handleBet(
    Game storage game,
    bytes32 hostSeed,
    bytes32 clientSeed
  ) 
    internal 
    returns(
      PaymentLib.Payment memory
    ) 
  {
    (Bet storage bet, bytes32 hostSeedHash, uint betAmount) = handleBetPrepare(game, hostSeed);
    ProtLib.checkBlockHash(bet.blockNumber, clientSeed);
    return handleBetCommon(game, bet, hostSeed, hostSeedHash, clientSeed, betAmount);
  }

  function handleBetWithProof(
    Game storage game,
    bytes32 hostSeed,
    uint canonicalBlockNumber,
    bytes memory uncleProof,
    bytes memory chainProof
  ) 
    internal 
    returns(
      PaymentLib.Payment memory,
      bytes32 // clientSeed
    ) 
  {
    require(address(this) == ProofLib.receiptAddr(uncleProof), "roll game: invalid receipt address");
    (Bet storage bet, bytes32 hostSeedHash, uint betAmount) = handleBetPrepare(game, hostSeed);
    (bytes32 uncleHeaderHash, bytes memory uncleHeader) = ProofLib.uncleHeader(uncleProof, hostSeedHash);
    bytes32 canonicalBlockHash = ProofLib.chainHash(chainProof, uncleHeader);
    ProtLib.checkBlockHash(canonicalBlockNumber, canonicalBlockHash);
    return (handleBetCommon(game, bet, hostSeed, hostSeedHash, uncleHeaderHash, betAmount), uncleHeaderHash); 
  }

  function refundBet(Game storage game, bytes32 hostSeedHash) internal returns(PaymentLib.Payment memory p) {
    Bet storage bet = game.bets[hostSeedHash];
    uint betAmount = bet.amount;
    require(bet.exist, "roll game: bet does not exist");
    require(betAmount > 0, "roll game: bet already handled");
    require(blockhash(bet.blockNumber) == bytes32(0), "roll game: can`t refund bet");
   
    game.jackpot = uint128(game.jackpot.sub(betAmount * JACKPOT_PERCENT / 100));
    game.lockedInBets -= uint128(betAmount);
    p.beneficiary = bet.gambler; 
    p.amount = betAmount; 
    p.message = REFUND_LOG_MSG; 

    emit LogRollRefundBet(hostSeedHash, uint8(bet.t), p.beneficiary, p.amount);
    remove(bet);
  }
}