import React from 'react';
import {FormControl, InputLabel, Select, MenuItem, withStyles, Typography, Button} from '@material-ui/core';
import {getChainName, networks} from '../../../utils/getConfigValue';
import {connect} from 'react-redux';
import bridgeActionTypes from '../../../reducers/bridge/bridgeActionTypes';
import { node } from 'prop-types';


const styles = (theme:any) => ({
    formControl : {
        width: "100%",
    },
    spacer : {
        marginBottom: theme.spacing.unit * 4
    }
})


class NetworkPicker extends React.Component<any> {

    state = {
        currentChain: "",
    }

    constructor(props:any){
        super(props);
    }

    componentDidMount() {

        const currentChain = getChainName(this.props.drizzleState.web3.networkId);

        this.firstRender();

        this.setState({
            currentChain: currentChain
        })

        console.log(currentChain);
    }



    render() {
        const {classes} = this.props;
        const chains = this.getChains();
        const {currentChain} = this.state;

        const {chainA, chainB} = this.props.bridge;

        return (
            <div className={classes.root}>
                <FormControl className={classes.formControl}>
                    <InputLabel htmlFor="network">Select Origin Chain</InputLabel>
                    <Select
                        value={chainA}
                        onChange={this.handleChange('chainA')}
                        inputProps={{
                        name: 'selected-chain-a',
                        id: 'selected-chain-a',
                        }}
                    >   
                        {
                            chains.map((network) => {
                                return <MenuItem key={network.name} value={network.name}>{network.name}</MenuItem>
                            })
                        }
                    </Select>

                    
                </FormControl>

                
                {currentChain == chainA && 
                    <Typography>Metamask is set up to the same network as you selected. If you want to bridge a token from the selected network press the button below.</Typography>
                }

                {currentChain != chainA && 
                    <Typography>Please select the network from which you like to bridge your tokens and also select this network in Metamask.</Typography>
                }

                <div className={classes.spacer}></div>


                <FormControl className={classes.formControl}>
                    <InputLabel htmlFor="network">Select Destination Chain</InputLabel>
                    <Select
                        value={chainB}
                        onChange={this.handleChange('chainB')}
                        inputProps={{
                        name: 'selected-chain-b',
                        id: 'selected-chain-b',
                        }}
                    >   
                        {
                            chains.map((network) => {
                                return <MenuItem key={network.name} value={network.name}>{network.name}</MenuItem>
                            })
                        }
                    </Select>

                    
                </FormControl>

                <Typography>Select the chain on which you would like to receive the tokens</Typography>

                <div className={classes.spacer}></div>

                
            </div>
        );
    }

    firstRender = async () => {
        const currentChainId = this.props.drizzleState.web3.networkId;

        if(this.getChainSupported(currentChainId)) {
            await this.props.dispatch({
                type: bridgeActionTypes.SET_CHAIN_A,
                chainId: getChainName(currentChainId)
            })
            this.setCanContinue();
        }
    }

    setCanContinue = () => {
        const {currentChain} = this.state;
        const {chainA, chainB} = this.props.bridge;

        // HACK(liamz)
        const currentChainValid = (currentChain == chainA) || process.env.NODE_ENV == 'development';
        const canContinue = currentChainValid && chainA != chainB && this.getChainSupported(chainA) && this.getChainSupported(chainB);

        this.props.dispatch({
            type: bridgeActionTypes.SET_CAN_CONTINUE,
            canContinue
        })
            
    }

    handleChange =  (propName:string) => async (event:any) => {
        this.setState({
            [propName]: event.target.value
        });

        let type;

        if(propName == "chainA") {
            type = bridgeActionTypes.SET_CHAIN_A
        } else {
            type = bridgeActionTypes.SET_CHAIN_B
        }

        await this.props.dispatch({
            type,
            chainId: event.target.value
        })
        
        this.setCanContinue();
    };

    getChains = () => {
        let chains = [];

        let networkKeys = Object.keys(networks);

        for(let i = 0; i < networkKeys.length; i ++) {
            const { chainId } = networks[networkKeys[i]]
            chains.push({
                chainId, 
                name: networkKeys[i]
            });
        }

        return chains;
    }

    getChainSupported(chainId:number) {
        console.log(`Development environment - accepting any chains`)
        if(process.env.NODE_ENV == 'development') return true;

        const chains = this.getChains();

        for(let i = 0; i < chains.length; i ++) {
            if(chains[i].chainId == chainId) {
                return true;
            }
        }
        return false;
    }

}


const styledNetworkPicker =  withStyles(styles)(NetworkPicker);

export default connect(state => ({
    bridge: state.bridge,
}))(styledNetworkPicker);