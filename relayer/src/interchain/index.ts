import { StateLeaf } from "../chain/ethereum";
import { MerkleTree, MerkleTreeProof } from "../../../ts-merkle-tree/src";

// @ts-ignore
import { keccak256 } from 'ethereumjs-util';
import { dehexify } from "../utils";

class InterchainState {
    leaves: Buffer[] = [];
    
    roots: { 
        [k: string]: StateLeaf
    } = {};

    globalState: MerkleTree;

    proofs: {
        [k: string]: MerkleTreeProof
    } = {}

    constructor() {}

    computeState() {
        this.globalState = new MerkleTree(
            this.leaves,
            keccak256
        );
        let chains = Object.keys(this.roots)

        for(let id of chains) {
            let leafIdx = this.getChainLeafIdx(id);
            let proof = this.globalState.generateProof(leafIdx)
            if(!this.globalState.verifyProof(proof, proof.leaf)) throw new Error;

            this.proofs[id] = proof;
        }
    }

    addChain(chainId: string, leaf: StateLeaf) {
        this.roots[chainId] = leaf;
        this.leaves = Object.values(this.roots).map<Buffer>(root => {
            return root._leaf
        });
    }

    getChainLeafIdx(chainId: string) {
        let leafIdx = Object.keys(this.roots).indexOf(chainId)
        return leafIdx
    }

    getEventProof(chainId: string, evHash: string) {
        
    }

    isEventAcknowledged(chainId: string, eventHash: string):boolean {
        let eventsTree = this.roots[chainId].eventsTree
        return eventsTree.findLeafIndex(dehexify(eventHash)) != -1;
    }
    
}

export {
    InterchainState
}