const { expect } = require('chai')

describe('nameVerifiers/URLNameVerifier', () => {
	let URLNameVerifier
	let nameVerifier

	before(async () => {
		URLNameVerifier = await ethers.getContractFactory('URLNameVerifier')
		nameVerifier = await URLNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

    it('valid urls', async () => {

        const urls = [
            'edition.cnn.com/2021/02/25/tech/hyundai-ev-recall/index.html',
            'edition.cnn.com/2021/02/25/tech/airbnb-doordash-earnings-pandemic/index.html',
            'www.cnbc.com/2021/02/26/asia-markets-bond-yields-technology-stocks-currencies-oil.html',
            'www.foxnews.com/politics/boehner-tells-cruz-to-go-f-yourself-while-recording-audio-book-report',
            'www.coindesk.com/kraken-exchange-capital-raise',
            'www.motherjones.com/politics/2013/09/new-study-politics-makes-you-innumerate/',
            'twitter.com/naval/status/1002103360646823936',
            'www.vice.com/de/article/4adpbj/fotos-kamelrennen-in-der-sinai-wuste'
        ]
    
        for(let url of urls) {
            expect(await nameVerifier.verifyTokenName(url)).to.be.true
        }
	})

    it('invalid urls', async () => {
        const urls = [
            'https://some.site', 
            'some:user@github.com',
        ]

        for(let url of urls) {
            expect(await nameVerifier.verifyTokenName(url)).to.be.false
        }
    })
})
