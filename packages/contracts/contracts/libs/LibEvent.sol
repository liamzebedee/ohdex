pragma experimental ABIEncoderV2;
pragma solidity ^0.5.0;

library LibEvent {

    struct Event {
        address origin;
        uint256 chainId;
        bytes data;
    }

    function getEventHash(Event memory _event) public pure returns(bytes32) {
        return keccak256(abi.encode(_event));
    }

}