const { expect } = require('chai')

describe('nameVerifiers/DomainNoSubdomainNameVerifier', () => {
	let DomainNoSubdomainNameVerifier
	let nameVerifier

	before(async () => {
		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		nameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('test.com', async () => {
		expect(await nameVerifier.verifyTokenName('test.com')).to.be.true
	})

	it('abcdefghijklmnopqrstuvwxyz_1234567-89.com', async () => {
		expect(await nameVerifier.verifyTokenName('abcdefghijklmnopqrstuvwxyz_1234567-89.com')).to.be.true
	})

	it('test.com (with trailing whitespace)', async () => {
		expect(await nameVerifier.verifyTokenName('test.com ')).to.be.false
	})

	it('test.com (with leading whitespace)', async () => {
		expect(await nameVerifier.verifyTokenName(' test.com')).to.be.false
	})

	it('test.com (with leading and trailing whitespace)', async () => {
		expect(await nameVerifier.verifyTokenName(' test.com ')).to.be.false
	})

	it('test (no dot and TLD)', async () => {
		expect(await nameVerifier.verifyTokenName('test')).to.be.false
	})

	it('test. (no TLD)', async () => {
		expect(await nameVerifier.verifyTokenName('test.')).to.be.false
	})

	it('. (dot only)', async () => {
		expect(await nameVerifier.verifyTokenName('.')).to.be.false
	})

	it('.com (no domain)', async () => {
		expect(await nameVerifier.verifyTokenName('.com')).to.be.false
	})

	it('test..com (double dots)', async () => {
		expect(await nameVerifier.verifyTokenName('test..com')).to.be.false
	})

	it('example.test.com (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('example.test.com')).to.be.false
	})

	it('test!.com (invalid character)', async () => {
		expect(await nameVerifier.verifyTokenName('test!.com')).to.be.false
	})
})
