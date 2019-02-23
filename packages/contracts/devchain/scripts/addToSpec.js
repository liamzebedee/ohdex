const fs = require("fs").promises;
const toml = require("toml-js");

let spec = require("../chain-spec.json");

//add default contracts
spec.accounts = {
    "0x0000000000000000000000000000000000000001": { "balance": "1", "builtin": { "name": "ecrecover", "pricing": { "linear": { "base": 3000, "word": 0 } } } },
    "0x0000000000000000000000000000000000000002": { "balance": "1", "builtin": { "name": "sha256", "pricing": { "linear": { "base": 60, "word": 12 } } } },
    "0x0000000000000000000000000000000000000003": { "balance": "1", "builtin": { "name": "ripemd160", "pricing": { "linear": { "base": 600, "word": 120 } } } },
    "0x0000000000000000000000000000000000000004": { "balance": "1", "builtin": { "name": "identity", "pricing": { "linear": { "base": 15, "word": 3 } } } }
}

addAccounts();

async function addAccounts() {
    const files = await fs.readdir('./keys/DevChain');

    let config = await fs.readFile("./testnode.toml");

    config = toml.parse(config);

    config.account.unlock = [];

    for(let file in files){
        let keyContent = JSON.parse(await fs.readFile(`./keys/DevChain/${files[file]}`));
        spec.accounts[`0x${keyContent.address}`] = { "balance": "1000000000000000000000000000" };

        config.account.unlock.push(`0x${keyContent.address}`);
    }

    await fs.writeFile(require.resolve("../chain-spec.json"), JSON.stringify(spec, null, 4));
    await fs.writeFile("./testnode.toml", toml.dump(config));

}

