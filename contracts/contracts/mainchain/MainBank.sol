
pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./WrapperToken.sol";
import "../MerkleProof.sol";

contract MainBank {
    WrapperToken wrapperToken;
    bytes32 interchainStateroot;

    struct Escrow {
        uint amount;
        bytes32 commit;
    }

    mapping(address => Escrow) escrowed;



    constructor(
        address wrapperToken_
    ) public {
        wrapperToken = WrapperToken(wrapperToken_);
    }

    // Loan wrapper tokens
    function loan(
        uint amount,
        bytes32[] memory proof
    ) public {
        address to = msg.sender;

        // Prove that you've deposited (amount) original tokens on the altchain
        bytes32 leaf = sha256(abi.encodePacked(
            to,
            amount
        ));

        require(MerkleProof.verify(proof, interchainStateroot, leaf), "NO_PROOF");

        wrapperToken.mint(to, amount);
    }

    // Repays a load, burning wrapper tokens
    function repay(
        uint amount
    ) internal {
        address to = msg.sender;
        wrapperToken.burnFrom(to, amount);
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

    function makeEscrow(
        uint amount,
        bytes32  commit
    ) public {
        address from = msg.sender;
        Escrow memory escrow = Escrow({
            commit: commit,
            amount: amount
        });
        escrowed[from] = escrow;
    }

    function consensus(

    ) internal {
        interchainStateroot = 0x0;
        // circuit outputs an array of secrets used with repay
        // TODO
    }
}