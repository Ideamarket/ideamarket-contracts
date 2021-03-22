const { l2ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')

const ethers = undefined
const gasPrice = 0
const batchSize = 5

async function main() {
	const deployerAccount = (await l2ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Running from ${deployerAddress}`)
	console.log('')

	const chainID = (await l2ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 69) {
		l2NetworkName = 'kovan-ovm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const l2DSPauseProxyAddress = loadDeployedAddress(l2NetworkName, 'dsPauseOVMProxy')
	const l2ProxyAdminAddress = loadDeployedAddress(l2NetworkName, 'proxyAdminOVM')
	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVM')
	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM')

	console.log('')
	console.log('L2 DSPauseProxy', l2DSPauseProxyAddress)
	console.log('L2 ProxyAdmin', l2ProxyAdminAddress)
	console.log('L2 IdeaTokenExchange', l2ExchangeAddress)
	console.log('L2 IdeaTokenFactory', l2FactoryAddress)

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}

	const proxyAdminContract = new l2ethers.Contract(
		l2ProxyAdminAddress,
		(await l2ethers.getContractFactory('ProxyAdminOVM')).interface,
		deployerAccount
	)

	const ideaTokenExchangeContract = new l2ethers.Contract(
		l2ExchangeAddress,
		(await l2ethers.getContractFactory('IdeaTokenExchangeOVM')).interface,
		deployerAccount
	)

	const ideaTokenFactoryContract = new l2ethers.Contract(
		l2FactoryAddress,
		(await l2ethers.getContractFactory('IdeaTokenFactoryOVM')).interface,
		deployerAccount
	)

	let tx
	console.log('Setting IdeaTokenExchange owner')
	tx = await ideaTokenExchangeContract.setOwner(l2DSPauseProxyAddress)
	await tx.wait()

	console.log('Setting IdeaTokenFactory owner')
	tx = await ideaTokenFactoryContract.setOwner(l2DSPauseProxyAddress)
	await tx.wait()

	console.log('Setting ProxyAdmin owner')
	tx = await proxyAdminContract.setOwner(l2DSPauseProxyAddress)
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
