pragma solidity 0.5.2;

import "./BytesLib.sol";
import "./NumberLib.sol";
import "./Rnd.sol";
import "./PaymentLib.sol";
import "./ProtLib.sol";
import "./SafeMath.sol";
import "./ProofLib.sol";



library SlotGameLib {
  using BytesLib for bytes;
  using SafeMath for uint;
  using SafeMath for uint128;
  using NumberLib for NumberLib.Number;

  struct Bet {
    uint amount; 
    uint40 blockNumber; // 40
    address payable gambler; // 160
    bool exist; // 1
  }

  function remove(Bet storage bet) internal {
    delete bet.amount;
    delete bet.blockNumber;
    delete bet.gambler;
  }

  struct Combination {
    bytes symbols;
    NumberLib.Number multiplier;
  }

  struct SpecialCombination {
    byte symbol;
    NumberLib.Number multiplier;
    uint[] indexes; // not uint8, optimize hasIn
  }

  function hasIn(SpecialCombination storage sc, bytes memory symbols) internal view returns (bool) {
    uint len = sc.indexes.length;
    byte symbol = sc.symbol;
    for (uint i = 0; i < len; i++) {
      if (symbols[sc.indexes[i]] != symbol) {
        return false;
      }
    }
    return true;
  }

  // the symbol that don't use in reels
  byte private constant UNUSED_SYMBOL = "\xff"; // 255
  uint internal constant REELS_LEN = 9;
  uint private constant BIG_COMBINATION_MIN_LEN = 8;
  bytes32 private constant PAYMENT_LOG_MSG = "slot";
  bytes32 private constant REFUND_LOG_MSG = "slot.refund";
  uint private constant HANDLE_BET_COST = 0.001 ether;
  uint private constant HOUSE_EDGE_PERCENT = 1;
  uint private constant JACKPOT_PERCENT = 1;
  uint private constant MIN_WIN_PERCENT = 30;
  uint private constant MIN_BET_AMOUNT = 10 + (HANDLE_BET_COST * 100 / MIN_WIN_PERCENT * 100) / (100 - HOUSE_EDGE_PERCENT - JACKPOT_PERCENT);
  
  function MinBetAmount() internal pure returns(uint) {
    return MIN_BET_AMOUNT;
  }

  
  struct Game {
    address secretSigner;
    uint128 lockedInBets;
    uint128 jackpot;
    uint maxBetAmount;
    uint minBetAmount;

    bytes[REELS_LEN] reels;
    // pay table array with prioritet for 0-elem to N-elem, where 0 - MAX prior and N - LOW prior
    Combination[] payTable;
    SpecialCombination[] specialPayTable;

    mapping(bytes32 => Bet) bets;
  }

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

  function setReel(Game storage game, uint n, bytes memory symbols) internal {
    require(REELS_LEN > n, "slot game: invalid reel number");
    require(symbols.length > 0, "slot game: invalid reel`s symbols length");
    require(symbols.index(UNUSED_SYMBOL) == -1, "slot game: reel`s symbols contains invalid symbol");
    game.reels[n] = symbols;
  }

  function setPayLine(Game storage game, uint n, Combination memory comb) internal {
    require(n <= game.payTable.length, "slot game: invalid pay line number");
    require(comb.symbols.index(UNUSED_SYMBOL) == -1, "slot game: combination symbols contains invalid symbol");

    if (n == game.payTable.length && comb.symbols.length > 0) {
      game.payTable.push(comb);
      return;
    } 
    
    if (n == game.payTable.length-1 && comb.symbols.length == 0) {
      game.payTable.pop();
      return;
    }

    require(
      0 < comb.symbols.length && comb.symbols.length <= REELS_LEN, 
      "slot game: invalid combination`s symbols length"
    );
    game.payTable[n] = comb;
  }

  function setSpecialPayLine(Game storage game, uint n, SpecialCombination memory scomb) internal {
    require(game.specialPayTable.length >= n, "slot game: invalid pay line number");
    require(scomb.symbol != UNUSED_SYMBOL, "slot game: invalid special combination`s symbol");

    if (n == game.specialPayTable.length && scomb.indexes.length > 0) {
      game.specialPayTable.push(scomb);
      return;
    } 
    
    if (n == game.specialPayTable.length-1 && scomb.indexes.length == 0) {
      game.specialPayTable.pop();
      return;
    }

    require(
      0 < scomb.indexes.length && scomb.indexes.length <= REELS_LEN, 
      "slot game: invalid special combination`s indexes length"
    );
    game.specialPayTable[n] = scomb;
  }

  function setMinMaxBetAmount(Game storage game, uint minBetAmount, uint maxBetAmount) internal {
    require(minBetAmount >= MIN_BET_AMOUNT, "slot game: invalid min of bet amount");
    require(minBetAmount <= maxBetAmount, "slot game: invalid [min, max] range of bet amount");
    game.minBetAmount = minBetAmount;
    game.maxBetAmount = maxBetAmount;
  }

  function placeBet(
    Game storage game,
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
    require(!bet.exist, "slot game: bet already exist");
    require(game.minBetAmount <= msg.value && msg.value <= game.maxBetAmount, "slot game: invalid bet amount");
    
    bet.amount = msg.value;
    bet.blockNumber = uint40(block.number);
    bet.gambler = msg.sender;
    bet.exist = true;
    
    game.lockedInBets += uint128(msg.value);
    game.jackpot += uint128(msg.value * JACKPOT_PERCENT / 100);

    emit LogSlotNewBet(
      hostSeedHash, 
      msg.sender, 
      msg.value,
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
    Combination memory c = spin(game, hostSeed, clientSeed);
    uint winnings = c.multiplier.muluint(betAmount);

    if (winnings > 0) {
      winnings = winnings * (100 - HOUSE_EDGE_PERCENT - JACKPOT_PERCENT) / 100;
      winnings = winnings.sub(HANDLE_BET_COST);
    } else {
      winnings = 1;
    }
    p.beneficiary = bet.gambler; 
    p.amount = winnings; 
    p.message = PAYMENT_LOG_MSG; 

    emit LogSlotHandleBet(
      hostSeedHash,
      p.beneficiary, 
      hostSeed, 
      clientSeed, 
      c.symbols, 
      c.multiplier.num, 
      c.multiplier.den,
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
    require(address(this) == ProofLib.receiptAddr(uncleProof), "slot game: invalid receipt address");
    (Bet storage bet, bytes32 hostSeedHash, uint betAmount) = handleBetPrepare(game, hostSeed);
    (bytes32 uncleHeaderHash, bytes memory uncleHeader) = ProofLib.uncleHeader(uncleProof, hostSeedHash);
    bytes32 canonicalBlockHash = ProofLib.chainHash(chainProof, uncleHeader);
    ProtLib.checkBlockHash(canonicalBlockNumber, canonicalBlockHash);
    return (handleBetCommon(game, bet, hostSeed, hostSeedHash, uncleHeaderHash, betAmount), uncleHeaderHash); 
  }

  function spin(
    Game storage game,
    bytes32 hostSeed,
    bytes32 clientSeed
  ) 
    internal 
    view 
    returns (
      Combination memory combination
    ) 
  {
    bytes memory symbolsTmp = new bytes(REELS_LEN);
    for (uint i; i < REELS_LEN; i++) {
      bytes memory nonce = abi.encodePacked(uint8(i));
      symbolsTmp[i] = game.reels[i][Rnd.uintn(hostSeed, clientSeed, game.reels[i].length, nonce)];
    }
    combination.symbols = symbolsTmp.copy();
    combination.multiplier = NumberLib.Number(0, 1); // 0/1 == 0.0
    
    for ((uint i, uint length) = (0, game.payTable.length); i < length; i++) {
      bytes memory tmp = game.payTable[i].symbols;
      uint times = symbolsTmp.fillPattern(tmp, UNUSED_SYMBOL);
      if (times > 0) {
        combination.multiplier.maddm(game.payTable[i].multiplier.mmul(times));
        if (tmp.length >= BIG_COMBINATION_MIN_LEN) {
          return combination; 
			  }
      }
    }
    
    for ((uint i, uint length) = (0, game.specialPayTable.length); i < length; i++) {
      if (hasIn(game.specialPayTable[i], combination.symbols)) {
        combination.multiplier.madds(game.specialPayTable[i].multiplier);
      }
    }
  }

  function refundBet(Game storage game, bytes32 hostSeedHash) internal returns(PaymentLib.Payment memory p) {
    Bet storage bet = game.bets[hostSeedHash];
    uint betAmount = bet.amount;
    require(bet.exist, "slot game: bet does not exist");
    require(betAmount > 0, "slot game: bet already handled");
    require(blockhash(bet.blockNumber) == bytes32(0), "slot game: can`t refund bet");
   
    game.jackpot = uint128(game.jackpot.sub(betAmount * JACKPOT_PERCENT / 100));
    game.lockedInBets -= uint128(betAmount);
    p.beneficiary = bet.gambler; 
    p.amount = betAmount; 
    p.message = REFUND_LOG_MSG; 

    emit LogSlotRefundBet(hostSeedHash, p.beneficiary, p.amount);
    remove(bet);
  }
}