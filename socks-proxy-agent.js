
/**
 * Module dependencies.
 */

var tls; // lazy-loaded...
var url = require('url');
var Agent = require('agent-base');
var RainbowSocks = require('rainbowsocks');
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
  if (!(this instanceof SocksProxyAgent)) return new SocksProxyAgent(opts);
  if ('string' == typeof opts) opts = url.parse(opts);
  if (!opts) throw new Error('a SOCKS proxy server `host` and `port` must be specified!');
  var proxy = clone(opts, {});
  Agent.call(this);

  // if `true` is passed for `secure` the the socket will be upgraded
  // to a TLS socket before the HTTP request is written to it
  this.secure = !!secure;

  // prefer `hostname` over `host`, and set the `port` if needed
  proxy.host = proxy.hostname || proxy.host;
  proxy.port = +proxy.port || this.defaultPort;

  if (proxy.host && proxy.path) {
    // if both a `host` and `path` are specified then it's most likely the
    // result of a `url.parse()` call... we need to remove the `path` portion so
    // that `net.connect()` doesn't attempt to open that as a unix socket file.
    delete proxy.path;
  }

  this.proxy = proxy;
}
inherits(SocksProxyAgent, Agent);

/**
 * Default port to connect to.
 */

Agent.prototype.defaultPort = 1080;

/**
 * Initiates a SOCKS connection to the specified SOCKS proxy server, which in turn
 * connects to the specified remote host and port.
 *
 * @api protected
 */

SocksProxyAgent.prototype.createConnection = function (opts, fn) {
  var secure = this.secure;
  var proxy = new RainbowSocks(this.proxy.port, this.proxy.host);
  proxy.once('connect', function (err) {
    if (err) return fn(err);
    proxy.connect(opts.host, opts.port, function (err, socket) {
      if (err) return fn(err);
      var s = socket;
      if (secure) {
        // upgrade to TLS first!
        if (!tls) tls = require('tls');
        s = tls.connect({
          servername: opts.host,
          socket: socket
        });
      }
      fn(null, s);
    });
  });
};

function clone (src, dest) {
  for (var i in src) dest[i] = src[i];
  return dest;
}
