import chai, { expect, should } from 'chai';
import { describe, it, setup, teardown } from 'mocha';
import { keccak256, bufferToHex } from 'ethereumjs-util';

import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';

import {
    EventListenerContract
} from '../build/wrappers/event_listener';

import MerkleTree from "./helpers/MerkleTree";

import { Web3ProviderEngine, RPCSubprovider, BigNumber } from "0x.js";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';


function getDeployArgs(name, pe, from): [ string, AbiDefinition[],  Provider, Partial<TxData>] {
    let json = require(`../build/contracts/${name}.json`);
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

describe('EventListener', () => {
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

    it('It should work', async () => {
        // @ts-ignore
        let eventListener = await EventListenerContract.deployAsync(...getDeployArgs('EventListener', pe, user));

        let elements = ['a', 'b', 'c'];

        const merkleTree = new MerkleTree(elements);

        const root = merkleTree.getHexRoot();
        const proof = merkleTree.getHexProof(elements[0]);
        const leaf = bufferToHex(keccak256(elements[0]));

        await eventListener.updateProof.sendTransactionAsync(new BigNumber(0), root);
        
        const latestProof = await eventListener.getLatestProof.callAsync(new BigNumber(0));

        expect(root).to.equal(latestProof);

        const verifyResult = await eventListener.checkEvent.callAsync(new BigNumber(0), new BigNumber(0), proof, leaf); 
        
        expect(verifyResult).to.equal(true);
    })

    

    

    teardown(() => {
        pe.stop();
    })
    
})