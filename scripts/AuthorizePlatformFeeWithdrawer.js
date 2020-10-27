require('dotenv').config({ path: '../.env' })
const fs = require('fs')
const shared = require('./shared')
const Web3 = require('web3')

async function run() {
	const marketName = await shared.getInput('market name')
	const platformFeeWithdrawerAddress = await shared.getInput('withdrawer address')
	const executionDate = await shared.getInput('execution date (DAY-MONTH-YEAR HOUR:MINUTE:SECOND) in UTC time')
	const network = await shared.getInput('network (mainnet / kovan)')

	const web3 = new Web3('https://' + network + '.infura.io/v3/' + process.env.INFURA_KEY)

	const rawFactory = fs.readFileSync('../build/contracts/IdeaTokenFactory.json')
	const rawFactoryJson = JSON.parse(rawFactory)
	const factoryAbi = rawFactoryJson.abi
	const factoryAddress = shared.loadDeployedAddress(network, 'ideaTokenFactory')
	const factoryContract = new web3.eth.Contract(factoryAbi, factoryAddress)

	const marketDetails = await factoryContract.methods.getMarketDetailsByName(marketName).call()
	if (!marketDetails.exists) {
		throw 'market not found'
	}

	const marketID = marketDetails.id
	const executionTimestamp = shared.unixTimestampFromDateString(executionDate)
	const exchangeAddress = shared.loadDeployedAddress(network, 'ideaTokenExchange')

	const timelockAbi = shared.loadABI('DSPause')
	const timelockAddress = shared.loadDeployedAddress(network, 'dsPause')
	const timelockContract = new web3.eth.Contract(timelockAbi, timelockAddress)

	const spellAbi = shared.loadABI('AuthorizePlatformFeeWithdrawerSpell')
	const spellAddress = shared.loadDeployedAddress(network, 'authorizePlatformFeeWithdrawerSpell')

	const tag = await timelockContract.methods.soul(spellAddress).call()

	console.log('')
	console.log('------------------------------------------------------')
	console.log('market name:', marketName)
	console.log('market id:', marketID)
	console.log('platform fee withdrawer:', platformFeeWithdrawerAddress)
	console.log('idea token exchange:', exchangeAddress)
	console.log('network:', network)

	console.log('')
	await shared.getInput('press enter to continue')

	const fax = web3.eth.abi.encodeFunctionCall(shared.getFunctionABI(spellAbi, 'execute'), [
		exchangeAddress,
		marketID,
		platformFeeWithdrawerAddress,
	])

	console.log('')
	console.log('To:', timelockAddress)
	console.log('Param usr:', spellAddress)
	console.log('Param tag:', tag)
	console.log('Param fax:', fax)
	console.log('Param eta:', executionTimestamp.toString())
	console.log('ABI:', JSON.stringify(timelockAbi))
}

run()
