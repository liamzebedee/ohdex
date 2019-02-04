import Web3 from "web3";
import { Web3ProviderEngine, RPCSubprovider, BigNumber} from "0x.js";
import { PrivateKeyWalletSubprovider } from "@0x/subproviders";
import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';
import { ChainTracker } from "./tracker";

export class EthereumChainTracker extends ChainTracker {
    rpcUrl: string;

    constructor(rpcUrl: string) {
        super("Ethereum");
    }

    async connect() {
        this.logger.info('Connecting')
        // pe = new Web3ProviderEngine();
        // pe.addProvider(new PrivateKeyWalletSubprovider(privateKey));
        // pe.addProvider(new RPCSubprovider(config.rpcUrl));
        // pe.start()
        // web3 = new Web3Wrapper(pe);
        // accounts = await web3.getAvailableAddressesAsync();
        // account = accounts[0];

        let x = new Promise((res,rej) => {
            setTimeout(() => {
                res()
            }, 10000)
        })
        
        return x;
    }
}