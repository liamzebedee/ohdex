import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";

// Holds state (events) in a merkle tree and creates proofs of events
abstract class StateGadget {
    abstract getId(): string;
    abstract getLeaf(): ChainStateLeaf;
    abstract proveEvent(eventId: string): MerkleTreeProof;
}

// A buffer'ised representation of a state, for composition in larger state trees
abstract class ChainStateLeaf {
    abstract toBuffer(): Buffer;
}

export {
    StateGadget,
    ChainStateLeaf
}