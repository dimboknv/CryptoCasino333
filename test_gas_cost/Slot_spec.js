import ether from '../helpers/ether';
import asyncForEach from '../helpers/asyncForEach';
import latestBlock from '../helpers/latestBlock';
import { Signer } from '../helpers/signer';
import * as Slot from '../SlotGameLib_spec';
import { ZERO_ADDRESS } from '../helpers/zeroAddress';
import { data } from './data';
import { RndN } from '../Rnd_spec';

const signer = new Signer();
const SlotGame = artifacts.require('./contracts/tests/TestSlotGameLib.sol');

// spin
function SpinCase (reels, comb, hostSeed, clientSeed, cost) {
  this.reels = reels;
  this.comb = comb;
  this.hostSeed = hostSeed;
  this.clientSeed = clientSeed;
  this.cost = cost;
}
let result = [];
let game;
let instance;
let initContract = async function (owner) {
  instance = await SlotGame.new({ from: owner, value: ether(10), gas: 20e6 });
};

// handle bet
let instanceResultHandleBet = [];

// place bet
let instanceResultPlaceBet = [];

contract('SlotGameLibCost', function ([owner]) {
  describe('handle bet', () => {
    before(async () => {
      await initContract(owner);
      game = new Slot.Game(Slot.gameReels, Slot.gamePayTable, Slot.gameSpecialPayTable);
      await game.set(instance);
      await instance.gameSafeSetMinMaxBetAmount(Slot.minBetAmount, Slot.minBetAmount);
      await instance.gameSetSecretSigner(signer.pubKeyETH());
    });

    /*
    it('cost 1', async () => {
      for(let i = 0; i < 1e3; i++) {
        let hostSeed = utils.randomHex(32);
        let clientSeed = utils.randomHex(32);
        let comb = game.spin(hostSeed, clientSeed);
        let r;
        try {
          r = await instance.gameSpin(hostSeed, clientSeed);
          comb.equal(r);
        } catch (e) {
          console.log(`err: ${e.message}`);
          console.log(`hostSeed: ${hostSeed}`);
          console.log(`clientSeed: ${clientSeed}`);
          console.log(`js: ${JSON.stringify(comb)}`);
          console.log(`sol: symbols:"${utils.hexToAscii(r[0])}", num: ${r[1].toNumber()}, den: ${r[2].toNumber()}`);
          assert.fail(e.message);
        }
      }
    });
    */

    it('cost', async () => {
      let block = await latestBlock();
      await asyncForEach(data, async e => {
        let bet = new Slot.Bet(owner, Slot.minBetAmount, block.number, true);
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

  describe('spin', () => {
    it('cost', async () => {
      let cases = [];
      data.forEach(e => {
        cases.push({ hostSeed: e.hostSeed, clientSeed: e.clientSeed, comb: game.spin(e.hostSeed, e.clientSeed) });
      });

      Slot.gameSpins.forEach(e => {
        cases.push({ hostSeed: e.hostSeed, clientSeed: e.clientSeed, comb: game.spin(e.hostSeed, e.clientSeed) });
      });
      // lose case
      let hostSeed = '0x1a4ea870dc62d5f615bb9ce7f6d4f68707d66bee026c340494634635defbdfff';
      let clientSeed = '0xebcbb62cb41f25c6e0b581611db2622a59b12c8340d801c6357017a73160491c';
      cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, comb: game.spin(hostSeed, clientSeed) });
      // win case
      hostSeed = '0x6f44027643a3b1efef79b598b3e6a422930b6a3d75d9d7a61039137695987435';
      clientSeed = '0x90f89985bb5d79b49ac7a2d332bb686a7b3cdb2abcc383fdb179041e2c9b9587';
      cases.push({ hostSeed: hostSeed, clientSeed: clientSeed, comb: game.spin(hostSeed, clientSeed) });

      await asyncForEach(cases, async function (c) {
        let r = await instance.gameSpinTx(c.hostSeed, c.clientSeed);
        result.push(new SpinCase(game.reels, c.comb, c.hostSeed, c.clientSeed, r.receipt.gasUsed));
      });
    });
    
    it('check found big combination', async () => {
      let reelsForBigCombs = [];
      let rr = Slot.gameReels.slice();
      rr.fill('3', 0, 9); // 3..3  0
      reelsForBigCombs.push(
        {
          hostSeed: '0x7fa9c8a51fbe0a167cd62a9c8735d7b0d655c760dded9c3a1ec2c8c1b7c3c030',
          clientSeed: '0x8b505d6ca583ef17f1322663f0972f7af10f57f653c6344c2ddf71e20491e15e',
          reels: rr.slice(),
        });
      reelsForBigCombs.push(
        {
          hostSeed: '0x9072cea61810d2d82590c7e063b016d43cd4acd51c8103912ddcaf29f52224b1',
          clientSeed: '0xbc9f8ea5bc19c4506ba4f363480a8d5da48034fa46e037ae328d8b5a67b177c8',
          reels: rr.slice(),
        });
      await asyncForEach(reelsForBigCombs, async obj => {
        game.reels = obj.reels;
        await game.setReels(instance);
        let comb = game.spin(obj.hostSeed, obj.clientSeed);
        let r = await instance.gameSpinTx(obj.hostSeed, obj.clientSeed);
        result.push(new SpinCase(game.reels, comb, obj.hostSeed, obj.clientSeed, r.receipt.gasUsed));
      });
    });

    it('check found special combination', async () => {
      let indexes = {};
      for (let i = 0; i < 2; i++) {
        let j = RndN(Slot.gameSpecialPayTable.length);
        Slot.gameSpecialPayTable[j].indexes.forEach(indx => {
          indexes[indx] = indx;
        });
      }
      game.reels.fill('0', 0, 10);
      Object.values(indexes).map(indx => { game.reels[indx] = '3'; });

      await game.setReels(instance);
      let data = [];
      /* eslint-disable max-len */
      data.push({ hostSeed: '0x981c5ba3924b72707aae638c24407ba00811450f9e5ac682ea87fef81df1cf77', clientSeed: '0x477cdac21566d868f323557d5f3ad377942204d844de28e52f627095a43ceba0' });
      data.push({ hostSeed: '0xfe60a6f8157d670d21d06e5bb317897b66d2489466ac197d8a6cb1f565c79712', clientSeed: '0x4df2a214fa1cfdb3d82594f9546a3927eacd6fd8956cd031cc4a231bdbb3cc57' });
      data.push({ hostSeed: '0x80ff40c1eacc7a8431202d70cbff36306a358fba222ad2b4da1c924c443806f7', clientSeed: '0x9f73432830ac144f2d6125a9cec061b0e1f0ade40ac13b45da3169bba591c7ec' });
      data.push({ hostSeed: '0x986752d99229629b9a810ee10502a2c474d5966d2c80382ec009b0f4d81d629f', clientSeed: '0x0d9762ac574096c1074462b95b7830bf3a25d33eae3bb54b6bd6d00eaaea7c64' });
      data.push({ hostSeed: '0x576812aa3dfc4610ffe8f75d931c98fe52f04f18400a586c80d1b6f4cfc3b6bb', clientSeed: '0xb472c7b59376f9dc92b44389a2a47fe87641fd7905f6bef1bd1131d5abaa1250' });
      /* eslint-enable max-len */
      let cases = [];
      data.forEach(e => {
        cases.push({ hostSeed: e.hostSeed, clientSeed: e.clientSeed, comb: game.spin(e.hostSeed, e.clientSeed) });
      });

      await asyncForEach(cases, async function (c) {
        let r = await instance.gameSpinTx(c.hostSeed, c.clientSeed);
        result.push(new SpinCase(game.reels, c.comb, c.hostSeed, c.clientSeed, r.receipt.gasUsed));
      });
    });
    
    it('print results', async () => {
      let totalCost = 0;
      let totalWin = 0;
      result.forEach(function (r) {
        // console.log(JSON.stringify(r));
        totalCost += r.cost;
        totalWin += r.comb.multiplier();
      });
      console.log(`avg spin cost: ${totalCost / result.length}, total win: ${totalWin} for ${result.length} spinc`);
    });
  });

  describe('place bet', () => {
    before(async () => {
      await initContract(owner);
      await instance.gameSafeSetMinMaxBetAmount(Slot.minBetAmount, Slot.minBetAmount);
      await instance.gameSetSecretSigner(signer.pubKeyETH());
    });
    it('cost', async () => {
      let cases = [];
      let expBlock = await latestBlock();
      expBlock = expBlock.number + 100;
      data.forEach(e => {
        cases.push({ sig: signer.signWithExp(e.hostSeed, expBlock), hostSeed: e.hostSeed, expBlock: expBlock++ });
      });
      let i = 0;
      
      await asyncForEach(cases, async e => {
        try {
          if (i === 0) {
            await instance.gamePlaceBet(ZERO_ADDRESS, e.expBlock, e.sig.hash, e.sig.v, e.sig.r, e.sig.s,
              { value: Slot.minBetAmount }
            );
            i++;
            return;
          }
          let r = await instance.gamePlaceBet(ZERO_ADDRESS, e.expBlock, e.sig.hash, e.sig.v, e.sig.r, e.sig.s,
            { value: Slot.minBetAmount }
          );
          instanceResultPlaceBet.push({ cost: r.receipt.gasUsed });
        } catch (err) {
          console.log(err.message);
          console.log(JSON.stringify(e));
          console.log(signer.privKey());
        }
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
