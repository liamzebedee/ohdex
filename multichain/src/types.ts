export interface IChainConfig {
    port: number;
}

export interface IChain {
    start(conf: IChainConfig): Promise<any>;
    stop(): Promise<any>;
}