const { time } = require('@openzeppelin/test-helpers')
const DSPause = artifacts.require('DSPause')
const SetPlatformFeeSpell = artifacts.require('SetPlatformFeeSpell')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

const BN = web3.utils.BN

contract('spells/SetPlatformFeeSpell', async accounts => {

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
	const tokensPerInterval = '1'
	const tradingFeeRate = '2'
	const platformFeeRate = '3'
    
	before(async () => {
		dsPause = await DSPause.new(delay, adminAccount)
		dsPauseProxyAddress = await dsPause._proxy()
		spell = await SetPlatformFeeSpell.new()
	})

	it.only('can set platform fee', async () => {

		const factory = await IdeaTokenFactory.new()
		await factory.initialize(adminAccount, zeroAddress)

		await factory.addMarket(
			marketName,
			nameVerifierAddress,
			baseCost,
			priceRise,
			tokensPerInterval,
			tradingFeeRate,
			platformFeeRate)

		await factory.setOwner(dsPauseProxyAddress)

		const eta = new BN((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		const fax = spell.contract.methods.execute(factory.address, '1', '123').encodeABI()

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(new BN('1')))
		await dsPause.exec(spell.address, tag, fax, eta)
        
		const tradingFee = new BN((await factory.getMarketDetailsByID(new BN('1'))).platformFeeRate)

		assert.isTrue(tradingFee.eq(new BN('123')))
	})
})