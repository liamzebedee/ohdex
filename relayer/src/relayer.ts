import { EthereumChainTracker } from "./chain/ethereum";
import { ChainTracker, EventEmittedEvent } from "./chain/tracker";

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

import { MerkleTree } from '../../ts-merkle-tree/src';
// @ts-ignore
import { keccak256 } from 'ethereumjs-util';

interface ChainConfig {
    chainType: 'ethereum';
    chainId: string;
}

export class Relayer {
    chains: { [k: string]: ChainTracker };
    logger;
    config: any;

    roots: { [k: string]: Buffer } = {};
    state: MerkleTree;

    constructor(config: any) {
        this.chains = {};
        this.config = config;
        
        this.logger = winston.loggers.add(`relayer`, {
            format: require('./logger').logFormat([
                label({ label: "Relayer" })
            ]),
            transports: [
                new winston.transports.Console()
            ]
        });
    }

    async start() {
        let networks: ChainConfig[] = Object.values(this.config);

        this.logger.info('Loading chains...')

        for(let conf of networks) {
            this.chains[conf.chainId] = (
                new EthereumChainTracker(conf)
            );
        }

        let started = [];
        for(let chain of Object.values(this.chains)) {
            started = [ ...started, chain.start() ]
            chain.events.on('eventEmitted', (ev: EventEmittedEvent) => {
                this.roots[chain.id] = chain.computeStateLeaf()
                this.state = new MerkleTree(
                    Object.values(this.roots),
                    keccak256
                );
                this.logger.info(`Computed new state root: ${this.state.root()}`)
            })
        }

        return Promise.all(started)
    }



    async stop() {
        await Promise.all(Object.values(this.chains).map(chain => chain.stop));
    }
}
