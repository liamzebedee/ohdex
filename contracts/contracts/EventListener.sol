pragma solidity ^0.5.0;

contract EventListener {
    // bytes32[] stateRoots;
    bytes32 public stateRoot;
    uint    public stateRootUpdated;

    mapping(bytes32 => uint) stateRootToChainRoot;

    mapping(uint256 => bytes32[]) chainIdToProofs; 

    event StateRootUpdated(bytes32 indexed proof);
    event ProofSubmitted(uint256 indexed chainId, bytes32 indexed proof);

    constructor() public {
        _updateStateRoot(hex"0420");
    }

    // function setGenesis(bytes32 genesisStateRoot) public {
        
    // }

    function _updateStateRoot(bytes32 root) internal {
        // stateRootToChainRoot[root] = block.timestamp;
        // stateRoots.push(root);
        stateRoot = root;
        stateRootUpdated = block.timestamp;
        emit StateRootUpdated(root);
    }

    function checkEvent(uint256 _chainId, uint256 _period, bytes32[] memory _proof, bytes32 _leaf) public returns(bool) {
        return _verify(_proof, chainIdToProofs[_chainId][_period], _leaf);
    }

    function getProof(uint256 _chainId, uint256 _index) public view returns(bytes32) {
        return chainIdToProofs[_chainId][_index]; 
    }

    function getLatestProof(uint256 _chainId) public view returns(bytes32) {
        return getProof(_chainId, chainIdToProofs[_chainId].length - 1);
    }

    function updateProof(uint256 _chainId, bytes32 _proof) public {
        chainIdToProofs[_chainId].push(_proof);
        emit ProofSubmitted(_chainId, _proof);
    }

    // TODO only the relayer(s) should be able to update the proof
    function updateStateRoot(bytes32[] memory _proof, bytes32 _newStateRoot, bytes32 lastStateRoot, uint256 lastStateRootUpdated) public {
        // todo
        // ACL for only validators
        // and groupsig

        // if the validators attempt to exploit arbitrage of time between chains
        // this proof can be used on all other bridges to shut them down (slashing)
        bytes1 LEAF_PREFIX = 0x00;

        // Prove this new state root is based on the previous state of:
        // a) this chain
        // b) the odex chain
        require(lastStateRoot == stateRoot, "INCORRECT_STATEROOT");
        require(_newStateRoot != stateRoot, "STALE_STATEROOT");
        require(lastStateRootUpdated == stateRootUpdated, "INCORRECT_STATEROOT_UPDATED");
        
        // require(block.timestamp > stateRootUpdated, "BACK_IN_TIME_ERR");

        bytes32 leaf = _hashLeaf(lastStateRoot, bytes32(lastStateRootUpdated));
        // require(MerkleProof.verify(_proof, _newStateRoot, leaf) == true, "STATE_ROOT_PROOF_INCORRECT");
        require(_verify(_proof, _newStateRoot, leaf) == true, "STATE_ROOT_PROOF_INCORRECT");
        
        _updateStateRoot(_newStateRoot);
    }

    function _hashLeaf(bytes32 a, bytes32 b) public pure returns (bytes32) {
        bytes1 LEAF_PREFIX = 0x00;
        return keccak256(abi.encodePacked(LEAF_PREFIX, a, b));
    }

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
    
    function _hashLeaf2(bytes32[] memory leaf) public pure returns (bytes32) {
        bytes1 LEAF_PREFIX = 0x00;
        return keccak256(abi.encodePacked(LEAF_PREFIX, leaf));
    }

    function _hashBranch(bytes32 left, bytes32 right) public pure returns (bytes32) {
        bytes1 BRANCH_PREFIX = 0x01;
        return keccak256(abi.encodePacked(BRANCH_PREFIX, left, right));
    }
}