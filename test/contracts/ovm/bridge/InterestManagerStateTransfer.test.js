const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

describe('ovm/core/InterestManagerStateTransfer', () => {
	let InterestManagerStateTransferOVM
	let TestERC20

	const zero = BigNumber.from('0')
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	let userAccount
	let adminAccount

	let interestManagerStateTransfer
	let dai

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]

		InterestManagerStateTransferOVM = await ethers.getContractFactory('InterestManagerStateTransferOVM')
		TestERC20 = await ethers.getContractFactory('TestERC20')
	})

	beforeEach(async () => {
		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		interestManagerStateTransfer = await InterestManagerStateTransferOVM.deploy()
		await interestManagerStateTransfer.deployed()
		await interestManagerStateTransfer.initializeStateTransfer(adminAccount.address, dai.address)
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).to.equal(await interestManagerStateTransfer.getOwner())
	})

	it('can invest', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerStateTransfer.address, tenPow18)
		await interestManagerStateTransfer.connect(adminAccount).invest(tenPow18)
		expect(zero.eq(await dai.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await dai.balanceOf(interestManagerStateTransfer.address))).to.be.true
	})

	it('can redeem', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerStateTransfer.address, tenPow18)
		await interestManagerStateTransfer.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await interestManagerStateTransfer.connect(adminAccount).redeem(adminAccount.address, redeemAmount)

		expect(redeemAmount.eq(await dai.balanceOf(adminAccount.address))).to.be.true
		expect(tenPow18.sub(redeemAmount).eq(await dai.balanceOf(interestManagerStateTransfer.address))).to.be.true
	})

	it('fail redeem not admin', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerStateTransfer.address, tenPow18)
		await interestManagerStateTransfer.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await expect(interestManagerStateTransfer.redeem(adminAccount.address, redeemAmount)).to.be.revertedWith(
			'only-owner'
		)
	})
})
