const { run, ethers, artifacts } = require('hardhat')
const fs = require('fs')

const allDeploymentParams = {
	kovan: {
		timelockDelay: '1',
		gasPrice: 1000000000, // 1 gwei
	},
}

const allExternalContractAddresses = {
	kovan: {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		dai: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa',
		cDai: '0xF0d0EB522cfa50B716B3b1604C4F0fA6f04376AD',
		comp: '0x61460874a7196d6a22D1eE4922473664b3E95270',
		weth: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
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
	if (networkName === 'kovan') {
		deploymentParams = allDeploymentParams.kovan
		externalContractAdresses = allExternalContractAddresses.kovan
	} else {
		throw 'cannot deploy to network: ' + networkName
	}

	console.log('1. Deploy Timelock')
	console.log('==============================================')
	const dsPause = await deployContract('DSPause', deploymentParams.timelockDelay, externalContractAdresses.multisig)
	const dsPauseProxyAddress = await dsPause._proxy()
	saveDeployedAddress(networkName, 'dsPause', dsPause.address)
	saveDeployedABI(networkName, 'dsPause', artifacts.readArtifactSync('DSPause').abi)
	saveDeployedAddress(networkName, 'dsPauseProxy', dsPauseProxyAddress)
	saveDeployedABI(networkName, 'dsPauseProxy', artifacts.readArtifactSync('DSPauseProxy').abi)
	console.log('')

	console.log('2. Deploy ProxyAdmin')
	console.log('==============================================')
	const proxyAdmin = await deployContract('ProxyAdmin', dsPauseProxyAddress)
	saveDeployedAddress(networkName, 'proxyAdmin', proxyAdmin.address)
	saveDeployedABI(networkName, 'proxyAdmin', artifacts.readArtifactSync('ProxyAdmin').abi)
	console.log('')

	console.log('3. Deploy InterestManagerCompound')
	console.log('==============================================')
	const [interestManagerCompoundProxy, interestManagerCompoundLogic] = await deployProxyContract(
		'InterestManagerCompound',
		proxyAdmin.address,
		deployerAddress, // owner - this will be changed to the exchange later
		externalContractAdresses.dai,
		externalContractAdresses.cDai,
		externalContractAdresses.comp,
		externalContractAdresses.multisig
	)

	saveDeployedAddress(networkName, 'interestManager', interestManagerCompoundProxy.address)
	saveDeployedABI(networkName, 'interestManager', artifacts.readArtifactSync('InterestManagerCompound').abi)
	saveDeployedAddress(networkName, 'interestManagerLogic', interestManagerCompoundLogic.address)
	console.log('')

	console.log('4. Deploy IdeaTokenExchange')
	console.log('==============================================')
	const [ideaTokenExchangeProxy, ideaTokenExchangeLogic] = await deployProxyContract(
		'IdeaTokenExchange',
		proxyAdmin.address,
		deployerAddress, // owner - this will be changed to the exchange later
		externalContractAdresses.authorizer,
		externalContractAdresses.multisig,
		interestManagerCompoundProxy.address,
		externalContractAdresses.dai
	)

	saveDeployedAddress(networkName, 'ideaTokenExchange', ideaTokenExchangeProxy.address)
	saveDeployedABI(networkName, 'ideaTokenExchange', artifacts.readArtifactSync('IdeaTokenExchange').abi)
	saveDeployedAddress(networkName, 'ideaTokenExchangeLogic', ideaTokenExchangeLogic.address)
	console.log('')

	console.log('5. Deploy IdeaTokenFactory')
	console.log('==============================================')
	const [ideaTokenFactoryProxy, ideaTokenFactoryLogic] = await deployProxyContract(
		'IdeaTokenFactory',
		proxyAdmin.address,
		dsPauseProxyAddress,
		ideaTokenExchangeProxy.address
	)
	saveDeployedAddress(networkName, 'ideaTokenFactory', ideaTokenFactoryProxy.address)
	saveDeployedABI(networkName, 'ideaTokenFactory', artifacts.readArtifactSync('IdeaTokenFactory').abi)
	saveDeployedAddress(networkName, 'ideaTokenFactoryLogic', ideaTokenFactoryLogic.address)
	console.log('')

	console.log('6. Set InterestManagerCompound owner')
	console.log('==============================================')
	const interestManagerCompound = new ethers.Contract(
		interestManagerCompoundProxy.address,
		interestManagerCompoundLogic.interface,
		deployerAccount
	)
	await interestManagerCompound.setOwner(ideaTokenExchangeProxy.address, { gasPrice: deploymentParams.gasPrice })
	console.log('')

	console.log('7. Set IdeaTokenFactory address')
	console.log('==============================================')
	const ideaTokenExchange = new ethers.Contract(
		ideaTokenExchangeProxy.address,
		ideaTokenExchangeLogic.interface,
		deployerAccount
	)
	await ideaTokenExchange.setIdeaTokenFactoryAddress(ideaTokenFactoryProxy.address, {
		gasPrice: deploymentParams.gasPrice,
	})
	console.log('')

	console.log('8. Set IdeaTokenExchange owner')
	console.log('==============================================')
	await ideaTokenExchange.setOwner(dsPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
	console.log('')

	console.log('9. Deploy CurrencyConverter')
	console.log('==============================================')
	const currencyConverter = await deployContract(
		'CurrencyConverter',
		ideaTokenExchangeProxy.address,
		externalContractAdresses.dai,
		externalContractAdresses.uniswapV2Router02,
		externalContractAdresses.weth
	)
	saveDeployedAddress(networkName, 'currencyConverter', currencyConverter.address)
	saveDeployedABI(networkName, 'currencyConverter', artifacts.readArtifactSync('CurrencyConverter').abi)
	console.log('')

	console.log('10. Deploy AddMarketSpell')
	console.log('==============================================')
	const addMarketSpell = await deployContract('AddMarketSpell')
	saveDeployedAddress(networkName, 'addMarketSpell', addMarketSpell.address)
	saveDeployedABI(networkName, 'addMarketSpell', artifacts.readArtifactSync('AddMarketSpell').abi)
	console.log('')

	console.log('11. Deploy DomainNoSubdomainNameVerifier')
	console.log('==============================================')
	const domainNoSubdomainNameVerifier = await deployContract('DomainNoSubdomainNameVerifier')
	saveDeployedAddress(networkName, 'domainNoSubdomainNameVerifier', domainNoSubdomainNameVerifier.address)
	saveDeployedABI(networkName, 'domainNoSubdomainNameVerifier', artifacts.readArtifactSync('DomainNoSubdomainNameVerifier').abi)
	console.log('')

	console.log('12. Deploy AuthorizeInterestWithdrawerSpell')
	console.log('==============================================')
	const authorizeInterestWithdrawerSpell = await deployContract('AuthorizeInterestWithdrawerSpell')
	saveDeployedAddress(networkName, 'authorizeInterestWithdrawerSpell', authorizeInterestWithdrawerSpell.address)
	saveDeployedABI(
		networkName,
		'authorizeInterestWithdrawerSpell',
		artifacts.readArtifactSync('AuthorizeInterestWithdrawerSpell').abi
	)
	console.log('')

	console.log('13. Deploy AuthorizePlatformFeeWithdrawerSpell')
	console.log('==============================================')
	const authorizePlatformFeeWithdrawerSpell = await deployContract('AuthorizePlatformFeeWithdrawerSpell')
	saveDeployedAddress(networkName, 'authorizePlatformFeeWithdrawerSpell', authorizePlatformFeeWithdrawerSpell.address)
	saveDeployedABI(
		networkName,
		'authorizePlatformFeeWithdrawerSpell',
		artifacts.readArtifactSync('AuthorizePlatformFeeWithdrawerSpell').abi
	)
	console.log('')

	console.log('14. Deploy SetTradingFeeSpell')
	console.log('==============================================')
	const setTradingFeeSpell = await deployContract('SetTradingFeeSpell')
	saveDeployedAddress(networkName, 'setTradingFeeSpell', setTradingFeeSpell.address)
	saveDeployedABI(networkName, 'setTradingFeeSpell', artifacts.readArtifactSync('SetTradingFeeSpell').abi)
	console.log('')

	console.log('15. Deploy SetPlatformFeeSpell')
	console.log('==============================================')
	const setPlatformFeeSpell = await deployContract('SetPlatformFeeSpell')
	saveDeployedAddress(networkName, 'setPlatformFeeSpell', setPlatformFeeSpell.address)
	saveDeployedABI(networkName, 'setPlatformFeeSpell', artifacts.readArtifactSync('SetPlatformFeeSpell').abi)
	console.log('')
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
