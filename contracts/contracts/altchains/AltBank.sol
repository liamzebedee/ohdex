pragma solidity ^0.5.0;
// pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract Altbank {
    uint private balance;
    IERC20 altToken;

    constructor(
        address altToken_
    ) public {
        balance = 0;
        altToken = IERC20(altToken_);
    }

    function withdraw(
        address to,
        uint amount
    ) public {
        balance -= amount;
        altToken.transfer(to, amount);
    }
}