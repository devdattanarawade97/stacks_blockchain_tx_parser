export async function parseTransactionValues(tx) {
    const parsedTx = {
        walletId: tx.sender_address || '',
        poolContract: '',
        stakingContract: '',
        amountX: 0,
        amountY: 0,
        lpReceived: 0,
        lpWithdrawn: 0,
        lpStaked: 0,
        lpRemoved: 0,
        cyclesLocked: 0,
        cycleInteracted: 0,
        cyclesForUnlock: [0],
        totalUserStaked: 0,
        timestamp: tx.block_time || false,
        isAdd: false,
        isPoolingPositions: false,
        isStakingPositions: false
    };


    
    
    console.log("tx: ", tx);

    if (!tx?.contract_call) {
        console.error("Transaction does not contain contract call data.");
        return parsedTx;
    }

    console.log("tx type: ", tx.tx_type);
    console.log("function name: ", tx.contract_call.function_name);

    const args = tx.contract_call.function_args || [];
    const functionName = tx.contract_call.function_name;
    const contractId = tx.contract_call.contract_id;

    // Liquidity Pooling Transactions
    if (["add-liquidity", "withdraw-liquidity"].includes(functionName)) {
        parsedTx.isPoolingPositions = true;
        parsedTx.poolContract = contractId;

        if (functionName === "add-liquidity") {
            parsedTx.isAdd = true;
            parsedTx.amountX = args[3]?.repr ? parseFloat(args[3].repr.replace('u', '')) : 0;
            parsedTx.amountY = args[4]?.repr ? parseFloat(args[4].repr.replace('u', '')) : 0;

            // Filter out 'mint' events and assign 'lpReceived' from amount attribute
            const filteredEvents = tx.events.filter(event => {
                if (event.event_type === "fungible_token_asset" && event.asset?.asset_event_type === "mint") {
                    // Handle mint event by extracting the amount and assigning it as lpReceived
                    parsedTx.lpReceived = parseFloat(event.asset.amount);
                    return false; // Exclude this mint event from further processing
                }
                return true; // Keep other events
            });

        }

        if (functionName === "withdraw-liquidity") {
            parsedTx.isAdd = false;

            // Access tx_result and extract the x-amount and y-amount from the 'repr' string
            const txResult = tx.tx_result?.repr || '';
            const match = txResult.match(/\(x-amount u(\d+)\) \(y-amount u(\d+)\)/);

            if (match) {
                // Extract the amounts for x and y tokens
                parsedTx.amountX = parseFloat(match[1]);
                parsedTx.amountY = parseFloat(match[2]);
            } else {
                parsedTx.amountX = 0;
                parsedTx.amountY = 0;
            }


            // Filter event that contains "amount" in the 'repr' field
            const smartContractLogEvent = tx.events.find(event => {
                const log = event.contract_log?.value?.repr || '';
                return log.includes("amount");
            });

            if (smartContractLogEvent) {
                const log = smartContractLogEvent.contract_log?.value?.repr || '';

                // Extract lpWithdrawn only if "amount" is present in the log
                const matchAmount = log.match(/u(\d+)/);
                parsedTx.lpWithdrawn = matchAmount ? parseInt(matchAmount[1], 10) : 0;
            } else {
                // Default value when no relevant event is found
                parsedTx.lpWithdrawn = 0;
            }
        }

    }

    // Staking Transactions
    if (["stake-lp-tokens", "unstake-lp-tokens"].includes(functionName)) {
        parsedTx.isStakingPositions = true;
        parsedTx.stakingContract = contractId;

        if (functionName === "stake-lp-tokens") {
            parsedTx.isAdd = true;
            parsedTx.lpStaked = args[0]?.repr ? parseFloat(args[0].repr.replace('u', '')) : 0;
            parsedTx.cyclesLocked = args[1]?.repr ? parseInt(args[1].repr.replace('u', ''), 10) : 0;
        }
        if (functionName === "unstake-lp-tokens") {
            parsedTx.isAdd = false;

            // Access tx_result and extract the lp-amount from the 'repr' string
            const txResult = tx.tx_result?.repr || '';
            const match = txResult.match(/\(ok u(\d+)\)/);

            if (match) {
                // Extract the staked LP tokens amount
                parsedTx.lpRemoved = parseFloat(match[1]);
            } else {
                parsedTx.lpRemoved = 0;
            }
        }

    }

    // Extract additional staking data (cycles, total user staked)
    // args.forEach(arg => {
    //     if (arg.name === "current-cycle") {
    //         parsedTx.cycleInteracted = parseInt(arg.repr.replace('u', ''), 10);
    //     }
    //     if (arg.name === "cycles-to-unstake") {
    //         parsedTx.cyclesForUnlock = arg.repr.startsWith("(list") 
    //             ? arg.repr.match(/u\d+/g).map(c => parseInt(c.replace('u', ''), 10)) 
    //             : [parseInt(arg.repr.replace('u', ''), 10)];
    //     }
    //     if (arg.name === "user-lp-staked") {
    //         parsedTx.totalUserStaked = parseInt(arg.repr.replace('u', ''), 10);
    //     }
    // });

    // Filter events that contain specific substrings in the 'repr' field
    const smartContractLogEvent = tx.events.find(event => {
        const log = event.contract_log?.value?.repr || '';
        return log.includes("current-cycle")
            || log.includes("cycles-to-unstake")
            || log.includes("total-lp-staked")
            || log.includes("user-lp-staked");
    });

    if (smartContractLogEvent) {
        const log = smartContractLogEvent.contract_log?.value?.repr || '';

        // Extract values directly from the 'repr' field
        if (log.includes("current-cycle")) {
            const matchCycle = log.match(/current-cycle u(\d+)/);
            if (matchCycle) {
                parsedTx.cycleInteracted = parseInt(matchCycle[1], 10);
            } else {
                parsedTx.cycleInteracted = 0; // Default value if not found
            }
        }

        if (log.includes("cycles-to-unstake")) {
            const matchCycles = log.match(/cycles-to-unstake \(list ([u\d\s]+)\)/);
            if (matchCycles) {
                parsedTx.cyclesForUnlock = matchCycles[1]
                    .match(/u\d+/g) // Match all occurrences of 'u' followed by digits
                    .map(cycle => parseInt(cycle.replace('u', ''), 10)); // Convert to numbers
            } else {
                parsedTx.cyclesForUnlock = [0]; // Default value if not found
            }
        }

        if (log.includes("user-lp-staked")) {
            const matchStaked = log.match(/user-lp-staked u(\d+)/);
            if (matchStaked) {
                parsedTx.totalUserStaked = parseInt(matchStaked[1], 10);
            } else {
                parsedTx.totalUserStaked = 0; // Default value if not found
            }
        }
    } else {
        // Default logic when no relevant event is found
        parsedTx.cycleInteracted = 0;
        parsedTx.cyclesForUnlock = [0];
        parsedTx.totalUserStaked = 0;
    }


    console.log("Parsed transaction: ", parsedTx);
    return parsedTx;
}

// Fetch transaction details from API
const fetchTransactions = async (txId) => {
    const url = `https://api.hiro.so/extended/v1/tx/${txId}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }
    return response.json();
};

// Main function to fetch and parse transaction
(async () => {
    try {
        // Example usage
        const addLiquidityTxId = "0x9c3409704c573f9ea773288592d61a2c78ebf6dfe092b8fb646d9515b5a143cf";
        const removeLiquidityTxId = "0x87cac12d6c72c03253ef4dd7f32c8a50c87522c9eb46014efde7f8141c7cf684"
        const addStakeTxId = "0x2d6f1b0cdb16defcee46d3696bcae1e9909817e4414312918aa12a5dd1aac801";
        const unstakeId = "0xf1b46d1931b23c98b6342d78f4d87a7e9fcffb8479c36a34426a0b964c055a27";
        const tx = await fetchTransactions(addLiquidityTxId);
        const parsedTx = await parseTransactionValues(tx);
        console.log("Parsed tx is: ", parsedTx);
    } catch (error) {
        console.error("Error processing transaction:", error);
    }
})();
