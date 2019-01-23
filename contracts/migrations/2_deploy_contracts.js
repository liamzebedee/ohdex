var SimpleStorage = artifacts.require("./SimpleStorage.sol");

var WrapperToken1 = artifacts.require("./WrapperToken.sol");
var AltToken = artifacts.require("./AltToken.sol");



module.exports = function(deployer) {
  deployer.deploy(WrapperToken1);
  deployer.deploy(AltToken);


  // Event contracts deploy
};
