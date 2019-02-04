pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract AliceToken is ERC20, ERC20Detailed {
  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint256 _amount
  )
    ERC20Detailed(_name, _symbol, _decimals)
    ERC20()
    public
  {
    require(_amount > 0, "amount has to be greater than 0");
    // _totalSupply = _amount.mul(10 ** uint256(_decimals));
    // balances[msg.sender] = _totalSupply;
    // emit Transfer(address(0), msg.sender, _totalSupply);
    _mint(msg.sender, _amount.mul(10 ** uint256(_decimals)));
  }
}