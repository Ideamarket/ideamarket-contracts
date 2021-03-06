# Ideamarket Contracts

The Ideamarket contracts for the Ethereum blockchain.

## Docs

[Ideamarket contract documentation](https://docs.ideamarket.io/contracts)

## Usage

### Run tests

`npx hardhat test`

### Deploy

`npx hardhat run --network <mainnet|rinkeby> scripts/Deploy.js`

## Repository structure

### `/contracts`

Holds the Solidity smart contracts.

-   `./core`: Main Ideamarket contracts
-   `./erc20`: OZ ERC20 implementation
-   `./proxy`: OZ `AdminUpgradeabilityProxy`
-   `./compound`: Compound V2 interfaces
-   `./weth`: Wrapped ETH (WETH) interfaces
-   `./uniswap`: Uniswap V2 interfaces
-   `./test`: Mock contracts for testing
-   `./timelock`: DAppHub `DSPause` timelock. Uses `spells` to execute changes
-   `./spells`: Spells for the `DSPause` timelock to delegatecall into
-   `./util`: Utility contracts like `Ownable` and `Initializable`

### `/deployed`

Holds `.json` files containing contract addresses and ABIs of the contracts deployed on the different networks.

### `/docs`

Diagrams and docs.

### `/scripts`

Utility scripts for deploying and making calls to on-chain contracts.

### `/test/contracts`

Contract unit tests
