pragma solidity  ^0.5.0;


contract EventUtil {

    function generateBridgeHash(address _origin, bytes32 _eventHash) public returns(bytes32) {
        // Hash needed to include in the merkle tree
        bytes32 emitterHash = keccak256(abi.encodePacked(_origin, _eventHash));
        return(emitterHash);
    }


}