const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

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
	const deploymentParams = config.deploymentParams[l2NetworkName]

	const l2ProxyAdminAddress = loadDeployedAddress(l2NetworkName, 'proxyAdmin')

	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVM')
	const l2ExchangeNewLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVMLogic')

	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVM')
	const l2FactoryNewLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVMLogic')

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

	const proxyAdminContract = new ethers.Contract(
		l2ProxyAdminAddress,
		(await ethers.getContractFactory('ProxyAdmin')).interface,
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
