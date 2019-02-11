pragma solidity ^0.5.0;

contract EventEmitter {

    event EventEmitted(address indexed origin, bytes32 eventHash); 

    function emitEvent(bytes32 _eventHash) public returns(bool) {
        emit EventEmitted(msg.sender, _eventHash);
        // keccak256(abi.encodePacked(msg.sender, _eventHash)) is whats added to the merkle tree of that chain
        // TODO: Implement fee system
        return true;
    }

}