

import networks_prod from '../../../config/networks.json';
import networks_test from '../../../config/test_networks.json';

// let networks: typeof networks_prod;
let networks: any;

switch(process.env.NODE_ENV) {
    case 'development':
        networks = networks_test;
        break;
    default:
        networks = networks_prod;
        break;
}

export default (networkId:Number, configValue:string) => {
    const keys = Object.keys(networks);

    for(let i = 0; i < keys.length; i ++) {

        const network = networks[keys[i]];

        if(network.chainId == networkId) {
            return network[configValue];
        }
        
    }
    return undefined;
}

function getConfigValueByName(name:string, configValue:string) {
    let conf = networks[name]
    if(!conf) throw new Error(`no config for ${name}`)
    return networks[name][configValue];
}


const getChainName = (networkId:Number) => {

    const keys = Object.keys(networks);

    for(let i = 0; i < keys.length; i ++) {

        const network = networks[keys[i]];

        if(network.chainId == networkId) {
            return keys[i];
        }
        
    }
    return undefined;
};

export {getChainName, getConfigValueByName};