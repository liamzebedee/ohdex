import { ethers } from 'ethers';

import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { ChainTracker, EventEmittedEvent, MessageSentEvent } from "../tracker";

import { EventEmitterContract, EventEmitterEvents } from '@ohdex/contracts/build/wrappers/event_emitter';
import { EventListenerContract, EventListenerEvents } from '@ohdex/contracts/build/wrappers/event_listener';
import { ITokenBridgeEvents, ITokenBridgeEventArgs, ITokenBridgeContract } from '@ohdex/contracts/build/wrappers/i_token_bridge';
import { BridgeEvents, BridgeContract } from '@ohdex/contracts/build/wrappers/bridge';
import { EscrowEvents, EscrowContract } from '@ohdex/contracts/build/wrappers/escrow';
import { hexify, dehexify, shortToLongBridgeId } from "../../utils";

import { MerkleTree, MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";


// @ts-ignore
import { keccak256 } from 'ethereumjs-util';
import { EtherscanProvider } from "ethers/providers";
import { BaseContract } from "@0x/base-contract";
import { CrosschainState, ChainStateLeaf } from "../../interchain";
import { EthereumStateGadget, EthereumStateLeaf } from "./state";


const AbiCoder = require('web3-eth-abi').AbiCoder();
import Event from 'events'


type hex = string;

type BridgeContractHandlerMethod = () => string;


export class EthereumChainTracker extends ChainTracker {
    conf: any;

    pe: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    web3;
    ethersProvider: ethers.providers.Provider;


    // eventEmitterContract: EventEmitterContract;
    eventEmitter_web3: any;
    eventEmitter_sub: ethers.Contract;

    eventListener: EventListenerContract;
    eventListener_sub: ethers.Contract;
    interchainStateRoot: Buffer;


    bridgeContract: BridgeContract;
    bridgeContract_sub: ethers.Contract;
    escrowContract: EscrowContract;
    escrowContract_sub: ethers.Contract;
    pendingTokenBridgingEvs: MessageSentEvent[] = [];

    
    account: string;


    state: EthereumStateGadget;

    constructor(conf: any) {
        super(`Ethereum (chainId=${conf.chainId})`);
        this.conf = conf;
    }

    async start() {
        this.logger.info('Connecting')

        this.pe = new Web3ProviderEngine();
        this.pe.addProvider(new PrivateKeyWalletSubprovider("13d14e5f958796529e84827f6a62d8e19375019f8cf0110484bcef39c023edcc"));
        this.pe.addProvider(new RPCSubprovider(this.conf.rpcUrl));
        this.pe.start()

        this.pe.on('error', () => {
            this.logger.error(`Can't connect to endpoint`)
        })

        const CONNECT_TIMEOUT = 7000;
        let connected = new Promise((res, rej) => {
            this.pe.on('block', res)
            setTimeout(
                _ => {
                    rej(new Error(`Web3.js couldn't connect after ${CONNECT_TIMEOUT}ms`))
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
        await new Promise((res, rej) => {
            ethersProvider.on('block', res);
            setTimeout(
                _ => {
                    rej(new Error(`Ethers.js couldn't connect after ${CONNECT_TIMEOUT}ms`))
                }, 
                CONNECT_TIMEOUT
            )
        })
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
            require('@ohdex/contracts/build/artifacts/EventListener.json').compilerOutput.abi,
            this.conf.eventListenerAddress,
            this.pe,
            { from: this.account }
        );
        this.eventListener_sub = new ethers.Contract(
            this.conf.eventListenerAddress,
            require('@ohdex/contracts/build/artifacts/EventListener.json').compilerOutput.abi,
            this.ethersProvider
        )

        this.state = new EthereumStateGadget(`${this.conf.chainId}-${this.eventListener.address}`)

        this.eventEmitter_sub = new ethers.Contract(
            this.conf.eventEmitterAddress,
            require('@ohdex/contracts/build/artifacts/EventEmitter.json').compilerOutput.abi,
            this.ethersProvider
        )
        // this.eventEmitter_web3 = new this.web3.eth.Contract(
        //     require('@ohdex/contracts/build/artifacts/EventEmitter.json').compilerOutput.abi, 
        //     this.conf.eventEmitterAddress, 
        //     { from: account }
        // )


        this.bridgeContract = new BridgeContract(
            require('@ohdex/contracts/build/artifacts/Bridge.json').compilerOutput.abi,
            this.conf.bridgeAddress,
            this.pe,
            { from: account }
        )
        this.escrowContract = new EscrowContract(
            require('@ohdex/contracts/build/artifacts/Escrow.json').compilerOutput.abi,
            this.conf.escrowAddress,
            this.pe,
            { from: account }
        )

        this.bridgeContract_sub = new ethers.Contract(
            this.conf.bridgeAddress,
            require('@ohdex/contracts/build/artifacts/Bridge.json').compilerOutput.abi,
            this.ethersProvider
        )
        this.escrowContract_sub = new ethers.Contract(
            this.conf.escrowAddress,
            require('@ohdex/contracts/build/artifacts/Escrow.json').compilerOutput.abi,
            this.ethersProvider
        )


        await this.loadStateAndEvents()

        this.logger.info(`Sync'd to block #${blockNum}, ${this.state.events.length} pending events`)
        this.logger.info(`stateRoot = ${this.interchainStateRoot.toString('hex')}`)
        this.logger.info(`eventsRoot = ${this.state.root.toString('hex')}`)

        
        
        this.logger.info("Bridges:")
        // this.bridgeIds.map(id => {
            
        //     this.logger.info(`\t${id}`)
        // })
        this.logger.info(`\t${this.bridgeContract.address}`)
        this.logger.info(`\t${this.escrowContract.address}`)


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
            this.state.addEvent(eventHash)
        }

        this.interchainStateRoot = interchainStateRoot;
        // this.eventsEmitted = eventsEmitted;
        
        // Ack any pending events
        if(this.state.events.length) {
            // this.eventsTree = new MerkleTree(this.eventsEmitted, keccak256);
            

            // then get all the previous token bridge events
            const getPreviousBridgeEvents = async (contract_sub) => {
                const TokensBridged = contract_sub.filters.TokensBridged();
                const logs = await this.ethersProvider.getLogs({
                    fromBlock: 0,
                    toBlock: "latest",
                    address: contract_sub.address,
                    topics: TokensBridged.topics
                });
        
                const fakeEthersEvent = {};
                
                for (const log of logs) {
                    let decoded = contract_sub.interface.events.TokensBridged.decode(log.data, log.topics)
                    // this.onTokensBridgedEvent()
                    // console.log(log)
                    
                    // let data: ITokenBridgeEventArgs = {
                    //     eventHash, targetBridge, chainId, receiver, token, amount, _salt
                    // }
                    let data = decoded;
            
                    let tokensBridgedEv: MessageSentEvent = {
                        fromChain: this.state.getId(),
                        data,
                        toBridge: data.targetBridge,
                        eventHash: data.eventHash
                    };
                    this.events.emit('ITokenBridge.TokensBridgedEvent', tokensBridgedEv);

                    // this.onTokensBridgedEvent.call(this, decoded.push(fakeEthersEvent))
                }

            }

            await getPreviousBridgeEvents(this.bridgeContract_sub)
            await getPreviousBridgeEvents(this.escrowContract_sub)
            // TODO

            // let eventEmittedEvent: EventEmittedEvent = {
            //     eventHash: '',
            //     newChainRoot: '',
            //     newChainIndex: ''
            // }
            // this.events.emit('EventEmitter.EventEmitted', eventEmittedEvent);
        }
        
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
        this.bridgeContract_sub.on(BridgeEvents.TokensBridged, this.onTokensBridgedEvent.bind(this))
        this.escrowContract_sub.on(EscrowEvents.TokensBridged, this.onTokensBridgedEvent.bind(this)) 
    }

    private async onStateRootUpdated(root: string, ev: ethers.Event) {
        this.events.emit('StateRootUpdated');
        this.logger.info(`state root updated - ${root}`)
        this.interchainStateRoot = dehexify(root);
    }

    async processBridgeEvents(
        crosschainState: CrosschainState
    ) {
        // process all events
        try {
            // Now process any events on this bridge for the user
            for(let ev of this.pendingTokenBridgingEvs) {
                // if(!interchainState.isEventAcknowledged(ev.fromChain, ev.eventHash)) {
                //     this.logger.info(`Skipping ${ev.eventHash}, not ack'd yet on this chain`)
                //     return
                // }
                let { rootProof, eventProof} = crosschainState.proveEvent(ev.fromChain, ev.eventHash)
                let _proof = rootProof.proofs.map(hexify)
                let _proofPaths = rootProof.paths
                let _interchainStateRoot = hexify(rootProof.root)
                let _eventsProof = eventProof.proofs.map(hexify)
                let _eventsPaths = eventProof.paths
                let _eventsRoot = hexify(eventProof.root)


                // if(ev.toBridge == await this.escrowContract.tokenBridgeId.callAsync()) {
                if(ev.toBridge == shortToLongBridgeId(this.escrowContract.address)) {
                    await this.web3Wrapper.awaitTransactionSuccessAsync(
                        await this.escrowContract.claim.sendTransactionAsync(
                            ev.data.token, 
                            ev.data.receiver, 
                            ev.data.amount, 
                            ev.data.chainId, 
                            ev.data._salt, 
                            _proof, 
                            _proofPaths, 
                            _interchainStateRoot, 
                            _eventsProof, 
                            _eventsPaths, 
                            _eventsRoot,
                            { from: this.account }
                        )
                    );
                    this.logger.info(`bridged ev: ${ev.eventHash} for bridge ${ev.toBridge}`)
                    this.pendingTokenBridgingEvs.pop()
                }
                else if(ev.toBridge == shortToLongBridgeId(this.bridgeContract.address)) {
                // else if(ev.toBridge == await this.bridgeContract.tokenBridgeId.callAsync()) {
                    await this.web3Wrapper.awaitTransactionSuccessAsync(
                        await this.bridgeContract.claim.sendTransactionAsync(
                            ev.data.token, 
                            ev.data.receiver, 
                            ev.data.amount, 
                            ev.data.chainId, 
                            ev.data._salt, 
                            _proof, 
                            _proofPaths, 
                            _interchainStateRoot, 
                            _eventsProof, 
                            _eventsPaths, 
                            _eventsRoot,
                            ev.eventHash,
                            { from: this.account }
                        )
                    );
                    this.logger.info(`bridged ev: ${ev.eventHash} for bridge ${ev.toBridge}`)
                    this.pendingTokenBridgingEvs.pop()
                } else {
                    this.logger.error(`couldn't find bridge ${ev.toBridge} for event ${ev.eventHash}`)
                }
            }
        } catch(ex) {
            this.logger.error(`failed to do bridging`)
            this.logger.error(ex)
        }
    }

    private async onEventEmitted(eventHash: string, ev: ethers.Event) {
        this.logger.info(`block #${ev.blockNumber}, event emitted - ${eventHash}`)
        this.state.addEvent(eventHash)
        // 0x809375b783A8207e0430107d820C9AB5Fd94254E

        let eventEmittedEvent: EventEmittedEvent = { 
            eventHash,
            newChainRoot: ev.blockHash,
            newChainIndex: ''+ev.blockNumber
        }
        this.events.emit('EventEmitter.EventEmitted', eventEmittedEvent);
    }

    private onTokensBridgedEvent() {
        // console.log(arguments)
        let args = Array.from(arguments)
        // args.pop()
        let ev = Array.from(arguments).pop() as ethers.Event;
        
        let [ eventHash, targetBridge, chainId, receiver, token, amount, _salt ] = args;
        let data: ITokenBridgeEventArgs = {
            eventHash, targetBridge, chainId, receiver, token, amount, _salt
        }
        // this.logger.info(
        //     JSON.stringify(data))

        let tokensBridgedEv: MessageSentEvent = {
            data,
            fromChain: this.state.getId(),
            toBridge: shortToLongBridgeId(data.targetBridge),
            eventHash
        };
        this.events.emit('ITokenBridge.TokensBridgedEvent', tokensBridgedEv);
    }

    
    get bridgeIds(): string[] {
        return [
            shortToLongBridgeId(this.escrowContract.address),
            shortToLongBridgeId(this.bridgeContract.address)
        ]
    }

    // Listen for the original events from other chains
    // and add them to our pending queue here
    async receiveCrosschainMessage(tokensBridgedEv: MessageSentEvent): Promise<boolean> {
        this.logger.info(JSON.stringify(tokensBridgedEv))
        // if(
        //     tokensBridgedEv.toBridge == await this.escrowContract.tokenBridgeId.callAsync() || 
        //     tokensBridgedEv.toBridge == await this.bridgeContract.tokenBridgeId.callAsync())
        if(this.bridgeIds.includes(tokensBridgedEv.toBridge))
        {
            this.logger.info(`Received ${tokensBridgedEv.eventHash} from chain ${tokensBridgedEv.fromChain}`)
            this.pendingTokenBridgingEvs.push(tokensBridgedEv)
            return true;
        }
        return false;
    }

    

    async updateStateRoot(
        proof: MerkleTreeProof, leaf: ChainStateLeaf
    ): Promise<any> 
    {
        try {
            await EventListenerWrapper.updateStateRoot(this.eventListener, proof, leaf as EthereumStateLeaf)
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

