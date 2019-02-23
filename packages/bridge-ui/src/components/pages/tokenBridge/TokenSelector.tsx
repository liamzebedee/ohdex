import React from 'react'
import {TextField, withStyles} from '@material-ui/core';
import {isAddress} from 'web3-utils';
import bridgeActionTypes from '../../../reducers/bridge/bridgeActionTypes'
import {connect} from 'react-redux';

const styles = (theme:any) => ({
    textField: {
        width: "100%"
    }
})
class TokenSelector extends React.Component<any> {

    constructor(props:any) {
        super(props);
    }

    componentDidMount() {
        this.setCanContinue();
    }

    render(){
        const {classes} = this.props;
        const {tokenAddress, tokenAddressValid} = this.props.bridge;

        return(
            <>
                <form className={classes.container} noValidate autoComplete="off">
                    <TextField
                    error={!tokenAddressValid && tokenAddress != ""}
                    id="token-address"
                    label="Token Address"
                    className={classes.textField}
                    value={tokenAddress}
                    onChange={this.handleChange}
                    margin="normal"
                    />
                </form>
            </>
        )
    }

    handleChange = async (event:any) => {
        await this.props.dispatch({
            type: bridgeActionTypes.SET_TOKEN_ADDRESS_AND_VALID,
            tokenAddress: event.target.value,
            tokenAddressValid: isAddress(event.target.value)
        })

        this.setCanContinue();
    }


    setCanContinue = () => {
        const {tokenAddressValid} = this.props.bridge;

        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue: tokenAddressValid
        })
            
    }

}


const styledTokenSelector = withStyles(styles)(TokenSelector);

export default connect(state => ({
    bridge: state.bridge,
}))(styledTokenSelector);