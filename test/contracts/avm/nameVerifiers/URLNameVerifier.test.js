const { expect } = require('chai')

describe('avm/nameVerifiers/URLNameVerifier', () => {
	let URLNameVerifier
	let nameVerifier

	before(async () => {
		URLNameVerifier = await ethers.getContractFactory('URLNameVerifier')
		nameVerifier = await URLNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it.only('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it.only('http://test.com', async () => {
		expect(await nameVerifier.verifyTokenName('http://test.com')).to.be.true
	})

	it.only('https://abcdefghijklmnopqrstuvwxyz_1234567-89.com', async () => {
		expect(await nameVerifier.verifyTokenName('https://abcdefghijklmnopqrstuvwxyz_1234567-89.com')).to.be.true
	})

	it.only('http://test.com (with trailing whitespace)', async () => {
		expect(await nameVerifier.verifyTokenName('http://test.com ')).to.be.false
	})

	it.only('test.com (with leading whitespace)', async () => {
		expect(await nameVerifier.verifyTokenName(' http://test.com')).to.be.false
	})

	it.only('ipfs://test.com (with leading and trailing whitespace)', async () => {
		expect(await nameVerifier.verifyTokenName(' ipfs://test.com ')).to.be.false
	})

	it.only('test', async () => {
		expect(await nameVerifier.verifyTokenName('test')).to.be.false
	})

    it.only('https://test', async () => {
		expect(await nameVerifier.verifyTokenName('https://test')).to.be.true
	})

	it.only('ipfs://test.', async () => {
		expect(await nameVerifier.verifyTokenName('ipfs://test.')).to.be.true
	})

	it.only('. (dot only)', async () => {
		expect(await nameVerifier.verifyTokenName('.')).to.be.false
	})

    it.only('http:/', async () => {
		expect(await nameVerifier.verifyTokenName('http:/')).to.be.false
	})

    it.only('https://. (dot only)', async () => {
		expect(await nameVerifier.verifyTokenName('.')).to.be.false
	})

	it.only('.com (no domain)', async () => {
		expect(await nameVerifier.verifyTokenName('.com')).to.be.false
	})

	it.only('test..com (double dots)', async () => {
		expect(await nameVerifier.verifyTokenName('test..com')).to.be.false
	})

    it.only('ipfs://test..com (double dots)', async () => {
		expect(await nameVerifier.verifyTokenName('ipfs://test..com')).to.be.false
	})
    
    it.only('ipfs://test.com.testing..time (double dots)', async () => {
		expect(await nameVerifier.verifyTokenName('ipfs://test..com')).to.be.false
	})

    it.only('ipfs://test.com.testing.time.. (double dots)', async () => {
		expect(await nameVerifier.verifyTokenName('ipfs://test.com..')).to.be.false
	})
    
    it.only('http://example.test.com (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('http://example.test.com')).to.be.true
	})

    it.only('https://example.test.com (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('https://example.test.com')).to.be.true
	})

    it.only('ipfs://example.test.com (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('ipfs://example.test.com')).to.be.true
	})

	it.only('example.test.com (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('example.test.com')).to.be.false
	})

    it.only('http://example.test.com/testing (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('http://example.test.com/testing')).to.be.true
	})

    it.only('http://example.test.com//testing (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('http://example.test.com//testing')).to.be.false
	})

    it.only('http://example.test.com/testing// (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('http://example.test.com/testing//')).to.be.false
	})

    it.only('http://example.test.com/testing// (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('http://example.test.com/testing//time')).to.be.false
	})

    it.only('http://example.test.com/testing/ (subdomain)', async () => {
		expect(await nameVerifier.verifyTokenName('http://example.test.com/testing/')).to.be.true
	})

    it.only('http://test!.com (invalid character)', async () => {
		expect(await nameVerifier.verifyTokenName('http://test!.com')).to.be.false
	})

    it.only('https://webmasters.stackexchange.com/questions/8354/what-does-a-double-slash-in-the-url-path-mean', async () => {
		expect(await nameVerifier.verifyTokenName(
            'https://webmasters.stackexchange.com/questions/8354/what-does-a-double-slash-in-the-url-path-mean')).to.be.true
	})
    
	it.only('https://en.wikipedia.org/wiki/Constantin_Br%C3%A2ncu%C8%99i', async () => {
		expect(await nameVerifier.verifyTokenName(
            'https://en.wikipedia.org/wiki/Constantin_Br%C3%A2ncu%C8%99i')).to.be.true
	})

    it.only("https://en.wikipedia.org/wiki/Epstein_didn't_kill_himself", async () => {
		expect(await nameVerifier.verifyTokenName(
            "https://en.wikipedia.org/wiki/Epstein_didn't_kill_himself")).to.be.true
	})

    it.only('https://en.wiktionary.org/wiki/καιρός#Ancient_Greek', async () => {
		expect(await nameVerifier.verifyTokenName(
            'https://en.wiktionary.org/wiki/καιρός#Ancient_Greek')).to.be.true
	})

    it.only('http://www.reddit.com/r/漢字', async () => {
		expect(await nameVerifier.verifyTokenName(
            'http://www.reddit.com/r/漢字')).to.be.true
	})

    it.only('ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/wiki/Vincent_van_Gogh.html', async () => {
		expect(await nameVerifier.verifyTokenName(
            'ipfs://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq/wiki/Vincent_van_Gogh.html')).to.be.true
	})
})
