pragma solidity 0.5.2;

import "./PaymentLib.sol";
import "./SlotGameLib.sol";
import "./RollGameLib.sol";
import "./Accessibility.sol";


contract Casino is Accessibility {
  using PaymentLib for PaymentLib.Payment;
  using RollGameLib for RollGameLib.Game;
  using SlotGameLib for SlotGameLib.Game;

  bytes32 private constant JACKPOT_LOG_MSG = "casino.jackpot";
  bytes32 private constant WITHDRAW_LOG_MSG = "casino.withdraw";
  bytes private constant JACKPOT_NONCE = "jackpot";
  uint private constant MIN_JACKPOT_MAGIC = 3333;
  uint private constant MAX_JACKPOT_MAGIC = 333333333;
  
  SlotGameLib.Game public slot;
  RollGameLib.Game public roll;
  enum Game {Slot, Roll}

  uint public extraJackpot;
  uint public jackpotMagic;

  modifier slotBetsWasHandled() {
    require(slot.lockedInBets == 0, "casino.slot: all bets should be handled");
    _;
  }

  event LogIncreaseJackpot(address indexed addr, uint amount);
  event LogJackpotMagicChanged(address indexed addr, uint newJackpotMagic);
  event LogPayment(address indexed beneficiary, uint amount, bytes32 indexed message);
  event LogFailedPayment(address indexed beneficiary, uint amount, bytes32 indexed message);

  event LogJactpot(
    address indexed beneficiary, 
    uint amount, 
    bytes32 hostSeed,
    bytes32 clientSeed,
    uint jackpotMagic
  );

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

  constructor() public {
    jackpotMagic = MIN_JACKPOT_MAGIC;
    slot.minBetAmount = SlotGameLib.MinBetAmount();
    slot.maxBetAmount = SlotGameLib.MinBetAmount();
    roll.minBetAmount = RollGameLib.MinBetAmount();
    roll.maxBetAmount = RollGameLib.MinBetAmount();
  }

  function() external payable {}
  
  function rollPlaceBet(
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
    external payable
  {
    roll.placeBet(t, mask, rollUnder, referrer, sigExpirationBlock, hostSeedHash, v, r, s);
  }

  function rollBet(bytes32 hostSeedHash) 
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
    RollGameLib.Bet storage b = roll.bets[hostSeedHash];
    t = b.t;
    amount = b.amount;
    mask = b.mask;
    rollUnder = b.rollUnder;
    blockNumber = b.blockNumber;
    gambler = b.gambler;
    exist = b.exist;  
  }

  function slotPlaceBet(
    address referrer,
    uint sigExpirationBlock,
    bytes32 hostSeedHash,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) 
    external payable
  {
    slot.placeBet(referrer, sigExpirationBlock, hostSeedHash, v, r, s);
  }

  function slotBet(bytes32 hostSeedHash) 
    external 
    view 
    returns (
      uint amount,
      uint blockNumber,
      address payable gambler,
      bool exist
    ) 
  {
    SlotGameLib.Bet storage b = slot.bets[hostSeedHash];
    amount = b.amount;
    blockNumber = b.blockNumber;
    gambler = b.gambler;
    exist = b.exist;  
  }

  function slotSetReels(uint n, bytes calldata symbols) 
    external 
    onlyAdmin(AccessRank.Games) 
    slotBetsWasHandled 
  {
    slot.setReel(n, symbols);
  }

  function slotReels(uint n) external view returns (bytes memory) {
    return slot.reels[n];
  }

  function slotPayLine(uint n) external view returns (bytes memory symbols, uint num, uint den) {
    symbols = new bytes(slot.payTable[n].symbols.length);
    symbols = slot.payTable[n].symbols;
    num = slot.payTable[n].multiplier.num;
    den = slot.payTable[n].multiplier.den;
  }

  function slotSetPayLine(uint n, bytes calldata symbols, uint num, uint den) 
    external 
    onlyAdmin(AccessRank.Games) 
    slotBetsWasHandled 
  {
    slot.setPayLine(n, SlotGameLib.Combination(symbols, NumberLib.Number(num, den)));
  }

  function slotSpecialPayLine(uint n) external view returns (byte symbol, uint num, uint den, uint[] memory indexes) {
    indexes = new uint[](slot.specialPayTable[n].indexes.length);
    indexes = slot.specialPayTable[n].indexes;
    num = slot.specialPayTable[n].multiplier.num;
    den = slot.specialPayTable[n].multiplier.den;
    symbol = slot.specialPayTable[n].symbol;
  }

  function slotSetSpecialPayLine(
    uint n,
    byte symbol,
    uint num, 
    uint den, 
    uint[] calldata indexes
  ) 
    external 
    onlyAdmin(AccessRank.Games) 
    slotBetsWasHandled
  {
    SlotGameLib.SpecialCombination memory scomb = SlotGameLib.SpecialCombination(symbol, NumberLib.Number(num, den), indexes);
    slot.setSpecialPayLine(n, scomb);
  }

  function refundBet(Game game, bytes32 hostSeedHash) external {
    PaymentLib.Payment memory p; 
    p = game == Game.Slot ? slot.refundBet(hostSeedHash) : roll.refundBet(hostSeedHash);
    handlePayment(p);
  }

  function setSecretSigner(Game game, address secretSigner) external onlyAdmin(AccessRank.Games) {
    address otherSigner = game == Game.Roll ? slot.secretSigner : roll.secretSigner;
    require(secretSigner != otherSigner, "casino: slot and roll secret signers must be not equal");
    game == Game.Roll ? roll.secretSigner = secretSigner : slot.secretSigner = secretSigner;
  }

  function setMinMaxBetAmount(Game game, uint min, uint max) external onlyAdmin(AccessRank.Games) {
    game == Game.Roll ? roll.setMinMaxBetAmount(min, max) : slot.setMinMaxBetAmount(min, max);
  }

  function kill(address payable beneficiary) 
    external 
    onlyAdmin(AccessRank.Full) 
  {
    require(lockedInBets() == 0, "casino: all bets should be handled");
    selfdestruct(beneficiary);
  }

  function increaseJackpot(uint amount) external onlyAdmin(AccessRank.Games) {
    checkEnoughFundsForPay(amount);
    extraJackpot += amount;
    emit LogIncreaseJackpot(msg.sender, amount);
  }

  function setJackpotMagic(uint magic) external onlyAdmin(AccessRank.Games) {
    require(MIN_JACKPOT_MAGIC <= magic && magic <= MAX_JACKPOT_MAGIC, "casino: invalid jackpot magic");
    jackpotMagic = magic;
    emit LogJackpotMagicChanged(msg.sender, magic);
  }

  function withdraw(address payable beneficiary, uint amount) external onlyAdmin(AccessRank.Withdraw) {
    handlePayment(PaymentLib.Payment(beneficiary, amount, WITHDRAW_LOG_MSG));
  }

  function handleBet(Game game, bytes32 hostSeed, bytes32 clientSeed) external onlyAdmin(AccessRank.Croupier) {
    PaymentLib.Payment memory p; 
    p = game == Game.Slot ? slot.handleBet(hostSeed, clientSeed) : roll.handleBet(hostSeed, clientSeed);
    handlePayment(p);
    rollJackpot(p.beneficiary, hostSeed, clientSeed);
  }

  function handleBetWithProof(
    Game game,
    bytes32 hostSeed,
    uint canonicalBlockNumber,
    bytes memory uncleProof,
    bytes memory chainProof
  )
    public onlyAdmin(AccessRank.Croupier)
  {
    PaymentLib.Payment memory p;
    bytes32 clientSeed; 
    if (game == Game.Slot) {
      (p, clientSeed) = slot.handleBetWithProof(hostSeed, canonicalBlockNumber, uncleProof, chainProof);
    } else {
      (p, clientSeed) = roll.handleBetWithProof(hostSeed, canonicalBlockNumber, uncleProof, chainProof);
    }
    handlePayment(p);
    rollJackpot(p.beneficiary, hostSeed, clientSeed);
  }

  function lockedInBets() public view returns(uint) {
    return slot.lockedInBets + roll.lockedInBets;
  }

  function jackpot() public view returns(uint) {
    return slot.jackpot + roll.jackpot + extraJackpot;
  }

  function freeFunds() public view returns(uint) {
    if (lockedInBets() + jackpot() >= address(this).balance ) {
      return 0;
    }
    return address(this).balance - lockedInBets() - jackpot();
  }

  function rollJackpot(
    address payable beneficiary,
    bytes32 hostSeed,
    bytes32 clientSeed
  ) 
    private 
  {
    if (Rnd.uintn(hostSeed, clientSeed, jackpotMagic, JACKPOT_NONCE) != 0) {
      return;
    }
    PaymentLib.Payment memory p = PaymentLib.Payment(beneficiary, jackpot(), JACKPOT_LOG_MSG);
    handlePayment(p);

    delete slot.jackpot;
    delete roll.jackpot;
    delete extraJackpot;
    emit LogJactpot(p.beneficiary, p.amount, hostSeed, clientSeed, jackpotMagic);
  }

  function checkEnoughFundsForPay(uint amount) private view {
    require(freeFunds() >= amount, "casino: not enough funds");
  }

  function handlePayment(PaymentLib.Payment memory p) private {
    checkEnoughFundsForPay(p.amount);
    p.send();
  }
}
