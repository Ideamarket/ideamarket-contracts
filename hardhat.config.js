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
		kovan: {
			url: process.env.KOVAN_RPC || '',
			accounts: process.env.KOVAN_PRIVATE_KEY ? [process.env.KOVAN_PRIVATE_KEY] : [],
		},

		// --- AVM
		avm_local: {
			url: 'http://localhost:8547',
		},
		kovan_avm: {
			url: process.env.KOVAN_AVM_RPC || '',
			accounts: process.env.KOVAN_AVM_PRIVATE_KEY ? [process.env.KOVAN_AVM_PRIVATE_KEY] : [],
			timeout: 60000,
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
