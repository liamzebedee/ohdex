import { ChainStateLeaf } from "../../interchain";
import { MerkleTree } from "@ohdex/typescript-solidity-merkle-tree";
import { StateGadget } from "../../interchain/gadget";
import { dehexify } from "../../utils";
import { keccak256, hexify } from "../../utils";
import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";


class EthereumStateLeaf extends ChainStateLeaf {
    lastRoot: Buffer;
    eventsRoot: Buffer;
    
    toBuffer(): Buffer {
        return Buffer.concat([
            // this.lastRoot,
            this.eventsRoot
        ])
    }
}

class EthereumStateGadget extends StateGadget {
    events: Buffer[] = [];
    eventsTree: MerkleTree;
    id: string;

    constructor(id: string) {
        super()
        this.id = id;
    }

    get root() {
        if(this.events.length == 0) {
            return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
        }
        return this.eventsTree.root();
    }

    getId() {
        return this.id
    }

    // putChainState(chainId: string, oldRoot: string, )
    addEvent(eventHash: string) {
        this.events.push(dehexify(eventHash))
        this.eventsTree = new MerkleTree(
            this.events,
            keccak256
        );
    }

    // updateCurrentRoot(root: string) {
    //     this.root = dehexify(root)
    // }
    
    getLeaf(): EthereumStateLeaf {
        let leaf = new EthereumStateLeaf()
        if(this.events.length == 0) {
            leaf.eventsRoot = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
        } else {
            leaf.eventsRoot = this.eventsTree.root()
        }
        return leaf
    }

    proveEvent(eventHash: string): MerkleTreeProof {
        let idx = this.eventsTree.findLeafIndex(dehexify(eventHash))
        if(idx === -1) throw new Error(`no event ${eventHash}`)
        return this.eventsTree.generateProof(idx)
    }
}

export {
    EthereumStateGadget,
    EthereumStateLeaf
}