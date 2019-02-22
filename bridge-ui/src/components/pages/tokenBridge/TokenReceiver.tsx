import React from 'react';
import { withStyles, LinearProgress, Typography } from '@material-ui/core';
import { connect } from 'react-redux';
import { toBN, toWei, fromWei, randomHex, BN } from 'web3-utils';
import bridgeActionTypes from '../../../reducers/bridge/bridgeActionTypes';
import {ethers} from 'ethers';
import getConfigValue, {getConfigValueByName} from '../../../utils/getConfigValue';


import EscrowArtifact from '@ohdex/contracts/build/artifacts/Escrow.json'
import BridgeArtifact from '@ohdex/contracts/build/artifacts/Bridge.json'

import { BigNumber } from 'ethers/utils';

const styles = (theme:any) => ({

})

class TokenReceiver extends React.Component<any> {

    state = {
        approveTxId: "",
        bridgeTxId: "",
        success: false,
    }

    salt:BN = toBN(0);

    chainBProvider:any = null;

    componentDidMount() {
        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue: false,
        })
        
        const {tokenAddress, tokenAmount, chainB, chainA, bridgingBack, originTokenAddress} = this.props.bridge;
        const {drizzle, drizzleState} = this.props;

        const chainAID = getConfigValueByName(chainA, "chainId");
        const chainBID = getConfigValueByName(chainB, "chainId");
        
        const weiTokenAmount = toWei(tokenAmount);
        const from = drizzleState.accounts[0];
            
        const salt = toBN(randomHex(32));
        this.salt = salt;

        let ethersProvider = new ethers.providers.JsonRpcProvider(getConfigValueByName(chainB, "rpcUrl"));
        ethersProvider.polling = true;
        ethersProvider.pollingInterval = 1000;
    
        this.chainBProvider = new ethers.providers.Web3Provider(ethersProvider);

        if(!bridgingBack) {
            const Escrow = drizzle.contracts.Escrow;
            const approveTxId = drizzle.contracts[tokenAddress].methods.approve.cacheSend(Escrow.address, weiTokenAmount, {from});
            // address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt
            console.log(getConfigValueByName(chainB, 'bridgeAddress'), tokenAddress, from, weiTokenAmount, chainBID, salt);
            
            const bridgeTxId = Escrow.methods.bridge.cacheSend(
                getConfigValueByName(chainB, 'bridgeAddress'), 
                tokenAddress, from, weiTokenAmount, chainBID, salt, {from}
            );

            this.setState({
                approveTxId,
                bridgeTxId,
            })

            // event BridgedTokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );
            const bridge = new ethers.Contract(
                getConfigValueByName(chainB, "bridgeAddress"), BridgeArtifact.compilerOutput.abi, this.chainBProvider
            );
            const filter = bridge.filters.BridgedTokensClaimed(tokenAddress, from, null, chainAID, null);
            bridge.on(filter, this.tokensClaimed);
        } else {
            // TODO Test this code
            const Bridge = drizzle.contracts.Bridge;
            // bridge(address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt)
            // function bridge(bytes32 _targetBridge, address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt)
            const bridgeTxId = Bridge.methods.bridge.cacheSend(
                getConfigValueByName(chainB, 'escrowAddress'), originTokenAddress, from, weiTokenAmount, chainBID, salt, {from}
            );

            this.setState({
                bridgeTxId,
            })

            // event OriginTokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );
            const escrow = new ethers.Contract(
                getConfigValueByName(chainB, "escrowAddress"), EscrowArtifact.compilerOutput.abi, this.chainBProvider
            );
            const filter = escrow.filters.OriginTokensClaimed(originTokenAddress, from, null, chainAID, null);
            escrow.on(filter, this.tokensClaimed);
        }
    }

    tokensClaimed = (token:string, receiver:string, amount:any, chainId:any, salt:any) => {
        const {tokenAmount} = this.props.bridge;  
        const weiTokenAmount = toWei(tokenAmount);

        console.log(`Received ${fromWei(amount)} ${token} at ${receiver} from chain ${chainId} with salt: ${salt}`)
        
        if(weiTokenAmount == amount && salt == this.salt) {
            this.setState({
                success: true
            })
        }
    }

    render() {
        const {progress, stateMessage} = this.bridgingState();
        const {success} = this.state;
        const {tokenAmount, bridgingBack, tokenAddress, originTokenAddress} = this.props.bridge;

        return (
            <>
                {!success ?
                    <> 
                        <Typography align="center"> {stateMessage} </Typography>
                        <LinearProgress variant="determinate" value={progress} />
                    </>
                 :
                    <>
                        <Typography align="center">Tokens Bridged!</Typography>
                        <Typography align="center">Received {tokenAmount} at token address: {bridgingBack ? originTokenAddress : tokenAddress}</Typography>
                    </>
                }
            </>    
        )
    }

    bridgingState() {
        const {drizzleState} = this.props;
        const {transactions, transactionStack} = drizzleState;
        const {approveTxId, bridgeTxId, success} = this.state;


        let stateMessage = "";
        let progress = 0; 

        if(approveTxId == "" || bridgeTxId == "" || !transactions[transactionStack[approveTxId]] || !transactions[transactionStack[bridgeTxId]]) {
            stateMessage = "Awaiting transaction approval";
            progress = 0;
        } else if (transactions[transactionStack[approveTxId]].status == "pending" || transactions[transactionStack[bridgeTxId]].status == "pending" ) {
            stateMessage = "Awaiting confirmation of transactions";
            progress = 25;
        } else if (transactions[transactionStack[approveTxId]].status == "success" || transactions[transactionStack[bridgeTxId]].status == "success" && !success) {
            stateMessage = "Transactions confirmed waiting for relayers to bridge tokens";
            progress = 50;
        } 
        else {
            progress = 0; 
            stateMessage = "Unknown state"
        }

        return {progress, stateMessage};
    }
}



const styledTokenReceiver = withStyles(styles)(TokenReceiver);

export default connect((state:any) => ({
    bridge: state.bridge,
}))(styledTokenReceiver);