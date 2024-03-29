import {
  Currency,
  CurrencyAmount,
  Percent,
  SupportedChainId,
  Token,
  TradeType,
} from '@uniswap/sdk-core'
import {
  Pool,
  Route,
  SwapOptions,
  SwapQuoter,
  SwapRouter,
  Trade,
} from '@uniswap/v3-sdk'
import { ethers } from 'ethers'
import JSBI from 'jsbi'

import { TokenConfig } from './config'
import {
  ERC20_ABI,
  QUOTER_CONTRACT_ADDRESS,
  SWAP_ROUTER_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
} from './constants'
import { MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS } from './constants'
import { getPoolInfo } from './pool'
import {
  getProvider,
  getWalletAddress,
  sendTransaction,
  TransactionState,
} from './providers'
import { fromReadableAmount,toReadableAmount } from './utils'
import { getCurrencyBalance } from './wallet'

export type TokenTrade = Trade<Token, Token, TradeType>

// Trading Functions

export async function createTrade(tokenConfig:TokenConfig): Promise<TokenTrade> {
  const poolInfo = await getPoolInfo(tokenConfig)
  console.log(`tick:${poolInfo.tick}`);
  const pool = new Pool(
    tokenConfig.in,
    tokenConfig.out,
    tokenConfig.poolFee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  )

  const swapRoute = new Route(
    [pool],
    tokenConfig.in,
    tokenConfig.out
  )

  const amountOut = await getOutputQuote(swapRoute,tokenConfig)

  const uncheckedTrade = Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(
      tokenConfig.in,
      fromReadableAmount(
        tokenConfig.amountIn,
        tokenConfig.in.decimals
      ).toString()
    ),
    outputAmount: CurrencyAmount.fromRawAmount(
      tokenConfig.out,
      JSBI.BigInt(amountOut)
    ),
    tradeType: TradeType.EXACT_INPUT,
  })

  return uncheckedTrade
}

export async function executeTrade(
  trade: TokenTrade,
  tokenConfig: TokenConfig
): Promise<TransactionState> {
  const walletAddress = getWalletAddress()
  const provider = getProvider()

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet')
  }

  // Give approval to the router to spend the token
  const tokenApproval = await getTokenTransferApproval(tokenConfig.in)

  // Fail if transfer approvals do not go through
  if (tokenApproval !== TransactionState.Sent) {
    return TransactionState.Failed
  }

  const options: SwapOptions = {
    slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: walletAddress,
  }

  const methodParameters = SwapRouter.swapCallParameters([trade], options)
  const gasPrice = await provider.getGasPrice()
  const tx = {
    data: methodParameters.calldata,
    to: SWAP_ROUTER_ADDRESS,
    value: methodParameters.value,
    from: walletAddress,
    gasPrice: gasPrice.toHexString(),
    gasLimit: ethers.BigNumber.from(500000).toHexString()
  }

  const res = await sendTransaction(tx)

  return res
}

// Helper Quoting and Pool Functions

async function getOutputQuote(route: Route<Currency, Currency>,tokenConfig:TokenConfig) {
  const provider = getProvider()

  if (!provider) {
    throw new Error('Provider required to get pool state')
  }

  const { calldata } = await SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(
      tokenConfig.in,
      fromReadableAmount(
        tokenConfig.amountIn,
        tokenConfig.in.decimals
      ).toString()
    ),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    }
  )

  const quoteCallReturnData = await provider.call({
    to: QUOTER_CONTRACT_ADDRESS,
    data: calldata,
  })

  return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)
}

export async function getTokenTransferApproval(
  token: Token
): Promise<TransactionState> {
  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    console.log('No Provider Found')
    return TransactionState.Failed
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      ERC20_ABI,
      provider
    )

    const transaction = await tokenContract.populateTransaction.approve(
      SWAP_ROUTER_ADDRESS,
      fromReadableAmount(
        TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
        token.decimals
      ).toString()
    )

    return sendTransaction({
      ...transaction,
      from: address,
    })
  } catch (e) {
    console.error(e)
    return TransactionState.Failed
  }
}


export async function trading(token_in:Token,token_out:Token,amount:number,fee:number) {
  var tokenConfig: TokenConfig = {
    in: token_in,
    amountIn: amount,
    out: token_out,
    poolFee: fee,
  }
  const provider = getProvider()
  const walletAddress = getWalletAddress()
  if(!provider||!walletAddress){
    console.log('No Provider Found')
    return
  }
  var balance = await getCurrencyBalance(provider,walletAddress,tokenConfig.out)
  console.log(`before swapping balance of ${tokenConfig.out.address}: ${balance}`);

  const trade = await createTrade(tokenConfig);
  console.log(`create trade: ${trade}`);
  const txRes = await executeTrade(trade,tokenConfig);
  console.log(txRes);
  
  balance = await getCurrencyBalance(provider,walletAddress,tokenConfig.out)

  console.log(`after swapping balance of ${tokenConfig.out.address}: ${balance}`);
  return balance;
}
// var tokenIn = new Token(SupportedChainId.MAINNET,"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",18)
// var tokenOut = new Token(SupportedChainId.MAINNET,"0x423f4e6138E475D85CF7Ea071AC92097Ed631eea",18)
// swap_main(tokenIn,tokenOut,1,3000);
