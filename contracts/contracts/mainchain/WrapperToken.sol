contract WrapperToken is ERC20, ERC20Mintable, ERC20Burnable { {
    constructor(
        string name,
        string symbol,
        uint8 decimals,
        address[] minters
    )
        ERC20Burnable()
        ERC20Mintable(msg.sender)
        // ERC20Detailed(name, symbol, decimals)
        ERC20()
        public
    {}
}