const { BigNumber } = require('ethers')

module.exports = {
	deploymentParams: {
		kovan: {
			gasPrice: 1000000000, // 1 gwei

			gasLimitInterestManagerStateTransfer: BigNumber.from('1500000'), // 1.5MM
			maxSubmissionCostInterestManagerStateTransfer: BigNumber.from('1000000000000000'), // 0.001 ETH
			l2GasPriceBidInterestManagerStateTransfer: BigNumber.from('1000000000'), // 1 gwei

			gasLimitExchangeStaticVarsTransfer: BigNumber.from('1000000'), // 1MM
			maxSubmissionCostExchangeStaticVarsTransfer: BigNumber.from('1000000000000000'), // 0.001 ETH
			l2GasPriceBidExchangeStaticVarsTransfer: BigNumber.from('1000000000'), // 1 gwei

			gasLimitExchangePlatformVarsTransfer: BigNumber.from('1000000'), // 1MM
			maxSubmissionCostExchangePlatformVarsTransfer: BigNumber.from('1000000000000000'), // 0.001 ETH
			l2GasPriceBidExchangePlatformVarsTransfer: BigNumber.from('1000000000'), // 1 gwei

			gasLimitExchangeTokensVarsTransferPerToken: BigNumber.from('500000'), // 500K
			maxSubmissionCostExchangeTokenVarsTransferPerToken: BigNumber.from('1000000000000000'), // 0.001 ETH
			l2GasPriceBidExchangeTokenVarsTransferPerToken: BigNumber.from('1000000000'), // 1 gwei
		},
		'kovan-avm': {
			timelockDelay: '86400', // 24 hours
			gasPrice: 500000000, // 0.5 gwei

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

			showtimeBaseCost: BigNumber.from('100000000000000000'), // 0.1 DAI
			showtimePriceRise: BigNumber.from('100000000000000'), // 0.0001 DAI
			showtimeHatchTokens: BigNumber.from('1000000000000000000000'), // 1000
			showtimeTradingFeeRate: BigNumber.from('50'), // 0.50%
			showtimePlatformFeeRate: BigNumber.from('50'), // 0.50%
			showtimeAllInterestToPlatform: false,
		},
	},
	externalContractAddresses: {
		kovan: {
			daiBridge: '0x1d750369c91b129524B68f308512b0FE2C903d71',
			inbox: '0x76bF1345224fE606E2aB38B8E52B83512328A9DF',
		},
		'kovan-avm': {
			multisig: '0x0000000000000000000000000000000000000001',
			authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
			dai: '0xF8C456486B54a5e095c37805F5428191852b4E4F',
			cDai: '0x0000000000000000000000000000000000000001',
			weth: '0x0000000000000000000000000000000000000001',
			uniswapV2Router02: '0x0000000000000000000000000000000000000001',
		},
	},
}
