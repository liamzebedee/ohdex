pragma solidity ^0.5.0;

contract EventEmitter {

    event EventEmitted(address indexed origin, bytes data); 

    function emitEvent(bytes memory _data) public returns(bool) {
        emit EventEmitted(msg.sender, _data);
        // TODO: Implement fee system
        return true;
    }

}