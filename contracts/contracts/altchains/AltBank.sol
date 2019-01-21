pragma solidity ^0.5.0;
// pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract Altbank {
    uint private balance;
    IERC20 altToken;

    struct Escrow {
        uint amount;
        bytes commit;
    }

    mapping(address => Escrow) escrowed;

    constructor(
        address altToken_
    ) public {
        balance = 0;
        altToken = IERC20(altToken_);
    }

    function escrow(
        uint amount,
        bytes commit
    ) public {
        address from = msg.sender;
        balance += amount;
        Escrow escrow = new Escrow({
            commit: commit,
            amount: amount
        });
        escrowed[from] += escrow;
    }

    function keepDeposit(
        address user,
        bytes secret
    ) internal {
        Escrow escrow = escrowed[user];
        if(sha256(secret) == escrow.commit) {
            altToken.transfer(address(this), escrow.amount);
        } else {
            revert("INCORRECT_SECRET");
        }
    }

    function withdraw(
        address to,
        uint amount
    ) public {
        // Prove that you've burnt (amount) wrapped tokens on the mainchain 
        // that represents a deposit in this bank

        // merkle proof of bank deposit events
        // ie. 

        altToken.transfer(to, amount);
        balance -= amount;
    }
}