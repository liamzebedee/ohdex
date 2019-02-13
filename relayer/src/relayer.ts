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

function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}
export class Relayer {
    chains: { [k: string]: EthereumChainTracker };
    logger;
    config: any;

    // roots: { [k: string]: Buffer } = {};
    // state: MerkleTree;

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
        }

        await Promise.all(started)

        // for(let chain of Object.values(this.chains)) {
        //     this.roots[chain.id] = chain.getStateRoot();
        // }

        // start state update loop
        Object.values(this.chains).map(chain => {
            chain.listen()
            
            chain.events.on('eventEmitted', async (ev: EventEmittedEvent) => {                
                // this.roots[chain.id] = chain.computeStateLeaf()
                await this.updateStateRoots()
            })
        });
    }

    async updateStateRoots() {
        let roots = {};
        Object.values(this.chains).map(chain => {
            roots[chain.id] = chain.computeStateLeaf()
        });

        let state = new MerkleTree(
            Object.values(roots),
            keccak256
        );
        this.logger.info(`Computed new interchain state root: ${hexify(state.root())}`)
        
        let chainsToUpdate = Object.values(this.chains)//.filter(({ id }) => id !== chain.id)
        let newStateRoot = state.root()
        
        await Promise.all(
            chainsToUpdate.map(chain => {
                return chain.updateStateRoot(
                    state.generateProof(roots[chain.id]),
                    newStateRoot
                )
            })
        )

        return state;
    }

    async stop() {
        await Promise.all(Object.values(this.chains).map(chain => chain.stop));
    }
}
