import Web3 from "web3";
import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { prependListener } from "cluster";
import {promises as fs} from "fs";

import{
    EventUtilContract,
} from '../../contracts/build/wrappers/event_util';

import {
    EventListenerContract
} from '../../contracts/build/wrappers/event_listener';

import {
    EventEmitterContract,
} from '../../contracts/build/wrappers/event_emitter';

import {
    EscrowContract
}  from '../../contracts/build/wrappers/escrow'

import {
    BridgeContract
}   from '../../contracts/build/wrappers/bridge';

import {
    WETH9Contract
}   from '../../contracts/build/wrappers/weth9';

import {
    DemoERC20Contract
}   from '../../contracts/build/wrappers/demo_erc20';
import { ConfigManager } from "./config";

const assert = require('assert');


function getDeployArgs(name: string, pe: Web3ProviderEngine, from: string): [ string, AbiDefinition[], Provider, Partial<TxData>] {
    let json = require(`../../contracts/build/contracts/${name}.json`);
    let bytecode = json.bytecode;
    let abi = json.abi;
    let provider = pe;

    assert.ok(bytecode.length > 0)
    assert.ok(abi.length > 0)
    assert.ok(from != "")

    return [
        bytecode,
        abi,
        provider,
        { from }
    ]
}


async function deploy(configMgr: ConfigManager) {
    try {
        await _deploy(configMgr)
    } catch(ex) {
        throw ex
    }
}

async function _deploy(configMgr: ConfigManager) {
    const network = process.env.NETWORK;
    const config = configMgr.config[network];
    const privateKey = require("../../config/accounts.json").deployAccountPrivateKey;

    let pe: Web3ProviderEngine, web3: Web3Wrapper;
    let accounts;
    let account;

    pe = new Web3ProviderEngine();
    // pe.addProvider(new PrivateKeyWalletSubprovider(privateKey));
    pe.addProvider(new RPCSubprovider(config.rpcUrl));
    pe.start()
    web3 = new Web3Wrapper(pe);
    accounts = await web3.getAvailableAddressesAsync();
    account = accounts[0];

    // 1 Deploy event util

    let eventUtil = await EventUtilContract.deployAsync(
        ...getDeployArgs('EventUtil', pe, account)
    );

    // 2 Deploy eventListener

    let eventListener = await EventListenerContract.deployAsync(
        ...getDeployArgs('EventListener', pe, account))
    ;

    // 3 Deploy eventEmitter

    let eventEmitter = await EventEmitterContract.deployAsync(
        ...getDeployArgs('EventEmitter', pe, account)
    );

    // 4 Deploy Escrow

    // @ts-ignore
    let escrow = await EscrowContract.deployAsync(
        ...getDeployArgs('Escrow', pe, account),
        config.chainId,
        eventListener.address,
        eventEmitter.address
    );

    // 5 Deploy Bridge

    // @ts-ignore
    let bridge = await BridgeContract.deployAsync(
        ...getDeployArgs('Bridge', pe, account),
        config.chainId,
        eventListener.address,
        eventEmitter.address,
    )
    

    config.eventUtilAddress = eventUtil.address;
    config.eventEmitterAddress = eventEmitter.address;
    config.eventListenerAddress = eventListener.address;
    config.escrowAddress = escrow.address;
    config.bridgeAddress = bridge.address;

    // @ts-ignore
    let aliceToken = await DemoERC20Contract.deployAsync(
        ...getDeployArgs('DemoERC20', pe, account),
        "AliceToken",
        "ALI",
        "7",
        "1000000000"
    );
    // @ts-ignore
    let bobToken = await DemoERC20Contract.deployAsync(
        ...getDeployArgs('DemoERC20', pe, account),
        "BobToken",
        "BOB",
        "7",
        "1000000000"
    );

    // @ts-ignore
    let weth = await WETH9Contract.deployAsync(
        ...getDeployArgs('WETH9', pe, account)
    );
    config.wethToken = weth.address;
    config.aliceToken = aliceToken.address;
    config.bobToken = bobToken.address;
    
    configMgr.save()

    pe.stop();
}

export {
    deploy
}