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
            tracker.events.prependListener('newStateRoot', () => { 
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