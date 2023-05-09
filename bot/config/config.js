require('dotenv').config({ path: '../../.env' });
const abis = require('./presets/moonriver/apolloswap_USDC_ST.json');

module.exports = {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    THICK: parseInt(process.env.THICK) * 1000, // 60s
    USDC: abis.usdc_address,
    WMATIC: abis.wmatic_address,
    REWARD_TOKEN_ADDRESS: abis.reward_token_address,
    STAKE_TOKEN_ADDRESS: abis.stake_token_address,
    ROUTER: abis.router_address, // router
    PID: process.env.POOL_ID,
    PID_AUTODISCOVER: ( process.env.PID_AUTODISCOVER === "true" ),
    DEV_GAME_AMOUNT: parseInt(process.env.DEV_GAME_AMOUNT), // Dev
    DEV: ( process.env.DEV === "true" ),
    DEV_THICK: parseInt(process.env.DEV_THICK) * 1000,
    SOGLIA: process.env.HARVEST_MIN, // 3$
    SLIPPAGE: 8, // 8%  - [1-99]
    LOG_FILENAME: process.env.LOG_FILE + Date.now() + ".log",
    GAS_BOOST: parseInt(process.env.GAS_BOOST),
    DEPOSIT_SPEEDUP: parseInt(process.env.DEPOSIT_SPEEDUP),
    EMERGENCY_SPEEDUP: parseInt(process.env.EMERGENCY_SPEEDUP),
    APPROVE_SPEEDUP: parseInt(process.env.APPROVE_SPEEDUP),
    HARVEST_SPEEDUP: parseInt(process.env.HARVEST_SPEEDUP),
    SWAP_SPEEDUP: parseInt(process.env.SWAP_SPEEDUP),
    STD_GAS: process.env.STD_GAS,
    /* Commands */
    commands: require('./commands.js'),
    abis: abis,
    pendingRewardsFName: abis.pendingFName,
    has_referral: abis.useReferral,
    networks: {
        'polygon': {
            wss: [
                //'wss://rpc-mainnet.maticvigil.com/ws/v1/e9416d0e20e7ba39dc70441129c2d179fe6a68c9',
                "wss://rpc-mainnet.matic.network",
                "wss://ws-matic-mainnet.chainstacklabs.com",
                "wss://rpc-mainnet.maticvigil.com/ws",
            ],
            id: "137"
        },
        'moonriver': {
            wss: [
                'wss://wss.moonriver.moonbeam.network',
                'wss://moonriver.api.onfinality.io/public-ws',
                'wss://pub.elara.patract.io/moonriver'
            ],
            id: "1285"
        },
        'Fantom Opera': {
            wss: [
                'wss://wsapi.fantom.network/'
            ],
            id: '250'
        }

    }
};