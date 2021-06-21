import https from 'https';
import fetch from 'node-fetch';
import create, { SocksProxyAgent, SocksProxyAgentOptions } from './src';

const API = 'https://nordvpn.com/api/server'

interface Proxy {
	name: string;
	domain: string;
	ip_address: string;
	features: {
		socks: boolean;
	};
}

async function main() {
	const res = await fetch(API);
	const data: Proxy[] = await res.json();

	for (const proxy of data) {
		await test(proxy);
	}
}

async function test(proxy: Proxy) {
	if (!proxy.features.socks) {
		//console.log('`socks` is not supported');
		return;
	}

	console.log('Testing %j - %s (%s)', proxy.name, proxy.domain, proxy.ip_address);
	//console.log(proxy);
	const info: SocksProxyAgentOptions = {
		host: proxy.domain,
		username: 'nrajlich@gmail.com',
		password: 'Zez]7KW8ZTEy3NaD;8&K'
	};

	const agent = new SocksProxyAgent(info);

	try {
		const { ip } = await new Promise((resolve, reject) => {
			https
				.get(
					'https://jsonip.org',
					{
						agent
					},
					res => {
						//console.log(res.headers);
						let data = ''
						res.setEncoding('utf8');
						res.on('data', d => { data += d });
						res.on('end', () => {
							resolve(JSON.parse(data));
						});
					}
				)
				.once('error', reject);
		});
		console.log('✅ %j works! IP: %s', proxy.domain, ip);
	} catch (err) {
		console.log('🛑 %j does not work :( - %s', proxy.domain, err.toString().split('\n')[0]);
	}

	console.log();
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
