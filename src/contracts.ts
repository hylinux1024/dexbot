import { ethers } from "ethers";
import { ERC20_ABI } from "./constants";
import { getProvider, getWallet, getWalletAddress } from "./providers";
import { SupportedChainId, Token } from "@uniswap/sdk-core";

export async function checkAllowance(tokenAddress:string,owner:string, spender:string) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, getProvider());
    const allowance = await tokenContract.allowance(owner, spender);
    return allowance.gt(0);
}

export function getERC20Contract(tokenAddress:string) {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      getWallet()
    );
    return tokenContract
  }
  
  export async function fetchToken(tokenAddress:string){
    const contract = getERC20Contract(tokenAddress)
  
    const symbol = await contract.symbol()
    const decimals = await contract.decimals()
  
    return new Token(SupportedChainId.MAINNET,tokenAddress,decimals,symbol)
  }
  
  export async function getERC20Balance(tokenAddress:string) {
    const tokenContract = getERC20Contract(tokenAddress);
    let balance = await tokenContract.balanceOf(getWalletAddress());
    const decimals = await tokenContract.decimals();
    return ethers.utils.formatUnits(balance.toString(), decimals);
  }