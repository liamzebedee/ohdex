contract CommitmentTimeEscrow {
    address creator;
    uint lockedUntil;
    address token;
    uint amount;
    address withdrawer;

    bytes commitment;

    constructor(address token, uint amount, address withdrawer, uint _lockedUntil, bytes commitment) {
        withdrawer = _withdrawer;
        lockedUntil = _lockedUntil;
        creator = msg.sender;
        token = token;
        amount = amount;
        commitment = commitment;
        require(IERC20(token).transfer(this, amount));
    }

    withdraw(bytes reveal) {
        address from = msg.sender;
        require(sha256(reveal) == commitment);

        if(from == creator) withdrawFromCreator();
        else withdrawFromWithdrawer();
    }

    withdrawFromWithdrawer() internal {
        require(block.timestamp < lockedUntil);
        require(IERC20(token).transfer(withdrawer, amount));
        selfdestruct;
    }

    withdrawFromCreator() internal {
        require(block.timestamp > lockedUntil);
        require(IERC20(token).transfer(creator, amount));
        selfdestruct;
    }
}