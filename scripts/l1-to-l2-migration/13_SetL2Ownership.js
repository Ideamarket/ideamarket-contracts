const { ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 421611) {
		l2NetworkName = 'test-avm-l2'
	} else if(chainID === 42161) {
		l2NetworkName = 'avm'
	} else {
		throw `unknown chain id: ${chainID}`
	}
	const deploymentParams = config.deploymentParams[l2NetworkName]

	const l2DSPauseProxyAddress = loadDeployedAddress(l2NetworkName, 'dsPauseProxy')
	const l2ProxyAdminAddress = loadDeployedAddress(l2NetworkName, 'proxyAdmin')
	const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVM')
	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVM')

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
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
	console.log('')

	const proxyAdminContract = new ethers.Contract(
		l2ProxyAdminAddress,
		(await ethers.getContractFactory('ProxyAdmin')).interface,
		deployerAccount
	)

	const ideaTokenExchangeContract = new ethers.Contract(
		l2ExchangeAddress,
		(await ethers.getContractFactory('IdeaTokenExchangeAVM')).interface,
		deployerAccount
	)

	const ideaTokenFactoryContract = new ethers.Contract(
		l2FactoryAddress,
		(await ethers.getContractFactory('IdeaTokenFactoryAVM')).interface,
		deployerAccount
	)

	let tx
	console.log('Setting IdeaTokenExchange owner')
	tx = await ideaTokenExchangeContract.setOwner(l2DSPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
	await tx.wait()

	console.log('Setting IdeaTokenFactory owner')
	tx = await ideaTokenFactoryContract.setOwner(l2DSPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
	await tx.wait()

	console.log('Setting ProxyAdmin owner')
	tx = await proxyAdminContract.setOwner(l2DSPauseProxyAddress, { gasPrice: deploymentParams.gasPrice })
	await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
