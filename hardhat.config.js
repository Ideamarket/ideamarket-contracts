require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-web3')
require('@eth-optimism/plugins/hardhat/compiler')
require('@eth-optimism/plugins/hardhat/ethers')
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

		// --- OVM
		ovm_local: {
			url: 'http://localhost:9645',
		},
		kovan_ovm: {
			url: process.env.KOVAN_OVM_RPC || '',
			accounts: process.env.KOVAN_OVM_PRIVATE_KEY ? [process.env.KOVAN_OVM_PRIVATE_KEY] : [],
		},
	},
	solidity: {
		version: '0.6.12',
		settings: {
			optimizer: {
			enabled: true,
			runs: 1000
		  }
		}
	},
	ovm: {
		solcVersion: '0.6.12',
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
