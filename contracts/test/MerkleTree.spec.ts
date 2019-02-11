
const chai = require('chai')
import { expect } from 'chai';
import { describe, it, before, teardown, Test } from 'mocha';

chai.use(require('chai-as-promised'))

require('mocha')
import {
    XMerkleTreeContract
} from '../build/wrappers/x_merkle_tree';

import {
    MerkleTree,
    hashBranch,
    hashLeaf,
    
} from "./helpers/MerkleTree";

import { Web3ProviderEngine, RPCSubprovider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { keccak256, bufferToHex, toBuffer } from 'ethereumjs-util';
import { keccak } from 'ethereumjs-util';
let $web3 = require('web3')

function getDeployArgs(name, pe, from): [ string, AbiDefinition[],  Provider, Partial<TxData>] {
    let json = require(`../build/contracts/${name}.json`);
    let bytecode = json.bytecode;
    let abi = json.abi;
    let provider = pe;

    return [
        bytecode,
        abi,
        provider,
        { from }
    ]
}

import { TruffleArtifactAdapter } from '@0x/sol-trace';
import { RevertTraceSubprovider } from '@0x/sol-trace';
import { MerkleProofContract } from '../build/wrappers/merkle_proof';

const TRUFFLE_DEFAULT_ADDR = `0x3ffafd6738f1823ea25b42ebe02aff44d022513e`
const PARITY_DEFAULT_ADDR = `0xc8c4f0c7c02181daacf2bf0ed455f74e20a6208a`

const AbiCoder = require('web3-eth-abi').AbiCoder();


class TestTreeFactory {

    // static dataToBuffer(items: string[][]): Buffer[] {
    //     return items.map(arr => Buffer.concat(arr.map(x => Buffer.from(x))))
    // }
    static itemsToBuffer(items: string[][]): Buffer[] {
        let itemsBuf: Buffer[] = [
            ...items.map(item => AbiCoder.encodeParameter('uint256', item))
        ].map(item => item.slice(2)).map(item => Buffer.from(item, 'hex'))
        return itemsBuf;
    }

    static newTree(items: string[][]): MerkleTree {
        let tree = new MerkleTree(
            this.itemsToBuffer(items),
            keccak256
        );
        return tree;
    }
}

function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}

function prefix0x(x: string): string {
    return `0x${x}`;
}

describe('EventListener', function() {
    this.timeout(15000)

    let pe: Web3ProviderEngine, web3: Web3Wrapper;
    let accounts;
    let user;

    before(async () => {
        pe = new Web3ProviderEngine();
        
        const artifactAdapter = new TruffleArtifactAdapter(require('path').dirname(require.resolve('..')), '0.5.0');
        const revertTraceSubprovider = new RevertTraceSubprovider(
            artifactAdapter, 
            TRUFFLE_DEFAULT_ADDR,
            true
        );
        pe.addProvider(revertTraceSubprovider);

        pe.addProvider(new RPCSubprovider('http://127.0.0.1:9545'))
        pe.start()

        web3 = new Web3Wrapper(pe);

        let connected = new Promise((res, rej) => {
            pe.on('block', res)
            setTimeout(rej, 2000)
        });
        expect(connected, "didn't connect to chain").to.eventually.be.fulfilled;
        
        accounts = await web3.getAvailableAddressesAsync();
        user = accounts[0]
        // user = '0xc8c4f0c7c02181daacf2bf0ed455f74e20a6208a'
    });


    describe('Merkle proof verification', () => {
        let merkleTree: XMerkleTreeContract;
        before(async () => {
            merkleTree = await XMerkleTreeContract.deployAsync(...getDeployArgs('MerkleTree', pe, user));
        })

        it('_hashLeaf', async() => {
            let data = ['00','2'];

            // TODO 1st param is bytes32, but uint256 encodes simpler
            let hex: string[] = [
                AbiCoder.encodeParameter('uint256', data[0]),
                AbiCoder.encodeParameter('uint256', data[1])
            ].map(item => item.slice(2))

            let buf = Buffer.concat(hex.map(x => Buffer.from(x, 'hex')));
            expect(buf.byteLength).to.eq(64);

            let hashJs = hashLeaf(keccak256, buf);

            // @ts-ignore
            let hashSol = await merkleTree._hashLeaf.callAsync(
                hex.map(prefix0x)
            )

            expect(hashSol).to.eq(hexify(hashJs));
        })

        it('_hashBranch', async() => {

            let left = '123';
            let right = '245';

            // TODO 1st param is bytes32, but uint256 encodes simpler
            let leftHex: string = AbiCoder.encodeParameter('uint256', left)
            let rightHex: string = AbiCoder.encodeParameter('uint256', left)

            let leftBuf = Buffer.from(leftHex.slice(2), 'hex')
            let rightBuf = Buffer.from(rightHex.slice(2), 'hex')

            expect(leftBuf.byteLength).to.eq(32);
            expect(rightBuf.byteLength).to.eq(32);

            let hashJs = hashBranch(keccak256, leftBuf, rightBuf);

            // @ts-ignore
            let hashSol = await merkleTree._hashBranch.callAsync(
                leftHex,
                rightHex
            )

            expect(hashSol).to.eq(hexify(hashJs));
        })

        it('_verify', async() => {
            let items = [
                ['1','2'],
                ['3','4']
            ]
            let itemToProve = TestTreeFactory.itemsToBuffer(items)[0];
            let leafToProve = hashLeaf(keccak256, itemToProve);

            let tree = TestTreeFactory.newTree(items)
            
            let proof = tree.generateProof(itemToProve);
            // console.log(proof)
            // console.log(tree.toString())

            expect(tree.verifyProof(proof, leafToProve)).to.be.true;

            let root = await merkleTree._computeRoot.callAsync(
                proof.map(hexify), 
                hexify(leafToProve)
            )
            
            expect(root).to.eq(hexify(tree.layers[1][0]));
            expect(root).to.eq(hexify(tree.root()))

            let verify = await merkleTree._verify.callAsync(
                proof.map(hexify), 
                hexify(tree.root()), 
                hexify(leafToProve)
            )
            expect(verify).to.be.true;
        })
    })

})


// 1) length in encode vs not in encodePacked