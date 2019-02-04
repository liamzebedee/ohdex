import { BlockWithTransactionData } from "ethereum-protocol";
import { EventEmitter } from "../declarations";

const EventEmitter = require("events");

interface NewStateRootEvent extends Event {
    stateRoot: string;
}

interface ChainEvents {
    "newStateRoot": NewStateRootEvent
}

abstract class IChainTracker {
    logger: any;
    events: EventEmitter<ChainEvents>;

    abstract async start();
    abstract async stop();
}

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

abstract class ChainTracker extends IChainTracker {
    constructor(chainLabel: string) {
        super();

        this.events = new EventEmitter();
        this.logger = winston.loggers.add(`chaintracker-${chainLabel}`, {
            format: require('../logger').logFormat([
                label({ label: chainLabel })
            ]),
            transports: [
                new winston.transports.Console()
            ]
        });
    }
}

export {
    ChainEvents,
    ChainTracker
}