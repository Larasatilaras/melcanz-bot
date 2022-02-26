let handler  = async (m, { conn, args }) => {
   m.reply(`_*Bot Ini Menggunakan Jin:v*_\nhttps://instagram.com/pangerann21_`)
}
 
handler.help = ['sc']
handler.tags = ['info']
handler.command = /^(sc)$/i

module.exports = handler
