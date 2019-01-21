contract AltchainOracle {
    address verifier;
    bytes newRoot;

    constructor(
        address verifier_,
        uint minimumTime
    ) {
        verifier = verifier_;
    }

    function update(bytes proof, bytes newRoot) {

    }
}