
1.0.1 / 2015-03-01
==================

  * switched from using "socks-client" to "socks" (#5, @JoshGlazebrook)

1.0.0 / 2015-02-11
==================

  * add client-side DNS lookup logic for 4 and 5 version socks proxies
  * remove dead `onproxyconnect()` code function
  * use a switch statement to decide the socks `version`
  * refactor to use "socks-client" instead of "rainbowsocks"
  * package: remove "rainbowsocks" dependency
  * package: allow any "mocha" v2

0.1.2 / 2014-06-11
==================

  * package: update "rainbowsocks" to v0.1.2
  * travis: don't test node v0.9

0.1.1 / 2014-04-09
==================

  * package: update outdated dependencies
  * socks-proxy-agent: pass `secure` flag when no `new`
  * socks-proxy-agent: small code cleanup

0.1.0 / 2013-11-19
==================

  * add .travis.yml file
  * socks-proxy-agent: properly mix in the proxy options
  * socks-proxy-agent: coerce the `secureEndpoint` into a Boolean
  * socks-proxy-agent: use "extend" module
  * socks-proxy-agent: update to "agent-base" v1 API

0.0.2 / 2013-07-24
==================

  * socks-proxy-agent: properly set the `defaultPort` property

0.0.1 / 2013-07-11
==================

  * Initial release
