pragma solidity ^0.5.0;

contract WrappedTokenBank {
    mapping(address => mapping(address => uint)) wrappedBalances;
    mapping(address => mapping(address => uint)) wrappedAllowed;
    mapping(address => address) wrappedTokens;

    constructor() public {}

    modifier isWrappedToken(address a) {
        require(wrappedTokens[wrappedTokens] != 0x0, "WRAPPER_TOKEN_INEXISTANT");
        _;
    }

    function wrap(address tokenAddress_, uint amount) public returns (bool) {
        // withdraw is an atomic swap of one wrapped token for another from two chains
        require(
            IERC20(tokenAddress_).transfer(address(this), amount),
            "WRAP_UNFUNDED"
        );
        require(amount >= 0);

        address from = msg.sender;

        mint(tokenAddress_, from, amount);
    }

    function unwrap(address tokenAddress_, uint amount) public returns (bool) {
        address from = msg.sender;
        uint balance = wrappedBalances[tokenAddress_][from];
        require(amount <= balance, "BALANCE_TOO_SMALL");
        require(amount > 0, "AMOUNT_NIHILISTIC");

        burn(tokenAddress_, from, amount);

        require(
            IERC20(tokenAddress_).transfer(from, amount),
            "WRAP_UNFUNDED"
        );
    }

    function burn(address tokenAddress_, address account, uint amount) private returns (bool) {
        wrappedBalances[tokenAddress_][account] -= amount;
    }
    function mint(address tokenAddress_, address account, uint amount) private returns (bool) {
        wrappedBalances[tokenAddress_][account] += amount;
    }

    function registerWrapperToken(address originalToken_) public returns (address) {
        require(!wrappedTokens[originalToken_], "WRAPPER_TOKEN_EXISTS");
        wrappedTokens[originalToken_] = address(new WrappedToken(this));
    }

    function getWrappedToken(address originalToken_) public returns (IERC20) {
        return WrappedToken(wrappedTokens[originalToken_]);
    }
    

    // Token wrapper functions
    function balanceOf(address tokenOwner) isWrappedToken(msg.sender) public pure returns (uint balance) {
        address wrapperToken = msg.sender;
        return wrappedBalances[wrapperToken][tokenOwner];
    }

    function transfer(address to, uint tokens)  isWrappedToken(msg.sender) public returns (bool success) {
        address wrapperToken = msg.sender;
        mapping(address => uint) balances = wrappedBalances[wrapperToken];

        balances[msg.sender] = balances[msg.sender].sub(tokens);
        balances[to] = balances[to].add(tokens);
        Transfer(msg.sender, to, tokens);
        return true;
    }
 
    function transferFrom(address from, address to, uint tokens) isWrappedToken(msg.sender) public returns (bool success) {
        address wrapperToken = msg.sender;
        mapping(address => uint) balances = wrappedBalances[wrapperToken];
        mapping(address => uint) allowed = wrappedAllowed[wrapperToken];

        balances[from] = balances[from].sub(tokens);
        allowed[from][msg.sender] = allowed[from][msg.sender].sub(tokens);
        balances[to] = balances[to].add(tokens);
        Transfer(from, to, tokens);
        return true;
    }

    function approve(address spender, uint tokens) isWrappedToken(msg.sender) public returns (bool success) {
        address wrapperToken = msg.sender;
        mapping(address => uint) allowed = wrappedAllowed[wrapperToken];

        allowed[msg.sender][spender] = tokens;
        Approval(msg.sender, spender, tokens);
        return true;
    }

}