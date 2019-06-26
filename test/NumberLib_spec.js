import { RndNumber } from './Rnd_spec';
import asyncForEach from './helpers/asyncForEach';

const NumberLib = artifacts.require('./contracts/tests/TestNumberLib.sol');

let instance;
let initContract = async function (owner) {
  instance = await NumberLib.new({ from: owner });
};

contract('NumberLib', function ([owner]) {
  describe('operations', () => {
    before(async () => {
      await initContract(owner);
    });
    it('muluint', async () => {
      let cases = [];
      for (let i = 0; i < 10; i++) {
        let num = RndNumber(1, 1000);
        let den = RndNumber(1, 1000);
        let b = RndNumber(1, 1000);
        cases.push({ num: num, den: den, b: b, r: Math.floor((b * num) / den) });
      }
      await asyncForEach(cases, async (c) => {
        let r = await instance.Muluint(c.num, c.den, c.b);
        assert.equal(r.toNumber(), c.r);
      });
    });
    it('mmul', async () => {
      let cases = [];
      for (let i = 0; i < 10; i++) {
        let num = RndNumber(1, 1000);
        let den = RndNumber(1, 1000);
        let b = RndNumber(1, 1000);
        cases.push({ num: num, den: den, b: b, rnum: num * b, rden: den });
      }
      await asyncForEach(cases, async (c) => {
        let r = await instance.Mmul(c.num, c.den, c.b);
        assert.equal(r[0].toNumber(), c.rnum);
        assert.equal(r[1].toNumber(), c.rden);
      });
    });
    it('Maddm', async () => {
      let cases = [];
      for (let i = 0; i < 8; i++) {
        let num1 = RndNumber(1, 1000);
        let den1 = RndNumber(1, 1000);
        let num2 = RndNumber(1, 1000);
        let den2 = RndNumber(1, 1000);
        let rnum = num1 * den2 + num2 * den1;
        let rden = den1 * den2;
        cases.push({ num1: num1, den1: den1, num2: num2, den2: den2, rnum: rnum, rden: rden });
      }
      await asyncForEach(cases, async (c) => {
        let r = await instance.Maddm(c.num1, c.den1, c.num2, c.den2);
        assert.equal(r[0].toNumber(), c.rnum);
        assert.equal(r[1].toNumber(), c.rden);
      });
    });

    it('Madds', async () => {
      let cases = [];
      for (let i = 0; i < 8; i++) {
        let num1 = RndNumber(1, 1000);
        let den1 = RndNumber(1, 1000);
        let num2 = RndNumber(1, 1000);
        let den2 = RndNumber(1, 1000);
        let rnum = num1 * den2 + num2 * den1;
        let rden = den1 * den2;
        cases.push({ num1: num1, den1: den1, num2: num2, den2: den2, rnum: rnum, rden: rden });
      }
      await asyncForEach(cases, async (c) => {
        await instance.Madds(c.num1, c.den1, c.num2, c.den2);
        let r = await instance.ns();
        assert.equal(r[0].toNumber(), c.rnum);
        assert.equal(r[1].toNumber(), c.rden);
      });
    });
  });
});
