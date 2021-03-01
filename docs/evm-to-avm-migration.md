Ideamarket Arbitrum migration
===

Ideamarket is migrating to [Arbitrum L2](https://arbitrum.io/) due to the extremely high gas fees on Ethereum. This document describes the technical details of the migration process.

### Overview
Unlike many other DeFi applications, Ideamarket intends to exist as a singular entity, which is why co-deploying to multiple chains or multiple Layer 2 scaling solutions at the same time is not an option. 

Ideamarket launched in February 2021 on the Ethereum mainnet and is, at the time of writing this document in late April 2021, hosting over 300 publisher tokens backed by approximately $1MM in Dai. 

The main challenge of the migration is to transfer this state to Arbitrum with a high degree of trustlessness and as seamlessly as possible with minimal downtime. 

### Repository structure
The code can be found in the [ideamarket-contracts](github.com/Ideamarket/ideamarket-contracts) repository on the `avm` branch. The `/contracts` folder has been split into three sub-categories:
- `evm`: Holds all contracts which are deployed on L1, including already deployed contracts
- `avm`: Holds all contracts which will be deployed on L2
- `shared`: Holds all contracts which are used by both the EVM and AVM.

The `/test/contracts` directory has also been split to differentiate between L1 and L2 tests.

### L1 to L2 messages
The backbone of this migration is represented by Arbitrum's [`Inbox`](https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-eth/contracts/bridge/Inbox.sol) contract. This contract allows for communication across layers by passing messages between Ethereum and Arbitrum. The [`Inbox`](https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-eth/contracts/bridge/Inbox.sol) contract on L1 can be called to trigger a transaction on L2. To transfer state from L1 to L2 we can call the [`Inbox`](https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-eth/contracts/bridge/Inbox.sol) on L1 with a target L2 contract and calldata as payload. 

### L1 Contracts
The existing contracts on L1 have the task to initiate the state transfer via the [`Inbox`](https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-eth/contracts/bridge/Inbox.sol). Once the migration process is started, it is crucial for the L1 state to not change. To achieve that, three of the core contracts will get their logic replaced:
- `IdeaTokenFactory` -> `IdeaTokenFactoryStateTransfer`. The new logic disables all state-changing functions.
- `InterestManagerCompound` -> `InterestManagerCompoundStateTransfer`. The new logic disables all state-changing functions and adds a function `executeStateTransfer` which transfers all Dai in this contract to the `InterestManagerStateTransferOVM` on L2 using Arbitrum's [`EthERC20Bridge`](https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-peripherals/contracts/tokenbridge/ethereum/EthERC20Bridge.sol).
- `IdeaTokenExchange` -> `IdeaTokenExchangeStateTransfer`. The new logic disables all state-changing functions and adds five new functions:
    - `transferStaticVars`: Transfers the `_tradingFeeInvested` state variable
    - `transferPlatformVars`: Transfers a market's/platform's state variables to L2
    - `transferTokenVars`: Transfers the state variables of multiple token's to L2
    - `setTokenTransferEnabled`: Once the execution of the previous three methods is complete, this method sets a flag which enables users on L1 to transfer their `IdeaToken`s to L2 by calling `transferIdeaTokens`
    -  `transferIdeaTokens`: Burns a user's `IdeaToken`s on L1 and mints them on L2

The logic replacements on L1 are permanent and will not change after the migration is complete.

### L2 Contracts
The contracts on L2 will be invoked by the L1 calls to the [`Inbox`](https://github.com/OffchainLabs/arbitrum/blob/develop/packages/arb-bridge-eth/contracts/bridge/Inbox.sol). To keep as much of the migration logic seperated from the core contracts, a bridge contract `BridgeAVM` is introduced to which all L1 -> L2 calls are directed. However during migration the L2 core contracts still need special logic to be able to receive the state. The following contracts are initially deployed with state transfer logic:

- `IdeaTokenFactoryStateTransferAVM`: Only allows the `BridgeAVM` to add `IdeaToken`s.
- `IdeaTokenExchangeStateTransferAVM`: Allows the `BridgeAVM` to set its internal state variables.
- `InterestManagerStateTransferAVM`: As it is currently not known if a money market like [Compound](https://compound.finance/) will immediately be available when Arbitrum launches, this contract simply holds the Dai and does not generate interest. It is designed to be extendable via a logic replacement once a money market becomes available on Arbitrum.

The `BridgeAVM` contract is the target for all L1 -> L2 calls. It offers the following functions:
- `receiveExchangeStaticVars`: Counterpart to `transferStaticVars`
- `receiveExchangePlatformVars`: Counterpart to `transferPlatformVars`
- `receiveExchangeTokenVars`: Counterpart to `transferTokenVars`. Note that this function does not immediately set the state and instead caches it locally. The reason for that is that setting this state involves costly operations such as deploying a new contract for each token. A relatively cheap transaction on L1 might fail on L2 because it exceeds the gas limit
- `setTokenVars`: Sets the state received via `receiveExchangeTokenVars`. Can be directly called on L2 by the owner of `BridgeAVM`. After this function has been called for all tokens, the `setTokenTransferEnabled` on L1 will be called to enable user to transfer their `IdeaToken`s
- `receiveIdeaTokenTransfer`: Counterpart to `transferIdeaTokens`. Sends L2 `IdeaToken`s to the recipient

After all state has been set and `setTokenTransferEnabled` has been enabled, the correct logic for the L2 core contracts will be set:
- `IdeaTokenFactoryStateTransferAVM` -> `IdeaTokenFactoryAVM`
- `IdeaTokenExchangeStateTransferAVM` -> `IdeaTokenFactoryAVM`

### Step by step migration process
1. The `BridgeAVM` (`avm/bridge/BridgeAVM.sol`) contract is deployed to L2. The `initialize` function is not yet called.
2. The core Ideamarket contracts are deployed to L2. `IdeaTokenFactoryStateTransferAVM`, `IdeaTokenExchangeStateTransferAVM`, and `InterestManagerStateTransferAVM` (`avm/bridge/*.sol`) are initially deployed with state transfer logic as explained earlier. The same markets as on L1 are set with the same parameters.
3. `BridgeAVM.initialize` is called on L2.
4. The already deployed Ideamarket contracts on L1, `IdeaTokenFactory`, `IdeaTokenExchange`, and `InterestManagerCompound` (`evm/core/*.sol`), get their logic replaced with state transfer logic (`evm/bridge/*.sol`).
5. `InterestManagerCompoundStateTransfer.executeStateTransfer` is called on L1.
6. `IdeaTokenExchangeStateTransfer.transferStaticVars` is called on L1.
7. `IdeaTokenExchangeStateTransfer.transferPlatformVars` is called on L1. once for each platform/market
8. `IdeaTokenExchangeStateTransfer.transferTokenVars` is called multiple times on L1 with multiple `tokenIDs` in each call until all state is transferred.
9. `BridgeAVM.setTokenVars` is called multiple times on L2 with multiple `tokenIDs` in each call until all state is transferred.
10. On L2, the proper non-state-transfer logic is set on `IdeaTokenFactoryAVM` and`IdeaTokenExchangeAVM`. 
11. `IdeaTokenExchangeStateTransfer.setTokenTransferEnabled` is called on L1 which finally allows user to migrate their `IdeaToken`s to L2 using `IdeaTokenExchangeStateTransfer.transferIdeaTokens`.

### Running tests
**EVM**: `npm run test:evm`

**AVM**:
1. Install local node:
```
mkdir ~/arbitrum
curl https://raw.githubusercontent.com/OffchainLabs/arb-os/3c28bc5a6d5510678572b7e231c54e34d7138ebc/arb_os/arbos.mexe --output ~/arbitrum/arbos.mexe
```
2. Run local node:
```
docker run -p 127.0.0.1:8547:8547 --entrypoint /home/user/go/bin/arb-dev-node -v ~/arbitrum:/home/user/arb-os/arb_os offchainlabs/arb-validator:v0.8.1-dev2
```
3. Wait a moment for the node to boot, then run the tests:
```
npm run test:avm
```

### Miscellaneous notes
- *Previous audit*: The existing contracts on L1 have previously been audited by Quantstamp: [Quantstamp Audit](https://docs.ideamarket.io/contracts/audit).
- *IdeaTokenExchangeStateTransfer*: The contracts allow for a `allInterestToPlatform` flag to be set when adding a new market. When this flag is set, the entire interest generated by the tokens in this market is paid to the platform owner. Ideamarket currently does not have such a market where this flag is set to `true` and will also not add such a market before migrating to L2. Logic to transfer this state (specifically `IdeaTokenExchange._platformsExchangeInfo`) has thus been omitted.
- *Token and platform owners*: This state is not transferred to L2, the token and platform owners will be reset. They will be able to easily re-authenticate.
- *Locked tokens*: The already deployed `IdeaTokenVault` (`shared/core/IdeaTokenVault.sol`) contract allows users to lock `IdeaToken`s for a given duration to signal support and belief in a listing. The state of this contract will not be transferred and it will remain untouched on L1. Once the locking duration runs out, users will be able to withdraw their `IdeaToken`s and use `IdeaTokenExchangeStateTransfer.transferIdeaTokens` to migrate them to L2.
- *MultiActionWithoutUniswap*: It is not yet clear whether Uniswap will be officially deployed on Arbitrum when Ideamarket migrates. The `MultiActionWithoutUniswap` (`avm/core/MultiActionWithoutUniswap.sol`) contract is a different version of the `MultiAction` (`shared/core/MultiAction`) contract which simply has all logic related to Uniswap removed. Note that this contract is not used with a proxy. Instead a full second version will be deployed when it is replaced, thus differences in storage layout are not harmful. 
- *InterestManagerCompoundAVM*: It is currently not known if or when [Compound](https://compound.finance/) will support Arbitrum. For us to be able to migrate as early as possible, the L2 `InterestManager` has been designed to work without an interest-generating protocol. After the migration is complete, the logic will continue to be set to `InterestManagerStateTransferAVM` which simply holds Dai and does not generate interest. Once Compound is available, the logic will be replaced with `InterestManagerCompoundAVM`.
