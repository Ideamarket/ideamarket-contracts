const { expectRevert } = require('@openzeppelin/test-helpers')
const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

const BN = web3.utils.BN

contract('core/IdeaTokenFactory', async accounts => {

    const tenPow18 = new BN('10').pow(new BN('18'))

    const tokenName = 'example.com'
    const marketName = 'testMarket'
    const baseCost = new BN('1000000000000000000') // 10**18
    const priceRise = new BN('100000000000000000') // 10**17
    const tokensPerInterval = new BN('100000000000000000000') // 10**20
    const tradingFeeRate = new BN('100')
    const platformFeeRate = new BN('50')
    const feeScale = new BN('10000')

    const userAccount = accounts[0]
    const adminAccount = accounts[1]
    const ideaTokenExchangeAddress = accounts[2]
    const zeroAddress = '0x0000000000000000000000000000000000000000'

    let ideaTokenFactory

    beforeEach(async () => {
        ideaTokenFactory = await IdeaTokenFactory.new({ from: adminAccount })
        await ideaTokenFactory.initialize(adminAccount, ideaTokenExchangeAddress, { from: adminAccount })
    })

    it('admin is owner', async () => {
        assert.equal(adminAccount, await ideaTokenFactory.getOwner())
    })

    it('can add market', async () => {
        const nameVerifier = await DomainNoSubdomainNameVerifier.new()
        await ideaTokenFactory.addMarket(
            marketName,  nameVerifier.address,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        assert.isTrue(new BN('1').eq(await ideaTokenFactory.getNumMarkets()))
        assert.isTrue(new BN('1').eq(await ideaTokenFactory.getMarketIDByName(marketName)))
        
        const marketDetailsByID = await ideaTokenFactory.getMarketDetailsByID(new BN('1'))
        const marketDetailsByName = await ideaTokenFactory.getMarketDetailsByName(marketName)
        const expectedMarketDetails = [
            true, // exists
            '1', // id
            marketName,
            nameVerifier.address,
            '0', // numTokens
            baseCost.toString(),
            priceRise.toString(),
            tokensPerInterval.toString(),
            tradingFeeRate.toString(),
            platformFeeRate.toString()
        ]

        assert.deepEqual(marketDetailsByID, expectedMarketDetails)
        assert.deepEqual(marketDetailsByName, expectedMarketDetails)
    })

    it('fail add market with same name', async () => {
        const nameVerifier = await DomainNoSubdomainNameVerifier.new()
        await ideaTokenFactory.addMarket(
            marketName,  nameVerifier.address,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await expectRevert(
            ideaTokenFactory.addMarket(
                marketName,  nameVerifier.address,
                baseCost, priceRise, tokensPerInterval,
                tradingFeeRate, platformFeeRate,
                { from: adminAccount }
            ),
            'addMarket: market exists already'
        )
    })

    it('checks parameters when adding market', async () => {
        await expectRevert(
            ideaTokenFactory.addMarket(
                marketName, '0x0000000000000000000000000000000000000000',
                new BN('0'), priceRise, tokensPerInterval,
                tradingFeeRate, platformFeeRate, 
                { from : adminAccount }
            ),
            'addMarket: invalid parameters'
        )

        await expectRevert(
            ideaTokenFactory.addMarket(
                marketName, '0x0000000000000000000000000000000000000000',
                baseCost, new BN('0'), tokensPerInterval,
                tradingFeeRate, platformFeeRate,
                { from : adminAccount }
            ),
            'addMarket: invalid parameters'
        )

        await expectRevert(
            ideaTokenFactory.addMarket(
                marketName, '0x0000000000000000000000000000000000000000',
                baseCost, priceRise, new BN('0'),
                tradingFeeRate, platformFeeRate,
                { from : adminAccount }
            ),
            'addMarket: invalid parameters'
        )
    })

    it('only admin can add market', async () => {
        await expectRevert(
            ideaTokenFactory.addMarket(
                marketName, '0x0000000000000000000000000000000000000000',
                baseCost, priceRise, tokensPerInterval,
                tradingFeeRate, platformFeeRate,
                { from: userAccount }
            ),
            'Ownable: onlyOwner'
        )
    })

    it('can add token', async () => {
        const nameVerifier = await DomainNoSubdomainNameVerifier.new()
        await ideaTokenFactory.addMarket(
            marketName,  nameVerifier.address,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await ideaTokenFactory.addToken(tokenName, new BN('1'))

        const marketDetails = await ideaTokenFactory.getMarketDetailsByID(new BN('1'))
        const expectedMarketDetails = [
            true, // exists
            '1', // id
            marketName,
            nameVerifier.address,
            '1', // numTokens
            baseCost.toString(),
            priceRise.toString(),
            tokensPerInterval.toString(),
            tradingFeeRate.toString(),
            platformFeeRate.toString()
        ]

        assert.deepEqual(marketDetails, expectedMarketDetails)
    })

    it('fail add token with invalid name', async () => {
        const nameVerifier = await DomainNoSubdomainNameVerifier.new()
        await ideaTokenFactory.addMarket(
            marketName,  nameVerifier.address,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await expectRevert(
            ideaTokenFactory.addToken('some.invalid.name', new BN('1')),
            'addToken: name verification failed'
        )
    })

    it('fail add token with same name twice', async () => {
        const nameVerifier = await DomainNoSubdomainNameVerifier.new()
        await ideaTokenFactory.addMarket(
            marketName,  nameVerifier.address,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await ideaTokenFactory.addToken(tokenName, new BN('1'))
        await expectRevert(
            ideaTokenFactory.addToken(tokenName, new BN('1')),
            'addToken: name verification failed'
        )
    })

    it('can set trading fee', async () => {
        await ideaTokenFactory.addMarket(
            marketName,  zeroAddress,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await ideaTokenFactory.setTradingFee(new BN('1'), new BN('123'), { from: adminAccount })
        const marketDetails = await ideaTokenFactory.getMarketDetailsByID(new BN('1'))
        assert.isTrue(marketDetails.tradingFeeRate === '123')
    })

    it('fail user sets trading fee', async () => {
        await ideaTokenFactory.addMarket(
            marketName,  zeroAddress,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await expectRevert(
            ideaTokenFactory.setTradingFee(new BN('1'), new BN('123')),
            'Ownable: onlyOwner'
        )
    })

    it('can set platform fee', async () => {
        await ideaTokenFactory.addMarket(
            marketName,  zeroAddress,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await ideaTokenFactory.setPlatformFee(new BN('1'), new BN('123'), { from: adminAccount })
        const marketDetails = await ideaTokenFactory.getMarketDetailsByID(new BN('1'))
        assert.isTrue(marketDetails.platformFeeRate === '123')
    })

    it('fail user sets platform fee', async () => {
        await ideaTokenFactory.addMarket(
            marketName,  zeroAddress,
            baseCost, priceRise, tokensPerInterval,
            tradingFeeRate, platformFeeRate,
            { from: adminAccount }
        )

        await expectRevert(
            ideaTokenFactory.setPlatformFee(new BN('1'), new BN('123')),
            'Ownable: onlyOwner'
        )
    })

})