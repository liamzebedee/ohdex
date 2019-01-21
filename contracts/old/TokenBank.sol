How does the proof work?

Keep data off-chain
But we need the balances on chain



user and bank exchange secrets




bank creates CommitmentTimeEscrow(wrapper_token, 1000, user, 3 hours, commitment)

user creates CommitmentTimeEscrow(token, 1000, user, 3 hours, commitment)

bank reveals to claim their tokens
user reveals to claim their wrapped tokens



how to make this interchain? 
convert the escrow into a simple ZKP

one step to enter the tokens
one step to exit the tokens


Altchain:
Bank.commitToGeneratingWrapperTokens(blah)
Bank.commitToBuyingWrapperTokens(blah)

contract MainBank {
    mapping(address => bytes) altchainBalanceRoot;
    mapping(bytes => bool) withdrawn;

    function withdrawWrapped(uint altchainBalance, address altchainToken, uint amount) {
        address from = msg.sender;
        bytes h = sha256(from, altchainBalance, altchainToken, amount);

        if(withdrawn[h]) {
            throw;
        }

        require(verifyMerkleProof(
            altchainLockedUp[altchainToken],
            h
        ));
        
        mintWrapperToken(altchainToken, amount, from);
    }

    function update(bytes proof) {
        verify(proof);
    }

    function verify(bytes proof) {
        deposits = {}
        for tx in txs {
            if tx == burnWrapped:
                burnt[token][from] += amount
            if tx == withdrawOriginal:
                require(amount == burnt[token][from])
                burnt[token][from] -= amount
                escrow[token][user] += amount
        }
    }
}

contract AltchainBank {
    mapping(address => bytes) altchainBalanceRoot;
    mapping(address => bytes) mainchainBalanceRoot;

    function withdraw(uint mainchainBalance, address mainchainToken, uint amount) {
        address from = msg.sender;
        bytes h = sha256(mainchainBalance, mainchainToken, amount)
        require(verifyMerkleProof(
            mainchainBalanceRoot[mainchainToken],
            h
        ));
        // mintWrapperToken(altchainToken, amount, from);
        // locked[from][altchainToken] = amount;
    }

}



contract MutualCommitmentTimeEscrow {
    constructor(address a, address b, address tokenA, uint tokenAAmount, address tokenB, address tokenBAmount, bytes commitmentA, bytes commitmentB, uint lockedUntilA, uint lockedUntilB) {

    }


}

contract CommitmentTimeEscrow {
    address creator;
    uint lockedUntil;
    address token;
    uint amount;
    address withdrawer;

    bytes commitment;

    bool active;

    constructor(address token, uint amount, address withdrawer, uint _lockedUntil, bytes commitment) {
        withdrawer = _withdrawer;
        lockedUntil = _lockedUntil;
        creator = msg.sender;
        token = token;
        amount = amount;
        commitment = commitment;
        active = false;
    }

    activate(bytes reveal) {
        require(sha256(reveal) == commitment);
        require(IERC20(token).transfer(this, amount));
        active = true;
    }

    withdraw(bytes reveal) {
        address from = msg.sender;
        require(active);

        if(from == creator) withdrawFromCreator();
        else withdrawFromWithdrawer();
    }

    withdrawFromWithdrawer() internal {
        require(block.timestamp < lockedUntil);
        require(IERC20(token).transfer(withdrawer, amount));
        selfdestruct;
    }

    withdrawFromCreator() internal {
        require(block.timestamp > lockedUntil);
        require(IERC20(token).transfer(creator, amount));
        selfdestruct;
    }
}



contract Bank {
    struct Escrow {
        uint amount;
        uint lockedUntil;
        bool withdrawn;
    }

    struct Commitment {
        bytes commit;
        bool revealed;
    }

    mapping(address => Escrow) escrowed;
    mapping(address => Commitment) escrowCommits;
    mapping(address => uint) balances;
    
    function escrow(uint amount) {
        address from = msg.sender;
        require(token.transfer(this, amount));
        Escrow escrow = Escrow(
            amount: amount,
            lockedUntil: block.timestamp + 5 hours,
            withdrawn: false
        )
        escrowed[from] = escrow;
    }

    function withdrawEscrow() {
        address from = msg.sender;
        Escrow escrow = escrowed[from];
        if(escrow.lockedUntil < block.timestamp && !escrow.withdrawn) {
            require(token.transfer(from, amount));
            escrow.withdrawn = true;
        }
    }

    function generateWrapperTokens(uint amount) {
        address from = msg.sender;
        Escrow escrow = escrowed[from];
        bool tokensStillLocked = escrow.lockedUntil > block.timestamp;
        if(tokensStillLocked && !escrow.withdrawn) {
            balance[from] += amount;
            escrow.withdrawn = true;
        }
    }

    function generateWithdrawalEscrow(uint amount) {
        address from = msg.sender;
        require(token.burn(this, amount));
        Escrow escrow = Escrow(
            amount: amount,
            lockedUntil: block.timestamp + 5 hours,
            withdrawn: false
        )
        escrowed[from] = escrow;
    }
}