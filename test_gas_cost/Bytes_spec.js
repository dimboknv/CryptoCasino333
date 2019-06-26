import asyncForEach from '../helpers/asyncForEach';
import * as Slot from '../SlotGameLib_spec';
import { data } from './data';

const utils = web3.utils;
const BytesLib = artifacts.require('./contracts/tests/TestBytesLib.sol');

// bytes
function BytesCase (symbols, oldb, cost) {
  this.symbols = symbols;
  this.oldb = oldb;
  this.cost = cost;
}
const newb = '0x' + Slot.unusedSymbolHex;
let bytesResultReplace = [];
let bytesResultFill = [];
let bytesInstance;
let initBytesContract = async function () {
  bytesInstance = await BytesLib.new();
};

contract('BytesLibCost', function () {
  before(async () => {
    await initBytesContract();
  });
  it('replace and fill', async () => {
    let ss = [];
    let testGame = new Slot.Game(Slot.gameReels, Slot.gamePayTable, Slot.gameSpecialPayTable);
    data.forEach(e => {
      ss.push(testGame.spin(e.hostSeed, e.clientSeed).symbols);
    });

    await asyncForEach(ss, async s => {
      await asyncForEach(Slot.gamePayTable, async line => {
        let oldb = utils.asciiToHex(line.symbols);
        let symbols = utils.asciiToHex(s);
        let r = await bytesInstance.ReplaceTx(symbols, oldb, newb);
        bytesResultReplace.push(new BytesCase(symbols, oldb, r.receipt.gasUsed));

        r = await bytesInstance.FillPatternTx(symbols, oldb, newb);
        bytesResultFill.push(new BytesCase(symbols, oldb, r.receipt.gasUsed));
      });
    });
  });
  it('print results replace', async () => {
    let totalCost = 0;
    bytesResultReplace.forEach(function (r) {
      // console.log(JSON.stringify(r));
      totalCost += r.cost;
    });
    console.log(`avg replace cost ${totalCost / bytesResultReplace.length} for ${bytesResultReplace.length} times`);
  });

  it('print results fill', async () => {
    let totalCost = 0;
    bytesResultFill.forEach(function (r) {
      // console.log(JSON.stringify(r));
      totalCost += r.cost;
    });
    console.log(`avg fill cost ${totalCost / bytesResultFill.length} for ${bytesResultFill.length} times`);
  });
});
