contract Escrow {
    address owner;
    constructor() public {}

    function deposit(address token, uint amount) public returns (bool) {
        require(owner == 0x0, "");
        require(IERC20.transfer(token, amount), "");
        owner = msg.sender;
    }

    function withdraw(address token, uint amount) public returns (bool) {
        require(msg.sender == owner, "");
        require(IERC20.transfer(token, amount), "");
    }
}