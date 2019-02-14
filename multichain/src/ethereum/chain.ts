const ganache = require("ganache-core");
import { promisify } from 'util';
import { IChain, IChainConfig, IAccountsConfig } from "../types";
const BN = require("bn.js");

import { Web3Wrapper } from '@0x/web3-wrapper';
import { MnemonicWalletSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders'
import { providers } from "web3";
import { resolve, dirname } from 'path'
import { existsSync } from 'fs'

const DEFAULT_BALANCE_ETHER = '1000000000000000000'


export class EthereumChain implements IChain {
    server: any;

    async start(conf: IChainConfig, accountsConf: IAccountsConfig): Promise<any> {
        let dbpath = resolve(dirname(require.resolve(`../../package.json`)), `db/${conf.chainId}`)
        let firstStart = !existsSync(dbpath)

        const server = ganache.server({ 
            ws: true,
            logger: {
                log: console.log
            },
            // db_path: resolve(dirname(require.resolve(`../../package.json`)), `db/${conf.chainId}`),
            db_path: dbpath,
            total_accounts: 100,
            s: "TestRPC is awesome!", // I didn't choose this
            gasPrice: 0,
            // gasLimit: 10000000000000000000,
            networkId: 420,
            debug: false,
            defaultBalanceEther: '100000000000000000000000000000',
            unlock: [0, 1],
        });

        let blockchainState = await new Promise<any>((res, rej) => {
            server.listen(conf.port, (err, state) => {
                if(err) rej(err);
                else res(state)
            })
        });

        var accounts = blockchainState.accounts;
        var addresses = Object.keys(accounts);

        this.server = blockchainState;

        if(firstStart) {
            let pe = new Web3ProviderEngine();
            pe.addProvider(new RPCSubprovider(`http://127.0.0.1:${conf.port}`))
            pe.start()
            let web3 = new Web3Wrapper(pe);
    
            console.log(`Funding accounts`)
    
            for(let addr of accountsConf.getAddresses()) {
                await web3.awaitTransactionSuccessAsync(
                    await web3.sendTransactionAsync({
                        from: addresses[0],
                        to: addr,
                        value: DEFAULT_BALANCE_ETHER
                    })
                )
            }
            pe.stop()
        }

        console.log("");
        console.log("Accounts");
        console.log("===============\n");
        accountsConf.getAddresses().map((account, i) => {
            console.log(`(${i}) `, account)
        })

        console.log(`Running!`)
    }

    async stop() {
        return this.server.stop();
    }
}