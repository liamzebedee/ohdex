const ganache = require("ganache-core");
import { promisify } from 'util';
import { IChain, IChainConfig } from "../types";
const BN = require("bn.js");


export class EthereumChain implements IChain {
    server: any;

    async start(conf: IChainConfig): Promise<any> {
        const server = ganache.server({ 
            logger: {
                log: console.log
            },
            s: "TestRPC is awesome!", // I didn't choose this
            gasPrice: 0,
            gasLimit: 10000000000000000000,
            networkId: 420,
            defaultBalanceEther: 10000000000000000000000,
            unlock: [0, 1],
        });
        return new Promise((res, rej) => {
            server.listen(conf.port, (err, state) => {
                if(err) rej(err)
                
                
                console.log("");
                console.log("Available Accounts");
                console.log("==================");
              
                var accounts = state.accounts;
                var addresses = Object.keys(accounts);
              
                addresses.forEach(function(address, index) {
                  var balance = new BN(accounts[address].account.balance).divRound(new BN("1000000000000000000")).toString();
                  var line = "(" + index + ") " + address + " (~" + balance + " ETH)";
              
                  if (state.isUnlocked(address) == false) {
                    line += " 🔒";
                  }
              
                  console.log(line);
                });

                this.server = state;
                res()
            })
        })
        
    }

    async stop() {
        return this.server.stop();
    }
}