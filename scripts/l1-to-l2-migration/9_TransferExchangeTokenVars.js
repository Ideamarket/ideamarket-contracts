const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

const batchSize = 20

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
					value: value,
				}
			)
			await tx.wait()
		}
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
