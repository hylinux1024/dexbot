import { Token } from "@uniswap/sdk-core";
import * as dotenv from "dotenv"

dotenv.config()

export enum Environment {
  LOCAL,
  MAINNET,
  WALLET_EXTENSION,
}

export interface TokenConfig {
  in: Token
  amountIn: number
  out: Token
  poolFee: number
}

export interface AppConfig {
  env: Environment
  rpc: {
    local: string
    mainnet: string
  }
  wallet: {
    privateKey: string
  }
}

// Example Configuration

export const CurrentConfig: AppConfig = {
  env: Environment.MAINNET,
  rpc: {
    local: 'http://localhost:8545',
    // mainnet: 'https://rpc.sepolia.org'
    // mainnet: 'https://sepolia.infura.io/v3/299ad94a7a924ddd85057223b3a86f93'
    mainnet: 'https://eth-mainnet.g.alchemy.com/v2/18GaGiQyDCtRjm2YdhEreGmyMXGbfA3s',
  },
  wallet: {
    privateKey: `${process.env.PRIVATE_KEY}`,

  }
}
