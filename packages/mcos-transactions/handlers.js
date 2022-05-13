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

import { DatabaseManager } from 'mcos-database'
import { logger } from 'mcos-shared/logger'
import { ClientConnectMessage, GenericReplyMessage, GenericRequestMessage, MessageNode, StockCar, StockCarInfoMessage } from 'mcos-shared/types'

const log = logger.child({ service: 'mcos:transactions:handlers' })

/**
 *
 * @private
 * @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
 * @param {MessageNode} node
 * @return {import("mcos-shared/types").TSMessageArrayWithConnection}
 */
function _setOptions (connection, node) {
  const setOptionsMessage = node

  setOptionsMessage.data = node.serialize()

  // Update the appId
  setOptionsMessage.appId = connection.personaId

  // Create new response packet
  const pReply = new GenericReplyMessage()
  pReply.msgNo = 101
  pReply.msgReply = 109
  const rPacket = new MessageNode('sent')

  rPacket.deserialize(node.serialize())
  rPacket.updateBuffer(pReply.serialize())
  rPacket.dumpPacket()

  return { connection, messages: [rPacket] }
}

/**
 *
 *
 * @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
 * @param {MessageNode} node
 * @return {import('mcos-shared/types').TSMessageArrayWithConnection}
 * @memberof MCOTServer
 */
function handleSetOptions (conn, node) {
  const result = _setOptions(conn, node)
  return result
}

/**
*
* @private
* @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
* @param {MessageNode} node
* @return {import("mcos-shared/types").TSMessageArrayWithConnection}
*/
function _trackingMessage (connection, node) {
  const trackingMessage = node

  trackingMessage.data = node.serialize()

  // Update the appId
  trackingMessage.appId = connection.personaId

  // Create new response packet
  const pReply = new GenericReplyMessage()
  pReply.msgNo = 101
  pReply.msgReply = 440
  const rPacket = new MessageNode('sent')

  rPacket.deserialize(node.serialize())
  rPacket.updateBuffer(pReply.serialize())
  rPacket.dumpPacket()

  return { connection, messages: [rPacket] }
}

/**
 *
 *
 * @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
 * @param {MessageNode} node
 * @return {import('mcos-shared/types').TSMessageArrayWithConnection}
 * @memberof MCOTServer
 */
function handleTrackingMessage (conn, node) {
  const result = _trackingMessage(conn, node)
  return result
}

/**
*
* @private
* @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
* @param {MessageNode} node
* @return {import("mcos-shared/types").TSMessageArrayWithConnection}
*/
function _updatePlayerPhysical (connection, node) {
  const updatePlayerPhysicalMessage = node

  updatePlayerPhysicalMessage.data = node.serialize()

  // Update the appId
  updatePlayerPhysicalMessage.appId = connection.personaId

  // Create new response packet
  const pReply = new GenericReplyMessage()
  pReply.msgNo = 101
  pReply.msgReply = 266
  const rPacket = new MessageNode('sent')

  rPacket.deserialize(node.serialize())
  rPacket.updateBuffer(pReply.serialize())
  rPacket.dumpPacket()

  return { connection, messages: [rPacket] }
}

/**
 *
 *
 * @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
 * @param {MessageNode} node
 * @return {import('mcos-shared/types').TSMessageArrayWithConnection}
 * @memberof MCOTServer
 */
function handleUpdatePlayerPhysical (conn, node) {
  const result = _updatePlayerPhysical(conn, node)
  return result
}

/**
* @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
* @param {MessageNode} packet
* @return {Promise<import("mcos-shared/types").TSMessageArrayWithConnection>}
*/
async function clientConnect (connection, packet) {
  /**
     * Let's turn it into a ClientConnectMsg
     */
  // Not currently using this
  const newMessage = new ClientConnectMessage(packet.data)

  log.debug(
        `[TCPManager] Looking up the session key for ${newMessage.customerId}...`
  )
  await DatabaseManager.getInstance().fetchSessionKeyByCustomerId(
    newMessage.customerId
  )
  log.debug('[TCPManager] Session Key located!')

  const connectionWithKey = connection

  const { customerId, personaId, personaName } = newMessage
  //   const { sessionkey } = result

  //   const stringKey = Buffer.from(sessionkey, 'hex')

  //   connectionWithKey.setEncryptionKey(Buffer.from(stringKey.slice(0, 16)))

  // Update the connection's appId
  connectionWithKey.personaId = newMessage.getAppId()

  log.debug(`cust: ${customerId} ID: ${personaId} Name: ${personaName}`)

  // Create new response packet
  const genericReplyMessage = new GenericReplyMessage()
  genericReplyMessage.msgNo = 101
  genericReplyMessage.msgReply = 438
  const responsePacket = new MessageNode('sent')
  responsePacket.deserialize(packet.serialize())
  responsePacket.updateBuffer(genericReplyMessage.serialize())
  responsePacket.dumpPacket()

  return { connection, messages: [responsePacket] }
}

/**
  *
  *
  * @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
  * @param {MessageNode} node
  * @return {Promise<import('mcos-shared/types').TSMessageArrayWithConnection>}
  * @memberof MCOTServer
  */
async function handleClientConnect (conn, node) {
  const result = await clientConnect(conn, node)
  return {
    connection: result.connection,
    messages: result.messages
  }
}

/**
*
* @private
* @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
* @param {MessageNode} node
* @return {import("mcos-shared/types").TSMessageArrayWithConnection}>}
*/
function _login (connection, node) {
  // Create new response packet
  const pReply = new GenericReplyMessage()
  pReply.msgNo = 213
  pReply.msgReply = 105
  pReply.appId = connection.personaId
  const rPacket = new MessageNode('sent')

  rPacket.deserialize(node.serialize())
  rPacket.updateBuffer(pReply.serialize())
  rPacket.dumpPacket()

  return { connection, messages: [rPacket] }
}

/**
 *
 *
 * @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
 * @param {MessageNode} node
 * @return {import('mcos-shared/types').TSMessageArrayWithConnection}
 * @memberof MCOTServer
 */
function handleLoginMessage (conn, node) {
  const result = _login(conn, node)
  return {
    connection: result.connection,
    messages: result.messages
  }
}

/**
*
* @private
* @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
* @param {MessageNode} node
* @return {import("mcos-shared/types").TSMessageArrayWithConnection}
*/
function _logout (connection, node) {
  const logoutMessage = node

  logoutMessage.data = node.serialize()

  // Update the appId
  logoutMessage.appId = connection.personaId

  // Create new response packet
  const pReply = new GenericReplyMessage()
  pReply.msgNo = 101
  pReply.msgReply = 106
  const rPacket = new MessageNode('sent')

  rPacket.deserialize(node.serialize())
  rPacket.updateBuffer(pReply.serialize())
  rPacket.dumpPacket()

  /** @type {MessageNode[]} */
  const nodes = []

  return { connection, messages: nodes }
}

/**
*
*
* @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
* @param {MessageNode} node
* @return {import('mcos-shared/types').TSMessageArrayWithConnection}
*/
function handleLogoutMessage (conn, node) {
  const result = _logout(conn, node)
  return {
    connection: result.connection,
    messages: result.messages
  }
}

/**
*
* @private
* @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
* @param {MessageNode} node
* @return {import("mcos-shared/types").TSMessageArrayWithConnection}
*/
function _getLobbies (connection, node) {
  log.debug('In _getLobbies...')
  const lobbiesListMessage = node

  // Update the appId
  lobbiesListMessage.appId = connection.personaId

  // Dump the packet
  log.debug('Dumping request...')
  log.debug(JSON.stringify(lobbiesListMessage))

  // Create new response packet
  // const lobbyMsg = new LobbyMsg()

  const pReply = new GenericReplyMessage()
  pReply.msgNo = 325
  pReply.msgReply = 324
  const rPacket = new MessageNode('sent')
  rPacket.flags = 9
  rPacket.setSeq(node.seq)

  const lobby = Buffer.alloc(12)
  lobby.writeInt32LE(325, 0)
  lobby.writeInt32LE(0, 4)
  lobby.writeInt32LE(0, 8)

  rPacket.updateBuffer(pReply.serialize())

  // // Dump the packet
  log.debug('Dumping response...')
  log.debug(JSON.stringify(rPacket))

  return { connection, messages: [rPacket] }
}

/**
   *
   *
   * @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
   * @param {MessageNode} node
   * @return {import('mcos-shared/types').TSMessageArrayWithConnection}
   * @memberof MCOTServer
   */
function handleGetLobbiesMessage (conn, node) {
  const result = _getLobbies(conn, node)
  log.debug('Dumping Lobbies response packet...')
  log.debug(result.messages.join().toString())
  return {
    connection: result.connection,
    messages: result.messages
  }
}

/**
* Handles the getStockCarInfo message
* @param {import('mcos-shared/types').SocketWithConnectionInfo} connection
* @param {MessageNode} packet
* @returns {import("mcos-shared/types").TSMessageArrayWithConnection}
*/
function getStockCarInfo (connection, packet) {
  const getStockCarInfoMessage = new GenericRequestMessage()
  getStockCarInfoMessage.deserialize(packet.data)
  getStockCarInfoMessage.dumpPacket()

  const stockCarInfoMessage = new StockCarInfoMessage(200, 0, 105)
  stockCarInfoMessage.starterCash = 200
  stockCarInfoMessage.dealerId = 8
  stockCarInfoMessage.brand = 105

  stockCarInfoMessage.addStockCar(new StockCar(113, 20, 0)) // Bel-air
  stockCarInfoMessage.addStockCar(new StockCar(104, 15, 1)) // Fairlane - Deal of the day
  stockCarInfoMessage.addStockCar(new StockCar(402, 20, 0)) // Century

  stockCarInfoMessage.dumpPacket()

  const responsePacket = new MessageNode('sent')

  responsePacket.deserialize(packet.serialize())

  responsePacket.updateBuffer(stockCarInfoMessage.serialize())

  responsePacket.dumpPacket()

  return { connection, messages: [responsePacket] }
}

/**
*
*
* @param {import('mcos-shared/types').SocketWithConnectionInfo} conn
* @param {MessageNode} node
* @return {import('mcos-shared/types').TSMessageArrayWithConnection}
*/
function handleShockCarInfoMessage (conn, node) {
  const result = getStockCarInfo(conn, node)
  return {
    connection: result.connection,
    messages: result.messages
  }
}

/**
 * @readonly
 */
export const messageHandlers = [
  {
    name: 'MC_SET_OPTIONS',
    handler: handleSetOptions
  },
  {
    name: 'MC_TRACKING_MSG',
    handler: handleTrackingMessage
  },
  {
    name: 'MC_UPDATE_PLAYER_PHYSICAL',
    handler: handleUpdatePlayerPhysical
  },
  {
    name: 'MC_CLIENT_CONNECT_MSG',
    handler: handleClientConnect
  },
  {
    name: 'MC_LOGIN',
    handler: handleLoginMessage
  },
  {
    name: 'MC_LOGOUT',
    handler: handleLogoutMessage
  },
  {
    name: 'MC_GET_LOBBIES',
    handler: handleGetLobbiesMessage
  },
  {
    name: 'MC_STOCK_CAR_INFO',
    handler: handleShockCarInfoMessage
  }
]
