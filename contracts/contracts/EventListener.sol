import "openzeppelin-solidity/contracts/cryptography/MerkleProof.sol";

pragma solidity ^0.5.0;

contract EventListener {
    bytes32[] stateRoots;

    mapping(uint256 => bytes32[]) chainIdToProofs; 

    event StateRootUpdated(bytes32 indexed proof);
    event ProofSubmitted(uint256 indexed chainId, bytes32 indexed proof);

    function checkEvent(uint256 _chainId, uint256 _period, bytes32[] memory _proof, bytes32 _leaf) public returns(bool) {
        return MerkleProof.verify(_proof, chainIdToProofs[_chainId][_period], _leaf);
    }

    function getProof(uint256 _chainId, uint256 _index) public view returns(bytes32) {
        return chainIdToProofs[_chainId][_index]; 
    }

    function getLatestProof(uint256 _chainId) public view returns(bytes32) {
        return getProof(_chainId, chainIdToProofs[_chainId].length - 1);
    }

    function updateProof(uint256 _chainId, bytes32 _newStateRoot) public {
        revert("SEE BELOW");
    }

    // TODO only the relayer(s) should be able to update the proof
    function updateStateRoot(bytes32 _newStateRoot, bytes32 _proof, bytes32 _blockhash) public {
        // Verify the proof is based on the last proof uploaded to this chain.
        // this comes in the form of:
        // (previous state root, current state root, current blockhash)
        // the proof must show that it testifies after the state of the last proof

        // require( blocknumber(newRoot(this_chain)) > blocknumber(currentRoot(this_chain)) )
        
        // if the validators attempt to exploit arbitrage of time between chains
        // this proof can be used on all other bridges to shut them down (slashing)
        
        bytes32 currentStateRoot = this.stateRoots[this.stateRoots.length - 1];
        bytes32 leaf = keccak256(abi.encodePacked(_blockhash, this.stateRoots[currentStateRoot]));
        MerkleProof.verify(_proof, _newStateRoot, leaf);
        stateRoots.push(_newStateRoot);
        emit StateRootUpdated(_newStateRoot);
    }
}