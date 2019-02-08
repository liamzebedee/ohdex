export interface IChainConfig {
    port: number;
}

export interface IChain {
    start(conf: IChainConfig, accountsConf: IAccountsConfig): Promise<any>;
    stop(): Promise<any>;
}

export interface IAccountsConfig {
    getAddresses(): string[];
}