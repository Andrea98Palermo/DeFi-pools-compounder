const Web3 = require('web3');
const accounts = require('../config/accounts');
const options = {
        timeout: 30000, // ms
    
        clientConfig: {
            // Useful if requests are large
            maxReceivedFrameSize: 100000000,   // bytes - default: 1MiB
            maxReceivedMessageSize: 100000000, // bytes - default: 8MiB
    
            // Useful to keep a connection alive
            keepalive: true,
            keepaliveInterval: -1 // ms
        },
    
        // Enable auto reconnection
        reconnect: {
            auto: true,
            delay: 1000, // ms
            maxAttempts: 10,
            onTimeout: false
        }
    };

class SafeWeb3 {

    constructor({config, network, account_id}={}) {

        if(!accounts[account_id]){
            console.log(account_id + " account does not exists.");
            process.exit();
        }

        if(!config.networks[network]){
            console.log(network + " networks is not supported.");
            process.exit();
        }

        this.last_provider_id = 0;
        this.config = config;
        this.network = config.networks[network];

        try{

            this.wsprovider = new Web3.providers.WebsocketProvider(this.network.wss[this.last_provider_id], options);

            /*
            this.wsprovider.on('end', (e) => { 
                console.error('WS End', e);
                this.reload();
            });
            */

            this.web3 = new Web3(this.wsprovider);

            this.last_provider_id = ( this.last_provider_id == this.network.wss.length-1 ) ? 0 : this.last_provider_id + 1;
            this.web3.eth.handleRevert = true;
            this.admin_account = this.web3.eth.accounts.wallet.add(accounts[account_id].secret).address;

        }catch(err){

            console.log("Cannot Instanciate Web3: "+err);
            process.exit();

        }
    }

    reload = (persistent = true) => {

        try{

            this.wsprovider = new Web3.providers.WebsocketProvider(this.network.wss[this.last_provider_id]);
            /*
            this.wsprovider.on('end', (e) => { 
                console.error('WS End', e);
                this.reload();
            });*/

            this.web3 = new Web3(this.wsprovider);
            this.last_provider_id = ( this.last_provider_id == this.network.wss.length-1 ) ? 0 : this.last_provider_id + 1;
            this.web3.eth.handleRevert = true;
            
        }catch(err){

            if(!persistent){
                console.log("Cannot Instanciate Web3. Exit.");
                process.exit();
            }

            setTimeout(this.reload(), 2000);
        }

    }

    w3 = () => {
        return this.web3;
    }

    admin = () => {
        return this.admin_account;
    }

}

module.exports = { SafeWeb3 } ;