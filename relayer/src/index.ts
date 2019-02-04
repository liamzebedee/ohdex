import { Relayer } from "./relayer";

// async function main() {
    
    
//     // return null;
// }

// main();

let relayer = new Relayer()

relayer.start()

process.on('SIGTERM', async () => {
    await relayer.stop();
    process.exit(0);
});