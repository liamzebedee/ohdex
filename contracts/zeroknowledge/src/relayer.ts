
const snarkjs = require("snarkjs");
const compiler = require("circom");
const smt = require("./circomlib/src/smt");

const bigInt = snarkjs.bigInt;
const path = require('path');
import fs from 'fs';

const winston = require('winston')
const { createLogger, format, transports } = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.splat(),
        format.simple()
    ),
    defaultMeta: {service: 'user-service'},
    transports: [new transports.Console()],
  });
  


function padLeft(string: string, toLength: number, sign="0") {
    if(string.length > toLength) {
        throw new Error(`String is larger than length we are padding it to: ${string.length} > ${toLength}\nString: ${string}`)
    }
    return string.padStart(toLength, sign)
    // console.log(chars, string.length, string)
    // return new Array(toLength - string.length + 1).join(sign) + string;
};

function toFixedBuf(lengthInBytes: number, hexStr: string) {
    return Buffer.from(
        padLeft(hexStr, lengthInBytes/4), 'hex'
    );
}


function assert(stmt) {
    if(!stmt) throw new Error("ASSERTION_FAIL"); 
}

function buffer2bits(buff) {
    const res = [];
    for (let i=0; i<buff.length; i++) {
        for (let j=0; j<8; j++) {
            if ((buff[i]>>j)&1) {
                res.push(bigInt.one);
            } else {
                res.push(bigInt.zero);
            }
        }
    }
    return res;
}



const newRelayer = async () => {
    let circuit = new snarkjs.Circuit(
        require("../eddsa_test.json")
    );
    const proving_key = JSON.parse(fs.readFileSync("../proving_key.json", "utf8"));

    // let tree = await smt.newMemEmptyTrie();
    return new Relayer(null, circuit, proving_key)
}


const eddsa = require("./circomlib/src/eddsa.js");

class Relayer {
    tree = null
    txQueue: Buffer[]
    i = 0
    circuit = null
    proving_key = null

    constructor(tree, circuit, proving_key) {
        this.tree = tree;
        this.circuit = circuit
        this.proving_key = proving_key
    }

    async addTx(tx) {
        let int = snarkjs.leBuff2int(tx)
        await this.tree.insert(int, this.i);
        this.i++;
    }

    async generateProof() {
        // const msgBits = buffer2bits(msg);
        // const r8Bits = buffer2bits(pSignature.slice(0, 32));
        // const sBits = buffer2bits(pSignature.slice(32, 64));
        // const aBits = buffer2bits(pPubKey);
        logger.log('info', `${this.txQueue.length} tx's to process`)
        let txsBuf = this.txQueue.map(buffer2bits);
        
        logger.log('info', `calculating witness`)
        console.time('calc-witness');
        const witness = this.circuit.calculateWitness({
            txs: buffer2bits(txsBuf)
        });
        console.timeEnd('calc-witness');

        logger.log('info', `checking witness`)
        console.time('check-witness');
        assert(this.circuit.checkWitness(witness));
        console.timeEnd('check-witness');




        const { stringifyBigInts, unstringifyBigInts } = require('snarkjs/src/stringifybigint.js')
        const proving_key = unstringifyBigInts(JSON.parse(fs.readFileSync(__dirname+"/../proving_key.json", "utf8")))

        console.time('generating-proof')
        const { proof, publicSignals } = snarkjs.original.genProof(
            proving_key, 
            witness
        );
        console.timeEnd('generating-proof')
        fs.writeFileSync("proof.json", JSON.stringify(stringifyBigInts(proof), null, 1), "utf-8");
        fs.writeFileSync("public.json", JSON.stringify(stringifyBigInts(publicSignals), null, 1), "utf-8");

    }

    async generateProof2() {
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




async function run() {
    let relayer = await newRelayer()
    relayer.generateProof()

    return Promise.resolve()
}

run()
//.then(res => console.log(res)).catch(ex => console.error(ex))
