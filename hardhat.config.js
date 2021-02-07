require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-web3')
require('solidity-coverage')
require('dotenv').config()

module.exports = {
	networks: {
		hardhat: {},
		rinkeby: {
			url: process.env.RINKEBY_RPC,
			accounts: process.env.RINKEBY_PRIVATE_KEY ? [process.env.RINKEBY_PRIVATE_KEY] : [],
		},
	},
	solidity: {
		version: '0.6.9',
		settings: {
			/*optimizer: {
          enabled: true,
          runs: 200
        }*/
		},
	},
	paths: {
		sources: './contracts',
		tests: './test/contracts',
		cache: './cache',
		artifacts: './build/contracts',
	},
}
