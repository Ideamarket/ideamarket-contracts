const { l2ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')

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

	let l2CrossDomainMessengerAddress = ''

	if (chainID === 69) {
		l1NetworkName = 'kovan'
		l2NetworkName = 'kovan-ovm'
		l2CrossDomainMessengerAddress = '0x6f78cde001182d5DCBc63D3C4b8051f2059E79D8'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const bridgeOVMAddress = loadDeployedAddress(l2NetworkName, 'bridgeOVM')
	const l1ExchangeAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')
	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVM')
	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM')

	console.log(`Networks (${l1NetworkName},${l2NetworkName})`)
	console.log('L2 Bridge Address', bridgeOVMAddress)
	console.log('L2 Bridge Owner', deployerAddress)
	console.log('L1 Exchange Address', l1ExchangeAddress)
	console.log('L2 CrossDomainMessenger', l2CrossDomainMessengerAddress)
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

	const tx = await bridgeOVM.initialize(
		l1ExchangeAddress,
		l2CrossDomainMessengerAddress,
		l2ExchangeAddress,
		l2FactoryAddress,
		{ gasPrice: gasPrice }
	)
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
