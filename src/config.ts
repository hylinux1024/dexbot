import {Token} from "@uniswap/sdk-core";
import * as dotenv from "dotenv";
dotenv.config();

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
      address: string
      privateKey: string
    }
  }
  
  // Example Configuration
  
  export const CurrentConfig: AppConfig = {
    env: Environment.LOCAL,
    rpc: {
      local: 'http://localhost:8545',
      mainnet: 'https://eth-mainnet.g.alchemy.com/v2/18GaGiQyDCtRjm2YdhEreGmyMXGbfA3s',
    },
    wallet: {
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      privateKey:
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    }
  }
