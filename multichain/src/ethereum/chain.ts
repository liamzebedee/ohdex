const ganache = require("ganache-core");
import { promisify } from 'util';
import { IChain, IChainConfig, IAccountsConfig } from "../types";
const BN = require("bn.js");

import { Web3Wrapper } from '@0x/web3-wrapper';
import { MnemonicWalletSubprovider, Web3ProviderEngine, RPCSubprovider } from '@0x/subproviders'
import { providers } from "web3";

const DEFAULT_BALANCE_ETHER = '1000000000000000000'
export class EthereumChain implements IChain {
    server: any;

    async start(conf: IChainConfig, accountsConf: IAccountsConfig): Promise<any> {
        const server = ganache.server({ 
            logger: {
                log: console.log
            },
            s: "TestRPC is awesome!", // I didn't choose this
            // gasPrice: 0,
            // gasLimit: 10000000000000000000,
            networkId: 420,
            debug: false,
            defaultBalanceEther: '1000000000000000000',
            unlock: [0, 1],
        });
        return new Promise((res, rej) => {
            server.listen(conf.port, async (err, state) => {
                if(err) rej(err)
                
                
              
                var accounts = state.accounts;
                var addresses = Object.keys(accounts);
              
                // addresses.forEach(function(address, index) {
                //   var balance = new BN(accounts[address].account.balance).divRound(new BN("1000000000000000000")).toString();
                //   var line = "(" + index + ") " + address + " (~" + balance + " ETH)";
              
                //   if (state.isUnlocked(address) == false) {
                //     line += " 🔒";
                //   }
              
                //   console.log(line);
                // });

                this.server = state;


                let pe = new Web3ProviderEngine();
                pe.addProvider(new RPCSubprovider(`http://127.0.0.1:${conf.port}`))
                pe.start()
                let web3 = new Web3Wrapper(pe);
                
                console.log(`Funding accounts`)
                for(let addr of accountsConf.getAddresses()) {
                    await web3.sendTransactionAsync({
                        from: addresses[0],
                        to: addr,
                        value: DEFAULT_BALANCE_ETHER
                    })
                }

                console.log("");
                console.log("Accounts");
                console.log("===============\n");
                accountsConf.getAddresses().map((account, i) => {
                    console.log(`(${i}) `, account)
                })

                console.log(`Running!`)

                pe.stop()

                res()
            })
        })
        
    }

    async stop() {
        return this.server.stop();
    }
}