const { ethers } = require('hardhat')
const { read, unixTimestampFromDateString, loadDeployedAddress, loadABI } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	let l1NetworkName = (await ethers.provider.getNetwork()).name
	let l2NetworkName = ''

	if (l1NetworkName === 'rinkeby') {
		l1NetworkName = 'test-avm-l1'
		l2NetworkName = 'test-avm-l2'
	} else {
		throw 'cannot work with network: ' + l1NetworkName
	}

	const externalContractAddresses = config.externalContractAddresses[l1NetworkName]
	const deploymentParams = config.deploymentParams[l1NetworkName]

	console.log('')
	const executionDate = await read('execution date (DAY-MONTH-YEAR HOUR:MINUTE:SECOND) in UTC time: ')
	const executionTimestamp = unixTimestampFromDateString(executionDate)

	const l1TimelockAddress = loadDeployedAddress(l1NetworkName, 'dsPause')
	const l2BridgeAVMAddress = loadDeployedAddress(l2NetworkName, 'bridgeAVM')
	const l2InterestManagerAddress = loadDeployedAddress(l2NetworkName, 'interestManagerAVM')

	const l1ProxyAdminAddress = loadDeployedAddress(l1NetworkName, 'proxyAdmin')
	const l1ChangeLogicSpellAddress = loadDeployedAddress(l1NetworkName, 'changeLogicSpell')
	const l1ChangeLogicAndCallSpellAddress = loadDeployedAddress(l1NetworkName, 'changeLogicAndCallSpell')

	const l1FactoryAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenFactory')
	const l1FactoryNewLogicAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenFactoryStateTransferLogic')

	const l1ExchangeAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchange')
	const l1ExchangeNewLogicAddress = loadDeployedAddress(l1NetworkName, 'ideaTokenExchangeStateTransferLogic')

	const l1InterestManagerCompoundAddress = loadDeployedAddress(l1NetworkName, 'interestManager')
	const l1InterestManagerCompoundNewLogicAddress = loadDeployedAddress(
		l1NetworkName,
		'interestManagerCompoundStateTransferLogic'
	)

	console.log(`Networks (${l1NetworkName},${l2NetworkName})`)
	console.log('Deployer ', deployerAddress)
	console.log('')
	console.log('TransferManager', deployerAddress)
	console.log('')

	console.log('L1 Timelock', l1TimelockAddress)
	console.log('L1 DaiBridge', externalContractAddresses.daiBridge)
	console.log('L1 Inbox', externalContractAddresses.inbox)
	console.log('L2 Bridge', l2BridgeAVMAddress)
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
	console.log('')

	const timelockAbi = (await ethers.getContractFactory('DSPause')).interface.fragments
	const timelockContract = new ethers.Contract(
		l1TimelockAddress,
		(await ethers.getContractFactory('DSPause')).interface,
		deployerAccount
	)

	const exchange = await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')
	const interestManager = await ethers.getContractFactory('InterestManagerCompoundStateTransfer')

	const changeLogicSpell = await ethers.getContractFactory('ChangeLogicSpell')
	const changeLogicTag = await timelockContract.soul(l1ChangeLogicSpellAddress)

	const changeLogicAndCallSpell = await ethers.getContractFactory('ChangeLogicAndCallSpell')
	const changeLogicAndCallTag = await timelockContract.soul(l1ChangeLogicAndCallSpellAddress)

	// Factory
	const faxFactory = changeLogicSpell.interface.encodeFunctionData('execute', [
		l1ProxyAdminAddress,
		l1FactoryAddress,
		l1FactoryNewLogicAddress,
	])

	console.log('=============== FACTORY ===============')
	console.log('To:', l1TimelockAddress)
	console.log('Param usr:', l1ChangeLogicSpellAddress)
	console.log('Param tag:', changeLogicTag)
	console.log('Param fax:', faxFactory)
	console.log('Param eta:', executionTimestamp.toString())
	console.log('ABI:', JSON.stringify(timelockAbi))
	console.log('')

	// Exchange
	const calldataExchange = exchange.interface.encodeFunctionData('initializeStateTransfer', [
		deployerAddress,
		l2BridgeAVMAddress,
		externalContractAddresses.inbox,
	])

	const faxExchange = changeLogicAndCallSpell.interface.encodeFunctionData('execute', [
		l1ProxyAdminAddress,
		l1ExchangeAddress,
		l1ExchangeNewLogicAddress,
		calldataExchange,
	])

	console.log('=============== EXCHANGE ===============')
	console.log('To:', l1TimelockAddress)
	console.log('Param usr:', l1ChangeLogicAndCallSpellAddress)
	console.log('Param tag:', changeLogicAndCallTag)
	console.log('Param fax:', faxExchange)
	console.log('Param eta:', executionTimestamp.toString())
	console.log('ABI:', JSON.stringify(timelockAbi))
	console.log('')

	// InterestManager
	const calldataInterestManager = interestManager.interface.encodeFunctionData('initializeStateTransfer', [
		deployerAddress,
		l2InterestManagerAddress,
		externalContractAddresses.daiBridge,
	])

	const faxInterestManager = changeLogicAndCallSpell.interface.encodeFunctionData('execute', [
		l1ProxyAdminAddress,
		l1InterestManagerCompoundAddress,
		l1InterestManagerCompoundNewLogicAddress,
		calldataInterestManager,
	])

	console.log('=============== INTEREST MANAGER ===============')
	console.log('To:', l1TimelockAddress)
	console.log('Param usr:', l1ChangeLogicAndCallSpellAddress)
	console.log('Param tag:', changeLogicAndCallTag)
	console.log('Param fax:', faxInterestManager)
	console.log('Param eta:', executionTimestamp.toString())
	console.log('ABI:', JSON.stringify(timelockAbi))
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
