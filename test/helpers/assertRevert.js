import EVMRevert from './EVMRevert';

export default async (promise, err) => {
  try {
    await promise;
  } catch (error) {
    const revertFound = error.message.indexOf(EVMRevert) >= 0;
    assert(revertFound, `Expected "${EVMRevert}", got ${error} instead`);
    if (typeof (err) !== 'undefined') {
      const errorFound = error.message.indexOf(err) >= 0;
      assert(errorFound, `Expected "${err}", got ${error} instead`);
    }
    return;
  }
  assert.fail(`Expected ${EVMRevert} not received`);
};
