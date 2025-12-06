import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes

WEBAPP_URL = "https://calmydorro.onrender.com"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("🍅 Открыть помодоро", web_app={"url": WEBAPP_URL})]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "👋 Привет! Это помодоро-таймер с аналитикой.\n\n"
        "Нажми кнопку ниже, чтобы начать:",
        reply_markup=reply_markup
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

def main():
    TOKEN = "8582598842:AAFvU07OLy-wfeY_tUmsKuQrNo1rfS9-Q28"
    
    app = ApplicationBuilder().token(TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_callback))
    
    # Render Web Service: используем polling
    print("🤖 Бот запущен в режиме polling!")
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
