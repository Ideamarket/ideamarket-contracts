require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-web3')
require('@eth-optimism/plugins/hardhat/compiler')
require('@eth-optimism/plugins/hardhat/ethers')
require('solidity-coverage')
require('dotenv').config()

module.exports = {
	networks: {
		hardhat: {},
		mainnet: {
			url: process.env.MAINNET_RPC || '',
			accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
		},
		rinkeby: {
			url: process.env.RINKEBY_RPC || '',
			accounts: process.env.RINKEBY_PRIVATE_KEY ? [process.env.RINKEBY_PRIVATE_KEY] : [],
		},
		ovm_local: {
			url: 'http://localhost:9645',
		},
	},
	solidity: {
		version: '0.6.12',
		settings: {},
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
