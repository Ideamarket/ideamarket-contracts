const { l2ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

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

	const deploymentParams = config.deploymentParams[l2NetworkName]

	const l2ProxyAdminAddress = loadDeployedAddress(l2NetworkName, 'proxyAdminOVM')

	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVM')
	const l2ExchangeNewLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVMLogic')

	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM')
	const l2FactoryNewLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVMLogic')

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('L2 ProxyAdmin', l2ProxyAdminAddress)

	console.log('')
	console.log('L2 IdeaTokenExchange', l2ExchangeAddress)
	console.log('L2 IdeaTokenEchange new logic', l2ExchangeNewLogicAddress)
	console.log('')

	console.log('L2 InterestManager', l2FactoryAddress)
	console.log('L2 InterestManager new logic', l2FactoryNewLogicAddress)
	console.log('')

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	const proxyAdminContract = new l2ethers.Contract(
		l2ProxyAdminAddress,
		(await l2ethers.getContractFactory('ProxyAdminOVM')).interface,
		deployerAccount
	)

	let tx
	console.log('Setting IdeaTokenExchange logic')
	tx = await proxyAdminContract.upgrade(l2ExchangeAddress, l2ExchangeNewLogicAddress, {
		gasPrice: deploymentParams.gasPrice,
	})
	await tx.wait()

	console.log('Setting IdeaTokenFactory logic')
	tx = await proxyAdminContract.upgrade(l2FactoryAddress, l2FactoryNewLogicAddress, {
		gasPrice: deploymentParams.gasPrice,
	})
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
