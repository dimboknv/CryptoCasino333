import EVMThrow from './EVMThrow';
export default async (promise, err) => {
  try {
    await promise;
  } catch (error) {
    const revertFound = error.message.indexOf(EVMThrow) >= 0;
    assert(revertFound, `Expected "${EVMThrow}", got ${error} instead`);
    if (typeof (err) !== 'undefined') {
      const errorFound = error.message.indexOf(err) >= 0;
      assert(errorFound, `Expected "${err}", got ${error} instead`);
    }
    return;
  }
  assert.fail(`Expected ${EVMThrow} not received`);
};
