require('babel-register');
require('babel-polyfill');

const defaultGasPrice = process.env.SOLIDITY_COVERAGE
  ? 0x01
  : 100000000000;

const defaultPort = 8545;
const ganacheGasLimit = 0xffffffff;

// start ganache-cli if needed
if (process.env.USE_GANACHE) {
  var ganache = require('ganache-core');
  var accounts = [];
  for (let i = 0; i < 10; i++) {
    accounts.push({
      balance: '0x295be96e64066972000000', // 50 000 000 ether
      secretKey: '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120' + i,
    });
  }
  let props = { accounts: accounts, locked: false, gasLimit: ganacheGasLimit };

  // if (process.env.SOLIDITY_COVERAGE !== 'undefined') {
  //   props[allowUnlimitedContractSize] = true;
  // }

  var server = ganache.server(props);
  server.listen(defaultPort);
}

module.exports = {
  gasPrice: defaultGasPrice,
  defaultPort: defaultPort,
  compilers: {
    solc: {
      version: '0.5.2',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },

  networks: {
    coverage: {
      host: 'localhost',
      port: defaultPort,
      network_id: '*', // eslint-disable-line camelcase
      // gas: 0xfffffffffff,
      gasPrice: defaultGasPrice,
    },

    ganache: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      gasPrice: defaultGasPrice,
      port: defaultPort,
      gas: ganacheGasLimit,
    },
  },
};
