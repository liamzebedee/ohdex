import chai, { expect, should, assert } from 'chai';
import { describe, it, setup, teardown } from 'mocha';
import { bufferToHex, toBuffer  } from 'ethereumjs-util';
import Web3 from 'web3';

import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';

import {
    EventListenerContract, EventListenerEvents
} from '../build/wrappers/event_listener';

import {
    EventEmitterContract,
    EventEmitterEventArgs,
    EventEmitterEvents,
    EventEmitterEventEmittedEventArgs
} from '../build/wrappers/event_emitter';


import {
    EscrowContract
}  from '../build/wrappers/escrow'

import {
    BridgeContract
}   from '../build/wrappers/bridge';

import { Web3ProviderEngine, RPCSubprovider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { BridgedTokenContract } from '../build/wrappers/bridged_token';
import { BaseContract } from '@0x/base-contract';
import { ethers } from 'ethers';

function getContractArtifact(name: string) {
    name = name.split('Contract')[0];

    // require('path').dirname(require.resolve('..')) + `/build/artifacts`,

    return require(`../../build/artifacts/${name}.json`)
}

const TRUFFLE_DEFAULT_ADDR = `0x3ffafd6738f1823ea25b42ebe02aff44d022513e`

import { SolCompilerArtifactAdapter } from '@0x/sol-trace';
import { RevertTraceSubprovider } from '@0x/sol-trace';
import { GanacheTestchain, dehexify, hexify } from './helpers';

import { MerkleTree, MerkleTreeProof } from '@ohdex/typescript-solidity-merkle-tree';

const toBN = (str) => new BigNumber(str);
// import { keccak256 } from 'web3-utils';
const keccak256 = (x: any) => dehexify(require('web3-utils').keccak256(x));


describe('Bridge', function(){
    this.timeout(10000);
    let ethersProvider: ethers.providers.Provider;
    let pe, web3: Web3Wrapper;
    let accounts;
    let user;

    function getEthersContract(contract: BaseContract) {
        return new ethers.Contract(
            contract.address,
            contract.abi,
            ethersProvider
        )
    }


    let bridgeOrigin: EscrowContract;
    let bridgeForeign: BridgeContract;
    let bridgedToken: BridgedTokenContract;

    let eventListener: EventListenerContract;
    let eventEmitter: EventEmitterContract;

    let chainId = new BigNumber('1')
    let salt = new BigNumber('1')

    beforeEach(async () => {
        const port = '9546';
        let chain = await GanacheTestchain.start(port);

        pe = new Web3ProviderEngine();
        // const artifactAdapter = new SolCompilerArtifactAdapter(
            // require('path').dirname(require.resolve('..')) + `/build/artifacts`,
            // require('path').dirname(require.resolve('..')) + `/contracts`,
            // require('path').dirname(require.resolve('..')), 
            // '0.5.0'
        // );
        // const revertTraceSubprovider = new RevertTraceSubprovider(
        //     artifactAdapter, 
        //     TRUFFLE_DEFAULT_ADDR,
        //     true
        // );
        // pe.addProvider(revertTraceSubprovider);
        pe.addProvider(new RPCSubprovider('http://127.0.0.1:9546'))
        pe.start()

        web3 = new Web3Wrapper(pe);
        // web3V = new Web3(pe);
        accounts = await web3.getAvailableAddressesAsync();
        user = accounts[0]

        const CONNECT_TIMEOUT = 1500;
        ethersProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:9546');
        // @ts-ignore
        ethersProvider.polling = true;
        // @ts-ignore
        ethersProvider.pollingInterval = 1000;
        await new Promise((res, rej) => {
            ethersProvider.on('block', res);
            setTimeout(
                _ => {
                    rej(new Error(`Ethers.js couldn't connect after ${CONNECT_TIMEOUT}ms`))
                }, 
                CONNECT_TIMEOUT
            )
        })
        
        const txDefaults = { from: user };

        // @ts-ignore
        eventEmitter = await EventEmitterContract.deployFrom0xArtifactAsync(
            getContractArtifact('EventEmitterContract'), pe, txDefaults
        )
        // @ts-ignore
        eventListener = await EventListenerContract.deployFrom0xArtifactAsync(
            getContractArtifact('EventListenerContract'), pe, txDefaults,
            eventEmitter.address
        )
        // @ts-ignore
        bridgeOrigin = await EscrowContract.deployFrom0xArtifactAsync(
            getContractArtifact('EscrowContract'), pe, txDefaults,
            chainId, eventListener.address, eventEmitter.address
        )
        // @ts-ignore
        bridgeForeign = await BridgeContract.deployFrom0xArtifactAsync(
            getContractArtifact('BridgeContract'), pe, txDefaults,
            chainId, eventListener.address, eventEmitter.address
        )

        // @ts-ignore
        bridgedToken = await BridgedTokenContract.deployFrom0xArtifactAsync(
            getContractArtifact('BridgedTokenContract'), pe, txDefaults,
        )
    });


    describe('escrow', async () => {

        

        it('passes on an event that has occurred', async () => {
            let _token = bridgedToken.address;
            let _receiver = user;
            let _amount = new BigNumber('10');
            let _chainId = chainId;
            let _salt = salt;
            let _targetBridge = await bridgeForeign.address

            await web3.awaitTransactionSuccessAsync(
                await bridgedToken.mint.sendTransactionAsync(user, new BigNumber('10000000'))
            )
            await web3.awaitTransactionSuccessAsync(
                await bridgedToken.approve.sendTransactionAsync(bridgeOrigin.address, _amount)
            )

            let bridgeOrigin_sub = getEthersContract(bridgeOrigin);
            let TokensBridged_ev = new Promise<string>((res,rej) => {
                bridgeOrigin_sub.once('TokensBridged', (eventHash) => {
                    res(eventHash)
                })
                setTimeout(rej, 2000)
            })

            let eventEmitterAddr = await bridgeOrigin.eventEmitter.callAsync()
            expect(eventEmitterAddr).to.eq(eventEmitter.address)

            await bridgeOrigin.bridge.sendTransactionAsync(
                _targetBridge, 
                _token, 
                _receiver, _amount, _chainId, _salt,
            )

            let TokensBridged_evHash = await TokensBridged_ev

            expect(
                await eventEmitter.events.callAsync(toBN(0))
            ).to.eq(TokensBridged_evHash)

            
            expect(
                await bridgeOrigin._getTokensBridgedEventHash.callAsync(
                    _targetBridge, _receiver, _token, _amount, _chainId, _salt
                )
            ).to.eq(TokensBridged_evHash)

            expect(
                await bridgeForeign._getTokensBridgedEventHash.callAsync(
                    _targetBridge, _receiver, _token, _amount, _chainId, _salt
                )
            ).to.eq(TokensBridged_evHash)
            
            
            
            let state = new MockCrosschainState()
            
            let origin = new MockEthereumChainStateGadget()
            origin.addEvent(TokensBridged_evHash)
            // origin.updateCurrentRoot(
            //     (await eventListener.interchainStateRoot.callAsync())
            // )
            
            let misc = new MockChainStateGadget()
            misc.setState('123')
            
            state.put(eventListener.address, origin)
            state.put('misc', misc)
            
            state.compute()

            let update = state.proveUpdate(eventListener.address)
            
            let eventListener_sub = getEthersContract(eventListener);
            let StateRootUpdated_ev = new Promise<string>((res,rej) => {
                eventListener_sub.once(EventListenerEvents.StateRootUpdated, (root) => {
                    res(root)
                })
                setTimeout(rej, 2000)
            })

            await EventListenerWrapper.updateStateRoot(
                eventListener, 
                update.proof, 
                update.leaf as EthereumStateLeaf
            )

            let StateRootUpdated_stateroot = await StateRootUpdated_ev;

            expect(StateRootUpdated_stateroot).to.eq(state.root)

            let { rootProof, eventProof} = state.proveEvent(eventListener.address, TokensBridged_evHash)
            let _proof = rootProof.proofs.map(hexify)
            let _proofPaths = rootProof.paths
            let _interchainStateRoot = hexify(rootProof.root)
            let _eventsProof = eventProof.proofs.map(hexify)
            let _eventsPaths = eventProof.paths
            let _eventsRoot = hexify(eventProof.root)


            expect(
                await bridgeForeign.eventListener.callAsync()
            ).to.eq(eventListener.address)
            expect(
                await bridgeOrigin.eventListener.callAsync()
            ).to.eq(eventListener.address)

            expect(
                await bridgeForeign.eventEmitter.callAsync()
            ).to.eq(eventEmitter.address)
            expect(
                await bridgeOrigin.eventEmitter.callAsync()
            ).to.eq(eventEmitter.address)



            expect(_eventsRoot).to.eq(
                (await eventEmitter.getEventsRoot.callAsync())
            )
            expect(_interchainStateRoot).to.eq(
                (await eventListener.interchainStateRoot.callAsync())
            )
            
            await bridgeForeign.claim.sendTransactionAsync(
                _token, _receiver, _amount, _chainId, _salt, 

                _proof, _proofPaths, _interchainStateRoot, 
                _eventsProof, _eventsPaths, _eventsRoot,
                TokensBridged_evHash
            )
            
            
            

            
            
            // check an event has been emitted

            // await bridgeForeign.claim.sendTransactionAsync(
            //     _token, 
            //     _receiver, 
            //     _amount, 
            //     _chainId, 
            //     _salt, 
            //     _proof, _proofPaths, _interchainStateRoot, _eventsProof, _eventsPaths, _eventsRoot
            // )

        })

    })

    
    teardown(() => {
        pe.stop();
    })
    
})

class EventListenerWrapper {
    static updateStateRoot(eventListener: EventListenerContract, proof: MerkleTreeProof, leaf: EthereumStateLeaf) {
        return eventListener.updateStateRoot.sendTransactionAsync(
            proof.proofs.map(hexify), 
            proof.paths, 
            hexify(proof.root),
            hexify(leaf.eventsRoot)
        )
    }
}


// Holds state (events) in a merkle tree and creates proofs of events
abstract class StateGadget {
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

class MockEthereumChainStateGadget extends StateGadget {
    events: Buffer[] = [];
    eventsTree: MerkleTree;
    root: Buffer;

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
        leaf.eventsRoot = this.eventsTree.root()
        return leaf
    }

    proveEvent(eventHash: string): MerkleTreeProof {
        let idx = this.eventsTree.findLeafIndex(dehexify(eventHash))
        if(idx === -1) throw new Error(`no event ${eventHash}`)
        return this.eventsTree.generateProof(idx)
    }
}


class MockCrosschainState {
    chains: {
        [id: string]: StateGadget
    } = {};
    tree: MerkleTree;
    leaves: AbstractChainStateLeaf[] = [];
    leafIdx: {
        [id: string]: number
    } = {};

    get root(): string {
        return hexify(this.tree.root())
    }

    put(chainId: string, state: StateGadget) {
        this.chains[chainId] = state
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