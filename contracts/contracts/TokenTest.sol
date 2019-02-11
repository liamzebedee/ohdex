pragma solidity ^0.5.0;

import "./BridgedToken.sol";


contract TokenTest {
    address public tokenContract;

    function deployContract() public {

        tokenContract = address(new BridgedToken());

    }

    function mint() public {
        BridgedToken(tokenContract).mint(msg.sender, 100000);    
    }


}