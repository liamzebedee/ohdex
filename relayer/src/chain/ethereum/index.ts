import Web3 from "web3";
import { ethers } from 'ethers';

import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { ChainTracker, EventEmittedEvent, MessageSentEvent } from "../tracker";

import { EventEmitterContract, EventEmitterEvents } from '../../../../contracts/build/wrappers/event_emitter';
import { EventListenerContract, EventListenerEvents } from '../../../../contracts/build/wrappers/event_listener';
import { ITokenBridgeEvents, ITokenBridgeEventArgs, ITokenBridgeContract } from '../../../../contracts/build/wrappers/i_token_bridge';
import { BridgeEvents, BridgeContract } from '../../../../contracts/build/wrappers/bridge';
import { EscrowEvents, EscrowContract } from '../../../../contracts/build/wrappers/escrow';
import { hexify, dehexify } from "../../utils";
// import { MerkleTree, MerkleTreeProof } from "../../../../ts-merkle-tree/src";
import { MerkleTree, MerkleTreeProof } from "../../../../ts-merkle-tree/src";


// @ts-ignore
import { keccak256 } from 'ethereumjs-util';
import { EtherscanProvider } from "ethers/providers";
import { BaseContract } from "@0x/base-contract";

const AbiCoder = require('web3-eth-abi').AbiCoder();



type hex = string;
export class EthereumChainTracker extends ChainTracker {
    conf: any;

    pe: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    web3;
    ethersProvider: ethers.providers.Provider;


    // eventEmitterContract: EventEmitterContract;
    eventEmitter_web3: any;
    eventEmitter_sub: ethers.Contract;
    eventsEmitted: Buffer[] = [];
    eventsTree: MerkleTree;

    eventListener: EventListenerContract;
    eventListener_sub: ethers.Contract;
    interchainStateRoot: Buffer;


    bridgeContract: BridgeContract;
    bridgeContract_sub: ethers.Contract;
    escrowContract: EscrowContract;
    escrowContract_sub: ethers.Contract;
    pendingTokenBridgingEvs: MessageSentEvent[] = [];

    
    account: string;

    constructor(conf: any) {
        super(`Ethereum (chainId=${conf.chainId})`);
        this.conf = conf;
    }

    async start() {
        this.logger.info('Connecting')

        this.pe = new Web3ProviderEngine();
        this.pe.addProvider(new RPCSubprovider(this.conf.rpcUrl));
        this.pe.start()

        this.pe.on('error', () => {
            this.logger.error(`Can't connect to endpoint`)
        })

        const CONNECT_TIMEOUT = 1500;
        let connected = new Promise((res, rej) => {
            this.pe.on('block', res)
            setTimeout(
                _ => {
                    rej(new Error(`Couldn't connect after ${CONNECT_TIMEOUT}ms`))
                }, 
                CONNECT_TIMEOUT
            )
        });
        
        try {
            await connected;
        } catch(ex) {
            this.logger.error(`couldn't connect - `, ex)
            throw ex;
        }

        this.web3Wrapper = new Web3Wrapper(this.pe);
        let accounts = await this.web3Wrapper.getAvailableAddressesAsync();
        let account = accounts[0];
        this.account = account;

        
        let ethersProvider = new ethers.providers.JsonRpcProvider(this.conf.rpcUrl);
        ethersProvider.polling = true;
        ethersProvider.pollingInterval = 1000;
        this.ethersProvider = ethersProvider;
        
        // this.web3 = new Web3(
        //     // @ts-ignore
        //     new Web3.providers.WebsocketProvider(`ws://${this.conf.rpcUrl.split('http://')[1]}`)
        // )
        
        // this.web3 = new Web3(ethersProvider);
        
        let blockNum = await ethersProvider.getBlockNumber()
        let lastBlock = await ethersProvider.getBlock(blockNum)
        let lastBlockIndex = blockNum;
        let lastBlockhash = lastBlock.hash
        let lastBlockTimestamp = lastBlock.timestamp;



        this.eventListener = new EventListenerContract(
            require('../../../../contracts/build/contracts/EventListener.json').abi,
            this.conf.eventListenerAddress,
            this.pe,
            { from: this.account }
        );
        this.eventListener_sub = new ethers.Contract(
            this.conf.eventListenerAddress,
            require('../../../../contracts/build/contracts/EventListener.json').abi,
            this.ethersProvider
        )

        this.eventEmitter_sub = new ethers.Contract(
            this.conf.eventEmitterAddress,
            require('../../../../contracts/build/contracts/EventEmitter.json').abi,
            this.ethersProvider
        )
        // this.eventEmitter_web3 = new this.web3.eth.Contract(
        //     require('../../../../contracts/build/contracts/EventEmitter.json').abi, 
        //     this.conf.eventEmitterAddress, 
        //     { from: account }
        // )


        await this.loadStateAndEvents()

        this.logger.info(`Sync'd to block #${blockNum}, ${this.eventsEmitted.length} pending events`)
        this.logger.info(`stateRoot = ${this.interchainStateRoot.toString('hex')}`)
        this.logger.info(`eventsRoot = ${this.getEventsRoot().toString('hex')}`)

        
        this.bridgeContract = new BridgeContract(
            require('../../../../contracts/build/contracts/Bridge.json').abi,
            this.conf.bridgeAddress,
            this.pe,
            { from: account }
        )
        this.escrowContract = new EscrowContract(
            require('../../../../contracts/build/contracts/Escrow.json').abi,
            this.conf.escrowAddress,
            this.pe,
            { from: account }
        )

        this.bridgeContract_sub = new ethers.Contract(
            this.conf.bridgeAddress,
            require('../../../../contracts/build/contracts/Bridge.json').abi,
            this.ethersProvider
        )
        this.escrowContract_sub = new ethers.Contract(
            this.conf.escrowAddress,
            require('../../../../contracts/build/contracts/Escrow.json').abi,
            this.ethersProvider
        )

        return;
    }
    
    private async loadStateAndEvents() {
        // 1. Load chain's state root
        // 
        let interchainStateRoot = dehexify(
            (await this.eventListener.interchainStateRoot.callAsync())
        )

        
        // 2. Load all previously emitted events (including those that may not be ack'd on other chains yet)
        // 
        // this.ethersProvider.resetEventsBlock(0);
        const EventEmitted = this.eventEmitter_sub.filters.EventEmitted(null);
        const logs = await this.ethersProvider.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: this.eventEmitter_sub.address,
            topics: EventEmitted.topics
        });

        let eventsEmitted: Buffer[] = [];


        for (const log of logs) {
            let eventHash = log.data;
            eventsEmitted.push(dehexify(eventHash));
        }

        this.interchainStateRoot = interchainStateRoot;
        this.eventsEmitted = eventsEmitted;
        if(this.eventsEmitted.length)
            this.eventsTree = new MerkleTree(this.eventsEmitted, keccak256);
    }

    listen() {
        this.logger.info(`listening to events on ${this.conf.eventEmitterAddress}`)

        // 1) Listen to any events emitted from this chain
        this.eventEmitter_sub.on(EventEmitterEvents.EventEmitted, this.onEventEmitted.bind(this))
        // this.eventEmitter_web3.events.EventEmitted((err, ev) => {
        //     if(err) {
        //         this.logger.error(`err in event receival - ${err}`)
        //     } else {
        //         this.onEventEmitted(
        //             ev.returnValues.eventHash,
        //             ev
        //         );
        //     }
        // })

        // 2) Listen to any state root updates that happen
        this.eventListener_sub.on(EventListenerEvents.StateRootUpdated, this.onStateRootUpdated.bind(this))

        // 3) Listen to the original events of the bridge/escrow contracts
        // So we can relay them later        
        this.bridgeContract_sub.on(ITokenBridgeEvents.TokensBridged, this.onTokensBridgedEvent.bind(this))
        this.escrowContract_sub.on(ITokenBridgeEvents.TokensBridged, this.onTokensBridgedEvent.bind(this)) 
    }

    private async onStateRootUpdated(root: string, ev: ethers.Event) {
        this.logger.info(`state root updated - ${root}`)
        this.interchainStateRoot = dehexify(root);
    }

    private async onEventEmitted(eventHash: string, ev: ethers.Event) {
        this.logger.info(`block #${ev.blockNumber}, event emitted - ${eventHash}`)
        this.eventsEmitted.push(dehexify(eventHash));
        this.eventsTree = new MerkleTree(this.eventsEmitted, keccak256);

        let eventEmittedEvent: EventEmittedEvent = { 
            eventHash,
            newChainRoot: ev.blockHash,
            newChainIndex: ''+ev.blockNumber
        }
        this.events.emit('EventEmitter.EventEmitted', eventEmittedEvent);
    }

    private onTokensBridgedEvent() {
        let args = Array.from(arguments)
        args.pop()
        let ev = Array.from(arguments).pop() as ethers.Event;

        let [ eventHash, targetBridge, chainId, receiver, token, amount, _salt ] = args;
        let data: ITokenBridgeEventArgs = {
            eventHash, targetBridge, chainId, receiver, token, amount, _salt
        }

        let tokensBridgedEv: MessageSentEvent = {
            data,
            toBridge: data.targetBridge,
            eventHash,
        };
        this.events.emit('ITokenBridge.TokensBridgedEvent', tokensBridgedEv);
    }

    // Listen for the original events from other chains
    // and add them to our pending queue here
    receiveCrosschainMessage(tokensBridgedEv: MessageSentEvent): boolean {
        if(tokensBridgedEv.toBridge == this.escrowContract.address || tokensBridgedEv.toBridge == this.bridgeContract.address) {
            this.pendingTokenBridgingEvs.push(tokensBridgedEv)
            return true;
        }
        return false;
    }

    getEventsRoot(): Buffer {
        if(this.eventsEmitted.length == 0) {
            return Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
        }
        return this.eventsTree.root();
    }
    
    getStateLeaf(): StateLeaf {
        let interchainStateRoot = this.interchainStateRoot
        let eventsRoot = this.getEventsRoot();

        return {
            interchainStateRoot,
            eventsRoot,
            items: [
                interchainStateRoot,
                eventsRoot
            ],
            _leaf: Buffer.concat([
                interchainStateRoot,
                eventsRoot
            ])
        }
    }

    async updateStateRoot(proof: MerkleTreeProof, stateLeafItems: StateLeaf): Promise<any> {
        let itemArgs: string[] = stateLeafItems.items.map(item => AbiCoder.encodeParameter('bytes32', item))
        let _proofs = proof.proofs.map(hexify)
        let _paths = proof.paths;
        let _newInterchainStateRoot = hexify(proof.root);
        let [ _interchainStateRoot, _eventsRoot ] = itemArgs
        
        try {
            await this.web3Wrapper.awaitTransactionSuccessAsync(
                await this.eventListener.updateStateRoot.sendTransactionAsync(
                    _proofs,
                    _paths,
                    _newInterchainStateRoot,
                    _interchainStateRoot,
                    _eventsRoot
                )
            )
            this.interchainStateRoot = dehexify(_newInterchainStateRoot)

            // Now process any events on this bridge for the user
            for(let ev of this.pendingTokenBridgingEvs) {
                // TODO lastIndexOf is quick hack
                let evIdx = this.eventsEmitted.lastIndexOf(dehexify(ev.eventHash));

                let eventsProof = this.eventsTree.generateProof(
                    evIdx
                );
                let _eventsProof = eventsProof.proofs.map(hexify);
                let _eventsPaths = eventsProof.paths;

                if(ev.toBridge == this.escrowContract.address) {
                    await this.web3Wrapper.awaitTransactionSuccessAsync(
                        await this.escrowContract.claim.sendTransactionAsync(
                            ev.data.token, 
                            ev.data.receiver, 
                            ev.data.amount, 
                            ev.data.chainId, 
                            ev.data._salt, 
                            _proofs, 
                            _paths, 
                            _interchainStateRoot, 
                            _eventsProof, 
                            _eventsPaths, 
                            _eventsRoot
                        )
                    );
                }
                else if(ev.toBridge == this.bridgeContract.address) {
                    await this.web3Wrapper.awaitTransactionSuccessAsync(
                        await this.bridgeContract.claim.sendTransactionAsync(
                            ev.data.token, 
                            ev.data.receiver, 
                            ev.data.amount, 
                            ev.data.chainId, 
                            ev.data._salt, 
                            _proofs, 
                            _paths, 
                            _interchainStateRoot, 
                            _eventsProof, 
                            _eventsPaths, 
                            _eventsRoot
                        )
                    );
                }
            }

        } catch(err) {
            // console.log(ex)
            // if(err.code == -32000) {
            //     this.logger.error(err.data.stack)
            // }
            this.logger.error(err)
            throw err;
        }

        return;
    }

    async stop() {
        this.pe.stop();
    }
}


interface StateLeaf {
    _leaf: Buffer
    items: Buffer[]
    interchainStateRoot: Buffer
    eventsRoot: Buffer
}

export {
    StateLeaf
}