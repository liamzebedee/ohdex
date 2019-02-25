import { EthereumChainTracker } from "./chain/ethereum";
import { ChainTracker, EventEmittedEvent, MessageSentEvent } from "./chain/tracker";

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;


import Event from 'events';
import { MerkleTree, MerkleTreeProof } from "@ohdex/typescript-solidity-merkle-tree";

import { ITokenBridgeEventArgs } from "../../contracts/build/wrappers/i_token_bridge";
import { EventEmitter } from "./declarations";
import { dehexify } from "./utils";
import { CrosschainState } from "./interchain";
import { EventListenerContract } from "../../contracts/build/wrappers/event_listener";

import Event from 'events';

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
interface CrosschainEventEvent {
    from: chainId;
    to: chainId;
    data: ITokenBridgeEventArgs;
}

interface CrosschainEvents {
    "sent": CrosschainEventEvent
}

export class Relayer {
    chains: { [k: string]: EthereumChainTracker };

    state: CrosschainState;

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
        this.state = new CrosschainState();
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

            chain.events.on('ITokenBridge.TokensBridgedEvent', async (msg: MessageSentEvent) => {
                let found: boolean = false;

                for(let chain2 of Object.values(this.chains)) {
                    if(await chain2.receiveCrosschainMessage(msg)) return;
                }

                if(!found) {
                    this.logger.error(`Couldn't find bridge ${msg.toBridge} for cross-chain message`)
                }
            })

            chain.listen()
        });


        // await this.updateStateRoots()

    }

    async updateStateRoots() {
        this.state = new CrosschainState

        Object.values(this.chains).map(chain => {
            this.state.put(chain.state)
        });

        this.state.compute()

        this.logger.info(`Computed new interchain state root: ${this.state.root}`)
        
        let chainsToUpdate = Object.values(this.chains)
        
        await Promise.all(
            chainsToUpdate.map(async chain => {
                try {
                    let { proof, leaf } = this.state.proveUpdate(chain.state.getId())
                    await chain.updateStateRoot(
                        proof,
                        leaf
                    );

                    chain.events.once('StateRootUpdated', async () => {
                        await chain.processBridgeEvents(
                            this.state
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



