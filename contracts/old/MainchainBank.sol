contract MainchainBank {
    mapping(address => bytes) bridgeRoots;

    function commitNewStateRoot(bytes proof) public {
        root, bridge = verify(proof);
        bridgeRoots[bridge] = root;
    }

    function verify(bytes proof) internal {
        
    }
}