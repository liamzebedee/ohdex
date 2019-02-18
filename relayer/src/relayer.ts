import { EthereumChainTracker, StateLeaf } from "./chain/ethereum";
import { ChainTracker, EventEmittedEvent, MessageSentEvent } from "./chain/tracker";

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

// import { MerkleTree } from 'typescript-solidity-merkle-tree';
import { MerkleTree, MerkleTreeProof } from "../../ts-merkle-tree/src";

// @ts-ignore
import { keccak256 } from 'ethereumjs-util';
import { ITokenBridgeEventArgs } from "../../contracts/build/wrappers/i_token_bridge";
import { EventEmitter } from "./declarations";

interface ChainConfig {
    chainType: 'ethereum';
    chainId: string;
}

function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}

const eventEmitter = require("events");
const forward = require('forward-emitter');

type chainId = string;
interface CrosschainEventEvent extends Event {
    from: chainId;
    to: chainId;
    data: ITokenBridgeEventArgs;
}

interface CrosschainEvents {
    "sent": CrosschainEventEvent
}

export class Relayer {
    chains: { [k: string]: EthereumChainTracker };

    crosschainEvents: EventEmitter<CrosschainEvents>;

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

        this.crosschainEvents = new eventEmitter();
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
            
            chain.events.on('EventEmitter.EventEmitted', async (ev: EventEmittedEvent) => {
                await this.updateStateRoots(chain.id)
            })

            chain.events.on('ITokenBridge.TokensBridgedEvent', (msg: MessageSentEvent) => {
                let found: boolean = false;

                for(let chain2 of Object.values(this.chains)) {
                    if(chain2.receiveCrosschainMessage(msg)) return;
                }

                if(!found) {
                    this.logger.error(`Couldn't find bridge ${msg.toBridge} for cross-chain message`)
                }
            })
        });

    }

    async updateStateRoots(chainId) {
        let roots: { 
            [k: string]: StateLeaf
        } = {};
        Object.values(this.chains).map(chain => {
            roots[chain.id] = chain.getStateLeaf()
        });
        let items = Object.values(roots).map(root => root._leaf);

        let state = new MerkleTree(
            items,
            keccak256
        );
        this.logger.info(`Computed new interchain state root: ${hexify(state.root())}`)
        
        let chainsToUpdate = Object.values(this.chains)//.filter(({ id }) => id !== chainId)
        
        await Promise.all(
            chainsToUpdate.map(async chain => {
                let leafIdx = Object.keys(roots).indexOf(chain.id)
                let proof = state.generateProof(leafIdx)
                // let leaf = state.layers[0][leafIdx]
                
                if(!state.verifyProof(proof, proof.leaf)) throw new Error;

                return await chain.updateStateRoot(
                    proof,
                    roots[chain.id]
                )
            })
        )

        return state;
    }

    async stop() {
        await Promise.all(Object.values(this.chains).map(chain => chain.stop));
    }
}
