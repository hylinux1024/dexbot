import { SupportedChainId, Token, TradeType } from '@uniswap/sdk-core'
import { Trade } from '@uniswap/v3-sdk'
import { BigNumber, ethers } from 'ethers'

const MAX_DECIMALS = 18

export function fromReadableAmount(
  amount: number|string,
  decimals: number
): BigNumber {
  return ethers.utils.parseUnits(amount.toString(), decimals)
}

export function toReadableAmount(rawAmount: number, decimals: number): string {
  return ethers.utils.formatUnits(rawAmount, decimals).slice(0, MAX_DECIMALS)
}

export function displayTrade(trade: Trade<Token, Token, TradeType>): string {
  return `${trade.inputAmount.toExact()} ${
    trade.inputAmount.currency.symbol
  } for ${trade.outputAmount.toExact()} ${trade.outputAmount.currency.symbol}`
}

export function chainId2ChainName(chainId:number):string|undefined {
  return Object.keys(SupportedChainId).find(key=>SupportedChainId[key as keyof typeof SupportedChainId]==chainId)
}