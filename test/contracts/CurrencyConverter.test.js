const { expectRevert } = require('@openzeppelin/test-helpers');
const { assertion } = require('@openzeppelin/test-helpers/src/expectRevert');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')
const TestERC20 = artifacts.require('TestERC20')
const TestCDai = artifacts.require('TestCDai')
const InterestManagerCompound = artifacts.require('InterestManagerCompound')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')
const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')
const IdeaToken = artifacts.require('IdeaToken')
const TestWETH = artifacts.require('TestWETH')
const TestTransferHelperLib = artifacts.require('TestTransferHelper')
const TestUniswapV2Lib = artifacts.require('TestUniswapV2Library')
const TestUniswapV2Factory = artifacts.require('TestUniswapV2Factory')
const TestUniswapV2Router02 = artifacts.require('TestUniswapV2Router02')
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
    let someToken
    let cDai
    let interestManagerCompound
    let ideaTokenFactory
    let ideaTokenExchange
    let weth
    let uniswapFactory
    let router
    let currencyConverter

    let marketID
    let tokenID
    let ideaToken

    beforeEach(async () => {
        
        domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.new()
        dai = await TestERC20.new('DAI', 'DAI')
        someToken = await TestERC20.new('SOME', 'SOME')
        cDai = await TestCDai.new(dai.address)
        await cDai.setExchangeRate(tenPow18)
        interestManagerCompound = await InterestManagerCompound.new()
        ideaTokenFactory = await IdeaTokenFactory.new()
        ideaTokenExchange = await IdeaTokenExchange.new()
        weth = await TestWETH.new('WETH', 'WETH')
        const transferHelperLib = await TestTransferHelperLib.new()
        const uniswapV2Lib = await TestUniswapV2Lib.new()
        await TestUniswapV2Router02.link('TestTransferHelper', transferHelperLib.address)
        await TestUniswapV2Router02.link('TestUniswapV2Library', uniswapV2Lib.address)
        uniswapFactory = await TestUniswapV2Factory.new(zeroAddress)
        router = await TestUniswapV2Router02.new(uniswapFactory.address, weth.address)
        currencyConverter = await CurrencyConverter.new(
            ideaTokenExchange.address,
            dai.address,
            router.address,
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

        // Setup Uniswap pools
        // ETH-DAI: 1 ETH, 200 DAI
        const ethAmount = tenPow18
        let daiAmount = tenPow18.mul(new BN('200'))
        await weth.deposit({ from: adminAccount, value: ethAmount })
        await dai.mint(adminAccount, daiAmount, { from: adminAccount })
        await weth.approve(router.address, ethAmount, { from: adminAccount })
        await dai.approve(router.address, daiAmount, { from: adminAccount })
        await uniswapFactory.createPair(weth.address, dai.address, { from: adminAccount })
        await router.addLiquidity(weth.address,
                                  dai.address,
                                  ethAmount,
                                  daiAmount,
                                  ethAmount,
                                  daiAmount,
                                  adminAccount,
                                  new BN('9999999999999999999'),  // deadline
                                  { from: adminAccount })

        // SOME-DAI: 1000 SOME, 100 DAI
        const someAmount = tenPow18.mul(new BN('1000'))
        daiAmount = tenPow18.mul(new BN('100'))
        await someToken.mint(adminAccount, someAmount, { from: adminAccount })
        await dai.mint(adminAccount, daiAmount, { from: adminAccount })
        await someToken.approve(router.address, someAmount, { from: adminAccount })
        await dai.approve(router.address, daiAmount, { from: adminAccount })
        await uniswapFactory.createPair(someToken.address, dai.address, { from: adminAccount })
        await router.addLiquidity(someToken.address,
                                  dai.address,
                                  someAmount,
                                  daiAmount,
                                  someAmount,
                                  daiAmount,
                                  adminAccount,
                                  new BN('9999999999999999999'),  // deadline
                                  { from: adminAccount })
    })

    it('can buy/sell tokens ETH', async () => {

        // 25 idea tokens
        const ideaTokenAmount = tenPow18.mul(new BN('25'))
        const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
        const requiredInputForCost = (await router.getAmountsIn(buyCost, [weth.address, dai.address]))[0]

        await currencyConverter.buyTokens(zeroAddress,
                                          ideaToken.address,
                                          ideaTokenAmount,
                                          requiredInputForCost,
                                          userAccount,
                                          { value: requiredInputForCost })
        
        const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount)
        assert.isTrue(tokenBalanceAfterBuy.eq(ideaTokenAmount))

        const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
        const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, weth.address]))[1]
        
        await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
        await currencyConverter.sellTokens(zeroAddress,
                                           ideaToken.address,
                                           tokenBalanceAfterBuy,
                                           outputFromSell,
                                           userAccount)

        const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount)
        assert.isTrue(tokenBalanceAfterSell.eq(new BN('0')))
    })
})