import ether from './helpers/ether';
import { gasPrice } from './helpers/gasPrice';
import getBalance from './helpers/getBalance';

import latestBlockNumber from './helpers/latestBlockNumber';
import latestBlock from './helpers/latestBlock';
import assertRevert from './helpers/assertRevert';
import { ZERO_ADDRESS } from './helpers/zeroAddress';
import { Signer } from './helpers/signer';
import * as SlotGame from './SlotGameLib_spec';
import * as RollGame from './RollGameLib_spec';

const utils = web3.utils;
const BN = utils.BN;
const Casino = artifacts.require('./contracts/tests/TestCasino.sol');
const slotSigner = new Signer();
const rollSigner = new Signer();

const jackpotLogMsg = 'casino.jackpot'; // eslint-disable-line no-unused-vars
const withdrawLogMsg = 'casino.withdraw';
const jackpotNonce = 'jackpot'; // eslint-disable-line no-unused-vars
const minJackpotMagic = 3333;
const maxJackpotMagic = 333333333;

SlotGame.Combination.prototype.slotSetPayLine = async function (contract, n, sender, rawBytes) {
  let bytes = typeof rawBytes === 'undefined' ? utils.asciiToHex(this.symbols) : rawBytes;
  let opts = typeof sender === 'undefined' ? {} : { from: sender };
  await contract.slotSetPayLine(n, bytes, this.num, this.den, opts);
};

SlotGame.SpecialCombination.prototype.slotSetSpecialPayLine = async function (contract, n, sender, rawBytes) {
  let bytes = typeof rawBytes === 'undefined' ? utils.asciiToHex(this.symbol) : rawBytes;
  let opts = typeof sender === 'undefined' ? {} : { from: sender };
  await contract.slotSetSpecialPayLine(n, bytes, this.num, this.den, this.indexes, opts);
};

SlotGame.Bet.prototype.slotPlaceBet = async function (contract, sig, expBlock) {
  let r = await contract.slotPlaceBet(
    this.referrer,
    expBlock,
    sig.hash,
    sig.v,
    sig.r,
    sig.s,
    { from: this.gambler, value: this.amount }
  );
  this.blockNumber = r.receipt.blockNumber;
  this.exist = true;
};

SlotGame.Bet.prototype.slotSetBetHelper = async function (contract, hostSeedHash) {
  await contract.slotSetBetHelper(
    hostSeedHash, this.amount, this.blockNumber, this.gambler, this.exist

  );
};

RollGame.Bet.prototype.rollPlaceBet = async function (contract, sig, expBlock) {
  let r = await contract.rollPlaceBet(
    this.t.n, this.mask, this.rollUnder, this.referrer, expBlock,
    sig.hash, sig.v, sig.r, sig.s, { from: this.gambler, value: this.amount }
  );
  this.blockNumber = r.receipt.blockNumber;
  this.exist = true;
};

RollGame.Bet.prototype.rollSetBetHelper = async function (contract, hostSeedHash) {
  await contract.rollSetBetHelper(
    hostSeedHash, this.t.n, this.amount, this.mask, this.rollUnder,
    this.blockNumber, this.gambler, this.exist
  );
};

SlotGame.Game.prototype.setupSlot = async function (contract, sender) {
  for (let i = 0; i < this.reels.length; i++) {
    await contract.slotSetReels(i, utils.asciiToHex(this.reels[i]), { from: sender });
  }
  for (let i = 0; i < this.payTable.length; i++) {
    await this.payTable[i].slotSetPayLine(contract, i, sender);
  }
  for (let i = 0; i < this.specialPayTable.length; i++) {
    await this.specialPayTable[i].slotSetSpecialPayLine(contract, i, sender);
  }
};

let game;
const Game = {
  Slot: { enum: 0, v: SlotGame },
  Roll: { enum: 1, v: RollGame },
};

let instance;
let initContract = async function (owner) {
  instance = await Casino.new({ from: owner, gas: 50e6 });
};

contract('Casino', function ([addr1, owner]) {
  describe('fallback', () => {
    before(async () => {
      await initContract(owner);
    });
    it('can receive ether', async () => {
      await web3.eth.sendTransaction({
        from: addr1,
        to: instance.address,
        value: ether(1),
        gas: 10e6,
        gasPrice: gasPrice,
      });
    });
  });

  describe('slotSetReels', () => {
    it('check access denied', async () => {
      const msg = 'access denied';
      await assertRevert(
        instance.slotSetReels(0, utils.randomHex(10), { from: addr1 }),
        msg
      );
    });
    it('success', async () => {
      let n = 0;
      let symbols = utils.randomHex(9).replace('ff', 'aa');
      await instance.slotSetReels(n, symbols, { from: owner });
      let symbolsAfter = await instance.slotReels(n);
      assert.equal(symbolsAfter, symbols);
    });
  });

  describe('slotslotSetPayLine', () => {
    it('check access denied', async () => {
      const msg = 'access denied';
      let n = 0;
      let comb = new SlotGame.Combination();
      await assertRevert(comb.slotSetPayLine(instance, n, addr1), msg);
    });
    it('success', async () => {
      let n = 0;
      let comb = new SlotGame.Combination();
      await comb.slotSetPayLine(instance, n, owner);
      let combAfter = await instance.slotPayLine(n);
      comb.equal(combAfter);
    });
  });

  describe('slotslotSpecialPayLine', () => {
    it('check access denied', async () => {
      const msg = 'access denied';
      let n = 0;
      let comb = new SlotGame.SpecialCombination();
      await assertRevert(comb.slotSetSpecialPayLine(instance, n, addr1), msg);
    });
    it('success', async () => {
      let n = 0;
      let comb = new SlotGame.SpecialCombination();
      await comb.slotSetSpecialPayLine(instance, n, owner);
      let combAfter = await instance.slotSpecialPayLine(n);
      comb.equal(combAfter);
    });
  });

  describe('setSecretSigner', () => {
    it('check access denied', async () => {
      const msg = 'access denied';
      await assertRevert(instance.setSecretSigner(Game.Roll.enum, addr1), msg);
    });
    it('roll', async () => {
      let addr = addr1;
      await instance.setSecretSigner(Game.Roll.enum, addr, { from: owner });
      let rollGame = await instance.roll();
      assert.equal(rollGame.secretSigner.toLowerCase(), addr.toLowerCase());
    });
    it('slot', async () => {
      let addr = owner;
      await instance.setSecretSigner(Game.Slot.enum, addr, { from: owner });
      let rollGame = await instance.slot();
      assert.equal(rollGame.secretSigner.toLowerCase(), addr.toLowerCase());
    });
    it('check slot and roll secret signers must be not equal', async () => {
      const msg = 'slot and roll secret signers must be not equal';
      let rollGame = await instance.roll();
      let addr = rollGame.secretSigner;
      await assertRevert(instance.setSecretSigner(Game.Slot.enum, addr, { from: owner }), msg);
    });
  });

  describe('setMinMaxBetAmount', () => {
    it('check access denied', async () => {
      const msg = 'access denied';
      await assertRevert(instance.setMinMaxBetAmount(Game.Roll.enum, 1, 1), msg);
    });
    it('roll', async () => {
      let min = new BN(Game.Roll.v.minBetAmount);
      let max = new BN(Game.Roll.v.minBetAmount);
      await instance.setMinMaxBetAmount(Game.Roll.enum, min, max, { from: owner });
      let rollGame = await instance.roll();
      assert.equal(rollGame.minBetAmount.toString(10), min.toString(10));
      assert.equal(rollGame.maxBetAmount.toString(10), max.toString(10));
    });
    it('slot', async () => {
      let min = new BN(Game.Slot.v.minBetAmount);
      let max = new BN(Game.Slot.v.minBetAmount);
      await instance.setMinMaxBetAmount(Game.Slot.enum, min, max, { from: owner });
      let slotGame = await instance.slot();
      assert.equal(slotGame.minBetAmount.toString(10), min.toString(10));
      assert.equal(slotGame.maxBetAmount.toString(10), max.toString(10));
    });
  });

  describe('setJackpotMagic', () => {
    it('check access denied', async () => {
      const msg = 'access denied';
      await assertRevert(instance.setJackpotMagic(1, { from: addr1 }), msg);
    });

    it('check invalid jackpot magic', async () => {
      const msg = 'invalid jackpot magic';
      let invalidMin = new BN(minJackpotMagic).sub(new BN(1));
      let invalidMax = new BN(maxJackpotMagic).add(new BN(1));
      await assertRevert(instance.setJackpotMagic(invalidMin, { from: owner }), msg);
      await assertRevert(instance.setJackpotMagic(invalidMax, { from: owner }), msg);
    });

    it('success', async () => {
      let magic = new BN(minJackpotMagic);
      await instance.setJackpotMagic(magic, { from: owner });
      let magicAfter = await instance.jackpotMagic();
      assert.equal(magicAfter.toString(10), magic.toString(10));
    });
  });

  describe('increaseJackpot', () => {
    before(async () => {
      await web3.eth.sendTransaction({
        from: addr1,
        to: instance.address,
        value: ether(1),
        gas: 1e6,
        gasPrice: gasPrice,
      });
    });
    it('check not enough funds', async () => {
      const msg = 'not enough funds';
      let balance = await getBalance(instance.address);
      let jackpot = await instance.jackpot();
      let extraJackpot = await instance.extraJackpot();
      let lockedInBets = await instance.lockedInBets();
      let invalidAmount = new BN(balance).sub(jackpot).sub(lockedInBets).sub(extraJackpot).add(new BN(1));
      await assertRevert(instance.increaseJackpot(invalidAmount, { from: owner }), msg);
    });
    it('check access denied', async () => {
      await assertRevert(instance.increaseJackpot(100, { from: addr1 }));
    });
    it('success', async () => {
      let jackpot = await instance.jackpot();
      let extraJackpot = await instance.extraJackpot();
      let freeFunds = await instance.freeFunds();
      let extraAmount = new BN(freeFunds);
      await instance.increaseJackpot(extraAmount, { from: owner });
      let extraJackpotAfter = await instance.extraJackpot();
      let jackpotAfter = await instance.jackpot();
      let freeFundsAfter = await instance.freeFunds();
      assert.equal(extraJackpotAfter.toString(10), extraJackpot.add(extraAmount).toString(10));
      assert.equal(jackpotAfter.toString(10), jackpot.add(extraAmount).toString(10));
      assert.equal(freeFundsAfter.toString(10), freeFunds.sub(extraAmount).toString(10));
    });
  });

  describe('withdraw', () => {
    before(async () => {
      await web3.eth.sendTransaction({
        from: addr1,
        to: instance.address,
        value: ether(1),
        gas: 1e6,
        gasPrice: gasPrice,
      });
    });
    it('check access denied', async () => {
      await assertRevert(instance.withdraw(addr1, 1, { from: addr1 }));
    });
    it('check not enough funds', async () => {
      let freeFunds = await instance.freeFunds();
      freeFunds = freeFunds.add(new BN(1));
      await assertRevert(instance.withdraw(addr1, freeFunds, { from: owner }));
    });
    it('success', async () => {
      let balance = await getBalance(addr1);
      let freeFunds = await instance.freeFunds();
      let amount = freeFunds.div(new BN(2));
      await instance.withdraw(addr1, amount, { from: owner });
      let balanceAfter = await getBalance(addr1);
      let freeFundsAfter = await instance.freeFunds();
      assert.equal(balanceAfter.toString(10), balance.add(amount).toString(10));
      assert.equal(freeFundsAfter.toString(10), freeFunds.sub(amount).toString(10));
    });

    it('event LogPayment', async () => {
      let freeFunds = await instance.freeFunds();
      await instance.withdraw(addr1, freeFunds, { from: owner });
      let block = await latestBlockNumber();
      const logs = await instance.getPastEvents('LogPayment', {
        fromBlock: block,
        toBlock: block,
      });
      assert.equal(logs.length, 1, 'logs length');
      const e = logs[0];
      assert.equal(e.event, 'LogPayment');
      assert.equal(e.args.beneficiary.toLowerCase(), addr1.toLowerCase());
      assert.equal(e.args.amount.toString(10), freeFunds.toString(10));
      assert.equal(utils.hexToUtf8(e.args.message), withdrawLogMsg);
    });
  });

  describe('roll', () => {
    before(async () => {
      await instance.setMinMaxBetAmount(
        Game.Roll.enum,
        Game.Roll.v.minBetAmount,
        Game.Roll.v.minBetAmount,
        { from: owner }
      );
      await instance.setSecretSigner(Game.Roll.enum, rollSigner.pubKeyETH(), { from: owner });
    });

    context('rollPlaceBet', () => {
      it('check bet', async () => {
        const t = Game.Roll.v.Types.Roll;
        let bet = new RollGame.Bet(
          t, Game.Roll.v.minBetAmount, t.minMaskRange,
          t.minRollUnderRange, 0, addr1
        );
        let expBlock = await latestBlockNumber() + 100;
        let sig = rollSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.rollPlaceBet(instance, sig, expBlock);
        let betAfter = await instance.rollBet(sig.hash);
        bet.equal(betAfter);
      });
      it('check jackpot, lockedInBets', async () => {
        const t = Game.Roll.v.Types.Roll;
        let bet = new RollGame.Bet(
          t, Game.Roll.v.minBetAmount, t.minMaskRange,
          t.minRollUnderRange, 0, addr1
        );
        let jackpotBefore = await instance.jackpot();
        let lockedInBetsBefore = await instance.lockedInBets();
        let expBlock = await latestBlockNumber() + 100;
        let sig = rollSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.rollPlaceBet(instance, sig, expBlock);
        let jackpotAfter = await instance.jackpot();
        let lockedInBetsAfter = await instance.lockedInBets();
        assert.equal(
          lockedInBetsAfter.toString(10),
          lockedInBetsBefore.add(bet.amount).toString(10)
        );
        assert.equal(
          jackpotAfter.toString(10),
          jackpotBefore.add(bet.amount.mul(new BN(RollGame.jackpotPercent)).div(new BN(100))).toString(10)
        );
      });
      it('event LogRollNewBet', async () => {
        const t = Game.Roll.v.Types.Square3x3;
        let bet = new RollGame.Bet(
          t, Game.Roll.v.minBetAmount, t.minMaskRange,
          t.minRollUnderRange, 0, addr1
        );
        let expBlock = await latestBlockNumber() + 100;
        let sig = rollSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.rollPlaceBet(instance, sig, expBlock);
        const logs = await instance.getPastEvents('LogRollNewBet', {
          fromBlock: bet.blockNumber,
          toBlock: bet.blockNumber,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];
        assert.equal(e.event, 'LogRollNewBet');
        assert.equal(e.args.hostSeedHash, sig.hash);
        assert.equal(e.args.t.toNumber(), t.n);
        assert.equal(e.args.gambler.toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(e.args.amount.toString(10), bet.amount.toString(10));
        assert.equal(e.args.mask.toNumber(), bet.mask);
        assert.equal(e.args.rollUnder.toNumber(), bet.rollUnder);
        assert.equal(e.args.referrer.toLowerCase(), bet.referrer.toLowerCase());
      });
    });
    context('refundBet', () => {
      before(async () => {
        await initContract(owner);
        await instance.setMinMaxBetAmount(
          Game.Roll.enum,
          Game.Roll.v.minBetAmount,
          Game.Roll.v.minBetAmount,
          { from: owner }
        );
        await instance.setSecretSigner(Game.Roll.enum, rollSigner.pubKeyETH(), { from: owner });
      });
      it('check bet, jackpot, lockedInBets, event LogRollRefundBet', async () => {
        let jackpotBefore = await instance.jackpot();
        let lockedInBetsBefore = await instance.lockedInBets();
        const t = Game.Roll.v.Types.Roll;
        let bet = new RollGame.Bet(
          t, Game.Roll.v.minBetAmount, t.minMaskRange,
          t.minRollUnderRange, 0, addr1
        );
        let expBlock = await latestBlockNumber() + 100;
        let sig = rollSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.rollPlaceBet(instance, sig, expBlock);

        bet.blockNumber += 5;
        await bet.rollSetBetHelper(instance, sig.hash);

        await instance.refundBet(Game.Roll.enum, sig.hash);
        let blockN = await latestBlockNumber();
        let betAfter = await instance.rollBet(sig.hash);
        new RollGame.Bet(Game.Roll.v.Types.Coin, 0, 0, 0, 0, ZERO_ADDRESS, true).equal(betAfter);
        let jackpotAfter = await instance.jackpot();
        let lockedInBetsAfter = await instance.lockedInBets();
        assert.equal(jackpotAfter.toString(10), jackpotBefore.toString(10));
        assert.equal(lockedInBetsAfter.toString(10), lockedInBetsBefore.toString(10));

        // event
        const logs = await instance.getPastEvents('LogRollRefundBet', {
          fromBlock: blockN,
          toBlock: blockN,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];
        assert.equal(e.event, 'LogRollRefundBet');
        assert.equal(e.args.hostSeedHash, sig.hash);
        assert.equal(e.args.t.toNumber(), t.n);
        assert.equal(e.args.gambler.toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(e.args.amount.toString(10), bet.amount.toString(10));
      });
    });
    context('handleBet', () => {
      before(async () => {
        await initContract(owner);
        await instance.setMinMaxBetAmount(
          Game.Roll.enum,
          Game.Roll.v.minBetAmount,
          Game.Roll.v.minBetAmount,
          { from: owner }
        );
        await instance.setSecretSigner(Game.Roll.enum, rollSigner.pubKeyETH(), { from: owner });
        await web3.eth.sendTransaction({
          from: addr1,
          to: instance.address,
          value: ether(10),
          gas: 1e5,
          gasPrice: gasPrice,
        });
      });

      it('check access denied', async () => {
        const msg = 'access denied';
        const t = Game.Roll.v.Types.Roll;
        let bet = new RollGame.Bet(
          t, Game.Roll.v.minBetAmount, t.minMaskRange,
          t.minRollUnderRange, 0, addr1
        );
        let hostSeed = utils.randomHex(32);
        let expBlock = await latestBlockNumber() + 100;
        let sig = rollSigner.signWithExp(hostSeed, expBlock);
        await bet.rollPlaceBet(instance, sig, expBlock);
        let block = await latestBlock();
        await assertRevert(instance.handleBet(Game.Roll.enum, hostSeed, block.hash, { from: addr1 }), msg);
      });

      it('check bet', async () => {
        const t = Game.Roll.v.Types.Roll;
        let bet = new RollGame.Bet(
          t, Game.Roll.v.minBetAmount, t.minMaskRange,
          t.minRollUnderRange, 0, addr1
        );
        let hostSeed = utils.randomHex(32);
        let expBlock = await latestBlockNumber() + 100;
        let sig = rollSigner.signWithExp(hostSeed, expBlock);
        await bet.rollPlaceBet(instance, sig, expBlock);
        let block = await latestBlock();
        await instance.handleBet(Game.Roll.enum, hostSeed, block.hash, { from: owner });
        let betAfter = await instance.rollBet(sig.hash);
        new RollGame.Bet(Game.Roll.v.Types.Coin, 0, 0, 0, 0, ZERO_ADDRESS, true).equal(betAfter);
      });
      it('event LogRollHandleBet', async () => {
        const t = Game.Roll.v.Types.Roll;
        let bet = new RollGame.Bet(
          t, Game.Roll.v.minBetAmount, t.minMaskRange,
          t.minRollUnderRange, 0, addr1
        );
        let hostSeed = utils.randomHex(32);
        let expBlock = await latestBlockNumber() + 100;
        let sig = rollSigner.signWithExp(hostSeed, expBlock);
        await bet.rollPlaceBet(instance, sig, expBlock);
        let block = await latestBlock();
        await instance.handleBet(Game.Roll.enum, hostSeed, block.hash, { from: owner });
        let blockn = await latestBlockNumber();

        const logs = await instance.getPastEvents('LogRollHandleBet', {
          fromBlock: blockn,
          toBlock: blockn,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];
        let roll = bet.roll(hostSeed, block.hash);

        assert.equal(e.event, 'LogRollHandleBet');
        assert.equal(e.args.hostSeedHash, sig.hash);
        assert.equal(e.args.t.toNumber(), t.n);
        assert.equal(e.args.gambler.toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(e.args.hostSeed, hostSeed);
        assert.equal(e.args.clientSeed, block.hash);
        assert.equal(e.args.multiplierNum.toString(10), roll.num.toString(10), 'multiplierNum');
        assert.equal(e.args.multiplierDen.toString(10), roll.den.toString(10), 'multiplierDen');
        assert.equal(e.args.amount.toString(10), bet.amount.toString(10), 'amount');
        assert.equal(e.args.winnings.toString(10), roll.winnings(bet.amount).toString(10), 'winnings');
      });
      context('jackpot', () => {
        it('check jackpot amount, event LogJactpot', async () => {
          const t = Game.Roll.v.Types.Roll;
          let bet = new RollGame.Bet(
            t, Game.Roll.v.minBetAmount, t.minMaskRange,
            t.minRollUnderRange, 0, addr1
          );
          let hostSeed = utils.randomHex(32);
          let expBlock = await latestBlockNumber() + 100;
          let sig = rollSigner.signWithExp(hostSeed, expBlock);
          await bet.rollPlaceBet(instance, sig, expBlock);
          let jackpotBefore = await instance.jackpot();
          let block = await latestBlock();
          let jackpotMagic = 1;
          await instance.setJackpotMagicHelper(jackpotMagic);
          await instance.handleBet(Game.Roll.enum, hostSeed, block.hash, { from: owner });
          let blockN = await latestBlockNumber();
          let jackpotAfter = await instance.jackpot();
          assert.equal(jackpotAfter.toString(10), '0');
          const logs = await instance.getPastEvents('LogJactpot', {
            fromBlock: blockN,
            toBlock: blockN,
          });
          assert.equal(logs.length, 1, 'logs length');
          const e = logs[0];

          assert.equal(e.event, 'LogJactpot');
          assert.equal(e.args.beneficiary.toLowerCase(), bet.gambler.toLowerCase());
          assert.equal(e.args.amount.toString(10), jackpotBefore.toString(10));
          assert.equal(e.args.hostSeed, hostSeed);
          assert.equal(e.args.clientSeed, block.hash);
          assert.equal(e.args.jackpotMagic.toNumber(), jackpotMagic);
        });
      });
    });
  });

  describe('slot', () => {
    before(async () => {
      await initContract(owner);
      await instance.setMinMaxBetAmount(
        Game.Slot.enum,
        Game.Slot.v.minBetAmount,
        Game.Slot.v.minBetAmount,
        { from: owner }
      );
      await instance.setSecretSigner(Game.Slot.enum, slotSigner.pubKeyETH(), { from: owner });
    });
    context('slotPlaceBet', () => {
      it('check bet', async () => {
        let bet = new SlotGame.Bet(addr1, Game.Slot.v.minBetAmount);
        let expBlock = await latestBlockNumber() + 100;
        let sig = slotSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.slotPlaceBet(instance, sig, expBlock);
        let betAfter = await instance.slotBet(sig.hash);
        bet.equal(betAfter);
      });
      it('check jackpot, lockedInBets', async () => {
        let bet = new SlotGame.Bet(addr1, Game.Slot.v.minBetAmount);
        let jackpotBefore = await instance.jackpot();
        let lockedInBetsBefore = await instance.lockedInBets();
        let expBlock = await latestBlockNumber() + 100;
        let sig = slotSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.slotPlaceBet(instance, sig, expBlock);
        let jackpotAfter = await instance.jackpot();
        let lockedInBetsAfter = await instance.lockedInBets();
        assert.equal(
          lockedInBetsAfter.toString(10),
          lockedInBetsBefore.add(bet.amount).toString(10)
        );
        assert.equal(
          jackpotAfter.toString(10),
          jackpotBefore.add(bet.amount.mul(new BN(SlotGame.jackpotPercent)).div(new BN(100))).toString(10)
        );
      });
      it('event LogSlotNewBet', async () => {
        let bet = new SlotGame.Bet(addr1, Game.Slot.v.minBetAmount);
        let expBlock = await latestBlockNumber() + 100;
        let sig = slotSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.slotPlaceBet(instance, sig, expBlock);
        const logs = await instance.getPastEvents('LogSlotNewBet', {
          fromBlock: bet.blockNumber,
          toBlock: bet.blockNumber,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];
        assert.equal(e.event, 'LogSlotNewBet');
        assert.equal(e.args.hostSeedHash, sig.hash);
        assert.equal(e.args.gambler.toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(e.args.amount.toString(10), bet.amount.toString(10));
        assert.equal(e.args.referrer.toLowerCase(), bet.referrer.toLowerCase());
      });
    });

    context('handleBet', () => {
      before(async () => {
        await initContract(owner);
        await instance.setMinMaxBetAmount(
          Game.Slot.enum,
          SlotGame.minBetAmount,
          SlotGame.minBetAmount,
          { from: owner }
        );
        await instance.setSecretSigner(Game.Slot.enum, slotSigner.pubKeyETH(), { from: owner });
        await web3.eth.sendTransaction({
          from: addr1,
          to: instance.address,
          value: ether(10),
          gas: 1e5,
          gasPrice: gasPrice,
        });

        game = new SlotGame.Game(SlotGame.gameReels, SlotGame.gamePayTable, SlotGame.gameSpecialPayTable);
        await game.setupSlot(instance, owner);
      });
      it('check access denied', async () => {
        const msg = 'access denied';
        let bet = new SlotGame.Bet(addr1, SlotGame.minBetAmount);
        let hostSeed = utils.randomHex(32);
        let expBlock = await latestBlockNumber() + 100;
        let sig = slotSigner.signWithExp(hostSeed, expBlock);
        await bet.slotPlaceBet(instance, sig, expBlock);
        let block = await latestBlock();
        await assertRevert(instance.handleBet(Game.Slot.enum, hostSeed, block.hash, { from: addr1 }), msg);
      });

      it('check bet', async () => {
        let bet = new SlotGame.Bet(addr1, SlotGame.minBetAmount);
        let hostSeed = utils.randomHex(32);
        let expBlock = await latestBlockNumber() + 100;
        let sig = slotSigner.signWithExp(hostSeed, expBlock);
        await bet.slotPlaceBet(instance, sig, expBlock);
        let block = await latestBlock();
        await instance.handleBet(Game.Slot.enum, hostSeed, block.hash, { from: owner });
        let betAfter = await instance.slotBet(sig.hash);
        new SlotGame.Bet(ZERO_ADDRESS, 0, 0, true).equal(betAfter);
      });
      it('event LogSlotHandleBet', async () => {
        let bet = new SlotGame.Bet(addr1, SlotGame.minBetAmount);
        let hostSeed = utils.randomHex(32);
        let expBlock = await latestBlockNumber() + 100;
        let sig = slotSigner.signWithExp(hostSeed, expBlock);
        await bet.slotPlaceBet(instance, sig, expBlock);
        let block = await latestBlock();
        let clientSeed = block.hash;

        await instance.handleBet(Game.Slot.enum, hostSeed, block.hash, { from: owner });
        block = await latestBlockNumber();

        const logs = await instance.getPastEvents('LogSlotHandleBet', {
          fromBlock: block,
          toBlock: block,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];
        
        let comb = game.spin(hostSeed, clientSeed);

        assert.equal(e.event, 'LogSlotHandleBet', 'event name');
        assert.equal(e.args.hostSeedHash, sig.hash, 'hostSeedHash');
        assert.equal(e.args.gambler.toLowerCase(), bet.gambler.toLowerCase(), 'gambler');
        assert.equal(e.args.hostSeed, hostSeed, 'hostSeed');
        assert.equal(e.args.clientSeed, clientSeed, 'clientSeed');
        assert.equal(e.args.symbols, utils.asciiToHex(comb.symbols), 'symbols');
        assert.equal(e.args.multiplierNum.toNumber(), comb.num, 'multiplierNum');
        assert.equal(e.args.multiplierDen.toNumber(), comb.den, 'multiplierDen');
        assert.equal(e.args.amount.toString(10), bet.amount.toString(10), 'amount');
        assert.equal(
          e.args.winnings.toString(10),
          comb.winnings(bet.amount, SlotGame.houseEdgePercent, SlotGame.jackpotPercent).toString(10),
          'winnings'
        );
      });
    });

    context('refundBet', () => {
      before(async () => {
        await initContract(owner);
        await instance.setMinMaxBetAmount(
          Game.Slot.enum,
          SlotGame.minBetAmount,
          SlotGame.minBetAmount,
          { from: owner }
        );
        await instance.setSecretSigner(Game.Slot.enum, slotSigner.pubKeyETH(), { from: owner });
      });
      it('check bet, jackpot, lockedInBets, event LogSlotRefundBet', async () => {
        let jackpotBefore = await instance.jackpot();
        let lockedInBetsBefore = await instance.lockedInBets();
        let bet = new SlotGame.Bet(addr1, SlotGame.minBetAmount);
        let expBlock = await latestBlockNumber() + 100;
        let sig = slotSigner.signWithExp(utils.randomHex(32), expBlock);
        await bet.slotPlaceBet(instance, sig, expBlock);

        bet.blockNumber += 5;
        await bet.slotSetBetHelper(instance, sig.hash);

        await instance.refundBet(Game.Slot.enum, sig.hash);
        let blockN = await latestBlockNumber();
        let betAfter = await instance.slotBet(sig.hash);
        new SlotGame.Bet(ZERO_ADDRESS, 0, 0, true).equal(betAfter);
        let jackpotAfter = await instance.jackpot();
        let lockedInBetsAfter = await instance.lockedInBets();
        assert.equal(jackpotAfter.toString(10), jackpotBefore.toString(10));
        assert.equal(lockedInBetsAfter.toString(10), lockedInBetsBefore.toString(10));

        // event
        const logs = await instance.getPastEvents('LogSlotRefundBet', {
          fromBlock: blockN,
          toBlock: blockN,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];
        assert.equal(e.event, 'LogSlotRefundBet');
        assert.equal(e.args.hostSeedHash, sig.hash);
        assert.equal(e.args.gambler.toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(e.args.amount.toString(10), bet.amount.toString(10));
      });
    });
  });

  describe('modifier slotBetsWasHandled', () => {
    before(async () => {
      await initContract(owner);
      await instance.setMinMaxBetAmount(
        Game.Slot.enum,
        SlotGame.minBetAmount,
        SlotGame.minBetAmount,
        { from: owner }
      );
      await instance.setSecretSigner(Game.Slot.enum, slotSigner.pubKeyETH(), { from: owner });
      let bet = new SlotGame.Bet(addr1, SlotGame.minBetAmount);
      let expBlock = await latestBlockNumber() + 100;
      let sig = slotSigner.signWithExp(utils.randomHex(32), expBlock);
      await bet.slotPlaceBet(instance, sig, expBlock);
    });

    it('slotSetReels', async () => {
      const msg = 'all bets should be handled';
      await assertRevert(instance.slotSetReels(
        0,
        utils.randomHex(10), { from: owner }),
      msg
      );
    });

    it('slotSetPayLine', async () => {
      const msg = 'all bets should be handled';
      let n = 0;
      let comb = new SlotGame.Combination();
      await assertRevert(comb.slotSetPayLine(instance, n, owner), msg);
    });

    it('slotSetSpecialPayLine', async () => {
      const msg = 'all bets should be handled';
      let n = 0;
      let comb = new SlotGame.SpecialCombination();
      await assertRevert(comb.slotSetSpecialPayLine(instance, n, owner), msg);
    });
  });

  describe('kill', () => {
    before(async () => {
      await initContract(owner);
    });
    it('check access denied', async () => {
      const msg = 'access denied';
      await assertRevert(instance.kill(addr1, { from: addr1 }), msg);
    });
    it('check all bets should be handled', async () => {
      await instance.setMinMaxBetAmount(
        Game.Slot.enum,
        SlotGame.minBetAmount,
        SlotGame.minBetAmount,
        { from: owner }
      );
      await instance.setSecretSigner(Game.Slot.enum, slotSigner.pubKeyETH(), { from: owner });
      let bet = new SlotGame.Bet(addr1, SlotGame.minBetAmount);
      let expBlock = await latestBlockNumber() + 100;
      let sig = slotSigner.signWithExp(utils.randomHex(32), expBlock);
      await bet.slotPlaceBet(instance, sig, expBlock);
      const msg = 'all bets should be handled';
      await assertRevert(instance.kill(addr1, { from: owner }), msg);
    });

    it('success', async () => {
      await initContract(owner);
      let addr = instance.address;
      await instance.kill(owner, { from: owner });
      let code = await web3.eth.getCode(addr);
      assert(code === '0x' || code === '0x0');
    });
  });
});
