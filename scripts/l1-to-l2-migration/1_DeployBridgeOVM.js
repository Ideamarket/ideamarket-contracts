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

	let l2CrossDomainMessengerAddress = ''

	if (chainID === 69) {
		l1NetworkName = 'kovan'
		l2NetworkName = 'kovan-ovm'
		l2CrossDomainMessengerAddress = '0x6f78cde001182d5DCBc63D3C4b8051f2059E79D8'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const l1ExchangeAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')

	console.log(`Networks (${l1NetworkName},${l2NetworkName})`)
	console.log('L1 Exchange Address', l1ExchangeAddress)
	console.log('L2 CrossDomainMessenger', l2CrossDomainMessengerAddress)

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}

	console.log(`Deploying contract BridgeOVM to OVM`)
	const contractFactory = await l2ethers.getContractFactory('BridgeOVM')
	const deployed = await contractFactory.deploy(l1ExchangeAddress, l2CrossDomainMessengerAddress, {
		gasPrice: gasPrice,
	})
	await deployed.deployed()

	saveDeployedAddress(l2NetworkName, 'bridgeOVM', deployed.address)
	saveDeployedABI(l2NetworkName, 'bridgeOVM', artifacts.readArtifactSync('BridgeOVM').abi)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
