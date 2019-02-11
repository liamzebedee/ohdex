import Web3 from "web3";
import { ethers } from 'ethers';

import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { ChainTracker, EventEmittedEvent } from "../tracker";

import { EventEmitterContract, EventEmitterEvents } from '../../../../contracts/build/wrappers/event_emitter';
const AbiCoder = require('web3-eth-abi').AbiCoder();

export class EthereumChainTracker extends ChainTracker {
    conf: any;

    lastBlockhash: string;
    lastBlockIndex: number;
    lastBlockTimestamp: number;

    pe: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    web3;

    constructor(conf: any) {
        super(`Ethereum (chainId=${conf.chainId})`);
        this.conf = conf;
    }

    async start() {
        this.logger.info('Connecting')

        this.pe = new Web3ProviderEngine();
        // pe.addProvider(new PrivateKeyWalletSubprovider(privateKey));
        this.pe.addProvider(new RPCSubprovider(this.conf.rpcUrl));
        // @ts-ignore
        // this.pe.addProvider(
            
        //     new Web3.providers.WebsocketProvider(`ws://localhost:${this.conf.port}`)
        // )
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
        // this.web3 = new Web3(this.pe as any);


        // accounts = await web3.getAvailableAddressesAsync();
        // account = accounts[0];

        // With 0x.js
        // let eventEmitter = new EventEmitterContract(
        //     require('../../../../contracts/build/contracts/EventEmitter.json').abi,
        //     this.conf.eventEmitterAddress,
        //     this.pe
        // );

        // With Web3.js
        // let eventEmitter = new this.web3.eth.Contract(
        //     require('../../../../contracts/build/contracts/EventEmitter.json').abi,
        //     this.conf.eventEmitterAddress
        // );

        // With ethers.js
        // let ethersProvider = new ethers.providers.Web3Provider(this.pe);
        let ethersProvider = new ethers.providers.JsonRpcProvider(this.conf.rpcUrl);
        ethersProvider.polling = true;
        ethersProvider.pollingInterval = 1000;
        // let randomWallet = ethers.Wallet.createRandom();
        
        // let ethersProvider = new ethers.providers.WebSocketProvider(this.conf.port);
        // let ethersProvider = new ethers.providers.Web3Provider(
        //     // @ts-ignore
        //     // new Web3.providers.WebsocketProvider(`ws://localhost:${this.conf.port}`)
        //     // pe
        // )

        let blockNum = await ethersProvider.getBlockNumber()
        this.lastBlockIndex = blockNum;
        let lastBlock = await ethersProvider.getBlock(blockNum)
        this.lastBlockhash = lastBlock.hash
        this.lastBlockTimestamp = lastBlock.timestamp ;

        this.logger.info(`Sync'd to block #${blockNum}`)

        this.logger.info(`listening to events on ${this.conf.eventEmitterAddress}`)
        let eventEmitterContract = new ethers.Contract(
            this.conf.eventEmitterAddress,
            require('../../../../contracts/build/contracts/EventEmitter.json').abi,
            // require('../../../../contracts/build/contracts/EventEmitter.json').bytecode,
            ethersProvider
        )

        // ethersProvider.resetEventsBlock(this.lastBlock);
        // ethersProvider.resetEventsBlock(0);
        
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
            
        this.events.on('eventEmitted', (ev: EventEmittedEvent) => {
            this.lastBlockIndex = +ev.newChainIndex;
            this.lastBlockhash = ev.newChainRoot;
        })
            
        return;
    }

    computeStateLeaf(): Buffer {
        let items = [
            this.lastBlockhash,
            this.lastBlockTimestamp
        ]
        let itemsBuf: Buffer[] = [
            ...items.map(item => AbiCoder.encodeParameter('uint256', item))
        ].map(item => item.slice(2)).map(item => Buffer.from(item, 'hex'))
        return Buffer.concat(itemsBuf)
    }

    async stop() {
        this.pe.stop();
    }
}