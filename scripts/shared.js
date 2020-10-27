const fs = require('fs')
const { BigNumber } = require('ethers')
const prompt = require('prompt')
const moment = require('moment')

const BN = require('bignumber.js')
const tenPow18 = BN('10').exponentiatedBy(BN('18'))

module.exports.getInput = async function (q) {
	return new Promise((resolve, reject) => {
		prompt.get(q, function (err, result) {
			if (err) {
				reject(err)
			}
			resolve(result[q])
		})
	})
}

module.exports.percentageFeeToFeeRate = function (rawFee, scale) {
	return BigNumber.from(BN(rawFee).dividedBy('100.0').multipliedBy(scale).toFixed(0))
}

module.exports.toWei = function (num) {
	return BigNumber.from(BN(num).multipliedBy(tenPow18).toFixed(0))
}

module.exports.unixTimestampFromDateString = function (dateString) {
	return BigNumber.from(moment.utc(dateString, 'DD-MM-YYYY HH:mm:ss').unix().toString())
}

module.exports.loadDeployedAddress = function (network, contract) {
	const path = 'deployed/deployed-' + network + '.json'
	const raw = fs.readFileSync(path)
	const addresses = JSON.parse(raw)
	return addresses[contract]
}

module.exports.loadABI = function (artifact) {
	const raw = fs.readFileSync('build/contracts/' + artifact + '.json')
	const rawJson = JSON.parse(raw)
	return rawJson.abi
}

module.exports.getFunctionABI = function (fullABI, searchFunction) {
	for (let i = 0; i < fullABI.length; i++) {
		const maybeFunction = fullABI[i]
		if (maybeFunction.type === 'function' && maybeFunction.name === searchFunction) {
			return maybeFunction
		}
	}

	throw 'not found: ' + searchFunction
}
