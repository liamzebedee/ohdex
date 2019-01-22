pragma solidity ^0.5.0;

import "./EventListener.sol";
import "./EventEmitter.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./libs/LibEvent.sol";

contract Escrow {

    uint256 public chainId;
    EventListener public eventListener;
    EventEmitter public eventEmitter;

    constructor(uint256 _chainId, address _eventListener, address _eventEmitter) public {
        chainId = _chainId;

        eventListener = EventListener(_eventListener);
        eventEmitter = EventEmitter(_eventEmitter);

    }

    function bridge(uint256 _amount, address _token, uint256 _chainId, uint256 _salt) public {
        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "TOKEN_TRANSFER_FAILED");
        eventEmitter.emitEvent(abi.encodePacked(msg.sender, _token, _amount, _salt));
    }

    function claim(uint256 _amount, address _token, uint256 _salt) public {

        
    }

}