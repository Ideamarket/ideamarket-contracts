const { BigNumber } = require('ethers')
const bn = require('bignumber.js')
bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })

// Returns the sqrt price as a 64x96
const encodePriceSqrt = (reserve1, reserve0) => {
	return BigNumber.from(
		new bn(reserve1.toString())
			.div(reserve0.toString())
			.sqrt()
			.multipliedBy(new bn(2).pow(96))
			.integerValue(3)
			.toString()
	)
}

// Encode a UniV3 path. Note that pools (and therefore paths) change when you use different fees.
const encodePath = function (path, fees) {
	const FEE_SIZE = 3

	if (path.length != fees.length + 1) {
		throw new Error('path/fee lengths do not match')
	}

	let encoded = '0x'
	for (let i = 0; i < fees.length; i++) {
		// 20 byte encoding of the address
		encoded += path[i].slice(2)
		// 3 byte encoding of the fee
		encoded += fees[i].toString(16).padStart(2 * FEE_SIZE, '0')
	}
	// encode the final token
	encoded += path[path.length - 1].slice(2)

	return encoded.toLowerCase()
}

// Prepare token0 and token1 for UniV3 after comparing the addresses
const getToken0Token1 = function (tokenA, tokenB, tokenAAmount, tokenBAmount) {
	tokenAInt = parseInt(tokenA, 16)
	tokenBInt = parseInt(tokenB, 16)
	if (tokenAInt < tokenBInt) return [tokenA, tokenB, tokenAAmount, tokenBAmount]
	else return [tokenB, tokenA, tokenBAmount, tokenAAmount]
}

module.exports = { encodePriceSqrt, encodePath, getToken0Token1 }
