import "openzeppelin-solidity/contracts/cryptography/MerkleProof.sol";

pragma solidity ^0.5.0;

contract EventListener {
    
    mapping(uint256 => bytes32[]) chainIdToProofs; 

    event ProofSubmitted(uint256 indexed chainId, bytes32 indexed proof);

    function checkEvent(uint256 _chainId, uint256 _period, bytes32[] memory _proof, bytes32 _leaf) public returns(bool) {
        return MerkleProof.verify(_proof, chainIdToProofs[_chainId][_period], _leaf);
    }

    // TODO only the relayer(s) should be able to update the proof
    function updateProof(uint256 _chainId, bytes32 _proof) public {
        chainIdToProofs[_chainId].push(_proof);
        emit ProofSubmitted(_chainId, _proof);
    }

}