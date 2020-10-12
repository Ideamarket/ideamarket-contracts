const fs = require('fs')

module.exports.externalContractAddresses = {
    'kovan': {

    }
}

module.exports.saveDeployedAddress = function (network, contract, address) {
    let addresses
    let path = '../deployed/deployed-' + network + '.json'
    if(fs.existsSync(path)) {
        const raw = fs.readFileSync(path);
        addresses = JSON.parse(raw);
    }

    addresses[contract] = address
    fs.writeFileSync(path, JSON.stringify(addresses, undefined, 4))
}