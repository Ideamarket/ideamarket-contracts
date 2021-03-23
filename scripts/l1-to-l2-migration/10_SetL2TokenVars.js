const { l2ethers } = require('hardhat')
const config = require('./config')

const batchSize = 5

async function main() {
	const deployerAccount = (await l2ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await l2ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''
	if (chainID === 69) {
		l2NetworkName = 'kovan-ovm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const deploymentParams = config.deploymentParams[l2NetworkName]
	const bridgeAddress = loadDeployedAddress(l2NetworkName, 'bridgeOVM')
	const ideaTokenFactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM')

	const bridge = new l2ethers.Contract(
		bridgeAddress,
		(await l2ethers.getContractFactory('BridgeOVM')).interface,
		deployerAccount
	)
	const ideaTokenFactory = new l2ethers.Contract(
		ideaTokenFactoryAddress,
		(await l2ethers.getContractFactory('IdeaTokenFactoryOVM')).interface,
		deployerAccount
	)

	const numMarkets = await ideaTokenFactory.getNumMarkets()

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	console.log('')
	console.log('BridgeOVM', bridgeAddress)
	console.log('IdeaTokenFactoryOVM', ideaTokenFactoryAddress)
	console.log('Num markets', numMarkets.toString())
	console.log('Batch size', batchSize)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

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

			console.log('Setting token vars. Market', i, 'Tokens', tokenIDs)
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
