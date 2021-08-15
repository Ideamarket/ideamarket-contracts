const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	let networkName = (await ethers.provider.getNetwork()).name
	if (networkName === 'rinkeby') {
		networkName = 'test-avm-l1'
	} else {
		throw 'cannot work with network: ' + networkName
	}

	const deploymentParams = config.deploymentParams[networkName]
	const ideaTokenExchangeStateTransferAddress = loadDeployedAddress(networkName, 'ideaTokenExchange')

	const value = deploymentParams.maxSubmissionCostExchangeStaticVarsTransfer.add(
		deploymentParams.gasLimitExchangeStaticVarsTransfer.mul(
			deploymentParams.l2GasPriceBidExchangeStaticVarsTransfer
		)
	)

	console.log('Network', networkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('L2 Gas Limit', deploymentParams.gasLimitExchangeStaticVarsTransfer.toString())
	console.log('L2 Submission Cost', deploymentParams.maxSubmissionCostExchangeStaticVarsTransfer.toString())
	console.log('L2 Gas price bid', deploymentParams.l2GasPriceBidExchangeStaticVarsTransfer.toString())
	console.log('Value', value.toString())
	console.log('IdeaTokenExchangeStateTransferAddress', ideaTokenExchangeStateTransferAddress)
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

	console.log('Executing static vars state transfer')
	const tx = await ideaTokenExchangeStateTransfer.transferStaticVars(
		deploymentParams.gasLimitExchangeStaticVarsTransfer,
		deploymentParams.maxSubmissionCostExchangeStaticVarsTransfer,
		deploymentParams.l2GasPriceBidExchangeStaticVarsTransfer,
		{
			gasPrice: deploymentParams.gasPrice,
			value: value,
		}
	)
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
