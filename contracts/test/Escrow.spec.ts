import chai, { expect, should } from 'chai';
import { describe, it, setup, teardown } from 'mocha';
import { keccak256, bufferToHex } from 'ethereumjs-util';
import Web3 from 'web3';

import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';

import {
    EventListenerContract
} from '../build/wrappers/event_listener';

import {
    EventEmitterContract,
    EventEmitterEventArgs,
    EventEmitterEvents,
    EventEmitterEventEmittedEventArgs
} from '../build/wrappers/event_emitter';

import {
    EscrowContract
}  from '../build/wrappers/escrow'

import {
    ERC20MintableContract
}   from '../build/wrappers/erc20_mintable'

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

describe('Escrow', () => {
    let pe, web3, web3V;
    let accounts;
    let user;

    setup(async () => {
        pe = new Web3ProviderEngine();
        pe.addProvider(new RPCSubprovider('http://127.0.0.1:9545'))
        pe.start()
        web3 = new Web3Wrapper(pe);
        web3V = new Web3(pe);
        accounts = await web3.getAvailableAddressesAsync();
        user = accounts[0]
    });

    it('It should work', async () => {

        const chainAId = 0;
        const chainBId = 1;

        const salt = new BigNumber("133713371337420");

        // @ts-ignore
        let eventListenerA = await EventListenerContract.deployAsync(
            ...getDeployArgs('EventListener', pe, user))
        ;

        console.log(eventListenerA.abi);
        // let eventListenerAV = new web3V.eth.Contract({ name: "eventListenerA"}, eventListenerA.address);

        let eventEmitterA = await EventEmitterContract.deployAsync(
            ...getDeployArgs('EventEmitter', pe, user)
        );

        // @ts-ignore
        let eventListenerB = await EventListenerContract.deployAsync(
            ...getDeployArgs('EventListener', pe, user))
        ;
        let eventEmitterB = await EventEmitterContract.deployAsync(
            ...getDeployArgs('EventEmitter', pe, user)
        );

        let token = await ERC20MintableContract.deployAsync(
            ...getDeployArgs('ERC20Mintable', pe, user)
        );

        // @ts-ignore
        let escrow = await EscrowContract.deployAsync(
            ...getDeployArgs('Escrow', pe, user),
            chainAId,
            eventListenerA.address,
            eventEmitterA.address
        );

        const bridgeAmount = new BigNumber(1000);
        
        // must have some tokens to bridge
        await token.mint.sendTransactionAsync(user, bridgeAmount, {from: user});

        
        // A to B bridging process

        // allow token to be pulled by escrow
        await token.approve.sendTransactionAsync(escrow.address, bridgeAmount, {from: user});
        
        // bridge tokens
        await escrow.bridge.sendTransactionAsync(bridgeAmount, token.address, user, chainBId, salt, {from: user});
            
        // let emittedEvents = await eventListenerAV.getPastEvents("EventEmitted");

        // console.log(emittedEvents);
        

    })

    

    

    teardown(() => {
        pe.stop();
    })
    
})