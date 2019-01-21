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


import { Web3ProviderEngine, RPCSubprovider } from "0x.js";
import { NonceTrackerSubprovider } from '@0x/subproviders'
import { Web3Wrapper } from '@0x/web3-wrapper';





function getDeployArgs(name, pe, from) {
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

    before(async () => {
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
        
        await altToken.mint2(user, 2000).sendTransaction();
        
    })

    teardown(() => {
        pe.stop();
    })
    

    
    // let altBank = new AltBank(altToken.address)
    
    // let wrapperToken = new WrapperToken()
    // let mainBank = new MainBank(wrapperToken.address)
    
    /*
    
    // Start
    
    // user exchanges intent to mint with relay and signs transaction to commit
    
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

