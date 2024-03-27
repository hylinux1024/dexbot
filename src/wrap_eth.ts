import { SupportedChainId, Token, WETH9 } from "@uniswap/sdk-core";
import { getProvider, getWalletAddress } from "./providers";
import { wrapETH,getCurrencyBalance } from "./wallet";
import { ethers } from "ethers";
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 15;

async function main() {
    const provider = getProvider();
    const walletAddress = getWalletAddress();
    if (!walletAddress || !provider) {
        throw new Error('Cannot execute a trade without a connected wallet')
    }
    // const args = process.argv.slice(2);
    // if (args.length<1) {
    //     console.log("missing tokenAddress");
    //     return;
    // }
    // const tokenAddress = args[0];
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const tokenOut = new Token(SupportedChainId.MAINNET,WETH,18);
    var balance = await getCurrencyBalance(provider,walletAddress,tokenOut);
    console.log(`before balance of WETH:${balance}`);
    await wrapETH(100);
    balance = await getCurrencyBalance(provider,walletAddress,tokenOut);
    console.log(`after balance WETH:${balance}`);
}

main();