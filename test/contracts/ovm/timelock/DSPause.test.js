const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')
const { waitForTx, expectRevert } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')
const time = require('../../utils/time')

describe('ovm/timelock/DSPause', () => {
	let DSPause
	let AddMarketSpell
	let IdeaTokenFactory

	let dsPause
	let dsPauseProxyAddress
	let spell

	const delay = 0
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const oneAddress = '0x0000000000000000000000000000000000000001'
	const someAddress = '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8' // random addr from etherscan
	let adminAccount
	let userAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		;[userAccount] = generateWallets(ethers, 1)

		DSPause = await ethers.getContractFactory('DSPauseOVM')
		AddMarketSpell = await ethers.getContractFactory('AddMarketSpell')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')
	})

	beforeEach(async () => {
		dsPause = await DSPause.deploy()
		await dsPause.deployed()
		await waitForTx(dsPause.initialize(delay, adminAccount.address))
		dsPauseProxyAddress = await dsPause._proxy()

		spell = await AddMarketSpell.deploy()
		await spell.deployed()
	})

	it('admin and user cannot set owner', async () => {
		await expectRevert(dsPause.connect(adminAccount).setOwner(someAddress))
		await expectRevert(dsPause.connect(userAccount).setOwner(someAddress))
	})

	it('admin and user cannot set delay', async () => {
		await expectRevert(dsPause.connect(adminAccount).setDelay(BigNumber.from('0')))
		await expectRevert(dsPause.connect(userAccount).setDelay(BigNumber.from('0')))
	})

	it('admin can plot and drop', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)
		await waitForTx(dsPause.plot(spell.address, tag, [], eta))
		await waitForTx(dsPause.drop(spell.address, tag, [], eta))
	})

	it('admin can plot and exec', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)

		const factory = await IdeaTokenFactory.deploy()
		await factory.deployed()
		await waitForTx(factory.initialize(dsPauseProxyAddress, oneAddress, oneAddress, oneAddress))

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

		await waitForTx(dsPause.plot(spell.address, tag, fax, eta))
		await waitForTx(dsPause.exec(spell.address, tag, fax, eta))
	})

	it('user cannot plot', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)
		await expectRevert(dsPause.connect(userAccount).plot(spell.address, tag, [], eta))
	})

	it('user cannot drop', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)
		await waitForTx(dsPause.plot(spell.address, tag, [], eta))
		await expectRevert(dsPause.connect(userAccount).drop(spell.address, tag, [], eta))
	})

	it('user cannot exec', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)
		await waitForTx(dsPause.plot(spell.address, tag, [], eta))
		await expectRevert(dsPause.connect(userAccount).exec(spell.address, tag, [], eta))
	})

	it('cannot exec unplotted', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)
		await waitForTx(dsPause.plot(spell.address, tag, [], eta))
		await expectRevert(dsPause.exec(spell.address, tag + '0', [], eta))
	})

	/*it('cannot exec premature', async () => {
		const eta = BigNumber.from((parseInt(await time.latest()) + delay + 100).toString())
		const tag = await dsPause.soul(spell.address)
		await dsPause.plot(spell.address, tag, [], eta)
		await expect(dsPause.exec(spell.address, tag, [], eta)).to.be.revertedWith('ds-pause-premature-exec')
	})*/

	it('cannot disregard delay', async () => {
		const eta = await time.latest()
		const tag = await dsPause.soul(spell.address)
		await expectRevert(dsPause.plot(spell.address, tag, [], eta.sub(BigNumber.from('100'))))
	})
})
