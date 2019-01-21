contract Interchange {
    // bytes reserved;
    // bytes mintable;
    // bytes wrapped;
    // bytes balances;

    function mine(
        bytes _reserved,
        bytes _mintable,
        bytes _wrapped,
        
        bytes proof
    ) public returns (bool) {
        
    }
}

contract MainBank is Interchange {
    mapping(bytes => bool) replay;
    mapping(bytes => bytes) burnCommits;

    function mint(
        bytes merkleProof,

        address chainBridge,
        address token,
        uint amount,
        address to
    ) {
        bytes h = sha256(
            abi.encodePacked(
                chainBridge,
                token,
                amount,
                to
            );
        );

        bool valid = verifyMerkleProof(balances, merkleProof, h);
        if(valid) {
            mintWrapper(chainBridge, token, to, amount);
        }
    }

    function burn(
        address token,
        uint amount,
        bytes commit
    ) {
        burnWrapper(token, amount);
        bytes h = sha256(
            abi.encodePacked(
                token,
                amount,
                commit
            );
        );
        burnCommits[h] = msg.sender;
    }


}

contract AltBank is Interchange {
    mapping(bytes => bool) replay;
    mapping(bytes => bytes) lockCommits;


    function lock(
        address token,
        uint amount,
        bytes commit
    ) {
        address from = msg.sender;
        IERC20(token).transferFrom(
            from,
            this,
            amount
        );
        bytes h = sha256(
            abi.encodePacked(
                chainBridge,
                token,
                amount,
                to
            );
        );

        lockCommits[h] = from;
    }

    function withdraw(
        bytes merkleProof,

        // address chainBridge,
        address token,
        uint amount,
        address to
    ) {
        address chainBridge = this;

        bytes h = sha256(
            abi.encodePacked(
                chainBridge,
                token,
                amount,
                to
            );
        );

        bool valid = verifyMerkleProof(balances, merkleProof, h);
        if(valid) {
            IERC20(token).transferFrom(
                chainBridge,
                to,
                amount
            );
        }
    }
}