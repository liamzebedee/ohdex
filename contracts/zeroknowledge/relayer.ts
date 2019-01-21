
const snarkjs = require("snarkjs");
const compiler = require("circom");
const smt = require("./circomlib/src/smt");

const bigInt = snarkjs.bigInt;


const newRelayer = async () => {
    let tree = await smt.newMemEmptyTrie();
    return new Relayer(tree)
}

class Relayer {
    tree = null
    i = 0

    constructor(tree) {
        this.tree = tree;
    }

    async addTx(tx) {
        let int = snarkjs.leBuff2int(tx)
        await this.tree.insert(int, this.i);
        this.i++;
    }

    async generateProof() {
        // let siblings = res.siblings;

        const arr = [];
        const N = 100;
        for (let i=0; i<N; i++) {
            arr.push(bigInt(i));
        }
        for (let i=0; i<N; i++) {
            await this.tree.insert(arr[i], i);
        }
        console.log(this.tree.newRoot)
    
        // const w = circuit.calculateWitness({
        //     fnc: [1,0],
        //     oldRoot: res.oldRoot,
        //     siblings: siblings,
        //     oldKey: res.isOld0 ? 0 : res.oldKey,
        //     oldValue: res.isOld0 ? 0 : res.oldValue,
        //     isOld0: res.isOld0 ? 1 : 0,
        //     newKey: key,
        //     newValue: value
        // }, log);
    
        // const root1 = w[circuit.getSignalIdx("main.newRoot")];
        // assert(circuit.checkWitness(w));
        // assert(root1.equals(res.newRoot));
    }
}


/**
 * 
 * let tree = await smt.newMemEmptyTrie();
    const arr = [];
    const N = 100;
    for (let i=0; i<N; i++) {
        arr.push(bigInt(i));
    }
    // const insArr = perm(arr);
    for (let i=0; i<N; i++) {
        await tree.insert(arr[i], i);
    }
 */


async function run() {
    let relayer = await newRelayer()
    relayer.generateProof()

    return Promise.resolve()
}

run()
//.then(res => console.log(res)).catch(ex => console.error(ex))
