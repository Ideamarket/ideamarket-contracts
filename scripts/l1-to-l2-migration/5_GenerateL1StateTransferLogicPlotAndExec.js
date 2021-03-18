const { ethers, artifacts } = require('hardhat')
const { read, loadDeployedAddress } = require('../shared')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	let l1NetworkName = (await ethers.provider.getNetwork()).name
	let l2NetworkName = ''

	let l1CrossDomainMessengerAddress = ''
	let l1DaiBridgeAddress = ''

	if (networkName === 'kovan') {
		console.log('Using Kovan')

		l2NetworkName = 'kovan-ovm'
		l1CrossDomainMessengerAddress = ''
		l1DaiBridgeAddress = ''
	} else {
		throw 'cannot work with network: ' + l1NetworkName
	}

	const l2BridgeOVMAddress = loadDeployedAddress(l2NetworkName, 'proxyAdmin')
	const l2InterestManagerAddress = loadDeployedAddress(l2NetworkName, 'interestManager')

	const l1ProxyAdminAddress = loadDeployedAddress(l1NetworkName, 'proxyAdmin')
	const l1ChangeLogicSpellAddress = loadDeployedAddress(l1NetworkName, 'changeLogic')
	const l1ChangeLogicAndCallSpellAddress = loadDeployedAddress(l1NetworkName, 'changeLogicAndCallSpell')

	const l1FactoryAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenFactory')
	const l1FactoryNewLogicAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenFactoryStateTransferLogic')

	const l1ExchangeAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')
	const l1ExchangeNewLogicAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchangeStateTransferLogic')

	const l1InterestManagerCompoundAddress = loadDeployedAddress(l1NetworkName, 'interestManager')
	const l1InterestManagerCompoundNewLogicAddress = loadDeployedAddress(l1NetworkName, 'interestManagerCompoundStateTransferLogic')

	console.log('TransferManager', deployerAddress)
	console.log('')

	console.log('L1 DaiBridge', l1DaiBridgeAddress)
	console.log('L1 CrossDomainMessenger', l1CrossDomainMessengerAddress)
	console.log('L2 BridgeOVM', l2BridgeOVMAddress)
	console.log('L2 InterestManager', l2InterestManagerAddress)
	console.log('')

	console.log('L1 ProxyAdmin', l1ProxyAdminAddress)
	console.log('L1 l1ChangeLogic', l1ChangeLogicSpellAddress)
	console.log('L1 l1ChangeLogicAndCallSpell', l1ChangeLogicAndCallSpellAddress)
	console.log('')

	console.log('L1 IdeaTokenFactory', l1FactoryAddress)
	console.log('L1 IdeaTokenFactory new logic', l1FactoryNewLogicAddress)
	console.log('')

	console.log('L1 IdeaTokenExchange', l1ExchangeAddress)
	console.log('L1 IdeaTokenEchange new logic', l1ExchangeNewLogicAddress)
	console.log('')

	console.log('L1 InterestManager', l1InterestManagerCompoundAddress)
	console.log('L1 InterestManager new logic', l1InterestManagerCompoundNewLogicAddress)
	console.log('')

	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}

	const factory = await ethers.getContractFactory('IdeaTokenFactoryStateTransfer')
	const exchange = await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')
	const interestManager = await ethers.getContractFactory('InterestManagerCompoundStateTransfer')
	const changeLogicSpell = await ethers.getContractFactory('ChangeLogicSpell')
	const changeLogicAndCallSpell = await ethers.getContractFactory('ChangeLogicAndCallSpell')

	// Factory
	const faxFactory = changeLogicSpell.interface.encodeFunctionData('execute', [
		l1ProxyAdminAddress,
		l1FactoryAddress,
		l1FactoryNewLogicAddress,
	])

	// Exchange
	const calldataExchange = exchange.interface.encodeFunctionData('initializeStateTransfer', [
		deployerAddress,
		l2BridgeOVMAddress,
		l1CrossDomainMessengerAddress
	])

	const faxExchange = changeLogicAndCallSpell.interface.encodeFunctionData('execute', [
		l1ProxyAdminAddress,
		l1ExchangeAddress,
		l1ExchangeNewLogicAddress,
		calldataExchange
	]) 

	// InterestManager
	const calldataInterestManager = exchange.interface.encodeFunctionData('initializeStateTransfer', [
		deployerAddress,
		l2InterestManagerAddress,
		l1DaiBridgeAddress
	])

	const faxInterestManager = changeLogicAndCallSpell.interface.encodeFunctionData('execute', [
		l1ProxyAdminAddress,
		l1InterestManagerCompoundAddress,
		l1InterestManagerCompoundNewLogicAddress,
		calldataInterestManager
	])
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
