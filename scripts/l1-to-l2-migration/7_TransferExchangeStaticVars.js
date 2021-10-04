const { ethers } = require('hardhat')
const { Bridge } = require('arb-ts')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	let l1NetworkName = (await ethers.provider.getNetwork()).name
	let l2NetworkName

	if (l1NetworkName === 'rinkeby') {
		l1NetworkName = 'test-avm-l1'
		l2NetworkName = 'test-avm-l2'
	} else if(l1NetworkName === 'homestead') {
		l1NetworkName = 'mainnet'
		l2NetworkName = 'avm'
	} else {
		throw 'cannot work with network: ' + l1NetworkName
	}

	const deploymentParams = config.deploymentParams[l1NetworkName]

	const l1EthParams = config.ethParams[l1NetworkName]
	const l2EthParams = config.ethParams[l2NetworkName]
	const l1Provider = new ethers.providers.JsonRpcProvider(l1EthParams.rpcUrl)
	const l2Provider = new ethers.providers.JsonRpcProvider(l2EthParams.rpcUrl)
	const l1Wallet = new ethers.Wallet(l1EthParams.privateKey, l1Provider)
	const l2Wallet = new ethers.Wallet(l2EthParams.privateKey, l2Provider)
	const bridge = await Bridge.init(l1Wallet, l2Wallet)

	const ideaTokenExchangeStateTransferAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')

	const value = deploymentParams.maxSubmissionCostExchangeStaticVarsTransfer.add(
		deploymentParams.gasLimitExchangeStaticVarsTransfer.mul(
			deploymentParams.l2GasPriceBidExchangeStaticVarsTransfer
		)
	)

	console.log('Network', l1NetworkName)
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
	console.log('Transaction confirmed on L1')

	const receipt = await ethers.provider.getTransactionReceipt(tx.hash)
	const seqNum = (await bridge.getInboxSeqNumFromContractTransaction(receipt))[0]
	console.log('Awaiting L2 tx. SeqNum', seqNum.toString())
	const result = await bridge.waitForRetryableReceipt(seqNum)
	if(result.status !== 1) {
		console.log(result)
		throw Error('L2 tx failed')
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
