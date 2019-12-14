import { Url } from 'url';
import { SocksProxy } from 'socks';
import { AgentOptions } from 'agent-base';
import _SocksProxyAgent from './agent';

function createSocksProxyAgent(
	opts: string | createSocksProxyAgent.SocksProxyAgentOptions
): _SocksProxyAgent {
	return new _SocksProxyAgent(opts);
}

namespace createSocksProxyAgent {
	export interface SocksProxyAgentOptions
		extends AgentOptions,
			Partial<Omit<Url & SocksProxy, 'host' | 'port'>> {
		host?: string | null;
		port?: string | number | null;
	}

	export const SocksProxyAgent = _SocksProxyAgent;

	createSocksProxyAgent.prototype = _SocksProxyAgent.prototype;
}

export = createSocksProxyAgent;
