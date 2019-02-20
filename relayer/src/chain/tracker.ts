import { BlockWithTransactionData } from "ethereum-protocol";
import { EventEmitter } from "../declarations";
import { IChain } from "../../../multichain/lib/types";
import { ITokenBridgeEventArgs } from "../../../contracts/build/wrappers/i_token_bridge";
const eventEmitter = require("events");

interface EventEmittedEvent extends Event {
    eventHash: string;
    newChainRoot: string;
    newChainIndex: string;
}

type chainId = string
interface MessageSentEvent extends Event {
    // from: chainId;
    toBridge: chainId;
    data: ITokenBridgeEventArgs;
    eventHash: string;
    fromChain: chainId
}

interface ChainEvents {
    "EventEmitter.EventEmitted": EventEmittedEvent,
    "ITokenBridge.TokensBridgedEvent": MessageSentEvent,
    "StateRootUpdated": any
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
    constructor(chainId: chainId) {
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
    // abstract computeStateLeaf(): Buffer;

    // abstract getStateRoot(): Buffer;
    // abstract getInterchainStateRoot(): Buffer;
}

export {
    ChainEvents,
    ChainTracker,
    EventEmittedEvent,
    MessageSentEvent
}