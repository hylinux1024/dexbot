
/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config()

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 1,
      blockGasLimit: 100_000_000_000,
      forking: {
        url: `${process.env.JSON_RPC_PROVIDER}`
      },
    },
  },
};
