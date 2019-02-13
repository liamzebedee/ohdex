import { BlockWithTransactionData } from "ethereum-protocol";
import { EventEmitter } from "../declarations";
import { IChain } from "../../../multichain/lib/types";
const eventEmitter = require("events");

interface EventEmittedEvent extends Event {
    eventHash: string;
    newChainRoot: string;
    newChainIndex: string;
}

interface ChainEvents {
    "eventEmitted": EventEmittedEvent
}

abstract class IChainTracker {
    logger: any;
    events: EventEmitter<ChainEvents>;
    id: string;

    abstract async start(): Promise<any>;
    abstract async stop(): Promise<any>;
}

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

abstract class ChainTracker extends IChainTracker implements IChain {    
    constructor(chainId: string) {
        super();
        this.id = chainId;

        this.events = new eventEmitter();
        this.logger = winston.loggers.add(`chaintracker-${chainId}`, {
            format: require('../logger').logFormat([
                label({ label: chainId })
            ]),
            transports: [
                new winston.transports.Console()
            ]
        });
    }

    abstract listen();
    abstract computeStateLeaf(): Buffer;

    // abstract getStateRoot(): Buffer;
    // abstract getInterchainStateRoot(): Buffer;
}

export {
    ChainEvents,
    ChainTracker,
    EventEmittedEvent
}