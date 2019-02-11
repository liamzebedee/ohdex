import Web3 from "web3";
import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { prependListener } from "cluster";
import {promises as fs} from "fs";



import {
    EscrowContract
}  from '../../contracts/build/wrappers/escrow'

import {
    BridgeContract
}   from '../../contracts/build/wrappers/bridge';

const networkA = process.env.NETWORK_A;
const networkB = process.env.NETWORK_B;

let completeConfig = require("../config/networks.json");
let configA = completeConfig[networkA];
let configB = completeConfig[networkB];


const privateKey = require("../config/accounts.json").deployAccountPrivateKey;

init();

function getAbi(name:string) {
    return require(`../contracts/build/contracts/${name}.json`).abi;
}

async function init() {
    let pe, web3;
    let accounts;
    let account;

    pe = new Web3ProviderEngine();
    pe.addProvider(new PrivateKeyWalletSubprovider(privateKey));
    pe.addProvider(new RPCSubprovider(configA.rpcUrl));
    pe.start()
    web3 = new Web3Wrapper(pe);
    accounts = await web3.getAvailableAddressesAsync();
    account = accounts[0];

    const escrow = new EscrowContract(getAbi("Escrow"), configA.escrowAddres, pe, {from: account});
    const bridge = new BridgeContract(getAbi("Bridge"), configA.bridgeAddress, pe, {from: account});

    console.log("Initiating Escrow");
    try {
        await escrow.initNetwork.sendTransactionAsync(configB.bridgeAddress, configB.chainId, {from: account, gas: 100000});
    } catch(e) {
        console.error(e);
    }
    console.log("Inititiating Bridge");
    try {
        await bridge.initNetwork.sendTransactionAsync(configB.escrowAddress, configB.chainId, {from: account, gas:100000});
    } catch(e) {
        console.error(e);
    }
    

    pe.stop();

}