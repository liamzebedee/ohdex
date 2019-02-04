import { EthereumChainTracker } from "./chain/ethereum_tracker";
import { ChainTracker } from "./chain/tracker";
import { ChainConfig } from "./chain/config";

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

export class Relayer {
    chains: ChainTracker[];
    logger;

    constructor() {
        this.chains = [];
        
        this.logger = winston.loggers.add(`relayer`, {
            format: require('./logger').logFormat([
                label({ label: "Relayer" })
            ]),
            transports: [
                new winston.transports.Console()
            ]
        });
    }

     start() {
        let networks: ChainConfig[] = Object.values(require("../../config/networks.json"));

        this.logger.info('Loading chains...')

        for(let { rpcUrl } of networks) {
            this.chains.push(
                new EthereumChainTracker(rpcUrl)
            );
        }

        for(let chain of this.chains) {
            chain.connect();
        }
    }

    async stop() {
        await Promise.all(this.chains.map(chain => chain.stop));
    }
}