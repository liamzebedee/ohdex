import { writeFileSync } from 'fs';

const env = process.env.NODE_ENV || 'production';
console.log(`env: ${env}`)
class ConfigManager {
    configPath: string;
    config: any;

    constructor(configPath: string) {
        this.configPath = configPath;
        this.config = require(configPath)
    }

    static load() {
        let relpath: string = "";
        switch(env) {
            case 'test':
            case 'development':
                relpath = "../../config/test_networks.json"
                break;
            case 'production':
                relpath = "../../config/networks.json";
                break;
        }
        
        return new ConfigManager(require.resolve(relpath))
    }

    save() {
        console.log("Writing deployed contracts to config");
        writeFileSync(this.configPath, JSON.stringify(this.config, null, 4));
    }
}

export {
    ConfigManager
}