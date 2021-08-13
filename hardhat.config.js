require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-web3')
require('solidity-coverage')
require('dotenv').config()

module.exports = {
	networks: {
		// --- EVM
		hardhat: {},
		mainnet: {
			url: process.env.MAINNET_RPC || '',
			accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
		},
		rinkeby: {
			url: process.env.RINKEBY_RPC || '',
			accounts: process.env.RINKEBY_PRIVATE_KEY ? [process.env.RINKEBY_PRIVATE_KEY] : [],
		},
	},
	solidity: {
		version: '0.6.9',
		settings: {
			optimizer: {
				enabled: false,
			},
		},
	},
	paths: {
		sources: './contracts',
		tests: './test/contracts',
		cache: './cache',
		artifacts: './build/contracts',
	},
	mocha: {
		timeout: 200000, // 200s
	},
}
