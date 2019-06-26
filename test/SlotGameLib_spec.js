import ether from './helpers/ether';
import latestBlockNumber from './helpers/latestBlockNumber';
import latestBlock from './helpers/latestBlock';
import assertRevert from './helpers/assertRevert';
import { Rnd, RndN, Roll } from './Rnd_spec';
import { ZERO_ADDRESS } from './helpers/zeroAddress';
import { Signer } from './helpers/signer';
import asyncForEach from './helpers/asyncForEach';
import assertInvalidOpcode from './helpers/assertInvalidOpcode';

const utils = web3.utils;
const BN = utils.BN;
const SlotGame = artifacts.require('./contracts/tests/TestSlotGameLib.sol');
const signer = new Signer();

export const unusedSymbolHex = 'ff';
export const reelsLen = 9;
export const bigCombinationMinLen = 8;
export const paymentLogMsg = 'slot';
export const refundLogMsg = 'slot.refund';
export const jackpotPercent = 1;
export const houseEdgePercent = 1;
export const handleBetCost = new BN(ether(0.001));
export const minWinPercent = 30;
export const minBetAmount = new BN(handleBetCost)
  .mul(new BN(100))
  .div(new BN(minWinPercent))
  .mul(new BN(100))
  .div(new BN(100 - houseEdgePercent - jackpotPercent))
  .add(new BN(10));

export function Bet (gambler, amount, blockNumber, exist, referrer) {
  this.amount = typeof amount !== 'undefined' ? amount : new BN(minBetAmount); ;
  this.blockNumber = typeof blockNumber !== 'undefined' ? blockNumber : new BN(0);
  this.gambler = gambler;
  this.exist = exist;
  this.referrer = typeof referrer !== 'undefined' ? referrer : ZERO_ADDRESS;
}

Bet.prototype.equal = function (bet) {
  assert.equal(bet[0].toString(10), this.amount.toString(10), 'amount');
  assert.equal(bet[1].toString(10), this.blockNumber.toString(10), 'blockNumber');
  assert.equal(bet[2].toLowerCase(), this.gambler.toLowerCase(), 'gambler');
  assert.equal(bet[3], this.exist, 'exist');
};

Bet.prototype.set = async function (contract, hostSeedHash) {
  if (typeof hostSeedHash === 'undefined') {
    await contract.setBet(this.amount, this.blockNumber, this.gambler, this.exist);
    return;
  }
  await contract.gameSetBet(
    hostSeedHash, this.amount, this.blockNumber, this.gambler, this.exist, this.referrer
  );
};

Bet.prototype.place = async function (contract, sig, expBlock) {
  let r = await contract.gamePlaceBet(
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

export function Combination (symbols, num, den) {
  this.symbols = typeof symbols === 'undefined' ? utils.randomHex(3) : symbols;
  this.num = typeof num === 'undefined' ? 0 : num;
  this.den = typeof den === 'undefined' ? 1 : den;
}

Combination.prototype.equal = function (obj) {
  assert.equal(obj[0], utils.asciiToHex(this.symbols), 'symbols');
  assert.equal(obj[1].toString(10), this.num.toString(10), 'num');
  assert.equal(obj[2].toString(10), this.den.toString(10), 'den');
};

Combination.prototype.setPayLine = async function (contract, n, rawBytes) {
  let bytes = typeof rawBytes === 'undefined' ? utils.asciiToHex(this.symbols) : rawBytes;
  await contract.gameSafeSetPayLine(n, bytes, this.num, this.den);
};

Combination.prototype.addMultiplier = function (cmb) {
  this.num = cmb.num * this.den + this.num * cmb.den;
  this.den = cmb.den * this.den;
};

Combination.prototype.mul = function (a) {
  return new Combination(this.symbols, this.num * a, this.den);
};

Combination.prototype.multiplier = function () {
  return this.num / this.den;
};

Combination.prototype.winnings = function (amount) {
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

export function SpecialCombination (symbol, num, den, indexes) {
  this.symbol = typeof symbol === 'undefined' ? '3' : symbol;
  this.num = typeof num === 'undefined' ? 0 : num;
  this.den = typeof den === 'undefined' ? 1 : den;
  this.indexes = typeof indexes === 'undefined' ? [0, 1, 2] : indexes;
}

SpecialCombination.prototype.hasIn = function (symbols) {
  for (let i = 0; i < this.indexes.length; i++) {
    if (symbols[this.indexes[i]] != this.symbol) {
      return false;
    }
  }
  return true;
};

SpecialCombination.prototype.equal = function (obj) {
  assert.equal(obj[0], utils.asciiToHex(this.symbol), 'symbol');
  assert.equal(obj[1], this.num, 'num');
  assert.equal(obj[2], this.den, 'den');
  assert.deepEqual(Object.values(obj[3]).map(x => x.toNumber()), this.indexes, 'indexes');
};

SpecialCombination.prototype.set = async function (contract, n, rawBytes) {
  if (typeof n === 'undefined') {
    await contract.setSpecialCombination(utils.asciiToHex(this.symbol), this.num, this.den, this.indexes);
    return;
  }
  let bytes = typeof rawBytes === 'undefined' ? utils.asciiToHex(this.symbol) : rawBytes;
  await contract.gameSafeSetSpecialPayLine(n, bytes, this.num, this.den, this.indexes);
};

Roll.prototype.winnings = function (amount) {
  if (this.num / this.den == 0) {
    return new BN(1);
  }
  return new BN(amount)
    .mul(new BN(this.num / this.den))
    .mul(new BN(100 - houseEdgePercent - jackpotPercent))
    .div(new BN(100))
    .sub(new BN(handleBetCost));
};

/* eslint-disable max-len */
export const gameSpins = [
  { hostSeed: '0x6bd86778cc9063b3c6cc3f5201ab9917c0975deeca32657825b680bad007e916', clientSeed: '0x03881ce4a7994cf3b898eaaa586db036bdde1064d9754973454aca9fb9896ec8', symbols: '330330333', multiplier: 9.2 },
  { hostSeed: '0x6f44027643a3b1efef79b598b3e6a422930b6a3d75d9d7a61039137695987435', clientSeed: '0x90f89985bb5d79b49ac7a2d332bb686a7b3cdb2abcc383fdb179041e2c9b9587', symbols: '000003333', multiplier: 5.0 },
  { hostSeed: '0x1a4ea870dc62d5f615bb9ce7f6d4f68707d66bee026c340494634635defbdfff', clientSeed: '0xebcbb62cb41f25c6e0b581611db2622a59b12c8340d801c6357017a73160491c', symbols: '000030300', multiplier: 0.0 },
  { hostSeed: '0x9c088dd5bbab14017d1b01b94e8270e9eadb57773c05773ca39a36c728c03641', clientSeed: '0xbf472feb4c0b40579b8c40463af9333d2baa589eb8b43232d39d439ac1ebe33c', symbols: '303003303', multiplier: 2.8 },
  { hostSeed: '0xf18b0d82d5d9c888bf7b1f2fed55e6574daae1ace87c311e9d98f90b573f6b53', clientSeed: '0x4f57ee9da6701d6e4f7695978021281cbce963198d62508a7fe4ec3d16f69ad2', symbols: '003300330', multiplier: 0.6 },
  { hostSeed: '0x0c1b045d349b426cd34b91738a20756ea9d5d451cb0844a68fcd0443cee3dd46', clientSeed: '0xf299dd89c012ef6c52c132c582db56723d8f7c44ea600a3235830f3f33e40f9b', symbols: '000000003', multiplier: 0.0 },
  { hostSeed: '0xa8b249d1c0277c5989d974bf0a116cb0028eb8206bf161d7637d4b51a62aa6fb', clientSeed: '0xc3e7a5e113a00380fd3313276cc174d3045822d9fcf98b23e3d6a4dd1093b500', symbols: '003003000', multiplier: 0.0 },
  { hostSeed: '0x9ce906271c873fffdeda5e8615377903b1c3a9a3e465e4b5432332d296667035', clientSeed: '0xbeff2820da7bb32e323d845a5aa648755f41c3aeb39cd53e89479acba7dcb36b', symbols: '030003330', multiplier: 0.6 },
  { hostSeed: '0xd3c911d3c9df47d7abd8eba7dc182bf453b713882bc0a76ca0ea2546ac02cd88', clientSeed: '0x0947023308352096872b55fed1ca5ffced6afddf2986cd898c1f316dfe54913f', symbols: '330030000', multiplier: 0.3 },
  { hostSeed: '0x9c58c4f18494907d373f39fa258413e8e63ffd52da853ae6212734805736806d', clientSeed: '0x7f41371270ca3dfe3ef5626d06218a9353cc545bd6aae87a64564f058ff66d4c', symbols: '030300330', multiplier: 0.3 },
  { hostSeed: '0xa0c2339741f884bda92e5d0fa600d1e2c89fe4b5515be225801aeb5ce949f9af', clientSeed: '0x459305d0a1c097116f8bd38b2591b78af96594dac87b1cc5b972e0532ae2c5d0', symbols: '000030030', multiplier: 0.0 },
  { hostSeed: '0xf374484073ccec22328884301a5e03d5ca1b54fb750974319139192bf3206e64', clientSeed: '0x4aebb25e44272339d0977031314f3cd11408b5a3869f17512fbb4d782fe1a201', symbols: '333033303', multiplier: 9.7 },
];
/* eslint-enable max-len */

export const gameReels = [
  '30030030030030000300',
  '030003030003000300300',
  '00333000300003030000',
  '0003003000300030030300',
  '03003003000300003030',
  '03000300300300300300',
  '30030030003000003003',
  '300300003003003000003',
  '00300030300030003003',
];

export const gamePayTable = [
  new Combination('333333333', 333, 1),
  new Combination('33333333', 240, 1),
  new Combination('3333333', 150, 1),
  new Combination('333333', 75, 1),
  new Combination('33333', 25, 1),
  new Combination('3333', 5, 1),
  new Combination('333', 6, 10),
  new Combination('33', 3, 10),
];

export const gameSpecialPayTable = [
  new SpecialCombination('3', 25, 10, [0, 3, 6]),
  new SpecialCombination('3', 25, 10, [1, 4, 7]),
  new SpecialCombination('3', 25, 10, [2, 5, 8]),
  new SpecialCombination('3', 30, 10, [0, 4, 8]),
  new SpecialCombination('3', 30, 10, [2, 4, 6]), // + 25 + 30 + 30
];

// 3 3 3 0 3 3 3 0 3
// 0 1 2 3 4 5 6 7 8

// num: expected '97000' to equal '1000000'
// 0xf374484073ccec22328884301a5e03d5ca1b54fb750974319139192bf3206e64
// 0x4aebb25e44272339d0977031314f3cd11408b5a3869f17512fbb4d782fe1a201
// js: {"symbols":"333033303","num":1000000,"den":100000}

// 6/10 + 6/10 + 25/10 + 30/10 + 30 /10

// 120/100

let game;
export function Game (reels, payTable, specialPayTable) {
  // reels [] of Uint8Array
  this.reels = typeof reels === 'undefined' ? ['0303030303030'] : reels;

  // array of Combination
  this.payTable = typeof payTable === 'undefined' ? [] : payTable;

  // array of SpecialCombination
  this.specialPayTable = typeof specialPayTable === 'undefined' ? [] : specialPayTable;
}

Game.prototype.spin = function (hostSeedHex, clientSeedHex) {
  let symbolsTmp = '';
  for (let i = 0; i < this.reels.length; i++) {
    let nonce = `0x0${i.toString(16)}`;
    let char = this.reels[i][Rnd(hostSeedHex, clientSeedHex, new BN(this.reels[i].length), nonce)];
    symbolsTmp += char;
  }

  let ret = new Combination(symbolsTmp);
  let foundBigCombination = false;

  for (let i = 0; i < this.payTable.length; i++) {
    let count = (symbolsTmp.match(new RegExp(this.payTable[i].symbols, 'g')) || []).length;
    if (count > 0) {
      symbolsTmp = symbolsTmp.replace(new RegExp(this.payTable[i].symbols, 'g'), unusedSymbolHex);
      ret.addMultiplier(this.payTable[i].mul(count));
      if (this.payTable[i].symbols.length >= bigCombinationMinLen) {
        foundBigCombination = true;
        break;
      }
    }
  }

  if (foundBigCombination) {
    return ret;
  }

  for (let i = 0; i < this.specialPayTable.length; i++) {
    if (this.specialPayTable[i].hasIn(ret.symbols)) {
      ret.addMultiplier(this.specialPayTable[i]);
    }
  }
  return ret;
};

Game.prototype.set = async function (contract) {
  await this.setReels(contract);
  await this.setPayTable(contract);
  await this.setSpecialPayTable(contract);
};

Game.prototype.setReels = async function (contract) {
  for (let i = 0; i < this.reels.length; i++) {
    await contract.gameSafeSetReels(i, utils.asciiToHex(this.reels[i]));
  }
};

Game.prototype.setPayTable = async function (contract) {
  for (let i = 0; i < this.payTable.length; i++) {
    await this.payTable[i].setPayLine(contract, i);
  }
};

Game.prototype.setSpecialPayTable = async function (contract) {
  for (let i = 0; i < this.specialPayTable.length; i++) {
    await this.specialPayTable[i].set(contract, i);
  }
};

let instance;
let initContract = async function (owner) {
  instance = await SlotGame.new({ from: owner, value: ether(10), gas: 20e6 });
  await instance.gameSetSecretSigner(signer.pubKeyETH());
};

contract('SlotGameLib', function ([owner, addr1]) {
  before(async () => {
    await initContract(owner);
  });
  describe('Bet', () => {
    it('remove', async () => {
      let bet = new Bet(owner, new BN(ether(1)), 5, true);
      await bet.set(instance);

      let betAfter = await instance.bet();
      bet.equal(betAfter);
      await instance.removeBet();

      bet = new Bet(ZERO_ADDRESS, new BN(0), 0, true);
      betAfter = await instance.bet();
      bet.equal(betAfter);
    });
  });

  describe('SpecialCombination', () => {
    it('hasIn', async () => {
      let cases = [];
      // false
      cases.push({
        has: false,
        symbols:
          utils.asciiToHex('2212125432'),
        comb: new SpecialCombination('0', 1, 1, [0, 1, 2]),
      });

      cases.push({
        has: false,
        symbols: utils.asciiToHex('224324f221'),
        comb: new SpecialCombination('0', 1, 1, [0, 1, 2]),
      });
      cases.push({
        has: false,
        symbols: utils.asciiToHex('3213441233'),
        comb: new SpecialCombination('0', 1, 1, [0, 1, 2]),
      });

      // true
      cases.push({
        has: true,
        symbols: utils.asciiToHex('00001'),
        comb: new SpecialCombination('0', 1, 1, [0, 1, 2]),
      });
      cases.push({
        has: true,
        symbols: utils.asciiToHex('01000'),
        comb: new SpecialCombination('0', 1, 1, [0, 2, 3]),
      });
      cases.push({
        has: true,
        symbols: utils.asciiToHex('00100'),
        comb: new SpecialCombination('0', 1, 1, [0, 3, 1]),
      });

      await asyncForEach(cases, async (obj) => {
        await obj.comb.set(instance);
        let has = await instance.specialCombinationHasIn(obj.symbols);
        assert.equal(has, obj.has);
      });
    });
  });

  describe('Game', () => {
    before(async () => {
      await initContract(owner);
    });
    context('setMinMaxBetAmount', () => {
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
        let msg = 'signature has expired';
        let expBlock = await latestBlockNumber() - 5;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let bet = new Bet(owner);
        await assertRevert(bet.place(instance, sig, expBlock), msg);
      });

      it('check signer', async () => {
        let msg = 'protection lib';
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        sig.v = 28 - sig.v + 27;
        let bet = new Bet(owner);
        await assertRevert(bet.place(instance, sig, expBlock), msg);
      });

      it('check bet alredy exist', async () => {
        let msg = 'bet already exist';
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let bet = new Bet(owner);
        bet.exist = true;
        await bet.set(instance, sig.hash);
        await assertRevert(bet.place(instance, sig, expBlock), msg);
      });

      it('check invalid bet amount', async () => {
        let msg = 'invalid bet amount';
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        let bet = new Bet(owner);
        await instance.gameSetMinMaxAmount(bet.amount.sub(new BN(1)), bet.amount.sub(new BN(1)));
        await assertRevert(bet.place(instance, sig, expBlock), msg);

        await instance.gameSetMinMaxAmount(bet.amount.add(new BN(1)), bet.amount.add(new BN(1)));
        await assertRevert(bet.place(instance, sig, expBlock), msg);
      });

      it('check lockedInBets and jackpot', async () => {
        let bet = new Bet(owner);
        let lockedInBets = 0;
        let jackpot = 0;
        await instance.gameSetLockedInBets(lockedInBets);
        await instance.gameSetJackpot(jackpot);
        await instance.gameSetMinMaxAmount(bet.amount, bet.amount);

        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        await bet.place(instance, sig, expBlock);

        let lockedInBetsAfter = await instance.gameLockedInBets();
        let jackpotAfter = await instance.gameJackpot();

        assert.equal(jackpotAfter.toString(10), bet.amount.mul(new BN(jackpotPercent)).div(new BN(100)).toString(10));
        assert.equal(lockedInBetsAfter.toString(10), bet.amount.toString(10));
      });

      it('success', async () => {
        let bet = new Bet(owner);
        await instance.gameSetMinMaxAmount(bet.amount, bet.amount);
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        await bet.place(instance, sig, expBlock);
        let b = await instance.gameBet(sig.hash);
        bet.equal(b);
      });

      it('event LogSlotNewBet', async () => {
        let bet = new Bet(owner);
        bet.referrer = addr1;
        await instance.gameSetMinMaxAmount(bet.amount, bet.amount);
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(utils.randomHex(32), expBlock);
        await bet.place(instance, sig, expBlock);

        let block = await latestBlockNumber();
        const logs = await instance.getPastEvents('LogSlotNewBet', {
          fromBlock: block,
          toBlock: block,
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

    context('refundBet', () => {
      before(async () => {
        await initContract(owner);
      });
      it('check bet does not exist', async () => {
        let msg = 'bet does not exist';
        await assertRevert(instance.gameRefundBet(utils.randomHex(32)), msg);
      });

      it('check bet already handled', async () => {
        let msg = 'bet already handled';
        let hostSeedHash = utils.randomHex(32);
        let bet = new Bet(owner, new BN(0));
        bet.exist = true;
        await bet.set(instance, hostSeedHash);
        await assertRevert(instance.gameRefundBet(hostSeedHash), msg);
      });
      it('check can`t refund bet', async () => {
        let msg = 'can`t refund bet';
        let hostSeedHash = utils.randomHex(32);
        let bet = new Bet(owner);
        bet.exist = true;
        bet.blockNumber = await latestBlockNumber();
        await bet.set(instance, hostSeedHash);
        await assertRevert(instance.gameRefundBet(hostSeedHash), msg);
      });

      it('check revert on low jacpot', async () => {
        let hostSeedHash = utils.randomHex(32);
        let bet = new Bet(owner);
        bet.exist = true;
        bet.blockNumber = await latestBlockNumber();
        await bet.set(instance, hostSeedHash);
        await instance.gameSetJackpot(0);
        await assertRevert(instance.gameRefundBet(hostSeedHash));
      });

      it('check payment', async () => {
        let hostSeedHash = utils.randomHex(32);
        let bet = new Bet(owner);
        bet.exist = true;
        bet.blockNumber = await latestBlockNumber() + 257;
        await bet.set(instance, hostSeedHash);
        await instance.gameSetJackpot(bet.amount);
        await instance.gameRefundBet(hostSeedHash);

        let payment = await instance.payment();
        assert.equal(payment[0].toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(payment[1].toString(10), bet.amount.toString(10));
        assert.equal(payment[2], utils.padRight(utils.asciiToHex(refundLogMsg), 64));
      });

      it('success', async () => {
        let hostSeedHash = utils.randomHex(32);
        let bet = new Bet(owner);
        bet.exist = true;
        bet.blockNumber = await latestBlockNumber() + 257;
        await bet.set(instance, hostSeedHash);

        let jackpot = new BN(ether(1));
        let lockedInBets = new BN(ether(1));
        await instance.gameSetLockedInBets(lockedInBets);
        await instance.gameSetJackpot(jackpot);
        await instance.gameRefundBet(hostSeedHash);

        let lockedInBetsAfter = await instance.gameLockedInBets();
        let jackpotAfter = await instance.gameJackpot();
        assert.equal(lockedInBetsAfter.toString(10), lockedInBets.sub(bet.amount).toString(10));
        assert.equal(
          jackpotAfter.toString(10),
          jackpot.sub(bet.amount.mul(new BN(jackpotPercent)).div(new BN(100))).toString(10)
        );

        bet = new Bet(ZERO_ADDRESS, new BN(0), 0, true);
        let betAfter = await instance.gameBet(hostSeedHash); ;
        bet.equal(betAfter);
      });

      it('event LogSlotRefundBet', async () => {
        let hostSeedHash = utils.randomHex(32);
        let bet = new Bet(owner);
        bet.exist = true;
        bet.blockNumber = await latestBlockNumber() + 257;
        await bet.set(instance, hostSeedHash);

        let jackpot = new BN(ether(1));
        let lockedInBets = new BN(ether(1));
        await instance.gameSetLockedInBets(lockedInBets);
        await instance.gameSetJackpot(jackpot);
        await instance.gameRefundBet(hostSeedHash);

        let block = await latestBlockNumber();
        const logs = await instance.getPastEvents('LogSlotRefundBet', {
          fromBlock: block,
          toBlock: block,
        });
        assert.equal(logs.length, 1, 'logs length');
        const e = logs[0];

        assert.equal(e.event, 'LogSlotRefundBet');
        assert.equal(e.args.hostSeedHash, hostSeedHash);
        assert.equal(e.args.gambler.toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(e.args.amount.toString(10), bet.amount.toString(10));
      });
    });

    context('setReel', () => {
      before(async () => {
        await initContract(owner);
      });
      it('check invalid reel number', async () => {
        let msg = 'invalid reel number';
        let symbols = utils.randomHex(10).replace('ff', 'aa'); ;
        let n = reelsLen;
        await assertRevert(instance.gameSafeSetReels(n, symbols), msg);
      });

      it('check invalid reel`s symbols length', async () => {
        let msg = 'invalid reel`s symbols length';
        let symbols = '0x';
        let n = reelsLen - 4;
        await assertRevert(instance.gameSafeSetReels(n, symbols), msg);
      });
      it('check reel`s symbols contains invalid symbol', async () => {
        let msg = 'reel`s symbols contains invalid symbol';
        let symbols = utils.randomHex(10) + unusedSymbolHex;
        let n = reelsLen - 1;
        await assertRevert(instance.gameSafeSetReels(n, symbols), msg);
      });

      it('success', async () => {
        let symbols = utils.randomHex(10).replace('ff', 'aa');
        let n = reelsLen - 1;
        await instance.gameSafeSetReels(n, symbols);
        let symbolsAfter = await instance.gameReels(n);
        assert.equal(symbols, symbolsAfter);
      });
    });

    context('setPayLine', () => {
      before(async () => {
        await initContract(owner);
      });
      it('check invalid pay line number', async () => {
        let msg = 'invalid pay line number';
        let comb = new Combination();
        let n = 0;
        await assertInvalidOpcode(instance.gamePayLine(n));
        await assertRevert(comb.setPayLine(instance, n + 1), msg);
      });

      it('check combination symbols contains invalid symbol', async () => {
        let msg = 'combination symbols contains invalid symbol';
        let comb = new Combination();
        let n = 0;
        await assertRevert(comb.setPayLine(instance, n, `0x2312${unusedSymbolHex}`), msg);
      });

      it('check push', async () => {
        let n = 0;
        let comb = new Combination();
        await assertInvalidOpcode(instance.gamePayLine(n));
        await comb.setPayLine(instance, n);
        let payLine = await instance.gamePayLine(n);
        comb.equal(payLine);
      });

      it('check pop', async () => {
        let n = 0;
        let comb = new Combination();
        await instance.gamePayLine(n);
        await comb.setPayLine(instance, n, '0x');
        await assertInvalidOpcode(instance.gamePayLine(n));
      });

      it('check invalid combination`s symbols length', async () => {
        let msg = 'invalid combination`s symbols length';
        let comb = new Combination();
        let n = 0;
        await comb.setPayLine(instance, n);
        await comb.setPayLine(instance, n + 1);
        await assertRevert(comb.setPayLine(instance, n, '0x'), msg);
      });

      it('success', async () => {
        let n = 0;
        let comb = new Combination();
        await comb.setPayLine(instance, n);
        let payLine = await instance.gamePayLine(n);
        comb.equal(payLine);
      });
    });

    context('setSpecialPayLine', () => {
      before(async () => {
        await initContract(owner);
      });
      it('check invalid pay line number', async () => {
        let msg = 'invalid pay line number';
        let comb = new SpecialCombination();
        let n = 0;
        await assertInvalidOpcode(instance.gameSpecialPayLine(n));
        await assertRevert(comb.set(instance, n + 1), msg);
      });

      it('check invalid special combination`s symbol', async () => {
        let msg = 'invalid special combination`s symbol';
        let comb = new SpecialCombination();
        let n = 0;
        await assertInvalidOpcode(instance.gameSpecialPayLine(n));
        await assertRevert(comb.set(instance, n, `0x${unusedSymbolHex}`), msg);
      });

      it('check push', async () => {
        let comb = new SpecialCombination();
        let n = 0;
        await assertInvalidOpcode(instance.gameSpecialPayLine(n));
        await comb.set(instance, n);
        let spayLine = await instance.gameSpecialPayLine(n);
        comb.equal(spayLine);
      });

      it('check pop', async () => {
        let n = 0;
        let comb = new SpecialCombination();
        comb.indexes = [];
        await instance.gameSpecialPayLine(n);
        await comb.set(instance, n);
        await assertInvalidOpcode(instance.gameSpecialPayLine(n));
      });

      it('check invalid special combination`s indexes length', async () => {
        let msg = 'invalid special combination`s indexes length';
        let comb = new SpecialCombination();
        let n = 0;
        await comb.set(instance, n);
        await comb.set(instance, n + 1);
        comb.indexes = [];
        await assertRevert(comb.set(instance, n), msg);
      });

      it('success', async () => {
        let comb = new SpecialCombination(utils.randomHex(1).slice(2, 3));
        let n = 0;
        await comb.set(instance, n);
        let spayLine = await instance.gameSpecialPayLine(n);
        comb.equal(spayLine);
      });
    });

    context('spin', () => {
      before(async () => {
        await initContract(owner);
        game = new Game(gameReels, gamePayTable, gameSpecialPayTable);
        await game.set(instance);
      });
      it('check combination js class', async () => {
        let comb;
        gameSpins.forEach(s => {
          try {
            comb = game.spin(s.hostSeed, s.clientSeed);
            assert.equal(comb.symbols, s.symbols);
            assert.equal(comb.multiplier(), s.multiplier);
          } catch (e) {
            console.log(s.hostSeed);
            console.log(s.clientSeed);
            console.log(`js: ${JSON.stringify(comb)}`);
            assert.fail(e.message);
          }
        });
      });

      it('check combination symbols', async () => {
        let cases = [];
        for (let i = 0; i < 8; i++) {
          let hostSeed = utils.randomHex(32);
          let clientSeed = utils.randomHex(32);
          let comb = game.spin(hostSeed, clientSeed);
          cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, comb: comb });
        }

        // lose case
        let hostSeed = '0x1a4ea870dc62d5f615bb9ce7f6d4f68707d66bee026c340494634635defbdfff';
        let clientSeed = '0xebcbb62cb41f25c6e0b581611db2622a59b12c8340d801c6357017a73160491c';
        cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, comb: game.spin(hostSeed, clientSeed) });

        // win case
        hostSeed = '0x6f44027643a3b1efef79b598b3e6a422930b6a3d75d9d7a61039137695987435';
        clientSeed = '0x90f89985bb5d79b49ac7a2d332bb686a7b3cdb2abcc383fdb179041e2c9b9587';
        cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, comb: game.spin(hostSeed, clientSeed) });

        let r;
        await asyncForEach(cases, async function (c) {
          try {
            r = await instance.gameSpin(c.hostSeed, c.clientSeed);
            c.comb.equal(r);
          } catch (e) {
            console.log(c.hostSeed);
            console.log(c.clientSeed);
            console.log(`js: ${JSON.stringify(c.comb)}`);
            console.log(`sol: ${JSON.stringify(r)}`);
            assert.fail(e);
          }
        });
      });

      it('check found big combination', async () => {
        let reelsForBigCombs = [];
        let rr = gameReels.slice();
        rr.fill('3', 0, 9); // 3..3  0
        reelsForBigCombs.push(rr.slice());
        rr[8] = '0';
        reelsForBigCombs.push(rr.slice());

        await asyncForEach(reelsForBigCombs, async function (reels) {
          game.reels = reels;
          await game.setReels(instance);
          let hostSeed = utils.randomHex(32);
          let clientSeed = utils.randomHex(32);
          let comb = game.spin(hostSeed, clientSeed);
          let r = await instance.gameSpin(hostSeed, clientSeed);
          comb.equal(r);
        });
      });

      it('check found special combination', async () => {
        let indexes = {};
        for (let i = 0; i < 2; i++) {
          let j = RndN(gameSpecialPayTable.length);
          gameSpecialPayTable[j].indexes.forEach(indx => {
            indexes[indx] = indx;
          });
        }
        game.reels.fill('0', 0, 10);
        Object.values(indexes).map(indx => { game.reels[indx] = '3'; });

        await game.setReels(instance);
        let cases = [];
        for (let i = 0; i < 5; i++) {
          let hostSeed = utils.randomHex(32);
          let clientSeed = utils.randomHex(32);
          let comb = game.spin(hostSeed, clientSeed);
          cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, comb: comb });
        }

        let r;
        await asyncForEach(cases, async function (c) {
          r = await instance.gameSpin(c.hostSeed, c.clientSeed);

          try {
            r = await instance.gameSpin(c.hostSeed, c.clientSeed);
            c.comb.equal(r);
          } catch (err) {
            console.log(c.hostSeed);
            console.log(c.clientSeed);
            console.log(`js: ${JSON.stringify(c.comb)}`);
            console.log(`sol: ${JSON.stringify(r)}`);
            assert.fail(err.message);
          }

          c.comb.equal(r);
        });
      });
    });

    context('handleBet', () => {
      before(async () => {
        await initContract(owner);
        game = new Game(gameReels, gamePayTable, gameSpecialPayTable);
        await game.set(instance);
      });

      it('check bet does not exist', async () => {
        let msg = 'bet does not exist';
        let hostSeed = utils.randomHex(32);
        let clientSeed = '0x0';
        await assertRevert(instance.gameHandleBet(hostSeed, clientSeed), msg);
      });
      it('check bet already handled', async () => {
        let msg = 'bet already handled';
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let clientSeed = '0x0';
        let bet = new Bet(owner, 0, 0, true);
        await bet.set(instance, sig.hash);
        await assertRevert(instance.gameHandleBet(hostSeed, clientSeed), msg);
      });
      it('check block protection', async () => {
        let msg = 'protection lib';
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let bet = new Bet(owner);
        bet.exist = true;
        await bet.set(instance, sig.hash);
        let clientSeed = '0x0';
        await assertRevert(instance.gameHandleBet(hostSeed, clientSeed), msg);
      });

      it('check lockedInBets', async () => {
        let hostSeed = utils.randomHex(32);
        let expBlock = await latestBlockNumber() + 100;
        let sig = signer.signWithExp(hostSeed, expBlock);
        let bet = new Bet(owner);
        await instance.gameSafeSetMinMaxBetAmount(bet.amount, bet.amount);
        await bet.place(instance, sig, expBlock);
        let block = await latestBlock();

        let lockedInBetsBefore = await instance.gameLockedInBets();
        await instance.gameHandleBet(hostSeed, block.hash);
        let lockedInBetsAfter = await instance.gameLockedInBets();

        assert.equal(lockedInBetsAfter.toString(10), lockedInBetsBefore.sub(bet.amount).toString(10));
      });

      it('check payment', async () => {
        let block = await latestBlock();
        let clientSeed = block.hash;
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);

        let comb = game.spin(hostSeed, clientSeed);
        while (true) {
          if (comb.num > 0) {
            break;
          }
          hostSeed = utils.randomHex(32);
          sig = signer.sign(hostSeed);
          comb = game.spin(hostSeed, clientSeed);
        }

        let bet = new Bet(addr1, new BN(minBetAmount), block.number, true);
        await bet.set(instance, sig.hash);
        await instance.gameHandleBet(hostSeed, clientSeed);
        let payment = await instance.payment();
        assert.equal(payment[0].toLowerCase(), bet.gambler.toLowerCase());
        assert.equal(payment[1].toString(10), comb.winnings(bet.amount).toString(10));
        assert.equal(payment[2], utils.padRight(utils.asciiToHex(paymentLogMsg), 64));
      });

      it('event LogSlotHandleBet', async () => {
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let block = await latestBlock();
        let clientSeed = block.hash;

        let bet = new Bet(addr1, new BN(minBetAmount), block.number, true);
        await bet.set(instance, sig.hash);
        await instance.gameHandleBet(hostSeed, clientSeed);

        let blockNumber = await latestBlockNumber();
        const logs = await instance.getPastEvents('LogSlotHandleBet', {
          fromBlock: blockNumber,
          toBlock: blockNumber,
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
          comb.winnings(bet.amount, houseEdgePercent, jackpotPercent).toString(10),
          'winnings'
        );
      });

      it('check deleting', async () => {
        let block = await latestBlock();
        let clientSeed = block.hash;
        let hostSeed = utils.randomHex(32);
        let sig = signer.sign(hostSeed);
        let bet = new Bet(addr1, new BN(minBetAmount), block.number, true);
        await bet.set(instance, sig.hash);
        await instance.gameHandleBet(hostSeed, clientSeed);
        bet = new Bet(ZERO_ADDRESS, new BN(ether(0)), 0, true);
        let b = await instance.gameBet(sig.hash);
        bet.equal(b);
      });
    });
  });
});
