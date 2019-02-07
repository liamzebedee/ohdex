pragma solidity ^0.5.0;

/**
 * @title MerkleProof
 * @dev Merkle proof verification based on
 * https://github.com/ameensol/merkle-tree-solidity/blob/master/src/MerkleProof.sol
 */
library XMerkleTree {
    /**
     * @dev Verifies a Merkle proof proving the existence of a leaf in a Merkle tree. Assumes that each pair of leaves
     * and each pair of pre-images are sorted.
     * @param proof Merkle proof containing sibling hashes on the branch from the leaf to the root of the Merkle tree
     * @param root Merkle root
     * @param leaf Leaf of Merkle tree
     */
//     function verify(bytes32[] memory proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
//         int BRANCH_PREFIX = 0x1;
        
//         bytes32 computedHash = leaf;
// st
//         for (uint256 i = 0; i < proof.length; i++) {
//             bytes32 proofElement = proof[i];

//             if (computedHash < proofElement) {
//                 // Hash(current computed hash + current element of the proof)
//                 computedHash = keccak256(abi.encodePacked(BRANCH_PREFIX, computedHash, proofElement));
//             } else {
//                 // Hash(current element of the proof + current computed hash)
//                 computedHash = keccak256(abi.encodePacked(BRANCH_PREFIX, proofElement, computedHash));
//             }
//         }

//         // Check if the computed hash (root) is equal to the provided root
//         return computedHash == root;
//     }

    function _verify(bytes32[] memory proof, bytes32 root, bytes32 leaf) public pure returns (bool) {
        // Check if the computed hash (root) is equal to the provided root
        return _computeRoot(proof, leaf) == root;
    }

    function _computeRoot(bytes32[] memory proof, bytes32 leaf) public pure returns (bytes32) {        
        bytes32 node = leaf;
        bool dir = node > proof[0];

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 pairNode = proof[i];

            if (dir) {
                // Hash(current element of the proof + current computed hash)
                node = _hashBranch(pairNode, node);
            } else {
                // Hash(current computed hash + current element of the proof)
                node = _hashBranch(node, pairNode);
            }
        }

        return node;
    }
    
    function _hashLeaf(bytes32[] memory leaf) public pure returns (bytes32) {
        bytes1 LEAF_PREFIX = 0x00;
        return keccak256(abi.encodePacked(LEAF_PREFIX, leaf));
    }

    function _hashBranch(bytes32 left, bytes32 right) public pure returns (bytes32) {
        bytes1 BRANCH_PREFIX = 0x01;
        return keccak256(abi.encodePacked(BRANCH_PREFIX, left, right));
    }
}