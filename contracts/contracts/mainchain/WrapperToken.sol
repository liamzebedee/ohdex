// pragma solidity ^0.4.25;
pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

contract WrapperToken is ERC20, ERC20Mintable, ERC20Burnable {
    constructor(
        // string name,
        // string symbol,
        // uint8 decimals,
        // address[] minters
    )
        ERC20Burnable()
        ERC20Mintable()
        // ERC20Detailed(name, symbol, decimals)
        ERC20()
        public
    {}
}