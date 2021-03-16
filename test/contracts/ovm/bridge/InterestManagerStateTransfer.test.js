const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const { expectRevert, waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')

describe('ovm/core/InterestManagerStateTransfer', () => {
	let InterestManagerStateTransferOVM
	let TestERC20

	const zero = BigNumber.from('0')
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	let adminAccount
	let userAccount

	let interestManagerStateTransfer
	let dai

	before(async () => {
		adminAccount = (await ethers.getSigners())[0]
		;[userAccount] = generateWallets(ethers, 1)

		InterestManagerStateTransferOVM = await ethers.getContractFactory('InterestManagerStateTransferOVM')
		TestERC20 = await ethers.getContractFactory('TestERC20')
	})

	beforeEach(async () => {
		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		interestManagerStateTransfer = await InterestManagerStateTransferOVM.deploy()
		await interestManagerStateTransfer.deployed()
		await waitForTx(interestManagerStateTransfer.initializeStateTransfer(adminAccount.address, dai.address))
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).to.equal(await interestManagerStateTransfer.getOwner())
	})

	it('can invest', async () => {
		await waitForTx(dai.mint(userAccount.address, tenPow18))
		await waitForTx(dai.connect(userAccount).transfer(interestManagerStateTransfer.address, tenPow18))
		await waitForTx(interestManagerStateTransfer.connect(adminAccount).invest(tenPow18))
		expect(zero.eq(await dai.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await dai.balanceOf(interestManagerStateTransfer.address))).to.be.true
	})

	it('can redeem', async () => {
		await waitForTx(dai.mint(userAccount.address, tenPow18))
		await waitForTx(dai.connect(userAccount).transfer(interestManagerStateTransfer.address, tenPow18))
		await waitForTx(interestManagerStateTransfer.connect(adminAccount).invest(tenPow18))

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await waitForTx(interestManagerStateTransfer.connect(adminAccount).redeem(adminAccount.address, redeemAmount))

		expect(redeemAmount.eq(await dai.balanceOf(adminAccount.address))).to.be.true
		expect(tenPow18.sub(redeemAmount).eq(await dai.balanceOf(interestManagerStateTransfer.address))).to.be.true
	})

	it('fail redeem not admin', async () => {
		await waitForTx(dai.mint(userAccount.address, tenPow18))
		await waitForTx(dai.connect(userAccount).transfer(interestManagerStateTransfer.address, tenPow18))
		await waitForTx(interestManagerStateTransfer.connect(adminAccount).invest(tenPow18))

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await expectRevert(interestManagerStateTransfer.connect(userAccount).redeem(adminAccount.address, redeemAmount))
	})
})
