pragma solidity ^0.5.0;

import "../events/EventListener.sol";
import "../events/EventEmitter.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../libs/LibEvent.sol";
import "./ITokenBridge.sol";


contract Escrow is Ownable, ITokenBridge {
    mapping(uint256 => address) public chainToBridgeContract;

    event OriginTokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );

    constructor(uint256 _chainId, address _eventListener, address _eventEmitter) ITokenBridge() public {
        chainId = _chainId;

        eventListener = EventListener(_eventListener);
        eventEmitter = EventEmitter(_eventEmitter);
    }

    function bridge(bytes32 _targetBridge, address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt) public {
        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "TOKEN_TRANSFER_FAILED");
        _createBridgeTokenEvent(_targetBridge, _receiver, _token, _amount, _chainId, _salt);
    }

    function initNetwork(address _bridgeContract, uint256 _chainId) public onlyOwner {
        require(chainToBridgeContract[_chainId] == address(0), "CHAIN_ALREADY_INITIALISED");
        chainToBridgeContract[_chainId] = _bridgeContract;
    }

    function claim(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _chainId,
        uint256 _salt,
        bytes32[] memory _proof,
        bool[] memory _proofPaths,
        bytes32 _interchainStateRoot,
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _eventsRoot ) public 
    {   

        // TODO check origin address of event

        // bytes32 eventHash = _getTokensBridgedEventHash(_receiver, _token, _amount, chainId, _salt);
        bytes32 eventHash = _getTokensBridgedEventHash(tokenBridgeId, _receiver, _token, _amount, chainId, _salt);
        
        _checkEventProcessed(eventHash);

        require(eventListener.checkEvent(
            _proof,
            _proofPaths,
            _interchainStateRoot,
            _eventsProof,
            _eventsPaths,
            _eventsRoot,
            eventHash
        ), "EVENT_NOT_FOUND");

        IERC20(_token).transfer(_receiver, _amount);
        emit OriginTokensClaimed(_token, _receiver, _amount, _chainId, _salt);
    }

}