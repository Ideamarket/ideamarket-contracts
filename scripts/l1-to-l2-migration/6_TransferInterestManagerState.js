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
	const interestManagerCompoundStateTransferAddress = loadDeployedAddress(networkName, 'interestManager')

	const value = deploymentParams.maxSubmissionCostInterestManagerStateTransfer.add(
		deploymentParams.gasLimitInterestManagerStateTransfer.mul(
			deploymentParams.l2GasPriceBidInterestManagerStateTransfer
		)
	)

	console.log('Network', networkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('L2 Gas Limit', deploymentParams.gasLimitInterestManagerStateTransfer.toString())
	console.log('L2 Submission Cost', deploymentParams.maxSubmissionCostInterestManagerStateTransfer.toString())
	console.log('L2 Gas price bid', deploymentParams.l2GasPriceBidInterestManagerStateTransfer.toString())
	console.log('Value', value.toString())
	console.log('InterestManagerCompoundStateTransfer', interestManagerCompoundStateTransferAddress)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	const interestManagerCompoundStateTransfer = new ethers.Contract(
		interestManagerCompoundStateTransferAddress,
		(await ethers.getContractFactory('InterestManagerCompoundStateTransfer')).interface,
		deployerAccount
	)

	console.log('Executing state transfer')
	const tx = await interestManagerCompoundStateTransfer.executeStateTransfer(
		deploymentParams.gasLimitInterestManagerStateTransfer,
		deploymentParams.maxSubmissionCostInterestManagerStateTransfer,
		deploymentParams.l2GasPriceBidInterestManagerStateTransfer,
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
