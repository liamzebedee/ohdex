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

const snarkjs = require("snarkjs");
const compiler = require("circom");
const path = require('path')
const bigInt = snarkjs.bigInt;
const eddsa = require('../zeroknowledge/circomlib/src/eddsa');
const babyJub = require("../zeroknowledge/circomlib/src/babyjub");

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


import { SignatureType } from '@0x/types';
import * as ethUtil from 'ethereumjs-util';
import { verifySig } from '../zeroknowledge/relayer';

function makeSignature(message: Buffer, privateKey: Buffer, signatureType: SignatureType) {
    const prefixedMessage = ethUtil.hashPersonalMessage(message);
    const ecSignature = ethUtil.ecsign(prefixedMessage, privateKey);
    const signature = Buffer.concat([
        ethUtil.toBuffer(ecSignature.v),
        ecSignature.r,
        ecSignature.s,
        ethUtil.toBuffer(signatureType),
    ]);
    return signature;
}

function padLeft(string: string, toLength: number, sign="0") {
    if(string.length > toLength) {
        throw new Error(`String is larger than length we are padding it to: ${string.length} > ${toLength}\nString: ${string}`)
    }
    return string.padStart(toLength, sign)
    // console.log(chars, string.length, string)
    // return new Array(toLength - string.length + 1).join(sign) + string;
};

function toFixedBuf(lengthInBytes: number, hexStr: string) {
    return Buffer.from(
        padLeft(hexStr, lengthInBytes/4), 'hex'
    );
}


function assert(stmt) {
    expect(stmt).to.be.true;
}

function buffer2bits(buff) {
    const res = [];
    for (let i=0; i<buff.length; i++) {
        for (let j=0; j<8; j++) {
            if ((buff[i]>>j)&1) {
                res.push(bigInt.one);
            } else {
                res.push(bigInt.zero);
            }
        }
    }
    return res;
}

class Signer {
    prvKey = null;
    pubKey = null;
    pPubKey = null;

    constructor(prvKey) {
        this.prvKey = prvKey;
        this.pubKey = eddsa.prv2pub(prvKey);
        this.pPubKey = babyJub.packPoint(this.pubKey);
    }
    
    sign(msg) {
        let { prvKey, pubKey, pPubKey } = this;

        const signature = eddsa.sign(prvKey, msg);

        const pSignature = eddsa.packSignature(signature);
        const uSignature = eddsa.unpackSignature(pSignature);

        assert(eddsa.verify(msg, uSignature, pubKey));

        return pSignature;

        // console.log(prvKey, pubKey, signature)

        // const msgBits = buffer2bits(msg);
        // const r8Bits = buffer2bits(pSignature.slice(0, 32));
        // const sBits = buffer2bits(pSignature.slice(32, 64));
        // const aBits = buffer2bits(pPubKey);
    }

    signMimc(msg) {
        throw new Error("Doesn't work - TODO investigate      TypeError: r.greater is not a function in signMiMC")
        let { prvKey, pubKey, pPubKey } = this;
        
        const rBuff = createBlakeHash("blake512").update(Buffer.concat([h1.slice(32,64), msg])).digest();

        const signature = eddsa.signMiMC(prvKey, msg);

        assert(eddsa.verifyMiMC(msg, signature, pubKey));

        // const w = circuit.calculateWitness({
        //     enabled: 1,
        //     Ax: pubKey[0],
        //     Ay: pubKey[1],
        //     R8x: signature.R8[0],
        //     R8y: signature.R8[1],
        //     S: signature.S,
        //     M: msg});

        // assert(circuit.checkWitness(w));
    }
}

describe('hecticism', function() {
    let pe, web3: Web3Wrapper;
    let accounts;
    let user;

    this.timeout(20000)

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

        const DEPOSIT_AMT = new BigNumber(123123123);
        const SECRET = "0x123abc";
        let commit = await altBank.computeCommit.callAsync(DEPOSIT_AMT, SECRET);
        // console.log(commit)

        await altBank.makeEscrow.sendTransactionAsync(
            new BigNumber(2000), 
            commit
        );

        // user sends tx to relayer
        // relayer constructs proof and updates main and altchain contracts
        // getSignature
        
        const TYPE_DEPOSIT = 0;
        const TYPE_BURN    = 0;


        // Msg format
        // bytes 0: msg type
        // bytes 
        let depositBuf = toFixedBuf(32, DEPOSIT_AMT.toString(16));
        let secretBuf = toFixedBuf(32, SECRET);

        console.log(`deposit buffer size: ${depositBuf.byteLength}`)

        
        let msgBuf = Buffer.concat([
            new Uint8Array([TYPE_DEPOSIT]),
            depositBuf,
            secretBuf
        ], 8 + 32 + 32);

        const MSG_LEN = 8 + 32 + 32; // 72 bytes
        // 8*72 = 576 bits

        // console.log(msgBuf.byteLength)
        


        // let sig = await web3.signMessageAsync(
        //     user, 
        //     msg.toString()
        // );
        // console.log(sig)

        

        // let msg = buffer2bits(msgBuf)

        // let prvKey = eddsa.cratePrvKey();
        // let pubKey = eddsa.prv2pub(prvKey);



        

        const prvKey = Buffer.from("0001020304050607080900010203040506070809000102030405060708090001", "hex");
        const pubKey = eddsa.prv2pub(prvKey);

        let pPubKey = babyJub.packPoint(pubKey);

        let msg = msgBuf;
        let pSignature = new Signer(prvKey).sign(msg)
        // new Signer(prvKey).signMimc(msg)

        console.log(path.join(__dirname, "../zeroknowledge/circomlib", "test", "circuits", "eddsa_test.circom"))
        // const cirDef = await compiler(path.join(__dirname, "../zeroknowledge/circomlib", "test", "circuits", "eddsa_test.circom"));
        let circuit = new snarkjs.Circuit(
            require("../eddsa_test.json")
        );

        const msgBits = buffer2bits(msg);
        const r8Bits = buffer2bits(pSignature.slice(0, 32));
        const sBits = buffer2bits(pSignature.slice(32, 64));
        const aBits = buffer2bits(pPubKey);

        const w = circuit.calculateWitness({A: aBits, R8: r8Bits, S: sBits, msg: msgBits});

        assert(circuit.checkWitness(w));


        
    })

    it.skip('runs a zkp', async() => {
        let circuit = new snarkjs.Circuit(
            require("../eddsa_test.json")
        );
        
        // msg is 20 hex chars
        // which in bits
        // since each hex char is 16 values
        // which log2(16) = 4 bits
        // the msg is 4*20 = 80 bits in information

        const msg = Buffer.from("00010203040506070809", "hex");

//        const prvKey = eddsa.cratePrvKey();

        const prvKey = Buffer.from("0001020304050607080900010203040506070809000102030405060708090001", "hex");

        const pubKey = eddsa.prv2pub(prvKey);

        const pPubKey = babyJub.packPoint(pubKey);

        const signature = eddsa.sign(prvKey, msg);

        const pSignature = eddsa.packSignature(signature);
        const uSignature = eddsa.unpackSignature(pSignature);

        assert(eddsa.verify(msg, uSignature, pubKey));

        const msgBits = buffer2bits(msg);
        const r8Bits = buffer2bits(pSignature.slice(0, 32));
        const sBits = buffer2bits(pSignature.slice(32, 64));
        const aBits = buffer2bits(pPubKey);

        const w = circuit.calculateWitness({A: aBits, R8: r8Bits, S: sBits, msg: msgBits});

        assert(circuit.checkWitness(w));
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

