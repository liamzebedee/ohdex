contract TimeEscrower {
    address creator;
    uint lockedUntil;
    address token;
    uint amount;
    address withdrawer;

    constructor(address token, uint amount, address withdrawer, uint _lockedUntil) {
        withdrawer = _withdrawer;
        lockedUntil = _lockedUntil;
        creator = msg.sender;
        token = token;
        amount = amount;
        require(IERC20(token).transfer(this, amount));
    }

    withdraw() {
        address from = msg.sender;
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