var HDWalletProvider = require("truffle-hdwallet-provider");

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
    }
}