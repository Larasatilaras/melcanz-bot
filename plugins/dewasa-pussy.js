let fetch = require('node-fetch')

let handler = async (m, { conn, usedPrefix, command }) => {
    let res = await fetch(API('amel', '/nsfwpussy', {}, 'apikey'))
    if (!res.ok) throw eror
    let json = await res.json()
    if (!json.status) throw json
    conn.sendButtonImg(m.chat, json.url, 'Tobat banh', wm, 'lagi', `${usedPrefix + command}`, m)
}
handler.help = ['pussy']
handler.tags = ['dewasa']
handler.command = /^(pussy)$/i
handler.premium = true
handler.limit = true

module.exports = handler
