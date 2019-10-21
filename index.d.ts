declare module "socks-proxy-agent" {
  import * as https from "https";
  namespace SocksProxyAgent {
    interface SocksProxyAgentOptions {
      host: string;
      port: number | string;
      protocol: string;
      auth?: string;
      [key: string]: any;
    }
  }

  // SocksProxyAgent doesnt *actually* extend https.Agent.
  // This code is copied from https-proxy-agent.
  // Please refer: https://github.com/TooTallNate/node-https-proxy-agent/blob/200cc9f18ff25e6cb8e5f1d61db5fea159a103dd/index.d.ts#L16-L19
  class SocksProxyAgent extends https.Agent {
    constructor(opts: SocksProxyAgent.SocksProxyAgentOptions | string);
  }

  export = SocksProxyAgent;
}
