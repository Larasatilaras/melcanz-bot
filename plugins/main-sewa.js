let fetch = require('node-fetch')
let handler = async (m, { conn }) => {
    pepe = 'https://telegra.ph/file/0dfb35a7c7d0ada2e75d1.jpg'
    baper = await fetch(pepe).then(a => a.buffer())
    let listMessage = {
        "title": "melcanz-bot",
        "description": `
*KOKO PANGERAN*
        
1 Grup / 30 Hari
Rp. 15,000 Dana, Ovo
Rp. 20,000 Pulsa Axis/XL

1 Premium / 30 Hari
Rp. 5,000 Dana, Ovo
Rp. 10,000 Pulsa Axis/XL

tertarik? hubungi:
@6287832147584 (Pangeran)
`.trim(),
        "listType": "PRODUCT_LIST",
        "productListInfo": {
            "productSections": [
                {
                    "title": "Klik untuk melihat harga",
                    "products": [
                        {
                            "productId": "4696956640315324"
                        }
                    ]
                }
            ],
            "headerImage": {
                "productId": "4696956640315324",
                "jpegThumbnail": baper
            },
            "businessOwnerJid": "6283128734012@s.whatsapp.net"
        },
        "footerText": "wa.me/6287832147584"
    }
    conn.sendMessage(m.chat, listMessage, 'listMessage', { quoted: m, contextInfo: { mentionedJid: conn.parseMention(listMessage.description) } })
}
handler.help = ['sewabot']
handler.tags = ['main']
handler.command = /^sewa(bot|melcanz)$/i

module.exports = handler
