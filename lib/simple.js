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
