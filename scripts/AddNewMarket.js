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
	} else if (network === 'homestead') {
		network = 'mainnet'
		console.log('Using mainnet')
	} else {
		network = await shared.read("network: ")
		console.log(network)
	}

	/*
	const rawBaseCost = await shared.getInput('baseCost in dai')
	const rawPriceRise = await shared.getInput('priceRise in dai')
	const rawHatchTokens = await shared.getInput('hatch tokens')
	const rawTradingFee = await shared.getInput('trading fee in percent')
	const rawPlatformFee = await shared.getInput('platform fee in percent')
	*/
	const marketName = await shared.read('market name: ')
	const nameVerifierName = await shared.read('name of name verifier: ')
	const rawAllInterestToPlatform = await shared.read('all interest to platform? [Y/n] ')
	const executionDate = await shared.read('execution date (DAY-MONTH-YEAR HOUR:MINUTE:SECOND) in UTC time: ')

	let allInterestToPlatform
	if (rawAllInterestToPlatform === 'Y' || rawAllInterestToPlatform === 'y') {
		allInterestToPlatform = true
	} else if (rawAllInterestToPlatform === 'N' || rawAllInterestToPlatform === 'n') {
		allInterestToPlatform = false
	} else {
		throw 'Invalid input for rawAllInterestToPlatform'
	}

	const factoryAddress = shared.loadDeployedAddress(network, 'ideaTokenFactoryAVM')
	const nameVerifier = shared.loadDeployedAddress(
		network,
		nameVerifierName.charAt(0).toLowerCase() + nameVerifierName.slice(1)
	)
	
	const baseCost = ethers.BigNumber.from('100000000000000000')
	const priceRise = ethers.BigNumber.from('100000000000000')
	const hatchTokens = ethers.BigNumber.from('1000000000000000000000')
	const tradingFee = ethers.BigNumber.from('50')
	const platformFee = ethers.BigNumber.from('50')

	const executionTimestamp = shared.unixTimestampFromDateString(executionDate)

	const DSPause = await ethers.getContractFactory('DSPause')
	const timelockAddress = shared.loadDeployedAddress(network, 'dsPause')
	const timelockContract = new ethers.Contract(timelockAddress, DSPause.interface, DSPause.signer)

	const spell = await ethers.getContractFactory('AddMarketSpell')
	const spellAddress = shared.loadDeployedAddress(network, 'addMarketSpell')

	const tag = await timelockContract.soul(spellAddress)

	console.log('------------------------------------------------------')
	console.log('market name:', marketName)
	console.log('name verifier address:', nameVerifier)
	console.log('base cost:', baseCost.toString())
	console.log('price rise:', priceRise.toString())
	console.log('hatch tokens:', hatchTokens.toString())
	console.log('trading fee rate:', tradingFee.toString())
	console.log('platform fee rate:', platformFee.toString())
	console.log('all interest to platform', allInterestToPlatform)
	console.log('execution timestamp:', executionTimestamp.toString())
	console.log('timelock address:', timelockAddress)
	console.log('spell address:', spellAddress)
	console.log('factory address:', factoryAddress)
	console.log('network:', network)

	console.log('')
	await shared.read('press enter to continue')

	const fax = spell.interface.encodeFunctionData('execute', [
		factoryAddress,
		marketName,
		nameVerifier,
		baseCost,
		priceRise,
		hatchTokens,
		tradingFee,
		platformFee,
		allInterestToPlatform,
	])

	console.log('')
	console.log('To:', timelockAddress)
	console.log('Param usr:', spellAddress)
	console.log('Param tag:', tag)
	console.log('Param fax:', fax)
	console.log('Param eta:', executionTimestamp.toString())
	console.log('ABI:', JSON.stringify(DSPause.interface.fragments))
	
	//await timelockContract.plot(spellAddress, tag, fax, executionTimestamp.toString())
}

run()
