
declare const process: any;
declare const Buffer: any;
type Buffer = any;
declare module 'fs/promises' { export const promises:any; export const readFile:any; export const writeFile:any; export const mkdir:any; export const rm:any; export const stat:any; }
declare module 'fs' { export const promises:any; }
declare module 'path' { export const join:any; export const dirname:any; export const isAbsolute:any; }
declare module 'crypto' { export const createHash:any; export const randomUUID:any; export const createHmac:any; export const timingSafeEqual:any; }
