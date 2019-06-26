import ether from './helpers/ether';
import latestBlockNumber from './helpers/latestBlockNumber';
import latestBlock from './helpers/latestBlock';
import assertRevert from './helpers/assertRevert';
import { Rnd, RndNumber, Roll } from './Rnd_spec';
import popcnt from './BitsLib_spec';
import { ZERO_ADDRESS } from './helpers/zeroAddress';
import { Signer } from './helpers/signer';
import asyncForEach from './helpers/asyncForEach';

const utils = web3.utils;
const BN = utils.BN;
const RollGame = artifacts.require('./contracts/tests/TestRollGameLib.sol');
const signer = new Signer();

export const refundLogMsg = 'roll.refund';
export const jackpotPercent = 1;
export const houseEdgePercent = 1;
export const handleBetCost = new BN(ether(0.0005));
export const minBetAmount = new BN(handleBetCost)
  .mul(new BN(100))
  .div(new BN(100 - houseEdgePercent - jackpotPercent))
  .add(new BN(10)
  );

function Type (n, mod, logMsg, minMaskRange, maxMaskRange, minRollUnderRange, maxRollUnderRange) {
  this.n = n;
  this.mod = mod;
  this.logMsg = logMsg;
  this.minMaskRange = minMaskRange;
  this.maxMaskRange = maxMaskRange;
  this.minRollUnderRange = minRollUnderRange;
  this.maxRollUnderRange = maxRollUnderRange;
}

export function Bet (t, amount, mask, rollUnder, blockNumber, gambler, exist, referrer) {
  this.t = t;
  this.amount = amount;
  this.mask = mask;
  this.rollUnder = rollUnder;
  this.blockNumber = blockNumber;
  this.gambler = gambler;
  this.exist = exist;
  this.referrer = typeof referrer !== 'undefined' ? referrer : ZERO_ADDRESS;
}

Bet.prototype.roll = function (hostSeedHex, clientSeedHex) {
  let rnd = Rnd(hostSeedHex, clientSeedHex, new BN(this.t.mod));
  rnd = rnd.toNumber();
  let r = new Roll(rnd, 0, 1);

  if (this.mask != 0) {
    if (((2 ** rnd) & this.mask) !== 0) {
      r.den = popcnt(this.mask);
      r.num = this.t.mod;
    }
  } else {
    if (this.rollUnder > rnd) {
      r.den = this.rollUnder;
      r.num = this.t.mod;
    }
  }
  return r;
};

Bet.prototype.set = async function (contract, hostSeedHash) {
  await contract.gameSetBet(
    hostSeedHash, this.t.n, this.amount, this.mask, this.rollUnder,
    this.blockNumber, this.gambler, this.exist, this.referrer
  );
};

Bet.prototype.equal = function (r) {
  assert.equal(r[0].toNumber(), this.t.n, 'type');
  assert.equal(r[1].toNumber(), this.amount, 'amount');
  assert.equal(r[2].toNumber(), this.mask, 'mask');
  assert.equal(r[3].toNumber(), this.rollUnder, 'rollUnder');
  assert.equal(r[4].toString(10), this.blockNumber.toString(10), 'blockNumber');
  assert.equal(r[5].toLowerCase(), this.gambler.toLowerCase(), 'gambler');
  assert.equal(r[6], this.exist, 'exist');
};

export const Types = Object.freeze({
  Coin: new Type(0, 2, 'roll.coin', 1, 2 ** 2 - 2, 0, 0),
  Square3x3: new Type(1, 9, 'roll.square_3x3', 1, 2 ** 9 - 2, 0, 0),
  Roll: new Type(2, 100, 'roll.roll', 0, 0, 1, 99),
});

Roll.prototype.winnings = function (amount) {
  if (this.num / this.den == 0) {
    return new BN(1);
  }
  return new BN(amount)
    .mul(new BN(this.num))
    .div(new BN(this.den))
    .mul(new BN(100 - houseEdgePercent - jackpotPercent))
    .div(new BN(100))
    .sub(new BN(handleBetCost));
};

let instance;
let initContract = async function (owner) {
  instance = await RollGame.new({ from: owner, value: ether(10), gas: 20e6 });
  await instance.gameSetSecretSigner(signer.pubKeyETH());
};

contract('RollGameLib', function ([owner, addr1]) {
  describe('Type', () => {
    before(async () => {
      await initContract(owner);
    });
    it('mod', async () => {
      let r = await instance.tmod(Types.Coin.n);
      assert.equal(r.toNumber(), Types.Coin.mod);

      r = await instance.tmod(Types.Square3x3.n);
      assert.equal(r.toNumber(), Types.Square3x3.mod);

      r = await instance.tmod(Types.Roll.n);
      assert.equal(r.toNumber(), Types.Roll.mod);
    });

    it('logMsg', async () => {
      let r = await instance.tlogMsg(Types.Coin.n);
      assert.equal(utils.hexToUtf8(r), Types.Coin.logMsg);

      r = await instance.tlogMsg(Types.Square3x3.n);
      assert.equal(utils.hexToUtf8(r), Types.Square3x3.logMsg);

      r = await instance.tlogMsg(Types.Roll.n);
      assert.equal(utils.hexToUtf8(r), Types.Roll.logMsg);
    });

    it('maskRange', async () => {
      let r = await instance.tmaskRange(Types.Coin.n);
      assert.equal(r[0].toNumber(), Types.Coin.minMaskRange, 'min ' + Types.Coin.logMsg);
      assert.equal(r[1].toNumber(), Types.Coin.maxMaskRange, 'max ' + Types.Coin.logMsg);

      r = await instance.tmaskRange(Types.Square3x3.n);
      assert.equal(r[0].toNumber(), Types.Square3x3.minMaskRange, 'min ' + Types.Square3x3.logMsg);
      assert.equal(r[1].toNumber(), Types.Square3x3.maxMaskRange, 'max ' + Types.Square3x3.logMsg);

      r = await instance.tmaskRange(Types.Roll.n);
      assert.equal(r[0].toNumber(), Types.Roll.minMaskRange, 'min ' + Types.Roll.logMsg);
      assert.equal(r[1].toNumber(), Types.Roll.maxMaskRange, 'max ' + Types.Roll.logMsg);
    });

    it('rollUnderRange', async () => {
      let r = await instance.trollUnderRange(Types.Coin.n);
      assert.equal(r[0].toNumber(), Types.Coin.minRollUnderRange, 'min ' + Types.Coin.logMsg);
      assert.equal(r[1].toNumber(), Types.Coin.maxRollUnderRange, 'max ' + Types.Coin.logMsg);

      r = await instance.trollUnderRange(Types.Square3x3.n);
      assert.equal(r[0].toNumber(), Types.Square3x3.minRollUnderRange, 'min ' + Types.Square3x3.logMsg);
      assert.equal(r[1].toNumber(), Types.Square3x3.maxRollUnderRange, 'max ' + Types.Square3x3.logMsg);

      r = await instance.trollUnderRange(Types.Roll.n);
      assert.equal(r[0].toNumber(), Types.Roll.minRollUnderRange, 'min ' + Types.Roll.logMsg);
      assert.equal(r[1].toNumber(), Types.Roll.maxRollUnderRange, 'max ' + Types.Roll.logMsg);
    });
  });

  describe('Bet', () => {
    it('roll: ' + Types.Coin.logMsg, async () => {
      const t = Types.Coin;
      let amount = ether(1);
      let rollUnder = 0;
      let blockNumber = 1;
      let gambler = addr1;
      let exist = true;

      const cases = [
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
      ];

      await asyncForEach(cases, async (bet) => {
        await instance.setBet(
          bet.t.n,
          bet.amount,
          bet.mask,
          bet.rollUnder,
          bet.blockNumber,
          bet.gambler,
          bet.exist
        );
        let hostSeedHex = utils.randomHex(32);
        let clientSeedHex = utils.randomHex(32);
        let mustbe = bet.roll(hostSeedHex, clientSeedHex);
        let r = await instance.betRoll(hostSeedHex, clientSeedHex);
        mustbe.equal(r);
      });
    });

    it('roll: ' + Types.Square3x3.logMsg, async () => {
      const t = Types.Square3x3;
      let amount = ether(1);
      let rollUnder = 0;
      let blockNumber = 1;
      let gambler = addr1;
      let exist = true;

      const cases = [
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
        new Bet(t, amount, RndNumber(t.minMaskRange, t.maxMaskRange), rollUnder, blockNumber, gambler, exist),
      ];

      await asyncForEach(cases, async (bet) => {
        await instance.setBet(
          bet.t.n,
          bet.amount,
          bet.mask,
          bet.rollUnder,
          bet.blockNumber,
          bet.gambler,
          bet.exist
        );
        let hostSeedHex = utils.randomHex(32);
        let clientSeedHex = utils.randomHex(32);
        let mustbe = bet.roll(hostSeedHex, clientSeedHex);
        let r = await instance.betRoll(hostSeedHex, clientSeedHex);
        mustbe.equal(r);
      });
    });
    it('roll: ' + Types.Roll.logMsg, async () => {
      const t = Types.Roll;
      let amount = ether(1);
      let mask = 0;
      let blockNumber = 1;
      let gambler = addr1;
      let exist = true;

      const cases = [
        new Bet(t, amount, mask, RndNumber(t.minRollUnderRange, t.maxRollUnderRange), blockNumber, gambler, exist),
        new Bet(t, amount, mask, RndNumber(t.minRollUnderRange, t.maxRollUnderRange), blockNumber, gambler, exist),
        new Bet(t, amount, mask, RndNumber(t.minRollUnderRange, t.maxRollUnderRange), blockNumber, gambler, exist),
        new Bet(t, amount, mask, RndNumber(t.minRollUnderRange, t.maxRollUnderRange), blockNumber, gambler, exist),
      ];

      await asyncForEach(cases, async (bet) => {
        await instance.setBet(
          bet.t.n,
          bet.amount,
          bet.mask,
          bet.rollUnder,
          bet.blockNumber,
          bet.gambler,
          bet.exist
        );
        let hostSeedHex = utils.randomHex(32);
        let clientSeedHex = utils.randomHex(32);
        let mustbe = bet.roll(hostSeedHex, clientSeedHex);
        let r = await instance.betRoll(hostSeedHex, clientSeedHex);
        mustbe.equal(r);
      });
    });

    it('remove', async () => {
      const t = Types.Roll;
      let amount = ether(1);
      let blockNumber = 1;
      let gambler = addr1;
      let exist = true;
      let bet = new Bet(t, amount, t.minMaskRange, t.minRollUnderRange, blockNumber, gambler, exist);
      await instance.setBet(
        bet.t.n,
        bet.amount,
        bet.mask,
        bet.rollUnder,
        bet.blockNumber,
        bet.gambler,
        bet.exist
      );
      await instance.removeBet();
      bet = new Bet(Types.Coin, 0, 0, 0, 0, ZERO_ADDRESS, true);
      let b = await instance.bet();
      bet.equal(b);
    });
  });
  describe('Game', () => {
    context('gameSafeSetMinMaxBetAmount', () => {
      it('check invalid min of bet amount', async () => {
        let invalidMin = new BN(minBetAmount).sub(new BN(1));
        let msg = 'invalid min of bet amount';
        await assertRevert(instance.gameSafeSetMinMaxBetAmount(invalidMin, invalidMin), msg);
      });
      it('check invalid [min, max] range of bet amount', async () => {
        let min = new BN(minBetAmount);
        let max = new BN(minBetAmount).add(new BN(100));
        let msg = 'invalid [min, max] range of bet amount';
        await assertRevert(instance.gameSafeSetMinMaxBetAmount(max, min), msg);
      });
      it('success', async () => {
        let min = new BN(minBetAmount);
        let max = new BN(min).add(new BN(100));
        await instance.gameSafeSetMinMaxBetAmount(min, max);
        let minMax = await instance.gameMinMaxBetAmount();
        assert.equal(minMax[0].toString(10), min.toString(10));
        assert.equal(minMax[1].toString(10), max.toString(10));
      });
    });
    context('placeBet', () => {
      before(async () => {
        await initContract(owner);
      });

      it('check signature has expired', async () => {
        const t = Types.Coin;
        let msg = 'signature has expired';
        let expBlock = await latestBlockNumber() - 5;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        await assertRevert(
          instance.gamePlaceBet(
            t.n,
            t.minMaskRange,
            t.minRollUnderRange,
            ZERO_ADDRESS,
            expBlock,
            sig.hash,
            sig.v,
            sig.r,
            sig.s
          ),
          msg
        );
      });

      it('check signer', async () => {
        const t = Types.Coin;
        let msg = 'ECDSA signature is not valid';
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        await assertRevert(
          instance.gamePlaceBet(
            t.n,
            t.minMaskRange,
            t.minRollUnderRange,
            ZERO_ADDRESS,
            expBlock,
            sig.hash,
            28 - sig.v + 27,
            sig.r,
            sig.s
          ),
          msg
        );
      });

      it('check bet alredy exist', async () => {
        const t = Types.Coin;
        let msg = 'bet already exist';
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let b = new Bet(t, ether(1), t.minMaskRange, t.minRollUnderRange, 0, owner, true);
        await b.set(instance, sig.hash);
        await assertRevert(
          instance.gamePlaceBet(t.n, b.mask, b.rollUnder, ZERO_ADDRESS, expBlock, sig.hash, sig.v, sig.r, sig.s),
          msg
        );
      });
      it('check bet amount', async () => {
        const t = Types.Coin;
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let minBetAmount = 10;
        let maxBetAmount = 20;
        let msg = 'invalid bet amount';
        await instance.gameSetMinMaxAmount(minBetAmount, maxBetAmount);
        await assertRevert(
          instance.gamePlaceBet(
            t.n, t.minMaskRange, t.minRollUnderRange,
            ZERO_ADDRESS, expBlock, sig.hash, sig.v, sig.r, sig.s,
            { from: owner, value: minBetAmount - 1 }),
          msg
        );
        await assertRevert(
          instance.gamePlaceBet(
            t.n, t.minMaskRange, t.minRollUnderRange,
            ZERO_ADDRESS, expBlock, sig.hash, sig.v, sig.r, sig.s,
            { from: owner, value: maxBetAmount + 2 }),
          msg
        );
      });
      it('check bet mask', async () => {
        const t = Types.Coin;
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let minBetAmount = 10;
        let msg = 'invalid bet mask';
        await assertRevert(
          instance.gamePlaceBet(
            t.n, t.minMaskRange - 1, t.minRollUnderRange,
            ZERO_ADDRESS, expBlock, sig.hash, sig.v, sig.r, sig.s,
            { from: owner, value: minBetAmount }),
          msg
        );
        await assertRevert(
          instance.gamePlaceBet(
            t.n, t.maxMaskRange + 1, t.minRollUnderRange,
            ZERO_ADDRESS, expBlock, sig.hash, sig.v, sig.r, sig.s,
            { from: owner, value: minBetAmount }),
          msg
        );
      });
      it('check bet roll under', async () => {
        const t = Types.Roll;
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let minBetAmount = 10;
        let msg = 'invalid bet roll under';
        await assertRevert(
          instance.gamePlaceBet(
            t.n, t.minMaskRange, t.minRollUnderRange - 1,
            ZERO_ADDRESS, expBlock, sig.hash, sig.v, sig.r, sig.s,
            { from: owner, value: minBetAmount }),
          msg
        );
        await assertRevert(
          instance.gamePlaceBet(
            t.n, t.maxMaskRange, t.minRollUnderRange - 2,
            ZERO_ADDRESS, expBlock, sig.hash, sig.v, sig.r, sig.s,
            { from: owner, value: minBetAmount }),
          msg
        );
      });

      it('check gameLockedInBets and jackpot', async () => {
        let amount = ether(1);
        let t = Types.Roll;
        let block = await latestBlockNumber();
        let bet = new Bet(t, amount, t.minMaskRange, t.maxRollUnderRange, ++block, owner, true);
        let gameLockedInBets = 0;
        let jackpot = 0;
        await instance.gameSetLockedInBets(gameLockedInBets);
        await instance.gameSetJackpot(jackpot);
        await instance.gameSetMinMaxAmount(amount, amount);

        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        await instance.gamePlaceBet(
          bet.t.n, bet.mask, bet.rollUnder, bet.referrer,
          expBlock, sig.hash, sig.v, sig.r, sig.s,
          { from: bet.gambler, value: bet.amount }
        );

        let lockedInBetsAfter = await instance.gameLockedInBets();
        let jackpotAfter = await instance.gameJackpot();
        assert.equal(
          jackpotAfter.toString(10),
          new BN(amount)
            .mul(new BN(jackpotPercent))
            .div(new BN(100)).toString(10)
        );
        assert.equal(lockedInBetsAfter.toString(10), new BN(amount).toString(10));
      });

      it('success', async () => {
        let minBetAmount = 10;
        await instance.gameSetMinMaxAmount(minBetAmount, minBetAmount);
        let t = Types.Roll;
        let block = await latestBlockNumber();
        let bets = [];

        bets.push(new Bet(t, minBetAmount, t.minMaskRange, t.maxRollUnderRange, ++block, owner, true));
        t = Types.Square3x3;
        bets.push(new Bet(t, minBetAmount, t.minMaskRange, t.maxRollUnderRange, ++block, owner, true));
        t = Types.Coin;
        bets.push(new Bet(t, minBetAmount, t.minMaskRange, t.maxRollUnderRange, ++block, owner, true));

        await asyncForEach(bets, async (bet) => {
          let expBlock = await latestBlockNumber() + 100;
          let sig = signer.signWithExp(utils.randomHex(32), expBlock);
          await instance.gamePlaceBet(
            bet.t.n, bet.mask, bet.rollUnder, bet.referrer,
            expBlock, sig.hash, sig.v, sig.r, sig.s,
            { from: bet.gambler, value: bet.amount }
          );
          let b = await instance.gameBet(sig.hash);
          bet.equal(b);
        });
      });
      it('event LogRollNewBet', async () => {
        let t = Types.Roll;
        let amount = 10;
        await instance.gameSetMinMaxAmount(amount, amount);
        let mask = t.minMaskRange;
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let rollUnder = t.minRollUnderRange;
        let gambler = owner;
        let referrer = addr1;
        
        await instance.gamePlaceBet(
          t.n, mask, rollUnder, referrer,
          expBlock, sig.hash, sig.v, sig.r, sig.s,
          { from: gambler, value: amount }
        );
        let block = await latestBlockNumber();
        const logs = await instance.getPastEvents('LogRollNewBet', {
          fromBlock: block,
          toBlock: block,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];
        assert.equal(e.event, 'LogRollNewBet');
        assert.equal(e.args.hostSeedHash, sig.hash);
        assert.equal(e.args.t.toNumber(), t.n);
        assert.equal(e.args.gambler.toLowerCase(), gambler.toLowerCase());
        assert.equal(e.args.amount.toNumber(), amount);
        assert.equal(e.args.mask.toNumber(), mask);
        assert.equal(e.args.rollUnder.toNumber(), rollUnder);
        assert.equal(e.args.referrer.toLowerCase(), referrer.toLowerCase());
      });
    });

    context('handleBet', () => {
      before(async () => {
        await initContract(owner);
      });
      it('check bet does not exist', async () => {
        let msg = 'bet does not exist';
        let hostSeed = utils.randomHex(32);
        let clientSeed = '0x0';
        await assertRevert(instance.gameHandleBet(hostSeed, clientSeed), msg);
      });
      it('check bet already handled', async () => {
        const t = Types.Coin;
        let msg = 'bet already handled';
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let clientSeed = '0x0';
        let amount = 0;
        let b = new Bet(t, amount, t.minMaskRange, t.minRollUnderRange, 0, owner, true);
        await b.set(instance, sig.hash);
        await assertRevert(instance.gameHandleBet(hostSeed, clientSeed), msg);
      });
      it('check block protection', async () => {
        const t = Types.Coin;
        let msg = 'protection lib';
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let clientSeed = '0x0';
        let amount = ether(1);
        let b = new Bet(t, amount, t.minMaskRange, t.minRollUnderRange, 0, owner, true);
        await b.set(instance, sig.hash);
        await assertRevert(instance.gameHandleBet(hostSeed, clientSeed), msg);
      });

      it('check gameLockedInBets', async () => {
        const t = Types.Coin;
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let amount = ether(1);
        let gambler = owner;
        let lockedInBetsBefore = amount;
        await instance.gameSetLockedInBets(lockedInBetsBefore);

        let block = await latestBlock();
        await new Bet(t, amount, t.minMaskRange, t.maxRollUnderRange, block.number, gambler, true)
          .set(instance, sig.hash);
        await instance.gameHandleBet(hostSeed, block.hash);

        let lockedInBetsAfter = await instance.gameLockedInBets();
        assert.equal(lockedInBetsAfter.toString(10), lockedInBetsBefore.sub(new BN(amount)).toString(10));
      });

      it('check payment', async () => {
        const t = Types.Coin;
        let block = await latestBlock();
        let bet = new Bet(t, ether(0.001), t.minMaskRange, t.minRollUnderRange, block.number, addr1, true);
        let clientSeed = block.hash;

        let cases = [];

        // win case
        while (true) {
          let hostSeed = utils.randomHex(32);
          let roll = bet.roll(hostSeed, clientSeed);
          if (roll.num > 0) {
            cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, roll: roll });
            break;
          }
        }

        // lose case
        while (true) {
          let hostSeed = utils.randomHex(32);
          let roll = bet.roll(hostSeed, clientSeed);
          if (roll.num === 0) {
            cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, roll: roll });
            break;
          }
        }

        await asyncForEach(cases, async function (c) {
          let sig = signer.sign(c.hostSeed);
          await bet.set(instance, sig.hash);
          await instance.gameHandleBet(c.hostSeed, c.clientSeed);

          let payment = await instance.payment();
          assert.equal(payment[0].toLowerCase(), bet.gambler.toLowerCase());
          assert.equal(payment[1].toString(10), c.roll.winnings(bet.amount).toString(10));
          assert.equal(payment[2], utils.padRight(utils.asciiToHex(bet.t.logMsg), 64));
        });
      });

      it('event LogRollHandleBet', async () => {
        const t = Types.Coin;
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let block = await latestBlock();
        let clientSeed = block.hash;
        let gambler = owner;
        let amount = ether(1);
        let b = new Bet(t, amount, t.minMaskRange, t.minRollUnderRange, block.number, gambler, true);
        await b.set(instance, sig.hash);

        await instance.gameHandleBet(hostSeed, clientSeed);
        let roll = b.roll(hostSeed, clientSeed);

        let blockNumber = await latestBlockNumber();
        const logs = await instance.getPastEvents('LogRollHandleBet', {
          fromBlock: blockNumber,
          toBlock: blockNumber,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];

        assert.equal(e.event, 'LogRollHandleBet', 'event name');
        assert.equal(e.args.hostSeedHash, sig.hash, 'hostSeedHash');
        assert.equal(e.args.t.toNumber(), t.n, 'type');
        assert.equal(e.args.gambler.toLowerCase(), gambler.toLowerCase(), 'gambler');
        assert.equal(e.args.roll.toString(10), roll.rnd.toString(10), 'roll');
        assert.equal(e.args.hostSeed, hostSeed, 'hostSeed');
        assert.equal(e.args.clientSeed, clientSeed, 'clientSeed');
        assert.equal(e.args.multiplierNum.toString(10), roll.num.toString(10), 'multiplierNum');
        assert.equal(e.args.multiplierDen.toString(10), roll.den.toString(10), 'multiplierDen');
        assert.equal(e.args.amount.toString(10), amount.toString(10), 'amount');
        assert.equal(e.args.winnings.toString(10), roll.winnings(amount).toString(10), 'winnings');
      });

      it('check deleting', async () => {
        let amount = ether(1);
        let t = Types.Roll;
        let block = await latestBlock();
        let clientSeed = block.hash;
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);

        let bet = new Bet(t, amount, t.minMaskRange, t.maxRollUnderRange, block.number, owner, true);
        await bet.set(instance, sig.hash);
        await instance.gameHandleBet(hostSeed, clientSeed);

        bet = new Bet(Types.Coin, 0, 0, 0, 0, ZERO_ADDRESS, true);
        let b = await instance.gameBet(sig.hash);
        bet.equal(b);
      });
    });
    context('refundBet', () => {
      before(async () => {
        await initContract(owner);
      });
      it('check bet does not exist', async () => {
        let msg = 'bet does not exist';
        const t = Types.Coin;
        let hostSeedHash = utils.randomHex(32);
        await new Bet(t, ether(1), t.minMaskRange, t.minRollUnderRange, 0, owner, true).set(instance, hostSeedHash);
        await assertRevert(instance.gameRefundBet(utils.randomHex(32)), msg);
      });

      it('check bet already handled', async () => {
        let msg = 'bet already handled';
        const t = Types.Coin;
        let hostSeedHash = utils.randomHex(32);
        await new Bet(t, 0, t.minMaskRange, t.minRollUnderRange, 0, owner, true).set(instance, hostSeedHash);
        await assertRevert(instance.gameRefundBet(hostSeedHash), msg);
      });
      it('check can`t refund bet', async () => {
        let msg = 'can`t refund bet';
        const t = Types.Coin;
        let hostSeedHash = utils.randomHex(32);
        let blockn = await latestBlockNumber();
        await new Bet(t, ether(1), t.minMaskRange, t.minRollUnderRange, blockn, owner, true)
          .set(instance, hostSeedHash);
        await assertRevert(instance.gameRefundBet(hostSeedHash), msg);
      });

      it('check revert on low jacpot', async () => {
        const t = Types.Coin;
        let hostSeedHash = utils.randomHex(32);
        let blockn = await latestBlockNumber();
        await new Bet(t, ether(1), t.minMaskRange, t.minRollUnderRange, blockn, owner, true)
          .set(instance, hostSeedHash);
        await instance.gameSetJackpot(0);
        await assertRevert(instance.gameRefundBet(hostSeedHash));
      });

      it('success', async () => {
        const t = Types.Coin;
        let hostSeedHash = utils.randomHex(32);
        let blockn = await latestBlockNumber() + 100;
        let amount = new BN(ether(1));
        await new Bet(t, amount, t.minMaskRange, t.minRollUnderRange, blockn, owner, true)
          .set(instance, hostSeedHash);
        
        let jackpot = new BN(ether(1));
        let gameLockedInBets = new BN(ether(1));
        await instance.gameSetLockedInBets(gameLockedInBets);
        await instance.gameSetJackpot(jackpot);

        await instance.gameRefundBet(hostSeedHash);

        let lockedInBetsAfter = await instance.gameLockedInBets();
        let jackpotAfter = await instance.gameJackpot();
        assert.equal(lockedInBetsAfter.toString(10), gameLockedInBets.sub(amount).toString(10));
        assert.equal(
          jackpotAfter.toString(10),
          jackpot.sub(amount.mul(new BN(jackpotPercent))
            .div(new BN(100)))
            .toString(10)
        );

        let bet = new Bet(Types.Coin, 0, 0, 0, 0, ZERO_ADDRESS, true);
        let b = await instance.gameBet(hostSeedHash);
        bet.equal(b);
      });

      it('check payment', async () => {
        const t = Types.Coin;
        let hostSeedHash = utils.randomHex(32);
        let blockn = await latestBlockNumber() + 100;
        let amount = new BN(ether(1));
        let bet = new Bet(t, amount, t.minMaskRange, t.minRollUnderRange, blockn, owner, true);
        await bet.set(instance, hostSeedHash);
        await instance.gameSetJackpot(bet.amount);
        await instance.gameRefundBet(hostSeedHash);

        let payment = await instance.payment();
        assert.equal(payment[0].toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(payment[1].toString(10), bet.amount.toString(10));
        assert.equal(payment[2], utils.padRight(utils.asciiToHex(refundLogMsg), 64));
      });

      it('event LogRollRefundBet', async () => {
        const t = Types.Coin;
        let hostSeedHash = utils.randomHex(32);
        let blockn = await latestBlockNumber() + 100;
        let amount = new BN(ether(1));
        let gambler = owner;
        await new Bet(t, amount, t.minMaskRange, t.minRollUnderRange, blockn, gambler, true)
          .set(instance, hostSeedHash);
        await instance.gameSetLockedInBets(amount);
        await instance.gameSetJackpot(amount);
        await instance.gameRefundBet(hostSeedHash);
        
        let block = await latestBlockNumber();
        const logs = await instance.getPastEvents('LogRollRefundBet', {
          fromBlock: block,
          toBlock: block,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];

        assert.equal(e.event, 'LogRollRefundBet');
        assert.equal(e.args.hostSeedHash, hostSeedHash);
        assert.equal(e.args.t.toNumber(), t.n);
        assert.equal(e.args.gambler.toLowerCase(), gambler.toLowerCase());
        assert.equal(e.args.amount.toString(10), amount.toString(10));
      });
    });
  });
});
