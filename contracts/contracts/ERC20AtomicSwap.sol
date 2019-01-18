pragma solidity ^0.5.0;

contract ERC20AtomicSwap {
    mapping(address => mapping(bytes => uint)) balances;

    constructor() public {}

    function lock(address tokenAddress_, uint amount, bytes memory commit) public payable returns (bool) {
        require(amount > 0, "SWAP_NO_VALUE");
        require(IERC20(tokenAddress_).transfer(address(this), amount), "FUNDING_FAILED");
        balances[tokenAddress_][commit] += amount;
        return true;
    }

    function unlock(address tokenAddress_, bytes memory reveal, address withdrawer) public returns (bool) {
        bytes memory commit = sha256(reveal);
        uint amount = balances[tokenAddress_][commit];
        require(amount > 0, "SWAP_NO_VALUE");
        require(IERC20(tokenAddress_).transfer(withdrawer, amount), "REFUNDING_FAILED");
        // address(this).transfer(withdrawer, val);
    }

    function verifyLock(bytes memory hash_) public view returns (uint) {
        return balances[hash_];
    }
}