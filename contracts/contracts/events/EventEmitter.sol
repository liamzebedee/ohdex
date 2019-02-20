pragma solidity ^0.5.0;

import "../MerkleTreeVerifier.sol";

contract EventEmitter is MerkleTreeVerifier {
    // Events pending acknowledgement on other chains.
    bytes32[] public events;

    event EventEmitted(bytes32 eventHash); 

    constructor() public {
    }

    function emitEvent(bytes32 _eventHash) public returns(bool) {
        require(_eventHash != 0x0, "INVALID_EVENT");
        // TODO add origin address to event;
        // bytes32 eventHash = keccak256(abi.encodePacked(msg.sender, _eventHash));
        events.push(_eventHash);
        emit EventEmitted(_eventHash);
        // keccak256(abi.encodePacked(msg.sender, _eventHash)) is whats added to the merkle tree of that chain
        // TODO: Implement fee system
        return true;
    }

    function acknowledgeEvents() public {
        // delete pendingEvents;
    }

    function getEventsCount() public view returns (uint) {
        return events.length;
    }

    function getEventsRoot() public view returns(bytes32) {
        if(events.length == 0) return 0x0000000000000000000000000000000000000000000000000000000000000000;
        return _computeMerkleRoot(events);
    }

}