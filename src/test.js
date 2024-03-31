require('dotenv').config();

const { ethers, BigNumber } = require("ethers");
const { EventEmitter } = require("events");
const { getWallet } = require('./providers');
const { checkAllowance,getERC20Balance, fetchToken } = require('./contracts');
const { toReadableAmount } = require('./utils');
const util = require('util')
const { WETH_CONTRACT_ADDRESS, ERC20_ABI, V3_SWAP_ROUTER_ADDRESS } = require('./constants');
const { SupportedChainId } = require('@uniswap/sdk-core');
const infuraUrl = "https://linea-mainnet.infura.io/v3/299ad94a7a924ddd85057223b3a86f93";
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

const account = getWallet()

EventEmitter.defaultMaxListeners = 15;

async function main() {
    
    var balance = await account.getBalance();
    console.log("wallet balance:", toReadableAmount(balance));

    const tokenAddress = "0x5eca7b975e34567d9460fa613013a7a6993ad185";
    const ftoken = await fetchToken(tokenAddress)
    console.log(util.inspect(ftoken))
    // balance = await getERC20Balance(tokenAddress);
    const gasPrice = await provider.getGasPrice()
    console.log(`gasPrice: ${gasPrice}`)

    const token = "0xb9f599ce614Feb2e1BBe58F180F370D05b39344E"
    const allowance = await checkAllowance(token, account.address, V3_SWAP_ROUTER_ADDRESS).catch(error=>{
        console.log(`checkAllowance error:\n ${error}`)
    })
    console.log(`allowance: ${allowance}`)

    const n = BigNumber.from(2).pow(128).sub(BigNumber.from(1))
    console.log(n.toString())
}

main().catch((err) => {
    console.error(err);
});
