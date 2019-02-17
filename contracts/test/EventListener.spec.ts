
const chai = require('chai')
import { expect, assert } from 'chai';
import { describe, it, before, teardown } from 'mocha';

chai.use(require('chai-as-promised'))

require('mocha')
import {
    EventListenerContract
} from '../build/wrappers/event_listener';

import {MerkleTree} from "../../ts-merkle-tree/src";

import { Web3ProviderEngine, RPCSubprovider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';


function keccak256(x: any): Buffer {
    return require('ethereumjs-util').keccak256(x)
}


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
import { EventEmitterContract } from '../build/wrappers/event_emitter';

const TRUFFLE_DEFAULT_ADDR = `0x3ffafd6738f1823ea25b42ebe02aff44d022513e`
const PARITY_DEFAULT_ADDR = `0xc8c4f0c7c02181daacf2bf0ed455f74e20a6208a`

const AbiCoder = require('web3-eth-abi').AbiCoder();


function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}

function dehexify(str: string): Buffer {
    // begins with 0x
    if(str[1] == 'x') str = str.slice(2);
    return Buffer.from(str, 'hex')
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

    describe('EventEmitter', () => {
        let eventEmitter: EventEmitterContract;
        beforeEach(async () => {
            eventEmitter = await EventEmitterContract.deployAsync(...getDeployArgs('EventEmitter', pe, user));
        })

        it('initially has 0 events', async() => {
            expect(
                (await eventEmitter.getEventsCount.callAsync()).toString()
            ).to.eq('0');
        })

        it('computes root with 0 events', async() => {
            expect(
                await eventEmitter.getEventsRoot.callAsync()
            ).to.eq('0x0000000000000000000000000000000000000000000000000000000000000000')
        })

        it('computes root with 1 events', async() => {
            let oldRoot = await eventEmitter.getEventsRoot.callAsync()
            
            let ev1 = keccak256('123');
            await eventEmitter.emitEvent.sendTransactionAsync(hexify(ev1))
            
            expect(
                await eventEmitter.getEventsRoot.callAsync()
            ).to.not.eq(oldRoot)

            expect(
                await eventEmitter.getEventsRoot.callAsync()
            ).to.eq('0x185a4b954a0a13605ae9ffc1817329ed8c8fe5f5bdc6aa40d250c4e175880897')
        })

        it('matches root with typescript impl', async () => {
            let ev1 = keccak256('123');
            await eventEmitter.emitEvent.sendTransactionAsync(hexify(ev1))

            let tree = new MerkleTree([ev1], keccak256);
            expect(
                await eventEmitter.getEventsRoot.callAsync()
            ).to.eq(hexify(tree.root()))
        })

        it('matches root with 2 of the same events', async() => {
            let ev1 = keccak256('123');
            await eventEmitter.emitEvent.sendTransactionAsync(hexify(ev1))
            await eventEmitter.emitEvent.sendTransactionAsync(hexify(ev1))

            let tree = new MerkleTree([ev1,ev1], keccak256);
            expect(
                await eventEmitter.getEventsRoot.callAsync()
            ).to.eq(hexify(tree.root()))
        })
    })

    describe.only('EventListener', () => {
        let eventEmitter: EventEmitterContract;
        let eventListener: EventListenerContract;

        beforeEach(async () => {
            eventEmitter = await EventEmitterContract.deployAsync(...getDeployArgs('EventEmitter', pe, user));
            // @ts-ignore
            eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user), eventEmitter.address);
        })

        it('updates state root with 0 events', async () => {
            // construct new merkle root
            let interchainStateRoot = await eventListener.interchainStateRoot.callAsync();
            let eventsRoot = await eventEmitter.getEventsRoot.callAsync();

            let state = {
                chainA: Buffer.from(
                    AbiCoder.encodeParameters(
                        ['bytes32','bytes32'],
                        [interchainStateRoot, eventsRoot]
                    ).slice(2),
                'hex'),
                chainB: Buffer.from('3210', 'hex'),
            }

            expect(state.chainA.byteLength).to.eq(64);

            let items = Object.values(state)
            let tree = new MerkleTree(
                items,
                keccak256
            );

            let proof = tree.generateProof(items[0]);
            tree.verifyProof(proof, tree.hashLeaf(items[0]))

            let newInterchainStateRoot = hexify(tree.root())

            let tx = web3.awaitTransactionSuccessAsync(
                await eventListener.updateStateRoot.sendTransactionAsync(
                    proof.proofs.map(hexify),
                    proof.paths,
                    newInterchainStateRoot, 
                    interchainStateRoot,
                    eventsRoot
                )
            )
            
            expect(tx).to.be.eventually.fulfilled;
            expect(await eventListener.interchainStateRoot.callAsync()).to.eq(newInterchainStateRoot);

            let wait = new Promise((res,rej) => {
                setTimeout(res, 2000)
            })
            await wait;
        })

        it('updates state root with 1 events', async () => {
            await eventEmitter.emitEvent.sendTransactionAsync(hexify(keccak256('123')))
            
            // construct new merkle root
            let interchainStateRoot = dehexify(await eventListener.interchainStateRoot.callAsync())
            let eventsRoot = dehexify(await eventEmitter.getEventsRoot.callAsync())

            let state = {
                chainA: Buffer.concat([ interchainStateRoot, eventsRoot ]),
                chainB: Buffer.from('3210', 'hex'),
            }

            expect(state.chainA.byteLength).to.eq(64);

            let items = Object.values(state)
            let tree = new MerkleTree(
                items,
                keccak256
            );

            let proof = tree.generateProof(state.chainA);
            tree.verifyProof(proof, tree.hashLeaf(state.chainA))

            let newInterchainStateRoot = hexify(tree.root())

            let tx = web3.awaitTransactionSuccessAsync(
                await eventListener.updateStateRoot.sendTransactionAsync(
                    proof.proofs.map(hexify),
                    proof.paths,
                    newInterchainStateRoot, 
                    hexify(interchainStateRoot),
                    hexify(eventsRoot)
                )
            )
            
            expect(tx).to.be.eventually.fulfilled;
            expect(await eventListener.interchainStateRoot.callAsync()).to.eq(newInterchainStateRoot);

            let wait = new Promise((res,rej) => {
                setTimeout(res, 2000)
            })
            await wait;

            
        })

        it.only('updates the state root twice', async() => {
            await eventEmitter.emitEvent.sendTransactionAsync(hexify(keccak256('123')))
            
            // construct new merkle root
            let interchainStateRoot = dehexify(await eventListener.interchainStateRoot.callAsync())
            let eventsRoot = dehexify(await eventEmitter.getEventsRoot.callAsync())

            let state = {
                chainA: Buffer.concat([ interchainStateRoot, eventsRoot ]),
                chainB: Buffer.from('3210', 'hex'),
            }

            expect(state.chainA.byteLength).to.eq(64);

            let items = Object.values(state)
            let tree = new MerkleTree(
                items,
                keccak256
            );

            let proof = tree.generateProof(state.chainA);
            tree.verifyProof(proof, tree.hashLeaf(state.chainA))

            let newInterchainStateRoot = hexify(tree.root())

            await eventListener.updateStateRoot.sendTransactionAsync(
                proof.proofs.map(hexify),
                proof.paths,
                newInterchainStateRoot, 
                hexify(interchainStateRoot),
                hexify(eventsRoot)
            )
            
            expect(await eventListener.interchainStateRoot.callAsync()).to.eq(newInterchainStateRoot);


            // 2nd update
            await eventEmitter.emitEvent.sendTransactionAsync(hexify(keccak256('123')))
            interchainStateRoot = dehexify(await eventListener.interchainStateRoot.callAsync())
            eventsRoot = dehexify(await eventEmitter.getEventsRoot.callAsync())
            state.chainA = Buffer.concat([ dehexify(newInterchainStateRoot), eventsRoot ]),
            
            items = Object.values(state)
            tree = new MerkleTree(
                items,
                keccak256
            );

            proof = tree.generateProof(state.chainA);
            tree.verifyProof(proof, tree.hashLeaf(state.chainA))
            newInterchainStateRoot = hexify(tree.root())
            await eventListener.updateStateRoot.sendTransactionAsync(
                proof.proofs.map(hexify),
                proof.paths,
                newInterchainStateRoot, 
                hexify(interchainStateRoot),
                hexify(eventsRoot)
            )
            expect(await eventListener.interchainStateRoot.callAsync()).to.eq(newInterchainStateRoot);
        })

        it('slashes with two differently valid state root proofs', async () => {

        })
    })
    
    

    teardown(() => {
        pe.stop();
    })
    

})



