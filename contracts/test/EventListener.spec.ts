
const chai = require('chai')
import { expect } from 'chai';
import { describe, it, before, teardown } from 'mocha';

chai.use(require('chai-as-promised'))

require('mocha')
import {
    EventListenerContract
} from '../build/wrappers/event_listener';

import {MerkleTree} from "./helpers/MerkleTree";

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

const TRUFFLE_DEFAULT_ADDR = `0x3ffafd6738f1823ea25b42ebe02aff44d022513e`
const PARITY_DEFAULT_ADDR = `0xc8c4f0c7c02181daacf2bf0ed455f74e20a6208a`

const AbiCoder = require('web3-eth-abi').AbiCoder();

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
        });'lop '
        expect(connected, "didn't connect to chain").to.eventually.be.fulfilled;
        
        accounts = await web3.getAvailableAddressesAsync();
        user = accounts[0]
        // user = '0xc8c4f0c7c02181daacf2bf0ed455f74e20a6208a'
    });

    it('It should work', async () => {
        // @ts-ignore
        let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));

        let elements = ['a', 'b', 'c'];

        const merkleTree = new MerkleTree(elements);

        const root = merkleTree.getHexRoot();
        const proof = merkleTree.getHexProof(elements[0]);
        const leaf = bufferToHex(keccak256(elements[0]));

        await eventListener.updateProof.sendTransactionAsync(new BigNumber(0), root);
        
        const latestProof = await eventListener.getLatestProof.callAsync(new BigNumber(0));

        expect(root).to.equal(latestProof);

        const verifyResult = await eventListener.checkEvent.callAsync(new BigNumber(0), new BigNumber(0), proof, leaf); 
        
        expect(verifyResult).to.equal(true);
    })

    describe('merkle functinos', () => {
        it('worked', async() => {
            // @ts-ignore
            let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));
            
            let genesisRoot = await eventListener.stateRoot.callAsync();
            let genesisTime = await eventListener.stateRootUpdated.callAsync()

            let blockhashes = {
                chainA: [
                    Buffer.from(
                        AbiCoder.encodeParameter('bytes32', genesisRoot), 
                    'hex'),
                    Buffer.from(
                        AbiCoder.encodeParameter('uint256', genesisTime),
                    'hex')
                    // Buffer.from('0420000000000000000000000000000000000000000000000000000000000000', 'hex'),
                    // Buffer.from($web3.utils.toHex(1549401186), 'hex')
                ],
                chainB: [
                    Buffer.from('3210', 'hex'),
                    Buffer.from('3210', 'hex')
                ],
                chainC: [
                    Buffer.from('2412', 'hex'),
                    Buffer.from('3210', 'hex')
                ]
            }

            let items = Object.values(blockhashes).map(hashes => Buffer.concat(hashes))
            let tree = new MerkleTree(
                items,
                keccak256
            );

            let buf = Buffer.from('3210', 'hex');

            let leafHashJs = `0x`+tree.hashLeaf(buf).toString('hex')
            let leafHashSol = await eventListener._hashLeaf.callAsync(`0x`+buf.toString('hex'))
            expect(leafHashSol).to.eq(leafHashJs)

            let buf1 = tree.hashLeaf(Buffer.from('3210', 'hex'));
            let buf2 = tree.hashLeaf(Buffer.from('216432', 'hex'));
            let branchHashJs = `0x`+tree.hashBranch(buf1, buf2).toString('hex')
            let branchHashSol = await eventListener._hashBranch.callAsync(
                `0x`+buf1.toString('hex'),
                `0x`+buf2.toString('hex')
            )
            expect(branchHashSol).to.eq(branchHashJs)
        })

        it.only('sorts correctly', async () => {

            let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));
            
            let genesisRoot = await eventListener.stateRoot.callAsync();
            let genesisTime = await eventListener.stateRootUpdated.callAsync()

            let blockhashes = {
                chainA: Buffer.from(AbiCoder.encodeParameters(['bytes32','uint256'],[genesisRoot, ""+genesisTime]).slice(2),'hex'),
                chainB: Buffer.from('3210', 'hex'),
                chainC: Buffer.from('3217', 'hex'),
            }
            let items = Object.values(blockhashes)
            let tree = new MerkleTree(
                items,
                keccak256
            );
            
            let proof = tree.generateProof(blockhashes.chainA);
            console.log(tree.toString(), proof)
            let root = await eventListener._computeRoot.callAsync(
                proof.map(buf => `0x`+buf.toString('hex')),
                tree.hashLeaf(blockhashes.chainA)
            )
            
            
            blockhashes.chainA = Buffer.from(AbiCoder.encodeParameters(['bytes32','uint256'],[genesisRoot, ""+genesisTime.plus(55)]).slice(2),'hex');


            tree = new MerkleTree(
                Object.values(blockhashes),
                keccak256
            );
            proof = tree.generateProof(blockhashes.chainA);
            console.log(tree.toString(), proof)
            expect(tree.verifyProof(proof, blockhashes.chainA)).to.be.true;
            
            root = await eventListener._computeRoot.callAsync(
                proof.map(buf => `0x`+buf.toString('hex')),
                '0x'+tree.hashLeaf(blockhashes.chainA).toString('hex')
            )
            expect(root).to.eq('0x'+tree.root().toString('hex'))

        })
    })

    describe('success states', () => {

        // it.only('updates state root', async () => {
        it('updates state root', async () => {
            // @ts-ignore
            let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));
            
            
            // construct new merkle root
            // let genesisRoot = Buffer.from('0420', 'hex');
            let genesisRoot = await eventListener.stateRoot.callAsync();
            let genesisTime = await eventListener.stateRootUpdated.callAsync()
            // console.log(genesisRoot, genesisTime)

            let blockhashes = {
                // chainA: [
                //     Buffer.from(
                //         AbiCoder.encodeParameter('bytes32', genesisRoot), 
                //     'hex'),
                //     Buffer.from(
                //         AbiCoder.encodeParameter('uint256', `${genesisTime}`),
                //     'hex')
                // ],
                chainA: Buffer.from(AbiCoder.encodeParameters(['bytes32','uint256'],[genesisRoot, ""+genesisTime]).slice(2),'hex'),
                chainB: Buffer.from('3210', 'hex'),
                chainC: Buffer.from('3217', 'hex'),
            }
            console.log(blockhashes)
            // let items = Object.values(blockhashes).map(hashes => hashes.reduce((prev,next) => prev.concat(next)))
            let items = Object.values(blockhashes)
            // .map(arr => {
            //     return Buffer.concat(arr)
            // })
            let chainA = items[0];
            
            expect(chainA.byteLength).to.eq(64);

            console.log(`chain A: `, chainA.byteLength)

            let tree = new MerkleTree(
                items,
                keccak256
            );

            let proof = tree.generateProof(chainA);
            console.log(tree.toString())
            console.log(proof)
            let encoded = proof.map(buf => `0x`+buf.toString('hex'))
            console.log(encoded)

            // console.log(encoded,`0x`+tree.root().toString('hex'), 
            // genesisRoot,
            // genesisTime)
            
            // let tx = await eventListener.updateStateRoot.callAsync(
            let newStateRoot =  `0x`+tree.root().toString('hex');

            let root = await eventListener._computeRoot.callAsync(
                encoded,
                tree.hashLeaf(chainA)
            )
            console.log(root, newStateRoot)

            let tx = web3.awaitTransactionSuccessAsync(
                await eventListener.updateStateRoot.sendTransactionAsync(
                    // proof.map(buf => `0x`+buf.toString('hex')),
                    // ["0x123"],
                    encoded,
                    newStateRoot, 
                    genesisRoot,
                    genesisTime
                )
            )
            
            expect(tx).to.be.eventually.fulfilled;

            let stateRoot = await eventListener.stateRoot.callAsync()
            let stateRootUpdated = ""+(await eventListener.stateRootUpdated.callAsync())
            let lastBlockTimestamp = ""+(await web3.getBlockTimestampAsync('latest'))

            expect(stateRoot).to.eq(newStateRoot);
            expect(stateRootUpdated).to.eq(lastBlockTimestamp)

            let wait = new Promise((res,rej) => {
                setTimeout(res, 2000)
            })
            await wait;
            // await tx;
        })

        it('slashes with two differently valid state root proofs', async () => {

        })
    })
    
    

    teardown(() => {
        pe.stop();
    })
    

    describe('MerklePatriciaEventListener', () => {
        it('x', async () => {
            let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));
            

            // // construct new merkle root
            let blockhashes = {
                chainA: Buffer.from('1230', 'hex'),
                chainB: Buffer.from('3210', 'hex'),
            }

            

            // const tree = new MerklePatriciaTree();
            // Object.entries(tree).map((k, v) => {
            //     tree.put(Buffer.from(k), v)
            // });
            // const witness = tree.get(Buffer.from('chainA'));
            // VerifyWitness(witness, tree.root);

            

            // // tree.

            // let tx = await eventListener.updateStateRoot.sendTransactionAsync(
            //     witness.proof.map(v => v.toBuffer), 
            //     tree.root, 
            //     witness.value
            // );
        })
    })

})