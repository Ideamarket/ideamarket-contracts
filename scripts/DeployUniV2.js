const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

async function main() {
	let TestWETH
	let TestTransferHelperLib
	let TestUniswapV2Lib
	let TestUniswapV2Factory
	let TestUniswapV2Router02

	let MultiAction

	const YEAR_DURATION = BigNumber.from('31556952')

	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
	const uint256max = BigNumber.from('2').pow(BigNumber.from('256')).sub(BigNumber.from('1'))


	let userAccount
	let adminAccount
	let tradingFeeAccount
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const oneAddress = '0x0000000000000000000000000000000000000001'
	let imo
	let someToken
	let someOtherToken
	let weth
	let uniswapFactory
	let router
	let ideaTokenVault
	let multiAction

	let marketID
	let tokenID
	let ideaToken
    const accounts = await ethers.getSigners()
    userAccount = accounts[0]
    adminAccount = accounts[1]
    tradingFeeAccount = accounts[2]
    imo = await ethers.getContractAt('TestERC20', "0x60CBB924c14d28C2Da82D3Ba0955dC19eC7f51B6")
    someToken = await ethers.getContractAt('TestERC20', "0x0a6346427aA7c352e0e006cC335fCA66B4dDfc86")
    someOtherToken = await ethers.getContractAt('TestERC20', '0x6B8fBB1265AbE7f349a5629c3aF58ebC10F8523D')
    weth = await ethers.getContractAt('TestWETH', "0x6B8fBB1265AbE7f349a5629c3aF58ebC10F8523D")
    uniswapV2Lib = await ethers.getContractAt('TestUniswapV2Library', '0x887561B37F774441EA93Fd0366dc97a66bfC6101')
    uniswapFactory = await ethers.getContractAt('TestUniswapV2Factory', '0x08e2c01BfC583D7A9F8FAB87f30e6386EC25759B')
    TestUniswapV2Router02 = await ethers.getContractFactory('TestUniswapV2Router02')
    /*
    TestERC20 = await ethers.getContractFactory('TestERC20')
    TestWETH = await ethers.getContractFactory('TestWETH')
    TestUniswapV2Lib = await ethers.getContractFactory('TestUniswapV2Library')
    

    MultiAction = await ethers.getContractFactory('contracts/shared/core/MultiActionIMO.sol:MultiActionIMO')

    imo = await TestERC20.deploy('imo', 'imo')
    await imo.deployed()
    console.log("imo: " + imo.address)
    someToken = await TestERC20.deploy('SOME', 'SOME')
    await someToken.deployed()
    console.log("someToken: " + someToken.address)
    someOtherToken = await TestERC20.deploy('SOMEOTHER', 'SOMEOTHER')
    await someOtherToken.deployed()
    console.log("someToken: " + someOtherToken.address)

    weth = await TestWETH.deploy('WETH', 'WETH')
    await weth.deployed()
    console.log("weth: " + someOtherToken.address)
    const uniswapV2Lib = await TestUniswapV2Lib.deploy()
    await uniswapV2Lib.deployed()
    console.log("v2Lib: " + uniswapV2Lib.address)
    uniswapFactory = await TestUniswapV2Factory.deploy(zeroAddress)
    await uniswapFactory.deployed()
    console.log("v2 fact:" + uniswapFactory.address)
    */
   console.log("hi")
   const deploymentData = TestUniswapV2Router02.interface.encodeDeploy([uniswapFactory.address, weth.address])
   const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData });
   console.log("gas:" + estimatedGas)
    router = await TestUniswapV2Router02.deploy(uniswapFactory.address, weth.address)
    await router.deployed()
    console.log("router: " + router.address)
    // Setup Uniswap pools
    // ETH-imo: 1 ETH, 200 imo
    const ethAmount = tenPow18
    let imoAmount = tenPow18.mul(BigNumber.from('200'))

    await weth.connect(adminAccount).deposit({ value: ethAmount })
    await imo.connect(adminAccount).mint(adminAccount.address, imoAmount)
    await weth.connect(adminAccount).approve(router.address, ethAmount)
    await imo.connect(adminAccount).approve(router.address, imoAmount)
    await uniswapFactory.connect(adminAccount).createPair(weth.address, imo.address)
    await router
        .connect(adminAccount)
        .addLiquidity(
            weth.address,
            imo.address,
            ethAmount,
            imoAmount,
            ethAmount,
            imoAmount,
            adminAccount.address,
            BigNumber.from('9999999999999999999')
        )
    console.log("here3")
    // SOME-imo: 1000 SOME, 100 imo
    const someAmount = tenPow18.mul(BigNumber.from('1000'))
    imoAmount = tenPow18.mul(BigNumber.from('100'))
    await someToken.connect(adminAccount).mint(adminAccount.address, someAmount)
    await imo.connect(adminAccount).mint(adminAccount.address, imoAmount)

    await someToken.connect(adminAccount).approve(router.address, someAmount)
    await imo.connect(adminAccount).approve(router.address, imoAmount)
    await uniswapFactory.connect(adminAccount).createPair(someToken.address, imo.address)

    await router
        .connect(adminAccount)
        .addLiquidity(
            someToken.address,
            imo.address,
            someAmount,
            imoAmount,
            someAmount,
            imoAmount,
            adminAccount.address,
            BigNumber.from('9999999999999999999')
        )

    // ETH-SOMEOTHER: 1 ETH, 500 SOMEOTHER
    const someOtherAmount = tenPow18.mul(BigNumber.from('1000'))

    await weth.connect(adminAccount).deposit({ value: ethAmount })
    await someOtherToken.connect(adminAccount).mint(adminAccount.address, someOtherAmount)
    await weth.connect(adminAccount).approve(router.address, ethAmount)
    await someOtherToken.connect(adminAccount).approve(router.address, someOtherAmount)
    await uniswapFactory.connect(adminAccount).createPair(weth.address, someOtherToken.address)
    await router
        .connect(adminAccount)
        .addLiquidity(
            weth.address,
            someOtherToken.address,
            ethAmount,
            someOtherAmount,
            ethAmount,
            someOtherAmount,
            adminAccount.address,
            BigNumber.from('9999999999999999999')
        )
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})