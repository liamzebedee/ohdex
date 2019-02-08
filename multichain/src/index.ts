#!/usr/bin/env node
require('make-promises-safe')

// import program from 'commander';
import { EthereumChain } from './ethereum/chain';
import { IChainConfig, IChain } from './types';
import { AccountsConfig } from './accounts';


const chains: { [k: string]: any } = {
    'ethereum': EthereumChain
};

require('yargs')
.command('run', 'Run a blockchain node', yargs => {
    yargs
    .option('chain', { describe: 'Chain type' })
    .option('name', { describe: 'Name of the chain in config' })
    .demandOption(['chain', 'name'])
}, run)
.argv



// let args = process.argv;
// program.parse(args);




async function run(cmd) {
    const config = require('../../config/test_networks.json');
    const accountsConfig = await AccountsConfig.load('../../config/test_accounts.json')

    let conf: IChainConfig = config[cmd.name];
    if(!conf) throw new Error(`Couldn't find config for chain ${cmd.name}`)

    let Chain = chains[cmd.chain];
    if(!Chain) throw new Error(`Couldn't find chain type ${cmd.chain}`)

    let chain: IChain = new Chain();
    try {
        await chain.start(conf, accountsConfig)
    } catch(ex) {
        console.error(ex)
    }

    process.on('SIGTERM', async () => {
        await chain.stop()
        process.exit(0);
    });
}