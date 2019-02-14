import { Relayer } from "./relayer";

let relayer = new Relayer(require("../../config/networks.json"))
relayer.start()

process.on('SIGTERM', async () => {
    await relayer.stop();
    process.exit(0);
});