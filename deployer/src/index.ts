import { ConfigManager } from "./config";
import { deploy } from "./deploy";

const configMgr = ConfigManager.load()

deploy(configMgr)
.then(x => {
    console.log("Deployed successfully!")
})
.catch(err => {
    console.log(err);
    // if(err.data.stack)
    //     console.log(err.data.stack)
    process.exit(-1)
})