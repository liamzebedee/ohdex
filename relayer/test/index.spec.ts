import { EthereumChainTracker } from "../src/chain/ethereum";

describe('EthereumChainTracker', () => {
    let tracker = new EthereumChainTracker({
        rpcUrl: "https://kovan.infura.io/v3/076b582fd6164444af0b426614496e15",
        eventEmitterAddress: "0xf4fe8555da6964981ff180caf037e96eaf3c611f"
    })

    // deploy a test chain
    // deploy the event emitter
    // test that it gets the events correctly

    it('#start', async () => {
        await tracker.start();
    })
})