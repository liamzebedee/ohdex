import chai, { expect, should } from 'chai';
import { describe, it, setup, teardown } from 'mocha';

import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
import 'mocha';

import {
    MainBankContract
} from '../build/wrappers/main_bank';

import {
    WrapperTokenContract
} from '../build/wrappers/wrapper_token';

import {
    AltbankContract
} from '../build/wrappers/altbank';

import {
    AltTokenContract
} from '../build/wrappers/alt_token';


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

describe('hecticism', () => {
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

    it('does the job', async () => {
        // @ts-ignore
        let altToken = await AltTokenContract.deployAsync(...getDeployArgs('AltToken', pe, user));
        
        // @ts-ignore
        let altBank = await AltbankContract.deployAsync(
            ...getDeployArgs('Altbank', pe, user),
            altToken.address
        );
        
        // @ts-ignore
        let wrapperToken = await WrapperTokenContract.deployAsync(
            ...getDeployArgs('WrapperToken', pe, user),
        )
        
        // @ts-ignore
        let mainBank = await MainBankContract.deployAsync(
            ...getDeployArgs('MainBank', pe, user),
            wrapperToken.address
        )




        await altToken.mint2.sendTransactionAsync(user, new BigNumber(2000));

        const DEPOSIT_AMT = new BigNumber(2000);
        const SECRET = "0x123abc";
        let commit = await altBank.computeCommit.callAsync(DEPOSIT_AMT, SECRET);
        // console.log(commit)

        await altBank.makeEscrow.sendTransactionAsync(
            new BigNumber(2000), 
            commit
        );

        // user sends tx to relayer
        // relayer constructs proof and updates main and altchain contracts
        
    })

    teardown(() => {
        pe.stop();
    })
    
    /*
    
    // Start
    
    // user exchanges intent to mint with relay and signs transaction to commit

    // user commits to mainchain their intent to mint
    // relayer commits to mainchain intent to accept deposit
    // user deposits with H(commit to accept deposit)
    // relayer reveals, and claims deposits
        // logic: H(deposit claim commitment, H(reveal_addr, reveal_amount,)) == 
    // 

    // the mechanism which keeps balances true
    // is the escrow of the user only unlocks if the commitment is to the exact amount stated
    // which is encoded in the smart contract
    // the tx can thus be encoded in a ZKP, since the commitment is part of verifying the logic
    // and thus the smart contract on the other chain, built with the same ZKP verifier
    // will also encode this logic
    // the last issue is of whether the money will actually be claimed on one chain
    // in which case
    // this is left out of the scope of this demo
    // but basically
    // the money is automatically claimed when updating the bridge smart contract
    // and there are parameters set
    // such that the oracles update the state roots of each blockchain
    // otherwise the user would not be able to redeem their funds
    // whether they make a deposit or a withdrawal
    


    // mainchain updates root
    // altchain  updates root
    
    
    let secret = "secret"
    let commit = sha256(secret)
    altBank.escrowDeposit(2000, commit);
    
    // you make a deposit with a commit
    // the commit must be on the mainchain for you to claim it
    // the mainchain must assure the event has happened
    
    
    
    
    // user reveals as zk tx
    // relayers submit new proof to altbank
    // altbank officially takes the deposit
    altBank.keepDeposit(user, secret)
    
    
    // user submits merkle proof to the mainchain bank
    // merkle proof used to mint new tokens
    mainBank.mint(merkleProof, amount, token)
    
    
    // another user later wants to convert back
    mainBank.escrowBurn(amount, commit)
    
    relayer.postTx({
        secret
    })
    
    mainBank.burn(user, secret)
    
    
    
    altBank.withdraw({
        amount
    })
    

*/

})

