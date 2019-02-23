interface IChain {
    id: string;

    computeStateLeaf(): Buffer;
    updateStateRoot(proof: Buffer[], newStateRoot: Buffer): Promise<any>;
}

