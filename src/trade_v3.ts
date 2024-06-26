import {
    SupportedChainId,
    Token,
  } from '@uniswap/sdk-core'
import { trading } from './trading'
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 15;

async function main() {
    
    const args = process.argv.slice(2);
    // console.log(args);
    if(args.length<3){
        console.log("the number of args less than 4!");
        return;
    }
    // trade_main
    var addressIn = args[0];
    var addressOut = args[1];
    var amountIn = parseFloat(args[2]);
    if(isNaN(amountIn)){
        console.log("amount is not a number!");
        return;
    }
    var fee = 3000
    var feeArg = args[3]
    if(feeArg) {
        var feeNew = parseInt(feeArg);
        if(isNaN(feeNew)){
            console.log("fee is not a number! use default fee=3000!"); 
        } else {
            fee = feeNew;
        }
    }

    console.log(`addressIn: ${addressIn}, addressOut: ${addressOut}, amountIn: ${amountIn}, fee: ${fee}`);

    var tokenIn = new Token(SupportedChainId.MAINNET,addressIn,18);
    var tokenOut = new Token(SupportedChainId.MAINNET,addressOut,18);
    const res = await trading(tokenIn,tokenOut,amountIn,fee);
    console.log(`result:${res}`);
}

main();

