const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

// AVM-DONE
describe('avm/core/InterestManagerStateTransfer', () => {
	let InterestManagerStateTransferAVM
	let TestERC20

	const zero = BigNumber.from('0')
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	let adminAccount
	let userAccount

	let interestManagerStateTransfer
	let dai

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]

		InterestManagerStateTransferAVM = await ethers.getContractFactory('InterestManagerStateTransferAVM')
		TestERC20 = await ethers.getContractFactory('TestERC20')
	})

	beforeEach(async () => {
		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		interestManagerStateTransfer = await InterestManagerStateTransferAVM.deploy()
		await interestManagerStateTransfer.deployed()
		await interestManagerStateTransfer.initializeStateTransfer(adminAccount.address, dai.address)
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).to.equal(await interestManagerStateTransfer.getOwner())
	})

	it('can invest', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.connect(userAccount).transfer(interestManagerStateTransfer.address, tenPow18)
		await interestManagerStateTransfer.connect(adminAccount).invest(tenPow18)
		expect(zero.eq(await dai.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await dai.balanceOf(interestManagerStateTransfer.address))).to.be.true
		expect(tenPow18.eq(await interestManagerStateTransfer.sharesToDai(tenPow18))).to.be.true
	})

	it('can redeem', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.connect(userAccount).transfer(interestManagerStateTransfer.address, tenPow18)
		await interestManagerStateTransfer.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await interestManagerStateTransfer.connect(adminAccount).redeem(adminAccount.address, redeemAmount)

		expect(redeemAmount.eq(await dai.balanceOf(adminAccount.address))).to.be.true
		expect(tenPow18.sub(redeemAmount).eq(await dai.balanceOf(interestManagerStateTransfer.address))).to.be.true
	})

	it('owner can add to total shares', async () => {
		await interestManagerStateTransfer.connect(adminAccount).addToTotalShares(BigNumber.from('123'))
		expect((await interestManagerStateTransfer._totalShares()).toNumber()).to.be.equal(123)
	})

	it('fail user cannot add to total shares', async () => {
		await expect(interestManagerStateTransfer.addToTotalShares(BigNumber.from('123'))).to.be.revertedWith(
			'only-owner'
		)
	})

	it('fail redeem not admin', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.connect(userAccount).transfer(interestManagerStateTransfer.address, tenPow18)
		await interestManagerStateTransfer.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await expect(
			interestManagerStateTransfer.connect(userAccount).redeem(adminAccount.address, redeemAmount)
		).to.be.revertedWith('only-owner')
	})
})
