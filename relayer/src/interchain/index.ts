import { MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";
import { MerkleTree } from "@ohdex/typescript-solidity-merkle-tree/src";
import { dehexify, hexify } from "../utils";
import { BigNumber } from "0x.js";


const toBN = (str) => new BigNumber(str);
// import { keccak256 } from 'web3-utils';
const keccak256 = (x: any) => dehexify(require('web3-utils').keccak256(x));

// Holds state (events) in a merkle tree and creates proofs of events
abstract class StateGadget {
    abstract getId(): string;
    abstract getLeaf(): AbstractChainStateLeaf;
    abstract proveEvent(eventId: string): MerkleTreeProof;
}

// A buffer'ised representation of a state, for composition in larger state trees
abstract class AbstractChainStateLeaf {
    abstract toBuffer(): Buffer;
}

class EthereumStateLeaf extends AbstractChainStateLeaf {
    lastRoot: Buffer;
    eventsRoot: Buffer;
    
    toBuffer(): Buffer {
        return Buffer.concat([
            // this.lastRoot,
            this.eventsRoot
        ])
    }
}

class MockStateLeaf extends AbstractChainStateLeaf {
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

class EthereumChainStateGadget extends StateGadget {
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


class CrosschainState {
    chains: {
        [id: string]: StateGadget
    } = {};
    tree: MerkleTree;
    leaves: AbstractChainStateLeaf[] = [];
    leafIdx: {
        [id: string]: number
    } = {};

    // @ts-ignore
    get root(): string {
        return hexify(this.tree.root())
    }

    put(state: StateGadget) {
        this.chains[state.getId()] = state
    }

    compute() {
        let chains = Object.keys(this.chains)
        let leafIdx: {
            [id: string]: number
        } = {};
        let leaves: AbstractChainStateLeaf[] = []

        let i = 0;
        for(let id of chains) {
            let leaf = this.chains[id].getLeaf()
            leaves.push(leaf)
            leafIdx[id] = i;
            i++
        }

        let tree = new MerkleTree(
            leaves.map(leaf => leaf.toBuffer()),
            keccak256
        )

        this.tree = tree;
        this.leaves = leaves;
        this.leafIdx = leafIdx;
    }

    proveUpdate(chainId: string): CrosschainStateUpdateProof {
        if(!this.chains[chainId]) throw new Error(`no chain for id ${chainId}`)
        let leafIdx = this.leafIdx[chainId]
        let leaf = this.leaves[leafIdx]
        let proof = this.tree.generateProof(leafIdx)
        
        return {
            chainId,
            proof,
            leaf
        }
    }

    proveEvent(fromChain: string, eventId: string): CrosschainEventProof {
        if(!this.chains[fromChain]) throw new Error(`no chain for id ${fromChain}`)

        // Other chains can be on previous roots
        // So we need to keep track

        let gadget = this.chains[fromChain]
        let eventProof = gadget.proveEvent(eventId)

        let rootProof = this.tree.generateProof(
            this.leafIdx[fromChain]
        );

        return {
            eventProof,
            rootProof
        }
    }
}

class CrosschainStateUpdateProof {
    chainId: string;
    proof: MerkleTreeProof;
    leaf: AbstractChainStateLeaf;
}

class CrosschainEventProof {
    eventProof: MerkleTreeProof;
    rootProof: MerkleTreeProof;
}

export {
    CrosschainState,
    EthereumChainStateGadget,
    EthereumStateLeaf,
    
    AbstractChainStateLeaf,

    CrosschainStateUpdateProof,
    CrosschainEventProof
}