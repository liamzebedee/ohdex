import React from 'react';
import {Grid, Typography, withStyles, TextField, Button} from '@material-ui/core';

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

    constructor(props:any) {
        super(props);

        this.state = {
            tokenName: "",
            tokenSymbol: "",
            initialSupply: 0,
        }
    }

    render(){

        const{classes} = this.props;

        return(

            <div>
                

                <Grid container justify="center">
                    <Grid item md={6} className={classes.root}>
                        <Typography variant="h2">Create Token</Typography>
                        <form>
                            <Grid container spacing={16}>
                                <Grid item md={6}>
                                    <TextField
                                        id="token-name"
                                        label="Token Name"
                                        className={classes.textField}
                                        value={this.state.tokenName}
                                        onChange={this.handleChange('tokenName')}
                                        margin="normal"
                                    />
                                </Grid>
                                <Grid item md={6}>
                                    <TextField
                                        id="token-symbol"
                                        label="Token Symbol"
                                        className={classes.textField}
                                        value={this.state.tokenSymbol}
                                        onChange={this.handleChange('tokenSymbol')}
                                        margin="normal"
                                    />
                                </Grid>

                                <Grid item md={6}>
                                    <TextField
                                        id="initial-supply"
                                        label="Initial Supply"
                                        className={classes.textField}
                                        value={this.state.initialSupply}
                                        onChange={this.handleChange('initialSupply')}
                                        margin="normal"
                                        type="number"
                                    />
                                </Grid>


                                <Grid item md={12} justify="center">
                                    <Button className={classes.createButton} variant="contained" color="primary" size="large">Create</Button>
                                </Grid>

                            </Grid>
                        </form>
                    </Grid>
                
                </Grid>

            </div>
        )
    }

    handleChange = (propName:string) => (event:any) => {
        this.setState({
            [propName]: event.target.value
        });
        console.log("update");
    };

}

export default withStyles(styles)(TokenBridge);