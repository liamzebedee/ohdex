pragma solidity ^0.5.0;

import "./WrappedTokenBank.sol";

contract BankMain is WrappedTokenBank {
    mapping(address => mapping(bytes => uint)) balances;
    mapping(bytes =>  mapping(address => uint)) claims;

    constructor() public {}
    
    
}