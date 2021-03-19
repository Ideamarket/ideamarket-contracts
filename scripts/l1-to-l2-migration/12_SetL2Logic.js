const { l2ethers } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')

const ethers = undefined

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

	
	const l2ProxyAdminAddress = loadDeployedAddress(l2NetworkName, 'proxyAdmin')

    const l2ExchangeAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVM')
	const l2ExchangeNewLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVMLogic')

	const l2FactoryAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVM')
	const l2FactoryNewLogicAddress = loadDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVMLogic')

	console.log('')
    console.log('L2 ProxyAdmin', l2ProxyAdminAddress)

	console.log('')
	console.log('L2 IdeaTokenExchange', l2ExchangeAddress)
	console.log('L2 IdeaTokenEchange new logic', l2ExchangeNewLogicAddress)
	console.log('')

	console.log('L2 InterestManager', l2FactoryAddress)
	console.log('L2 InterestManager new logic', l2FactoryNewLogicAddress)
	console.log('')

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}

	const proxyAdminContract = new ethers.Contract(
		l2ProxyAdminAddress,
		(await ethers.getContractFactory('ProxyAdmin')).interface,
		deployerAccount
	)

    let tx
    console.log('Setting IdeaTokenExchange logic')
    tx = await proxyAdminContract.upgrade(l2ExchangeAddress, l2ExchangeNewLogicAddress)
    await tx.wait()

    console.log('Setting IdeaTokenFactory logic')
    tx = await proxyAdminContract.upgrade(l2FactoryAddress, l2FactoryNewLogicAddress)
    await tx.wait()
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
