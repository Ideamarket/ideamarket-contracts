const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await ethers.provider.getNetwork()).chainId
	let l1NetworkName = ''
	let l2NetworkName = ''

	if (chainID === 144545313136048) {
		l1NetworkName = 'kovan'
		l2NetworkName = 'kovan-avm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const deploymentParams = config.deploymentParams[l2NetworkName]

	const bridgeAVMAddress = loadDeployedAddress(l2NetworkName, 'bridgeAVM')
	const l1ExchangeAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')
	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVM')
	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVM')

	console.log(`Networks (${l1NetworkName},${l2NetworkName})`)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('L2 Bridge Address', bridgeAVMAddress)
	console.log('L2 Bridge Owner', deployerAddress)
	console.log('L1 Exchange Address', l1ExchangeAddress)
	console.log('l2 IdeaTokenExchange Address', l2ExchangeAddress)
	console.log('L2 IdeaTokenFactory Address', l2FactoryAddress)

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	const bridgeAVM = new ethers.Contract(
		bridgeAVMAddress,
		(await ethers.getContractFactory('BridgeAVM')).interface,
		deployerAccount
	)

	const tx = await bridgeAVM.initialize(l1ExchangeAddress, l2ExchangeAddress, l2FactoryAddress, {
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
