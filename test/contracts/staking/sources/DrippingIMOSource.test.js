const { expectRevert } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('staking/sources/DrippingIMOSource', () => {
	let IMO
	let DrippingIMOSource
	
	let imo
	let drippingIMOSource

	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
	const rate = tenPow18
	let userAccount
	let adminAccount
	let targetAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		adminAccount = accounts[0]
		userAccount = accounts[1]
		targetAccount = accounts[2]

		IMO = await ethers.getContractFactory('IMO')
		DrippingIMOSource = await ethers.getContractFactory('DrippingIMOSource')
	})

	beforeEach(async () => {
		imo = await IMO.deploy(adminAccount.address)
		await imo.deployed()

		drippingIMOSource = await DrippingIMOSource.deploy(imo.address, targetAccount.address, rate, adminAccount.address)
		await drippingIMOSource.deployed()
	})

	it('has correct state after deployment', async () => {
		expect(await drippingIMOSource._imo()).to.equal(imo.address)
		expect(await drippingIMOSource._target()).to.equal(targetAccount.address)
		expect(await drippingIMOSource._rate()).to.equal(rate)
		expect(await drippingIMOSource.getOwner()).to.equal(adminAccount.address)
		expect(await drippingIMOSource._lastBlock()).to.not.equal(BigNumber.from(0))
	})

	it('can pull', async () => {
		await imo.connect(adminAccount).transfer(drippingIMOSource.address, tenPow18.mul(BigNumber.from('100')))
		const lastBlock = await drippingIMOSource._lastBlock()
		const currentBlock = BigNumber.from(await ethers.provider.getBlockNumber())
		const diff = currentBlock.sub(lastBlock).add(BigNumber.from('1'))
		await drippingIMOSource.pull()
		expect(await imo.balanceOf(targetAccount.address)).to.equal(tenPow18.mul(diff))
	})

	it('can pull with zero rate', async () => {
		await drippingIMOSource.setRate(BigNumber.from('0'))
		await drippingIMOSource.pull()
		expect(await imo.balanceOf(targetAccount.address)).to.equal(BigNumber.from('0'))
	})

	it('fail only admin can call setRate', async () => {
		await expectRevert(drippingIMOSource.connect(userAccount).setRate(BigNumber.from('1')), 'only-owner')
	})
})
