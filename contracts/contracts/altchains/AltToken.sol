pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract AltToken is ERC20, ERC20Mintable {
    constructor(
    )
        ERC20()
        public
    {}

    function mint2(address to, uint amount) public {
        _mint(to, amount);
        return;
    }
}