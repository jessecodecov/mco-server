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

import { logger } from 'mcos-shared/logger'
import { errorMessage } from 'mcos-shared'
import { processData, selectConnection, updateConnection } from './connections.js'
import { receiveLoginData } from 'mcos-login'
import { receivePersonaData } from 'mcos-persona'
import { receiveLobbyData } from 'mcos-lobby'
import { receiveTransactionsData } from 'mcos-transactions'

const log = logger.child({ service: 'mcos:gateway:sockets' })

/**
   * Attempt to write packet(s) to the socket
   * @param {import("mcos-shared/types").BufferWithConnection} dataConnection
   * @returns {import('mcos-shared/types').BufferWithConnection}
   */
// function tryWritePackets (dataConnection) {
//   log.debug('In trywritepackets')

//   // Does the packet need to be compressed?
//   /** @type {import("mcos-shared/types").BufferWithConnection} */
//   const compressedPacket = compressIfNeeded(dataConnection)
//   // Does the packet need to be encrypted?
//   const encryptedPacket = encryptIfNeeded(compressedPacket)
//   // Log that we are trying to write
//   log.debug(
//         ` Atempting to write seq: ${encryptedPacket.connection.seq} to conn: ${dataConnection.connectionId}`
//   )

//   // Log the buffer we are writing
//   log.debug(
//         `Writting buffer: ${encryptedPacket.data.toString('hex')}`
//   )
//   if (encryptedPacket.connection.socket.writable) {
//     // Write the packet to socket
//     encryptedPacket.connection.socket.write(encryptedPacket.data)
//   } else {
//     /** @type {string} */
//     const port = encryptedPacket.connection.socket.localPort?.toString() || ''
//     throw new Error(
//           `Error writing ${encryptedPacket.data.toString('hex')} to ${
//             encryptedPacket.connection.socket.remoteAddress
//           } , ${port}`
//     )
//   }

//   return encryptedPacket
// }

/**
   * The onData handler
   * takes the data buffer and creates a {@link BufferWithConnection} object
   * @param {Buffer} data
   * @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
   * @return {Promise<void>}
   */
async function onData (data, connection) {
  log.debug(
      `data prior to proccessing: ${data.toString(
        'hex'
      )}`
  )

  // Link the data and the connection together
  /** @type {import("mcos-shared/types").BufferWithConnection} */
  const networkBuffer = {
    connectionId: connection.id,
    connection,
    data,
    timestamp: Date.now()
  }

  const { localPort } = networkBuffer.connection.socket

  if (typeof localPort === 'undefined') {
    // Somehow we have recived a connection without a local post specified
    log.error(`Error locating target port for socket, connection id: ${networkBuffer.connectionId}`)
    log.error('Closing socket.')
    networkBuffer.connection.socket.end()
    return
  }

  /** @type {import('mcos-shared/types').GServiceResponse | import('mcos-shared/types').TServiceResponse} */
  const result = { err: null, response: undefined }

  // Route the data to the correct service
  // There are 2 happy paths from this point
  // * GameService
  // * TransactionService

  // These are game services

  await handleInboundGameData(localPort, networkBuffer)

  // This is a transaction response.

  await handleInboundTransactionData(localPort, networkBuffer)

  if (result.err) {
    log.error(errorMessage(result.err))
    throw new Error(
        `There was an error processing the packet: ${errorMessage(result.err)}`
    )
  }

  if (typeof result.response === 'undefined') {
    // This is probably on error, let's assume it's not. For now.
    // TODO: verify there are no happy paths where the services would return zero packets
    const message = 'There were zero packets returned for processing'
    log.info(message)
    return
  }

  const messages = result.response.messages

  // Count the response packets

  const packetCount = messages.length
  log.debug(`There are ${packetCount} messages ready for sending`)

  const outboundConnection = result.response.connection

  // At this point the packets should be read to go. Compressed, encrypted, etc.

  messages.forEach(m => {
    outboundConnection.socket.write(m.serialize())
  })

  // Update the connection
  try {
    updateConnection(
      outboundConnection.id,
      outboundConnection
    )
  } catch (error) {
    const errMessage = `There was an error updating the connection: ${errorMessage(error)}`

    log.error(errMessage)
    throw new Error(errMessage)
  }
}

/**
   * Server listener method
   *
   * @param {import("node:net").Socket} socket
   * @return {void}
   */
export function socketListener (socket) {
  // Received a new connection
  // Turn it into a connection object
  const connectionRecord = selectConnection(socket)

  const { localPort, remoteAddress } = socket
  log.info(`Client ${remoteAddress} connected to port ${localPort}`)
  if (socket.localPort === 7003 && connectionRecord.inQueue) {
    /**
       * Debug seems hard-coded to use the connection queue
       * Craft a packet that tells the client it's allowed to login
       */

    log.info('Sending OK to Login packet')
    socket.write(Buffer.from([0x02, 0x30, 0x00, 0x00]))
    connectionRecord.inQueue = false
  }

  socket.on('end', () => {
    log.info(`Client ${remoteAddress} disconnected from port ${localPort}`)
  })
  socket.on('data', (/** @type {Buffer} */ data) => {
    onData(data, connectionRecord)
  })
  socket.on('error', (/** @type {unknown} */ error) => {
    const message = errorMessage(error)
    if (message.includes('ECONNRESET')) {
      return log.warn('Connection was reset')
    }
    log.error(`Socket error: ${errorMessage(error)}`)
  })
}

/**
 * TODO: Write compressor
 *
 * Uses PWARE DCL Explode
 *
 * @param {import('mcos-shared/types').SocketWithConnectionInfo} dataConnection
 * @param {import('mcos-shared/types').MessageNode} message
 */
// function compressIfNeeded (dataConnection, message) {
//   log.debug(`Checking if we should compress message with msgNo of ${message.msgNo}`)
// }

/**
 * TODO: Encript if needed
 *
 * Encrypt the packet if the connection says so.
 *
 * @param {import('mcos-shared/types').SocketWithConnectionInfo} dataConnection
 * @param {import('mcos-shared/types').MessageNode} message
 */
// function encryptIfNeeded (dataConnection, message) {
//   log.debug(`Checking if we should compress message with msgNo of ${message.msgNo}`)
// }
/**
 *
 *
 * @param {number} localPort
 * @param {import('mcos-shared/types').BufferWithConnection} networkBuffer
 * @return {Promise<import('mcos-shared/types').GServiceResponse>}
 */
async function handleInboundGameData (localPort, networkBuffer) {
  /** @type {import('mcos-shared/types').GServiceResponse} */
  let result = { err: null, response: undefined }
  let handledPackets = false

  if (localPort === 8226) {
    result = await receiveLoginData(networkBuffer)
    log.debug('Back in socket manager')
    handledPackets = true
  }

  if (localPort === 8228) {
    result = await receivePersonaData(networkBuffer)
    log.debug('Back in socket manager')
    handledPackets = true
  }

  if (localPort === 7003) {
    result = await receiveLobbyData(networkBuffer)
    log.debug('Back in socket manager')
    handledPackets = true
  }

  if (!handledPackets) {
    log.debug('The packet was not for a game service')
    return result
  }

  // TODO: Compress and encrypt if needed
  return result
}

/**
 *
 *
 * @param {number} localPort
 * @param {import('mcos-shared/types').BufferWithConnection} networkBuffer
 * @return {Promise<import('mcos-shared/types').TServiceResponse>}
 */
async function handleInboundTransactionData (localPort, networkBuffer) {
  /** @type {import('mcos-shared/types').TServiceResponse} */
  let result = { err: null, response: undefined }
  let handledPackets = false

  if (localPort === 43300) {
    result = await receiveTransactionsData(networkBuffer)
    log.debug('Back in socket manager')
    handledPackets = true
  }

  if (!handledPackets) {
    log.debug('The packet was not for a game service')
    return result
  }

  // TODO: Compress and encrypt if needed
  return result
}

/**
   * Replays the unproccessed packet to the connection manager
   * @param {import("mcos-shared/types").UnprocessedPacket} packet
   * @returns {Promise<{err: Error | null, data: import("mcos-core").TCPConnection | null}>}
   */
export async function processPacket (packet) {
  // Locate the conection manager
  try {
    return processData(packet)
  } catch (error) {
    log.error(errorMessage(error))
    return {
      err: new Error(
          `There was an error processing the packet: ${errorMessage(error)}`
      ),
      data: null
    }
  }
}
