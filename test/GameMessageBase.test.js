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

import chai from 'chai'
import { GameMessageBase } from 'mcos-shared/structures'
import { describe, it } from 'mocha'

chai.should()

describe('GameMessageBase', () => {
  describe('.byteLength', () => {
    it('should hvave a value of 4', () => {
      // Arrange
      const testMessage = new GameMessageBase()

      // Assert
      testMessage.byteLength.should.equal(4)
    })
  })
})
