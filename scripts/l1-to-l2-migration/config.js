const { BigNumber } = require('ethers')

module.exports = {
	deploymentParams: {
		kovan: {
			gasPrice: 1000000000, // 1 gwei
		},
		'kovan-ovm': {
			timelockDelay: '86400', // 24 hours
			gasPrice: 0,

			twitterBaseCost: BigNumber.from('100000000000000000'), // 0.1 DAI
			twitterPriceRise: BigNumber.from('100000000000000'), // 0.0001 DAI
			twitterHatchTokens: BigNumber.from('1000000000000000000000'), // 1000
			twitterTradingFeeRate: BigNumber.from('50'), // 0.50%
			twitterPlatformFeeRate: BigNumber.from('50'), // 0.50%
			twitterAllInterestToPlatform: false,

			substackBaseCost: BigNumber.from('100000000000000000'), // 0.1 DAI
			substackPriceRise: BigNumber.from('100000000000000'), // 0.0001 DAI
			substackHatchTokens: BigNumber.from('1000000000000000000000'), // 1000
			substackTradingFeeRate: BigNumber.from('50'), // 0.50%
			substackPlatformFeeRate: BigNumber.from('50'), // 0.50%
			substackAllInterestToPlatform: false,
		},
	},
	externalContractAddresses: {
		kovan: {
			daiBridge: '0x0000000000000000000000000000000000000001',
			crossDomainMessenger: '0x0000000000000000000000000000000000000001',
		},
		'kovan-ovm': {
			multisig: '0x0000000000000000000000000000000000000001',
			authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
			dai: '0x0000000000000000000000000000000000000001',
			cDai: '0x0000000000000000000000000000000000000001',
			oweth: '0x0000000000000000000000000000000000000001',
			uniswapV2Router02: '0x0000000000000000000000000000000000000001',
			crossDomainMessenger: '0x6f78cde001182d5DCBc63D3C4b8051f2059E79D8',
		},
	},
}
