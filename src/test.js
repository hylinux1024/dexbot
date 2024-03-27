require('dotenv').config();

const { ethers } = require("ethers");

const infuraUrl = "https://linea-mainnet.infura.io/v3/299ad94a7a924ddd85057223b3a86f93";
const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

async function main() {
    const blockNumber = await provider.getBlockNumber();
    console.log("Current block number:", blockNumber);

    console.log(process.env.PRIVATE_KEY)
}

main().catch((err) => {
    console.error("Error:", err);
});
