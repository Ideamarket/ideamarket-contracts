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
		throw 'Unknown network: ' + network
	}

	const marketName = await shared.getInput('market name')
	const nameVerifierName = await shared.getInput('name of name verifier')
	const rawBaseCost = await shared.getInput('baseCost in dai')
	const rawPriceRise = await shared.getInput('priceRise in dai')
	const rawHatchTokens = await shared.getInput('hatch tokens')
	const rawTradingFee = await shared.getInput('trading fee in percent')
	const rawPlatformFee = await shared.getInput('platform fee in percent')
	const rawAllInterestToPlatform = await shared.getInput('all interest to platform? [Y/n]')
	const executionDate = await shared.getInput('execution date (DAY-MONTH-YEAR HOUR:MINUTE:SECOND) in UTC time')

	let allInterestToPlatform
	if (rawAllInterestToPlatform === 'Y' || rawAllInterestToPlatform === 'y') {
		allInterestToPlatform = true
	} else if (rawAllInterestToPlatform === 'N' || rawAllInterestToPlatform === 'n') {
		allInterestToPlatform = false
	} else {
		throw 'Invalid input for rawAllInterestToPlatform'
	}

	const factoryAddress = shared.loadDeployedAddress(network, 'ideaTokenFactory')
	const nameVerifier = shared.loadDeployedAddress(
		network,
		nameVerifierName.charAt(0).toLowerCase() + nameVerifierName.slice(1)
	)
	const baseCost = shared.toWei(rawBaseCost)
	const priceRise = shared.toWei(rawPriceRise)
	const hatchTokens = shared.toWei(rawHatchTokens)
	const tradingFee = shared.percentageFeeToFeeRate(rawTradingFee, 10000)
	const platformFee = shared.percentageFeeToFeeRate(rawPlatformFee, 10000)

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
	await shared.getInput('press enter to continue')

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
}

run()
