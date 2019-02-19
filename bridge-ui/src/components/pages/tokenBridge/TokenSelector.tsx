import React from 'react'
import {TextField, withStyles, FormControlLabel, Checkbox} from '@material-ui/core';
import {isAddress} from 'web3-utils';
import bridgeActionTypes from '../../../reducers/bridge/bridgeActionTypes'
import {connect} from 'react-redux';

const styles = (theme:any) => ({
    textField: {
        width: "100%"
    }
})
class TokenSelector extends React.Component<any> {

    state = {
        checkBridgeNative: false,
    }

    constructor(props:any) {
        super(props);
    }

    componentDidMount() {
        this.setCanContinue();
    }

    render(){
        const {classes} = this.props;
        const {tokenAddress, tokenAddressValid, bridgingNative} = this.props.bridge;

        return(
            <>
                <form className={classes.container} noValidate autoComplete="off">

                    {!bridgingNative && 
                        <TextField
                            error={!tokenAddressValid && tokenAddress != ""}
                            id="token-address"
                            label="Token Address"
                            className={classes.textField}
                            value={tokenAddress}
                            onChange={this.handleChange}
                            margin="normal"
                        />
                    }

                    <FormControlLabel
                        control={
                            <Checkbox
                            checked={bridgingNative}
                            onChange={this.handleCheck}
                            value="checkBridgeNative"
                            color="primary"
                            />
                        }
                        label="Bridge Native Token"
                    />
                </form>
            </>
        )
    }

    handleCheck = async (event:any) => {

        await this.props.dispatch({
            type: bridgeActionTypes.TOGGLE_BRIDGING_NATIVE
        })

        this.setCanContinue();
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
        const {tokenAddressValid, bridgingNative} = this.props.bridge;

        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue: tokenAddressValid || bridgingNative
        })
            
    }

}


const styledTokenSelector = withStyles(styles)(TokenSelector);

export default connect(state => ({
    bridge: state.bridge,
}))(styledTokenSelector);