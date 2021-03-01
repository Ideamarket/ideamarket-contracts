const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('avm/core/BridgeAVM', () => {
	let DomainNoSubdomainNameVerifier
	let InterestManagerStateTransferAVM
	let IdeaTokenFactory
	let IdeaTokenExchange
	let IdeaToken
	let Bridge

	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	const marketName = 'main'
	const baseCost = BigNumber.from('100000000000000000') // 10**17 = $0.1
	const priceRise = BigNumber.from('100000000000000') // 10**14 = $0.0001
	const hatchTokens = BigNumber.from('1000000000000000000000') // 10**21 = 1000
	const tradingFeeRate = BigNumber.from('100')
	const platformFeeRate = BigNumber.from('50')

	let userAccount
	let otherUserAccount
	let adminAccount
	const oneAddress = '0x0000000000000000000000000000000000000001'

	let domainNoSubdomainNameVerifier
	let interestManager
	let ideaTokenFactory
	let ideaTokenLogic
	let ideaTokenExchange
	let bridge

	let marketID

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		otherUserAccount = accounts[1]
		adminAccount = accounts[2]

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		InterestManagerStateTransferAVM = await ethers.getContractFactory('InterestManagerStateTransferAVM')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryAVM')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchangeStateTransferAVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		Bridge = await ethers.getContractFactory('BridgeAVM')
	})

	beforeEach(async () => {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		interestManager = await InterestManagerStateTransferAVM.deploy()
		await interestManager.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		ideaTokenFactory = await IdeaTokenFactory.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		bridge = await Bridge.connect(adminAccount).deploy()
		await bridge.deployed()

		await interestManager.connect(adminAccount).initializeStateTransfer(ideaTokenExchange.address, oneAddress)

		await ideaTokenFactory
			.connect(adminAccount)
			.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenLogic.address, bridge.address)

		await ideaTokenExchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				oneAddress,
				oneAddress,
				interestManager.address,
				oneAddress,
				bridge.address
			)

		await ideaTokenExchange.connect(adminAccount).setIdeaTokenFactoryAddress(ideaTokenFactory.address)

		await bridge.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenFactory.address)

		await ideaTokenFactory
			.connect(adminAccount)
			.addMarket(
				marketName,
				domainNoSubdomainNameVerifier.address,
				baseCost,
				priceRise,
				hatchTokens,
				tradingFeeRate,
				platformFeeRate,
				false
			)

		marketID = await ideaTokenFactory.getMarketIDByName(marketName)
	})

	it('can receive static vars', async () => {
		await bridge.connect(adminAccount).receiveExchangeStaticVars(BigNumber.from('123'))
	})

	it('fail cannot receive static vars twice', async () => {
		await bridge.connect(adminAccount).receiveExchangeStaticVars(BigNumber.from('123'))
		await expect(bridge.connect(adminAccount).receiveExchangeStaticVars(BigNumber.from('123'))).to.be.revertedWith(
			'already-set'
		)
	})

	it('fail user cannot set static vars', async () => {
		await expect(bridge.connect(userAccount).receiveExchangeStaticVars(BigNumber.from('123'))).to.be.revertedWith(
			'only-l1-exchange'
		)
	})

	it('can receive platform vars', async () => {
		await bridge
			.connect(adminAccount)
			.receiveExchangePlatformVars(marketID, BigNumber.from('123'), BigNumber.from('123'), BigNumber.from('123'))
	})

	it('fail cannot receive platform vars twice', async () => {
		await bridge
			.connect(adminAccount)
			.receiveExchangePlatformVars(marketID, BigNumber.from('123'), BigNumber.from('123'), BigNumber.from('123'))

		await expect(
			bridge
				.connect(adminAccount)
				.receiveExchangePlatformVars(
					marketID,
					BigNumber.from('123'),
					BigNumber.from('123'),
					BigNumber.from('123')
				)
		).to.be.revertedWith('already-set')
	})

	it('fail user cannot set platform vars', async () => {
		await expect(
			bridge
				.connect(userAccount)
				.receiveExchangePlatformVars(
					marketID,
					BigNumber.from('123'),
					BigNumber.from('123'),
					BigNumber.from('123')
				)
		).to.be.revertedWith('only-l1-exchange')
	})

	it('can receive token vars, set and redeem', async () => {
		// First batch
		let tokenIDs = [BigNumber.from('1'), BigNumber.from('2'), BigNumber.from('3')]

		let names = ['a.com', 'b.com', 'c.com']

		let supplies = [
			BigNumber.from('100').mul(tenPow18),
			BigNumber.from('200').mul(tenPow18),
			BigNumber.from('300').mul(tenPow18),
		]

		let dais = [
			BigNumber.from('150').mul(tenPow18),
			BigNumber.from('250').mul(tenPow18),
			BigNumber.from('350').mul(tenPow18),
		]

		let investeds = [
			BigNumber.from('120').mul(tenPow18),
			BigNumber.from('220').mul(tenPow18),
			BigNumber.from('320').mul(tenPow18),
		]

		await bridge
			.connect(adminAccount)
			.receiveExchangeTokenVars(marketID, tokenIDs, names, supplies, dais, investeds)

		await bridge.connect(adminAccount).setTokenVars(marketID, tokenIDs)

		const numTokens = (await ideaTokenFactory.getMarketDetailsByID(marketID)).numTokens
		expect(numTokens.toNumber()).to.be.equal(3)

		for (let i = 0; i < names.length; i++) {
			const tokenInfo = await ideaTokenFactory.getTokenInfo(marketID, BigNumber.from((i + 1).toString()))
			expect(tokenInfo.exists).to.be.true
			expect(tokenInfo.name).to.be.equal(names[i])
			expect(tokenInfo.id.toNumber()).to.be.equal(i + 1)

			const ideaToken = new ethers.Contract(tokenInfo.ideaToken, IdeaToken.interface, IdeaToken.signer)

			const supply = await ideaToken.totalSupply()
			const balance = await ideaToken.balanceOf(bridge.address)
			expect(supply.eq(supplies[i])).to.be.true
			expect(balance.eq(supplies[i])).to.be.true
		}

		// Second batch
		tokenIDs = [BigNumber.from('4'), BigNumber.from('5'), BigNumber.from('6')]

		names = ['d.com', 'e.com', 'f.com']

		supplies = [
			BigNumber.from('400').mul(tenPow18),
			BigNumber.from('500').mul(tenPow18),
			BigNumber.from('600').mul(tenPow18),
		]

		dais = [
			BigNumber.from('450').mul(tenPow18),
			BigNumber.from('550').mul(tenPow18),
			BigNumber.from('650').mul(tenPow18),
		]

		investeds = [
			BigNumber.from('420').mul(tenPow18),
			BigNumber.from('520').mul(tenPow18),
			BigNumber.from('620').mul(tenPow18),
		]

		await bridge
			.connect(adminAccount)
			.receiveExchangeTokenVars(marketID, tokenIDs, names, supplies, dais, investeds)

		await bridge.connect(adminAccount).setTokenVars(marketID, tokenIDs)

		expect((await ideaTokenFactory.getMarketDetailsByID(marketID)).numTokens.toNumber()).to.be.equal(6)

		for (let i = 0; i < names.length; i++) {
			const tokenInfo = await ideaTokenFactory.getTokenInfo(
				marketID,
				BigNumber.from((i + 1 + names.length).toString())
			)
			expect(tokenInfo.exists).to.be.true
			expect(tokenInfo.name).to.be.equal(names[i])
			expect(tokenInfo.id.toNumber()).to.be.equal(i + 1 + +names.length)

			const ideaToken = new ethers.Contract(tokenInfo.ideaToken, IdeaToken.interface, IdeaToken.signer)

			const supply = await ideaToken.totalSupply()
			const balance = await ideaToken.balanceOf(bridge.address)
			expect(supply.eq(supplies[i])).to.be.true
			expect(balance.eq(supplies[i])).to.be.true
		}

		// Withdraw
		for (let i = 0; i < 6; i++) {
			const tokenID = BigNumber.from((i + 1).toString())
			const tokenInfo = await ideaTokenFactory.getTokenInfo(marketID, tokenID)
			const ideaToken = new ethers.Contract(tokenInfo.ideaToken, IdeaToken.interface, IdeaToken.signer)

			const supply = await ideaToken.totalSupply()
			await bridge
				.connect(adminAccount)
				.receiveIdeaTokenTransfer(marketID, tokenID, supply.div(BigNumber.from('2')), userAccount.address)

			await bridge
				.connect(adminAccount)
				.receiveIdeaTokenTransfer(marketID, tokenID, supply.div(BigNumber.from('2')), otherUserAccount.address)

			expect((await ideaToken.balanceOf(bridge.address)).toNumber()).to.be.equal(0)
			expect((await ideaToken.balanceOf(userAccount.address)).eq(supply.div(BigNumber.from('2')))).to.be.true
			expect((await ideaToken.balanceOf(otherUserAccount.address)).eq(supply.div(BigNumber.from('2')))).to.be.true
		}
	})

	it('fail user cannot call token function', async () => {
		await expect(
			bridge
				.connect(userAccount)
				.receiveExchangeTokenVars(
					marketID,
					[BigNumber.from('123')],
					['a.com'],
					[BigNumber.from('123')],
					[BigNumber.from('123')],
					[BigNumber.from('123')]
				)
		).to.be.revertedWith('only-l1-exchange')
		await expect(bridge.connect(userAccount).setTokenVars(marketID, [BigNumber.from('123')])).to.be.revertedWith(
			'only-owner'
		)
		await expect(
			bridge
				.connect(userAccount)
				.receiveIdeaTokenTransfer(marketID, BigNumber.from('123'), BigNumber.from('123'), userAccount.address)
		).to.be.revertedWith('only-l1-exchange')
	})
})
