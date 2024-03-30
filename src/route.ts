import {
  AlphaRouter,
  SwapOptionsSwapRouter02,
  SwapRoute,
  SwapType,
} from '@uniswap/smart-order-router'
import { TradeType, CurrencyAmount, Percent, Token, SupportedChainId } from '@uniswap/sdk-core'
import {
  getWalletAddress,
  sendTransaction,
  TransactionState,
  getProvider,
} from './providers'
import {
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  ERC20_ABI,
  V3_SWAP_ROUTER_ADDRESS,
} from './constants'
import { fromReadableAmount } from './utils'
import { ethers } from 'ethers'

import { EventEmitter } from 'stream'
import { checkAllowance, fetchToken } from './contracts'

EventEmitter.defaultMaxListeners = 15;


export async function generateRoute(tokenIn: Token, tokenOut: Token, amountIn: number): Promise<SwapRoute | null> {
  const router = new AlphaRouter({
    chainId: 1,
    provider: getProvider(),
  })

  const options: SwapOptionsSwapRouter02 = {
    recipient: getWalletAddress(),
    slippageTolerance: new Percent(50, 10_000),
    deadline: Math.floor(Date.now() / 1000 + 60*30),
    type: SwapType.SWAP_ROUTER_02,
  }

  const route = await router.route(
    CurrencyAmount.fromRawAmount(
      tokenIn,
      fromReadableAmount(
        amountIn,
        tokenIn.decimals
      ).toString()
    ),
    tokenOut,
    TradeType.EXACT_INPUT,
    options
  )

  return route
}

export async function executeRoute(
  route: SwapRoute,
  tokenIn: Token,
  amountOut: string
): Promise<TransactionState> {
  const walletAddress = getWalletAddress()
  const provider = getProvider()

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet')
  }

  const allowance = await checkAllowance(tokenIn.address,walletAddress,V3_SWAP_ROUTER_ADDRESS)
  if(!allowance) {
    console.log("Not Allowance, Start Approving")
    // 2^256 - 1
    const tokenApproval = await getTokenTransferApproval(tokenIn, amountOut)
    .catch(err => {
      console.log(`Approval Error:\n ${err}`)
    })

    // Fail if transfer approvals do not go through
    if (tokenApproval !== TransactionState.Sent) {
      return TransactionState.Failed
    }
  }
  console.log(`Start Sending Transaction`)
  const res = await sendTransaction({
    data: route.methodParameters?.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: route?.methodParameters?.value,
    from: walletAddress,
    gasPrice: route.gasPriceWei,
    gasLimit: route.estimatedGasUsed,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  })

  return res
}

export async function getTokenTransferApproval(
  token: Token,
  amountToApprove: string
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
      V3_SWAP_ROUTER_ADDRESS,
      fromReadableAmount(
        amountToApprove,
        token.decimals
      ).toString()
    )
    const gasPrice = await provider.getGasPrice()

    return sendTransaction({
      ...transaction,
      from: address,
      gasPrice: gasPrice,
    })
  } catch (e) {
    console.error(e)
    return TransactionState.Failed
  }
}

async function quoteAndTrade(tokenInAddress: string, tokenOutAddress: string, amountIn: number, trade: string) {
  const [tokenIn, tokenOut] = await Promise.all([fetchToken(tokenInAddress), fetchToken(tokenOutAddress)])

  console.log(`token in: ${tokenIn.symbol}`);
  console.log(`token out: ${tokenOut.symbol}`);
  console.log(`amount in: ${amountIn}`)
  console.log(`trade: ${trade == 'trade'}`)
  const route = await generateRoute(tokenIn, tokenOut, amountIn)

  if (route == null) {
    console.log(`Route is null, try another network.`)
    return
  }
  const tokenAmountOut = route.quote.toSignificant(tokenOut.decimals)
  const wei = fromReadableAmount(tokenAmountOut, tokenOut.decimals)
  console.log(`Quote Exact Token Out: ${tokenAmountOut} ${tokenOut.symbol}`)
  console.log(`Quote Exact Token Out(wei): ${wei}`)
  console.log(`Quote Gas Adjusted: ${route.quoteGasAdjusted.toSignificant(tokenOut.decimals)} `)
  console.log(`Estimated Gas Used USD: ${route.estimatedGasUsedUSD.toFixed(2)}`)
  console.log(`Estimated Gas: ${route.estimatedGasUsed}`)
  console.log(`Estimated Gas Price(wei): ${route.gasPriceWei}`)

  if (trade == "trade") {
    const res = await executeRoute(route, tokenIn, tokenAmountOut.toString())
      .catch(err => {
        console.log(`Transaction Failed\n ${err}`)
      })
    console.log(`Transaction: ${res}`)
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log("need to specify tokenOutAddress.")
    return;
  }

  var tokenInAddress = args[0]
  var tokenOutAddress = args[1];
  var amountIn = parseFloat(args[2])
  var trade = args[3]

  await quoteAndTrade(tokenInAddress, tokenOutAddress, amountIn, trade)

}

main()