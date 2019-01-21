proof that lock(amount, token, chain)
proof that burn(amount, token, chain)



if(locked[altchain][from][token] == amount) {
    
}

if(burnt[mainchain][from][token] == amount) {
    send tokens here
    // thus completes lock on mainchain
}






an idea of using smart contracts, hash-locked time contracts / escrow commitment protocols, and zero-knowledge proofs with merkle trees, to make cross-chain exchange possible

trust is hereby only placed upon:
- the finality of the alt and main chain for bridging
- the security of an interactive time-based escrow protocol
- the availability of relayers to update the cross-chain state roots through building zkproofs

tokens are deposited into escrows for banks on altchains, and on the mainchain users can withdraw wrapped tokens of equivalent amounts

the escrow scheme is designed so that there is no counterparty risk between the bank and the user
    ie. it is akin to an atomic swap of commitment to mint wrapped tokens on the main chain, and a commitment to send the original tokens on the alt chain to the bank

zero knowledge proofs are used as a way to solve the value splitting problem
    commitment schemes work for simple atomic swaps

    but we need a succinct state-sharing mechanism of value balances (which can change if you trade) between chains


users submit signed tx's to relayers, which process them and produce a proof which is run on both chains

each chain then receives the updated merkle roots of the cross chain state - (reserved, mintable, wrapped)

the validity of token amounts from escrow is ensured by passing in the state of the balances in each chain
note that the logic applies across chains:
    the mainchain bridge mints and burns its own token balances
    the altchain bridges receive tokens by commit-reveal of an escrow


tokens move between three states:
    reserved - where they are owned by the bank
    mintable - where they can be minted into wrapped tokens

the user generates a merkle proof to prove that the tokens are in the MINTABLE state, after which they are minted to them

when they wish to exchange on the altchain, they engage in the same escrow process
1. committing to burn the wrapped tokens, and the bank committing to reserve them (a zero knowledge TX)
2. the bank reveals first, burning them and enabling the user to withdraw
3. the user then reveals, withdrawing the tokens


onus on chain security is put upon the user 






We can genericise this scheme even further by:

defining the (escrow, reserve) as simple addresses within each chain
realising every tx as a transfer, and only one merkle root necessary
allowing mints with a merkle proof of the (escrow) having a balance from you

