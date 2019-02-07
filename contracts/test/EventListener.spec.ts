
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

    // it('It should work', async () => {
    //     // @ts-ignore
    //     let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));

    //     let elements = ['a', 'b', 'c'];

    //     const merkleTree = new MerkleTree(elements);

    //     const root = merkleTree.getHexRoot();
    //     const proof = merkleTree.getHexProof(elements[0]);
    //     const leaf = bufferToHex(keccak256(elements[0]));

    //     await eventListener.updateProof.sendTransactionAsync(new BigNumber(0), root);
        
    //     const latestProof = await eventListener.getLatestProof.callAsync(new BigNumber(0));

    //     expect(root).to.equal(latestProof);

    //     const verifyResult = await eventListener.checkEvent.callAsync(new BigNumber(0), new BigNumber(0), proof, leaf); 
        
    //     expect(verifyResult).to.equal(true);
    // })

    describe('state update', () => {
        it.only('updates state root', async () => {
            // @ts-ignore
            let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));
            
            // construct new merkle root
            let genesisRoot = await eventListener.stateRoot.callAsync();
            let genesisTime = await eventListener.stateRootUpdated.callAsync()

            let state = {
                chainA: Buffer.from(
                    AbiCoder.encodeParameters(
                        ['bytes32','uint256'],
                        [genesisRoot, ""+genesisTime]
                    ).slice(2),
                'hex'),
                chainB: Buffer.from('3210', 'hex'),
                chainC: Buffer.from('3217', 'hex'),
            }

            expect(state.chainA.byteLength).to.eq(64);

            let items = Object.values(state)
            
            let tree = new MerkleTree(
                items,
                keccak256
            );

            let proof = tree.generateProof(items[0]);

            let newStateRoot = hexify(tree.root())

            let tx = web3.awaitTransactionSuccessAsync(
                await eventListener.updateStateRoot.sendTransactionAsync(
                    proof.map(hexify),
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
    

})