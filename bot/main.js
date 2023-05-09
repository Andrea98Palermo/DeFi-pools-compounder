require('dotenv').config({ path: '../.env' });

const fs = require('fs');
const { Compounder } = require('./class/Compounder.js');
const { Dex } = require('./class/Dex.js');
const { MasterChef } = require('./class/MasterChef.js');
const { SafeWeb3 } = require('./class/SafeWeb3.js');

const config = require('./config/config.js');


process.on('SIGINT', function() {
    console.log("Bye Bye!")
    process.exit();
});

log = (msg) => {
    let d = "[" + Date.now() + "]\t";
    fs.writeFile(config.LOG_FILENAME, "\n"+d+msg, { flag: 'a+' }, function (err) {
        if(err){ console.log(err); }
    });
}

/* Get Commands */
var myArgs = process.argv.slice(2);

/* New SafeWeb3 Instance */
var safe = new SafeWeb3({
    config: config,
    network: 'Fantom Opera',
    account_id: 'dev_3'
    //network: 'polygon'
});

/* New Dex Instance */
var dex = new Dex({
    config: config,
    safe: safe,
    fnLog: console.log
});

/* New MasterChef Instance */
var master = new MasterChef({
    config: config,
    safe: safe,
    dex: dex,
    pendingFName: config.pendingRewardsFName,
    fnLog: log
});

/* New Compounder Instance */
var comp = new Compounder({
    config: config,
    safe: safe,
    dex: dex,
    master: master,
    fnLog: log
});

/* Digest commands */
comp.digest(myArgs);