const { run, ethers, artifacts } = require('hardhat')
const fs = require('fs')
const { BigNumber } = require('ethers')

const allDeploymentParams = {
	rinkeby: {
		timelockDelay: '1',
		gasPrice: 1000000000, // 1 gwei
		twitterBaseCost: BigNumber.from('1000000000000000000'), // 1 DAI
		twitterPriceRise: BigNumber.from('10000000000000000'), // 0.01 DAI
		twitterTradingFeeRate: BigNumber.from('50'), // 0.50%
		twitterPlatformFeeRate: BigNumber.from('25'), // 0.25%
	},
}

const allExternalContractAddresses = {
	rinkeby: {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		dai: '0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa',
		cDai: '0x6D7F0754FFeb405d23C51CE938289d4835bE3b14',
		comp: '0000000000000000000000000000000000000000', // Not deployed on Rinkeby
		weth: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
	},
}

let deploymentParams
let externalContractAdresses

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Deploying from ${deployerAddress}`)

	await run('compile')
	console.log('')

	const networkName = (await ethers.provider.getNetwork()).name
	if (networkName === 'rinkeby') {
		deploymentParams = allDeploymentParams.rinkeby
		externalContractAdresses = allExternalContractAddresses.rinkeby
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

	let ideaTokenFactoryProxyAddress
	if (STAGE <= 5) {
		console.log('5. Deploy IdeaTokenFactory')
		console.log('==============================================')
		const [ideaTokenFactoryProxy, ideaTokenFactoryLogic] = await deployProxyContract(
			'IdeaTokenFactory',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the dsPauseProxy later
			ideaTokenExchangeProxyAddress
		)

		ideaTokenFactoryProxyAddress = ideaTokenFactoryProxy.address
		saveDeployedAddress(networkName, 'ideaTokenFactory', ideaTokenFactoryProxyAddress)
		saveDeployedABI(networkName, 'ideaTokenFactory', artifacts.readArtifactSync('IdeaTokenFactory').abi)
		saveDeployedAddress(networkName, 'ideaTokenFactoryLogic', ideaTokenFactoryLogic.address)
		console.log('')
	} else {
		ideaTokenFactoryProxyAddress = loadDeployedAddress(networkName, 'ideaTokenFactory')
	}

	let twitterHandleNameVerifierAddress
	if (STAGE <= 6) {
		console.log('6. Deploy TwitterHandleNameVerifier')
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

	if (STAGE <= 7) {
		console.log('7. List Twitter market')
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
			deploymentParams.twitterTradingFeeRate,
			deploymentParams.twitterPlatformFeeRate,
			{ gasPrice: deploymentParams.gasPrice }
		)
		console.log('')
	}

	if (STAGE <= 8) {
		console.log('8. Set IdeaTokenFactory owner')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactory')).interface,
			deployerAccount
		)
		await ideaTokenFactory.setOwner(dsPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
		console.log('')
	}

	if (STAGE <= 9) {
		console.log('9. Set InterestManagerCompound owner')
		console.log('==============================================')
		const interestManagerCompound = new ethers.Contract(
			interestManagerCompoundProxyAddress,
			(await ethers.getContractFactory('InterestManagerCompound')).interface,
			deployerAccount
		)
		await interestManagerCompound.setOwner(ideaTokenExchangeProxyAddress, { gasPrice: deploymentParams.gasPrice })
		console.log('')
	}

	if (STAGE <= 10) {
		console.log('10. Set IdeaTokenFactory address')
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

	if (STAGE <= 11) {
		console.log('11. Set IdeaTokenExchange owner')
		console.log('==============================================')
		const ideaTokenExchange = new ethers.Contract(
			ideaTokenExchangeProxyAddress,
			(await ethers.getContractFactory('IdeaTokenExchange')).interface,
			deployerAccount
		)
		await ideaTokenExchange.setOwner(dsPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
		console.log('')
	}

	if (STAGE <= 12) {
		console.log('12. Deploy CurrencyConverter')
		console.log('==============================================')
		const currencyConverter = await deployContract(
			'CurrencyConverter',
			ideaTokenExchangeProxyAddress,
			externalContractAdresses.dai,
			externalContractAdresses.uniswapV2Router02,
			externalContractAdresses.weth
		)
		saveDeployedAddress(networkName, 'currencyConverter', currencyConverter.address)
		saveDeployedABI(networkName, 'currencyConverter', artifacts.readArtifactSync('CurrencyConverter').abi)
		console.log('')
	}

	if (STAGE <= 13) {
		console.log('13. Deploy AddMarketSpell')
		console.log('==============================================')
		const addMarketSpell = await deployContract('AddMarketSpell')
		saveDeployedAddress(networkName, 'addMarketSpell', addMarketSpell.address)
		saveDeployedABI(networkName, 'addMarketSpell', artifacts.readArtifactSync('AddMarketSpell').abi)
		console.log('')
	}

	if (STAGE <= 14) {
		console.log('14. Deploy AuthorizeInterestWithdrawerSpell')
		console.log('==============================================')
		const authorizeInterestWithdrawerSpell = await deployContract('AuthorizeInterestWithdrawerSpell')
		saveDeployedAddress(networkName, 'authorizeInterestWithdrawerSpell', authorizeInterestWithdrawerSpell.address)
		saveDeployedABI(
			networkName,
			'authorizeInterestWithdrawerSpell',
			artifacts.readArtifactSync('AuthorizeInterestWithdrawerSpell').abi
		)
		console.log('')
	}

	if (STAGE <= 15) {
		console.log('15. Deploy AuthorizePlatformFeeWithdrawerSpell')
		console.log('==============================================')
		const authorizePlatformFeeWithdrawerSpell = await deployContract('AuthorizePlatformFeeWithdrawerSpell')
		saveDeployedAddress(
			networkName,
			'authorizePlatformFeeWithdrawerSpell',
			authorizePlatformFeeWithdrawerSpell.address
		)
		saveDeployedABI(
			networkName,
			'authorizePlatformFeeWithdrawerSpell',
			artifacts.readArtifactSync('AuthorizePlatformFeeWithdrawerSpell').abi
		)
		console.log('')
	}

	if (STAGE <= 16) {
		console.log('16. Deploy SetTradingFeeSpell')
		console.log('==============================================')
		const setTradingFeeSpell = await deployContract('SetTradingFeeSpell')
		saveDeployedAddress(networkName, 'setTradingFeeSpell', setTradingFeeSpell.address)
		saveDeployedABI(networkName, 'setTradingFeeSpell', artifacts.readArtifactSync('SetTradingFeeSpell').abi)
		console.log('')
	}

	if (STAGE <= 17) {
		console.log('17. Deploy SetPlatformFeeSpell')
		console.log('==============================================')
		const setPlatformFeeSpell = await deployContract('SetPlatformFeeSpell')
		saveDeployedAddress(networkName, 'setPlatformFeeSpell', setPlatformFeeSpell.address)
		saveDeployedABI(networkName, 'setPlatformFeeSpell', artifacts.readArtifactSync('SetPlatformFeeSpell').abi)
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
