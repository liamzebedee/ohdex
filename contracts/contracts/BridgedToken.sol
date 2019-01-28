pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BridgedToken is ERC20 {

    constructor() public {

    }

    function mint(address _to, uint256 _amount) public  {
        require(_to != address(0), "Cannot mint to 0x address");
        require(_amount != 0, "Amount cannot be zero"); 
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) public  {
        _burn(_from, _amount);
    }

    
}