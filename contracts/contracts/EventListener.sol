pragma solidity ^0.5.0;

import "./EventEmitter.sol";

contract EventListener {
    // The interchain state root.
    bytes32 public interchainStateRoot;
    // bytes32 public acknowledgedEventsRoot;
    
    // The last recorded root of this chain on other chains.
    bytes32 public lastAttestedStateRoot;

    EventEmitter emitter;

    // bytes32 public stateRoot;
    uint public _stateRootUpdated;

    mapping(bytes32 => uint) stateRootToChainRoot;

    mapping(uint256 => bytes32[]) chainIdToProofs; 

    event StateRootUpdated(bytes32 indexed root);
    event ProofSubmitted(uint256 indexed chainId, bytes32 indexed proof);

    constructor(EventEmitter _emitter) public {
        bytes32 nonce = keccak256(abi.encodePacked(this, blockhash(1)));
        _updateStateRoot(nonce);
        emitter = _emitter;
    }

    function _updateStateRoot(bytes32 root) internal {
        // stateRootToChainRoot[root] = block.timestamp;
        // stateRoots.push(root);
        // stateRoot = root;
        // stateRootUpdated = block.timestamp;
        interchainStateRoot = root;
        emit StateRootUpdated(root);
        // _ackPendingEvents();
    }

    function checkEvent(
        bytes32[] memory proof, 
        bool[] memory paths, 
        bytes32 _interchainStateRoot, 
        
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _eventsRoot,
        bytes32 _eventHash
    ) public returns (bool) {
        // Verify the events root for that chain.
        bytes32 eventsRootLeaf = _hashLeaf(_interchainStateRoot, _eventsRoot);
        require(_verify(proof, paths, _interchainStateRoot, eventsRootLeaf), "STATEROOT_PROOF_INVALID");

        // Verify the event hash
        require(_verify(_eventsProof, _eventsPaths, eventsRootLeaf, _eventHash), "EVENT_PROOF_INVALID");

        return true;
    }
    
    function checkEvent(uint256 _chainId, uint256 _period, bytes32[] memory _proof, bool[] memory paths, bytes32 _leaf) public returns(bool) {
        return _verify(_proof, paths, chainIdToProofs[_chainId][_period], _leaf);
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
    function updateStateRoot(
        bytes32[] memory _proof, 
        bool[] memory _proofPaths,
        bytes32 _newInterchainStateRoot, 
        bytes32 _interchainStateRoot, 
        bytes32 _eventsRoot
    ) public {
        // todo
        // ACL for only validators
        // and groupsig

        // if the validators attempt to exploit arbitrage of time between chains
        // this proof can be used on all other bridges to shut them down (slashing)


        // require(block.timestamp > stateRootUpdated, "BACK_IN_TIME_ERR");

        // It must reference the previous interchain state root and prove we build upon it.
        require(_interchainStateRoot == interchainStateRoot, "INVALID_STATE_CHRONOLOGY");
        require(_newInterchainStateRoot != interchainStateRoot, "HUH");

        // TODO - Verify this chain's events are acknowledged        
        // bytes32 eventsRoot = MerkleProof.computeRoot(EventEmitter.getPendingEvents());
        bytes32 eventsRoot = emitter.getEventsRoot();
        require(eventsRoot == _eventsRoot, "EVENTS_NOT_ACKNOWLEDGED");

        bytes32 chainLeaf = _hashLeaf(_interchainStateRoot, _eventsRoot);
        require(_verify(_proof, _proofPaths, _newInterchainStateRoot, chainLeaf) == true, "INTERCHAIN_STATE_ROOT_PROOF_INCORRECT");
        
        _updateStateRoot(_newInterchainStateRoot);
        
        emitter.acknowledgeEvents();
    }

    function _hashLeaf(bytes32 a, bytes32 b) public pure returns (bytes32) {
        bytes1 LEAF_PREFIX = 0x00;
        return keccak256(abi.encodePacked(LEAF_PREFIX, a, b));
    }

    /**
     * @dev Verifies a Merkle proof proving the existence of a leaf in a Merkle tree. Assumes that each pair of leaves
     * and each pair of pre-images are sorted.
     * @param proof Merkle proof containing sibling hashes on the branch from the leaf to the root of the Merkle tree
     * @param root Merkle root
     * @param leaf Leaf of Merkle tree
     */
    function _verify(bytes32[] memory proof, bool[] memory paths, bytes32 root, bytes32 leaf) public pure returns (bool) {
        // Check if the computed hash (root) is equal to the provided root
        return _computeRoot(proof, paths, leaf) == root;
    }

    function _computeRoot(bytes32[] memory proof, bool[] memory paths, bytes32 leaf) public pure returns (bytes32) {        
        bytes32 node = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 pairNode = proof[i];

            if (paths[i]) {
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