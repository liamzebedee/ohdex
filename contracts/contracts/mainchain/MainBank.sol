
pragma solidity ^0.5.0;

//x pragma solidity ^0.4.25;
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./WrapperToken.sol";

contract MainBank {
    uint private balance;
    WrapperToken wrapperToken;

    constructor(
        address wrapperToken_
    ) public {
        balance = 0;
        wrapperToken = WrapperToken(wrapperToken_);
    }

    function loan(
        uint amount
    ) public {
        address to = msg.sender;
        balance -= amount;
        wrapperToken.mint(to, amount);
    }

    function repay(
        uint amount
    ) public {
        address to = msg.sender;
        wrapperToken.burnFrom(to, amount);
    }
}