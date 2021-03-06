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

const Command = require('./Command');

module.exports = class DeprecatedCommand extends Command {
  /**
   * The options for the command
   * @type {Object}
   */
  get options() {
    const options = {
      aliases: [],
      cooldown: 0,
      listed: false,
      minimumArgs: 0,
      permissions: [],

      minimumArgsMessage: 'bad_args',
    };
    Object.assign(options, this._options);
    return options;
  }

  get replacedCommandName() {
    return 'ping';
  }

  get replacedCommand() {
    return this.client.cmds.get(this.replacedCommandName);
  }

  exec(message, { _, prefixUsed }) {
    return message.channel.createMessage(`${_('deprecated')}\n*${_('use_this')}* \`${
      prefixUsed.clean}${this.replacedCommand.name}\``);
  }

  get metadata() { return {
    category: 'categories.hidden',
  }; }
};
