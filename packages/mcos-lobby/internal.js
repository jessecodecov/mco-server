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
import { getPersonasByPersonaId } from 'mcos-persona'
import { cipherBufferDES, decipherBufferDES, selectOrCreateEncryptors } from 'mcos-shared/encryption'
import { logger } from 'mcos-shared/logger'
import { NPSMessage, NPSUserInfo } from 'mcos-shared/types'

const log = logger.child({ service: 'mcos:lobby' })

/**
   * @param {string} key
   * @return {Buffer}
   */
export function _generateSessionKeyBuffer (key) {
  const nameBuffer = Buffer.alloc(64)
  Buffer.from(key, 'utf8').copy(nameBuffer)
  return nameBuffer
}

/**
   * Handle a request to connect to a game server packet
   *
   * @private
   * @param {import('mcos-shared/types').BufferWithConnection} dataConnection
   * @return {Promise<NPSMessage>}
   */
async function _npsRequestGameConnectServer (dataConnection) {
  log.debug(
      `_npsRequestGameConnectServer: ${JSON.stringify({
        remoteAddress: dataConnection.connection.socket.remoteAddress,
        data: dataConnection.data.toString('hex')
      })}`
  )

  // Return a _NPS_UserInfo structure
  const userInfo = new NPSUserInfo('recieved')
  userInfo.deserialize(dataConnection.data)
  userInfo.dumpInfo()

  const personas = await getPersonasByPersonaId(
    userInfo.userId
  )
  if (typeof personas[0] === 'undefined') {
    throw new Error('No personas found.')
  }

  const { customerId } = personas[0]

  // Set the encryption keys on the lobby connection
  const databaseManager = DatabaseManager.getInstance()
  const keys = await databaseManager
    .fetchSessionKeyByCustomerId(customerId)
    .catch((/** @type {unknown} */ error) => {
      if (error instanceof Error) {
        log.debug(
            `Unable to fetch session key for customerId ${customerId.toString()}: ${
              error.message
            })}`
        )
      }
      log.error(
          `Unable to fetch session key for customerId ${customerId.toString()}: unknown error}`
      )
      return undefined
    })
  if (keys === undefined) {
    throw new Error('Error fetching session keys!')
  }

  /** @type {import('mcos-shared/types').EncryptionSession} */
  const encryptionSession = selectOrCreateEncryptors(dataConnection, keys)

  dataConnection.connection.encryptionSession = encryptionSession

  const packetContent = Buffer.alloc(72)

  // This response is a NPS_UserStatus

  // Ban and Gag

  // NPS_USERID - User ID - persona id - long
  Buffer.from([0x00, 0x84, 0x5f, 0xed]).copy(packetContent)

  // SessionKeyStr (32)
  _generateSessionKeyBuffer(keys.sessionkey).copy(packetContent, 4)

  // SessionKeyLen - int
  packetContent.writeInt16BE(32, 66)

  // Build the packet
  const packetResult = new NPSMessage('sent')
  packetResult.msgNo = 0x1_20
  packetResult.setContent(packetContent)
  packetResult.dumpPacket()

  return packetResult
}

/**
   * @private
   * @return {NPSMessage}}
   */
function _npsHeartbeat () {
  const packetContent = Buffer.alloc(8)
  const packetResult = new NPSMessage('sent')
  packetResult.msgNo = 0x1_27
  packetResult.setContent(packetContent)
  packetResult.dumpPacket()
  return packetResult
}

/**
 * Takes an encrypted command packet and returns the decrypted bytes
 *
 * @return {import('mcos-shared/types').BufferWithConnection}
 * @param {import('mcos-shared/types').BufferWithConnection} dataConnection
 * @param {Buffer} encryptedCommand
 */
function decryptCmd (dataConnection, encryptedCommand) {
  if (typeof dataConnection.connection.encryptionSession === 'undefined') {
    const errMessage = `Unable to locate encryption session for connection id ${dataConnection.connectionId}`
    log.error(errMessage)
    throw new Error(errMessage)
  }
  const result = decipherBufferDES(dataConnection.connection.encryptionSession, encryptedCommand)
  log.debug(`[Deciphered Cmd: ${result.data.toString('hex')}`)
  dataConnection.connection.encryptionSession = result.session
  dataConnection.data = result.data
  return dataConnection
}

/**
   * Takes an plaintext command packet and return the encrypted bytes
   *
   * @return {import('mcos-shared/types').GSMessageArrayWithConnection}
   * @param {import('mcos-shared/types').SocketWithConnectionInfo} dataConnection
   * @param {Buffer} plaintextCommand
   */
function encryptCmd (dataConnection, plaintextCommand) {
  if (typeof dataConnection.encryptionSession === 'undefined') {
    const errMessage = `Unable to locate encryption session for connection id ${dataConnection.id}`
    log.error(errMessage)
    throw new Error(errMessage)
  }

  const result = cipherBufferDES(dataConnection.encryptionSession, plaintextCommand)
  log.debug(`[ciphered Cmd: ${result.data.toString('hex')}`)
  dataConnection.encryptionSession = result.session
  return {
    connection: dataConnection,
    messages: [new NPSMessage('sent').deserialize(result.data)]
  }
}

/**
 *
 *
 * @param {import('mcos-shared/types').BufferWithConnection} dataConnection
 * @return {import('mcos-shared/types').GSMessageArrayWithConnection}
 */
function handleCommand (dataConnection) {
  const { data } = dataConnection

  // Marshal the command into an NPS packet
  const incommingRequest = new NPSMessage('recieved')
  incommingRequest.deserialize(data)

  incommingRequest.dumpPacket()

  // Create the packet content
  const packetContent = Buffer.alloc(375)

  // Add the response code
  packetContent.writeUInt16BE(0x02_19, 367)
  packetContent.writeUInt16BE(0x01_01, 369)
  packetContent.writeUInt16BE(0x02_2c, 371)

  log.debug('Sending a dummy response of 0x229 - NPS_MINI_USER_LIST')

  // Build the packet
  const packetResult = new NPSMessage('sent')
  packetResult.msgNo = 0x2_29
  packetResult.setContent(packetContent)
  packetResult.dumpPacket()

  return {
    connection: dataConnection.connection,
    messages: [packetResult]
  }
}

/**
 *
 *
 * @param {import('mcos-shared/types').BufferWithConnection} dataConnection
 * @return {import('mcos-shared/types').GSMessageArrayWithConnection}
 */
function handleEncryptedNPSCommand (dataConnection) {
  // Decipher
  const { data } = dataConnection
  const decipheredConnection = decryptCmd(dataConnection,
    Buffer.from(data.slice(4))
  )

  const responseConnection = handleCommand(decipheredConnection)

  // Encipher
  responseConnection.messages.forEach(m => {
    encryptCmd(responseConnection.connection, m.serialize())
  })

  return responseConnection
}

/**
* @param {import("mcos-shared/types").BufferWithConnection} dataConnection
* @return {Promise<import('mcos-shared/types').GSMessageArrayWithConnection>}
*/
export async function handleData (dataConnection) {
  const { localPort, remoteAddress } = dataConnection.connection.socket
  log.debug(
 `Received Lobby packet: ${JSON.stringify({ localPort, remoteAddress })}`
  )
  const { data } = dataConnection
  const requestCode = data.readUInt16BE(0).toString(16)

  switch (requestCode) {
    // _npsRequestGameConnectServer
    case '100': {
      const responsePacket = await _npsRequestGameConnectServer(
        dataConnection
      )
      return {
        connection: dataConnection.connection,
        messages: [responsePacket]
      }
    }

    // NpsHeartbeat

    case '217': {
      const responsePacket = _npsHeartbeat()
      return {
        connection: dataConnection.connection,
        messages: [responsePacket]
      }
    }

    // NpsSendCommand

    case '1101': {
      // This is an encrypted command

      const result = handleEncryptedNPSCommand(dataConnection)
      return result
    }

    default:
      throw new Error(
     `Unknown code ${requestCode} was received on port 7003`
      )
  }
}
