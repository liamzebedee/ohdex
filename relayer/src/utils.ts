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
    return addr
}

export {
    hexify,
    dehexify,
    shortToLongBridgeId
}