pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract Altbank {
    uint private balance;
    IERC20 altToken;
    
    bytes root;

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
        uint depositAmount,
        bytes32 secret
    ) internal {
        Escrow storage escrow = escrowed[user];

        bytes memory secret2 = abi.encodePacked(
            depositAmount,
            secret
        );
        require(depositAmount == escrow.amount, "AMOUNTS_NOT_EQUAL");
        require(sha256(secret2) == escrow.commit, "REVEAL_NOT_CORRECT");

        altToken.transfer(address(this), escrow.amount);
    }


    function computeCommit(
        uint depositAmount,
        bytes32 secret
    ) external returns (bytes32) {
        bytes32 commit = sha256(abi.encodePacked(
            depositAmount,
            secret
        ));
        return commit;
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

    function consensus() public {

    }
}