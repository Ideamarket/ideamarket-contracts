const fs = require('fs')
const prompt = require('prompt')
const moment = require('moment')
const Web3 = require('web3')
const web3 = new Web3()

// web3 bn cannot handle floats
const BigNumber = require('bignumber.js')
const tenPow18 = BigNumber('10').exponentiatedBy('18')
const BN = web3.utils.BN

module.exports.getInput = async function(q) {
    return new Promise((resolve, reject) => {
        prompt.get(q, function (err, result) {
            if(err) {
                reject(err)
            }
            resolve(result[q])
        })
    })
}

module.exports.percentageFeeToFeeRate = function(rawFee, scale) {
    return new BN(BigNumber(rawFee).dividedBy('100.0').multipliedBy(scale).toFixed(0))
}

module.exports.toWei = function(num) {
    return new BN(BigNumber(num).multipliedBy(tenPow18).toFixed(0))
}

module.exports.unixTimestampFromDateString = function(dateString) {
    return new BN(moment.utc(dateString, 'DD-MM-YYYY HH:mm:ss').unix().toString())
}

module.exports.loadDeployedAddress = function(network, contract) {
    const path = '../deployed/deployed-' + network + '.json'
    const raw = fs.readFileSync(path)
    const addresses = JSON.parse(raw)
    return addresses[contract]
}

module.exports.getFunctionABI = function(fullABI, searchFunction) {
    for(let i = 0; i < fullABI.length; i++) {
        const maybeFunction = fullABI[i]
        if(maybeFunction.type === 'function' && maybeFunction.name === searchFunction) {
            return maybeFunction
        }
    }

    throw 'not found: ' + searchFunction
}