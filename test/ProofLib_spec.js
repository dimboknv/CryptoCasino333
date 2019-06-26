const ProofLib = artifacts.require('./contracts/tests/TestProofLib.sol');

let instance;
let initContract = async function (owner) {
  instance = await ProofLib.new({ from: owner });
};

contract('ProofLib', function ([owner]) {
  before(async () => {
    await initContract(owner);
  });
  describe('chainHash', () => {
    it('throw chain proof length too low', async () => {
    });
    it('throw non-empty uncles hash slot', async () => {
    });
    it('success', async () => {
    });
  });

  describe('uncleHeader', () => {
    it('throw uncle proof length too low', async () => {
    });
    it('throw non-empty hash slot', async () => {
    });
    it('success', async () => {
    });
  });
  describe('blobPtrLenShift', () => {
    it('throw blob length out of range proof', async () => {
    });
    it('throw blob shift bounds check', async () => {
    });
    it('success', async () => {
    });
  });
});
