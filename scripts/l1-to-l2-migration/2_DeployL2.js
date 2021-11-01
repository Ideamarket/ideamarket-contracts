const { ethers, artifacts } = require('hardhat')
const { read, loadDeployedAddress, saveDeployedAddress, saveDeployedABI } = require('../shared')
const config = require('./config')

let deploymentParams
let externalContractAddresses

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 421611) {
		l2NetworkName = 'test-avm-l2'
	} else if(chainID === 42161) {
		l2NetworkName = 'avm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	deploymentParams = config.deploymentParams[l2NetworkName]
	externalContractAddresses = config.externalContractAddresses[l2NetworkName]

	const bridgeAVMAddress = loadDeployedAddress(l2NetworkName, 'bridgeAVM')
	const STAGE = 1

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('Block', await ethers.provider.getBlockNumber())
	console.log('')
	console.log('L2 Bridge', bridgeAVMAddress)
	console.log('Stage', STAGE)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	let dsPauseProxyAddress
	if (STAGE <= 1) {
		console.log('1. Deploy DSPause')
		console.log('==============================================')
		const dsPause = await deployContract(
			'DSPause',
			deploymentParams.timelockDelay,
			externalContractAddresses.multisig
		)
		dsPauseProxyAddress = await dsPause._proxy()
		saveDeployedAddress(l2NetworkName, 'dsPause', dsPause.address)
		saveDeployedABI(l2NetworkName, 'dsPause', artifacts.readArtifactSync('DSPause').abi)
		saveDeployedAddress(l2NetworkName, 'dsPauseProxy', dsPauseProxyAddress)
		saveDeployedABI(l2NetworkName, 'dsPauseProxy', artifacts.readArtifactSync('DSPauseProxy').abi)
		console.log('')
	} else {
		dsPauseProxyAddress = loadDeployedAddress(l2NetworkName, 'dsPauseProxy')
	}

	let proxyAdminAddress
	if (STAGE <= 2) {
		console.log('2. Deploy ProxyAdmin')
		console.log('==============================================')
		proxyAdminAddress = (await deployContract('ProxyAdmin', deployerAddress)).address // owner - this will be changed to dspause later
		saveDeployedAddress(l2NetworkName, 'proxyAdmin', proxyAdminAddress)
		saveDeployedABI(l2NetworkName, 'proxyAdmin', artifacts.readArtifactSync('ProxyAdmin').abi)
		console.log('')
	} else {
		proxyAdminAddress = loadDeployedAddress(l2NetworkName, 'proxyAdmin')
	}

	let interestManagerProxyAddress
	if (STAGE <= 3) {
		console.log('3. Deploy InterestManagerStateTransferAVM')
		console.log('==============================================')
		const [interestManagerProxy, interestManagerLogic] = await deployProxyContract(
			'InterestManagerStateTransferAVM',
			'initializeStateTransfer',
			proxyAdminAddress,
			deployerAddress, // owner - this will be changed to the exchange later
			externalContractAddresses.dai
		)

		interestManagerProxyAddress = interestManagerProxy.address
		saveDeployedAddress(l2NetworkName, 'interestManagerAVM', interestManagerProxyAddress)
		saveDeployedABI(
			l2NetworkName,
			'interestManagerAVM',
			artifacts.readArtifactSync('InterestManagerStateTransferAVM').abi
		)
		saveDeployedAddress(l2NetworkName, 'interestManagerAVMLogic', interestManagerLogic.address)
		console.log('')
	} else {
		interestManagerProxyAddress = loadDeployedAddress(l2NetworkName, 'interestManagerAVM')
	}

	let ideaTokenExchangeProxyAddress
	if (STAGE <= 4) {
		console.log('4. Deploy IdeaTokenExchangeStateTransferAVM')
		console.log('==============================================')
		const [ideaTokenExchangeProxy, ideaTokenExchangeLogic] = await deployProxyContract(
			'IdeaTokenExchangeStateTransferAVM',
			'initialize',
			proxyAdminAddress,
			deployerAddress,
			externalContractAddresses.authorizer,
			externalContractAddresses.multisig,
			interestManagerProxyAddress,
			externalContractAddresses.dai,
			bridgeAVMAddress
		)

		ideaTokenExchangeProxyAddress = ideaTokenExchangeProxy.address
		saveDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVM', ideaTokenExchangeProxyAddress)
		saveDeployedABI(
			l2NetworkName,
			'ideaTokenExchangeAVM',
			artifacts.readArtifactSync('IdeaTokenExchangeStateTransferAVM').abi
		)
		saveDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVMLogic', ideaTokenExchangeLogic.address)
		console.log('')
	} else {
		ideaTokenExchangeProxyAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVM')
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
		saveDeployedAddress(l2NetworkName, 'ideaTokenLogic', ideaTokenLogicAddress)
		saveDeployedABI(l2NetworkName, 'ideaTokenLogic', artifacts.readArtifactSync('IdeaToken').abi)
		console.log('')
	} else {
		ideaTokenLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenLogic')
	}

	let ideaTokenFactoryProxyAddress
	if (STAGE <= 7) {
		console.log('7. Deploy IdeaTokenFactoryStateTransferAVM')
		console.log('==============================================')
		const [ideaTokenFactoryProxy, ideaTokenFactoryLogic] = await deployProxyContract(
			'IdeaTokenFactoryStateTransferAVM',
			'initialize',
			proxyAdminAddress,
			deployerAddress,
			ideaTokenExchangeProxyAddress,
			ideaTokenLogicAddress,
			bridgeAVMAddress
		)

		ideaTokenFactoryProxyAddress = ideaTokenFactoryProxy.address
		saveDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVM', ideaTokenFactoryProxyAddress)
		saveDeployedABI(
			l2NetworkName,
			'ideaTokenFactoryAVM',
			artifacts.readArtifactSync('IdeaTokenFactoryStateTransferAVM').abi
		)
		saveDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVMLogic', ideaTokenFactoryLogic.address)
		console.log('')
	} else {
		ideaTokenFactoryProxyAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVM')
	}

	if (STAGE <= 8) {
		console.log('8. Set IdeaTokenFactory address')
		console.log('==============================================')
		const ideaTokenExchange = new ethers.Contract(
			ideaTokenExchangeProxyAddress,
			(await ethers.getContractFactory('IdeaTokenExchangeStateTransferAVM')).interface,
			deployerAccount
		)
		const tx = await ideaTokenExchange.setIdeaTokenFactoryAddress(ideaTokenFactoryProxyAddress, {
			gasPrice: deploymentParams.gasPrice,
		})
		await tx.wait()
		console.log('')
	}

	let twitterHandleNameVerifierAddress
	if (STAGE <= 9) {
		console.log('9. Deploy TwitterHandleNameVerifier')
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

	if (STAGE <= 10) {
		console.log('10. Add Twitter market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryStateTransferAVM')).interface,
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
			{ gasPrice: deploymentParams.gasPrice, gasLimit: 10000000 }
		)
		await tx.wait()
		console.log('')
	}

	let substackNameVerifierAddress
	if (STAGE <= 11) {
		console.log('11. Deploy SubstackNameVerifier')
		console.log('==============================================')
		const substackNameVerifier = await deployContract('SubstackNameVerifier')

		substackNameVerifierAddress = substackNameVerifier.address
		saveDeployedAddress(l2NetworkName, 'substackNameVerifier', substackNameVerifier.address)
		saveDeployedABI(l2NetworkName, 'substackNameVerifier', artifacts.readArtifactSync('SubstackNameVerifier').abi)
		console.log('')
	} else {
		substackNameVerifierAddress = loadDeployedAddress(l2NetworkName, 'substackNameVerifier')
	}

	if (STAGE <= 12) {
		console.log('12. Add Substack market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryStateTransferAVM')).interface,
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
			{ gasPrice: deploymentParams.gasPrice, gasLimit: 10000000 }
		)
		await tx.wait()
		console.log('')
	}

	let showtimeNameVerifierAddress
	if (STAGE <= 13) {
		console.log('13. Deploy ShowtimeNameVerifier')
		console.log('==============================================')
		const showtimeNameVerifier = await deployContract('ShowtimeNameVerifier')

		showtimeNameVerifierAddress = showtimeNameVerifier.address
		saveDeployedAddress(l2NetworkName, 'showtimeNameVerifier', showtimeNameVerifier.address)
		saveDeployedABI(l2NetworkName, 'showtimeNameVerifier', artifacts.readArtifactSync('ShowtimeNameVerifier').abi)
		console.log('')
	} else {
		showtimeNameVerifierAddress = loadDeployedAddress(l2NetworkName, 'showtimeNameVerifier')
	}

	if (STAGE <= 14) {
		console.log('14. Add Showtime market')
		console.log('==============================================')
		const ideaTokenFactory = new ethers.Contract(
			ideaTokenFactoryProxyAddress,
			(await ethers.getContractFactory('IdeaTokenFactoryStateTransferAVM')).interface,
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
			{ gasPrice: deploymentParams.gasPrice, gasLimit: 10000000 }
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
		console.log('16. Deploy MultiActionWithoutUniswap')
		console.log('==============================================')
		const multiAction = await deployContract(
			'MultiActionWithoutUniswap',
			ideaTokenExchangeProxyAddress,
			ideaTokenFactoryProxyAddress,
			ideaTokenVaultProxyAddress,
			externalContractAddresses.dai
		)
		saveDeployedAddress(l2NetworkName, 'multiAction', multiAction.address)
		saveDeployedABI(l2NetworkName, 'multiAction', artifacts.readArtifactSync('MultiAction').abi)
		console.log('')
	}
}

async function deployProxyContract(name, initializer, admin, ...params) {
	const logic = await deployContract(name)

	const data = logic.interface.encodeFunctionData(initializer, [...params])

	let proxy
	while (true) {
		console.log('WARN - LOOP')
		try {
			proxy = await deployContract('AdminUpgradeabilityProxy', logic.address, admin, data)
		} catch (ex) {
			console.log(ex)
			continue
		}
		break
	}

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
