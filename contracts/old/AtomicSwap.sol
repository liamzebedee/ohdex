pragma solidity ^0.5.0;

contract AtomicSwap {
    // uint balance;
    mapping(bytes => uint) balances;

    constructor() public {}

    function commit(bytes memory hash_) public payable returns (bool) {
        uint val = msg.value;
        require(val > 0, "SWAP_NO_VALUE");
        balances[hash_] += val;
        return true;
    }

    function reveal(bytes memory secret, address withdrawer) public returns (bool) {
        bytes hash_ = sha256(secret);
        uint val = balances[hash_];
        address(this).transfer(withdrawer, val);
    }

    function verifyLock(bytes memory hash_) public view returns (uint) {
        return balances[hash_];
    }
}