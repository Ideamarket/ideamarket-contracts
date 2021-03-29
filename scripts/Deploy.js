const readline = require('readline')

const { run, ethers, artifacts } = require('hardhat')
const fs = require('fs')
const { BigNumber } = require('ethers')

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
}

const allExternalContractAddresses = {
	mainnet: {
		multisig: '0x4905485d8B0Be42b317CCB4806b966aC0d4f4AE8', // TODO
		authorizer: '0x78C15e4B4Ed9D8B4FFd031d0ec7BD09A55d02699', // TODO
		dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // TODO
		cDai: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', // TODO
		comp: '0xc00e94Cb662C3520282E6f5717214004A7f26888', // TODO
		weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // TODO
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // TODO
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
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

async function read(question) {
	return await new Promise((resolve) => {
		rl.question(question, (answer) => {
			return resolve(answer)
		})
	})
}

let deploymentParams
let externalContractAdresses

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Deploying from ${deployerAddress}`)

	await run('compile')
	console.log('')

	let networkName = (await ethers.provider.getNetwork()).name
	if (networkName === 'rinkeby') {
		const input = await read('Use test network? [y/n] ')

		if (input === 'Y' || input === 'y') {
			console.log('Using test network')
			networkName = 'test'
			deploymentParams = allDeploymentParams.test
			externalContractAdresses = allExternalContractAddresses.test
		} else {
			console.log('Using Rinkeby')
			deploymentParams = allDeploymentParams.rinkeby
			externalContractAdresses = allExternalContractAddresses.rinkeby
		}
	} else if (networkName === 'homestead') {
		networkName = 'mainnet'

		console.log('Using Mainnet')
		deploymentParams = allDeploymentParams.mainnet
		externalContractAdresses = allExternalContractAddresses.mainnet
	} else {
		throw 'cannot deploy to network: ' + networkName
	}

	const STAGE = 1

	let dsPauseProxyAddress
	if (STAGE <= 1) {
		console.log('1. Deploy Timelock')
		console.log('==============================================')
		const dsPause = await deployContract(
			'DSPause',
			deploymentParams.timelockDelay,
			externalContractAdresses.multisig
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

	let interestManagerCompoundProxyAddress
	if (STAGE <= 3) {
		console.log('3. Deploy InterestManagerCompound')
		console.log('==============================================')
		const [interestManagerCompoundProxy, interestManagerCompoundLogic] = await deployProxyContract(
			'InterestManagerCompound',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the exchange later
			externalContractAdresses.dai,
			externalContractAdresses.cDai,
			externalContractAdresses.comp,
			externalContractAdresses.multisig
		)

		interestManagerCompoundProxyAddress = interestManagerCompoundProxy.address
		saveDeployedAddress(networkName, 'interestManager', interestManagerCompoundProxyAddress)
		saveDeployedABI(networkName, 'interestManager', artifacts.readArtifactSync('InterestManagerCompound').abi)
		saveDeployedAddress(networkName, 'interestManagerLogic', interestManagerCompoundLogic.address)
		console.log('')
	} else {
		interestManagerCompoundProxyAddress = loadDeployedAddress(networkName, 'interestManager')
	}

	let ideaTokenExchangeProxyAddress
	if (STAGE <= 4) {
		console.log('4. Deploy IdeaTokenExchange')
		console.log('==============================================')
		const [ideaTokenExchangeProxy, ideaTokenExchangeLogic] = await deployProxyContract(
			'IdeaTokenExchange',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the exchange later
			externalContractAdresses.authorizer,
			externalContractAdresses.multisig,
			interestManagerCompoundProxyAddress,
			externalContractAdresses.dai
		)

		ideaTokenExchangeProxyAddress = ideaTokenExchangeProxy.address
		saveDeployedAddress(networkName, 'ideaTokenExchange', ideaTokenExchangeProxyAddress)
		saveDeployedABI(networkName, 'ideaTokenExchange', artifacts.readArtifactSync('IdeaTokenExchange').abi)
		saveDeployedAddress(networkName, 'ideaTokenExchangeLogic', ideaTokenExchangeLogic.address)
		console.log('')
	} else {
		ideaTokenExchangeProxyAddress = loadDeployedAddress(networkName, 'ideaTokenExchange')
	}

	if (STAGE <= 5) {
		console.log('5. Set InterestManagerCompound owner')
		console.log('==============================================')
		const interestManagerCompound = new ethers.Contract(
			interestManagerCompoundProxyAddress,
			(await ethers.getContractFactory('InterestManagerCompound')).interface,
			deployerAccount
		)
		await interestManagerCompound.setOwner(ideaTokenExchangeProxyAddress, { gasPrice: deploymentParams.gasPrice })
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
		console.log('7. Deploy IdeaTokenFactory')
		console.log('==============================================')
		const [ideaTokenFactoryProxy, ideaTokenFactoryLogic] = await deployProxyContract(
			'IdeaTokenFactory',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the dsPauseProxy later
			ideaTokenExchangeProxyAddress,
			ideaTokenLogicAddress
		)

		ideaTokenFactoryProxyAddress = ideaTokenFactoryProxy.address
		saveDeployedAddress(networkName, 'ideaTokenFactory', ideaTokenFactoryProxyAddress)
		saveDeployedABI(networkName, 'ideaTokenFactory', artifacts.readArtifactSync('IdeaTokenFactory').abi)
		saveDeployedAddress(networkName, 'ideaTokenFactoryLogic', ideaTokenFactoryLogic.address)
		console.log('')
	} else {
		ideaTokenFactoryProxyAddress = loadDeployedAddress(networkName, 'ideaTokenFactory')
	}

	if (STAGE <= 8) {
		console.log('8. Set IdeaTokenFactory address')
		console.log('==============================================')
		const ideaTokenExchange = new ethers.Contract(
			ideaTokenExchangeProxyAddress,
			(await ethers.getContractFactory('IdeaTokenExchange')).interface,
			deployerAccount
		)
		await ideaTokenExchange.setIdeaTokenFactoryAddress(ideaTokenFactoryProxyAddress, {
			gasPrice: deploymentParams.gasPrice,
		})
		console.log('')
	}

	if (STAGE <= 9) {
		console.log('9. Set IdeaTokenExchange owner')
		console.log('==============================================')
		const ideaTokenExchange = new ethers.Contract(
			ideaTokenExchangeProxyAddress,
			(await ethers.getContractFactory('IdeaTokenExchange')).interface,
			deployerAccount
		)
		await ideaTokenExchange.setOwner(dsPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
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

	if (STAGE <= 11) {
		console.log('11. Add Twitter market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactory')).interface,
			deployerAccount
		)
		await ideaTokenFactory.addMarket(
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
			(await ethers.getContractFactory('IdeaTokenFactory')).interface,
			deployerAccount
		)
		await ideaTokenFactory.addMarket(
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
		console.log('')
	}

	let showtimeNameVerifierAddress
	if (STAGE <= 14) {
		console.log('12. Deploy ShowtimeNameVerifier')
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
			(await ethers.getContractFactory('IdeaTokenFactory')).interface,
			deployerAccount
		)
		await ideaTokenFactory.addMarket(
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
		console.log('')
	}

	if (STAGE <= 16) {
		console.log('16. Set IdeaTokenFactory owner')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactory')).interface,
			deployerAccount
		)
		await ideaTokenFactory.setOwner(dsPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
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

	if (STAGE <= 18) {
		console.log('18. Deploy MultiAction')
		console.log('==============================================')
		const multiAction = await deployContract(
			'MultiAction',
			ideaTokenExchangeProxyAddress,
			ideaTokenFactoryProxyAddress,
			ideaTokenVaultProxyAddress,
			externalContractAdresses.dai,
			externalContractAdresses.uniswapV2Router02,
			externalContractAdresses.weth
		)
		saveDeployedAddress(networkName, 'multiAction', multiAction.address)
		saveDeployedABI(networkName, 'multiAction', artifacts.readArtifactSync('MultiAction').abi)
		console.log('')
	}

	if (STAGE <= 19) {
		console.log('19. Deploy AddMarketSpell')
		console.log('==============================================')
		const addMarketSpell = await deployContract('AddMarketSpell')
		saveDeployedAddress(networkName, 'addMarketSpell', addMarketSpell.address)
		saveDeployedABI(networkName, 'addMarketSpell', artifacts.readArtifactSync('AddMarketSpell').abi)
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

function loadDeployedAddress(network, contract) {
	const path = 'deployed/deployed-' + network + '.json'
	if (!fs.existsSync(path)) {
		throw new Error('Deployed file does not exist')
	}

	const raw = fs.readFileSync(path)
	const addresses = JSON.parse(raw)

	if (!addresses || !addresses[contract]) {
		throw new Error(`Address for contract ${contract} does not exist`)
	}

	return addresses[contract]
}

function saveDeployedAddress(network, contract, address) {
	let addresses = {}
	const path = 'deployed/deployed-' + network + '.json'
	if (fs.existsSync(path)) {
		const raw = fs.readFileSync(path)
		addresses = JSON.parse(raw)
	}

	addresses[contract] = address
	fs.writeFileSync(path, JSON.stringify(addresses, undefined, 4))
}

function saveDeployedABI(network, contract, abi) {
	let abis = {}
	const path = 'deployed/abis-' + network + '.json'
	if (fs.existsSync(path)) {
		const raw = fs.readFileSync(path)
		abis = JSON.parse(raw)
	}

	abis[contract] = abi
	fs.writeFileSync(path, JSON.stringify(abis))
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
