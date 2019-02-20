var HDWalletProvider = require("truffle-hdwallet-provider");
const path = require("path");

// Will build to the parent build folder
const orig = require('../truffle');

module.exports = Object.assign(orig, {
    compilers: {
        solc: {
            version: "0.4.18",
            docker: true,
        }
    }  
})