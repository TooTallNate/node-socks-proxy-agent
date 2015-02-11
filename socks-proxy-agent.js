
/**
 * Module dependencies.
 */

var url = require('url');
var extend = require('extend');
var SocksClient = require('socks-client');
var inherits = require('util').inherits;

/**
 * Module exports.
 */

module.exports = SocksProxyAgent;

/**
 * The `SocksProxyAgent`.
 *
 * @api public
 */

function SocksProxyAgent (opts, secure) {
  if (!(this instanceof SocksProxyAgent)) return new SocksProxyAgent(opts, secure);
  if ('string' == typeof opts) opts = url.parse(opts);
  if (!opts) throw new Error('a SOCKS proxy server `host` and `port` must be specified!');

  var socksType = 5;
  if (opts.protocol[opts.protocol.length - 2] === '4') {
    socksType = 4;
  }

  var proxy = {
    // prefer `hostname` over `host`, because of `url.parse()`
    ipaddress: opts.ipaddress || opts.hostname || opts.host,

    // SOCKS doesn't *technically* have a default port, but this is
    // the same default that `curl(1)` uses
    port: opts.port || 1080,

    type: socksType,

    command: 'connect'
  }

  // Authentication used for SOCKS 5
  if(opts.auth && socksType === 5) {
    opts.auth = opts.auth.split(':');
    proxy.authentication = {
      username: opts.auth[0],
      password: opts.auth[1] || ''
    };
  }

  SocksClient.Agent.call(this, {proxy: proxy}, secure, false);
}
inherits(SocksProxyAgent, SocksClient.Agent);
