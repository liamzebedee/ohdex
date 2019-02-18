import { EthereumChainTracker } from "../src/chain/ethereum";
import { Web3ProviderEngine, RPCSubprovider, Provider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, TxData } from "@0x/web3-wrapper";
import Web3 from 'web3';
import 'mocha';
import { expect, should, assert } from 'chai';
const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.use(require('chai-events'));
import { describe, it, setup, teardown } from 'mocha';
// chai.use(require('chai-eventemitter'))
import sinon from 'sinon'

import { EventEmitterContract, EventEmitterEvents } from "../../contracts/build/wrappers/event_emitter";
import { EventListenerContract, EventListenerEvents } from "../../contracts/build/wrappers/event_listener";

import { Relayer } from "../src/relayer";
import { promisify } from 'util'

import { AccountsConfig } from '../../multichain/lib/accounts';


// @ts-ignore
import { keccak256 } from 'ethereumjs-util';
import { ethers } from "ethers";


function getContractArtifact(name: string) {
    return require(`../../contracts/build/contracts/${name}.json`)
}
function getDeployArgs(name, pe, from): [ string, AbiDefinition[],  Provider, Partial<TxData>] {
    let json = require(`../../contracts/build/contracts/${name}.json`);
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

describe('EthereumChainTracker', function(){
    this.timeout(5000)

    let pe, web3;
    let accounts;
    let user;

    setup(async () => {
        pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider('http://127.0.0.1:9545'))
        pe.start()
        web3 = new Web3Wrapper(pe);
        accounts = await web3.getAvailableAddressesAsync();
        user = accounts[0]
    });

    it("computes event root correctly with 0 events", async() => {
        
    })
    
    it('#start', async() => {
        // @ts-ignore
        let eventEmitter = await EventEmitterContract.deployAsync(...getDeployArgs('EventEmitter', pe, user));
        
        let tracker = new EthereumChainTracker({
            rpcUrl: "http://localhost:9545",
            eventEmitterAddress: eventEmitter.address
        })

        let spy = sinon.spy();

        let called = new Promise((res, rej) => {
            tracker.events.prependListener('EventEmitter.EventEmitted', () => { 
                res()
            });
            setTimeout(() => rej(), 3000);
        })

        expect(tracker.start()).to.eventually.not.be.rejected;

        await web3.awaitTransactionMinedAsync(
            await eventEmitter.emitEvent.sendTransactionAsync("0x00")
        );  

        expect(called).to.eventually.be.fulfilled;
    })
})


interface MultichainInfo {
    pe: Web3ProviderEngine;
    web3: Web3Wrapper;
    snapshotId: number;
    config: any;
}
class MultichainProviderFactory {
    things: MultichainInfo[] = [];

    constructor() {

    }

    async connect() {
        const config = require('../../config/test_networks.json');

        await this.connect_(config['kovan'])
        await this.connect_(config['rinkeby'])
    }

    async connect_(config: any) {
        let pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(config.rpcUrl))
        pe.start()

        let web3 = new Web3Wrapper(pe);
        let snapshotId = await web3.takeSnapshotAsync()
        this.things.push({
            pe,
            web3,
            snapshotId,
            config,
        })
        console.log(`snapshot ${config.rpcUrl} at ${snapshotId}`)
        
        // accounts = await web3.getAvailableAddressesAsync();
        // user = accounts[0]
    }

    async restore() {
        return Promise.all(this.things.map((thing) => {
            let { web3, snapshotId } = thing;
            return web3.revertSnapshotAsync(snapshotId)
        }))
    }
}



describe.only('Relayer', function(){
    this.timeout(35000);

    it('updates the state root')

    let multichain: MultichainProviderFactory;
    before(async () => {
        multichain = new MultichainProviderFactory()
        await multichain.connect()
    })


    process.on('exit', async function() {
        await multichain.restore()
    })

    it('updates eventListener.stateroot', async() => {
        let accountsConf = await AccountsConfig.load('../../config/test_accounts.json')
        let testConfig = require('../../config/test_networks.json');
        
        let relayer = new Relayer(testConfig)
        await relayer.start()

        // Connect to chain 1
        let [ chain1, chain2 ] = multichain.things;

        
        let chain1Pe = new Web3ProviderEngine();
        accountsConf.providers.map(subprovider => chain1Pe.addProvider(subprovider))
        chain1Pe.addProvider(new RPCSubprovider(chain1.config.rpcUrl))
        chain1Pe.start()

        let chain1Web3 = new Web3Wrapper(chain1Pe)
        // await chain1Web3.getBalanceInWeiAsync('0x103c1c34d0f34b16babfbe205978ca9b4a0a447d')
        
        // @ts-ignore
        let eventEmitter = new EventEmitterContract(
            getContractArtifact('EventEmitter').abi,
            chain1.config.eventEmitterAddress,
            chain1Pe,
            { from: '0x103c1c34d0f34b16babfbe205978ca9b4a0a447d' }
        );
        
        // Emit the event
        let evHash = keccak256(`${new Date}`);
        
        await chain1Web3.awaitTransactionSuccessAsync(
            await eventEmitter.emitEvent.sendTransactionAsync(evHash)
        )

        await new Promise((res,rej) => setTimeout(res, 2000))
    

        // verify other chain now has new state root

        let ethersProvider = new ethers.providers.JsonRpcProvider(chain2.config.rpcUrl);
        ethersProvider.polling = true;
        ethersProvider.pollingInterval = 1000;

        let eventListener = new ethers.Contract(
            chain2.config.eventListenerAddress,
            getContractArtifact('EventListener').abi,
            ethersProvider
        )

        let stateRootUpdated = new Promise((res, rej) => {
            eventListener.on(EventListenerEvents.StateRootUpdated, async (root: string, ev: ethers.Event) => {
                // expect(root).to.eq(relayer.)
                res(root)
            })
        });


        expect(stateRootUpdated).to.eventually.be.fulfilled;
        await new Promise((res,rej) => {
            setTimeout(res, 10000)
        })

        await relayer.stop()
    })
})