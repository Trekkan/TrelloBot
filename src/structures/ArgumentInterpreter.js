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

/**
 * A class that iterates a string's index
 * @see ArgumentInterpreter
 */
class StringIterator {
  /**
   * @param {string} string The string to iterate through
   */
  constructor(string) {
    this.string = string;
    this.index = 0;
    this.previous = 0;
    this.end = string.length;
  }

  /**
   * Get the character on an index and moves the index forward.
   * @returns {?string}
   */
  get() {
    const nextChar = this.string[this.index];
    if (!nextChar)
      return nextChar;
    else {
      this.previous += this.index;
      this.index += 1;
      return nextChar;
    }
  }

  /**
   * Reverts to the previous index.
   */
  undo() {
    this.index = this.previous;
  }

  /**
   * The previous character that was used
   * @type {string}
   */
  get prevChar() {
    return this.string[this.previous];
  }

  /**
   * Whether or not the index is out of range
   * @type {boolean}
   */
  get inEOF() {
    return this.index >= this.end;
  }
}

/**
 * Parses arguments from a message.
 */
class ArgumentInterpreter {
  /**
   * @param {string} string The string that will be parsed for arguments
   * @param {?Object} options The options for the interpreter
   * @param {?boolean} [options.allowWhitespace=false] Whether to allow whitespace characters in the arguments
   */
  constructor(string, { allowWhitespace = false } = {}) {
    this.string = string;
    this.allowWhitespace = allowWhitespace;
  }

  /**
   * Parses the arguements as strings.
   * @returns {Array<String>}
   */
  parseAsStrings() {
    const args = [];
    let currentWord = '';
    let quotedWord = '';
    const string = this.allowWhitespace ? this.string : this.string.trim();
    const iterator = new StringIterator(string);
    while (!iterator.inEOF) {
      const char = iterator.get();
      if (char === undefined) break;

      if (this.isOpeningQuote(char) && iterator.prevChar !== '\\') {
        currentWord += char;
        const closingQuote = ArgumentInterpreter.QUOTES[char];

        // Quote iteration
        while (!iterator.inEOF) {
          const quotedChar = iterator.get();

          // Unexpected EOF
          if (quotedChar === undefined) {
            args.push(...currentWord.split(' '));
            break;
          }

          if (quotedChar == '\\') {
            currentWord += quotedChar;
            const nextChar = iterator.get();

            if (nextChar === undefined) {
              args.push(...currentWord.split(' '));
              break;
            }

            currentWord += nextChar;
            // Escaped quote
            if (ArgumentInterpreter.ALL_QUOTES.includes(nextChar)) {
              quotedWord += nextChar;
            } else {
              // Ignore escape
              quotedWord += quotedChar + nextChar;
            }
            continue;
          }

          // Closing quote
          if (quotedChar == closingQuote) {
            currentWord = '';
            args.push(quotedWord);
            quotedWord = '';
            break;
          }
 
          currentWord += quotedChar;
          quotedWord += quotedChar;
        }
        continue;
      }

      if (/^\s$/.test(char)) {
        if (currentWord)
          args.push(currentWord);
        currentWord = '';
        continue;
      }

      currentWord += char;
    }

    if (currentWord.length)
      args.push(...currentWord.split(' '));
    return args;
  }

  /**
   * Checks whether or not a character is an opening quote
   * @param {string} char The character to check
   */
  isOpeningQuote(char) {
    return Object.keys(ArgumentInterpreter.QUOTES).includes(char);
  }
}

// Opening / Closing
ArgumentInterpreter.QUOTES = {
  '"': '"',
  '‘': '’',
  '‚': '‛',
  '“': '”',
  '„': '‟',
  '⹂': '⹂',
  '「': '」',
  '『': '』',
  '〝': '〞',
  '﹁': '﹂',
  '﹃': '﹄',
  '＂': '＂',
  '｢': '｣',
  '«': '»',
  '‹': '›',
  '《': '》',
  '〈': '〉',
};

ArgumentInterpreter.ALL_QUOTES = Object.keys(ArgumentInterpreter.QUOTES)
  .map(i => ArgumentInterpreter.QUOTES[i])
  .concat(Object.keys(ArgumentInterpreter.QUOTES));

ArgumentInterpreter.StringIterator = StringIterator;

module.exports = ArgumentInterpreter;