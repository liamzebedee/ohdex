// load all contracts

const winston = require('winston');
const { format } = winston;
const { combine, label, json, simple } = format;

import Web3 from 'web3';


class ContractLogger {
    logger: any;

    constructor(name: string) {
        this.logger = winston.loggers.add(`contract-${name}`, {
            format: require('../logger').logFormat([
                label({ label: name })
            ]),
            transports: [
                new winston.transports.Console()
            ]
        });
    }

}


class Program {
    async run() {
        let web3 = new Web3('')


    }
    async stop() {
        
    }
}

let program = Program.run().then(() => {}).catch(ex => {
    throw ex
})

process.on('exit', async () => {
    await program.stop()
})