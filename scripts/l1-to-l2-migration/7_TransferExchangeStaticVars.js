const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	let networkName = (await ethers.provider.getNetwork()).name
	if (networkName === 'kovan') {
		console.log('Using Kovan')
	} else {
		throw 'cannot work with network: ' + networkName
	}

	const deploymentParams = config.deploymentParams[l2NetworkName]
	const ideaTokenExchangeStateTransferAddress = loadDeployedAddress(networkName, 'ideaTokenExchange')

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('IdeaTokenExchangeStateTransferAddress', ideaTokenExchangeStateTransferAddress)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}

	const ideaTokenExchangeStateTransfer = new ethers.Contract(
		ideaTokenExchangeStateTransferAddress,
		(await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')).interface,
		deployerAccount
	)

	console.log('Executing static vars state transfer')
	const tx = await ideaTokenExchangeStateTransfer.transferStaticVars({ gasPrice: deploymentParams.gasPrice })
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
