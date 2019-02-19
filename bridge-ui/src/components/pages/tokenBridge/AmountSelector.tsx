import React from 'react';
import {withStyles, TextField, Typography} from '@material-ui/core';
import { connect } from 'react-redux';
import bridgeActionTypes from '../../../reducers/bridge/bridgeActionTypes';
import ERC20ABI from '../../../abis/ERC20';
import { fromWei } from 'web3-utils';


const styles = (theme:any) => ({
    textField: {
        width: "100%"
    }
})

class AmountSelector extends React.Component<any> {

    state = { dataKey: null};
    balance = "";

    componentDidMount() {
        const {drizzle, drizzleState} = this.props;
        const {tokenAddress, bridgingNative} = this.props.bridge;
        
        if(!bridgingNative) {
            const contractObject = {
                contractName: this.props.bridge.tokenAddress,
                web3Contract: new drizzle.web3.eth.Contract(ERC20ABI, tokenAddress)
            } 
            drizzle.addContract(contractObject);

            const tokenContract = drizzle.contracts[tokenAddress];
            const dataKey = tokenContract.methods.balanceOf.cacheCall(drizzleState.accounts[0]);

            this.setState({
                dataKey
            })

            this.setCanContinue();
            this.setBridgeBack();
        }
    }

    render() {
        const {classes, drizzle, drizzleState} = this.props;
        const {tokenAmount, bridgingNative} = this.props.bridge

        let balance = "Loading....";

        if(drizzle.contracts[this.props.bridge.tokenAddress] != undefined) {
            drizzle.contracts[this.props.bridge.tokenAddress].balanceOf;
            
            const data = drizzleState.contracts[this.props.bridge.tokenAddress].balanceOf[this.state.dataKey];
            
            if(!data) {
                balance = "Loading...."
            } else {
                balance = fromWei(data.value);
                this.balance = balance;
            }

        } else if(bridgingNative) {
            balance = fromWei(drizzleState.accountBalances[drizzleState.accounts[0]]);
            this.balance = balance;
        }
    
        return(
            <>  
                <Typography>Balance: {balance}</Typography>
                <form className={classes.container} noValidate autoComplete="off">
                    <TextField
                        id="token-amount"
                        label="Amount"
                        className={classes.textField}
                        value={tokenAmount}
                        onChange={this.handleChange}
                        margin="normal"
                        type="number"
                    />

                    <Typography>Enter the amount of tokens you would like to bridge. You will be asked to sign two transactions to bridge your tokens.</Typography>
                </form>
            </>
        )
    }

    handleChange = async (event:any) => {
        await this.props.dispatch({
            type: bridgeActionTypes.SET_TOKEN_AMOUNT,
            tokenAmount: event.target.value
        })

        this.setCanContinue();
    }

    setCanContinue = () => {
        const {tokenAmount} = this.props.bridge;

        const canContinue = tokenAmount != "" && tokenAmount != 0 && Number(this.balance) >= Number(tokenAmount);

        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue
        })    
    }

    setBridgeBack = async () => {
        const {drizzle, drizzleState} = this.props;
        const {tokenAddress} = this.props.bridge;
        const {chainB} = this.props.bridge;

        const bridgeContract = drizzle.contracts.Bridge;
        const originToken = await bridgeContract.methods.getOriginToken(tokenAddress).call();
        
        let bridgingBack = false;
        let originTokenAddress = "";

        //If token is being bridged back
        if(originToken.network == chainB){
            bridgingBack = true;
            originTokenAddress = originToken.address;
        }

        this.props.dispatch({
            type: bridgeActionTypes.SET_BRIDGING_BACK,
            bridgingBack,
            originTokenAddress
        }) 

    }
}

const styledAmountSelector = withStyles(styles)(AmountSelector);

export default connect((state:any) => ({
    bridge: state.bridge,
}))(styledAmountSelector);