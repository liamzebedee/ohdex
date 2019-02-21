pragma solidity ^0.5.0;

import {ERC20 as Token} from "./ERC20.sol";
import "../ITokenBridge.sol";

contract WrappedNativeToken is Token {

    string public name = "Wrapped Native";
    string public symbol = "WNTVE";
    uint8 public decimals = 18;
    ITokenBridge public bridgeContract;

    constructor() public {
        bridgeContract = ITokenBridge(msg.sender);
    }

    function() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    function bridge(bytes32 _targetBridge, address _receiver, uint256 _chainId, uint256 _salt) public payable {
        address spender = address(bridgeContract);
        _mint(msg.sender, msg.value);
        _approve(msg.sender, spender, msg.value);
        bridgeContract.bridge(_targetBridge, address(this), _receiver, msg.value, _chainId, _salt);
    }

    function transfer(address _to, uint256 _amount) public returns (bool) {
        // If bridge calls transfer automaticly unwrap tokens
        if(msg.sender == address(bridgeContract)) {
            withdrawTo(address(uint160(_to)), _amount); //This typecasting is weird
        }
        return true;
    }

    function withdraw(uint256 _amount) public {
        _burn(msg.sender, _amount);
        msg.sender.transfer(_amount);
    }

    function withdrawTo(address payable _to, uint256 _amount) public {
        _burn(msg.sender, _amount);
        _to.send(_amount); //Do nothing if this fails to prevent DOS by smart contracts
    }
    
}