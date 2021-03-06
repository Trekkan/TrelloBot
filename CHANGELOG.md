# Additions
- **Localization support** (`T!locale`)
- **Customizable prefixes** (`T!prefix`)
- Webhooks have locales and whitelist/blacklist
- Commands
  - `T!github`
  - `T!locale`
  - `T!prefix`
  - `T!star`
  - `T!editcard`
  - `T!editlist`
  - `T!editboard`
  - `T!comment`
  - `T!cleardata`
  - `T!reloadone` - *Developer command*
  - `T!reloadlocale` - *Developer command*
- Command aliases
  - `T!help` -> `T!h`, `T!yardim`, `T!yardım`, `T!komutlar`, `T!ajuda`
  - `T!info` -> `T!i`, `T!bot`, `T!information`, `T!bilgi`, `T!informacion`
  - `T!ping` -> `T!p`
  - `T!shardinfo` -> `T!shards`
  - `T!board` -> `T!viewboard`, `T!vb`
  - `T!boards` -> `T!viewboards`, `T!vbs`
  - `T!lists` -> `T!viewlists`, `T!vls`
  - `T!card` -> `T!viewcard`, `T!vc`
  - `T!listarchive` -> `T!viewlistarchive`, `T!vla`
  - `T!cardarchive` -> `T!viewcardarchive`, `T!vca`
  - `T!watchcard` -> `T!subscribecard`, `T!subcard`, `T!wcard`, `T!wc`
  - `T!watchlist` -> `T!subscribelist`, `T!sublist`, `T!wlist`, `T!wl`
  - `T!watch` -> `T!subscribeboard`, `T!subboard`, `T!watchboard`, `T!wboard`, `T!wb`
  - `T!remwebhook` -> `T!rwebhook`, `T!rwh`, `T!-wh`
- Board/Card/List/Label referencing can be used by using their IDs, short links or names.
- Argument interpreter - *Supports quoted arguments*
- MessageAwaiter, Paginator, ReactionCollector, Halts, etc. - *Allows for pagination requests and awaited messages*

# Changes
- Using Postgres instead of RethinkDB
- Using Eris instead of Discord.JS
- Webhook server reworked
- Commands
  - `T!help` - Changed embed format
  - `T!board` - New format shows board background, background colors, and board settings
  - `T!boards`, `T!switch` - Stars and watch emojis show at the left of the IDs
  - `T!card`
    - New format shows IDs, checklists, cover and if the due date was completed or not
    - Allowed archive cards to be shown
  - `T!list`
    - New format shows IDs, name, if watched
    - Allowed archive lists to be shown
  - `T!addwebhook`
    - Can use an existing webhook or create a new one from scratch
  - `T!editwebhook`
    - Can be used to delete webhooks
    - Can filter lists/cards, change filter flags
    - Can use different locales
    - Has a repair function

# Fixes
 - Board commands properly support archived boards

# Removals
- Commands
  - `T!editdesc` (in favor of `T!editcard`)
  - `T!renamecard` (in favor of `T!editcard`)
  - `T!closecard` (in favor of `T!editcard`)
  - `T!closelist` (in favor of `T!editlist`)
  - `T!opencard` (in favor of `T!editcard`)
  - `T!openlist` (in favor of `T!editlist`)
  - `T!renamelist` (in favor of `T!editlist`)
  - `T!mutewebhook` (in favor of `T!editwebhook`)
  - `T!unmutewebhook` (in favor of `T!editwebhook`)
  - `T!webbits`
  - `T!purgehooks` (in favor of `T!editwebhook`'s repair subcommand)
  - `T!cardattach` (in favor of `T!editcard`)
- Command aliases
  - `T!help` -> `T!❓`, `T!❔`
  - `T!info` -> `T!ℹ`
