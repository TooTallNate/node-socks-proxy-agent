import dns from 'dns';
import net from 'net';
import tls from 'tls';
import url from 'url';
import createDebug from 'debug';
import { SocksClient, SocksProxy, SocksClientOptions } from 'socks';
import { Agent, ClientRequest, RequestOptions } from 'agent-base';
import { SocksProxyAgentOptions } from '.';

const debug = createDebug('socks-proxy-agent');

function dnsLookup(host: string): Promise<string> {
	return new Promise((resolve, reject) => {
		dns.lookup(host, (err, res) => {
			if (err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
}

function parseSocksProxy(
	opts: SocksProxyAgentOptions
): { lookup: boolean; proxy: SocksProxy } {
	let port = 0;
	let lookup = false;
	let type: SocksProxy['type'] | undefined;

	// Prefer `hostname` over `host`, because of `url.parse()`
	const host = opts.hostname || opts.host;
	if (!host) {
		throw new TypeError('No "host"');
	}

	if (typeof opts.port === 'number') {
		port = opts.port;
	} else if (typeof opts.port === 'string') {
		port = parseInt(opts.port, 10);
	}

	// From RFC 1928, Section 3: https://tools.ietf.org/html/rfc1928#section-3
	// "The SOCKS service is conventionally located on TCP port 1080"
	if (!port) {
		port = 1080;
	}

	// figure out if we want socks v4 or v5, based on the "protocol" used.
	// Defaults to 5.
	if (opts.protocol) {
		switch (opts.protocol) {
			case 'socks4:':
				lookup = true;
			// pass through
			case 'socks4a:':
				type = 4;
				break;
			case 'socks5:':
				lookup = true;
			// pass through
			case 'socks:': // no version specified, default to 5h
			case 'socks5h:':
				type = 5;
				break;
			default:
				throw new TypeError(
					`A "socks" protocol must be specified! Got: ${opts.protocol}`
				);
		}
	}

	if (typeof opts.type !== 'undefined') {
		if (opts.type === 4 || opts.type === 5) {
			type = opts.type;
		} else {
			throw new TypeError(`"type" must be 4 or 5, got: ${opts.type}`);
		}
	}

	if (typeof type === 'undefined') {
		throw new TypeError('Could not determine "type", must be 4 or 5');
	}

	const proxy: SocksProxy = {
		host,
		port,
		type
	};

	if (opts.auth) {
		const auth = opts.auth.split(':');
		proxy.userId = auth[0];
		proxy.password = auth[1];
	}

	return { lookup, proxy };
}

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
		if (typeof _opts === 'string') {
			opts = url.parse(_opts);
		} else {
			opts = _opts;
		}
		if (!opts) {
			throw new TypeError(
				'a SOCKS proxy server `host` and `port` must be specified!'
			);
		}
		super(opts);

		const parsedProxy = parseSocksProxy(opts);
		this.lookup = parsedProxy.lookup;
		this.proxy = parsedProxy.proxy;
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
			host = await dnsLookup(host);
		}

		const socksOpts: SocksClientOptions = {
			proxy,
			destination: { host, port },
			command: 'connect'
		};
		debug('Creating Socks proxy connection: %o', socksOpts);
		const { socket } = await SocksClient.createConnection(socksOpts);

		if (opts.secureEndpoint) {
			const servername = opts.servername || opts.host;
			if (!servername) {
				throw new Error('Could not determine "servername"');
			}
			// The proxy is connecting to a TLS server, so upgrade
			// this socket connection to a TLS connection.
			debug('Upgrading socket connection to TLS');
			return tls.connect({
				...omit(opts, 'host', 'hostname', 'path', 'port'),
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
