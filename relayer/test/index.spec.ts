import { EthereumChainTracker } from "../src/chain/ethereum";
import { Web3ProviderEngine, RPCSubprovider, Provider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, TxData } from "@0x/web3-wrapper";
import 'mocha';
import { expect, should, assert } from 'chai';
const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.use(require('chai-events'));
import { describe, it, setup, teardown } from 'mocha';
// chai.use(require('chai-eventemitter'))
import sinon from 'sinon'

import { EventEmitterContract } from "../../contracts/build/wrappers/event_emitter";
import { Relayer } from "../src/relayer";
import { promisify } from 'util'

import { AccountsConfig } from '../../multichain/lib/accounts';


// @ts-ignore
import { keccak256 } from 'ethereumjs-util';


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
    
    it('#start', async() => {
        // @ts-ignore
        let eventEmitter = await EventEmitterContract.deployAsync(...getDeployArgs('EventEmitter', pe, user));
        
        let tracker = new EthereumChainTracker({
            rpcUrl: "http://localhost:9545",
            eventEmitterAddress: eventEmitter.address
        })

        let spy = sinon.spy();

        let called = new Promise((res, rej) => {
            tracker.events.prependListener('eventEmitted', () => { 
                console.log('root')
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

        await Promise.all([
            this.connect_(config['kovan']),
            // this.connect_(config['rinkeby'].rpcUrl)
        ])
    }

    async makeProvider(i: number): Promise<Web3ProviderEngine> {
        let thing = this.things[i]

        let pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(thing.config.rpcUrl))

        return pe;
    }

    async connect_(config: any) {
        let rpcUrl = config.rpcUrl;
        let pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(rpcUrl))
        pe.start()

        let web3 = new Web3Wrapper(pe);
        let snapshotId = await web3.takeSnapshotAsync()
        this.things.push({
            pe,
            web3,
            snapshotId,
            config,
        })
        console.log(`snapshot ${rpcUrl} at ${snapshotId}`)
        
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

    it('updates state root on other bridges', async() => {
        let multichain = new MultichainProviderFactory()
        await multichain.connect()

        let accountsConf = await AccountsConfig.load('../../config/test_accounts.json')
        let testConfig = require('../../config/test_networks.json');
        
        let relayer = new Relayer(testConfig)
        await relayer.start()

        // Connect to chain 1
        let chain1 = multichain.things[0];
        
        let chain1Pe = new Web3ProviderEngine();
        accountsConf.providers.map(subprovider => chain1Pe.addProvider(subprovider))
        chain1Pe.addProvider(new RPCSubprovider(chain1.config.rpcUrl))
        chain1Pe.start()

        let chain1Web3 = new Web3Wrapper(chain1Pe)

        console.log(await chain1Web3.getBalanceInWeiAsync('0x103c1c34d0f34b16babfbe205978ca9b4a0a447d'))
        
        // @ts-ignore
        console.log('tx to ', chain1.config.eventEmitterAddress)
        let eventEmitter = new EventEmitterContract(
            getContractArtifact('EventEmitter').abi,
            chain1.config.eventEmitterAddress,
            chain1Pe,
            { from: '0x103c1c34d0f34b16babfbe205978ca9b4a0a447d' }
        );
        
        // Emit the event
        let evHash = keccak256('123');
        
        await chain1Web3.awaitTransactionSuccessAsync(
            await eventEmitter.emitEvent.sendTransactionAsync(evHash)
        )

        await new Promise((res,rej) => setTimeout(res, 2000))

        // get the new blockhash of this chain
        // get the new state root of the other chain
        
        // relayer.chains["420"]

        await multichain.restore()
        await relayer.stop()
    })
})