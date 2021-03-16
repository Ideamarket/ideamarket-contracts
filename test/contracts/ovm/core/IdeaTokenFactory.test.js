const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const { expectRevert, waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')

describe('ovm/core/IdeaTokenFactory', () => {
	let DomainNoSubdomainNameVerifier
	let IdeaTokenFactory
	let IdeaToken

	const tokenName = 'example.com'
	const marketName = 'testMarket'
	const baseCost = BigNumber.from('100000000000000000') // 10**17 = $0.1
	const priceRise = BigNumber.from('100000000000000') // 10**14 = $0.0001
	const hatchTokens = BigNumber.from('1000000000000000000000') // 10**21 = 1000
	const tradingFeeRate = BigNumber.from('100')
	const platformFeeRate = BigNumber.from('50')

	let userAccount
	let adminAccount
	let ideaTokenExchangeAddress
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const oneAddress = '0x0000000000000000000000000000000000000001'
	const someAddress = '0x52bc44d5378309EE2abF1539BF71dE1b7d7bE3b5' // random addr from etherscan

	let ideaTokenLogic
	let ideaTokenFactory

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]

		let tmpWallet
		;[adminAccount, tmpWallet] = generateWallets(ethers, 2)
		ideaTokenExchangeAddress = tmpWallet.address

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
	})

	beforeEach(async () => {
		ideaTokenFactory = await IdeaTokenFactory.connect(adminAccount).deploy()
		await ideaTokenFactory.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.initialize(adminAccount.address, ideaTokenExchangeAddress, ideaTokenLogic.address, oneAddress)
		)
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).is.equal(await ideaTokenFactory.getOwner())
	})

	it('can add market', async () => {
		const nameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await nameVerifier.deployed()
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					nameVerifier.address,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		expect(BigNumber.from('1').eq(await ideaTokenFactory.getNumMarkets())).to.be.equal
		expect(BigNumber.from('1').eq(await ideaTokenFactory.getMarketIDByName(marketName))).to.be.equal

		const marketDetailsByID = await ideaTokenFactory.getMarketDetailsByID(BigNumber.from('1'))
		const marketDetailsByName = await ideaTokenFactory.getMarketDetailsByName(marketName)

		expect(marketDetailsByID.exists).to.be.true
		expect(marketDetailsByID.id.eq(BigNumber.from('1'))).to.be.true
		expect(marketDetailsByID.name).to.be.equal(marketName)
		expect(marketDetailsByID.nameVerifier).to.be.equal(nameVerifier.address)
		expect(marketDetailsByID.numTokens.eq(BigNumber.from('0'))).to.be.true
		expect(marketDetailsByID.baseCost.eq(baseCost)).to.be.true
		expect(marketDetailsByID.priceRise.eq(priceRise)).to.be.true
		expect(marketDetailsByID.hatchTokens.eq(hatchTokens)).to.be.true
		expect(marketDetailsByID.tradingFeeRate.eq(tradingFeeRate)).to.be.true
		expect(marketDetailsByID.platformFeeRate.eq(platformFeeRate)).to.be.true

		expect(marketDetailsByName.exists).to.be.true
		expect(marketDetailsByName.id.eq(BigNumber.from('1'))).to.be.true
		expect(marketDetailsByName.name).to.be.equal(marketName)
		expect(marketDetailsByName.nameVerifier).to.be.equal(nameVerifier.address)
		expect(marketDetailsByName.numTokens.eq(BigNumber.from('0'))).to.be.true
		expect(marketDetailsByName.baseCost.eq(baseCost)).to.be.true
		expect(marketDetailsByName.priceRise.eq(priceRise)).to.be.true
		expect(marketDetailsByName.hatchTokens.eq(hatchTokens)).to.be.true
		expect(marketDetailsByName.tradingFeeRate.eq(tradingFeeRate)).to.be.true
		expect(marketDetailsByName.platformFeeRate.eq(platformFeeRate)).to.be.true
	})

	it('fail add market with same name', async () => {
		const nameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await nameVerifier.deployed()
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					nameVerifier.address,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					nameVerifier.address,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)
	})

	it('checks parameters when adding market', async () => {
		await expectRevert(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					'0x0000000000000000000000000000000000000000',
					BigNumber.from('0'),
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					'0x0000000000000000000000000000000000000000',
					baseCost,
					BigNumber.from('0'),
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)
	})

	it('only admin can add market', async () => {
		await expectRevert(
			ideaTokenFactory
				.connect(userAccount)
				.addMarket(
					marketName,
					'0x0000000000000000000000000000000000000000',
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)
	})

	it('can add token', async () => {
		const nameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await nameVerifier.deployed()
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					nameVerifier.address,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					true
				)
		)

		await waitForTx(ideaTokenFactory.addToken(tokenName, BigNumber.from('1'), userAccount.address))

		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(BigNumber.from('1'))

		expect(marketDetails.exists).to.be.true
		expect(marketDetails.id.eq(BigNumber.from('1'))).to.be.true
		expect(marketDetails.name).to.be.equal(marketName)
		expect(marketDetails.nameVerifier).to.be.equal(nameVerifier.address)
		expect(marketDetails.numTokens.eq(BigNumber.from('1'))).to.be.true
		expect(marketDetails.baseCost.eq(baseCost)).to.be.true
		expect(marketDetails.priceRise.eq(priceRise)).to.be.true
		expect(marketDetails.hatchTokens.eq(hatchTokens)).to.be.true
		expect(marketDetails.tradingFeeRate.eq(tradingFeeRate)).to.be.true
		expect(marketDetails.platformFeeRate.eq(platformFeeRate)).to.be.true
		expect(marketDetails.allInterestToPlatform).to.be.true

		const ideaToken = new ethers.Contract(
			(await ideaTokenFactory.getTokenInfo(BigNumber.from('1'), BigNumber.from('1'))).ideaToken,
			IdeaToken.interface,
			IdeaToken.signer
		)

		expect(await ideaToken.name()).to.equal(marketName + ': ' + tokenName)
	})

	it('fail add token with invalid name', async () => {
		const nameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await nameVerifier.deployed()
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					nameVerifier.address,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(ideaTokenFactory.addToken('some.invalid.name', BigNumber.from('1'), userAccount.address))
	})

	it('fail add token with same name twice', async () => {
		const nameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await nameVerifier.deployed()
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					nameVerifier.address,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await waitForTx(ideaTokenFactory.addToken(tokenName, BigNumber.from('1'), userAccount.address))
		await expectRevert(ideaTokenFactory.addToken(tokenName, BigNumber.from('1'), userAccount.address))
	})

	it('fail add token invalid market', async () => {
		const nameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await nameVerifier.deployed()
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					nameVerifier.address,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await waitForTx(ideaTokenFactory.addToken(tokenName, BigNumber.from('1'), userAccount.address))
		await expectRevert(ideaTokenFactory.addToken(tokenName, BigNumber.from('2'), userAccount.address))
	})

	it('can set trading fee', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await waitForTx(
			ideaTokenFactory.connect(adminAccount).setTradingFee(BigNumber.from('1'), BigNumber.from('123'))
		)
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(BigNumber.from('1'))
		expect(marketDetails.tradingFeeRate).to.be.equal('123')
	})

	it('fail user sets trading fee', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(
			ideaTokenFactory.connect(userAccount).setTradingFee(BigNumber.from('1'), BigNumber.from('123'))
		)
	})

	it('fail set trading fee invalid market', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(
			ideaTokenFactory.connect(adminAccount).setTradingFee(BigNumber.from('2'), BigNumber.from('123'))
		)
	})

	it('can set platform fee', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await waitForTx(
			ideaTokenFactory.connect(adminAccount).setPlatformFee(BigNumber.from('1'), BigNumber.from('123'))
		)
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(BigNumber.from('1'))
		expect(marketDetails.platformFeeRate).to.equal('123')
	})

	it('fail user sets platform fee', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(
			ideaTokenFactory.connect(userAccount).setPlatformFee(BigNumber.from('1'), BigNumber.from('123'))
		)
	})

	it('fail set platform fee invalid market', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(
			ideaTokenFactory.connect(adminAccount).setPlatformFee(BigNumber.from('2'), BigNumber.from('123'))
		)
	})

	it('can set name verifier', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await waitForTx(ideaTokenFactory.connect(adminAccount).setNameVerifier(BigNumber.from('1'), someAddress))
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(BigNumber.from('1'))
		expect(marketDetails.nameVerifier).to.equal(someAddress)
	})

	it('fail user sets name verifier ', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(ideaTokenFactory.connect(userAccount).setNameVerifier(BigNumber.from('1'), someAddress))
	})

	it('fail set name verifier invalid market', async () => {
		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.addMarket(
					marketName,
					oneAddress,
					baseCost,
					priceRise,
					hatchTokens,
					tradingFeeRate,
					platformFeeRate,
					false
				)
		)

		await expectRevert(ideaTokenFactory.connect(adminAccount).setNameVerifier(BigNumber.from('2'), someAddress))
	})
})
