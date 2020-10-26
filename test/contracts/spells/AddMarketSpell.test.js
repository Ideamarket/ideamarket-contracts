const { time } = require('@openzeppelin/test-helpers')
const { expect } = require("chai")
const { BigNumber } = require('ethers')

describe('spells/AddMarketSpell', () => {

	let DSPause
	let AddMarketSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 86400
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	let adminAccount

	const marketName = 'SOME_MARKET'
	const nameVerifierAddress = zeroAddress
	const baseCost = '1'
	const priceRise = '1'
	const tradingFeeRate = '0'
	const platformFeeRate = '0'
    
	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0].address

		DSPause = await ethers.getContractFactory('DSPause')
		dsPause = await DSPause.deploy(delay, adminAccount)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()
		
		AddMarketSpell = await ethers.getContractFactory('AddMarketSpell')
		spell = await AddMarketSpell.deploy()
		await spell.deployed()

		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactory')
	})

	it('can add new market', async () => {
		console.log(await time.latest())
		console.log('D')
		const eta = new BigNumber((parseInt(await time.latest()) + delay + 100).toString())
		console.log('E')
		const tag = await dsPause.soul(spell.address)
		console.log('F')
		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await factory.initialize(dsPauseProxyAddress, zeroAddress)

		// For some reason web3 doesnt want BNs here
		const fax = spell.contract.methods.execute(factory.address, marketName, nameVerifierAddress,
			baseCost, priceRise,
			tradingFeeRate, platformFeeRate).encodeABI()

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(new BigNumer('1')))
		await dsPause.exec(spell.address, tag, fax, eta)

		assert.isTrue(new BigNumer('1').eq(await factory.getNumMarkets()))
		assert.isTrue(new BigNumer('1').eq(await factory.getMarketIDByName(marketName)))
        
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