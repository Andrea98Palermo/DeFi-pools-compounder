const { default: BigNumber } = require('bignumber.js');

class Compounder {

    constructor({config, safe, dex, master, fnLog} = {}) {

        this.config = config;
        this.pendingFName = this.config.pendingRewardsFName;
        this.last_provider_id = 0;
        this.network_id = this.config.NETWORK_ID;
        this.safe = safe;
        this.web3 = safe.w3();
        this.reward_token = new this.web3.eth.Contract( this.config.abis.reward_token, this.config.REWARD_TOKEN_ADDRESS );
        this.mc = new this.web3.eth.Contract( this.config.abis.masterchef, this.config.abis.mc_address );
        this.stake_token = new this.web3.eth.Contract( this.config.abis.stake_token, this.config.STAKE_TOKEN_ADDRESS );
        this.exit_token = new this.web3.eth.Contract( this.config.abis.wmatic, this.config.WMATIC );
        this.dex = dex;
        this.master = master;
        this._log = fnLog;
    }

    log(msg){
        if(this._log != undefined){
            this._log(msg);
        }else{
            console.log("Log function not set.")
        }
    }

    getDex = () => {
        return this.dex;
    }
    
    getPendingTx = async () => {
        let txs = await this.web3.eth.getPendingTransactions();
        return txs;
    }
    
    gasReserve = async () => {
        return await this.web3.eth.getBalance(this.safe.admin());
    }

    job = async (i) => {

        try {
            console.log("\n[Cycle " + i + "]");

            let rt_decimals = Number(await this.reward_token.methods.decimals().call());
            let r = await this.master.pendingRewards();
            let s = new BigNumber(r).shiftedBy(-1*rt_decimals).toNumber().toFixed(rt_decimals);
            let p = await this.dex.getPrice(this.config.abis.reward_token_address, this.config.abis.reward_token);
            let b = await this.gasReserve();
            let rt_symbol = await this.reward_token.methods.symbol().call();

            console.log("\t-> MATIC balance: " + new BigNumber(b).shiftedBy(-18).toNumber().toFixed(5));
            console.log("\t-> Pending "+rt_symbol+": " + s);
            console.log("\t-> "+rt_symbol+" price: " + p);

            let x = s * p;
            console.log("\t-> " + x.toFixed(5) + " / " + this.config.SOGLIA + " ($)");

            if(s * p > this.config.SOGLIA){
                console.log("\t-> [SWAPHARVEST]");
                await this.master.harvest();
                await this.dex.swap(this.config.abis.reward_token_address, this.config.abis.reward_token);
            }else{
                console.log("\t-> [SKIP]");
                console.log("");
            }
        }catch(err){
            console.log("[ERROR] " + err);
        }
    }

    start = async () => {
            console.log("\n[Compounder]\n\t-> Started with cycle of " + ( this.config.DEV == true ? this.config.DEV_THICK : this.config.THICK ) / 1000 / 60 + " minutes");
            this.log("\n[Compounder]\n\t-> Started with cycle of " + ( this.config.DEV == true ? this.config.DEV_THICK : this.config.THICK ) / 1000 / 60 + " minutes");
            var i = 0;
            this.job(i);
            setInterval( () => { this.job(++i); }, this.config.DEV == true ? this.config.DEV_THICK : this.config.THICK);
    }

    digest = (args) => {

        switch (args[0].toLowerCase()) {
            
            case this.config.commands.CHECK:
                this.master.info(true).then(() => {
                    this.gasReserve().then((r) => {
                        console.log("\n[GAS]");
                        console.log("Gas multiplier active: " + this.config.GAS_BOOST + "x");
                        console.log("Deposit speedup active: " + this.config.DEPOSIT_SPEEDUP + "x (" + this.config.DEPOSIT_SPEEDUP * this.config.GAS_BOOST + "x)");
                        console.log("Contract Gas reserve: " + new BigNumber(r).shiftedBy(-18).toNumber() + " WETH");
                        this.gasReserve().then((g) => {
                            console.log("Owner Gas reserve: " + new BigNumber(g).shiftedBy(-18).toNumber() + " WETH\n");
                            process.exit();
                        });
                    });
                }).catch( err => console.log);
                break;
        
            case this.config.commands.DEPOSIT:
                this.master.deposit().then(() => { process.exit(); });
                break;
        
            case this.config.commands.HARVEST:
                this.master.harvest().then(() => { process.exit(); });
                break;
            
            case this.config.commands.SWAP:
                // Default path = [this.config.abis.reward_token_address, this.config.USDC, this.config.WMATIC]
                this.dex.swap(this.config.abis.reward_token_address, this.config.abis.reward_token).then( () => {
                    process.exit();
                });
                break;
            
            case this.config.commands.SWAPHARVEST:
                this.master.harvest().then( () => {
                    this.dex.swap(this.config.abis.reward_token_address, this.config.abis.reward_token).then( () => {
                        process.exit();
                    });
                });
                break;
                
            case this.config.commands.EXIT:
                this.master.settleAndExit().then(() => { process.exit(); });
                break;
        
            case this.config.commands.PENDING:
                this.getPendingTx().then((p) => {
                    console.log(p);
                    process.exit();
                });
                break;
            
            case this.config.commands.INFO:
                this.master.addresses();
                this.dex.getPrice(this.config.abis.reward_token_address, this.config.abis.reward_token)
                .then( (p) => {
                    this.reward_token.methods.symbol().call().then((symb) => {
                        console.log(symb + " (RT) Price: "+p);
                        process.exit();
                    });
                }).catch(console.log);
                break;

            case this.config.commands.START:
                this.start();
                break;
            
            case this.config.commands.FIND:
                this.master.pidLookup(this.config.STAKE_TOKEN_ADDRESS).then( (pid) => {
                    if(pid >= 0){
                        console.log("Pool Found! PID=[" + pid + "]");
                    }else{
                        console.log("Pool not found. Exit code: " + pid);
                    }
                    process.exit();
                });
                break;

            default:
                console.log('Commands available are CHECK | DEPOSIT | EXIT | HARVEST | SWAPHARVEST | PENDING | INFO | FIND');
                process.exit();
        }
    }

}

module.exports = { Compounder } ;