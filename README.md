
# Transaction Parser Documentation

## Overview
This module contains a function that parses blockchain transaction data related to liquidity pooling and staking operations. It extracts and normalizes various transaction parameters into a consistent format.

## Main Function
### 

parseTransactionValues(tx)


Asynchronously parses a transaction object and extracts relevant values for liquidity pooling and staking operations.

#### Parameters
- 

tx

 (Object): The transaction object containing contract calls, events, and transaction details

#### Returns
Returns a 

parsedTx

 object with the following properties:

```javascript
{
    walletId: string,          // Sender's wallet address
    poolContract: string,      // Pool contract identifier
    stakingContract: string,   // Staking contract identifier
    amountX: number,          // Amount of first token
    amountY: number,          // Amount of second token
    lpReceived: number,       // LP tokens received
    lpWithdrawn: number,      // LP tokens withdrawn
    lpStaked: number,         // LP tokens staked
    lpRemoved: number,        // LP tokens removed from staking
    cyclesLocked: number,     // Number of cycles tokens are locked
    cycleInteracted: number,  // Cycle number when interaction occurred
    cyclesForUnlock: number[],// Array of cycles until unlock
    totalUserStaked: number,  // Total amount user has staked
    timestamp: number|false,  // Block timestamp
    isAdd: boolean,          // True for add operations
    isPoolingPositions: boolean, // True for pooling operations
    isStakingPositions: boolean // True for staking operations
}
```

## Supported Transaction Types

### Liquidity Pooling
1. **Add Liquidity** (`add-liquidity`)
   - Processes token deposits into liquidity pool
   - Extracts amounts for both tokens
   - Captures LP tokens received

2. **Withdraw Liquidity** (`withdraw-liquidity`)
   - Processes liquidity removal
   - Extracts withdrawn token amounts
   - Captures LP tokens burned

### Staking
1. **Stake LP Tokens** (`stake-lp-tokens`)
   - Processes LP token staking
   - Captures amount staked
   - Records locking period

2. **Unstake LP Tokens** (`unstake-lp-tokens`)
   - Processes LP token unstaking
   - Captures amount removed
   - Tracks unlock cycles

## Implementation Notes
- Uses regex patterns to extract values from transaction logs
- Handles missing data gracefully with default values
- Includes extensive error checking and fallback values
- Provides debug logging for transaction processing

## Example Usage
```javascript
const tx = await getTransaction(); // Get transaction from blockchain
const parsedValues = await parseTransactionValues(tx);
console.log(parsedValues);
```