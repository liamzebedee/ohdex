ohdex
=====

[![CircleCI](https://circleci.com/gh/liamzebedee/ohdex/tree/master.svg?style=svg)](https://circleci.com/gh/liamzebedee/ohdex/tree/master)

Bridge tokens between chains.

Copyright Liam Zebedee and Mick de Graaf, 2019.

## Setup
```
yarn
cd packages/

cd contracts/
yarn build

cd multichain/
yarn start run --chain ethereum --name kovan
yarn start run --chain ethereum --name rinkeby

cd deployer/
NODE_ENV=development yarn deploy:testnets

cd relayer/
NODE_ENV=development yarn start

cd bridge-ui/
NODE_ENV=development yarn dev
```

## Faucets for testnets

- [POA SOKOL](https://faucet.poa.network/)
- [GOERLI](https://goerli-faucet.slock.it/)
- [Rinkeby](https://faucet.rinkeby.io/) 
- [Kovan](https://faucet.kovan.network/)
- [Ropsten](https://faucet.ropsten.be/)


