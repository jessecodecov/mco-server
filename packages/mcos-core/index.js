// mcos is a game server, written from scratch, for an old game
// Copyright (C) <2017>  <Drazi Crendraven>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { createServer } from 'node:net'
import { httpListener } from './httpListener.js'
import http from 'node:http'
import { ListenerThread } from './listener-thread.js'
import { EventEmitter } from 'node:events'
import { logger } from 'mcos-shared/logger'
export { TCPConnection } from './tcpConnection.js'
export { EncryptionManager } from './encryption-mgr.js'
export { NPSPacketManager } from './nps-packet-manager.js'

/**
 * Is this an MCOT bound packet?
 *
 * @export
 * @param {Buffer} inputBuffer
 * @return {boolean}
 */
export function isMCOT (inputBuffer) {
  return inputBuffer.toString('utf8', 2, 6) === 'TOMC'
}

/**
 *
 *
 * @export
 * @typedef ICoreConfig
 * @property {string} externalHost
 * @property {number[]} [ports=[]]
 */

/**
 * Primary server class
 *
 * @export
 * @class MCOServer
 */
export class MCOServer extends EventEmitter {
  /**
   *
   * @private
   * @type {ICoreConfig}
   * @memberof MCOServer
   */
  _config
  /**
   *
   * @private
   * @type {import("mcos-shared/logger").logger}
   * @memberof MCOServer
   */
  _log
  /**
   *
   * @private
   * @type {boolean}
   * @memberof MCOServer
   */

  _running = false
  /**
   *
   * @private
   * @type {import("node:net").Server[]}
   * @memberof MCOServer
   */

  _listeningServers = []

  /**
   * Handle incomming socket connections
   *
   * @private
   * @param {import("node:net").Socket} incomingSocket
   * @param {import("pino").Logger} log
   * @return {void}
   * @memberof MCOServer
   */
  _listener (incomingSocket, log) {
    log.debug(
      `Connection from ${incomingSocket.remoteAddress} on port ${incomingSocket.localPort}`
    )

    // Is this an http request?
    if (incomingSocket.localPort === 80) {
      log.debug('Web request')
      const newServer = new http.Server(httpListener)
      // Send the socket to the http server instance
      newServer.emit('connection', incomingSocket)
      return
    }

    // This is a 'normal' TCP socket
    ListenerThread.getInstance().tcpListener(
      incomingSocket
    )
  }

  /**
   * Is the server in a running state?
   *
   * @readonly
   * @type {boolean}
   * @return {boolean}
   * @memberof MCOServer
   */
  get isRunning () {
    return this._running
  }

  /**
   * Get the number of listening servers
   *
   * @readonly
   * @return {number}
   * @memberof MCOServer
   */
  get serverCount () {
    return this._listeningServers.length
  }

  /**
   * Creates an instance of MCOServer.
   *
   * Please use {@link MCOServer.init()} instead
   * @internal
   * @param {ICoreConfig} config
   * @memberof MCOServer
   */
  constructor (config) {
    super()
    this._config = config

    this._log = logger.child({ service: 'mcos:core' })
  }

  /**
   * Get an instance of the primary server
   *
   * @static
   * @param {ICoreConfig} config
   * @return {MCOServer}
   * @memberof MCOServer
   */
  static init (config) {
    return new MCOServer(config)
  }

  /**
   * Start port listeners and ,move server to running state
   *
   * @return {void}
   * @memberof MCOServer
   */
  run () {
    this._log.info('Server starting')

    if (typeof this._config.ports === 'undefined') {
      throw new Error('No listening ports were passed')
    }

    for (let index = 0; index < this._config.ports.length; index++) {
      const port = this._config.ports[index]
      const newServer = createServer((s) => {
        this._listener(s, this._log)
      })
      newServer.on('error', (err) => {
        throw err
      })
      newServer.listen(port, '0.0.0.0', 0, () => {
        this._log.debug(`Listening on port ${port}`)
        this._listeningServers.push(newServer)
      })
    }

    this._running = true
    this.emit('started', this)
  }

  /**
   * Close all listening ports and move server to stopped state
   *
   * @return {void}
   * @memberof MCOServer
   */
  stop () {
    this._running = false
    this._log.debug(`There are ${this.serverCount} servers listening`)

    for (let index = 0; index < this._listeningServers.length; index++) {
      const server = this._listeningServers[index]
      server.emit('close', this)
    }
    this._listeningServers = []
    this._log.info('Servers closed')
    this.emit('stopped')
  }
}
