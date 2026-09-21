const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxzByDLWdHIjYM2ppuqzyDmaygSi1ER3mZGn0oGNxraNEnMlf5zFyEeytrEgk2zsQI/exec';

function clean(v, max = 1000) {
  return String(v ?? '').trim().slice(0, max);
}

function integer(v, fallback = 0) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const b = req.body || {};

    if (b.website) return res.status(200).json({ ok: true });
    if (!b.type || !b.contact || !b.phone || b.consent !== true) {
      return res.status(400).json({ error: 'Заполните обязательные поля.' });
    }

    let type;
    if (b.type === 'self') type = 'athlete';
    else if (b.type === 'parent') type = 'parent';
    else if (b.type === 'group') type = 'coach';
    else return res.status(400).json({ error: 'Некорректный тип заявки.' });

    const payload = {
      type,
      website: clean(b.website, 100),
      city: clean(b.city, 100),
      club: clean(b.club, 120),
      phone: clean(b.phone, 50),
      social: clean(b.social, 120),
      level: clean(b.level || b.groupLevel, 80),
      food: clean(b.food, 500),
      comment: clean(b.comment, 1000),

      athleteName: clean(b.athleteName || (type === 'athlete' ? b.contact : ''), 120),
      birthDate: clean(b.birthDate, 30),
      age: clean(b.age, 30),
      parentName: clean(b.parentName || (type === 'parent' ? b.contact : ''), 120),
      coachName: clean(type === 'coach' ? b.contact : b.coachName, 120),
      coach: clean(b.coachName, 120),

      athletesCount: type === 'coach' ? Math.max(1, integer(b.athletes, 1)) : 1,
      coachesCount: type === 'coach' ? Math.max(1, integer(b.coaches, 1)) : 0
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error('Google Apps Script вернул некорректный ответ.');
    }

    if (!result.ok) {
      throw new Error(result.error || 'Google Apps Script не принял заявку.');
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Не удалось отправить заявку. Попробуйте ещё раз.'
    });
  }
};
