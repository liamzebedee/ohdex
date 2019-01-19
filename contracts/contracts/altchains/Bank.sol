
USER:
secret = random()
user_commit = sha256(secret)
bank_commit = exchange_with_bank(user_commit)

commit = H(user_commit, bank_commit)

User.escrow(amount, commit)

escrow = new Escrow(amount, commit, 2 hours)




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