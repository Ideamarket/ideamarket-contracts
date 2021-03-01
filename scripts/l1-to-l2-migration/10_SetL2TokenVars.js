const { ethers } = require('hardhat')
const config = require('./config')
const { read, loadDeployedAddress } = require('../shared')

const batchSize = 20

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 144545313136048) {
		l2NetworkName = 'kovan-avm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const deploymentParams = config.deploymentParams[l2NetworkName]
	const bridgeAddress = loadDeployedAddress(l2NetworkName, 'bridgeAVM')
	const ideaTokenFactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVM')

	const bridge = new ethers.Contract(
		bridgeAddress,
		(await ethers.getContractFactory('BridgeAVM')).interface,
		deployerAccount
	)
	const ideaTokenFactory = new ethers.Contract(
		ideaTokenFactoryAddress,
		(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
		deployerAccount
	)

	const numMarkets = await ideaTokenFactory.getNumMarkets()

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('BridgeAVM', bridgeAddress)
	console.log('IdeaTokenFactoryAVM', ideaTokenFactoryAddress)
	console.log('Num markets', numMarkets.toString())
	console.log('Batch size', batchSize)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	for (let i = 1; i <= numMarkets.toNumber(); i++) {
		const numTokens = await bridge._numTokensInMarket(i)

		console.log('Market', i)
		console.log('Num tokens', numTokens.toString())
		const yn = await read('Correct? [Y/n]: ')
		if (yn !== 'Y' && yn !== 'y') {
			console.log('abort')
			return
		}

		for (let j = 0; j < Math.ceil(numTokens / batchSize); j++) {
			const tokenIDs = []
			const start = j * batchSize + 1
			for (let c = start; c <= numTokens.toNumber() && c - start < batchSize; c++) {
				tokenIDs.push(c)
			}

			console.log('Setting token vars. Market', i, 'Tokens', tokenIDs)
			const yn = await read('Correct? [Y/n]: ')
			if (yn !== 'Y' && yn !== 'y') {
				console.log('abort')
				return
			}
			console.log('')
			const tx = await bridge.setTokenVars(i, tokenIDs, { gasPrice: deploymentParams.gasPrice })
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
