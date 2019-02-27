import { Web3ProviderEngine, RPCSubprovider } from "0x.js";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { BigNumber } from "@0x/utils";
import { BridgedTokenContract } from '@ohdex/contracts/lib/build/wrappers/bridged_token';
import { MultichainProviderFactory, MultichainInfo } from "./helper";
import { EscrowContract } from "@ohdex/contracts/lib/build/wrappers/escrow";

function getContractArtifact(name: string) {
    name = name.split('Contract')[0];
    console.log(require('@ohdex/contracts') + `/build/artifacts/${name}.json`)
    return require(require('@ohdex/contracts') + `/build/artifacts/${name}.json`)
}

describe("Relayer", () => {
    describe('cross-chain bridge', async () => {
        let multichain: MultichainProviderFactory;
        let pe, web3: Web3Wrapper;
        let user, accounts;
        let bridgedToken: BridgedTokenContract;
        let escrow: EscrowContract;

        let originChain, foreignChain: MultichainInfo;

        let _chainId = new BigNumber('1')
        let _salt = new BigNumber('1')


        before(async () => {
            multichain = new MultichainProviderFactory()
            await multichain.connect()

            originChain = multichain.things[0]
            foreignChain = multichain.things[1]
            
            // const port = '9546';
            // let chain = await GanacheTestchain.start(port);
    
            pe = new Web3ProviderEngine();
            pe.addProvider(new RPCSubprovider(originChain.config.rpcUrl))
            pe.start()


            web3 = new Web3Wrapper(pe);
            // web3V = new Web3(pe);
            accounts = await web3.getAvailableAddressesAsync();
            user = accounts[0]
            const txDefaults = { from: user };


            // @ts-ignore
            bridgedToken = await BridgedTokenContract.deployFrom0xArtifactAsync(
                getContractArtifact('BridgedTokenContract'), pe, txDefaults,
            )

            escrow = new EscrowContract(
                getContractArtifact('EscrowContract').compilerOutput.abi, originChain.config.escrowAddress, 
                pe, txDefaults,
            )
        })
        
        process.on('exit', async function() {
            await multichain.restore()
        })

        // it('updates the state root on two chains')
        // it('listens to state root update events')
        // it('updates the state root correctly when another event is emitted during')
        // it('forwards the bridge events from one chain to another')
        it('works', async() => {
            let _amount = new BigNumber('500');

            await web3.awaitTransactionSuccessAsync(
                await bridgedToken.mint.sendTransactionAsync(user, new BigNumber('10000000'))
            )

            await web3.awaitTransactionSuccessAsync(
                await bridgedToken.approve.sendTransactionAsync(originChain.config.escrowAddress, _amount)
            )

            
            await web3.awaitTransactionSuccessAsync(
                await escrow.bridge.sendTransactionAsync(
                    foreignChain.config.bridgeAddress, 
                    bridgedToken.address, user, _amount, _chainId, _salt
                )
            )


        })
    })
})