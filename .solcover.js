let accs = "";
let balance = "0x1027e72f1f12813088000000"; // 500 000 000 ether
for (let i = 0; i < 10; i++) {
    accs += ` --account="${"0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120"+i}, ${balance}"`
}

let defaultPort = 8545;

module.exports = {
    norpc: false,
    port: defaultPort,
    testrpcOptions: ` --port ${defaultPort} ${accs} `, // --allowUnlimitedContractSize
    // testCommand: '../node_modules/.bin/truffle test --network coverage',
    // compileCommand: '../node_modules/.bin/truffle compile --network coverage',
    skipFiles: [
        'SafeMath.sol',
        'Accessibility.sol',
        'tests',
        'mocks',
        'build',
    ],
}