const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')

const gasPrice = 1000000000 // 1 gwei
const batchSize = 20

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Running from ${deployerAddress}`)
	console.log('')

	let networkName = (await ethers.provider.getNetwork()).name

	if (networkName === 'kovan') {
		console.log('Using Kovan')
	} else {
		throw 'cannot work with network: ' + networkName
	}

	const ideaTokenFactoryAddress = loadDeployedAddress(networkName, 'ideaTokenFactory')
	const ideaTokenFactory = new ethers.Contract(
		ideaTokenFactoryAddress,
		(await ethers.getContractFactory('IdeaTokenFactory')).interface,
		deployerAccount
	)
	const numMarkets = await ideaTokenFactory.getNumMarkets()
	const ideaTokenExchangeStateTransferAddress = loadDeployedAddress(networkName, 'ideaTokenExchange')

	console.log('IdeaTokenExchangeStateTransferAddress', ideaTokenExchangeStateTransferAddress)
	console.log('IdeaTokenFactory', ideaTokenFactoryAddress)
	console.log('Num markets', numMarkets.toString())
	console.log('Batch size', batchSize)
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

	for (let i = 1; i <= numMarkets.toNumber(); i++) {
		const numTokens = (await ideaTokenFactory.getMarketDetailsByID(i)).numTokens
		console.log('Market', i)
		console.log('Num tokens', numTokens.toString())
		const yn = await read('Correct? [Y/n]: ')
		if (yn !== 'Y' && yn !== 'y') {
			console.log('abort')
			return
		}

		for (let j = 1; j <= numTokens.toNumber(); j++) {
			const tokenIDs = []
			for (let c = j; c <= numTokens.toNumber() && c - j < batchSize; c++) {
				tokenIDs.push(c)
			}

			console.log('Executing token vars transfer. Market', i, 'Tokens', tokenIDs)
			const tx = await ideaTokenExchangeStateTransfer.transferTokenVars(i, tokenIDs, { gasPrice: gasPrice })
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