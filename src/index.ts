import { SocksClient, SocksProxy, SocksClientOptions } from 'socks'
import { Agent, ClientRequest, RequestOptions } from 'agent-base'
import { AgentOptions } from 'agent-base';
import createDebug from 'debug'
import { Url } from 'url'
import dns from 'dns'
import net from 'net'
import tls from 'tls'

interface BaseSocksProxyAgentOptions {
  host?: string | null;
  port?: string | number | null;
  username?: string | null;
  tls?: tls.ConnectionOptions | null;
}

interface SocksProxyAgentOptionsExtra {
  timeout?: number
}

const debug = createDebug('socks-proxy-agent')

function parseSocksProxy (opts: SocksProxyAgentOptions): { lookup: boolean, proxy: SocksProxy } {
  let port = 0
  let lookup = false
  let type: SocksProxy['type'] = 5

  const host = opts.hostname ?? opts.host

  if (host == null) {
    throw new TypeError('You didn\'t specify "hostname" or "host" in options!')
  }

  if (typeof opts.port === 'number') {
    port = opts.port
  } else if (typeof opts.port === 'string') {
    port = parseInt(opts.port, 10)
  }

  // From RFC 1928, Section 3: https://tools.ietf.org/html/rfc1928#section-3
  // "The SOCKS service is conventionally located on TCP port 1080"
  if (port == null) {
    port = 1080
  }

  // figure out if we want socks v4 or v5, based on the "protocol" used.
  // Defaults to 5.
  if (opts.protocol != null) {
    switch (opts.protocol.replace(':', '')) {
      case 'socks4':
        lookup = true
      // pass through
      case 'socks4a':
        type = 4
        break
      case 'socks5':
        lookup = true
      // pass through
      case 'socks': // no version specified, default to 5h
      case 'socks5h':
        type = 5
        break
      default:
        throw new TypeError(`A "socks" protocol must be specified! Got: ${String(opts.protocol)}`)
    }
  }

  if (typeof opts.type !== 'undefined') {
    if (opts.type === 4 || opts.type === 5) {
      type = opts.type
    } else {
      throw new TypeError(`"type" must be 4 or 5, got: ${String(opts.type)}`)
    }
  }

  const proxy: SocksProxy = {
    host,
    port,
    type
  }

  let userId = opts.userId ?? opts.username
  let password = opts.password
  if (opts.auth != null) {
    const auth = opts.auth.split(':')
    userId = auth[0]
    password = auth[1]
  }
  if (userId != null) {
    Object.defineProperty(proxy, 'userId', {
      value: userId,
      enumerable: false
    })
  }
  if (password != null) {
    Object.defineProperty(proxy, 'password', {
      value: password,
      enumerable: false
    })
  }

  return { lookup, proxy }
}

const normalizeProxyOptions = (input: string | SocksProxyAgentOptions): SocksProxyAgentOptions => {
  let proxyOptions: SocksProxyAgentOptions
  if (typeof input === 'string') {
    proxyOptions = new URL(input)
  } else {
    proxyOptions = input
  }
  if (proxyOptions == null) {
    throw new TypeError('a SOCKS proxy server `host` and `port` must be specified!')
  }

  return proxyOptions
}

export interface SocksProxyAgentOptions extends AgentOptions, BaseSocksProxyAgentOptions, Partial<Omit<Url & SocksProxy, keyof BaseSocksProxyAgentOptions>> {}

export class SocksProxyAgent extends Agent {
  private readonly shouldLookup: boolean
  private readonly proxy: SocksProxy
  private readonly tlsConnectionOptions: tls.ConnectionOptions
  public timeout: number | null

  constructor (input: string | SocksProxyAgentOptions, options?: SocksProxyAgentOptionsExtra) {
    const proxyOptions = normalizeProxyOptions(input)
    super(proxyOptions)

    const parsedProxy = parseSocksProxy(proxyOptions)

    this.shouldLookup = parsedProxy.lookup
    this.proxy = parsedProxy.proxy
    this.tlsConnectionOptions = proxyOptions.tls != null ? proxyOptions.tls : {}
    this.timeout = options?.timeout ?? null
  }

  /**
   * Initiates a SOCKS connection to the specified SOCKS proxy server,
   * which in turn connects to the specified remote host and port.
   *
   * @api protected
   */
  async callback (req: ClientRequest, opts: RequestOptions): Promise<net.Socket> {
    const { shouldLookup, proxy, timeout } = this

    let { host, port, lookup: lookupCallback } = opts

    if (host == null) {
      throw new Error('No `host` defined!')
    }

    if (shouldLookup) {
      // Client-side DNS resolution for "4" and "5" socks proxy versions.
      host = await new Promise<string>((resolve, reject) => {
        // Use the request's custom lookup, if one was configured:
        const lookupFn = lookupCallback ?? dns.lookup
        lookupFn(host!, {}, (err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        })
      })
    }

    const socksOpts: SocksClientOptions = {
      proxy,
      destination: { host, port },
      command: 'connect',
      timeout: timeout ?? undefined
    }

    const cleanup = (tlsSocket?: tls.TLSSocket) => {
      req.destroy()
      socket.destroy()
      if (tlsSocket) tlsSocket.destroy()
    }

    debug('Creating socks proxy connection: %o', socksOpts)
    const { socket } = await SocksClient.createConnection(socksOpts)
    debug('Successfully created socks proxy connection')

    if (timeout !== null) {
      socket.setTimeout(timeout)
      socket.on('timeout', () => cleanup())
    }

    if (opts.secureEndpoint) {
      // The proxy is connecting to a TLS server, so upgrade
      // this socket connection to a TLS connection.
      debug('Upgrading socket connection to TLS')
      const servername = opts.servername ?? opts.host

      const tlsSocket = tls.connect({
        ...omit(opts, 'host', 'hostname', 'path', 'port'),
        socket,
        servername,
        ...this.tlsConnectionOptions
      })

      tlsSocket.once('error', (error) => {
        debug('socket TLS error', error.message)
        cleanup(tlsSocket)
      })

      return tlsSocket
    }

    return socket
  }
}

function omit<T extends object, K extends [...Array<keyof T>]> (
  obj: T,
  ...keys: K
): {
    [K2 in Exclude<keyof T, K[number]>]: T[K2]
  } {
  const ret = {} as { [K in keyof typeof obj]: typeof obj[K] }
  let key: keyof typeof obj
  for (key in obj) {
    if (!keys.includes(key)) {
      ret[key] = obj[key]
    }
  }
  return ret
}
