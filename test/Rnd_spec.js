const RndLib = artifacts.require('./contracts/tests/TestRndLib.sol');
const BN = web3.utils.BN;

let instance;
let initContract = async function (owner) {
  instance = await RndLib.new({ from: owner });
};

export const defaultNonceSep = '3a'; // ':'

export function Rnd (hostSeedHex, clientSeedHex, modBN, nonceHex, nonceSep) {
  let seedHex = hostSeedHex + clientSeedHex.replace('0x', '');
  if (typeof nonceHex !== 'undefined') {
    seedHex += typeof nonceSep !== 'undefined' ? nonceSep.replace('0x', '') : defaultNonceSep;
    seedHex += nonceHex.replace('0x', ''); ;
  }
  let x = new BN(web3.utils.soliditySha3(seedHex).replace('0x', ''), 16);
  x = x.mod(modBN);
  return x;
}

export function RndNumber (from, to) {
  return Math.floor(Math.random() * (to - from + 1)) + from;
}

export function RndN (to) {
  return Math.floor(Math.random() * to);
}

export function Roll (rnd, num, den) {
  this.rnd = rnd;
  this.num = num;
  this.den = den;
}
Roll.prototype.equal = function (r) {
  assert.equal(r[0].toNumber(), this.rnd, 'roll');
  assert.equal(r[1].toNumber(), this.num, 'num');
  assert.equal(r[2].toNumber(), this.den, 'den');
};

let cases = [];
for (let i = 0; i < 3; i++) {
  let serverSeed = web3.utils.randomHex(32);
  let clientSeed = web3.utils.randomHex(32);
  let nonce = web3.utils.randomHex(5);
  let n = new BN(Math.floor(Math.random() * 255) + 1);
  let mustbe = Rnd(serverSeed, clientSeed, n);
  let mustben = Rnd(serverSeed, clientSeed, n, nonce);
  cases.push({
    serverSeed: serverSeed,
    clientSeed: clientSeed,
    nonce: nonce,
    n: n,
    mustbe: mustbe,
    mustben: mustben,
  });
}

contract('RndLib', function ([owner, addr1]) {
  describe('rnd', () => {
    before(async () => {
      await initContract(owner);
    });

    it('test js class', async () => {
      /* eslint-disable max-len */
      let cases = [
        { hostSeed: '0x460e90f5561b4ecbc223dc6ec5d71950312026f1598f267d5ab1dd7506a97ef4', clientSeed: '0x0e8fd9d7e274404caaff9b0bc2f29307e6f2f6086308919508123cc8261d8235', nonce: '0x00', n: 1, rnd: 0 },
        { hostSeed: '0x6252c8711d15fd03cbff413d2435e8bdaa4a9b4e912d21c328a503551d30c0df', clientSeed: '0xde6adb165e7eebaa9891130a60e249f76d227119c266ae5c77a06bff3462c3f1', nonce: '0x01', n: 2, rnd: 0 },
        { hostSeed: '0x7218053388f937ebfae210354ebadcd1c13eaa104195b5389800bfd6e6c17d60', clientSeed: '0xcdc1b423971153ace5ba159ebab4341c1195163bd3dab03d34cfd2f6df3207ab', nonce: '0x02', n: 3, rnd: 2 },
        { hostSeed: '0x013f750eb24342cbfb760c283c5901a66ff725fedb2bedc8530e969c80950661', clientSeed: '0x50d3a7b4ba40d7c863700910a6ee8dcd897900c7e6d168d5b56ac1a7b0dd9bb2', nonce: '0x03', n: 4, rnd: 0 },
        { hostSeed: '0x8bc6cbd4c0f6c2cd51ae88e4333960d1152601d7c061c9b7d48ffac2390dc4d0', clientSeed: '0xab272912d0eec0e9bbc243bca0d4e2b93aebc5def7ab08e63548ec0979597204', nonce: '0x04', n: 5, rnd: 4 },
        { hostSeed: '0x398ed05bf8354156b0e80f265f838a4873d093d27c61f621ce048729ba1df94d', clientSeed: '0x2af9a6eb0db2fec6cadb86ab25b7f3d7691cad3f71d2dbf6992136ef82610b8c', nonce: '0x05', n: 6, rnd: 1 },
        { hostSeed: '0xeb7a17c9415205dffb11cac0a47b84109d96da43db59878ee0c8725646703994', clientSeed: '0x12d22215e90cdcd4d8d059fe99aa8d9178c8057c4908aea4a1b91e7013626ea6', nonce: '0x06', n: 7, rnd: 0 },
        { hostSeed: '0x5c7c7548f68e4b8555ad02a32e808b7da7ee0b317d54b7cf9da63d28880074f1', clientSeed: '0x295bd51987aa930487bae55bfd0d2ec7a11127ee305ce933deca09d91c322a59', nonce: '0x07', n: 8, rnd: 5 },
        { hostSeed: '0x60468c31078db05d71913d2c47675e6f361907364f157b66fca20e898810ed50', clientSeed: '0x37be9970ccc25f16c896d1fe4f02a7108bfafe5c9d72b341986578f4ff09fd42', nonce: '0x08', n: 9, rnd: 2 },
      ];
      /* eslint-enable max-len */

      cases.forEach(c => {
        let rnd = Rnd(c.hostSeed, c.clientSeed, new BN(c.n), c.nonce);
        assert.equal(rnd.toNumber(), c.rnd);
      });
    });
    it('uintn(bytes32 serverSeed, bytes32 clientSeed, uint n)', async () => {
      for (let i = 0; i < cases.length; i++) {
        let r = await instance.Uintn(cases[i].serverSeed, cases[i].clientSeed, cases[i].n);
        assert.equal(r.toString(10), cases[i].mustbe.toString(10));
      }
    });

    it('uintn(bytes32 serverSeed, bytes32 clientSeed, bytes memory nonce, uint n)', async () => {
      for (let i = 0; i < cases.length; i++) {
        let r = await instance.Uintn1(cases[i].serverSeed, cases[i].clientSeed, cases[i].nonce, cases[i].n);
        assert.equal(r.toString(10), cases[i].mustben.toString(10));
      }
    });
  });
});
