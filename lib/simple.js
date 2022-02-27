}
    async send2ButtonLoc(jid, path, content, footer, button1, row1, button2, row2, quoted, options = {}) {
      let type = await this.getFile(path)
      let { res, data: file } = type
      if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
      }
      return await this.sendMessage(jid, {
        locationMessage: { jpegThumbnail: file },
        contentText: content,
        footerText: footer,
        buttons: [
          { buttonId: row1, buttonText: { displayText: button1 }, type: 1 },
          { buttonId: row2, buttonText: { displayText: button2 }, type: 1 }
        ],
        headerType: 6
      }, MessageType.buttonsMessage, { contextInfo: { mentionedJid: this.parseMention(content + footer) }, quoted, ...options })
    }
    async send3ButtonLoc(jid, path, content, footer, button1, row1, button2, row2, button3, row3, quoted, options = {}) {
      let type = await this.getFile(path)
      let { res, data: file } = type
      if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
      }
      return await this.sendMessage(jid, {
        locationMessage: { jpegThumbnail: file },
        contentText: content,
        footerText: footer,
        buttons: [
          { buttonId: row1, buttonText: { displayText: button1 }, type: 1 },
          { buttonId: row2, buttonText: { displayText: button2 }, type: 1 },
          { buttonId: row3, buttonText: { displayText: button3 }, type: 1 }
        ],
        headerType: 6
      }, MessageType.buttonsMessage, { contextInfo: { mentionedJid: this.parseMention(content + footer) }, quoted, ...options })
    }

    /**
    * Send a list message
    * @param jid the id to send to
    * @param button the optional button text, title and description button
    * @param rows the rows of sections list message
    */
    async sendListM(jid, button, rows, quoted, options) {
      let messageList = WAMessageProto.Message.fromObject({
        listMessage: WAMessageProto.ListMessage.fromObject({
          buttonText: button.buttonText,
          description: button.description,
          listType: 1,
          sections: [
            {
              title: button.title,
              rows: [...rows]
            }
          ]
        })
      })
      let waMessageList = await this.prepareMessageFromContent(jid, messageList, { quoted, contextInfo: { mentionedJid: this.parseMention(button.description), ...options } })
      return await this.relayWAMessage(waMessageList, { waitForAck: true })
    }

    /**
     * Send Media/File with Automatic Type Specifier
     * @param {String} jid
     * @param {String|Buffer} path
     * @param {String} filename
     * @param {String} caption
     * @param {Object} quoted
     * @param {Boolean} ptt
     * @param {Object} options
     */
    async sendFile(jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
      let type = await this.getFile(path)
      let { res, data: file } = type
      if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
      }
      let opt = { filename, caption }
      if (quoted) opt.quoted = quoted
      if (!type) if (options.asDocument) options.asDocument = true
      let mtype = ''
      if (options.asSticker) mtype = MessageType.sticker
      else if (!options.asDocument && !options.type) {
        if (options.force) file = file
        else if (/audio/.test(type.mime)) file = await (ptt ? toPTT : toAudio)(file, type.ext)
        // else if (/video/.test(type.mime)) file = await toVideo(file, type.ext)
        if (/webp/.test(type.mime) && file.length <= 1 << 20) mtype = MessageType.sticker
        else if (/image/.test(type.mime)) mtype = MessageType.image
        else if (/video/.test(type.mime)) {
          try { return await this.sendVideo(jid, file, caption, quoted, { ...opt, ...options }) }
          catch (e) {
            console.error('Error send video using sendVideo, retrying using sendMessage... ', e)
            file = await toVideo(file, type.ext)
            mtype = MessageType.video
          }
        }
        else opt.displayName = opt.caption = filename
        if (options.asGIF && mtype === MessageType.video) mtype = MessageType.gif
        if (/audio/.test(type.mime)) {
          mtype = MessageType.audio
          if (!ptt) opt.mimetype = 'audio/mp4'
          opt.ptt = ptt
        } else if (/pdf/.test(type.ext)) mtype = MessageType.pdf
        else if (!mtype) {
          mtype = MessageType.document
          opt.mimetype = type.mime
        }
      } else {
        mtype = options.type ? options.type : MessageType.document
        opt.mimetype = type.mime
      }
      delete options.asDocument
      delete options.asGIF
      delete options.asSticker
      delete options.type
      if (mtype === MessageType.document) opt.title = filename
      if (mtype === MessageType.sticker || !opt.caption) delete opt.caption
      return await this.sendMessage(jid, file, mtype, { ...opt, ...options })
    }

    /**
     * Reply to a message
     * @param {String} jid
     * @param {String|Object} text
     * @param {Object} quoted
     * @param {Object} options
     */
    reply(jid, text, quoted, options) {
      return Buffer.isBuffer(text) ? this.sendFile(jid, text, 'file', '', quoted, false, options) : this.sendMessage(jid, text, MessageType.extendedText, { contextInfo: { mentionedJid: this.parseMention(text) }, quoted, ...options })
    }

    /**
     * Fake Replies
     * @param {String} jid
     * @param {String|Object} text
     * @param {String} fakeJid
     * @param {String} fakeText
     * @param {String} fakeGroupJid
     * @param {String} options
     */
    fakeReply(jid, text = '', fakeJid = this.user.jid, fakeText = '', fakeGroupJid, options) {
      return this.reply(jid, text, { key: { fromMe: fakeJid == this.user.jid, participant: fakeJid, ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {}) }, message: { conversation: fakeText }, ...options }, { contextInfo: { mentionedJid: this.parseMention(text + fakeText) } })
    }

    /**
     * Fake replies #2
     * @param {String} jid
     * @param {String|Object} message
     * @param {String} type
     * @param {String} sender
     * @param {String|Object} message2
     * @param {String} type2
     * @param {Object} options
     * @param {Object} options2
     * @param {String} remoteJid
     */
    async fakeReply2(jid, message, type, sender, message2, type2, options = {}, options2 = {}, remoteJid) {
      let quoted = await this.prepareMessage(jid, message2, type2, options2)
      quoted = this.cMod(jid, quoted, undefined, sender)
      if (remoteJid) quoted.key.remoteJid = remoteJid
      else delete quoted.key.remoteJid

      return await this.prepareMessage(jid, message, type, { quoted, ...options })
    }

    /**
     * Parses string into mentionedJid(s)
     * @param {String} text
     */
    parseMention(text = '') {
      return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
    }

    /**
     * Get name from jid
     * @param {String} jid
     * @param {Boolean} withoutContact
     */
    getName(jid, withoutContact = false) {
      withoutContact = this.withoutContact || withoutContact
      let chat
      let v = jid.endsWith('@g.us') ? (chat = this.chats.get(jid) || {}) && chat.metadata || {} : jid === '0@s.whatsapp.net' ? {
        jid,
        vname: 'WhatsApp'
      } : jid === this.user.jid ?
        this.user :
        this.contactAddOrGet(jid)
      return (withoutContact ? '' : v.name) || v.subject || v.vname || v.notify || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    /**
     * Download media message
     * @param {Object} m
     */
    async downloadM(m) {
      if (!m) return Buffer.alloc(0)
      if (!m.message) m.message = { m }
      if (!m.message[Object.keys(m.message)[0]].url) await this.updateMediaMessage(m)
      return await this.downloadMediaMessage(m)
    }

    /**
     * Serialize Message, so it easier to manipulate
     * @param {Object} m
     */
    serializeM(m) {
      return exports.smsg(this, m)
    }

    /**
     * ms to date
     * @param {String} ms
     */
    msToDate(ms) {
      let days = Math.floor(ms / (24 * 60 * 60 * 1000));
      let daysms = ms % (24 * 60 * 60 * 1000);
      let hours = Math.floor((daysms) / (60 * 60 * 1000));
      let hoursms = ms % (60 * 60 * 1000);
      let minutes = Math.floor((hoursms) / (60 * 1000));
      let minutesms = ms % (60 * 1000);
      let sec = Math.floor((minutesms) / (1000));
      return days + " D " + hours + " H " + minutes + " M";
      // +minutes+":"+sec;
    }

    /**
     * merge arrays
     * @param {Array} arr
     */
    join(arr) {
      let construct = []
      for (let i = 0; i < arr.length; i++) {
        construct = construct.concat(arr[i])
      } return construct
    }

    /**
     * 
     * @param {Array} list 
     * @returns 
     */
    pickRandom(list) {
      return list[Math.floor(list.length * Math.random())]
    }

    /**
     * 
     * @param {String} ext 
     * @returns 
     */
    getRandom(ext) {
      return `${Math.floor(Math.random() * 10000)}${ext}`
    }

    /**
     * 
     * @param {Number} ms 
     * @returns 
     */
    delay(ms) {
      return new Promise((resolve, reject) => setTimeout(resolve, ms))
    }

    /**
     * 
     * @param {String} text 
     * @returns 
     */
    filter(text) {
      let mati = ["q", "w", "r", "t", "y", "p", "s", "d", "f", "g", "h", "j", "k", "l", "z", "x", "c", "v", "b", "n", "m"]
      if (/[aiueo][aiueo]([qwrtypsdfghjklzxcvbnm])?$/i.test(text)) return text.substring(text.length - 1)
      else {
        let res = Array.from(text).filter(v => mati.includes(v))
        let resu = res[res.length - 1]
        for (let huruf of mati) {
          if (text.endsWith(huruf)) {
            resu = res[res.length - 2]
          }
        }
        let misah = text.split(resu)
        return resu + misah[misah.length - 1]
      }
    }

    /**
     * 
     * @param  {...any} args 
     * @returns 
     */
    format(...args) {
      return util.format(...args)
    }

  /**
     * 
     * @param {String} url 
     * @param {Object} options 
     * @returns 
     */
    async getBuffer(url, options) {
      try {
        options ? options : {}
        const res = await axios({
          method: "get",
          url,
          headers: {
            'DNT': 1,
            'Upgrade-Insecure-Request': 1
          },
          ...options,
          responseType: 'arraybuffer'
        })
        return res.data
      } catch (e) {
        console.log(`Error : ${e}`)
      }
    }

    /**
     * 
     * @param {Number} ms 
     * @returns 
     */
    clockString(ms) {
      let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
      let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
      let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
      return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
    }

    /**
     * 
     */
    ucapan() {
      const time = moment.tz('Asia/Jakarta').format('HH')
      let res = "Selamat dinihari"
      if (time >= 4) {
        res = "Selamat pagi"
      }
      if (time > 10) {
        res = "Selamat siang"
      }
      if (time >= 15) {
        res = "Selamat sore"
      }
      if (time >= 18) {
        res = "Selamat malam"
      }
      return res
    }
  }

  return WAConnection
}


/**
 * Serialize Message
 * @param {WAConnection} conn
 * @param {Object} m
 * @param {Boolean} hasParent
 */
exports.smsg = (conn, m, hasParent) => {
  if (!m) return m
  let M = WAMessageProto.WebMessageInfo
  if (m.key) {
    m.id = m.key.id
    m.isBaileys = m.id.startsWith('3EB0') && m.id.length === 12
    m.chat = m.key.remoteJid
    m.fromMe = m.key.fromMe
    m.isGroup = m.chat.endsWith('@g.us')
    m.sender = m.fromMe ? conn.user.jid : m.participant ? m.participant : m.key.participant ? m.key.participant : m.chat
  }
  if (m.message) {
    m.mtype = Object.keys(m.message)[0]
    m.msg = m.message[m.mtype]
    if (m.mtype === 'ephemeralMessage') {
      exports.smsg(conn, m.msg)
      m.mtype = m.msg.mtype
      m.msg = m.msg.msg
    }
    let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
    if (m.quoted) {
      let type = Object.keys(m.quoted)[0]
      m.quoted = m.quoted[type]
      if (['productMessage'].includes(type)) {
        type = Object.keys(m.quoted)[0]
        m.quoted = m.quoted[type]
      }
      if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
      m.quoted.mtype = type
      m.quoted.id = m.msg.contextInfo.stanzaId
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
      m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('3EB0') && m.quoted.id.length === 12 : false
      m.quoted.sender = m.msg.contextInfo.participant
      m.quoted.fromMe = m.quoted.sender === (conn.user && conn.user.jid)
      m.quoted.text = m.quoted.text || m.quoted.caption || ''
      m.quoted.mentionedJid = m.quoted.contextInfo ? m.quoted.contextInfo.mentionedJid : []
      m.getQuotedObj = m.getQuotedMessage = async () => {
        if (!m.quoted.id) return false
        let q = await conn.loadMessage(m.chat, m.quoted.id)
        return exports.smsg(conn, q)
      }
      let vM = m.quoted.fakeObj = M.fromObject({
        key: {
          fromMe: m.quoted.fromMe,
          remoteJid: m.quoted.chat,
          id: m.quoted.id
        },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {})
      })
      if (m.quoted.url) m.quoted.download = (type = 'buffer') => conn.downloadM(vM, type)
      /**
       * Reply to quoted message
       * @param {String|Object} text
       * @param {String|false} chatId
       * @param {Object} options
       */
      m.quoted.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, vM, options)
      /**
       * Copy quoted message
       */
      m.quoted.copy = () => exports.smsg(conn, M.fromObject(M.toObject(vM)))
      /**
       * Forward quoted message
       * @param {String} jid
       * @param {Boolean} forceForward
       */
      m.quoted.forward = (jid, forceForward = false) => conn.forwardMessage(jid, vM, forceForward)
      /**
       * Exact Forward quoted message
       * @param {String} jid
       * @param {Boolean} forceForward
       * @param {Object} options
       */
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options)
      /**
       * Modify quoted Message
       * @param {String} jid
       * @param {String} text
       * @param {String} sender
       * @param {Object} options
       */
      m.quoted.cMod = (jid, text = '', sender = m.quoted.sender, options = {}) => conn.cMod(jid, vM, text, sender, options)
      /**
       * Delete quoted message
       */
      m.quoted.delete = () => conn.deleteMessage(m.quoted.chat, vM.key)
    }
    if (m.msg.url) m.download = (type = 'buffer') => conn.downloadM(m, type)
    m.text = (m.mtype == 'listResponseMessage' ? m.msg.singleSelectReply.selectedRowId : '') || m.msg.text || m.msg.caption || m.msg || ''
    /**
     * Reply to this message
     * @param {String|Object} text
     * @param {String|false} chatId
     * @param {Object} options
     */
    m.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m, options)
    /**
     * Copy this message
     */
    m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)))
    /**
     * Forward this message
     * @param {String} jid
     * @param {Boolean} forceForward
     */
    m.forward = (jid = m.chat, forceForward = false) => conn.forwardMessage(jid, m, forceForward)
    /**
     * Exact Forward this message
     * @param {String} jid
     * @param {Boolean} forceForward
     * @param {Object} options
     */
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)
    /**
     * Modify this Message
     * @param {String} jid
     * @param {String} text
     * @param {String} sender
     * @param {Object} options
     */
    m.cMod = (jid, text = '', sender = m.sender, options = {}) => conn.cMod(jid, m, text, sender, options)
  }
  return m
}

exports.logic = (check, inp, out) => {
  if (inp.length !== out.length) throw new Error('Input and Output must have same length')
  for (let i in inp) if (util.isDeepStrictEqual(check, inp[i])) return out[i]
  return null
}

/**
 * generateThumbnail
 * @param {String} file 
 * @param {*} mediaType 
 * @param {*} info 
 */
async function generateThumbnail(file, mediaType, info) {
  const alternate = (Buffer.alloc(1)).toString('base64')
  if ('thumbnail' in info) {
    // don't do anything if the thumbnail is already provided, or is null
    if (mediaType === MessageType.audio) {
      throw new Error('audio messages cannot have thumbnails')
    }
  } else if (mediaType === MessageType.image) {
    try {
      const buff = await compressImage(file)
      info.thumbnail = buff.toString('base64')
    } catch (err) {
      console.error(err)
      info.thumbnail = alternate
    }
  } else if (mediaType === MessageType.video) {
    const imgFilename = path.join(tmpdir(), generateMessageID() + '.jpg')
    try {
      try {
        await extractVideoThumb(file, imgFilename, '00:00:00', { width: 48, height: 48 })
        const buff = await fs.promises.readFile(imgFilename)
        info.thumbnail = buff.toString('base64')
        await fs.promises.unlink(imgFilename)
      } catch (e) {
        console.error(e)
        info.thumbnail = alternate
      }
    } catch (err) {
      console.log('could not generate video thumb: ' + err)
    }
  }
}

/**
 * 
 * @param {String} path 
 * @param {*} destPath 
 * @param {String} time ('00:00:00')
 * @param {{width: Number, height: Number}} size 
 * @returns 
 */
const extractVideoThumb = async (
  path,
  destPath,
  time,
  size = {},
) =>
  new Promise((resolve, reject) => {
    const cmd = `ffmpeg -ss ${time} -i ${path} -y -s ${size.width}x${size.height} -vframes 1 -f image2 ${destPath}`
    exec(cmd, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

/**
 * download video from url or buffer
 * @param {String|Buffer} media 
 * @returns Buffer
 */
async function download(media, mime, callback) {
  if (Buffer.isBuffer(media)) {
    if (typeof callback == 'function') await callback({ buffer: media, filename: '' })
    return media
  }
  let filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + mime)
  let buffer
  try {
    let totalErr = 0
    await request(media).pipe(await fs.createWriteStream(filename)).on('finish', async () => {
      buffer = await fs.readFileSync(filename)
      if (typeof callback == 'function') await callback({ buffer, filename })
    })
    if (fs.existsSync(filename)) await fs.unlinkSync(filename)
    return filename
  } catch (err) {
    try {
      let res = await fetch(media)
      await res.body.pipe(await fs.createWriteStream(filename)).on('finish', async () => {
        buffer = await fs.readFileSync(filename)
        if (typeof callback == 'function') await callback({ buffer, filename })
      })
      if (fs.existsSync(filename)) await fs.unlinkSync(filename)
      return filename
    } catch (e) {
      throw e
    }
  }
  return filename
}
