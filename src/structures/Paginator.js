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
const EventEmitter = require('eventemitter3');

/**
 * A class that creates a paging process for messages
 */
class Paginator extends EventEmitter {
  /**
   * @param {TrelloBot} client The client to use
   * @param {Message} message The user's message to read permissions from
   * @param {Object} options The options for the paginator
   * @param {Array} options.items The items the paginator will display
   * @param {number} [options.itemsPerPage=15] How many items a page will have
   */
  constructor(client, message, { items = [], itemsPerPage = 15 } = {}) {
    super();
    this.messageAwaiter = client.messageAwaiter;
    this.client = client;
    this.collector = null;
    this.items = items;
    this.message = message;
    this.itemsPerPage = itemsPerPage;
    this.pageNumber = 1;
    this.reactionsCleared = false;
    this._reactBind = this._react.bind(this);
  }

  /**
   * All pages in the paginator
   * @type {Array<Array>}
   */
  get pages() {
    const pages = [];
    let i, j, page;
    for (i = 0, j = this.items.length; i < j; i += this.itemsPerPage) {
      page = this.items.slice(i, i + this.itemsPerPage);
      pages.push(page);
    }
    return pages;
  }

  /**
   * The current page
   * @type {Array}
   */
  get page() {
    return this.pages[this.pageNumber - 1];
  }

  /**
   * The current page number
   * @type {number}
   */
  get maxPages() {
    return Math.ceil(this.items.length / this.itemsPerPage);
  }

  /**
   * Changes the page number
   * @param {number} newPage The page to change to
   */
  toPage(newPage) {
    if (Number(newPage)){
      this.pageNumber = Number(newPage);
      if (this.pageNumber < 1) this.pageNumber = 1;
      if (this.pageNumber > this.maxPages) this.pageNumber = this.maxPages;
    }
    return this;
  }

  /**
   * Moves to the next page
   */
  nextPage() {
    return this.toPage(this.pageNumber + 1);
  }

  /**
   * Moves to the previous page
   */
  previousPage() {
    return this.toPage(this.pageNumber - 1);
  }

  /**
   * Whether or not this instance can paginate
   * @returns {boolean}
   */
  canPaginate() {
    return this.message.channel.type === 1 ||
      this.message.channel.permissionsOf(this.client.user.id).has('addReactions');
  }

  /**
   * Whether or not this instance can manage messages
   * @returns {boolean}
   */
  canManage() {
    return this.message.channel.type !== 1 &&
      this.message.channel.permissionsOf(this.client.user.id).has('manageMessages');
  }

  /**
   * Starts the reaction collector and pagination
   * @param {string} userID The user's ID that started the process
   * @param {number} timeout
   */
  async start(userID, timeout) {
    this.reactionsCleared = false;
    if (this.maxPages > 1 && this.canPaginate()) {
      try {
        await Promise.all([
          this.message.addReaction(Paginator.PREV),
          this.message.addReaction(Paginator.STOP),
          this.message.addReaction(Paginator.NEXT),
        ]);
        this.collector = this.messageAwaiter.createReactionCollector(this.message, userID, timeout);
        this._hookEvents();
      } catch (e) {
        return this.clearReactions();
      }
    }
  }

  /**
   * Clears reaction from the message
   */
  async clearReactions() {
    if (!this.reactionsCleared) {
      this.reactionsCleared = true;
      this.emit('clearReactions');
      try {
        if (!this.canManage())
          await Promise.all([
            this.message.removeReaction(Paginator.NEXT).catch(() => {}),
            this.message.removeReaction(Paginator.STOP).catch(() => {}),
            this.message.removeReaction(Paginator.PREV).catch(() => {})
          ]);
        else
          await this.message.removeReactions().catch(() => {});
      } catch (e) {
        // Do nothing
      }
    }
  }

  /**
   * @private
   */
  _hookEvents() {
    this.collector.on('reaction', this._react.bind(this));
    this.collector.once('end', this.clearReactions.bind(this));
  }

  /**
   * @private
   */
  _change() {
    this.emit('change', this.pageNumber);
  }

  /**
   * @private
   */
  _react(emoji, userID) {
    const oldPage = this.pageNumber;
    if (Paginator.PREV == emoji.name)
      this.previousPage();
    else if (Paginator.NEXT == emoji.name)
      this.nextPage();
    else if (Paginator.STOP == emoji.name)
      this.collector.end();
    if (this.pageNumber !== oldPage)
      this._change();
    if ([Paginator.PREV, Paginator.STOP, Paginator.NEXT].includes(emoji.name) && this.canManage())
      this.message.removeReaction(emoji.name, userID).catch(() => {});
    this.collector.restart();
  }
}

Paginator.PREV = '⬅️';
Paginator.STOP = '🛑';
Paginator.NEXT = '➡️';

module.exports = Paginator;