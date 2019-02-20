pragma solidity ^0.5.0;

interface IVerifier {
    function verifyProof() external returns (bool);
}