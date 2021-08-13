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

	const deploymentParams = config.deploymentParams[networkName]

	const value = deploymentParams.maxSubmissionCostExchangePlatformVarsTransfer.add(
		deploymentParams.gasLimitExchangePlatformVarsTransfer.mul(
			deploymentParams.l2GasPriceBidExchangePlatformVarsTransfer
		)
	)

	const ideaTokenFactoryAddress = loadDeployedAddress(networkName, 'ideaTokenFactory')
	const ideaTokenFactory = new ethers.Contract(
		ideaTokenFactoryAddress,
		(await ethers.getContractFactory('IdeaTokenFactory')).interface,
		deployerAccount
	)
	const numMarkets = await ideaTokenFactory.getNumMarkets()
	const ideaTokenExchangeStateTransferAddress = loadDeployedAddress(networkName, 'ideaTokenExchange')

	console.log('Network', networkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('L2 Gas Limit', deploymentParams.gasLimitExchangePlatformVarsTransfer.toString())
	console.log('L2 Submission Cost', deploymentParams.maxSubmissionCostExchangePlatformVarsTransfer.toString())
	console.log('L2 Gas price bid', deploymentParams.l2GasPriceBidExchangePlatformVarsTransfer.toString())
	console.log('Value', value.toString())
	console.log('IdeaTokenExchangeStateTransferAddress', ideaTokenExchangeStateTransferAddress)
	console.log('Num markets: ', numMarkets.toString())
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	const ideaTokenExchangeStateTransfer = new ethers.Contract(
		ideaTokenExchangeStateTransferAddress,
		(await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')).interface,
		deployerAccount
	)

	for (let i = 1; i <= numMarkets.toNumber(); i++) {
		console.log('Executing platform vars state transfer: marketID', i)
		const tx = await ideaTokenExchangeStateTransfer.transferPlatformVars(
			i,
			deploymentParams.gasLimitExchangePlatformVarsTransfer,
			deploymentParams.maxSubmissionCostExchangePlatformVarsTransfer,
			deploymentParams.l2GasPriceBidExchangePlatformVarsTransfer,
			{
				gasPrice: deploymentParams.gasPrice,
				value: value,
			}
		)
		await tx.wait()
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
