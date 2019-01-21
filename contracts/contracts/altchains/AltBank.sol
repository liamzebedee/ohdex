pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract Altbank {
    uint private balance;
    IERC20 altToken;

    struct Escrow {
        uint amount;
        bytes32 commit;
    }

    mapping(address => Escrow) escrowed;

    constructor(
        address altToken_
    ) public {
        balance = 0;
        altToken = IERC20(altToken_);
    }

    function makeEscrow(
        uint amount,
        bytes32  commit
    ) public {
        address from = msg.sender;
        balance += amount;
        Escrow memory escrow = Escrow({
            commit: commit,
            amount: amount
        });
        escrowed[from] = escrow;
    }

    function keepDeposit(
        address user,
        bytes32  secret
    ) internal {
        Escrow storage escrow = escrowed[user];
        bytes memory secret2 = abi.encodePacked(secret);
        if(sha256(secret2) == escrow.commit) {
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