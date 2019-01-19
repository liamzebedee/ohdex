import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import getWeb3 from "./utils/getWeb3";
import { DrizzleContext } from 'drizzle-react';
import { Drizzle, generateStore } from "drizzle";


import "./App.css";

function drizzleContract(web3, name) {
  return {
    contractName: name,
    web3Contract: new web3.eth.Contract(
      require(`./contracts/${name}.json`), 
      "0x"
    )
  }
}

let drizzle; 

class App extends Component {
  state = { 
    drizzle: null, 
    web3: null, accounts: null, contract: null 
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      drizzle = new Drizzle({
        contracts: [
          // drizzleContract('CrosschainBank')
        ]
      })

      this.setState({
        drizzle
      })

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = SimpleStorageContract.networks[networkId];
      const instance = new web3.eth.Contract(
        SimpleStorageContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runExample);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runExample = async () => {
    const { accounts, contract } = this.state;

    // Stores a given value, 5 by default.
    await contract.methods.set(5).send({ from: accounts[0] });

    // Get the value from the contract to prove it worked.
    const response = await contract.methods.get().call();

    // Update state with the result.
    this.setState({ storageValue: response });
  };

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    if(!this.state.drizzle) {
      return <div>Loading...</div>
    }
    return (
      <div className="App">
        <DrizzleContext.Provider drizzle={drizzle}>
          <DrizzleContext.Consumer>
          {drizzleContext => {
              const { drizzle, drizzleState, initialized } = drizzleContext;
              console.log(drizzleState);
              // web3.eth.net.getId()
            }
          }
          </DrizzleContext.Consumer>
        </DrizzleContext.Provider>
      </div>
    );
  }
}

export default App;
