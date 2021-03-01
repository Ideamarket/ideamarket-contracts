const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('evm/spells/AddMarketSpell', () => {
	let DSPause
	let AddMarketSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 86400
	const oneAddress = '0x0000000000000000000000000000000000000001'
	let adminAccount

	const marketName = 'SOME_MARKET'
	const nameVerifierAddress = oneAddress
	const baseCost = BigNumber.from('1')
	const priceRise = BigNumber.from('1')
	const hatchTokens = BigNumber.from('1')
	const tradingFeeRate = BigNumber.from('0')
	const platformFeeRate = BigNumber.from('0')

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
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await factory.initialize(dsPauseProxyAddress, oneAddress, oneAddress)

		const fax = spell.interface.encodeFunctionData('execute', [
			factory.address,
			marketName,
			nameVerifierAddress,
			baseCost,
			priceRise,
			hatchTokens,
			tradingFeeRate,
			platformFeeRate,
			false,
		])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)

		expect(BigNumber.from('1').eq(await factory.getNumMarkets())).to.be.true
		expect(BigNumber.from('1').eq(await factory.getMarketIDByName(marketName))).to.be.true

		const marketDetails = await factory.getMarketDetailsByID(BigNumber.from('1'))

		expect(marketDetails.exists).to.be.true
		expect(marketDetails.id.eq(BigNumber.from('1'))).to.be.true
		expect(marketDetails.name).to.be.equal(marketName)
		expect(marketDetails.nameVerifier).to.be.equal(nameVerifierAddress)
		expect(marketDetails.numTokens.eq(BigNumber.from('0'))).to.be.true
		expect(marketDetails.baseCost.eq(baseCost)).to.be.true
		expect(marketDetails.priceRise.eq(priceRise)).to.be.true
		expect(marketDetails.hatchTokens.eq(hatchTokens)).to.be.true
		expect(marketDetails.tradingFeeRate.eq(tradingFeeRate)).to.be.true
		expect(marketDetails.platformFeeRate.eq(platformFeeRate)).to.be.true
	})
})
