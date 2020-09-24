const { expectRevert } = require('@openzeppelin/test-helpers');

const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')
const TestERC20 = artifacts.require('TestERC20')
const TestCDai = artifacts.require('TestCDai')
const InterestManagerCompound = artifacts.require('InterestManagerCompound')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')
const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')
const IdeaToken = artifacts.require('IdeaToken')
const TestWETH = artifacts.require('TestWETH')
const CurrencyConverter = artifacts.require('CurrencyConverter')

const BN = web3.utils.BN

contract('IdeaTokenExchange', async accounts => {

    const tenPow18 = new BN('10').pow(new BN('18'))

    const marketName = 'main'
    const tokenName = 'test.com'
    const baseCost = new BN('1000000000000000000') // 10**18
    const priceRise = new BN('100000000000000000') // 10**17
    const tokensPerInterval = new BN('100000000000000000000') // 10**20
    const tradingFeeRate = new BN('100')
    const tradingFeeRateScale = new BN('10000')

    const userAccount = accounts[0]
    const adminAccount = accounts[1]
    const tradingFeeAccount = accounts[2]
    const zeroAddress = '0x0000000000000000000000000000000000000000'

    let domainNoSubdomainNameVerifier
    let dai
    let cDai
    let interestManagerCompound
    let ideaTokenFactory
    let ideaTokenExchange
    let weth
    let currencyConverter

    let marketID
    let tokenID
    let ideaToken

    beforeEach(async () => {
        
        domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.new()
        dai = await TestERC20.new('DAI', 'DAI')
        cDai = await TestCDai.new(dai.address)
        await cDai.setExchangeRate(tenPow18)
        interestManagerCompound = await InterestManagerCompound.new()
        ideaTokenFactory = await IdeaTokenFactory.new()
        ideaTokenExchange = await IdeaTokenExchange.new()
        weth = await TestWETH.new('WETH', 'WETH')
        currencyConverter = await CurrencyConverter.new(
            ideaTokenExchange.address,
            dai.address,
            uniswapv2router, // todo
            weth.address
        )


        await interestManagerCompound.initialize(ideaTokenExchange.address,
                                                 dai.address,
                                                 cDai.address,
                                                 zeroAddress,
                                                 zeroAddress,
                                                 {from: adminAccount})

        await ideaTokenFactory.initialize(adminAccount,
                                          ideaTokenExchange.address,
                                          {from: adminAccount})

        await ideaTokenExchange.initialize(adminAccount,
                                           tradingFeeAccount,
                                           ideaTokenFactory.address,
                                           interestManagerCompound.address,
                                           dai.address,
                                           {from: adminAccount})

        await ideaTokenFactory.addMarket(marketName,
                                         domainNoSubdomainNameVerifier.address,
                                         baseCost,
                                         priceRise,
                                         tokensPerInterval,
                                         tradingFeeRate,
                                         tradingFeeRateScale,
                                         {from: adminAccount})

        marketID = await ideaTokenFactory.getMarketIDByName(marketName)

        await ideaTokenFactory.addToken(tokenName, marketID)

        tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

        ideaToken = await IdeaToken.at((await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken)

    })
})