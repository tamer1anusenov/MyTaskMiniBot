How to Run Locally:
1. Install dependencies: pip install -r requirements.txt
2. Run the application: python -m app.main
3. Visit: http://localhost:8000

Telegram Mini App Access:
1. Set TELEGRAM_BOT_TOKEN to your bot token and TELEGRAM_ALLOWED_USER_ID to your user ID (via @userinfobot).
2. Telegram provides signed initData when launching the Mini App; the backend validates that payload and rejects any other users.
3. Only the whitelisted Telegram ID can open the tasks page without additional passwords.