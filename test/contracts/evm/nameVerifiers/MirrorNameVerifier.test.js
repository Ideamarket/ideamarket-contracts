const { expect } = require('chai')

describe('nameVerifiers/MirrorNameVerifier', () => {
	let MirrorNameVerifier
	let nameVerifier

	before(async () => {
		MirrorNameVerifier = await ethers.getContractFactory('MirrorNameVerifier')
		nameVerifier = await MirrorNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('vitalik', async () => {
		expect(await nameVerifier.verifyTokenName('vitalik')).to.be.true
	})
	it('vi-talik', async () => {
		expect(await nameVerifier.verifyTokenName('vi-talik')).to.be.true
	})

	it('v-i-t-a-l-i-k', async () => {
		expect(await nameVerifier.verifyTokenName('v-i-t-a-l-i-k')).to.be.true
	})

	it('Vitalik', async () => {
		expect(await nameVerifier.verifyTokenName('Vitalik')).to.be.false
	})

	it('-vitalik', async () => {
		expect(await nameVerifier.verifyTokenName('-vitalik')).to.be.false
	})

	it('vitalik-', async () => {
		expect(await nameVerifier.verifyTokenName('vitalik-')).to.be.false
	})

	it('-vitalik-', async () => {
		expect(await nameVerifier.verifyTokenName('-vitalik-')).to.be.false
	})

	it('VITALIK', async () => {
		expect(await nameVerifier.verifyTokenName('VITALIK')).to.be.false
	})

	it('12vitalik34', async () => {
		expect(await nameVerifier.verifyTokenName('12vitalik34')).to.be.true
	})

	it('(max length)', async () => {
		const tooLong = Array.from(Array(63).keys())
			.map((v) => 'o')
			.join('')
		expect(await nameVerifier.verifyTokenName(tooLong)).to.be.true
	})

	it('(too long)', async () => {
		const tooLong = Array.from(Array(64).keys())
			.map((v) => 'o')
			.join('')
		expect(await nameVerifier.verifyTokenName(tooLong)).to.be.false
	})

	it('{unallowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				!(i >= 0x61 && i <= 0x7a) && // a-z
				!(i >= 0x30 && i <= 0x39) // 0-9
			) {
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i))).to.be.false
			}
		}
	})

	it('{allowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				(i >= 0x61 && i <= 0x7a) || // a-z
				(i >= 0x30 && i <= 0x39) // 0-9
			) {
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i))).to.be.true
			}
		}
	})
})
