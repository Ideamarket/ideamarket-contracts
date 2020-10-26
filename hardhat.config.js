require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-web3")
require("dotenv").config()

module.exports = {
  networks: {
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [process.env.KOVAN_PRIVATE_KEY],
    },
  },
  solidity: {
    version: "0.6.9",
    settings: {
      /*optimizer: {
          enabled: true,
          runs: 200
        }*/
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test/contracts",
    cache: "./cache",
    artifacts: "./build/contracts",
  },
}
