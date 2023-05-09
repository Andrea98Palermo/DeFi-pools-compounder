const { default: BigNumber } = require('bignumber.js');

class MasterChef {

    constructor({config, safe, dex, pendingFName, fnLog}={}) {

        this.config = config;
        this.safe = safe;
        this.web3 = safe.w3();
        this.dex = dex;
        this.pid = this.config.PID;
        this.pendingFName = pendingFName;
        this.has_referral = this.config.has_referral;

        /* Contracts */
        this.contract = new this.web3.eth.Contract( this.config.abis.masterchef, this.config.abis.mc_address );
        this.stake_token = new this.web3.eth.Contract( this.config.abis.stake_token, this.config.STAKE_TOKEN_ADDRESS );
        this.reward_token = new this.web3.eth.Contract( this.config.abis.reward_token, this.config.REWARD_TOKEN_ADDRESS );

        this.log = fnLog;
    }

    setPid = (p) => {
        this.pid = p;
    }

    pidLookup = async (stake_address) => {

        try {
            let l = await this.contract.methods.poolLength().call();
            for(var i = 0; i < l; i++){
                let d = await this.contract.methods.poolInfo(i).call();
                if(String(d.lpToken).toLowerCase() == stake_address.toLowerCase()){ return i; }
            }
            return -1;
        } catch(err){
            console.log("Error: "+err);
        }

    }

    addresses = () => {
        console.log("MasterChef Address: " + this.config.abis.mc_address);
        console.log("Owner address: " + this.safe.admin());
        console.log("ST Address: " + this.config.STAKE_TOKEN_ADDRESS);
        console.log("RT Address: " + this.config.REWARD_TOKEN_ADDRESS);
    }

    info = async (out = true) => {

        try{
    
            var values = await this.contract.methods.userInfo(this.pid, this.safe.admin()).call();
            if(out){

                var rt_decimals = Number(await this.reward_token.methods.decimals().call());
                var st_decimals = Number(await this.stake_token.methods.decimals().call());

                let rewards = await this.pendingRewards();
                let parsed = new BigNumber(rewards).shiftedBy(-1*rt_decimals).toNumber().toFixed(rt_decimals);
                let rt_price = await this.dex.getPrice(this.config.abis.reward_token_address, this.config.abis.reward_token);
                let rewards_as_usdc = new BigNumber(rt_price * parsed).toFixed(10);

                let owner_st_bal = await this.stake_token.methods.balanceOf(this.safe.admin()).call();
                let owner_rt_bal = await this.reward_token.methods.balanceOf(this.safe.admin()).call();
                let owner_et_bal = await this.web3.eth.getBalance(this.safe.admin());
    
                let rt_symbol = await this.reward_token.methods.symbol().call();
                let st_symbol = await this.stake_token.methods.symbol().call();
                
                console.log("\n[STAKE]");
                console.log(rt_symbol + " price: " + rt_price + " $");
                console.log(rt_symbol +" to Harvest: " + parsed  + " " + rt_symbol + " (  " + rewards_as_usdc + " $ )");
                console.log(st_symbol + " in Staking: " + new BigNumber(values[0]).shiftedBy(-1*rt_decimals).toNumber() + " " + st_symbol);
                console.log("\n[OWNER]");
                console.log("Owner " + st_symbol + " (ST) Balance: " + new BigNumber(owner_st_bal).shiftedBy(-1*st_decimals).toNumber() + " " + st_symbol);
                console.log("Owner " + rt_symbol + " (RT) Balance: " + new BigNumber(owner_rt_bal).shiftedBy(-1*rt_decimals).toNumber() + " " + rt_symbol);
                console.log("Owner MATIC (gas) Balance: " + new BigNumber(owner_et_bal).shiftedBy(-18).toNumber() + " MATIC");
                
            }
            return values;
    
        }catch(err){
    
            console.log("Info error: "+err);
            return [0,0];
    
        }
    }

    pendingRewards = async () => {
        let rewards = await this.contract.methods[this.pendingFName](this.pid, this.safe.admin()).call();
        return rewards;
    }

    harvest = async () => {

        try{
            let gas = await this.contract.methods.deposit(this.pid, 0).estimateGas({from: this.safe.admin()});
            console.log("Harvest requires "+gas+" gas. (" + gas * this.config.GAS_BOOST * this.config.HARVEST_SPEEDUP + ")");
            let receipt = await this.contract.methods.deposit(this.pid, 0).send({from: this.safe.admin(), gas: gas * this.config.GAS_BOOST * this.config.HARVEST_SPEEDUP});
            console.log("Harvest : " + receipt.transactionHash);
            this.log("Harvest: " + receipt.transactionHash);
        }catch(err){
            console.log(err);
            this.log("Harvested: "+err);
        }

    }

    deposit = async () => {

        try{
            let st_decimals = Number(await this.stake_token.methods.decimals().call());
            let amt = (this.config.DEV == true) ? new BigNumber(this.config.DEV_GAME_AMOUNT).shiftedBy(st_decimals) : await this.stake_token.methods.balanceOf(this.safe.admin()).call();
            let parsed_amt = new BigNumber(amt).shiftedBy(-1*st_decimals).toNumber().toFixed(10);
            
            await this.dex.approve({
                token_address:this.config.abis.stake_token_address,
                abi:this.config.abis.stake_token,
                spender: this.config.abis.mc_address
            });

            console.log(" "); // take time
            
            let receipt = await this._deposit(this.pid, amt);
            console.log("Deposit: " + receipt.transactionHash + " ("+parsed_amt+")");

        }catch(err){
            console.log("Deposit: " + err);
        }

    }

    _deposit = async (pid, amt) => {
        let gas, receipt;
        if(!this.has_referral){
            gas = await this.contract.methods.deposit(pid, amt).estimateGas({from: this.safe.admin()});
            console.log("Deposit Gas: "+gas + "("+gas * this.config.GAS_BOOST * this.config.DEPOSIT_SPEEDUP + ")");
            receipt = await this.contract.methods.deposit(pid, amt).send({from: this.safe.admin(), gas: gas * this.config.GAS_BOOST * this.config.DEPOSIT_SPEEDUP });
        }else{
            let zero_addr = "0x0000000000000000000000000000000000000000";
            gas = await this.contract.methods.deposit(pid, amt, zero_addr).estimateGas({from: this.safe.admin()});
            console.log("Deposit Gas: "+gas + "("+gas * this.config.GAS_BOOST * this.config.DEPOSIT_SPEEDUP + ")");
            receipt = await this.contract.methods.deposit(pid, amt, zero_addr).send({from: this.safe.admin(), gas: gas * this.config.GAS_BOOST * this.config.DEPOSIT_SPEEDUP });
        }
        return receipt;
    }

    settleAndExit = async () => {

        try {
            let gas = await this.contract.methods.emergencyWithdraw(this.pid).estimateGas({from: this.safe.admin()});
            console.log("SettleAndExit requires " + gas + " gas (" + gas * this.config.GAS_BOOST * this.config.EMERGENCY_SPEEDUP  + ")");
            let receipt = await this.contract.methods.emergencyWithdraw(this.pid).send({from: this.safe.admin(), gas: gas * this.config.GAS_BOOST * this.config.EMERGENCY_SPEEDUP}); 
            console.log("SettleAndExit: " + receipt.transactionHash);
            this.log("SettleAndExit: " + receipt.transactionHash);
        }catch(err){
            console.log("Error: " + err );
        }

    }

}

module.exports = { MasterChef } ;