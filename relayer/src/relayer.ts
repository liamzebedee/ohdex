import { EthereumChainTracker } from "./chain/ethereum";
import { ChainTracker } from "./chain/tracker";

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

interface ChainConfig {}

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

        for(let conf of networks) {
            this.chains.push(
                new EthereumChainTracker(conf)
            );
        }

        for(let chain of this.chains) {
            chain.start();
        }
    }

    async stop() {
        await Promise.all(this.chains.map(chain => chain.stop));
    }
}