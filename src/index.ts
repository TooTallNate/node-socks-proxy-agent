import { Url } from 'url';
import { SocksProxy } from 'socks';
import { ConnectionOptions } from 'tls';
import { AgentOptions } from 'agent-base';
import _SocksProxyAgent from './agent';

function createSocksProxyAgent(
	opts: string | createSocksProxyAgent.SocksProxyAgentOptions
): _SocksProxyAgent {
	return new _SocksProxyAgent(opts);
}

namespace createSocksProxyAgent {
	type TlsOptions = Pick<ConnectionOptions, "rejectUnauthorized">;

	interface BaseSocksProxyAgentOptions {
		host?: string | null;
		port?: string | number | null;
		username?: string | null;
		tls?: TlsOptions | null;
	}

	export interface SocksProxyAgentOptions
		extends AgentOptions,
			BaseSocksProxyAgentOptions,
			Partial<Omit<Url & SocksProxy, keyof BaseSocksProxyAgentOptions>> {}

	export type SocksProxyAgent = _SocksProxyAgent;
	export const SocksProxyAgent = _SocksProxyAgent;

	createSocksProxyAgent.prototype = _SocksProxyAgent.prototype;
}

export = createSocksProxyAgent;
