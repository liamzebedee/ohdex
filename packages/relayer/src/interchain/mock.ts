import { StateGadget } from "./gadget";
import { ChainStateLeaf } from ".";
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";

class MockStateLeaf extends ChainStateLeaf {
    data: string;

    toBuffer(): Buffer {
        return Buffer.from(this.data);
    }
} 

class MockChainStateGadget extends StateGadget {
    state = ""

    id = `${Math.random()}`


    getId() {
        return this.id
    }

    setState(s) {
        this.state = s;
    }

    getLeaf(): MockStateLeaf {
        let leaf = new MockStateLeaf()
        leaf.data = this.state
        return leaf
    }

    proveEvent(eventId: string): MerkleTreeProof {
        throw new Error('unimplemented')
    }
}

export {
    MockChainStateGadget,
    MockStateLeaf
}