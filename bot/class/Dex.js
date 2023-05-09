const { default: BigNumber } = require('bignumber.js');
class Dex {

    constructor({config, safe, fnLog}) {
        this.config = config;
        this.safe = safe;
        this.w3 = safe.w3();
        this.address = this.config.ROUTER;
        this.router = new this.w3.eth.Contract( this.config.abis.router,  this.config.ROUTER );
        this.USDC = config.USDC;
        this.DEBUG = true;
        this.slippage = config.SLIPPAGE;
        this._log = fnLog;
    }

    log(msg){
        if(this._log != undefined){
            this._log(msg);
        }else{
            console.log("Log function not set.")
        }
    }

    setSlippage = (slippage) => {
        this.slippage = slippage;
    }

    getPrice = async (address, abi, path = []) => {
        
        if(path.length == 0)
            path = [address, this.USDC];

        let token = await new this.w3.eth.Contract( abi, address );
        let rt_decimals = Number(await token.methods.decimals().call());
        let base_amt = new BigNumber(1).shiftedBy(rt_decimals);
    
        try{
    
            let amt = await this.router.methods.getAmountsOut(base_amt, path).call();
            let p = new BigNumber(amt[1]);
            return p.shiftedBy(-6).toNumber();
    
        }catch(err){
            console.log("Price: "+err);
        }
    }

    // Swap to Matic using TOKEN-USDC-MATIC route if no path specified.
    swap = async (token_address, abi, path = []) => {
        
        if( path.length == 0)
            path = [token_address, this.config.USDC, this.config.WMATIC];

        let token = await new this.w3.eth.Contract( abi, token_address );
        let token_decimals = Number(await token.methods.decimals().call());
        var token_balance = await token.methods.balanceOf(this.safe.admin()).call();
        var parsed = new BigNumber(token_balance).shiftedBy(-1*token_decimals).toNumber().toFixed(token_decimals);
        var token_price = await this.getPrice(token_address, abi);
        var asusdc = parsed * token_price;

        if(this.DEBUG === true)
            console.log("Swapping " + parsed + " rt ( " + asusdc.toFixed(5) + " $)");

        try{

            var tollerant;

            try{

                await this.approve({token_address: token_address, abi: abi, spender: this.address });

                var [ , amountOut] = await this.router.methods.getAmountsOut(token_balance, path).call();
                
                if(this.DEBUG === true)
                    console.log("AmountOut: "+amountOut);

            }catch(err){
                
                if(this.DEBUG === true)
                    console.log("AmountsOut: "+err);

                return 0;
            }

            try {
                tollerant = new BigNumber(amountOut).multipliedBy(100-this.slippage).div(100);
                var gas = await this.router.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(token_balance, Math.floor(tollerant).toString(), path, this.safe.admin(), Date.now() + 300).estimateGas({from: this.safe.admin()});
                
                if(this.DEBUG === true)
                    console.log("Swap requires "+gas+" gas ("+ gas * this.config.GAS_BOOST * this.config.SWAP_SPEEDUP + ")");

            }catch(err){

                if(this.DEBUG === true)
                    console.log("Swap EstimateGas: "+err);

                return 0;
            }

            try{
                let receipt = await this.router.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(token_balance, Math.floor(tollerant).toString(), path, this.safe.admin(), Date.now() + 300).send({from: this.safe.admin(), gas: gas * this.config.GAS_BOOST * this.config.SWAP_SPEEDUP});
                
                if(this.DEBUG === true)
                    console.log("swapExactTokensForETH:  " + receipt.transactionHash);

                return tollerant;
            }catch(err){

                if(this.DEBUG === true)
                    console.log("swapExactTokensForETH: "+err);

                return 0;
            }

        }catch(err){

            if(this.DEBUG === true)
                    console.log(err);

            this.log("Swap: " + err);
            return 0;
        }
    }

    // if amount is not specified, it approve the maximum amount allowed.
    approve = async ({token_address, abi, spender = this.address, amount = '115792089237316195423570985008687907853269984665640564039457584007913129639935'}={}) => {

        try{

            var token = await new this.w3.eth.Contract( abi, token_address );
            var token_symbol = await token.methods.symbol().call();
            var allow = await this.allowance(token, spender);

            var parsed_allowance = new BigNumber(allow).toNumber();
            var parsed_amount = new BigNumber(amount).toNumber();

            if(parsed_allowance < parsed_amount){

                let gas = await token.methods.approve(spender, amount).estimateGas({from: this.safe.admin()});
                
                if (this.DEBUG == true)
                    console.log("Approve "+token_symbol+" requires "+gas+" gas (" + gas * this.config.GAS_BOOST * this.config.APPROVE_SPEEDUP + ")");
                
                let receipt = await token.methods.approve(spender, amount).send({from: this.safe.admin(), gas: gas * this.config.GAS_BOOST * this.config.APPROVE_SPEEDUP});
                
                if (this.DEBUG == true)
                    console.log("Approve "+token_symbol+": "+receipt.transactionHash);
                
                this.log("Approve "+token_symbol+": " + receipt.transactionHash);

            }else{
                if (this.DEBUG == true)
                    console.log("Approve "+token_symbol+" unnecessary: allowance="+allow);
            }

        }catch(err){
            if (this.DEBUG == true)
                console.log("Approve "+token_symbol+": "+err);
        }

    }

    allowance = async(token, spender = this.address) => {
        return await token.methods.allowance(this.safe.admin(), spender).call();
    }

    balanceOf = async(token) => {
        return await token.methods.balanceOf(this.safe.admin());
    }

}

module.exports = { Dex } ;