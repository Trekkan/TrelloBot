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

const Command = require('../structures/Command');
const GenericPrompt = require('../structures/GenericPrompt');
const Util = require('../util');

module.exports = class Prefix extends Command {
  get name() { return 'prefix'; }

  get _options() { return {
    aliases: ['pr'],
    permissions: ['embed'],
    cooldown: 0,
  }; }

  async findPrefix(query, prefixes, message, _) {
    const foundPrefix = prefixes.find(prefix => prefix.toLowerCase() === query.toLowerCase());
    if (foundPrefix) return foundPrefix;
    else {
      const prompter = new GenericPrompt(this.client, message, {
        items: prefixes, itemTitle: 'words.prefix.many',
        header: _('prefix.choose'),
        display: prefix => `\`${prefix}\``,
        _
      });
      const promptResult = await prompter.search(query,
        { channelID: message.channel.id, userID: message.author.id }, null);
      if (promptResult && promptResult._noresults) {
        await message.channel.createMessage(_('prompt.no_search'));
        return;
      } else
        return promptResult;
    }
  }

  async checkPrefix(prefix, message, prefixUsed, _) {
    if (prefix.length > 32) {
      await message.channel.createMessage(_('prefix.char_limit'));
      return true;
    } else if (message.mentions.length || message.mentionEveryone ||
      message.channelMentions.length || message.roleMentions.length) {
      if (Util.Regex.userMention.test(prefixUsed.raw) && !Util.Regex.userMention.test(prefix))
        return false;
      await message.channel.createMessage(_('prefix.mention'));
      return true;
    }
  }

  async exec(message, { args, _, userData, serverData, prefixUsed }) {
    const serverPrefix = serverData ? serverData.prefix : this.client.config.prefix;
    const userPrefixes = userData ? userData.prefixes : [];
    const canUse = 5 - userPrefixes.length;
    let embed, prefix = args[1] || null;
    switch (args[0] ? args[0].toLowerCase() : null) {
    case 'setserver':
    case 'ss':
    case 'set':
    case 's':
      if (!message.guildID)
        return message.channel.createMessage(_('locale.no_guild'));
      if (!Util.CommandPermissions.trelloRole(this.client, message))
        return message.channel.createMessage(_('command_permissions.trelloRole'));
      if (!prefix)
        return message.channel.createMessage(_('prefix.no_arg_server'));
      if (serverPrefix.toLowerCase() === prefix.toLowerCase())
        return message.channel.createMessage(_('prefix.already'));
      if (await this.checkPrefix(prefix, message, prefixUsed, _)) return;
      if (!serverData)
        await this.client.pg.models.get('server').get(message.channel.guild);
      await this.client.pg.models.get('server').update({ prefix },
        { where: { serverID: message.guildID } });
      return message.channel.createMessage(_('prefix.set_server', { prefix }));
    case 'add':
    case 'a':
      if (!prefix)
        return message.channel.createMessage(_('prefix.no_arg'));
      if (userPrefixes.map(p => p.toLowerCase()).includes(prefix.toLowerCase()))
        return message.channel.createMessage(_('prefix.already'));
      if (canUse <= 0 && !Util.CommandPermissions.elevated(this.client, message))
        return message.channel.createMessage(_('prefix.limit'));
      if (await this.checkPrefix(prefix, message, prefixUsed, _)) return;
      if (!userData)
        await this.client.pg.models.get('user').get(message.author);
      await this.client.pg.models.get('user').addToArray(message.author, 'prefixes', prefix);
      return message.channel.createMessage(_('prefix.added', { prefix }));
    case 'remove':
    case 'r':
    case 'delete':
    case 'd':
      if (!userData || userData && !userData.prefixes.length)
        return message.channel.createMessage(_('prefix.none'));
      prefix = await this.findPrefix(args[1], userPrefixes, message, _);
      if (!prefix) return;
      await this.client.pg.models.get('user').removeFromArray(message.author, 'prefixes', prefix);
      return message.channel.createMessage(_('prefix.removed', { prefix }));
    default:
      embed = {
        title: _('words.prefix.many'),
        color: this.client.config.embedColor,
        description: (message.guildID ? `**${_('prefix.server')}:** \`${serverPrefix}\`\n\n` : '') +
          `- <@${this.client.user.id}> 🔒\n` + userPrefixes.map(prefix => `- \`${prefix}\``).join('\n') +
          '\n\n' + _.numSuffix('prefix.can_add', canUse, { count: canUse }) +
          '\n' + _('prefix.footer')
      };

      return message.channel.createMessage({ embed });
    }
  }

  get metadata() { return {
    category: 'categories.general',
  }; }
};
