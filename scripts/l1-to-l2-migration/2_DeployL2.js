const { l2ethers, artifacts } = require('hardhat')
const { read, loadDeployedAddress, saveDeployedAddress, saveDeployedABI } = require('../shared')
const config = require('./config')

let deploymentParams
let externalContractAddresses

async function main() {
	const deployerAccount = (await l2ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await l2ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 69) {
		l2NetworkName = 'kovan-ovm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	deploymentParams = config.deploymentParams[l2NetworkName]
	externalContractAddresses = config.externalContractAddresses[l2NetworkName]

	const STAGE = 1

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('Stage', STAGE)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	if (STAGE <= 1) {
		console.log('1. Deploy Timelock')
		console.log('==============================================')
		const dsPause = await deployContract('DSPauseOVM')
		const tx = await dsPause.initialize(deploymentParams.timelockDelay, externalContractAddresses.multisig, {
			gasPrice: deploymentParams.gasPrice,
		})
		await tx.wait()
		const dsPauseProxyAddress = await dsPause._proxy()

		saveDeployedAddress(l2NetworkName, 'dsPauseOVM', dsPause.address)
		saveDeployedABI(l2NetworkName, 'dsPauseOVM', artifacts.readArtifactSync('DSPause').abi)
		saveDeployedAddress(l2NetworkName, 'dsPauseOVMProxy', dsPauseProxyAddress)
		saveDeployedABI(l2NetworkName, 'dsPauseOVMProxy', artifacts.readArtifactSync('DSPauseProxy').abi)
		console.log('')
	}

	let proxyAdminAddress
	if (STAGE <= 2) {
		console.log('2. Deploy ProxyAdmin')
		console.log('==============================================')
		proxyAdminAddress = (await deployContract('ProxyAdminOVM')).address
		saveDeployedAddress(l2NetworkName, 'proxyAdminOVM', proxyAdminAddress)
		saveDeployedABI(l2NetworkName, 'proxyAdminOVM', artifacts.readArtifactSync('ProxyAdminOVM').abi)
		console.log('')
	} else {
		proxyAdminAddress = loadDeployedAddress(l2NetworkName, 'proxyAdminOVM')
	}

	let interestManagerProxyAddress
	if (STAGE <= 3) {
		console.log('3. Deploy InterestManagerStateTransferOVM')
		console.log('==============================================')
		const [interestManagerProxy, interestManagerLogic] = await deployProxyContract(
			'InterestManagerStateTransferOVM',
			'initializeStateTransfer',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the exchange later
			externalContractAddresses.dai
		)

		interestManagerProxyAddress = interestManagerProxy.address
		saveDeployedAddress(l2NetworkName, 'interestManagerOVM', interestManagerProxyAddress)
		saveDeployedABI(
			l2NetworkName,
			'interestManagerOVM',
			artifacts.readArtifactSync('InterestManagerStateTransferOVM').abi
		)
		saveDeployedAddress(l2NetworkName, 'interestManagerOVMLogic', interestManagerLogic.address)
		console.log('')
	} else {
		interestManagerProxyAddress = loadDeployedAddress(l2NetworkName, 'interestManagerOVM')
	}

	const bridgeOVMAddress = loadDeployedAddress(l2NetworkName, 'bridgeOVM')

	let ideaTokenExchangeProxyAddress
	if (STAGE <= 4) {
		console.log('4. Deploy IdeaTokenExchangeStateTransferOVM')
		console.log('==============================================')
		const [ideaTokenExchangeProxy, ideaTokenExchangeLogic] = await deployProxyContract(
			'IdeaTokenExchangeStateTransferOVM',
			'initialize',
			proxyAdminAddress,
			deployerAddress,
			externalContractAddresses.authorizer,
			externalContractAddresses.multisig,
			interestManagerProxyAddress,
			externalContractAddresses.dai,
			bridgeOVMAddress
		)

		ideaTokenExchangeProxyAddress = ideaTokenExchangeProxy.address
		saveDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVM', ideaTokenExchangeProxyAddress)
		saveDeployedABI(
			l2NetworkName,
			'ideaTokenExchangeOVM',
			artifacts.readArtifactSync('IdeaTokenExchangeStateTransferOVM').abi
		)
		saveDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVMLogic', ideaTokenExchangeLogic.address)
		console.log('')
	} else {
		ideaTokenExchangeProxyAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVMLogic')
	}

	if (STAGE <= 5) {
		console.log('5. Set InterestManager owner')
		console.log('==============================================')
		const interestManager = new l2ethers.Contract(
			interestManagerProxyAddress,
			(await l2ethers.getContractFactory('InterestManagerStateTransferOVM')).interface,
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
		saveDeployedAddress(l2NetworkName, 'ideaTokenLogic', ideaTokenLogicAddress)
		saveDeployedABI(l2NetworkName, 'ideaTokenLogic', artifacts.readArtifactSync('IdeaToken').abi)
		console.log('')
	} else {
		ideaTokenLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenLogic')
	}

	let ideaTokenFactoryProxyAddress
	if (STAGE <= 7) {
		console.log('7. Deploy IdeaTokenFactoryStateTransferOVM')
		console.log('==============================================')
		const [ideaTokenFactoryProxy, ideaTokenFactoryLogic] = await deployProxyContract(
			'IdeaTokenFactoryStateTransferOVM',
			'initialize',
			proxyAdminAddress,
			deployerAddress,
			ideaTokenExchangeProxyAddress,
			ideaTokenLogicAddress,
			bridgeOVMAddress
		)

		ideaTokenFactoryProxyAddress = ideaTokenFactoryProxy.address
		saveDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM', ideaTokenFactoryProxyAddress)
		saveDeployedABI(
			l2NetworkName,
			'ideaTokenFactoryOVM',
			artifacts.readArtifactSync('IdeaTokenFactoryStateTransferOVM').abi
		)
		saveDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVMLogic', ideaTokenFactoryLogic.address)
		console.log('')
	} else {
		ideaTokenFactoryProxyAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVMLogic')
	}

	if (STAGE <= 8) {
		console.log('8. Set IdeaTokenFactory address')
		console.log('==============================================')
		const ideaTokenExchange = new l2ethers.Contract(
			ideaTokenExchangeProxyAddress,
			(await l2ethers.getContractFactory('IdeaTokenExchangeStateTransferOVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenExchange.setIdeaTokenFactoryAddress(ideaTokenFactoryProxyAddress, {
			gasPrice: deploymentParams.gasPrice,
		})
		await tx.wait()
		console.log('')
	}

	let twitterHandleNameVerifierAddress
	if (STAGE <= 10) {
		console.log('10. Deploy TwitterHandleNameVerifier')
		console.log('==============================================')
		const twitterHandleNameVerifier = await deployContract('TwitterHandleNameVerifier')

		twitterHandleNameVerifierAddress = twitterHandleNameVerifier.address
		saveDeployedAddress(l2NetworkName, 'twitterHandleNameVerifier', twitterHandleNameVerifier.address)
		saveDeployedABI(
			l2NetworkName,
			'twitterHandleNameVerifier',
			artifacts.readArtifactSync('TwitterHandleNameVerifier').abi
		)
		console.log('')
	} else {
		twitterHandleNameVerifierAddress = loadDeployedAddress(l2NetworkName, 'twitterHandleNameVerifier')
	}

	if (STAGE <= 11) {
		console.log('11. Add Twitter market')
		console.log('==============================================')
		const ideaTokenFactory = new l2ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await l2ethers.getContractFactory('IdeaTokenFactoryStateTransferOVM')).interface,
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

	let substackNameVerifierAddress
	if (STAGE <= 12) {
		console.log('12. Deploy SubstackNameVerifier')
		console.log('==============================================')
		const substackNameVerifier = await deployContract('SubstackNameVerifier')

		substackNameVerifierAddress = substackNameVerifier.address
		saveDeployedAddress(l2NetworkName, 'substackNameVerifier', substackNameVerifier.address)
		saveDeployedABI(l2NetworkName, 'substackNameVerifier', artifacts.readArtifactSync('SubstackNameVerifier').abi)
		console.log('')
	} else {
		substackNameVerifierAddress = loadDeployedAddress(l2NetworkName, 'substackNameVerifier')
	}

	if (STAGE <= 13) {
		console.log('13. Add Substack market')
		console.log('==============================================')
		const ideaTokenFactory = new l2ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await l2ethers.getContractFactory('IdeaTokenFactoryStateTransferOVM')).interface,
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

	let ideaTokenVaultProxyAddress
	if (STAGE <= 15) {
		console.log('15. Deploy IdeaTokenVault')
		console.log('==============================================')
		const [ideaTokenVaultProxy, ideaTokenVaultLogic] = await deployProxyContract(
			'IdeaTokenVault',
			'initialize',
			proxyAdminAddress,
			ideaTokenFactoryProxyAddress
		)

		ideaTokenVaultProxyAddress = ideaTokenVaultProxy.address
		saveDeployedAddress(l2NetworkName, 'ideaTokenVault', ideaTokenVaultProxyAddress)
		saveDeployedABI(l2NetworkName, 'ideaTokenVault', artifacts.readArtifactSync('IdeaTokenVault').abi)
		saveDeployedAddress(l2NetworkName, 'ideaTokenVaultLogic', ideaTokenVaultLogic.address)
		console.log('')
	} else {
		ideaTokenVaultProxyAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenVault')
	}

	if (STAGE <= 16) {
		console.log('16. Deploy MultiActionOVM')
		console.log('==============================================')
		const [multiActionOVMProxy, multiActionOVMLogic] = await deployProxyContract(
			'MultiActionOVM',
			'initialize',
			proxyAdminAddress,
			ideaTokenExchangeProxyAddress,
			ideaTokenFactoryProxyAddress,
			ideaTokenVaultProxyAddress,
			externalContractAddresses.dai,
			externalContractAddresses.oweth,
			externalContractAddresses.uniswapV2Router02
		)

		saveDeployedAddress(l2NetworkName, 'multiActionOVM', multiActionOVMProxy.address)
		saveDeployedABI(l2NetworkName, 'multiActionOVM', artifacts.readArtifactSync('MultiActionOVM').abi)
		saveDeployedAddress(l2NetworkName, 'multiActionOVMLogic', multiActionOVMLogic.address)
		console.log('')
	}
}

async function deployProxyContract(name, initializer, admin, ...params) {
	const logic = await deployContract(name)

	const data = logic.interface.encodeFunctionData(initializer, [...params])
	const proxy = await deployContract('AdminUpgradeabilityProxyOVM')

	console.log('Initializing AdminUpgradeabilityProxyOVM')
	const init = await proxy.initialize(logic.address, admin, data, { gasPrice: deploymentParams.gasPrice })
	await init.wait()

	return [proxy, logic]
}

async function deployContract(name, ...params) {
	console.log(`Deploying contract ${name}`)
	const contractFactory = await l2ethers.getContractFactory(name)
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
