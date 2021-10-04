const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')
const { Bridge } = require('arb-ts')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

const batchSize = 20

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

	const ideaTokenFactoryAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenFactory')
	const ideaTokenFactory = new ethers.Contract(
		ideaTokenFactoryAddress,
		(await ethers.getContractFactory('IdeaTokenFactory')).interface,
		deployerAccount
	)
	const numMarkets = await ideaTokenFactory.getNumMarkets()
	const ideaTokenExchangeStateTransferAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')

	console.log('Network', l1NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('L2 Gas Limit per token', deploymentParams.gasLimitExchangeTokensVarsTransferPerToken.toString())
	console.log(
		'L2 Submission Cost per token',
		deploymentParams.maxSubmissionCostExchangeTokenVarsTransferPerToken.toString()
	)
	console.log('L2 Gas price bid', deploymentParams.l2GasPriceBidExchangeTokenVarsTransferPerToken.toString())
	console.log('IdeaTokenExchangeStateTransferAddress', ideaTokenExchangeStateTransferAddress)
	console.log('IdeaTokenFactory', ideaTokenFactoryAddress)
	console.log('Num markets', numMarkets.toString())
	console.log('Batch size', batchSize)
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
		const numTokens = (await ideaTokenFactory.getMarketDetailsByID(i)).numTokens
		console.log('Market', i)
		console.log('Num tokens', numTokens.toString())
		const yn = await read('Correct? [Y/n]: ')
		if (yn !== 'Y' && yn !== 'y') {
			console.log('abort')
			return
		}
		console.log('')

		for (let j = 0; j < Math.ceil(numTokens / batchSize); j++) {
			let tokenIDs = []
			const start = j * batchSize + 1
			for (let c = start; c <= numTokens.toNumber() && c - start < batchSize; c++) {
				tokenIDs.push(c)
			}

			const maxSubmissionCost = BigNumber.from(tokenIDs.length.toString()).mul(
				deploymentParams.maxSubmissionCostExchangeTokenVarsTransferPerToken
			)
			const maxGas = BigNumber.from(tokenIDs.length.toString()).mul(
				deploymentParams.gasLimitExchangeTokensVarsTransferPerToken
			)
			const value = maxSubmissionCost.add(
				maxGas.mul(deploymentParams.l2GasPriceBidExchangeTokenVarsTransferPerToken)
			)

			console.log('Executing token vars transfer. Market', i, 'Tokens', tokenIDs, 'Value', value.toString())
			const yn = await read('Correct? [Y/n]: ')
			if (yn !== 'Y' && yn !== 'y') {
				console.log('abort')
				return
			}
			console.log('')
			const tx = await ideaTokenExchangeStateTransfer.transferTokenVars(
				i,
				tokenIDs,
				maxGas,
				maxSubmissionCost,
				deploymentParams.l2GasPriceBidExchangeTokenVarsTransferPerToken,
				{
					gasPrice: deploymentParams.gasPrice,
					gasLimit: 2000000,
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
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
