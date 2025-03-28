// deno.d.ts
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }
  
  export const env: Env;
  
  export interface ConnInfo {
    readonly localAddr: Deno.Addr;
    readonly remoteAddr: Deno.Addr;
  }
  
  export interface Addr {
    transport: "tcp" | "udp";
    hostname: string;
    port: number;
  }
}
