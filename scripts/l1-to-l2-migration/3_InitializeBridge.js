const { l2ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await l2ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await l2ethers.provider.getNetwork()).chainId
	let l1NetworkName = ''
	let l2NetworkName = ''

	if (chainID === 69) {
		l1NetworkName = 'kovan'
		l2NetworkName = 'kovan-ovm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const deploymentParams = config.deploymentParams[l2NetworkName]
	const externalContractAddresses = config.externalContractAddresses[l2NetworkName]

	const bridgeOVMAddress = loadDeployedAddress(l2NetworkName, 'bridgeOVM')
	const l1ExchangeAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')
	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVM')
	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM')

	console.log(`Networks (${l1NetworkName},${l2NetworkName})`)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('L2 Bridge Address', bridgeOVMAddress)
	console.log('L2 Bridge Owner', deployerAddress)
	console.log('L1 Exchange Address', l1ExchangeAddress)
	console.log('L2 CrossDomainMessenger', externalContractAddresses.crossDomainMessenger)
	console.log('l2 IdeaTokenExchange Address', l2ExchangeAddress)
	console.log('L2 IdeaTokenFactory Address', l2FactoryAddress)

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	const bridgeOVM = new l2ethers.Contract(
		bridgeOVMAddress,
		(await l2ethers.getContractFactory('BridgeOVM')).interface,
		deployerAccount
	)

	const tx = await bridgeOVM.initialize(
		l1ExchangeAddress,
		externalContractAddresses.crossDomainMessenger,
		l2ExchangeAddress,
		l2FactoryAddress,
		{ gasPrice: deploymentParams.gasPrice }
	)
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
