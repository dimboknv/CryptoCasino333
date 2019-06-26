import latestBlockNumber from './helpers/latestBlockNumber';
import latestBlock from './helpers/latestBlock';
import { Signer } from './helpers/signer';
import assertRevert from './helpers/assertRevert';

const signer = new Signer();
const utils = web3.utils;

const ProtLib = artifacts.require('./contracts/tests/TestProtLib.sol');

let instance;
let initContract = async function (owner) {
  instance = await ProtLib.new({ from: owner });
};

contract('ProtLib', function ([owner]) {
  describe('checkBlockHash', () => {
    before(async () => {
      await initContract(owner);
    });
    it('check: current block must be great then block number', async () => {
      const msg = 'current block must be great then block number';
      let latesBlockNum = await latestBlockNumber();
      let blockHash = '0x0';
      await assertRevert(instance.CheckBlockHash(latesBlockNum + 2, blockHash), msg);
    });
    it('check: blockhash can\'t be queried by EVM', async () => {
      let latesBlockNum = await latestBlockNumber();
      for (latesBlockNum; latesBlockNum < 256; latesBlockNum++) {
        await instance.a();
      }
      const msg = 'blockhash can\'t be queried by EVM';
      let blockHash = '0x0';
      latesBlockNum = 0;
      await assertRevert(instance.CheckBlockHash(latesBlockNum, blockHash), msg);
    });
    it('check: invalid block hash', async () => {
      const msg = 'invalid block hash';
      let latesBlockNum = await latestBlockNumber();
      let blockHash = '0x0';
      await assertRevert(instance.CheckBlockHash(latesBlockNum, blockHash), msg);
    });
    it('success', async () => {
      let block = await latestBlock();
      await instance.CheckBlockHash(block.number, block.hash);
    });
  });

  describe('checkSigner', () => {
    before(async () => {
      await initContract(owner);
    });
    it('check: ECDSA signature is not valid', async () => {
      const msg = 'ECDSA signature is not valid';
      let sig = signer.sign(utils.randomHex(32));
      await assertRevert(instance.CheckSigner(signer.pubKeyETH(), sig.hash, sig.v, sig.s, sig.r), msg);
    });

    it('success', async () => {
      let sig = signer.sign(utils.randomHex(32));
      await instance.CheckSigner(signer.pubKeyETH(), sig.hash, sig.v, sig.r, sig.s);
    });
  });
});
