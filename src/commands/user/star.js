/*
 This file is part of TrelloBot.
 Copyright (c) Snazzah 2016 - 2019
 Copyright (c) Trello Talk Team 2019 - 2020

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const Command = require('../../structures/Command');
const Util = require('../../util');

module.exports = class Star extends Command {
  get name() { return 'star'; }

  get _options() { return {
    aliases: ['starboard', 'sboard', 'sb'],
    cooldown: 2,
    permissions: ['auth']
  }; }

  async exec(message, { args, _, trello, userData }) {
    const arg = args.join(' ') || userData.currentBoard;

    const handle = await trello.handleResponse({
      response: await trello.getMember(userData.trelloID),
      client: this.client, message, _ });
    if (handle.stop) return;
    if (handle.response.status === 404) {
      await this.client.pg.models.get('user').removeAuth(message.author);
      return message.channel.createMessage(_('trello_response.unauthorized'));
    }

    const json = handle.body;

    const board = await Util.Trello.findBoard(arg, json.boards, this.client, message, _, userData);
    if (!board) return;

    if (board.starred) {
      // Get stars
      const starHandle = await trello.handleResponse({
        response: await trello.getBoardStars(userData.trelloID),
        client: this.client, message, _ });
      if (starHandle.stop) return;
      const star = starHandle.body.find(star => star.idBoard === board.id);
      if (!star)
        return message.channel.createMessage(_('user_mgmt.star_error'));

      // Remove star
      if ((await trello.handleResponse({
        response: await trello.unstarBoard(userData.trelloID, star.id),
        client: this.client, message, _ })).stop) return;
    } else {
      if ((await trello.handleResponse({
        response: await trello.starBoard(userData.trelloID, board.id),
        client: this.client, message, _ })).stop) return;
    }
    
    return message.channel.createMessage(
      _(board.starred ? 'user_mgmt.unstar_board' : 'user_mgmt.star_board', {
        name: Util.cutoffText(Util.Escape.markdown(board.name), 50),
        id: board.shortLink
      }));
  }

  get metadata() { return {
    category: 'categories.user',
  }; }
};