const { time } = require('@openzeppelin/test-helpers')
const DSPause = artifacts.require('DSPause')
const AddMarketSpell = artifacts.require('AddMarketSpell')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

const BN = web3.utils.BN

contract('spells/AddMarketSpell', async accounts => {

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 86400
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const adminAccount = accounts[0]

	const marketName = 'SOME_MARKET'
	const nameVerifierAddress = zeroAddress
	const baseCost = '1'
	const priceRise = '1'
	const tradingFeeRate = '0'
	const platformFeeRate = '0'
    
	before(async () => {
		dsPause = await DSPause.new(delay, adminAccount)
		dsPauseProxyAddress = await dsPause._proxy()
		spell = await AddMarketSpell.new()
	})

	it('can add new market', async () => {
		const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		const factory = await IdeaTokenFactory.new()
		await factory.initialize(dsPauseProxyAddress, zeroAddress)

		// For some reason web3 doesnt want BNs here
		const fax = spell.contract.methods.execute(factory.address, marketName, nameVerifierAddress,
			baseCost, priceRise,
			tradingFeeRate, platformFeeRate).encodeABI()

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(new BN('1')))
		await dsPause.exec(spell.address, tag, fax, eta)

		assert.isTrue(new BN('1').eq(await factory.getNumMarkets()))
		assert.isTrue(new BN('1').eq(await factory.getMarketIDByName(marketName)))
        
		const marketDetails = await factory.getMarketDetailsByID(new BN('1'))
		const expectedMarketDetails = [
			true, // exists
			'1', // id
			marketName,
			nameVerifierAddress,
			'0', // numTokens
			baseCost,
			priceRise,
			tradingFeeRate,
			platformFeeRate
		]

		assert.deepEqual(marketDetails, expectedMarketDetails)
	})
})