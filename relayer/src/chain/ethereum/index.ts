import Web3 from "web3";
import { ethers } from 'ethers';

import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { ChainTracker, EventEmittedEvent } from "../tracker";

import { EventEmitterContract, EventEmitterEvents } from '../../../../contracts/build/wrappers/event_emitter';
import { EventListenerContract } from '../../../../contracts/build/wrappers/event_listener';
import { hexify, dehexify } from "../../utils";
import { MerkleTree } from "../../../../ts-merkle-tree/src";

// @ts-ignore
import { keccak256 } from 'ethereumjs-util';

const AbiCoder = require('web3-eth-abi').AbiCoder();

type hex = string;
export class EthereumChainTracker extends ChainTracker {
    conf: any;

    pe: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    web3;
    ethersProvider: ethers.providers.Provider;

    eventListenerContract: EventListenerContract;

    interchainStateRoot: Buffer;
    ackdEventsRoot: Buffer;

    pendingEvents: Buffer[] = [];

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
            this.logger.error(ex)
            throw ex;
        }

        

        this.web3Wrapper = new Web3Wrapper(this.pe);
        let accounts = await this.web3Wrapper.getAvailableAddressesAsync();
        let account = accounts[0];

        let ethersProvider = new ethers.providers.JsonRpcProvider(this.conf.rpcUrl);
        ethersProvider.polling = true;
        ethersProvider.pollingInterval = 1000;
        this.ethersProvider = ethersProvider;



        let eventListenerContract = new EventListenerContract(
            require('../../../../contracts/build/contracts/EventListener.json').abi,
            this.conf.eventListenerAddress,
            this.pe,
            { from: account }
        )
        this.eventListenerContract = eventListenerContract;

        this.interchainStateRoot = dehexify(
            (await this.eventListenerContract.interchainStateRoot.callAsync())
        )

        // TODO populate from EventEmitter.pendingEvents when ready
        this.pendingEvents = [];
        this.ackdEventsRoot = dehexify(
            (await this.eventListenerContract.ackdEventsRoot.callAsync())
        )
        // this.ackdEventsRoot = dehexify('0000000000000000000000000000000000000000000000000000000000000000');

        
        let blockNum = await ethersProvider.getBlockNumber()
        // let lastBlock = await ethersProvider.getBlock(blockNum)
        // this.lastBlockIndex = blockNum;
        // this.lastBlockhash = lastBlock.hash
        // this.lastBlockTimestamp = lastBlock.timestamp;

        this.logger.info(`Sync'd to block #${blockNum}`)
        this.logger.info(`stateRoot = ${this.interchainStateRoot.toString('hex')}`)
        this.logger.info(`ackedEventsRoot = ${this.ackdEventsRoot.toString('hex')}`)
        this.logger.info(`${this.pendingEvents.length} pending events`)

        // ethersProvider.resetEventsBlock(this.lastBlock);
        // ethersProvider.resetEventsBlock(0);
            
        this.events.on('eventEmitted', (ev: EventEmittedEvent) => {
            // this.lastBlockIndex = +ev.newChainIndex;
            // this.lastBlockhash = ev.newChainRoot;
            // this.lastStateRoot = dehexify(ev.newChainRoot);
            this.pendingEvents.push(dehexify(ev.eventHash));
        })
            
        return;
    }

    listen() {
        this.logger.info(`listening to events on ${this.conf.eventEmitterAddress}`)
        let eventEmitterContract = new ethers.Contract(
            this.conf.eventEmitterAddress,
            require('../../../../contracts/build/contracts/EventEmitter.json').abi,
            this.ethersProvider
        )

        eventEmitterContract.on(EventEmitterEvents.EventEmitted, async (origin: string, eventHash: string, ev: ethers.Event) => {
            this.logger.info(`event emitted - ${eventHash}`)
            this.events.emit(
                'eventEmitted', 
                { 
                    eventHash, chainRoot: ev.blockHash, chainRootIndex: ev.blockNumber, 
                    chainTimestamp: (await ev.getBlock()).timestamp 
                }
            );
        })
    }

    getEventsRoot(): Buffer {
        if(this.pendingEvents.length) {
            let eventsTree = new MerkleTree(this.pendingEvents, keccak256);
            return eventsTree.root();
        } else {
            return this.ackdEventsRoot;
        }
    }
    
    getStateLeafItems(): Buffer[] {
        return [
            this.interchainStateRoot,
            this.getEventsRoot()
        ]
    }

    computeStateLeaf(): Buffer {
        let items = this.getStateLeafItems()
        let itemsBuf: Buffer[] = [
            ...items.map(item => AbiCoder.encodeParameter('uint256', item))
        ].map(item => item.slice(2)).map(item => Buffer.from(item, 'hex'))
        return Buffer.concat(itemsBuf)
    }

    async updateStateRoot(proof: Buffer[], newInterchainStateRoot: Buffer): Promise<any> {
        let items = this.getStateLeafItems()
        let itemArgs: string[] = items.map(item => AbiCoder.encodeParameter('uint256', item))
        
        return this.eventListenerContract.updateStateRoot.sendTransactionAsync(
            proof.map(hexify), 
            hexify(newInterchainStateRoot), 
            itemArgs[0],
            itemArgs[1]
        )
    }

    async stop() {
        this.pe.stop();
    }
}

// class EthereumStateUpdater {
//     chain: IChain;

    // lastStateRoot: Buffer;
    // lastStateRootUpdated: Buffer;

//     eventListenerContract: EventListenerContract;

//     constructor(chain: IChain, eventListenerContract: EventListenerContract) {
//         this.chain = chain;
//     }

    // async updateStateRoot(proof: Buffer[], newStateRoot: Buffer): Promise<any> {
    //     return this.eventListenerContract.updateStateRoot.sendTransactionAsync(
    //         proof, newStateRoot, this.lastStateRoot, this.lastStateRootUpdated
    //     )
    // }

// }