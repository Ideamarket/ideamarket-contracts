const { expect } = require('chai')

describe('avm/nameVerifiers/AddressNameVerifier', () => {
	let AddressNameVerifier
	let nameVerifier

	before(async () => {
		AddressNameVerifier = await ethers.getContractFactory('AddressNameVerifier')
		nameVerifier = await AddressNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('0x', async () => {
		expect(await nameVerifier.verifyTokenName('0x')).to.be.false
	})

	it('0x????????????????????????????????????????', async () => {
		expect(await nameVerifier.verifyTokenName('0x????????????????????????????????????????')).to.be.false
	})

	it('xxxxxxxxxxx', async () => {
		expect(await nameVerifier.verifyTokenName('xxxxxxxxxxx')).to.be.false
	})

	it('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', async () => {
		expect(await nameVerifier.verifyTokenName('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).to.be.false
	})

	it('0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', async () => {
		expect(await nameVerifier.verifyTokenName('0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).to.be.true
	})

	it('0x6E0d01A76C3Cf4288372a29124A26D4353EE51BE', async () => {
		expect(await nameVerifier.verifyTokenName('0x6E0d01A76C3Cf4288372a29124A26D4353EE51BE')).to.be.true
	})

	it('0x6E0d01A76C3Cf4288372a2.124A26D4353EE51BE', async () => {
		expect(await nameVerifier.verifyTokenName('0x6E0d01A76C3Cf4288372a2.124A26D4353EE51BE')).to.be.false
	})

	it('0xd5e099c71b797516c10ed0f0d895f429c2781142', async () => {
		expect(await nameVerifier.verifyTokenName('0xd5e099c71b797516c10ed0f0d895f429c2781142')).to.be.true
	})
	
	it('0xd5e099c71b797516c10ed0f0d89d5f429c2781142', async () => {
		expect(await nameVerifier.verifyTokenName('0xd5e099c71b797516c10ed0f0d89d5f429c2781142')).to.be.false
	})

	it('0x0000000000000000000000000000000000000000', async () => {
		expect(await nameVerifier.verifyTokenName('0x0000000000000000000000000000000000000000')).to.be.true
	})

	it('000000000000000000000000000000000000000000', async () => {
		expect(await nameVerifier.verifyTokenName('000000000000000000000000000000000000000000')).to.be.false
	})

})
