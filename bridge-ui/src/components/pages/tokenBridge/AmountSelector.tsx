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
    balance = 0;

    componentDidMount() {
        const {drizzle, drizzleState} = this.props;
        
        // On mount add token contract to truffle
        const contractObject = {
            contractName: this.props.bridge.tokenAddress,
            web3Contract: new drizzle.web3.eth.Contract(ERC20ABI, this.props.bridge.tokenAddress)
        } 
        
        drizzle.addContract(contractObject);

        const tokenContract = drizzle.contracts[this.props.bridge.tokenAddress];

        const dataKey = tokenContract.methods.balanceOf.cacheCall(drizzleState.accounts[0]);

        this.setState({
            dataKey
        })

        this.setCanContinue();
    }

    render() {
        const {classes, drizzle, drizzleState} = this.props;

        const {tokenAmount} = this.props.bridge

        let balance = "Loading....";

        if(drizzle.contracts[this.props.bridge.tokenAddress] != undefined) {
            drizzle.contracts[this.props.bridge.tokenAddress].balanceOf;
            
            const data = drizzleState.contracts[this.props.bridge.tokenAddress].balanceOf[this.state.dataKey];
            
            // data not present yet
            if(!data) {
                balance = "Loading...."
            } else {
                balance = fromWei(data.value);
                this.balance = balance;
            }

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

                    <Typography>Enter the amount of tokens you would like to bridge</Typography>
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

        const canContinue = (this.balance as Number) >= (tokenAmount as Number);

        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue
        })
            
    }
}

const styledAmountSelector = withStyles(styles)(AmountSelector);

export default connect(state => ({
    bridge: state.bridge,
}))(styledAmountSelector);