import { EthereumChainTracker } from "../src/chain/ethereum";
import { Web3ProviderEngine, RPCSubprovider, Provider } from "0x.js";
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
import Web3 from "web3/types";


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


class MultichainProviderFactory {
    things = [];


    constructor() {

    }

    async connect() {
        const config = require('../../config/test_networks.json');

        await Promise.all([
            this.connect_(config['kovan'].rpcUrl),
            // this.connect_(config['rinkeby'].rpcUrl)
        ])
    }

    async connect_(rpcUrl: string) {
        let pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider(rpcUrl))
        pe.start()
        let web3 = new Web3Wrapper(pe);
        let snapshotId = await web3.takeSnapshotAsync()
        this.things.push({
            pe,
            web3,
            snapshotId
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
        // connect to chain A
        // connect to chain B
        let multichain = new MultichainProviderFactory()
        await multichain.connect()

        let relayer = new Relayer(require('../../config/test_networks.json'))
        await relayer.start()

        await multichain.restore()
        await relayer.stop()
        // emit a fake event on one chain
        
        // get the new blockhash of this chain
        // get the new state root of the other chain
        
        // relayer.chains["420"]
    })
})