pragma solidity ^0.5.0;

import "./EventListener.sol";
import "./EventEmitter.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./libs/LibEvent.sol";


contract Escrow is Ownable {

    uint256 public chainId;
    EventListener public eventListener;
    EventEmitter public eventEmitter;
    mapping(bytes32 => bool) public processedEvents;

    mapping(uint256 => address) public chainToBridgeContract;

    constructor(uint256 _chainId, address _eventListener, address _eventEmitter) public {
        chainId = _chainId;

        eventListener = EventListener(_eventListener);
        eventEmitter = EventEmitter(_eventEmitter);
    }

    function bridge(uint256 _amount, address _token, address _receiver, uint256 _chainId, uint256 _salt) public {
        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "TOKEN_TRANSFER_FAILED");
        eventEmitter.emitEvent(keccak256(abi.encodePacked(_receiver, _token, _amount, _chainId, _salt)));
    }

    function initNetwork(address _bridgeContract, uint256 _chainId) public onlyOwner {
        require(chainToBridgeContract[_chainId] == address(0), "CHAIN_ALREADY_INITIALISED");
        chainToBridgeContract[_chainId] = _bridgeContract;
    }

    function claim(
        address _receiver,
        address _token,
        uint256 _amount,
        address _salt,
        uint256 _chainId,
        uint256 _period,
        bytes32[] memory _proof ) public {

        bytes32 eventHash = keccak256(abi.encodePacked(_receiver, _token, _amount, chainId, _salt));

        require(!processedEvents[eventHash], "EVENT_ALREADY_PROCESSED");
        processedEvents[eventHash] = true;

        bytes32 leaf = keccak256(abi.encodePacked(chainToBridgeContract[_chainId], eventHash));

        require(eventListener.checkEvent(_chainId, _period, _proof, leaf), "EVENT_NOT_FOUND");

        IERC20(_token).transfer(_receiver, _amount);
    }

}