const { expect } = require('chai')

describe('nameVerifiers/TwitterHandleNameVerifier', () => {
	let TwitterHandleNameVerifier
	let nameVerifier

	before(async () => {
		TwitterHandleNameVerifier = await ethers.getContractFactory('TwitterHandleNameVerifier')
		nameVerifier = await TwitterHandleNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('@jack', async () => {
		expect(await nameVerifier.verifyTokenName('@jack')).to.be.true
	})

	it('@a', async () => {
		expect(await nameVerifier.verifyTokenName('@a')).to.be.true
	})

	it('@aaaaaaaaaaaaaaa', async () => {
		expect(await nameVerifier.verifyTokenName('@aaaaaaaaaaaaaaa')).to.be.true
	})

	it('@abcdefghijklmno', async () => {
		expect(await nameVerifier.verifyTokenName('@abcdefghijklmno')).to.be.true
	})

	it('@pqrstuvwxyz', async () => {
		expect(await nameVerifier.verifyTokenName('@pqrstuvwxyz')).to.be.true
	})

	it('@ABCDEFGHIJKLMNO', async () => {
		expect(await nameVerifier.verifyTokenName('@ABCDEFGHIJKLMNO')).to.be.true
	})

	it('@PQRSTUVWXYZ', async () => {
		expect(await nameVerifier.verifyTokenName('@PQRSTUVWXYZ')).to.be.true
	})

	it('@123456789_', async () => {
		expect(await nameVerifier.verifyTokenName('@123456789')).to.be.true
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('@ (@ only)', async () => {
		expect(await nameVerifier.verifyTokenName('@')).to.be.false
	})

	it('@aaaaaaaaaaaaaaaa (17 chars)', async () => {
		expect(await nameVerifier.verifyTokenName('@aaaaaaaaaaaaaaaa')).to.be.false
	})

	it('@{unallowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				!(i >= 0x30 && i <= 0x39) && //9-0
				!(i >= 0x41 && i <= 0x5a) && //A-Z
				!(i >= 0x61 && i <= 0x7a) && //a-z
				!(i === 0x5f)
			) {
				//_

				expect(await nameVerifier.verifyTokenName('@' + String.fromCharCode(i))).to.be.false
			}
		}
	})

	it('@{allowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				(i >= 0x30 && i <= 0x39) || //9-0
				(i >= 0x41 && i <= 0x5a) || //A-Z
				(i >= 0x61 && i <= 0x7a) || //a-z
				i === 0x5f
			) {
				//_

				expect(await nameVerifier.verifyTokenName('@' + String.fromCharCode(i))).to.be.true
			}
		}
	})
})
