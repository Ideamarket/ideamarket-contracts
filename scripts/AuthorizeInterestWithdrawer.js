require('dotenv').config({ path: '../.env' })
const fs = require('fs')
const shared = require('./shared')
const Web3 = require('web3')

async function run() {
	const tokenAddress = await shared.getInput('ideatoken address')
	const interestWithdrawerAddress = await shared.getInput('withdrawer address')
	const executionDate = await shared.getInput('execution date (DAY-MONTH-YEAR HOUR:MINUTE:SECOND) in UTC time')
	const network = await shared.getInput('network (mainnet / kovan)')

	const web3 = new Web3('https://' + network + '.infura.io/v3/' + process.env.INFURA_KEY)

	const rawFactory = fs.readFileSync('../build/contracts/IdeaTokenFactory.json')
	const rawFactoryJson = JSON.parse(rawFactory)
	const factoryAbi = rawFactoryJson.abi
	const factoryAddress = shared.loadDeployedAddress(network, 'ideaTokenFactory')
	const factoryContract = new web3.eth.Contract(factoryAbi, factoryAddress)

	const idPair = await factoryContract.methods.getTokenIDPair(tokenAddress).call()
	if (!idPair.exists) {
		throw 'token not found'
	}

	const marketID = idPair.marketID
	const tokenID = idPair.tokenID
	const tokenName = (await factoryContract.methods.getTokenInfo(marketID, tokenID).call()).name
	const marketName = (await factoryContract.methods.getMarketDetailsByID(marketID).call()).name
	const executionTimestamp = shared.unixTimestampFromDateString(executionDate)
	const exchangeAddress = shared.loadDeployedAddress(network, 'ideaTokenExchange')

	const timelockAbi = shared.loadABI('DSPause')
	const timelockAddress = shared.loadDeployedAddress(network, 'dsPause')
	const timelockContract = new web3.eth.Contract(timelockAbi, timelockAddress)

	const spellAbi = shared.loadABI('AuthorizeInterestWithdrawerSpell')
	const spellAddress = shared.loadDeployedAddress(network, 'authorizeInterestWithdrawerSpell')

	const tag = await timelockContract.methods.soul(spellAddress).call()

	console.log('')
	console.log('------------------------------------------------------')
	console.log('token address:', tokenAddress)
	console.log('token name:', tokenName)
	console.log('token id:', tokenID)
	console.log('market name:', marketName)
	console.log('market id:', marketID)
	console.log('interest withdrawer:', interestWithdrawerAddress)
	console.log('idea token exchange:', exchangeAddress)
	console.log('network:', network)

	console.log('')
	await shared.getInput('press enter to continue')

	const fax = web3.eth.abi.encodeFunctionCall(shared.getFunctionABI(spellAbi, 'execute'), [
		exchangeAddress,
		tokenAddress,
		interestWithdrawerAddress,
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
