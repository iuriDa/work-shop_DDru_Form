const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ATHLETE_PRICE = 18500;
const COACH_PRICE = 10000;

function clean(v, max = 500) { return String(v ?? '').trim().slice(0, max); }
function integer(v, fallback = 0) { const n = Number.parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : fallback; }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = req.body || {};
    if (b.website) return res.status(200).json({ ok: true }); // honeypot

    const type = clean(b.type, 40);
    const contact = clean(b.contact, 120);
    const phone = clean(b.phone, 50);
    if (!type || !contact || !phone || b.consent !== true) return res.status(400).json({ error: 'Заполните обязательные поля.' });

    const athletes = type === 'group' ? Math.max(1, integer(b.athletes, 1)) : 1;
    const coaches = type === 'group' ? integer(b.coaches, 0) : 0;
    const athleteTotal = athletes * ATHLETE_PRICE;
    const coachTotal = coaches * COACH_PRICE;
    const total = athleteTotal + coachTotal;

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    const typeLabel = type === 'group' ? 'Группа / клуб' : type === 'parent' ? 'Родитель' : 'Участник самостоятельно';

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Заявки!A:T',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[
        now, typeLabel, clean(b.club,120), clean(b.city,100), contact,
        type === 'group' ? 'Тренер / руководитель группы' : type === 'parent' ? 'Родитель' : 'Спортсмен',
        phone, clean(b.social,120), athletes, coaches, clean(b.age,80), clean(b.level,80),
        clean(b.food,500), clean(b.comment,1000), ATHLETE_PRICE, total, 0, total, 'Новая', 'Нет'
      ]] }
    });

    if (type !== 'group') {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Участники!A:O', valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [[clean(b.club,120), clean(b.athleteName || contact,120), clean(b.birthDate,30), clean(b.age,30), clean(b.city,100), clean(b.coachName,120), clean(b.level,80), phone, clean(b.parentName,120), clean(b.food,500), '', '', 'Не оплачено', 'Не выдана', clean(b.comment,1000)]] }
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Размещение и оплата!A:P', valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[clean(b.club,120) || contact, contact, athletes, coaches, athletes + coaches, ATHLETE_PRICE, athleteTotal, COACH_PRICE, coachTotal, total, 0, total, '', 'Включено', 'Новая', clean(b.comment,1000)]] }
    });
    return res.status(200).json({ ok: true, total });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Не удалось отправить заявку. Попробуйте ещё раз.' });
  }
};
