// require('dotenv').config();
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const util = require('util');
const { getProvider, getWallet } = require('./providers');

const provider = getProvider();
// const url = "https://eth-mainnet.g.alchemy.com/v2/18GaGiQyDCtRjm2YdhEreGmyMXGbfA3s"

// ABI imports
// https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02#swapexactethfortokens
const uniswapV2ExchangeAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; 
const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const chainId = ChainId.MAINNET;

const main = async () => {
    // pick who your provider
    const args = process.argv.slice(2);
    if (args.length<1) {
        console.log("need to specify tokenOutAddress.")
        return;
    }

    var tokenOutAddress = args[0];

    const tokenOut = await Fetcher.fetchTokenData(chainId, tokenOutAddress, provider);
    console.log(util.inspect(tokenOut));
    const weth = WETH[chainId];
    const pair = await Fetcher.fetchPairData(tokenOut, weth, provider); // use the provider, otherwise you'll get a warning
    const route = new Route([pair], weth);

    // swap 1 ether
    const trade = new Trade(route, new TokenAmount(weth, ethers.utils.parseEther("1.0")), TradeType.EXACT_INPUT);
    console.log("execution price: $" + trade.executionPrice.toSignificant(18));
    console.log("price impact: " + trade.priceImpact.toSignificant(6) + "%"); // always > 0.3%

    const slippageTolerance = new Percent('50', '10000'); // 0.5%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
    const amountOutMinHex = ethers.BigNumber.from(amountOutMin.toString()).toHexString();

    const path = [weth.address, tokenOut.address];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins time
    const inputAmount = trade.inputAmount.raw;
    const inputAmountHex = ethers.BigNumber.from(inputAmount.toString()).toHexString(); 

    // const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
    // const account = signer.connect(provider);
    const account = getWallet();

    // declare the token contract interfaces
    const tokenContract = new ethers.Contract(
        tokenOutAddress,
        ['function balanceOf(address owner) external view returns (uint)',
            'function decimals() external view returns (uint8)'],
        account
      );

    // work out our current balance
    let balance = await tokenContract.balanceOf(account.address);
    const decimals = await tokenContract.decimals();
    console.log("initial balance: " + ethers.utils.formatUnits(balance.toString(), decimals));
    
    // declare the Uniswap contract interface
    const uniswap = new ethers.Contract(
        uniswapV2ExchangeAddress,
        ['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'],
        account
      );

    const gasPrice = await provider.getGasPrice();

    // do the swap
    const tx = await uniswap.swapExactETHForTokens(
        amountOutMinHex,
        path,
        account.address,
        deadline,
        { 
            value: inputAmountHex, 
            gasPrice: gasPrice.toHexString(),
            gasLimit: ethers.BigNumber.from(500000).toHexString()
        }
    );
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);
    // display the final balance
    balance = await tokenContract.balanceOf(account.address);
    console.log("final balance: " + ethers.utils.formatUnits(balance.toString(), decimals));
}

main();