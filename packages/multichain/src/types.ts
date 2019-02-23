export interface IChainConfig {
    port: number;
    chainId: string;
}

export interface IChain {
    start(conf: IChainConfig, accountsConf: IAccountsConfig): Promise<any>;
    stop(): Promise<any>;
}

export interface IAccountsConfig {
    getAddresses(): string[];
}