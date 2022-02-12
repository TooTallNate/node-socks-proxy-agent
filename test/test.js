/* global describe, before, after, it */

const socks = require('socksv5')
const assert = require('assert')
const https = require('https')
const http = require('http')
const path = require('path')
const fs = require('fs')

const getRawBody = require('raw-body')
const SocksProxyAgent = require('../')

describe('SocksProxyAgent', function () {
  let httpServer
  let httpPort
  let httpsServer
  let httpsPort
  let socksServer
  let socksPort

  before(function (done) {
    // setup SOCKS proxy server
    socksServer = socks.createServer(function (info, accept, deny) {
      accept()
    })
    socksServer.listen(0, '127.0.0.1', function () {
      socksPort = socksServer.address().port
      done()
    })
    socksServer.useAuth(socks.auth.None())
  })

  before(function (done) {
    // setup target HTTP server
    httpServer = http.createServer()
    httpServer.listen(function () {
      httpPort = httpServer.address().port
      done()
    })
  })

  before(function (done) {
    // setup target SSL HTTPS server
    const options = {
      key: fs.readFileSync(path.resolve(__dirname, 'ssl-cert-snakeoil.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'ssl-cert-snakeoil.pem'))
    }
    httpsServer = https.createServer(options)
    httpsServer.listen(function () {
      httpsPort = httpsServer.address().port
      done()
    })
  })

  after(function (done) {
    socksServer.once('close', function () {
      done()
    })
    socksServer.close()
  })

  after(function (done) {
    httpServer.once('close', function () {
      done()
    })
    httpServer.close()
  })

  after(function (done) {
    httpsServer.once('close', function () {
      done()
    })
    httpsServer.close()
  })

  describe('constructor', function () {
    it('should throw an Error if no "proxy" argument is given', function () {
      assert.throws(() => new SocksProxyAgent())
    })
    it('should accept a "string" proxy argument', function () {
      const agent = new SocksProxyAgent(`socks://127.0.0.1:${socksPort}`)
      assert.equal('127.0.0.1', agent.proxy.host)
      assert.equal(socksPort, agent.proxy.port)
    })
    it('should accept a `new URL()` result object argument', function () {
      const opts = new URL(`socks://127.0.0.1:${socksPort}`)
      const agent = new SocksProxyAgent(opts)
      assert.equal('127.0.0.1', agent.proxy.host)
      assert.equal(socksPort, agent.proxy.port)
    })
  })

  describe('"http" module', function () {
    it('should work against an HTTP endpoint', function (done) {
      httpServer.once('request', function (req, res) {
        assert.equal('/foo', req.url)
        res.statusCode = 404
        res.end(JSON.stringify(req.headers))
      })

      const agent = new SocksProxyAgent(`socks://127.0.0.1:${socksPort}`)

      const opts = {
        protocol: 'http:',
        host: `127.0.0.1:${httpPort}`,
        port: httpPort,
        hostname: '127.0.0.1',
        path: '/foo',
        agent,
        headers: { foo: 'bar' }
      }
      const req = http.get(opts, function (res) {
        assert.equal(404, res.statusCode)
        getRawBody(res, 'utf8', function (err, buf) {
          if (err) return done(err)
          const data = JSON.parse(buf)
          assert.equal('bar', data.foo)
          done()
        })
      })
      req.once('error', done)
    })
  })

  describe('"https" module', function () {
    it('should work against an HTTPS endpoint', function (done) {
      httpsServer.once('request', function (req, res) {
        assert.equal('/foo', req.url)
        res.statusCode = 404
        res.end(JSON.stringify(req.headers))
      })

      const agent = new SocksProxyAgent(`socks://127.0.0.1:${socksPort}`)

      const opts = {
        protocol: 'https:',
        host: `127.0.0.1:${httpsPort}`,
        port: httpsPort,
        hostname: '127.0.0.1',
        path: '/foo',
        agent,
        rejectUnauthorized: false,
        headers: { foo: 'bar' }
      }

      const req = https.get(opts, function (res) {
        assert.equal(404, res.statusCode)
        getRawBody(res, 'utf8', function (err, buf) {
          if (err) return done(err)
          const data = JSON.parse(buf)
          assert.equal('bar', data.foo)
          done()
        })
      })
      req.once('error', done)
    })
  })
})
