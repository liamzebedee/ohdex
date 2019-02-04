import React from 'react';
import {FormControl, InputLabel, Select, MenuItem, withStyles, Typography, Button} from '@material-ui/core';
import networks from "../../../../../config/networks";


const styles = (theme:any) => ({
    root : {
        height: "100%",
        position: "relative",
        marginBottom: theme.spacing.unit * 10,
    },
    formControl : {
       width: "100%",
    },
    nextButton: {
        // position: "absolute",
        // right: 0,
        // bottom: 0,
    }
})


class NetworkPicker extends React.Component<any> {

    constructor(props:any){
        super(props);
        this.state = {
            selectedChain: 0,
            currentChain: 0,
        }
    }

    componentDidMount() {

        const currentChainId = this.props.drizzleState.web3.networkId;

        if(this.getChainSupported(currentChainId)) {
            this.setState({
                selectedChain: currentChainId
            });
        }

        this.setState({
            currentChain: currentChainId
        })
    }

    render() {
        const {classes} = this.props;
        const chains = this.getChains();
        const {currentChain, selectedChain} = this.state;

        return (
            <div className={classes.root}>
                <FormControl className={classes.formControl}>
                    <InputLabel htmlFor="network">Select Chain</InputLabel>
                    <Select
                        value={this.state.selectedChain}
                        onChange={this.handleChange('selectedChain')}
                        inputProps={{
                        name: 'selected-chain',
                        id: 'selected-chain',
                        }}
                    >   
                        {
                            chains.map((network) => {
                                return <MenuItem key={network.chainId} value={network.chainId}>{network.name}</MenuItem>
                            })
                        }
                    </Select>
                </FormControl>

                {currentChain == selectedChain && 
                    <>
                        <Typography>Metamask is set up to the same network as you selected. If you want to bridge a token from the selected network press the button below.</Typography>
                        <Button className={classes.nextButton} onClick={this.props.nextFunction} variant="contained" color="primary">Next Step</Button>
                    </>
                }

                {currentChain != selectedChain && 
                    <Typography>Please select the network from which you like to bridge your tokens and also select this network in Metamask.</Typography>
                }
            </div>
        );
    }

    handleChange = (propName:string) => (event:any) => {
        this.setState({
            [propName]: event.target.value
        });
    };

    getChains = () => {
        let chains = [];

        let networkKeys = Object.keys(networks);

        for(let i = 0; i < networkKeys.length; i ++) {
            const chainId = networks[networkKeys[i]].chainId
            chains.push({chainId, name: networkKeys[i] });
        }

        return chains;
    }

    getChainSupported(chainId:number) {
        const chains = this.getChains();

        for(let i = 0; i < chains.length; i ++) {
            if(chains[i].chainId == chainId) {
                return true;
            }
        }
        return false;
    }



}


export default withStyles(styles)(NetworkPicker);