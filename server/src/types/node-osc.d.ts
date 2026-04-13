// Minimal type declarations for node-osc (no @types package published).
// Covers only the APIs we use.
declare module "node-osc" {
  export class Client {
    constructor(host: string, port: number);
    send(
      address: string,
      ...argsAndCallback: Array<string | number | boolean | ((err: Error | null) => void)>
    ): void;
    close(callback?: () => void): void;
  }
  export class Server {
    constructor(port: number, host: string, callback?: () => void);
    on(event: "message", listener: (msg: [string, ...(string | number | boolean)[]], rinfo?: unknown) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    close(): void;
  }
}
