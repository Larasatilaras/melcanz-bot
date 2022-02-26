let fetch = require('node-fetch')

let handler = async (m, { conn, usedPrefix, command }) => {
    let res = await fetch(API('amel', '/nsfwcumarts', {}, 'apikey'))
    if (!res.ok) throw eror
    let json = await res.json()
    if (!json.status) throw json
    conn.sendButtonImg(m.chat, json.url, '_*Tobat Om/Tante:v*_', wm, 'lagi', `${usedPrefix + command}`, m)
}
handler.help = ['cumarts']
handler.tags = ['dewasa']
handler.command = /^(cumarts)$/i
handler.premium = true
handler.limit = true

module.exports = handler
