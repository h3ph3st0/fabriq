// src/lib/telegram.ts

export async function sendTelegramNotification(mensaje: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
  
    if (!token || !chatId) {
      console.error('Faltan variables de entorno de Telegram')
      return
    }
  
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: mensaje,
          parse_mode: 'HTML',
        }),
      })
    } catch (error) {
      console.error('Error enviando notificación Telegram:', error)
    }
  }