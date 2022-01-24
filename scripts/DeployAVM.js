const { run, ethers, artifacts } = require('hardhat')
const { BigNumber } = require('ethers')

const { read, loadDeployedAddress, saveDeployedAddress, saveDeployedABI } = require('./shared')

const allDeploymentParams = {
	mainnet: {
		timelockDelay: '86400', // 24 hours
		gasPrice: 130000000000,

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
	rinkeby: {
		timelockDelay: '1',
		gasPrice: 1000000000, // 1 gwei

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
	test: {
		timelockDelay: '1',
		gasPrice: 10000000000, // 10 gwei

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
	'test-avm-l1': {
		timelockDelay: '1',
		gasPrice: 10000000000, // 10 gwei

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

		mindsBaseCost: BigNumber.from('100000000000000000'), // 0.1 DAI
		mindsPriceRise: BigNumber.from('100000000000000'), // 0.0001 DAI
		mindsHatchTokens: BigNumber.from('1000000000000000000000'), // 1000
		mindsTradingFeeRate: BigNumber.from('50'), // 0.50%
		mindsPlatformFeeRate: BigNumber.from('50'), // 0.50%
		mindsAllInterestToPlatform: false,
	},
}

const allExternalContractAddresses = {
	mainnet: {
		multisig: '0x4905485d8B0Be42b317CCB4806b966aC0d4f4AE8',
		authorizer: '0x78C15e4B4Ed9D8B4FFd031d0ec7BD09A55d02699',
		dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
		cDai: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
		comp: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
		weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
	},
	rinkeby: {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		dai: '0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa',
		cDai: '0x6D7F0754FFeb405d23C51CE938289d4835bE3b14',
		comp: '0x0000000000000000000000000000000000000001', // Not deployed on Rinkeby
		weth: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
	},
	test: {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		dai: '0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa',
		cDai: '0x6D7F0754FFeb405d23C51CE938289d4835bE3b14',
		comp: '0x0000000000000000000000000000000000000001', // Not deployed on Rinkeby
		weth: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
	},
	'test-avm-l1': {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		dai: '0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa',
		cDai: '0x6D7F0754FFeb405d23C51CE938289d4835bE3b14',
		comp: '0x0000000000000000000000000000000000000001', // Not deployed on Rinkeby
		weth: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
	},
	'test-avm-l2': {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		dai: '0x5364Dc963c402aAF150700f38a8ef52C1D7D7F14',
		cDai: '0x6D7F0754FFeb405d23C51CE938289d4835bE3b14',
		comp: '0x0000000000000000000000000000000000000001', // Not deployed on Rinkeby
		weth: '0xb47e6a5f8b33b3f17603c83a0535a9dcd7e32681',
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
		bridgeAVM: "0x04C451E7f6E391ee0D004139FFe125Bd75535DE6",
	},
}

let deploymentParams
let externalContractAddresses

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Deploying from ${deployerAddress}`)

	await run('compile')
	console.log('')

	let networkName = (await ethers.provider.getNetwork()).name
	if (networkName === 'rinkeby') {
		const input = await read('[1: rinkeby, 2: test, 3: test-avm-l1]')

		if(input === '1') {
			console.log('Using rinkeby')
			deploymentParams = allDeploymentParams.rinkeby
			externalContractAddresses = allExternalContractAddresses.rinkeby
		} else if (input === '2') {
			console.log('Using test')
			networkName = 'test'
			deploymentParams = allDeploymentParams.test
			externalContractAddresses = allExternalContractAddresses.test
		} else if (input === '3') {
			console.log('Using test-avm-l1')
			networkName = 'test-avm-l1'
			deploymentParams = allDeploymentParams['test-avm-l1']
			externalContractAddresses = allExternalContractAddresses['test-avm-l1']
		} else {
			throw new Error('Unknown network')
		}
	} else if (networkName === 'homestead') {
		networkName = 'mainnet'

		console.log('Using Mainnet')
		deploymentParams = allDeploymentParams.mainnet
		externalContractAddresses = allExternalContractAddresses.mainnet
	} else if (networkName === 'rinkeby_avm') {
		console.log('Using test-avm-l2')
		networkName = 'test-avm-l2'
		deploymentParams = allDeploymentParams['test-avm-l2']
		externalContractAddresses = allExternalContractAddresses['test-avm-l2']
	} else {
		// if network is not one of the above, manually input data here
		console.log('Using test-avm-l2')
		networkName = 'test-avm-l2'
		deploymentParams = allDeploymentParams['test-avm-l1']
		externalContractAddresses = allExternalContractAddresses['test-avm-l2']
	}

	console.log('Block', await ethers.provider.getBlockNumber())

	const STAGE = 1

	let dsPauseProxyAddress
	if (STAGE <= 1) {
		console.log('1. Deploy Timelock')
		console.log('==============================================')
		const dsPause = await deployContract(
			'DSPause',
			deploymentParams.timelockDelay,
			externalContractAddresses.multisig
		)
		dsPauseProxyAddress = await dsPause._proxy()
		saveDeployedAddress(networkName, 'dsPause', dsPause.address)
		saveDeployedABI(networkName, 'dsPause', artifacts.readArtifactSync('DSPause').abi)
		saveDeployedAddress(networkName, 'dsPauseProxy', dsPauseProxyAddress)
		saveDeployedABI(networkName, 'dsPauseProxy', artifacts.readArtifactSync('DSPauseProxy').abi)
		console.log('')
	} else {
		dsPauseProxyAddress = loadDeployedAddress(networkName, 'dsPauseProxy')
	}

	let proxyAdminAddress
	if (STAGE <= 2) {
		console.log('2. Deploy ProxyAdmin')
		console.log('==============================================')
		proxyAdminAddress = (await deployContract('ProxyAdmin', dsPauseProxyAddress)).address
		saveDeployedAddress(networkName, 'proxyAdmin', proxyAdminAddress)
		saveDeployedABI(networkName, 'proxyAdmin', artifacts.readArtifactSync('ProxyAdmin').abi)
		console.log('')
	} else {
		proxyAdminAddress = loadDeployedAddress(networkName, 'proxyAdmin')
	}

	let interestManagerProxyAddress
	if (STAGE <= 3) {
		console.log('3. Deploy InterestManagerStateTransferAVM')
		console.log('==============================================')
		let interestManagerLogic = await deployContract('InterestManagerStateTransferAVM')

		const data = interestManagerLogic.interface.encodeFunctionData('initializeStateTransfer', 
			[deployerAddress, externalContractAddresses.dai])
		let interestManagerProxy = await deployContract('AdminUpgradeabilityProxy', interestManagerLogic.address, proxyAdminAddress, data)

		interestManagerProxyAddress = interestManagerProxy.address
		saveDeployedAddress(networkName, 'interestManager', interestManagerProxyAddress)
		saveDeployedABI(networkName, 'interestManager', artifacts.readArtifactSync('InterestManagerStateTransferAVM').abi)
		saveDeployedAddress(networkName, 'interestManagerLogic', interestManagerLogic.address)
		console.log('')
	} else {
		interestManagerProxyAddress = loadDeployedAddress(networkName, 'interestManager')
	}

	let ideaTokenExchangeProxyAddress
	if (STAGE <= 4) {
		console.log('4. Deploy IdeaTokenExchangeAVM')
		console.log('==============================================')
		const [ideaTokenExchangeProxy, ideaTokenExchangeLogic] = await deployProxyContract(
			'IdeaTokenExchangeAVM',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the exchange later
			externalContractAddresses.authorizer,
			externalContractAddresses.multisig,
			interestManagerProxyAddress,
			externalContractAddresses.dai,
			externalContractAddresses.bridgeAVM,
		)

		ideaTokenExchangeProxyAddress = ideaTokenExchangeProxy.address
		saveDeployedAddress(networkName, 'ideaTokenExchangeAVM', ideaTokenExchangeProxyAddress)
		saveDeployedABI(networkName, 'ideaTokenExchangeAVM', artifacts.readArtifactSync('IdeaTokenExchangeAVM').abi)
		saveDeployedAddress(networkName, 'ideaTokenExchangeLogic', ideaTokenExchangeLogic.address)
		console.log('')
	} else {
		ideaTokenExchangeProxyAddress = loadDeployedAddress(networkName, 'ideaTokenExchangeAVM')
	}

	if (STAGE <= 5) {
		console.log('5. Set InterestManager owner')
		console.log('==============================================')
		const interestManager = new ethers.Contract(
			interestManagerProxyAddress,
			(await ethers.getContractFactory('InterestManagerStateTransferAVM')).interface,
			deployerAccount
		)
		const tx = await interestManager.setOwner(ideaTokenExchangeProxyAddress, {
			gasPrice: deploymentParams.gasPrice,
		})
		await tx.wait()
		console.log('')
	}

	let ideaTokenLogicAddress
	if (STAGE <= 6) {
		console.log('6. Deploy IdeaToken')
		console.log('==============================================')
		const ideaTokenLogic = await deployContract('IdeaToken')
		ideaTokenLogicAddress = ideaTokenLogic.address
		saveDeployedAddress(networkName, 'ideaTokenLogic', ideaTokenLogicAddress)
		saveDeployedABI(networkName, 'ideaTokenLogic', artifacts.readArtifactSync('IdeaToken').abi)
		console.log('')
	} else {
		ideaTokenLogicAddress = loadDeployedAddress(networkName, 'ideaTokenLogic')
	}

	let ideaTokenFactoryProxyAddress
	if (STAGE <= 7) {
		console.log('7. Deploy IdeaTokenFactoryAVM')
		console.log('==============================================')
		const [ideaTokenFactoryProxy, ideaTokenFactoryLogic] = await deployProxyContract(
			'IdeaTokenFactoryAVM',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the dsPauseProxy later
			ideaTokenExchangeProxyAddress,
			ideaTokenLogicAddress,
			externalContractAddresses.bridgeAVM,
		)

		ideaTokenFactoryProxyAddress = ideaTokenFactoryProxy.address
		saveDeployedAddress(networkName, 'ideaTokenFactoryAVM', ideaTokenFactoryProxyAddress)
		saveDeployedABI(networkName, 'ideaTokenFactoryAVM', artifacts.readArtifactSync('IdeaTokenFactoryAVM').abi)
		saveDeployedAddress(networkName, 'ideaTokenFactoryLogic', ideaTokenFactoryLogic.address)
		console.log('')
	} else {
		ideaTokenFactoryProxyAddress = loadDeployedAddress(networkName, 'ideaTokenFactoryAVM')
	}

	if (STAGE <= 8) {
		console.log('8. Set IdeaTokenFactory address')
		console.log('==============================================')
		const ideaTokenExchange = new ethers.Contract(
			ideaTokenExchangeProxyAddress,
			(await ethers.getContractFactory('IdeaTokenExchangeAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenExchange.setIdeaTokenFactoryAddress(ideaTokenFactoryProxyAddress, {
			gasPrice: deploymentParams.gasPrice,
		})
		await tx.wait()
		console.log('')
	}

	if (STAGE <= 9) {
		console.log('9. Set IdeaTokenExchange owner')
		console.log('==============================================')
		const ideaTokenExchange = new ethers.Contract(
			ideaTokenExchangeProxyAddress,
			(await ethers.getContractFactory('IdeaTokenExchangeAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenExchange.setOwner(dsPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
		await tx.wait()
		console.log('')
	}

	let twitterHandleNameVerifierAddress
	if (STAGE <= 10) {
		console.log('10. Deploy TwitterHandleNameVerifier')
		console.log('==============================================')
		const twitterHandleNameVerifier = await deployContract('TwitterHandleNameVerifier')

		twitterHandleNameVerifierAddress = twitterHandleNameVerifier.address
		saveDeployedAddress(networkName, 'twitterHandleNameVerifier', twitterHandleNameVerifier.address)
		saveDeployedABI(
			networkName,
			'twitterHandleNameVerifier',
			artifacts.readArtifactSync('TwitterHandleNameVerifier').abi
		)
		console.log('')
	} else {
		twitterHandleNameVerifierAddress = loadDeployedAddress(networkName, 'twitterHandleNameVerifier')
	}
	let wikipediaNameVerifierAddress
	if (STAGE <= 10) {
		console.log('10. Deploy WikipediaNameVerifier')
		console.log('==============================================')
		const wikipediaNameVerifier = await deployContract('WikipediaNameVerifier')

		wikipediaNameVerifierAddress = wikipediaNameVerifier.address
		saveDeployedAddress(networkName, 'wikipediaNameVerifier', wikipediaNameVerifier.address)
		saveDeployedABI(
			networkName,
			'WikipediaNameVerifier',
			artifacts.readArtifactSync('WikipediaNameVerifier').abi
		)
		console.log('')
	} else {
		wikipediaNameVerifierAddress = loadDeployedAddress(networkName, 'wikipediaNameVerifier')
	}

	let mindsNameVerifierAddress
	if (STAGE <= 10) {
		console.log('10. Deploy MindsNameVerifier')
		console.log('==============================================')
		const mindsNameVerifier = await deployContract('MindsNameVerifier')

		mindsNameVerifierAddress = mindsNameVerifier.address
		saveDeployedAddress(networkName, 'mindsNameVerifier', mindsNameVerifier.address)
		saveDeployedABI(
			networkName,
			'mindsNameVerifier',
			artifacts.readArtifactSync('MindsNameVerifier').abi
		)
		console.log('')
	} else {
		mindsNameVerifierAddress = loadDeployedAddress(networkName, 'mindsNameVerifier')
	}

	if (STAGE <= 11) {
		console.log('11. Add Twitter market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenFactory.addMarket(
			'Twitter',
			twitterHandleNameVerifierAddress,
			deploymentParams.twitterBaseCost,
			deploymentParams.twitterPriceRise,
			deploymentParams.twitterHatchTokens,
			deploymentParams.twitterTradingFeeRate,
			deploymentParams.twitterPlatformFeeRate,
			deploymentParams.twitterAllInterestToPlatform,
			{ gasPrice: deploymentParams.gasPrice }
		)
		await tx.wait()
		console.log('')
	}

	if (STAGE <= 11) {
		console.log('11. Add Wiki market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenFactory.addMarket(
			'Wikipedia',
			wikipediaNameVerifierAddress,
			deploymentParams.twitterBaseCost,
			deploymentParams.twitterPriceRise,
			deploymentParams.twitterHatchTokens,
			deploymentParams.twitterTradingFeeRate,
			deploymentParams.twitterPlatformFeeRate,
			true,
			{ gasPrice: deploymentParams.gasPrice, gasLimit: ethers.BigNumber.from(6000000) }
		)
		await tx.wait()
		console.log('')
	}

	if (STAGE <= 11) {
		console.log('11. Add Minds market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenFactory.addMarket(
			'Minds',
			mindsNameVerifierAddress,
			deploymentParams.mindsBaseCost,
			deploymentParams.mindsPriceRise,
			deploymentParams.mindsHatchTokens,
			deploymentParams.mindsTradingFeeRate,
			deploymentParams.mindsPlatformFeeRate,
			deploymentParams.mindsAllInterestToPlatform,
			{ gasPrice: deploymentParams.gasPrice }
		)
		await tx.wait()
		console.log('')
	}

	let substackNameVerifierAddress
	if (STAGE <= 12) {
		console.log('12. Deploy SubstackNameVerifier')
		console.log('==============================================')
		const substackNameVerifier = await deployContract('SubstackNameVerifier')

		substackNameVerifierAddress = substackNameVerifier.address
		saveDeployedAddress(networkName, 'substackNameVerifier', substackNameVerifier.address)
		saveDeployedABI(networkName, 'substackNameVerifier', artifacts.readArtifactSync('SubstackNameVerifier').abi)
		console.log('')
	} else {
		substackNameVerifierAddress = loadDeployedAddress(networkName, 'substackNameVerifier')
	}

	if (STAGE <= 13) {
		console.log('13. Add Substack market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenFactory.addMarket(
			'Substack',
			substackNameVerifierAddress,
			deploymentParams.substackBaseCost,
			deploymentParams.substackPriceRise,
			deploymentParams.substackHatchTokens,
			deploymentParams.substackTradingFeeRate,
			deploymentParams.substackPlatformFeeRate,
			deploymentParams.substackAllInterestToPlatform,
			{ gasPrice: deploymentParams.gasPrice }
		)
		await tx.wait()
		console.log('')
	}

	let showtimeNameVerifierAddress
	if (STAGE <= 14) {
		console.log('14. Deploy ShowtimeNameVerifier')
		console.log('==============================================')
		const showtimeNameVerifier = await deployContract('ShowtimeNameVerifier')

		showtimeNameVerifierAddress = showtimeNameVerifier.address
		saveDeployedAddress(networkName, 'showtimeNameVerifier', showtimeNameVerifier.address)
		saveDeployedABI(networkName, 'showtimeNameVerifier', artifacts.readArtifactSync('ShowtimeNameVerifier').abi)
		console.log('')
	} else {
		showtimeNameVerifierAddress = loadDeployedAddress(networkName, 'showtimeNameVerifier')
	}

	if (STAGE <= 15) {
		console.log('15. Add Showtime market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenFactory.addMarket(
			'Showtime',
			showtimeNameVerifierAddress,
			deploymentParams.showtimeBaseCost,
			deploymentParams.showtimePriceRise,
			deploymentParams.showtimeHatchTokens,
			deploymentParams.showtimeTradingFeeRate,
			deploymentParams.showtimePlatformFeeRate,
			deploymentParams.showtimeAllInterestToPlatform,
			{ gasPrice: deploymentParams.gasPrice }
		)
		await tx.wait()
		console.log('')
	}

	if (STAGE <= 16) {
		console.log('16. Set IdeaTokenFactory owner')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenFactory.setOwner(dsPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
		await tx.wait()
		console.log('')
	}

	let ideaTokenVaultProxyAddress
	if (STAGE <= 17) {
		console.log('17. Deploy IdeaTokenVault')
		console.log('==============================================')
		const [ideaTokenVaultProxy, ideaTokenVaultLogic] = await deployProxyContract(
			'IdeaTokenVault',
			proxyAdminAddress,
			ideaTokenFactoryProxyAddress
		)

		ideaTokenVaultProxyAddress = ideaTokenVaultProxy.address
		saveDeployedAddress(networkName, 'ideaTokenVault', ideaTokenVaultProxyAddress)
		saveDeployedABI(networkName, 'ideaTokenVault', artifacts.readArtifactSync('IdeaTokenVault').abi)
		saveDeployedAddress(networkName, 'ideaTokenVaultLogic', ideaTokenVaultLogic.address)
		console.log('')
	} else {
		ideaTokenVaultProxyAddress = loadDeployedAddress(networkName, 'ideaTokenVault')
	}
	/*
	if (STAGE <= 18) {
		console.log('18. Deploy MultiAction')
		console.log('==============================================')
		const multiAction = await deployContract(
			'MultiAction',
			ideaTokenExchangeProxyAddress,
			ideaTokenFactoryProxyAddress,
			ideaTokenVaultProxyAddress,
			externalContractAddresses.dai,
			externalContractAddresses.uniswapV2Router02,
			externalContractAddresses.weth
		)
		saveDeployedAddress(networkName, 'multiAction', multiAction.address)
		saveDeployedABI(networkName, 'multiAction', artifacts.readArtifactSync('MultiAction').abi)
		console.log('')
	}
	*/
	if (STAGE <= 19) {
		console.log('19. Deploy AddMarketSpell')
		console.log('==============================================')
		const addMarketSpell = await deployContract('AddMarketSpell')
		saveDeployedAddress(networkName, 'addMarketSpell', addMarketSpell.address)
		saveDeployedABI(networkName, 'addMarketSpell', artifacts.readArtifactSync('AddMarketSpell').abi)
		console.log('')
	}

	if (STAGE <= 20) {
		console.log('20. Deploy ChangeLogicSpell')
		console.log('==============================================')
		const changeLogicSpell = await deployContract('ChangeLogicSpell')
		saveDeployedAddress(networkName, 'changeLogicSpell', changeLogicSpell.address)
		saveDeployedABI(networkName, 'changeLogicSpell', artifacts.readArtifactSync('ChangeLogicSpell').abi)
		console.log('')
	}

	if (STAGE <= 21) {
		console.log('21. Deploy ChangeLogicAndCallSpell')
		console.log('==============================================')
		const changeLogicAndCallSpell = await deployContract('ChangeLogicAndCallSpell')
		saveDeployedAddress(networkName, 'changeLogicAndCallSpell', changeLogicAndCallSpell.address)
		saveDeployedABI(
			networkName,
			'changeLogicAndCallSpell',
			artifacts.readArtifactSync('ChangeLogicAndCallSpell').abi
		)
		console.log('')
	}

	return

	if (STAGE <= 20) {
		console.log('20. Deploy SetTokenOwnerSpell')
		console.log('==============================================')
		const setTokenOwnerSpell = await deployContract('SetTokenOwnerSpell')
		saveDeployedAddress(networkName, 'setTokenOwnerSpell', setTokenOwnerSpell.address)
		saveDeployedABI(networkName, 'setTokenOwnerSpell', artifacts.readArtifactSync('SetTokenOwnerSpell').abi)
		console.log('')
	}

	if (STAGE <= 21) {
		console.log('21. Deploy SetPlatformOwnerSpell')
		console.log('==============================================')
		const setPlatformOwnerSpell = await deployContract('SetPlatformOwnerSpell')
		saveDeployedAddress(networkName, 'setPlatformOwnerSpell', setPlatformOwnerSpell.address)
		saveDeployedABI(networkName, 'setPlatformOwnerSpell', artifacts.readArtifactSync('SetPlatformOwnerSpell').abi)
		console.log('')
	}

	if (STAGE <= 22) {
		console.log('22. Deploy SetTradingFeeSpell')
		console.log('==============================================')
		const setTradingFeeSpell = await deployContract('SetTradingFeeSpell')
		saveDeployedAddress(networkName, 'setTradingFeeSpell', setTradingFeeSpell.address)
		saveDeployedABI(networkName, 'setTradingFeeSpell', artifacts.readArtifactSync('SetTradingFeeSpell').abi)
		console.log('')
	}

	if (STAGE <= 23) {
		console.log('23. Deploy SetPlatformFeeSpell')
		console.log('==============================================')
		const setPlatformFeeSpell = await deployContract('SetPlatformFeeSpell')
		saveDeployedAddress(networkName, 'setPlatformFeeSpell', setPlatformFeeSpell.address)
		saveDeployedABI(networkName, 'setPlatformFeeSpell', artifacts.readArtifactSync('SetPlatformFeeSpell').abi)
		console.log('')
	}

	if (STAGE <= 24) {
		console.log('24. Deploy ChangeLogicSpell')
		console.log('==============================================')
		const changeLogicSpell = await deployContract('ChangeLogicSpell')
		saveDeployedAddress(networkName, 'changeLogicSpell', changeLogicSpell.address)
		saveDeployedABI(networkName, 'changeLogicSpell', artifacts.readArtifactSync('ChangeLogicSpell').abi)
		console.log('')
	}
}

async function deployProxyContract(name, admin, ...params) {
	const logic = await deployContract(name)

	const data = logic.interface.encodeFunctionData('initialize', [...params])
	const proxy = await deployContract('AdminUpgradeabilityProxy', logic.address, admin, data)

	return [proxy, logic]
}

async function deployContract(name, ...params) {
	console.log(`Deploying contract ${name}`)
	const contractFactory = await ethers.getContractFactory(name)
	const deployed = await contractFactory.deploy(...params, { gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()

	return deployed
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
