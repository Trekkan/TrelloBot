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

const Command = require('../../structures/Command');
const SubMenu = require('../../structures/SubMenu');
const GenericPrompt = require('../../structures/GenericPrompt');
const WebhookFilters = require('../../structures/WebhookFilters');
const Util = require('../../util');

module.exports = class AddWebhook extends Command {
  get name() { return 'addwebhook'; }

  get _options() { return {
    aliases: ['createwebhook', 'awh', 'cwh', '+wh'],
    cooldown: 4,
    permissions: ['embed', 'webhooks', 'trelloRole', 'auth']
  }; }

  async exec(message, { args, _, trello, userData, serverData }) {
    const maxWebhooks = serverData ? serverData.maxWebhooks : 5;
    const webhookCount = await this.client.pg.models.get('webhook').count({ where: {
      guildID: message.guildID
    }});
    if (maxWebhooks <= webhookCount)
      return message.channel.createMessage(_('webhook_cmd.max_wh'));

    const handle = await trello.handleResponse({
      response: await trello.getMember(userData.trelloID),
      client: this.client, message, _ });
    if (handle.stop) return;
    if (handle.response.status === 404) {
      await this.client.pg.models.get('user').removeAuth(message.author);
      return message.channel.createMessage(_('trello_response.unauthorized'));
    }

    const json = handle.body;

    const board = await Util.Trello.findBoard(args[0], json.boards, this.client, message, _, userData);
    if (!board) return;

    const menu = new SubMenu(this.client, message, {
      header: `**${_('words.board.one')}:** ${
        Util.cutoffText(Util.Escape.markdown(board.name), 50)} (\`${board.shortLink}\`)\n\n` +
        _('webhook_cmd.add_header'), itemTitle: 'words.subcmd.many', _ });
    const _this = this;
    return menu.start(message.channel.id, message.author.id, args[1], [
      {
        // Add webhook
        names: ['add', 'addwebhook'],
        title: _('webhook_cmd.menu.add'),
        exec() {
          return _this.addWebhook(message, board, userData, trello, _);
        }
      },
      {
        // Use existing webhook
        names: ['exist', 'existing', 'existingwebhook'],
        title: _('webhook_cmd.menu.exist'),
        exec() {
          return _this.existingWebhook(message, board, userData, trello, _);
        }
      },
      {
        // Use webhook link
        names: ['link', 'linkwebhook'],
        title: _('webhook_cmd.menu.link'),
        exec() {
          return _this.linkWebhook(message, board, userData, trello, _);
        }
      },
    ]);
  }

  async addWebhook(message, board, userData, trello, _) {
    const availableChannels = message.channel.guild.channels
      .filter(channel => (channel.type === 5 || channel.type === 0) &&
        channel.permissionsOf(this.client.user.id).has('manageWebhooks'));

    if (!availableChannels.length)
      return message.channel.createMessage(_('webhook_cmd.no_channels'));

    const prompter = new GenericPrompt(this.client, message, {
      items: availableChannels, itemTitle: 'words.channel.many',
      header: _('webhook_cmd.choose_channel'),
      display: (item) => `${item.mention}${item.parentID ?
        ` (${Util.cutoffText(message.channel.guild.channels.get(item.parentID).name, 32)})` : ''}`,
      _
    });
    const channel = await prompter.choose(message.channel.id, message.author.id);
    if (!channel) return;

    try {
      const webhook = await channel.createWebhook({
        name: Util.cutoffText(board.name, 32)
      }, `[${message.author.username}#${message.author.discriminator} ${message.author.id}] Webhook Setup`);
      return this.finalizeSetup(message, board, webhook, userData, trello, _);
    } catch (e) {
      return message.channel.createMessage(_('webhook_cmd.couldnt_create'));
    }
  }

  async existingWebhook(message, board, userData, trello, _) {
    const discordWebhooks = await message.channel.guild.getWebhooks();

    if (!discordWebhooks.length)
      return message.channel.createMessage(_('webhook_cmd.no_dwh'));

    const prompter = new GenericPrompt(this.client, message, {
      items: discordWebhooks, itemTitle: 'webhook_cmd.dwh.many',
      header: _('webhook_cmd.choose_existwh'),
      display: (item) => `${
        Util.cutoffText(Util.Escape.markdown(item.name), 25)} (<#${item.channel_id}>, <@${item.user.id}>)`,
      _
    });
    const discordWebhook = await prompter.choose(message.channel.id, message.author.id);
    if (!discordWebhook) return;

    return this.finalizeSetup(message, board, discordWebhook, userData, trello, _);
  }

  async linkWebhook(message, board, userData, trello, _) {
    const input = await this.client.messageAwaiter.getInput(message, _, {
      header: _('webhook_cmd.input_link')
    });
    if (!input) return;

    const match = input.match(Util.Regex.webhookURL);
    if (!match)
      return message.channel.createMessage(_('webhook_cmd.no_link'));

    const discordWebhook = (await message.channel.guild.getWebhooks()).find(dwh => dwh.id === match[1]);

    if (!discordWebhook)
      return message.channel.createMessage(_('webhook_cmd.no_server_link'));

    return this.finalizeSetup(message, board, discordWebhook, userData, trello, _);
  }

  async finalizeSetup(message, board, webhook, userData, trello, _) {
    const callbackURL = this.client.config.webserver.base + userData.trelloID;
    const handle = await trello.handleResponse({
      response: await trello.addWebhook(board.id, { callbackURL }),
      client: this.client, message, _ });
    if (handle.stop) return;
    let trelloWebhook = handle.body;
    if (handle.response.status === 400 &&
      trelloWebhook === 'A webhook with that callback, model, and token already exists') {
      const webhookListHandle = await trello.handleResponse({
        response: await trello.getWebhooks(),
        client: this.client, message, _ });
      if (webhookListHandle.stop) return;
      trelloWebhook = webhookListHandle.body
        .find(twh => twh.idModel === board.id && twh.callbackURL === callbackURL);
    }

    this.client.pg.models.get('webhook').create({
      memberID: userData.trelloID,
      modelID: board.id,
      trelloWebhookID: trelloWebhook.id,
      webhookID: webhook.id,
      guildID: message.guildID,
      filters: WebhookFilters.DEFAULT.toString(),
      locale: _.locale,
      webhookToken: webhook.token
    });

    await this.client.executeWebhook(webhook.id, webhook.token, {
      embeds: [{
        type: 'rich',
        description: _('webhook_cmd.create_confirm', {
          name: Util.cutoffText(Util.Escape.markdown(board.name), 50)
        })
      }]
    });
    return message.channel.createMessage(_('webhook_cmd.created', {
      name: Util.cutoffText(Util.Escape.markdown(board.name), 50)
    }));
  }

  get metadata() { return {
    category: 'categories.webhook',
  }; }
};