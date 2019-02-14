import React from 'react';
import {Grid, Typography, withStyles, TextField, Button} from '@material-ui/core';
import tokenAbi from '../../../../../contracts/build/contracts/CustomToken';
import {toWei} from 'web3-utils';

const styles:any = (theme:any) => ({
    root:{
        marginTop: theme.spacing.unit * 4,
    },
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        width: "100%",
    },
    createButton: {
        float: "right",
    }
})

class TokenBridge extends React.Component<any> {

    state = {
        tokenName: "",
        tokenSymbol: "",
        tokenAddress: "",
        initialSupply: "",
        state: "setup",
    }

    constructor(props:any) {
        super(props);
    }

    render(){

        const{classes} = this.props;
        const{state, tokenAddress, initialSupply, tokenName, tokenSymbol} = this.state;

        return(

            <div>
                <Grid container justify="center">
                    <Grid item md={6} className={classes.root}>
                        
                        <form>
                            <Grid container spacing={16}>
                                {state == "setup" && <>
                                    <Typography variant="h2">Create Token</Typography>
                                    <Grid item md={6}>
                                        <TextField
                                            id="token-name"
                                            label="Token Name"
                                            className={classes.textField}
                                            value={tokenName}
                                            onChange={this.handleChange('tokenName')}
                                            margin="normal"
                                        />
                                    </Grid>
                                    <Grid item md={6}>
                                        <TextField
                                            id="token-symbol"
                                            label="Token Symbol"
                                            className={classes.textField}
                                            value={tokenSymbol}
                                            onChange={this.handleChange('tokenSymbol')}
                                            margin="normal"
                                        />
                                    </Grid>

                                    <Grid item md={6}>
                                        <TextField
                                            id="initial-supply"
                                            label="Initial Supply"
                                            className={classes.textField}
                                            value={initialSupply}
                                            onChange={this.handleChange('initialSupply')}
                                            margin="normal"
                                            type="number"
                                        />
                                    </Grid>


                                    <Grid item md={12} justify="center">
                                        {this.inputValid() && <Button onClick={this.createToken} className={classes.createButton} variant="contained" color="primary" size="large">Create</Button> }
                                    </Grid>
                                </>}

                                {state == "pending" && <>
                                    <Typography align="center">Transaction Pending...</Typography>                            
                                </>}

                                {state == "done" && <>
                                    <Typography align="center">Token deployed at: {tokenAddress}</Typography>
                                </>}
                            </Grid>
                        </form>
                    </Grid>
                
                </Grid>

            </div>
        )
    }

    createToken = async (event:any) => {
        const {drizzle, drizzleState} = this.props;
        const {web3} = drizzle;
        const {tokenName, tokenSymbol, initialSupply} = this.state;
        const from = drizzleState.accounts[0];

        this.setState({
            state: "pending"
        })

        const newToken = await new web3.eth.Contract(tokenAbi.abi).deploy({data : tokenAbi.bytecode, arguments: [tokenName, tokenSymbol, toWei(initialSupply)]}).send({from}) ;

        this.setState({
            state: "done",
            tokenAddress: newToken.options.address
        })
    }

    handleChange = (propName:string) => (event:any) => {
        this.setState({
            [propName]: event.target.value
        });
    };

    inputValid = () => {
        const{state, tokenAddress, initialSupply, tokenName, tokenSymbol} = this.state;
        return(tokenName != "" && tokenSymbol != "" && initialSupply != "");
    }

}

export default withStyles(styles)(TokenBridge);