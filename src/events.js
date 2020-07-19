/*
This file is part of Taco

MIT License

Copyright (c) 2020 Trello Talk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const ArgumentInterpreter = require('./structures/ArgumentInterpreter');
const Trello = require('./structures/Trello');
const Util = require('./util');

module.exports = class Events {
  constructor(client) {
    this.client = client;
    client.on('messageCreate', this.onMessage.bind(this));
    client.on('messageReactionAdd', this.onReaction.bind(this));
  }

  async onMessage(message) {
    if (message.author.bot || message.author.system) return;

    // Check to see if bot can send messages
    if (message.channel.type !== 1 &&
      !message.channel.permissionsOf(this.client.user.id).has('sendMessages')) return;

    // Don't parse if Taco is in the guild and not using a mention prefix
    if (this.client.config.sudoID &&
      this.client.user.id !== this.client.config.sudoID &&
      message.guildID &&
      !new RegExp(`^<@!?${this.client.user.id}>`).test(message.content)) {
      const sudoBot = message.channel.guild.members.has(this.client.config.sudoID);
      if (sudoBot) return;
    }

    // Message awaiter
    if (this.client.messageAwaiter.processHalt(message)) return;

    // Postgres Data
    const userData = await this.client.pg.models.get('user').onlyGet(message.author.id);
    if (userData && userData.bannedFromUse) return;
    const serverData = message.guildID ?
      await this.client.pg.models.get('server').onlyGet(message.guildID) : null;
    if (serverData && serverData.bannedFromUse) return;

    // Prefixes
    const userPrefixes = userData ? userData.prefixes : [];
    const serverPrefix = serverData ? [serverData.prefix] : [this.client.config.prefix];
    const prefixes = [...userPrefixes, ...serverPrefix];

    // Command parsing
    const argInterpretor = new ArgumentInterpreter(Util.Prefix.strip(message, this.client, prefixes));
    const args = argInterpretor.parseAsStrings();
    const commandName = args.splice(0, 1)[0];
    const command = this.client.cmds.get(commandName, message);
    if (!message.content.match(Util.Prefix.regex(this.client, prefixes)) || !command) return;

    const prefixUsed = message.content.match(Util.Prefix.regex(this.client, prefixes))[1];
    const cleanPrefixUsed = message.content.match(new RegExp(`^<@!?${this.client.user.id}>`)) ?
      `@${this.client.user.username}#${this.client.user.discriminator} ` : prefixUsed;

    const locale = userData && userData.locale ? userData.locale : (serverData ? serverData.locale : null);
    const _ = this.client.locale.createModule(locale, { raw: prefixUsed, clean: cleanPrefixUsed });
    const trello = new Trello(this.client, userData ? userData.trelloToken : null);

    try {
      await command._exec(message, {
        args, _, trello,
        userData, serverData,
        prefixUsed: { raw: prefixUsed, clean: cleanPrefixUsed }
      });
    } catch (e) {
      if (this.client.airbrake) {
        await this.client.airbrake.notify({
          error: e,
          params: {
            command: command.name,
            user: {
              id: message.author.id,
              username: message.author.username,
              discriminator: message.author.discriminator
            },
            message: {
              id: message.id,
              content: message.content,
              type: message.type
            },
            guild: message.guildID ? {
              id: message.guildID,
              name: message.channel.guild.name
            } : undefined,
            channel: {
              id: message.channel.id,
              type: message.channel.type,
              name: message.channel.name
            }
          }
        });
      }
      if (!this.client.airbrake || this.client.config.debug) {
        console.error(`The '${command.name}' command failed.`);
        console.log(e);
      }
      message.channel.createMessage(`:fire: ${_('error')}`);
      this.client.stopTyping(message.channel);
    }
  }

  onReaction(message, emoji, userID) {
    const id = `${message.id}:${userID}`;
    if (this.client.messageAwaiter.reactionCollectors.has(id)) {
      const collector = this.client.messageAwaiter.reactionCollectors.get(id);
      collector._onReaction(emoji, userID);
    }
  }
};
