let fetch = require('node-fetch')

let handler = async (m, { conn, usedPrefix, command }) => {
    let res = await fetch(API('amel', '/nsfwblowjob', {}, 'apikey'))
    if (!res.ok) throw eror
    let json = await res.json()
    if (!json.status) throw json
    conn.sendButtonImg(m.chat, json.url, '_*Tobat Om/Tante:v*_', wm, 'lagi', `${usedPrefix + command}`, m)
}
handler.help = ['blowjob']
handler.tags = ['dewasa']
handler.command = /^(blowjob)$/i
handler.premium = true
handler.limit = true

module.exports = handler
