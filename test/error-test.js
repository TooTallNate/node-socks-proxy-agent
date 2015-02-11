
/**
 * Module dependencies.
 */

var net = require('net');
var url = require('url');
var http = require('http');
var https = require('https');
var assert = require('assert');
var SocksProxyAgent = require('../');

describe('SocksProxyAgent', function () {

    // adjusting the "slow" and "timeout" values because I run the
    // tests against the Tor SOCKS proxy
    this.slow(5000);
    this.timeout(10000);

    var proxy = process.env.SOCKS_PROXY || process.env.socks_proxy || 'socks://127.0.0.1:9050';

    it('should emit error when connection refused', function (done) {
        var agent = new SocksProxyAgent(proxy);
        var link = 'http://jsonip.com/';
        var opts = url.parse(link);
        opts.agent = agent;
        opts.method = "GET"
        var req = http.request(opts,function(res){
            done(new Error("shouldn't return response."))
        })
        req.on("error",function(err){
            done()
        })
    });

});
