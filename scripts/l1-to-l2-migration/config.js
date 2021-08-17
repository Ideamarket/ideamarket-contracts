const { BigNumber } = require('ethers')
require('dotenv').config()

module.exports = {
	deploymentParams: {
		'test-avm-l1': {
			gasPrice: 10000000000, // 10 gwei

			gasLimitInterestManagerStateTransfer: BigNumber.from('3000000'), // 1.5MM
			maxSubmissionCostInterestManagerStateTransfer: BigNumber.from('2000000000000000'), // 0.002 ETH
			l2GasPriceBidInterestManagerStateTransfer: BigNumber.from('1000000000'), // 1 gwei

			gasLimitExchangeStaticVarsTransfer: BigNumber.from('2000000'), // 2MM
			maxSubmissionCostExchangeStaticVarsTransfer: BigNumber.from('2000000000000000'), // 0.002 ETH
			l2GasPriceBidExchangeStaticVarsTransfer: BigNumber.from('1000000000'), // 1 gwei

			gasLimitExchangePlatformVarsTransfer: BigNumber.from('2000000'), // 2MM
			maxSubmissionCostExchangePlatformVarsTransfer: BigNumber.from('2000000000000000'), // 0.002 ETH
			l2GasPriceBidExchangePlatformVarsTransfer: BigNumber.from('1000000000'), // 1 gwei

			gasLimitExchangeTokensVarsTransferPerToken: BigNumber.from('500000'), // 500K
			maxSubmissionCostExchangeTokenVarsTransferPerToken: BigNumber.from('2000000000000000'), // 0.002 ETH
			l2GasPriceBidExchangeTokenVarsTransferPerToken: BigNumber.from('1000000000'), // 1 gwei
		},
		'test-avm-l2': {
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
		'test-avm-l1': {
			daiBridge: '0x70C143928eCfFaf9F5b406f7f4fC28Dc43d68380',
			inbox: '0x578BAde599406A8fE3d24Fd7f7211c0911F5B29e',
		},
		'test-avm-l2': {
			multisig: '0x0000000000000000000000000000000000000001',
			authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
			dai: '0x5364Dc963c402aAF150700f38a8ef52C1D7D7F14',
			cDai: '0x0000000000000000000000000000000000000001',
			weth: '0x0000000000000000000000000000000000000001',
			uniswapV2Router02: '0x0000000000000000000000000000000000000001',
		},
	},
	ethParams: {
		'test-avm-l1': {
			rpcUrl: process.env.RINKEBY_RPC,
			privateKey: process.env.RINKEBY_PRIVATE_KEY,
		},
		'test-avm-l2': {
			rpcUrl: process.env.RINKEBY_AVM_RPC,
			privateKey: process.env.RINKEBY_AVM_PRIVATE_KEY,
		},
	}
}
