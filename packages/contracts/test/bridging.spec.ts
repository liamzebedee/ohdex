// import chai, { expect, should, assert } from 'chai';
// import { describe, it, setup, teardown } from 'mocha';
// import { keccak256, bufferToHex, toBuffer } from 'ethereumjs-util';
// import Web3 from 'web3';

// import chaiAsPromised from 'chai-as-promised';
// chai.use(chaiAsPromised);
// import 'mocha';

// import {
//     EventListenerContract
// } from '../build/wrappers/event_listener';

// import {
//     EventEmitterContract,
// } from '../build/wrappers/event_emitter';

// import {
//     EscrowContract
// }  from '../build/wrappers/escrow'

// import {
//     BridgeContract
// }   from '../build/wrappers/bridge';

// import {
//     ERC20MintableContract
// }   from '../build/wrappers/erc20_mintable'


// import { Web3ProviderEngine, RPCSubprovider, BigNumber } from "0x.js";
// import { Web3Wrapper, AbiDefinition, Provider, TxData } from '@0x/web3-wrapper';



// function getDeployArgs(name: string, pe: Web3ProviderEngine, from: string): [ string, AbiDefinition[], Provider, Partial<TxData>] {
//     // let json = require(`../../contracts/build/contracts/${name}.json`);
//     let json = require(`../build/artifacts/${name}.json`);
//     let bytecode = json.compilerOutput.evm.bytecode.object;
//     let abi = json.compilerOutput.abi;
//     let provider = pe;

//     assert.ok(bytecode.length > 0)
//     assert.ok(abi.length > 0)
//     assert.ok(from != "")

//     return [
//         bytecode,
//         abi,
//         provider,
//         { from }
//     ]
// }

// // async function eventsToMerkleProof(events:any[], utilContract:EventUtilContract){
// //     const hashes = [];

// //     for(let i = 0; i < events.length; i ++) {
// //         hashes.push(toBuffer(await utilContract.generateBridgeHash.callAsync(events[i].returnValues.origin, events[i].returnValues.eventHash)));
// //     }

// //     const merkleTree = new MerkleTree(hashes);

// //     return merkleTree;
// // }

// describe('bridging', () => {
//     let pe, web3, web3V;
//     let accounts;
//     let user;

//     before(async () => {
//         pe = new Web3ProviderEngine();
//         pe.addProvider(new RPCSubprovider('http://127.0.0.1:9545'))
//         pe.start()
//         web3 = new Web3Wrapper(pe);
//         web3V = new Web3(pe);
//         accounts = await web3.getAvailableAddressesAsync();
//         user = accounts[0]
//     });

    
//     const chainAId = new BigNumber(0);
//     const chainBId = new BigNumber(1);
//     const salt = new BigNumber("133713371337420");

//     describe('bridging 2 chains', async () => {
//         let eventListenerA: EventListenerContract, eventListenerB: EventListenerContract;
//         let eventEmitterAV, eventEmitterBV;
//         let eventEmitterA: EventEmitterContract, eventEmitterB: EventEmitterContract;
//         let escrow: EscrowContract, bridge: BridgeContract;
//         let token;

//         beforeEach(async () => {
//             // Deploy two event primitives


//             // @ts-ignore
//             eventListenerA_ = await EventListenerContract.deployAsync(
//                 ...getDeployArgs('EventListener', pe, user)
//             )
//             let eventEmitterA_ = await EventEmitterContract.deployAsync(
//                 ...getDeployArgs('EventEmitter', pe, user)
//             );

//             eventEmitterAV = await new web3V.eth.Contract(eventEmitterA_.abi, eventEmitterA.address);

//             // @ts-ignore
//             eventListenerB_ = await EventListenerContract.deployAsync(
//                 ...getDeployArgs('EventListener', pe, user))
//             ;
//             let eventEmitterB_ = await EventEmitterContract.deployAsync(
//                 ...getDeployArgs('EventEmitter', pe, user)
//             );

//             eventEmitterBV = await new web3V.eth.Contract(eventEmitterB_.abi, eventEmitterA.address);


//             token = await ERC20MintableContract.deployAsync(
//                 ...getDeployArgs('ERC20Mintable', pe, user)
//             );

//             // @ts-ignore
//             escrow = await EscrowContract.deployAsync(
//                 ...getDeployArgs('Escrow', pe, user),
//                 chainAId,
//                 eventListenerA.address,
//                 eventEmitterA.address
//             );
            
//             // @ts-ignore
//             bridge = await BridgeContract.deployAsync(
//                 ...getDeployArgs('Bridge', pe, user),
//                 chainBId,
//                 eventListenerB.address,
//                 eventEmitterB.address,
//             )
//         })

//         it('does the thing', async() => {
//             const bridgeAmount = new BigNumber(1000);


//             // // init network A for chain B bridge
//             // await bridge.initNetwork.sendTransactionAsync(escrow.address, chainAId);
//             // // init network B for chain A escrow
//             // await escrow.initNetwork.sendTransactionAsync(bridge.address, chainBId);

//             // must have some tokens to bridge
//             await token.mint.sendTransactionAsync(user, bridgeAmount, {from: user});


//             // A to B bridging process

//             // allow token to be pulled by escrow
//             await token.approve.sendTransactionAsync(escrow.address, bridgeAmount, {from: user});
            
//             // bridge tokens
//             await escrow.bridge.sendTransactionAsync(
//                 token.address, user, bridgeAmount, chainBId, salt, 
//                 { from: user }
//             );
                
//             let emittedEvents = await eventEmitterA.getPastEvents("EventEmitted");

//             // generate merkle tree of events that have happened
//             let merkleTree = await eventsToMerkleProof(emittedEvents, eventUtil);
            
//             // submit the merkle root to the event listener contract on chain B
//             await eventListenerB.updateStateRoot.sendTransactionAsync()
//             await eventListenerB.updateProof.sendTransactionAsync(chainAId, merkleTree.getHexRoot());

//             const proof = merkleTree.getHexProof(merkleTree.elements[0]);

//             // console.log(proof);
            
//             // await bridge.getBridgedToken.sendTransactionAsync(token.address, chainAId);
            
//             // claim the tokens on chain B

//             //function bridge(address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt) public {

//             // await bridge.claim.sendTransactionAsync(token.address, user, bridgeAmount, chainAId, salt, new BigNumber(0), proof);
            
//             // const bridgedTokenAddress = await bridge.getBridgedToken.callAsync(token.address, chainAId);

//             // const bridgedToken = new web3V.eth.Contract(bridgedTokenAbi, bridgedTokenAddress);

//             // let balance = await bridgedToken.methods.balanceOf(user).call();

//             // expect(balance).to.equal("1000");

//             // // Woot that worked! Now bridging back to chain A

//             // // Call bridge on bridge contract

//             // // bridge(address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt)

//             // console.log("Bridging B to A");

//             // let receipt = await bridge.bridge.sendTransactionAsync(token.address, user, bridgeAmount, chainAId, salt, {from: user});

//             // console.log("RECEIPT:", receipt);

//             // let emittedEventsB = await eventEmitterBV.getPastEvents("EventEmitted", {fromBlock: 0});
            

//             // let merkleTreeB = await eventsToMerkleProof(emittedEventsB, eventUtil);
            
//             // await eventListenerB.updateProof.sendTransactionAsync(chainAId, merkleTreeB.getHexRoot());

//             // const proofB = merkleTreeB.getHexProof(merkleTreeB.elements[0]);
        
//             // receipt = await escrow.claim.sendTransactionAsync(token.address, user, bridgeAmount, chainBId, salt, 0, proofB, {from : user, gas: 4000000});

//         })
//     })

    
//     teardown(() => {
//         pe.stop();
//     })
    
// })