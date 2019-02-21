import { HashFunction } from ".";

class SparseMerkleTree {
	items: Buffer[];
	leaves: Buffer[];
	layers: Buffer[][];
	nLayers: number;
	hashFn: (buf: Buffer) => Buffer;
    hashSizeBytes: number;
    
    constructor(items: Buffer[], hashFn: HashFunction) {
        this.hashFn = hashFn;
        this.items = items;
    }

}

export {
    SparseMerkleTree
}