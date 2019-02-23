var HDWalletProvider = require("truffle-hdwallet-provider");
const path = require("path");

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*" // Match any network id
        },
        testnet: {
            provider: function() {
                return new HDWalletProvider(
                    'narrow hour rotate cute pelican relax concert million course latin kidney over author appear dismiss',
                    "https://ropsten.infura.io/v3/3049535d150e49729f54f6f8bef40a1b"
                )
            },
            network_id: '*'
        }
    },
    // contracts_build_directory: path.join(__dirname, "client/src/contracts"),
    contracts_build_directory: path.join(__dirname, "build/contracts"),
    compilers: {
        solc: {
            // version: "0.4.25",
            version: "0.5.0",
            docker: false,
        }
    }  
}