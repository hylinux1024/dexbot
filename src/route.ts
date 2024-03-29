import {
  AlphaRouter,
  SwapOptionsSwapRouter02,
  SwapOptionsUniversalRouter,
  SwapRoute,
  SwapType,
} from '@uniswap/smart-order-router'
import { TradeType, CurrencyAmount, Percent, Token } from '@uniswap/sdk-core'
import { CurrentConfig } from './config'
import {
  getWalletAddress,
  sendTransaction,
  TransactionState,
  getProvider,
  fetchToken,
} from './providers'
import {
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  ERC20_ABI,
  V3_SWAP_ROUTER_ADDRESS,
} from './constants'
import { fromReadableAmount } from './utils'
import { ethers } from 'ethers'

import * as util from "util"
import { EventEmitter } from 'stream'

EventEmitter.defaultMaxListeners = 15;

export async function generateRoute(tokenIn: Token, tokenOut: Token, amountIn: number): Promise<SwapRoute | null> {
  const router = new AlphaRouter({
    chainId: 1,
    provider: getProvider(),
  })

  const options: SwapOptionsSwapRouter02 = {
    recipient: CurrentConfig.wallet.address,
    slippageTolerance: new Percent(50, 10_000),
    deadline: Math.floor(Date.now() / 1000 + 1800),
    type: SwapType.SWAP_ROUTER_02,
  }

  const optionsV1: SwapOptionsUniversalRouter = {
    recipient: CurrentConfig.wallet.address,
    slippageTolerance: new Percent(50, 10_000),
    type: SwapType.UNIVERSAL_ROUTER,
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
  amountOut: number
): Promise<TransactionState> {
  const walletAddress = getWalletAddress()
  const provider = getProvider()

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet')
  }

  const tokenApproval = await getTokenTransferApproval(tokenIn, amountOut)

  // Fail if transfer approvals do not go through
  if (tokenApproval !== TransactionState.Sent) {
    return TransactionState.Failed
  }

  const res = await sendTransaction({
    data: route.methodParameters?.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: route?.methodParameters?.value,
    from: walletAddress,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  })

  return res
}

export async function getTokenTransferApproval(
  token: Token,
  amountToApprove: number
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

    return sendTransaction({
      ...transaction,
      from: address,
    })
  } catch (e) {
    console.error(e)
    return TransactionState.Failed
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

  const [tokenIn,tokenOut] = await Promise.all([fetchToken(tokenInAddress),fetchToken(tokenOutAddress)])

  console.log(util.inspect(tokenIn));
  console.log(util.inspect(tokenOut));
  const route = await generateRoute(tokenIn, tokenOut, amountIn)

  if (route == null) {
    console.log(`Route is null`)
    return
  }
  console.log(`Quote Exact In: ${route.quote.toFixed(10)}`)
}

main()