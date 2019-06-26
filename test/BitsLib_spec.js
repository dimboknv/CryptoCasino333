const BitsLib = artifacts.require('./contracts/tests/TestBitsLib.sol');

let instance;
let initContract = async function (owner) {
  instance = await BitsLib.new({ from: owner });
};

export default function popcnt (val) {
  return val.toString(2).split('1').length - 1;
}

contract('BitsLib', function ([owner]) {
  describe('operations', () => {
    before(async () => {
      await initContract(owner);
    });
    it('popcnt', async () => {
      let cases = [];
      for (let i = 0; i < 10; i++) {
        let val = Math.floor(Math.random() * 0xffff);
        let count = val.toString(2).split('1').length - 1;
        cases.push({ val: val, count: count });
      }
      for (let i = 0; i < cases.length; i++) {
        // console.log(JSON.stringify(cases[i]));
        let r = await instance.Popcnt(cases[i].val);
        assert.equal(r.toNumber(10), cases[i].count);
      }
    });
  });
});
