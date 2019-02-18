pragma solidity ^0.5.0;

import "./EventEmitter.sol";
import "../MerkleTreeVerifier.sol";

contract EventListener is MerkleTreeVerifier {
    // The interchain state root.
    bytes32 public interchainStateRoot;
    // bytes32 public acknowledgedEventsRoot;
    
    // The last recorded root of this chain on other chains.
    bytes32 public lastAttestedStateRoot;

    // bytes32 public bridgeId;

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
        // Verify the events root for that chain's bridge.
        bytes32 bridgeLeaf = _hashLeaf2(_interchainStateRoot, _eventsRoot);
        require(_verify(proof, paths, _interchainStateRoot, bridgeLeaf), "STATEROOT_PROOF_INVALID");

        // Verify the event hash
        require(_verify(_eventsProof, _eventsPaths, bridgeLeaf, _eventHash), "EVENT_PROOF_INVALID");

        return true;
    }
    
    // function checkEvent(uint256 _chainId, uint256 _period, bytes32[] memory _proof, bool[] memory paths, bytes32 _leaf) public returns(bool) {
    //     return _verify(_proof, paths, chainIdToProofs[_chainId][_period], _leaf);
    // }

    // function getProof(uint256 _chainId, uint256 _index) public view returns(bytes32) {
    //     return chainIdToProofs[_chainId][_index]; 
    // }

    // function getLatestProof(uint256 _chainId) public view returns(bytes32) {
    //     return getProof(_chainId, chainIdToProofs[_chainId].length - 1);
    // }

    // function updateProof(uint256 _chainId, bytes32 _proof) public {
    //     chainIdToProofs[_chainId].push(_proof);
    //     emit ProofSubmitted(_chainId, _proof);
    // }

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
        require(emitter.getEventsRoot() == _eventsRoot, "EVENTS_NOT_ACKNOWLEDGED");

        bytes32 chainLeaf = _hashLeaf2(_interchainStateRoot, _eventsRoot);
        require(_verify(_proof, _proofPaths, _newInterchainStateRoot, chainLeaf) == true, "INTERCHAIN_STATE_ROOT_PROOF_INCORRECT");
        
        _updateStateRoot(_newInterchainStateRoot);
        
        emitter.acknowledgeEvents();
    }

    function _hashLeaf2(bytes32 b, bytes32 c) public pure returns (bytes32) {
        bytes1 LEAF_PREFIX = 0x00;
        return keccak256(abi.encodePacked(LEAF_PREFIX, b, c));
    }
}