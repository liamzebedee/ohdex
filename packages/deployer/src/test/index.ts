import { ConfigManager } from "../config";
import { _deploy } from "../deploy";
import { EthereumChain } from "@ohdex/multichain";
import { AccountsConfig } from "@ohdex/multichain";


const configMgr = ConfigManager.load()

async function run() {
    const accountsConf = await AccountsConfig.load('../../../config/test_accounts.json')
    let networks = Object.keys(configMgr.config)

    // for(let network of networks) {
    await Promise.all(networks.map(async network => {

        let chain = new EthereumChain();
        try {
            await chain.start(configMgr.config[network], accountsConf)
            await _deploy(configMgr, network)
        } catch(ex) {
            console.error(ex)
        }
        
    }))
    // }

}




run()
.then(x => {
    console.log('Done')
})
.catch(err => {
    console.log(err);
    // if(err.data.stack)
    //     console.log(err.data.stack)
    process.exit(-1)
})