import React from 'react';
import { Grid, withStyles, Stepper, Step, StepLabel, Paper } from '@material-ui/core';
import NetworkPicker from './NetworkPicker';
import TokenSelector from './TokenSelector';

const styles = (theme:any) => ({
    root : {
        marginTop: theme.spacing.unit * 4,
    }, 
    paper: {
        padding: theme.spacing.unit * 4,
        minHeight: "50vh",
    }
})


class TokenBridge extends React.Component<any> {
    
    constructor(props:any) {
        super(props);
        this.state = {
            currentStep: 0,
            selectedChain: 1,
            selectedToken: "",
        }

    }
    
    render(){
        const {classes} = this.props;
        const steps = this.getSteps();

        return(
            <Grid container className={classes.root} spacing={16} justify="center">
                
                <Grid item md={6}>
                    <Paper className={classes.paper}>
                    
                        <Stepper alternativeLabel nonLinear activeStep={this.state.currentStep}>
                            {steps.map((label, index) => {
                                const props = {};      
                                return (
                                <Step key={label} {...props}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                                );
                            })}
                        </Stepper>

                        {this.getStepContent(this.state.currentStep)}
                    </Paper>
                </Grid>
            </Grid>
        )
    }


    getSteps = () => {
        return [
            "Select Origin Chain",
            "Select Token",
            "Bridge Tokens",
            "Receive Bridged Tokens"
        ]
    }

    getStepContent = (step:number) => {
        switch (step) {
          case 0:
            return <NetworkPicker nextFunction={this.handleNext} drizzleState={this.props.drizzleState} />;
          case 1:
            return <TokenSelector />;
          case 2:
            return 'Step 3: This is the bit I really care about!';
          default:
            return 'Unknown step';
        }
    }

    handleNext = (event) => {
        this.setState((prevState) => ({
            currentStep: prevState.currentStep + 1
        }))
    }
}

export default withStyles(styles)(TokenBridge)