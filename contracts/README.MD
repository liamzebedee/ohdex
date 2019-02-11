## 0DEX


### Running the dev chain

ganache cli is a bit funky with the token factory in Bridge.sol. So instead we user parity as our development server. You need to have a recent version of parity installed on your system. \

Run the following command to create the test account keys and add them to the chainspec:

```
yarn newTestAccounts
```

After this simpy start the parity dev server with the following command:

```
yarn testchain:parity
```

If you want to use ganache as devchain run: 

```
yarn devchain:ganache
```
