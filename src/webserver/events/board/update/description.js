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

exports.name = 'UPDATE_BOARD_DESC';

exports.exec = async data => {
  const _ = data.localeModule;
  const title = !data.oldData.desc ? 'webhooks.add_board_desc' :
    (!data.card.desc ? 'webhooks.rem_board_desc' : 'webhooks.edit_board_desc');
  return data.send({
    title: _(title, {
      member: data.invoker.webhookSafeName,
      board: data.util.cutoffText(data.board.name, 50)
    }),
    description: '',
    fields: [{
      name: '*' + _('trello.old_desc') + '*',
      value: data.util.cutoffText(data.oldData.desc, 1024),
      inline: true
    }, {
      name: '*' + _('trello.new_desc') + '*',
      value: data.util.cutoffText(data.card.desc, 1024),
      inline: true
    }].filter(v => !!v.value)
  });
};