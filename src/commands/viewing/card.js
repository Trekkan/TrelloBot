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

module.exports = class Card extends Command {
  get name() { return 'card'; }

  get _options() { return {
    aliases: ['viewcard', 'vc'],
    cooldown: 4,
    permissions: ['embed', 'auth', 'selectedBoard']
  }; }

  get stickerMap() {
    return {
      thumbsup: '632444552845852682',
      thumbsdown: '632444552845721602',
      heart: '632444546650996746',
      star: '632444550597574666',
      clock: '632444546348744717',
      huh: '632444546583887873',
      rocketship: '632444552942452736',
      warning: '632444552837595146',
      smile: '632444553051504640',
      laugh: '632444546428436492',
      frown: '632444546634219520',
      check: '632444546684551183',

      'pete-alert': '632444547086942217',
      'pete-award': '632444547154051118',
      'pete-broken': '632444552518828033',
      'pete-busy': '632444553441443882',
      'pete-completed': '632444550018891777',
      'pete-confused': '632444550337527818',
      'pete-ghost': '632444553101705217',
      'pete-happy': '632444550337658890',
      'pete-love': '632444550413156363',
      'pete-music': '632444553239986176',
      'pete-shipped': '632444550362693642',
      'pete-sketch': '632444555668619274',
      'pete-space': '632444553311289354',
      'pete-talk': '632444553324134420',
      'pete-vacation': '632444553349169162',

      'taco-active': '632444556264210439',
      'taco-alert': '632444556276924437',
      'taco-angry': '632444553412083742',
      'taco-celebrate': '632444557920829450',
      'taco-clean': '632444555760762894',
      'taco-confused': '632444555911888898',
      'taco-cool': '632444553714204672',
      'taco-embarrassed': '632444553625993216',
      'taco-love': '632444556352421898',
      'taco-money': '632444555911757834',
      'taco-pixel': '632444550069223437',
      'taco-proto': '632444556192776205',
      'taco-reading': '632444553819062282',
      'taco-robot': '632444553810411559',
      'taco-sleeping': '632444556092112927',
      'taco-trophy': '632444556025135124'
    };
  }

  async exec(message, { args, _, trello, userData }) {
    // Get all cards for search
    const handle = await trello.handleResponse({
      response: await trello.getSlimBoard(userData.currentBoard),
      client: this.client, message, _ });
    if (handle.stop) return;
    if (Util.Trello.cannotUseBoard(handle)) {
      await this.client.pg.models.get('user').update({ currentBoard: null },
        { where: { userID: message.author.id } });
      return message.channel.createMessage(_('boards.gone'));
    }

    const boardJson = handle.body;

    const card = await Util.Trello.findCard(args[0], boardJson, this.client, message, _);
    if (!card) return;

    // Get specific card data
    const cardHandle = await trello.handleResponse({
      response: await trello.getCard(card.id),
      client: this.client, message, _ });
    if (handle.stop) return;
    if (handle.response.status === 404)
      return message.channel.createMessage(_('cards.error'));

    const json = cardHandle.body;
    const list = boardJson.lists.find(list => list.id === card.idList);

    const emojiFallback = Util.emojiFallback({ client: this.client, message });
    const checkEmoji = emojiFallback('632444546684551183', '☑️');
    const uncheckEmoji = emojiFallback('632444550115491910', '⬜');

    const due = json.due ? _.moment(json.due) : null;
    const lastAct = _.moment(json.dateLastActivity);
    const hasVoted = !!json.membersVoted.find(member => member.id === userData.trelloID);

    const embed = {
      title: Util.cutoffText(Util.Escape.markdown(json.name), 256),
      description: json.desc ? Util.cutoffText(json.desc, 2048) : undefined,
      color: this.client.config.embedColor,
      url: json.shortUrl,
      
      fields: [{
        // Information
        name: '*' + _('words.info') + '*',
        value: (json.closed ? `🗃️ **${_('words.arch_card.one')}**\n\n` : '') +
          `**${_('words.id')}:** \`${json.id}\`\n` +
          `**${_('words.short_link.one')}:** \`${json.shortLink}\`\n` +
          `**${_('words.list.one')}:** ${
            Util.cutoffText(Util.Escape.markdown(list.name), 25)} (\`${list.id}\`)\n` +
          `**${_('trello.last_act')}:** ${lastAct.format('LLLL')} *(${lastAct.fromNow()})*\n` +
          (json.due ? `**${_('trello.due')}:** ${json.dueComplete ? checkEmoji : uncheckEmoji} ${
            due.format('LLLL')} *(${due.fromNow()})*\n` : '') +
          `\n${json.subscribed ? checkEmoji : uncheckEmoji} ${_('trello.subbed')}\n` +
          (json.membersVoted.length ? `${hasVoted ? checkEmoji : uncheckEmoji} ${_('trello.voted')} (${
            _.toLocaleString(json.membersVoted.length)} ${
            _.numSuffix('words.vote_lower', json.membersVoted.length)})\n` : '')
      }]
    };

    // Cover
    if (json.cover.scaled) {
      embed.color = json.cover.edgeColor ?
        parseInt(json.cover.edgeColor.slice(1), 16) : this.client.config.embedColor;
      embed.thumbnail = { url: json.cover.scaled.reverse()[0].url };
    }

    // Labels
    if (json.labels.length) {
      const labels = Util.cutoffArray(
        json.labels.map(label => `${label.color ?
          `\`${_(`trello.label_color.${label.color}`)}\` ` :
          ''}${Util.cutoffText(Util.Escape.markdown(label.name), 50)}`),
        512, 1, 2);
      embed.fields.push({
        name: '*' + _.numSuffix('words.label', json.labels.length) + '*',
        value: labels.join(json.labels.length > 8 ? ', ' : '\n') + (labels.length !== json.labels.length ?
          `\n*${_('and_more', { count: _.toLocaleString(json.labels.length - labels.length) })}*` : ''),
        inline: true
      });
    }

    // Attachments
    if (json.attachments.length) {
      const attachments = Util.cutoffArray(
        json.attachments.map(atch =>
          `[${Util.cutoffText(Util.Escape.markdown(atch.name), 20)}](${atch.url})`),
        512, 1, 3);
      embed.fields.push({
        name: '*' + _.numSuffix('words.attachment', json.attachments.length) + '*',
        value: attachments.join(' - ') + (attachments.length !== json.attachments.length ?
          `\n*${_('and_more',
            { count: _.toLocaleString(json.attachments.length - attachments.length) })}*` : ''),
        inline: true
      });
    }

    // Stickers
    if (json.stickers.length && Util.CommandPermissions.emoji(this.client, message)) {
      const stickers = {};
      json.stickers.forEach(sticker => {
        if (stickers[sticker.image])
          stickers[sticker.image]++;
        else stickers[sticker.image] = 1;
      });
      embed.fields.push({
        name: '*' + _.numSuffix('words.sticker', json.stickers.length) + '*',
        value: Util.keyValueForEach(stickers, (key, value) =>
          `${this.stickerMap[key] ? `<:_:${this.stickerMap[key]}>` : key}${
            value > 1 ? ' ' + _.toLocaleString(value) : ''}`).join(', '),
        inline: true
      });
    }

    // Checklists
    if (json.checklists.length) {
      const checklists = Util.cutoffArray(
        json.checklists.map(checklist => {
          const completed = !checklist.checkItems.find(item => item.state === 'incomplete');
          return `${completed ? checkEmoji : uncheckEmoji} ${
            Util.cutoffText(Util.Escape.markdown(checklist.name), 50)} (${
            _.toLocaleString(checklist.checkItems.length)} ${
            _.numSuffix('words.item', checklist.checkItems.length)})`;
        }),
        256, 1, 1);
      embed.fields.push({
        name: '*' + _.numSuffix('words.checklist', json.checklists.length) + '*',
        value: checklists.join('\n') + (checklists.length !== json.checklists.length ?
          `\n*${_('and_more',
            { count: _.toLocaleString(json.checklists.length - checklists.length) })}*` : ''),
        inline: true
      });
    }

    // Members
    if (json.members.length) {
      const members = Util.cutoffArray(
        json.members.map(member => {
          const result = `${Util.cutoffText(Util.Escape.markdown(member.fullName),
            50)} (${member.username})`;
          return member.id === userData.trelloID ? `**${result}**` : result;
        }),
        256, 1, 1);
      embed.fields.push({
        name: '*' + _.numSuffix('words.member', json.members.length) + '*',
        value: members.join('\n') + (members.length !== json.members.length ?
          `\n*${_('and_more',
            { count: _.toLocaleString(json.members.length - members.length) })}*` : ''),
        inline: true
      });
    }

    return message.channel.createMessage({ embed });
  }

  get metadata() { return {
    category: 'categories.view',
  }; }
};