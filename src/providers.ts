import { BaseProvider } from '@ethersproject/providers'
import { BigNumber, ethers } from 'ethers'
import { Environment, CurrentConfig } from './config'

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

export function getWalletAddress(): string {
  return wallet.address
}

export function getWallet() {
  return wallet
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
  console.log(`Transaction hash: ${txRes.hash}`)
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
