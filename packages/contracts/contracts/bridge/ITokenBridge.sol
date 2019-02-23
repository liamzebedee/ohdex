pragma solidity ^0.5.0;

import "../events/EventEmitter.sol";
import "../events/EventListener.sol";

contract ITokenBridge {
    uint256 chainId;
    // bytes32 public tokenBridgeId;
    EventListener public eventListener;
    EventEmitter public eventEmitter;

    mapping(bytes32 => bool) public processedEvents;

    event TokensBridged(
        bytes32 eventHash, 
        address targetBridge, 
        uint256 indexed chainId, address indexed receiver, address indexed token, uint256 amount, uint256 _salt
    );

    constructor(EventListener _eventListener, EventEmitter _eventEmitter) public {
        // tokenBridgeId = keccak256(abi.encodePacked(this, blockhash(1)));
        // tokenBridgeId = abi.encodePacked(bytes12(0x000000000000000000000000), address(this));
        // tokenBridgeId = bytes32(uint256(address(this)) << 96);

        eventListener = _eventListener;
        eventEmitter = _eventEmitter;
    }
    
    function _createBridgeTokenEvent(
        address _targetBridge, address _receiver, address _token, uint256 _amount, uint256 _chainId, uint256 _salt
    ) public {
        bytes32 eventHash = _getTokensBridgedEventHash(
            _targetBridge, _receiver, _token, _amount, _chainId, _salt
        );
        eventEmitter.emitEvent(eventHash);
        emit TokensBridged(eventHash, _targetBridge, _chainId, _receiver, _token, _amount, _salt);
    }

    function _getTokensBridgedEventHash(
        address _targetBridge, address _receiver, address _token, uint256 _amount, uint256 _chainId, uint256 _salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            _targetBridge, _receiver, _token, _amount, _chainId, _salt
        ));
    }

    // function claim(
    //     address _token,
    //     address _receiver,
    //     uint256 _amount,
    //     uint256 _chainId,
    //     uint256 _salt,
    //     bytes32[] memory _proof,
    //     bool[] memory _proofPaths,
    //     bytes32 _interchainStateRoot,
    //     bytes32[] memory _eventsProof,
    //     bool[] memory _eventsPaths,
    //     bytes32 _eventsRoot
    // ) public;

    function _checkEventProcessed(bytes32 eventHash) internal {
        require(!processedEvents[eventHash], "EVENT_ALREADY_PROCESSED");
        processedEvents[eventHash] = true;
    }
}