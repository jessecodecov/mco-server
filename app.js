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
import { MCOServer } from 'mcos-core'

const log = logger.child({ service: 'mcos' })

/** @type {import("mcos-core").ICoreConfig} */
const coreConfig = {
  externalHost: '0.0.0.0',
  ports: [
    80, 6660, 7003, 8228, 8226, 8227, 9000, 9001, 9002, 9003, 9004, 9005, 9006,
    9007, 9008, 9009, 9010, 9011, 9012, 9013, 9014, 43200, 43300, 43400, 53303
  ]
}

try {
  const s = MCOServer.init(coreConfig)
  s.run()
  s.stop()
} catch (/** @type {unknown} */ err) {
  log.error('Error in core server')
  if (err instanceof Error) {
    log.error(err.message)
  } else {
    throw err
  }
  log.error('Server exiting')
  process.exit(1)
}
