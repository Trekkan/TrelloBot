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
const Util = require('../../util');

module.exports = class Me extends Command {
  get name() { return 'me'; }

  get _options() { return {
    aliases: ['mi', 'account', 'acct'],
    cooldown: 2,
    permissions: ['embed', 'auth'],
  }; }

  async exec(message, { _, trello, userData }) {
    const handle = await trello.handleResponse({
      response: await trello.getMember(userData.trelloID),
      client: this.client, message, _ });
    if (handle.stop) return;
    if (handle.response.status === 404) {
      await this.client.pg.models.get('user').removeAuth(message.author);
      return message.channel.createMessage(_('trello_response.unauthorized'));
    }

    const json = handle.body;

    const emojiFallback = Util.emojiFallback({ client: this.client, message });
    const checkEmoji = emojiFallback('632444546684551183', '☑️');
    const uncheckEmoji = emojiFallback('632444550115491910', '⬜');

    const embed = {
      author: {
        name: json.prefs.privacy.fullName !== 'public' ?
          json.username : `${Util.cutoffText(Util.Escape.markdown(json.fullName),
            253 - json.username.length)} (${json.username})`,
        icon_url: json.prefs.privacy.avatar !== 'public' ? null :
          (json.avatarUrl ? json.avatarUrl + '/170.png' : null),
        url: json.url
      },

      color: this.client.config.embedColor,
      description: `**${_('words.id')}:** \`${json.id}\`\n` +
        `**${_('words.initials')}:** ${json.initials}\n`,
      
      fields: [{
        // Counts
        name: '*' + _('words.count.many') + '*',
        value: `${_.toLocaleString(json.boards.length)} ${_.numSuffix('words.board', json.boards.length)}\n` +
          `${_.toLocaleString(json.idOrganizations.length)} ${
            _.numSuffix('words.orgs', json.idOrganizations.length)}`,
        inline: true
      }, {
        // Preferences
        name: '*' + _('words.pref.many') + '*',
        value: `**${_('trello.locale')}:** ${json.prefs.locale}\n\n` +
          `${json.prefs.colorBlind ? checkEmoji : uncheckEmoji} ${_('trello.colorblind')}\n` +
          `${json.prefs.sendSummaries ? checkEmoji : uncheckEmoji} ${_('trello.summ')}\n` +
          `${json.marketingOptIn.optedIn ? checkEmoji : uncheckEmoji} ${_('trello.marketing')}`,
        inline: true
      }]
    };

    // Products
    if (json.products.length) {
      const products = [];
      json.products.forEach(productID => {
        if (_.valid(`trello.products.${productID}`))
          products.push(_(`trello.products.${productID}`));
      });
      embed.fields.push({
        name: '*' + _.numSuffix('words.product', json.products.length) + '*',
        value: products.join('\n')
      });
    }

    // Bio
    if (json.bio)
      embed.fields.push({
        name: '*' + _('words.bio') + '*',
        value: Util.Escape.markdown(json.bio)
      });
    return message.channel.createMessage({ embed });
  }

  get metadata() { return {
    category: 'categories.user',
  }; }
};