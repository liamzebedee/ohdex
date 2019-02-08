import { BlockWithTransactionData } from "ethereum-protocol";
import { EventEmitter } from "../declarations";
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

    abstract async start(): Promise<any>;
    abstract async stop(): Promise<any>;
}

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

interface IChain {
    id: string;

    computeStateLeaf(): Buffer;
}

abstract class ChainTracker extends IChainTracker implements IChain {
    id: string;
    
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

    abstract computeStateLeaf(): Buffer;
}

export {
    ChainEvents,
    ChainTracker,
    EventEmittedEvent
}