const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('evm/core/IdeaToken', () => {
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	let IdeaToken
	let userAccount
	let otherUserAccount
	let adminAccount

	let ideaToken

	before(async () => {
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		otherUserAccount = accounts[1]
		adminAccount = accounts[2]
	})

	beforeEach(async () => {
		ideaToken = await IdeaToken.connect(adminAccount).deploy()
		await ideaToken.initialize('name', adminAccount.address)
		await ideaToken.deployed()
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).to.equal(await ideaToken.getOwner())
	})

	it('admin can mint tokens', async () => {
		await ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18)
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
	})

	it('admin can burn tokens', async () => {
		await ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18)
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await ideaToken.connect(adminAccount).burn(userAccount.address, tenPow18)
		expect(BigNumber.from('0').eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
	})

	it('normal user cannot mint tokens', async () => {
		await expect(ideaToken.connect(userAccount).mint(userAccount.address, tenPow18)).to.be.revertedWith(
			'only-owner'
		)
	})

	it('normal user cannot burn tokens', async () => {
		await ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18)
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await expect(ideaToken.connect(userAccount).burn(userAccount.address, tenPow18)).to.be.revertedWith(
			'only-owner'
		)
	})

	it('user can transfer tokens', async () => {
		await ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18)
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await ideaToken.connect(userAccount).transfer(otherUserAccount.address, tenPow18)
		expect(BigNumber.from('0').eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await ideaToken.balanceOf(otherUserAccount.address))).to.be.true
	})

	it('user can approve other user', async () => {
		await ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18)
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await ideaToken.connect(userAccount).approve(otherUserAccount.address, tenPow18)
		expect(tenPow18.eq(await ideaToken.allowance(userAccount.address, otherUserAccount.address))).to.be.true
		await ideaToken.connect(otherUserAccount).transferFrom(userAccount.address, otherUserAccount.address, tenPow18)
		expect(BigNumber.from('0').eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await ideaToken.balanceOf(otherUserAccount.address))).to.be.true
	})

	it('user can transfer other users tokens', async () => {
		await ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18)
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await expect(
			ideaToken.connect(otherUserAccount).transferFrom(userAccount.address, otherUserAccount.address, tenPow18)
		).to.be.revertedWith('ERC20: transfer amount exceeds allowance')
	})
})
