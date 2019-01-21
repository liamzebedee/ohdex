pragma solidity ^0.5.0;

import "./WrappedTokenBank.sol";

contract WrappedToken {
    WrappedTokenBank bank;

    constructor(address bankAddr_) public {
        bank = WrappedTokenBank(bankAddr_);
    }
 
    function balanceOf(address tokenOwner) public constant returns (uint balance) {
        return bank.balanceOf(tokenOwner);
    }
 
    function transfer(address to, uint tokens) public returns (bool success) {
        return bank.transfer(to, tokens);
    }
 
    function transferFrom(address from, address to, uint tokens) public returns (bool success) {
        return bank.transferFrom(from, to, tokens);
    }
}