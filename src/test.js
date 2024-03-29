require('dotenv').config();

const { ethers, BigNumber } = require("ethers");
const { EventEmitter } = require("events");
const { getWallet, getERC20Balance } = require('./providers');
const { toReadableAmount } = require('./utils');
const { WETH_CONTRACT_ADDRESS, ERC20_ABI } = require('./constants');
const infuraUrl = "https://linea-mainnet.infura.io/v3/299ad94a7a924ddd85057223b3a86f93";
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

const account = getWallet()

EventEmitter.defaultMaxListeners = 15;

async function main() {
    
    var balance = await account.getBalance();
    console.log("wallet balance:", toReadableAmount(balance));

    const tokenAddress = "0x5eca7b975e34567d9460fa613013a7a6993ad185";
    balance = await getERC20Balance(tokenAddress);

    console.log(`balance of ${tokenAddress}: ${balance}`);
}

main().catch((err) => {
    console.error("Error:", err);
});
