import { BigNumber } from "0x.js";

function hexify(buf: Buffer): string {
    return `0x${buf.toString('hex')}`;
}

function dehexify(str: string): Buffer {
    // begins with 0x
    if(str[1] == 'x') str = str.slice(2);
    return Buffer.from(str, 'hex')
}

function shortToLongBridgeId(addr: string): string {
    // return `0x000000000000000000000000`+addr.split('0x')[1]
    return addr.toLowerCase()
}

const toBN = (str) => new BigNumber(str);
// import { keccak256 } from 'web3-utils';
const keccak256 = (x: any) => dehexify(require('web3-utils').keccak256(x));

export {
    hexify,
    dehexify,
    shortToLongBridgeId,
    toBN,
    keccak256
}