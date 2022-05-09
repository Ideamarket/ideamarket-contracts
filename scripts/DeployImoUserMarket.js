const { run, ethers, artifacts } = require('hardhat')
const { BigNumber } = require('ethers')

const { read, loadDeployedAddress, saveDeployedAddress, saveDeployedABI } = require('./shared')

const allDeploymentParams = {
	"avm": {
		timelockDelay: '86400', // 24 hours
		gasPrice: 7500000000,
		addressBaseCost: BigNumber.from('1000000000000000000'), // 1 IMO
		addressPriceRise: 0, // 0 IMO
		addressHatchTokens: 0, // 0
		addressTradingFeeRate: 0, // 0.00%
		addressPlatformFeeRate: 0, // 0.00%
		addressAllInterestToPlatform: true,
	},
    'test-avm-l2': {
		timelockDelay: '1',
		gasPrice: 10000000000, // 10 gwei

		addressBaseCost: BigNumber.from('1000000000000000000'), // 1 IMO
		addressPriceRise: 0, // 0 IMO
		addressHatchTokens: 0, // 0
		addressTradingFeeRate: 0, // 0.00%
		addressPlatformFeeRate: 0, // 0.00%
		addressAllInterestToPlatform: true,
	}
}

const allExternalContractAddresses = {
	"avm": {
		multisig: '0x93f9707adb26d98cfc6d73C8840425010AfA968B',
		authorizer: '0x78C15e4B4Ed9D8B4FFd031d0ec7BD09A55d02699',
		imo: '0xb41bd4c99da73510d9e081c5fadbe7a27ac1f814',
		cDai: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
		comp: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
		weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
		uniswapV2Router02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
		bridgeAVM: "0x04C451E7f6E391ee0D004139FFe125Bd75535DE6",
	},
	'test-avm-l2': {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		authorizer: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		imo: '0x634a0900a5F90C9F2d42BF1d49d94B84Db0A260d',
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
	console.log(networkName)
	if (networkName != 'arbitrum') {
		networkName = 'avm-imo-market'

		console.log('Using arbitrum')
		deploymentParams = allDeploymentParams.avm
		externalContractAddresses = allExternalContractAddresses.avm
	} else {
		// if network is not one of the above, manually input data here
		console.log('Using test-avm-l2')
		networkName = 'test-avm-l2-imo-market'
		deploymentParams = allDeploymentParams['test-avm-l2']
		externalContractAddresses = allExternalContractAddresses['test-avm-l2']
	}

	console.log('Block', await ethers.provider.getBlockNumber())

	const STAGE = 10

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
			[deployerAddress, externalContractAddresses.imo])
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
	        externalContractAddresses.imo,
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

	let addressNameVerifierAddress
	if (STAGE <= 10) {
		console.log('12. Deploy addressNameVerifier')
		console.log('==============================================')
		const addressNameVerifier = await deployContract('AddressNameVerifier')

		addressNameVerifierAddress = addressNameVerifier.address
		saveDeployedAddress(networkName, 'addressNameVerifier', addressNameVerifier.address)
		saveDeployedABI(networkName, 'addressNameVerifier', artifacts.readArtifactSync('AddressNameVerifier').abi)
		console.log('')
	} else {
		addressNameVerifierAddress = '0xa5B0932C01FB87AaE5e900d135E65557E3dF498D'
        saveDeployedAddress(networkName, 'addressNameVerifier', addressNameVerifierAddress)
		saveDeployedABI(networkName, 'addressNameVerifier', artifacts.readArtifactSync('AddressNameVerifier').abi)
	}

	if (STAGE <= 13) {
		console.log('13. Add address market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenFactory.addMarket(
			'User',
			addressNameVerifierAddress,
			deploymentParams.addressBaseCost,
			deploymentParams.addressPriceRise,
			deploymentParams.addressHatchTokens,
			deploymentParams.addressTradingFeeRate,
			deploymentParams.addressPlatformFeeRate,
			deploymentParams.addressAllInterestToPlatform,
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
			imo,
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
    return
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
