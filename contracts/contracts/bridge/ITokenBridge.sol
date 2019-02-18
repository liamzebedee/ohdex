pragma solidity ^0.5.0;

import "../events/EventEmitter.sol";
import "../events/EventListener.sol";

contract ITokenBridge {
    uint256 chainId;
    bytes32 public tokenBridgeId;
    EventListener public eventListener;
    EventEmitter public eventEmitter;

    mapping(bytes32 => bool) public processedEvents;

    event TokensBridged(
        bytes32 eventHash, 
        bytes32 targetBridge, 
        uint256 indexed chainId, address indexed receiver, address indexed token, uint256 amount, uint256 _salt
    );

    constructor() public {
        tokenBridgeId = keccak256(abi.encodePacked(this, blockhash(1)));
    }
    
    function _createBridgeTokenEvent(
        bytes32 _targetBridge, 
        address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt
    ) public {
        bytes32 eventHash = _getTokensBridgedEventHash(
            _targetBridge, _token, _receiver, _amount, _chainId, _salt
        );
        emit TokensBridged(eventHash, _targetBridge, _chainId, _receiver, _token, _amount, _salt);
        eventEmitter.emitEvent(eventHash);
    }

    function _getTokensBridgedEventHash(
        bytes32 targetBridge,
        address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt
    ) public returns (bytes32) {
        return keccak256(abi.encodePacked(
            targetBridge, _receiver, _token, _amount, _chainId, _salt
        ));
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
        bytes32 _eventsRoot
    ) public;

    function _checkEventProcessed(bytes32 eventHash) internal {
        require(!processedEvents[eventHash], "EVENT_ALREADY_PROCESSED");
        processedEvents[eventHash] = true;
    }
}