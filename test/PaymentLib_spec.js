import ether from './helpers/ether';
import getBalance from './helpers/getBalance';
import latestBlock from './helpers/latestBlock';

const PaymentLib = artifacts.require('./contracts/tests/TestPaymentLib.sol');
const NotPayable = artifacts.require('./contracts/mocks/MockNotPayable.sol');

let instance;
let initContract = async function (owner) {
  instance = await PaymentLib.new({ from: owner });
};

contract('PaymentLib', function ([owner, addr1]) {
  describe('send', () => {
    before(async () => {
      await initContract(owner);
      await instance.eth({ from: owner, value: ether(10) });
    });
    it('balances', async () => {
      let beneficiary = addr1;
      let amount = ether(1);
      let message = web3.utils.utf8ToHex('message');
      let bContract = await getBalance(instance.address);
      let bBeneficiary = await getBalance(beneficiary);
      await instance.Send(beneficiary, amount, message, { from: owner });
      let aContract = await getBalance(instance.address);
      let aBeneficiary = await getBalance(beneficiary);
      assert.equal(aContract.add(amount).toString(10), bContract.toString(10));
      assert.equal(aBeneficiary.sub(amount).toString(10), bBeneficiary.toString(10));
    });

    it('event LogPayment', async () => {
      let beneficiary = addr1;
      let amount = ether(1);
      let message = web3.utils.utf8ToHex('message');
      await instance.Send(beneficiary, amount, message, { from: owner });
        
      let block = await latestBlock();
      const logs = await instance.getPastEvents('LogPayment', {
        fromBlock: block.number,
        toBlock: block.number,
      });
      assert.equal(logs.length, 1);
      const e = logs[0];
        
      assert.equal(e.event, 'LogPayment');
      assert.equal(e.args.beneficiary.toLowerCase(), beneficiary.toLowerCase());
      assert.equal(e.args.amount.toString(10), amount.toString(10));
      assert.equal(web3.utils.hexToUtf8(e.args.message), web3.utils.hexToUtf8(message));
    });

    it('event LogFailedPayment', async () => {
      let notPayable = await NotPayable.new({ from: owner });
      let beneficiary = notPayable.address;
      let amount = ether(1);
      let message = web3.utils.utf8ToHex('message');

      await instance.Send(beneficiary, amount, message, { from: owner });
      
      let block = await latestBlock();
      const logs = await instance.getPastEvents('LogFailedPayment', {
        fromBlock: block.number,
        toBlock: block.number,
      });
      assert.equal(logs.length, 1);
      const e = logs[0];
        
      assert.equal(e.event, 'LogFailedPayment');
      assert.equal(e.args.beneficiary.toLowerCase(), beneficiary.toLowerCase());
      assert.equal(e.args.amount.toString(10), amount.toString(10));
      assert.equal(web3.utils.hexToUtf8(e.args.message), web3.utils.hexToUtf8(message));
    });
  });
  /*
  describe('sendJactpot', () => {
    it('event LogJactpot', async () => {
      let beneficiary = addr1;
      let amount = ether(1);
      let message = web3.utils.utf8ToHex('message');

      await instance.SendJactpot(beneficiary, amount, message, { from: owner });
      
      let block = await latestBlock();
      const logs = await instance.getPastEvents('LogJactpot', {
        fromBlock: block.number,
        toBlock: block.number,
      });
      assert.equal(logs.length, 1);
      const e = logs[0];
        
      assert.equal(e.event, 'LogJactpot');
      assert.equal(e.args.beneficiary.toLowerCase(), beneficiary.toLowerCase());
      assert.equal(e.args.amount.toString(10), amount.toString(10));
      assert.equal(web3.utils.hexToUtf8(e.args.message), web3.utils.hexToUtf8(message));
    });
  }); */
});
