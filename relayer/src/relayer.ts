import { EthereumChainTracker, StateLeaf } from "./chain/ethereum";
import { ChainTracker, EventEmittedEvent, MessageSentEvent } from "./chain/tracker";

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

// import { MerkleTree } from 'typescript-solidity-merkle-tree';
import { MerkleTree, MerkleTreeProof } from "../../ts-merkle-tree/src";

import { ITokenBridgeEventArgs } from "../../contracts/build/wrappers/i_token_bridge";
import { EventEmitter } from "./declarations";
import { dehexify } from "./utils";
import { InterchainState } from "./interchain";

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
            chain.events.on('EventEmitter.EventEmitted', async (ev: EventEmittedEvent) => {
                await this.updateStateRoots()
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

            chain.listen()
        });


        await this.updateStateRoots()

    }

    async updateStateRoots() {
        let interchainState = new InterchainState()
        
        Object.values(this.chains).map(chain => {
            interchainState.addChain(chain.id, chain.getStateLeaf())
        });
        interchainState.computeState()

        this.logger.info(`Computed new interchain state root: ${hexify(interchainState.globalState.root())}`)
        
        let chainsToUpdate = Object.values(this.chains)//.filter(({ id }) => id !== chainId)
        
        await Promise.all(
            chainsToUpdate.map(async chain => {
                let proof = interchainState.proofs[chain.id];
                let root = interchainState.roots[chain.id]
                
                try {
                    console.log(chain.id, 0)
                    await chain.updateStateRoot(
                        proof,
                        root
                    );

                    console.log(chain.id, 1)

                    chain.events.once('StateRootUpdated', async () => {
                        await chain.processBridgeEvents(
                            interchainState
                        )
                    })
                    
                } catch(ex) {
                    this.logger.error(ex)
                }
            })
        )
    }

    async stop() {
        await Promise.all(Object.values(this.chains).map(chain => chain.stop));
    }
}

