### Description

Trading in the Uniswap using V2 and V3 sdk

### Environment

1. Run `npm install` to install dependencies
2. Run `npm run install:chain` to install Foundry, which is the blockchain developement environment tool.
3. Open new terminal run `npm run start:chain <provider_API_URL>`. You can get provider_API_URL in infura.io or alchemy.com. For example you can run this command to fork the blockchain to your local enviroment.
`npm run start:chain https://eth-mainnet.g.alchemy.com/v2/18GaGiQyDCtRjm2YdhEreGmyMXGbfA3s`
4. Modify the file `src/config.ts` to set your wallet's privateKey.


### Wrap WETH

Because WETH is used as the local currency by default, you will not be able to trade if you do not have WETH in your account. You can use wrap_eth.ts to convert ETH to WETH.

```javascript
ts-node wrap_eth.ts
```

### Usage

For v2 version

Use 1 WETH to exchange for DAI. Currently v2 tokenIn is the default, and the WETH used can be modified later.
The parameter is tokenOut
```javascript
ts-node src/trade_v2.js 0x6B175474E89094C44Da98b954EedeAC495271d0F   
```

For v3 version
The parameters are tokenIn, tokenOut, amountIn, fee
```javascript
ts-node src/trade_v3.ts 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 0x38e68a37e401f7271568cecaac63c6b1e19130b4 1 1000
0
```

For smart-order-router
Note: This have to run in the mainnet! Local RPC environment doesn't work.

```javascript
// ts-node src/route.ts tokenIn tokenOut amountIn
// quote 10000 tokens for WETH
ts-node src/route.ts 0x42bbfa2e77757c645eeaad1655e0911a7553efbc 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 10000 
```


### Note

All code has only been tested on the local test network and is for learning purposes only