let handler = async (m) => {
    m.reply(`
┌「 *donasi banh* 」
├ https://saweria.co/PangeranLord
├ https://saweria.co/PangeranLord
├ https://trakteer.id/PangeranLord/tip
└────
`.trim())
}
handler.help = ['donasi']
handler.tags = ['info']
handler.command = /^dona(te|si)$/i

module.exports = handler
