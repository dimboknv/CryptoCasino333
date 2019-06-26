import ether from '../helpers/ether';
import asyncForEach from '../helpers/asyncForEach';
import latestBlock from '../helpers/latestBlock';
import { Signer } from '../helpers/signer';
import * as Roll from '../RollGameLib_spec';
import { ZERO_ADDRESS } from '../helpers/zeroAddress';
import { data } from './data';

const signer = new Signer();
const RollGame = artifacts.require('./contracts/tests/TestRollGameLib.sol');
const utils = web3.utils;

let instance;
let initContract = async function (owner) {
  instance = await RollGame.new({ from: owner, value: ether(10), gas: 20e6 });
};

// handle bet
let instanceResultHandleBet = [];

// place bet
let instanceResultPlaceBet = [];

contract('RollGameLibCost', function ([owner, addr1]) {
  describe('handle bet', () => {
    before(async () => {
      await initContract(owner);
      await instance.gameSafeSetMinMaxBetAmount(Roll.minBetAmount, Roll.minBetAmount);
      await instance.gameSetSecretSigner(signer.pubKeyETH());
    });
    
    it('Coin', async () => {
      const t = Roll.Types.Coin;
      let block = await latestBlock();
      let bet = new Roll.Bet(t, ether(0.001), t.minMaskRange, t.minRollUnderRange, block.number, addr1, true);
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
      // console.log(`bet: ${JSON.stringify(bet)}`);
      // console.log(`coin win: ${JSON.stringify(cases[0])}`);
      // console.log(`coin lose: ${JSON.stringify(cases[1])}`);
    });

    it('Roll', async () => {
      const t = Roll.Types.Roll;
      let block = await latestBlock();
      let bet = new Roll.Bet(t, ether(0.001), t.minMaskRange, t.minRollUnderRange, block.number, addr1, true);
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

      // console.log(`bet: ${JSON.stringify(bet)}`);
      // console.log(`roll win: ${JSON.stringify(cases[0])}`);
      // console.log(`roll lose: ${JSON.stringify(cases[1])}`);
    });

    it('game handle', async () => {
      let block = await latestBlock();
      const t = Roll.Types.Roll;
      await asyncForEach(data, async e => {
        let bet = new Roll.Bet(t, Roll.minBetAmount, t.maxMaskRange, t.maxRollUnderRange, block.number, addr1, true);
        await bet.set(instance, signer.sign(e.hostSeed).hash);
      });

      await asyncForEach(data, async e => {
        let r = await instance.gameHandleBetWithoutPayment(e.hostSeed, block.hash);
        instanceResultHandleBet.push({ cost: r.receipt.gasUsed });
      });
    });
    it('print results handle bet cost', async () => {
      let totalCost = 0;
      instanceResultHandleBet.forEach(function (r) {
        // console.log(JSON.stringify(r));
        totalCost += r.cost;
      });
      let avrgCost = totalCost / instanceResultHandleBet.length;
      console.log(`avg handle bet cost ${avrgCost} for ${instanceResultHandleBet.length} times`);
    });
  });

  describe('place bet', () => {
    before(async () => {
      await initContract(owner);
      await instance.gameSafeSetMinMaxBetAmount(Roll.minBetAmount, Roll.minBetAmount);
      await instance.gameSetSecretSigner(signer.pubKeyETH());
    });
    it('cost', async () => {
      let cases = [];
      let expBlock = await latestBlock();
      expBlock = expBlock.number + 100;
      data.forEach((e, i) => {
        let t;
        switch (i % 3) {
        case 0:
          t = Roll.Types.Coin;
          break;
        case 1:
          t = Roll.Types.Square3x3;
          break;
        case 2:
          t = Roll.Types.Roll;
          break;
        }
        cases.push({
          sig: signer.signWithExp(e.hostSeed, expBlock),
          hostSeed: e.hostSeed,
          t: t,
          expBlock: expBlock++,
        });
      });
      let i = 0;
      
      await asyncForEach(cases, async e => {
        // try {
        if (i === 0) {
          await instance.gamePlaceBet(
            e.t.n, e.t.maxMaskRange, e.t.maxRollUnderRange,
            ZERO_ADDRESS, e.expBlock, e.sig.hash, e.sig.v, e.sig.r, e.sig.s,
            { value: Roll.minBetAmount }
          );
          i++;
          return;
        }
        let r = await instance.gamePlaceBet(
          e.t.n, e.t.maxMaskRange, e.t.maxRollUnderRange, ZERO_ADDRESS,
          e.expBlock, e.sig.hash, e.sig.v, e.sig.r, e.sig.s,
          { value: Roll.minBetAmount }
        );
        instanceResultPlaceBet.push({ cost: r.receipt.gasUsed });
      });
    });
    it('print results place bet cost', async () => {
      let totalCost = 0;

      instanceResultPlaceBet.forEach(function (r) {
        // console.log(JSON.stringify(r));
        totalCost += r.cost;
      });
      let avrgCost = totalCost / instanceResultPlaceBet.length;
      console.log(`avg place bet cost ${avrgCost} for ${instanceResultPlaceBet.length} times`);
    });
  });
});
