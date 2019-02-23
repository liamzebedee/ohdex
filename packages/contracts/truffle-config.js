const path = require("path");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  // contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  contracts_build_directory: path.join(__dirname, "build/contracts"),
  compilers: {
    solc: {
      // version: "0.4.25",
      docker: true,
    }
  }  
};
