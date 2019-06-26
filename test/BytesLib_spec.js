const BytesLib = artifacts.require('./contracts/tests/TestBytesLib.sol');

let instance;
let initContract = async function (owner) {
  instance = await BytesLib.new({ from: owner });
};

contract('BytesLib', function ([owner]) {
  describe('operations', () => {
    before(async () => {
      await initContract(owner);
    });
    it('index', async () => {
      let a = '0xaaff';
      let b = '0xff';
      let r = await instance.Index(a, b, 0);
      assert.equal(r.toNumber(), 1);

      a = '0xffaa';
      b = '0xff';
      r = await instance.Index(a, b, 3);
      assert.equal(r.toNumber(), -1);

      a = '0xffaa';
      b = '0xff';
      r = await instance.Index(a, b, 0);
      assert.equal(r.toNumber(), 0);

      a = '0xffaaff';
      b = '0xff';
      r = await instance.Index(a, b, 1);
      assert.equal(r.toNumber(), 2);

      a = '0xffaa2312ff';
      b = '0xff';
      r = await instance.Index(a, b, 1);
      assert.equal(r.toNumber(), 4);

      a = '0xbbaa2312aa';
      b = '0xff';
      r = await instance.Index(a, b, 0);
      assert.equal(r.toNumber(), -1);
    });
    it('count', async () => {
      let a = '0xffaa2312aabbccff';
      let b = '0xff';
      let r = await instance.Count(a, b);
      assert.equal(r.toNumber(), 2);

      a = '0x303333323633333333';
      b = '0x333333333333333333';
      r = await instance.Count(a, b);
      assert.equal(r.toNumber(), 0);

      a = '0xffaaff';
      b = '0xff';
      r = await instance.Count(a, b);
      assert.equal(r.toNumber(), 2);

      a = '0xaaff';
      b = '0xff';
      r = await instance.Count(a, b);
      assert.equal(r.toNumber(), 1);

      a = '0xbbaa2312aa';
      b = '0xff';
      r = await instance.Count(a, b);
      assert.equal(r.toNumber(), 0);
    });
    it('equals', async () => {
      let a = '0xaaff';
      let b = '0xff';
      let r = await instance.Equals(a, b);
      assert.equal(r, false);

      a = '0xffaaff';
      b = '0xffaaff';
      r = await instance.Equals(a, b);
      assert.equal(r, true);

      a = '0xffaa2312aabbccff';
      b = '0xff';
      r = await instance.Equals(a, b);
      assert.equal(r, false);
    });
    it('copy', async () => {
      let a = '0xaaff';
      let r = await instance.Copy(a);
      assert.equal(r, a);

      a = '0xffaa2312aabbccff';
      r = await instance.Copy(a);
      assert.equal(r, a);
    });
    it('slice', async () => {
      let a = '0xaaff';
      let b = '0xff';
      let r = await instance.Slice(a, 1, 1);
      assert.equal(r, b);

      a = '0xffaaff';
      r = await instance.Slice(a, 0, 2);
      assert.equal(r, a);

      a = '0xffaaff';
      r = await instance.Slice(a, 2, 100);
      assert.equal(r, b);
    });
    it('append', async () => {
      let a = '0xaaff';
      let b = '0xff';
      let r = await instance.Append(a, b);
      assert.equal(r, a + b.slice(2));

      a = '0xffaaff';
      b = '0x00';
      r = await instance.Append(a, b);
      assert.equal(r, a + b.slice(2));
    });
    it('replace', async () => {
      let a = '0xccaaff';
      let oldb = '0xff';
      let newb = '0x11';
      let r = await instance.Replace(a, oldb, newb);
      assert.equal(r, a.replace(new RegExp(oldb.slice(2), 'g'), newb.slice(2)));

      a = '0xffccaa';
      oldb = '0xff';
      newb = '0x11';
      r = await instance.Replace(a, oldb, newb);
      assert.equal(r, a.replace(new RegExp(oldb.slice(2), 'g'), newb.slice(2)));

      a = '0xffccaaff';
      oldb = '0xff';
      newb = '0xff';
      r = await instance.Replace(a, oldb, newb);
      assert.equal(r, a);

      a = '0xccaabbccaabb';
      oldb = '0xff';
      newb = '0x11';
      r = await instance.Replace(a, oldb, newb);
      assert.equal(r, a);
    });

    it('fillPattern', async () => {
      let a = '0xccaaffccaaff';
      let pattern = '0xaaff';
      let newb = '0x11';
      let r = await instance.FillPattern(a, pattern, newb);
      let s = pattern.slice(2);
      assert.equal(r, a.replace(new RegExp(s, 'g'), newb.slice(2).repeat(s.length / 2)));

      a = '0xffffccbb11';
      pattern = '0xffffccbb11';
      newb = '0x11';
      r = await instance.FillPattern(a, pattern, newb);
      s = pattern.slice(2);
      assert.equal(r, a.replace(new RegExp(s, 'g'), newb.slice(2).repeat(s.length / 2)));

      a = '0xffccaaffbbaaccff';
      pattern = '0xff';
      newb = '0xff';
      r = await instance.Replace(a, pattern, newb);
      s = pattern.slice(2);
      assert.equal(r, a.replace(new RegExp(s, 'g'), newb.slice(2).repeat(s.length / 2)));

      a = '0xffccaaffbbaaccffffff';
      pattern = '0xff';
      newb = '0xaa';
      r = await instance.Replace(a, pattern, newb);
      s = pattern.slice(2);
      assert.equal(r, a.replace(new RegExp(s, 'g'), newb.slice(2).repeat(s.length / 2)));

      a = '0xccaabbccaabb';
      pattern = '0xcc';
      newb = '0x11';
      r = await instance.Replace(a, pattern, newb);
      s = pattern.slice(2);
      assert.equal(r, a.replace(new RegExp(s, 'g'), newb.slice(2).repeat(s.length / 2)));

      a = '0xffffffffff';
      pattern = '0xff';
      newb = '0x11';
      r = await instance.Replace(a, pattern, newb);
      s = pattern.slice(2);
      assert.equal(r, a.replace(new RegExp(s, 'g'), newb.slice(2).repeat(s.length / 2)));
    });

    it('cost', async () => {
      let a = '0xaabbbbbbbbbbbbff';
      let b = '0xff';
      let r = await instance.Index(a, b, 0);
      assert.equal(r.toNumber(), 7);
      let gas = await instance.Index.estimateGas(a, b, 0);
      console.log(`Index: ${gas}`);

      a = '0xffaaffffffffffffff';
      b = '0xff';
      r = await instance.Count(a, b);
      assert.equal(r.toNumber(), 8);
      gas = await instance.Count.estimateGas(a, b);
      console.log(`Count: ${gas}`);

      a = '0xffffffffffffffffff';
      b = a;
      r = await instance.Equals(a, b);
      assert.equal(r, true);
      gas = await instance.Equals.estimateGas(a, b);
      console.log(`Equals: ${gas}`);

      a = '0xffffffffffffffffff';
      r = await instance.Copy(a);
      assert.equal(r, a);
      gas = await instance.Copy.estimateGas(a);
      console.log(`Copy: ${gas}`);

      a = '0xffffffffffffffffff';
      b = '0xffffffff';
      r = await instance.Slice(a, 5, 8);
      assert.equal(r, b);
      gas = await instance.Slice.estimateGas(a, 5, 8);
      console.log(`Slice: ${gas}`);

      a = '0xffffffffffffffffff';
      b = '0xff';
      r = await instance.Append(a, b);
      assert.equal(r, a + b.slice(2));
      gas = await instance.Append.estimateGas(a, b);
      console.log(`Append: ${gas}`);

      a = '0xccccffffccffccffff';
      let oldb = '0xff';
      let newb = '0x11';
      r = await instance.Replace(a, oldb, newb);
      assert.equal(r, a.replace(new RegExp(oldb.slice(2), 'g'), newb.slice(2)));
      gas = await instance.Replace.estimateGas(a, oldb, newb);
      console.log(`Replace: ${gas}`);
    });
  });
});
