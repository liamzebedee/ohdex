pragma solidity ^0.5.0;

import "./WrappedTokenBank.sol";

contract BankMain is WrappedTokenBank {
    // mapping(address => uint) tokenReserves;

    constructor() public {}
    
    function deposit(address token_, uint amount) public returns (bool) {
        // require(token_).transfer(address(this), amount);
        // tokenReserves[token_] += amount;
        wrap(token_, this, amount);
    }

    function burn(address token_, uint amount) public returns (bool) {
        unwrap(token_, this, amount);
    }
}