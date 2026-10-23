export function detectMime(bytes:Uint8Array):string{
 if(bytes.length>=8 && Buffer.from(bytes.slice(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
 if(bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return 'image/jpeg';
 if(bytes.length>=5 && Buffer.from(bytes.slice(0,5)).toString()==='%PDF-') return 'application/pdf';
 return 'application/octet-stream';
}
