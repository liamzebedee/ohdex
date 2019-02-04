import Web3 from "web3";
import { ethers } from 'ethers';

import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { ChainTracker } from "../tracker";

import { EventEmitterContract, EventEmitterEvents } from '../../../../contracts/build/wrappers/event_emitter';

export class EthereumChainTracker extends ChainTracker {
    conf: any;

    lastBlock: number;

    pe: Web3ProviderEngine;
    web3Wrapper: Web3Wrapper;
    web3;

    constructor(conf: any) {
        super("Ethereum");
        this.conf = conf;

        this.lastBlock = 0;
    }

    async start() {
        this.logger.info('Connecting')

        this.pe = new Web3ProviderEngine();
        // pe.addProvider(new PrivateKeyWalletSubprovider(privateKey));
        this.pe.addProvider(new RPCSubprovider(this.conf.rpcUrl));
        this.pe.start()

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
        // let ethersProvider = new ethers.providers.JsonRpcProvider(this.conf.rpcUrl);
        console.log(this.conf.rpcUrl)
        // let randomWallet = ethers.Wallet.createRandom();
        let ethersProvider = new ethers.providers.JsonRpcProvider(this.conf.rpcUrl);

        let eventEmitter = new ethers.Contract(
                this.conf.eventEmitterAddress,
                require('../../../../contracts/build/contracts/EventEmitter.json').abi,
                // require('../../../../contracts/build/contracts/EventEmitter.json').bytecode,
                ethersProvider
            )
            .attach(this.conf.eventEmitterAddress);

        ethersProvider.resetEventsBlock(this.lastBlockHash);
        
        eventEmitter.on(EventEmitterEvents.EventEmitted, function(origin: string, eventHash: string, ev: any) {
            console.log(arguments)
        })
    }

    async stop() {
        this.pe.stop();
    }
}