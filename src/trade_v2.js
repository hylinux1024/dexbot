// require('dotenv').config();
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent, Token } = require('@uniswap/sdk');
const ethers = require('ethers');
const util = require('util');
const { getProvider, getWallet } = require('./providers');
const { WETH9 } = require('@uniswap/sdk-core');
const { WETH_CONTRACT_ADDRESS, ERC20_ABI } = require('./constants');
const { toReadableAmount } = require('./utils');

const provider = getProvider();
// const url = "https://eth-mainnet.g.alchemy.com/v2/18GaGiQyDCtRjm2YdhEreGmyMXGbfA3s"

// ABI imports
// https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#swapexactethfortokens
const uniswapV2ExchangeAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; 
const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const chainId = ChainId.MAINNET;

async function quote(tokenInAddress,tokenOutAddress,amountIn) {

    // toChecksumAddress
    tokenInAddress = ethers.utils.getAddress(tokenInAddress);
    tokenOutAddress = ethers.utils.getAddress(tokenOutAddress);

    const tokenOut = await Fetcher.fetchTokenData(chainId, tokenOutAddress, provider);
    const tokenIn = await Fetcher.fetchTokenData(chainId, tokenInAddress, provider);
    console.log(util.inspect(tokenIn));
    console.log(util.inspect(tokenOut));

    const pair = await Fetcher.fetchPairData(tokenIn, tokenOut, provider); // use the provider, otherwise you'll get a warning
    const route = new Route([pair], tokenIn);

    // swap 1 ether
    const wei = ethers.utils.parseUnits(`${amountIn}`, tokenIn.decimals)
    console.log(`wei: ${wei}`)
    const trade = new Trade(route, new TokenAmount(tokenIn, wei), TradeType.EXACT_INPUT);
    const slippageTolerance = new Percent('500', '10000'); // 0.5%
    const outputAmountMin = trade.minimumAmountOut(slippageTolerance).raw;
    const inputAmount = trade.inputAmount.raw;
    return {
        'price': trade.executionPrice.toSignificant(18),
        'priceImpact': trade.priceImpact.toSignificant(6),
        'inputAmount': inputAmount,
        'outputAmountMin': outputAmountMin
    }
}

async function executeTrade(tokenInAddress,tokenOutAddress,inputAmount,outputAmountMin) {
    const amountOutMinHex = ethers.BigNumber.from(outputAmountMin.toString()).toHexString();
    const inputAmountHex = ethers.BigNumber.from(inputAmount.toString()).toHexString(); 

    const account = getWallet();

    // declare the token contract interfaces
    const tokenContract = new ethers.Contract(
        tokenOutAddress,
        ERC20_ABI,
        account
      );
    
    // work out our current balance
    let balanceBefore = await tokenContract.balanceOf(account.address);
    const decimals = await tokenContract.decimals();
    console.log("initial balance: " + ethers.utils.formatUnits(balanceBefore.toString(), decimals));
    
    const approveRes = await tokenContract.approve(uniswapV2ExchangeAddress,inputAmountHex);
    console.log("approveRes: "+approveRes.hash)

    // declare the Uniswap contract interface
    const uniswap = new ethers.Contract(
        uniswapV2ExchangeAddress,
        ['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn,uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
        ],
        account
      );

    const gasPrice = await provider.getGasPrice();
    const gasLimit = ethers.BigNumber.from(500000);

    const path = [tokenInAddress, tokenOutAddress];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins time
    // do the swap
    var tx = await uniswap.swapExactTokensForTokens(
        inputAmountHex,
        amountOutMinHex,
        path,
        account.address,
        deadline,
        { 
            gasPrice: gasPrice.toHexString(),
            gasLimit: gasLimit.toHexString()
        }
    );
    // if(tokenInAddress==WETH_CONTRACT_ADDRESS) {
    //     tx = await uniswap.swapExactETHForTokens(
    //         amountOutMinHex,
    //         path,
    //         account.address,
    //         deadline,
    //         { 
    //             value: inputAmountHex, 
    //             gasPrice: gasPrice.toHexString(),
    //             gasLimit: gasLimit.toHexString()
    //         }
    //     );
    // }
    
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);
    // display the final balance
    let balanceAfter = await tokenContract.balanceOf(account.address);
    const res = ethers.utils.formatUnits(balanceAfter.toString(), decimals);
    console.log("final balance: " + res);
    return res;
}

const main = async () => {
    // pick who your provider
    const args = process.argv.slice(2);
    if (args.length<1) {
        console.log("need to specify tokenOutAddress.")
        return;
    }

    var tokenInAddress = args[0]
    var tokenOutAddress = args[1];
    var amountIn = args[2];
    console.log(`amountIn: ${amountIn}`)

    let quoteRes = await quote(tokenInAddress, tokenOutAddress, amountIn)

    console.log("execution price: $" + quoteRes.price);
    console.log("price impact: " + quoteRes.priceImpact + "%"); // always > 0.3%
    console.log("outputMin: " + toReadableAmount(ethers.BigNumber.from(quoteRes.outputAmountMin.toString()),18) ); // always > 0.3%
    
    const outputAmountMin = quoteRes.outputAmountMin
    const inputAmount = quoteRes.inputAmount
    
    await executeTrade(tokenInAddress,tokenOutAddress,inputAmount,outputAmountMin)
        .catch(err=>{
            console.log(`transaction failed:\n ${err}`);
        });

    // console.log(`Transaction hash: ${tx.hash}`);
    // const receipt = await tx.wait();
    // console.log(`Transaction was mined in block ${receipt.blockNumber}`);
    // display the final balance
    // const balance = await tokenContract.balanceOf(account.address);
    // console.log("final balance: " + ethers.utils.formatUnits(balance.toString(), decimals));
}

main();