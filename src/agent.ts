import dns from 'dns';
import net from 'net';
import tls from 'tls';
import url from 'url';
import { promisify } from 'util';
import { SocksClient, SocksProxy, SocksClientOptions } from 'socks';
import {
	Agent,
	ClientRequest,
	HttpRequestOptions,
	HttpsRequestOptions,
	RequestOptions
} from 'agent-base';
import { SocksProxyAgentOptions } from '.';

const dnsLookup = promisify(dns.lookup);

/**
 * The `SocksProxyAgent`.
 *
 * @api public
 */

export default class SocksProxyAgent extends Agent {
	private lookup: boolean;
	private proxy: SocksProxy;

	constructor(_opts: string | SocksProxyAgentOptions) {
		let opts: SocksProxyAgentOptions;
		if ('string' == typeof _opts) {
			opts = url.parse(_opts);
		} else {
			opts = _opts;
		}
		if (!opts) {
			throw new Error(
				'a SOCKS proxy server `host` and `port` must be specified!'
			);
		}
		super(opts);

		const proxy: SocksProxyAgentOptions = { ...opts };

		// prefer `hostname` over `host`, because of `url.parse()`
		proxy.host = proxy.hostname || proxy.host;

		if (typeof proxy.port === 'string') {
			proxy.port = parseInt(proxy.port, 10);
		}

		// SOCKS doesn't *technically* have a default port, but this is
		// the same default that `curl(1)` uses
		if (!proxy.port && proxy.host) {
			proxy.port = 1080;
		}

		if (typeof proxy.port !== 'number') {
			throw new TypeError(
				`'port' expected to be a number, but got ${typeof proxy.port}`
			);
		}

		if (proxy.host && proxy.path) {
			// if both a `host` and `path` are specified then it's most likely the
			// result of a `url.parse()` call... we need to remove the `path` portion so
			// that `net.connect()` doesn't attempt to open that as a unix socket file.
			delete proxy.path;
			delete proxy.pathname;
		}

		// figure out if we want socks v4 or v5, based on the "protocol" used.
		// Defaults to 5.
		this.lookup = false;
		switch (proxy.protocol) {
			case 'socks4:':
				this.lookup = true;
			// pass through
			case 'socks4a:':
				proxy.type = 4;
				break;
			case 'socks5:':
				this.lookup = true;
			// pass through
			case 'socks:': // no version specified, default to 5h
			case 'socks5h:':
				proxy.type = 5;
				break;
			default:
				throw new TypeError(
					'A "socks" protocol must be specified! Got: ' +
						proxy.protocol
				);
		}

		if (proxy.auth) {
			const [userId, password] = proxy.auth.split(':');
			proxy.userId = userId;
			proxy.password = password;
		}

		// @ts-ignore
		this.proxy = proxy;
	}

	/**
	 * Initiates a SOCKS connection to the specified SOCKS proxy server,
	 * which in turn connects to the specified remote host and port.
	 *
	 * @api protected
	 */
	async callback(
		req: ClientRequest,
		opts: RequestOptions
	): Promise<net.Socket> {
		const { lookup, proxy } = this;
		let { host, port } = opts;

		if (!host) {
			throw new Error('No `host` defined!');
		}

		if (lookup) {
			// Client-side DNS resolution for "4" and "5" socks proxy versions.
			const addr = await dnsLookup(host);
			host = addr.address;
		}

		const { socket } = await SocksClient.createConnection({
			proxy,
			destination: { host, port },
			command: 'connect'
		});

		if (opts.secureEndpoint) {
			const servername = opts.servername || opts.host;
			if (!servername) {
				throw new Error('Could not determine "servername"');
			}
			// The proxy is connecting to an SSL server, so upgrade
			// this socket connection to an SSL connection.
			return tls.connect({
				...omit(opts, 'host', 'hostname', 'path', 'pathname', 'port'),
				socket,
				servername
			});
		}

		return socket;
	}
}

function omit<T extends object, K extends [...(keyof T)[]]>(
	obj: T,
	...keys: K
): {
	[K2 in Exclude<keyof T, K[number]>]: T[K2];
} {
	const ret = {} as {
		[K in keyof typeof obj]: (typeof obj)[K];
	};
	let key: keyof typeof obj;
	for (key in obj) {
		if (!keys.includes(key)) {
			ret[key] = obj[key];
		}
	}
	return ret;
}
