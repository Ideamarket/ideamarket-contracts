const { expectRevert } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('avm/staking/IMOStaking', () => {
	let IMO
	let IMOStaking
    let DrippingIMOSource
	
	let imo
    let imoStaking
	let drippingIMOSource

	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
	const rate = tenPow18
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    const oneAddress = '0x0000000000000000000000000000000000000001'
	let userAccount
	let adminAccount

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
        secondUserAccount = accounts[1]
        adminAccount = accounts[2]

		IMO = await ethers.getContractFactory('IMO')
		IMOStaking = await ethers.getContractFactory('IMOStaking')
        DrippingIMOSource = await ethers.getContractFactory('DrippingIMOSource')
	})

	beforeEach(async () => {
		imo = await IMO.deploy(adminAccount.address)
		await imo.deployed()

        imoStaking = await IMOStaking.deploy(imo.address, adminAccount.address)
        await imoStaking.deployed()

		drippingIMOSource = await DrippingIMOSource.deploy(imo.address, imoStaking.address, rate, adminAccount.address)
		await drippingIMOSource.deployed()

        const balance = await imo.balanceOf(adminAccount.address)
        await imo.connect(adminAccount).transfer(userAccount.address, tenPow18)
        await imo.connect(adminAccount).transfer(secondUserAccount.address, tenPow18)
        await imo.connect(adminAccount).transfer(drippingIMOSource.address, balance.sub(tenPow18).sub(tenPow18))

        await imoStaking.connect(adminAccount).addSource(drippingIMOSource.address)
    })

	it('has correct state after deployment', async () => {
		expect(await imoStaking._imo()).to.equal(imo.address)
        const sources = await imoStaking.getSources()
        expect(sources.length).to.equal(1)
        expect(sources[0]).to.equal(drippingIMOSource.address)
    })

    it('multiple users can deposit and withdraw', async () => {
        await imo.connect(userAccount).approve(imoStaking.address, tenPow18)
        await imoStaking.connect(userAccount).deposit(tenPow18)
        
        await imo.connect(secondUserAccount).approve(imoStaking.address, tenPow18)
        await imoStaking.connect(secondUserAccount).deposit(tenPow18)

        const firstUserShares = await imoStaking.balanceOf(userAccount.address)
        await imoStaking.connect(userAccount).withdraw(firstUserShares)

        const secondUserShares = await imoStaking.balanceOf(secondUserAccount.address)
        await imoStaking.connect(secondUserAccount).withdraw(secondUserShares)
        
        expect((await imo.balanceOf(userAccount.address)).gt(tenPow18)).to.be.true
        expect((await imo.balanceOf(secondUserAccount.address)).gt(tenPow18)).to.be.true
        expect(await imoStaking.totalSupply()).to.equal(BigNumber.from('0'))
    })

    it('can add and remove source', async () => {
        await imoStaking.connect(adminAccount).addSource(oneAddress)
        let sources = await imoStaking.getSources()
        expect(sources.length).to.equal(2)
        expect(sources[1]).to.equal(oneAddress)

        await imoStaking.connect(adminAccount).removeSource(oneAddress)
        sources = await imoStaking.getSources()
        expect(sources.length).to.equal(1)
        expect(sources[0]).to.equal(drippingIMOSource.address)
    })

    it('fail deposit invalid amount', async () => {
        await expectRevert(imoStaking.deposit(BigNumber.from('0')), 'invalid-amount')
    })

    it('fail withdraw invalid shares', async () => {
        await expectRevert(imoStaking.withdraw(BigNumber.from('0')), 'invalid-shares')
    })

    it('fail deposit not enough balance', async () => {
        await imo.approve(imoStaking.address, tenPow18.mul(BigNumber.from('2')))
        await expectRevert(imoStaking.deposit(tenPow18.mul(BigNumber.from('2'))), 'transfer amount exceeds balance')
    })

    it('fail withdraw not enough shares', async () => {
        await imo.approve(imoStaking.address, tenPow18)
        await imoStaking.deposit(tenPow18)
        await expectRevert(imoStaking.withdraw(tenPow18.add(BigNumber.from('1'))), 'burn amount exceeds balance')
    })

    it('fail only admin can add and remove sources', async () => {
        await expectRevert(imoStaking.connect(userAccount).addSource(oneAddress), 'only-owner')
        await expectRevert(imoStaking.connect(userAccount).removeSource(oneAddress), 'only-owner')
    })

    it('fail invalid address when adding and removing source', async () => {
        await expectRevert(imoStaking.connect(adminAccount).addSource(zeroAddress), 'invalid-source')
        await expectRevert(imoStaking.connect(adminAccount).removeSource(zeroAddress), 'invalid-source')
    })

    it('fail add source multiple times', async () => {
        await imoStaking.connect(adminAccount).addSource(oneAddress)
        await expectRevert(imoStaking.connect(adminAccount).addSource(oneAddress), 'already-added')
    })

    it('fail remove source which has not been added', async () => {
        await expectRevert(imoStaking.connect(adminAccount).removeSource(oneAddress), 'no-source')
    })
})
