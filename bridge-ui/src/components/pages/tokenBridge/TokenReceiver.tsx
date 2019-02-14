import React from 'react';
import { withStyles, LinearProgress, Typography } from '@material-ui/core';
import { connect } from 'react-redux';
import { toBN, toWei, randomHex } from 'web3-utils';
import bridgeActionTypes from '../../../reducers/bridge/bridgeActionTypes';
import Web3 from 'web3';
import getConfigValue from '../../../utils/getConfigValue';
import BridgeABI from '../../../../../contracts/build/contracts/Bridge.json'

const styles = (theme:any) => ({

})

class TokenReceiver extends React.Component<any> {

    state = {
        approveTxId: "",
        bridgeTxId: "",
        salt: undefined,
    }
    chainBProvider:any = null;

    componentDidMount() {
        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue: false,
        })
        
        const {tokenAddress, tokenAmount, chainB, chainA, bridgingBack, originTokenAddress} = this.props.bridge;
        const {drizzle, drizzleState} = this.props;

        
        const weiTokenAmount = toWei(tokenAmount);
        const from = drizzleState.accounts[0];
            
        const salt = toBN(randomHex(32));

        this.chainBProvider = new Web3(getConfigValue(this.props.bridge.chainB, "rpcUrl"));

        if(!bridgingBack) {
            const Escrow = drizzle.contracts.Escrow;
            const approveTxId = drizzle.contracts[tokenAddress].methods.approve.cacheSend(Escrow.address, weiTokenAmount, {from});
            // address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt
            const bridgeTxId = Escrow.methods.bridge.cacheSend(tokenAddress, from, weiTokenAmount, chainB, salt, {from});

            this.setState({
                approveTxId,
                bridgeTxId,
                salt
            })

            // event BridgedTokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );
            const bridge = new this.chainBProvider.eth.Contract(BridgeABI.abi, getConfigValue(chainB, "bridgeAddress"));
            bridge.events.BridgedTokensClaimed({filter: {token: tokenAddress, receiver: from, chainId: chainA}}, this.bridgedTokensClaimed);

        } else {
            // TODO Test this code
            const Bridge = drizzle.contracts.Bridge;
            // bridge(address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt)
            const bridgeTxId = Bridge.methods.bridge.cacheSend(originTokenAddress, from, weiTokenAmount, chainB, salt, {from});

            this.setState({
                bridgeTxId,
                salt
            })

            // event OriginTokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );
            const escrow = new this.chainBProvider.eth.Contract(BridgeABI.abi, getConfigValue(chainB, "escrowAddress"));
            escrow.events.OriginTokensClaimed({filter: {token: originTokenAddress, receiver: from, chainId: chainA}}, this.originTokensClaimed);
        }
    }

    bridgedTokensClaimed = (error:any, event:any) => {
        if(error) {
            console.error(error);
            return;
        }
        alert("You received the bridge tokens");
        // TODO Implement user feedback on receiving tokens and parameter checking
    }

    originTokensClaimed = (error:any, event:any) => {
        if(error) {
            console.error(error);
            return;
        }
        alert("You received the origin tokens");
        // TODO Implement user feedback on receiving tokens and parameter checking
    }

    render() {
        const {progress, stateMessage} = this.bridgingState();

        return (
            <>
                <Typography align="center"> {stateMessage} </Typography>
                <LinearProgress variant="determinate" value={progress} />
            </>
        )
    }

    bridgingState() {
        const {drizzleState} = this.props;
        const {transactions, transactionStack} = drizzleState;
        const {approveTxId, bridgeTxId} = this.state;


        let stateMessage = "";
        let progress = 0; 

        if(approveTxId == "" || bridgeTxId == "" || !transactions[transactionStack[approveTxId]] || !transactions[transactionStack[bridgeTxId]]) {
            stateMessage = "Awaiting transaction approval";
            progress = 0;
        } else if (transactions[transactionStack[approveTxId]].status == "pending" || transactions[transactionStack[bridgeTxId]].status == "pending" ) {
            stateMessage = "Awaiting confirmation of transactions";
            progress = 25;
        } else if (transactions[transactionStack[approveTxId]].status == "success" || transactions[transactionStack[bridgeTxId]].status == "success" ) {
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