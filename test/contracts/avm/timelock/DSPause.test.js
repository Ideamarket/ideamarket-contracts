const { time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('avm/timelock/DSPause', () => {
	let DSPause
	let AddMarketSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 86400
	const oneAddress = '0x0000000000000000000000000000000000000001'
	const someAddress = '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8' // random addr from etherscan
	let adminAccount
	let userAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		userAccount = accounts[1]

		DSPause = await ethers.getContractFactory('DSPause')
		AddMarketSpell = await ethers.getContractFactory('AddMarketSpell')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryAVM')
	})

	beforeEach(async () => {
		dsPause = await DSPause.deploy(delay, adminAccount.address)
		await dsPause.deployed()
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await AddMarketSpell.deploy()
		await spell.deployed()
	})

	it('admin and user cannot set owner', async () => {
		await expect(dsPause.connect(adminAccount).setOwner(someAddress)).to.be.revertedWith('ds-pause-undelayed-call')
		await expect(dsPause.connect(userAccount).setOwner(someAddress)).to.be.revertedWith('ds-pause-undelayed-call')
	})

	it('admin and user cannot set delay', async () => {
		await expect(dsPause.connect(adminAccount).setDelay(BigNumber.from('0'))).to.be.revertedWith(
			'ds-pause-undelayed-call'
		)
		await expect(dsPause.connect(userAccount).setDelay(BigNumber.from('0'))).to.be.revertedWith(
			'ds-pause-undelayed-call'
		)
	})

	it('admin can plot and drop', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		await dsPause.plot(spell.address, tag, [], eta)
		await dsPause.drop(spell.address, tag, [], eta)
	})

	it('admin can plot and exec', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)

		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await factory.initialize(dsPauseProxyAddress, oneAddress, oneAddress, oneAddress)

		const fax = spell.interface.encodeFunctionData('execute', [
			factory.address,
			'SOME_MARKET',
			oneAddress,
			'1',
			'1',
			'1',
			'0',
			'0',
			false,
		])

		await dsPause.plot(spell.address, tag, fax, eta)
		await time.increaseTo(eta.add(BigNumber.from('1')).toString())
		await dsPause.exec(spell.address, tag, fax, eta)
	})

	it('user cannot plot', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		await expect(dsPause.connect(userAccount).plot(spell.address, tag, [], eta)).to.be.revertedWith(
			'ds-pause-unauthorized'
		)
	})

	it('user cannot drop', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		await dsPause.plot(spell.address, tag, [], eta)
		await expect(dsPause.connect(userAccount).drop(spell.address, tag, [], eta)).to.be.revertedWith(
			'ds-pause-unauthorized'
		)
	})

	it('user cannot exec', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		await dsPause.plot(spell.address, tag, [], eta)
		await expect(dsPause.connect(userAccount).exec(spell.address, tag, [], eta)).to.be.revertedWith(
			'ds-pause-unauthorized'
		)
	})

	it('cannot exec unplotted', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		await dsPause.plot(spell.address, tag, [], eta)
		await expect(dsPause.exec(spell.address, tag, [], eta.add(BigNumber.from('1')))).to.be.revertedWith(
			'ds-pause-unplotted-plan'
		)
	})

	it('cannot exec premature', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		await dsPause.plot(spell.address, tag, [], eta)
		await expect(dsPause.exec(spell.address, tag, [], eta)).to.be.revertedWith('ds-pause-premature-exec')
	})

	it('cannot disregard delay', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay - 100).toString())
		const tag = await dsPause.soul(spell.address)
		await expect(dsPause.plot(spell.address, tag, [], eta)).to.be.revertedWith('ds-pause-delay-not-respected')
	})
})
