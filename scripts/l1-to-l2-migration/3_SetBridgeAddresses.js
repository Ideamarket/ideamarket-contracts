const { l2ethers, artifacts } = require('hardhat')
const { read, loadDeployedAddress, saveDeployedAddress, saveDeployedABI } = require('../shared')

const ethers = undefined

const gasPrice = 0

async function main() {
	const deployerAccount = (await l2ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Running from ${deployerAddress}`)
	console.log('')

	const chainID = (await l2ethers.provider.getNetwork()).chainId
	let l1NetworkName = ''
	let l2NetworkName = ''

	if (chainID === 69) {
		l1NetworkName = 'kovan'
		l2NetworkName = 'kovan-ovm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const bridgeOVMAddress = loadDeployedAddress(l2NetworkName, 'bridgeOVM')
	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVM')
	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM')

	console.log(`Networks (${l1NetworkName},${l2NetworkName})`)
	console.log('L2 Bridge Address', bridgeOVMAddress)
	console.log('l2 IdeaTokenExchange Address', l2ExchangeAddress)
	console.log('L2 IdeaTokenFactory Address', l2FactoryAddress)

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}

	const bridgeOVM = new l2ethers.Contract(
		bridgeOVMAddress,
		(await l2ethers.getContractFactory('BridgeOVM')).interface,
		deployerAccount
	)

	console.log('Setting IdeaTokenExchange address')
	let tx = await bridgeOVM.setL2Exchange(l2ExchangeAddress)
	await tx.wait()

	console.log('Setting IdeaTokenFactory address')
	tx = await bridgeOVM.setL2Factory(l2FactoryAddress)
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
