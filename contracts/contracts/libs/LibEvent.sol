pragma solidity ^0.5.0;

library LibEvent {

    struct Event {
        address origin;
        uint256 chainId;
        bytes data;
    }

}