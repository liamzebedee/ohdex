import networks from '../../../config/networks';

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