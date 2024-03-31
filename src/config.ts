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

// network 
export const AppChainId: number = 1

// Example Configuration

export const CurrentConfig: AppConfig = {
  env: Environment.LOCAL,
  rpc: {
    local: 'http://localhost:8545',
    mainnet: `${process.env.JSON_RPC_PROVIDER}`,
  },
  wallet: {
    privateKey: `${process.env.PRIVATE_KEY}`,

  }
}
