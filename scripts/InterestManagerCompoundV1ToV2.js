require('dotenv').config({ path: '../.env' })
const { ethers } = require('hardhat')
const shared = require('./shared')

async function run() {
	let network = (await ethers.provider.getNetwork()).name

	if (network === 'rinkeby') {
		const input = await shared.getInput('Use test network? [y/n] ')

		if (input === 'Y' || input === 'y') {
			console.log('Using test network')
			network = 'test'
		} else {
			console.log('Using Rinkeby')
		}
	}

	const newLogicAddress = await shared.getInput('new logic contract address')
	const executionDate = await shared.getInput('execution date (DAY-MONTH-YEAR HOUR:MINUTE:SECOND) in UTC time')

	const proxyAdminAddress = shared.loadDeployedAddress(network, 'proxyAdmin')
	const proxyContractAddress = shared.loadDeployedAddress(network, 'interestManager')
	const executionTimestamp = shared.unixTimestampFromDateString(executionDate)

	const DSPause = await ethers.getContractFactory('DSPause')
	const timelockAddress = shared.loadDeployedAddress(network, 'dsPause')
	const timelockContract = new ethers.Contract(timelockAddress, DSPause.interface, DSPause.signer)

	const spell = await ethers.getContractFactory('ChangeLogicAndCallSpell')
	const spellAddress = shared.loadDeployedAddress(network, 'changeLogicAndCallSpell')

	const tag = await timelockContract.soul(spellAddress)

	const InterestManagerCompoundV2 = await ethers.getContractFactory('InterestManagerCompoundV2')
	const interestManagerCompoundV2 = new ethers.Contract(
		newLogicAddress,
		InterestManagerCompoundV2.interface,
		InterestManagerCompoundV2.signer
	)
	const data = interestManagerCompoundV2.interface.encodeFunctionData('initializeV2', [])

	const fax = spell.interface.encodeFunctionData('execute', [
		proxyAdminAddress,
		proxyContractAddress,
		newLogicAddress,
		data,
	])

	console.log('------------------------------------------------------')
	console.log('proxy contract address:', proxyContractAddress)
	console.log('proxy admin address:', proxyAdminAddress)
	console.log('new logic address:', newLogicAddress)
	console.log('execution timestamp:', executionTimestamp.toString())
	console.log('timelock address:', timelockAddress)
	console.log('spell address:', spellAddress)
	console.log('upgrade calldata', data)
	console.log('network:', network)

	console.log('')
	await shared.getInput('press enter to continue')

	console.log('')
	console.log('To:', timelockAddress)
	console.log('Param usr:', spellAddress)
	console.log('Param tag:', tag)
	console.log('Param fax:', fax)
	console.log('Param eta:', executionTimestamp.toString())
	console.log('ABI:', JSON.stringify(DSPause.interface.fragments))
}

run()
