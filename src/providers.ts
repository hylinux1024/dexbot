import { BaseProvider } from '@ethersproject/providers'
import { BigNumber, ethers, providers } from 'ethers'

import { TokenConfig, Environment, CurrentConfig } from './config'
import { ERC20_ABI } from './constants'
import { SupportedChainId, Token } from '@uniswap/sdk-core'

// Single copies of provider and wallet
const mainnetProvider = new ethers.providers.JsonRpcProvider(
  CurrentConfig.rpc.mainnet
)

const localProvider = new ethers.providers.JsonRpcProvider(
  CurrentConfig.rpc.local
)
const wallet = createWallet()

// Interfaces

export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

// Provider and Wallet Functions

export function getMainnetProvider(): BaseProvider {
  return mainnetProvider
}

export function getProvider(): BaseProvider {
  if (CurrentConfig.env == Environment.LOCAL) {
    return localProvider
  }
  return mainnetProvider
}

// export function getProvider(): providers.Provider | null {
//   return wallet.provider
// }

export function getWalletAddress(): string | null {
  return wallet.address
}

export function getWallet() {
  return wallet
}

export async function getERC20Contract(tokenAddress:string) {
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ERC20_ABI,
    wallet
  );
  return tokenContract
}

export async function fetchToken(tokenAddress:string){
  const contract = await getERC20Contract(tokenAddress)

  const symbol = await contract.symbol()
  const decimals = await contract.decimals()
  
  return new Token(SupportedChainId.MAINNET,tokenAddress,decimals,symbol)
}

export async function getERC20Balance(tokenAddress:string) {
  const tokenContract = await getERC20Contract(tokenAddress);
  let balance = await tokenContract.balanceOf(wallet.address);
  const decimals = await tokenContract.decimals();
  return ethers.utils.formatUnits(balance.toString(), decimals);
}

export async function sendTransaction(
  transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
  if (transaction.value) {
    transaction.value = BigNumber.from(transaction.value)
  }
  return sendTransactionViaWallet(transaction)
}



// Internal Functionality

function createWallet(): ethers.Wallet {
  let provider = mainnetProvider
  if (CurrentConfig.env == Environment.LOCAL) {
    provider = new ethers.providers.JsonRpcProvider(CurrentConfig.rpc.local)
  }
  return new ethers.Wallet(CurrentConfig.wallet.privateKey, provider)
}

async function sendTransactionViaWallet(
  transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
  if (transaction.value) {
    transaction.value = BigNumber.from(transaction.value)
  }
  const txRes = await wallet.sendTransaction(transaction)

  let receipt = null
  const provider = getProvider()
  if (!provider) {
    return TransactionState.Failed
  }

  while (receipt === null) {
    try {
      receipt = await provider.getTransactionReceipt(txRes.hash)

      if (receipt === null) {
        continue
      }
    } catch (e) {
      console.log(`Receipt error:`, e)
      break
    }
  }

  // Transaction was successful if status === 1
  if (receipt) {
    return TransactionState.Sent
  } else {
    return TransactionState.Failed
  }
}
