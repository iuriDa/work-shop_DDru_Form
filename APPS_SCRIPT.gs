const SPREADSHEET_ID = '1dEJUKGeo0zHqAqRqN8dPgLzfl9B630wO2sp4WgzwWJM';
const ATHLETE_PRICE = 18500;
const COACH_PRICE = 10000;

function doGet() {
  return jsonResponse({ok:true, message:'Double Dutch Registration API работает'});
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    if (data.website) return jsonResponse({ok:true});

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Заявки');
    if (!sheet) throw new Error('Лист "Заявки" не найден');

    const type = clean(data.type);
    const contact = clean(data.contact);
    const city = clean(data.city);
    const club = clean(data.club);
    const phone = clean(data.phone);
    const social = clean(data.social);
    const level = clean(data.level);
    const food = clean(data.food);
    const comment = clean(data.comment);

    let contactName = contact;
    let role = '';
    let athletes = 1;
    let coaches = 0;

    if (type === 'athlete') {
      contactName = contact || clean(data.athleteName);
      role = 'Спортсмен';
    } else if (type === 'parent') {
      contactName = contact || clean(data.parentName);
      role = 'Родитель';
    } else if (type === 'coach') {
      contactName = contact || clean(data.coachName);
      role = 'Тренер / руководитель группы';
      athletes = positiveInt(data.athletesCount);
      coaches = positiveInt(data.coachesCount);
      if (athletes < 1) throw new Error('Не указано количество спортсменов');
      if (coaches < 1) throw new Error('Не указано количество тренеров / руководителей');
    } else {
      throw new Error('Некорректный тип заявки');
    }

    if (!contactName) throw new Error('Не указано контактное лицо');
    if (!phone) throw new Error('Не указан телефон');

    const total = athletes * ATHLETE_PRICE + coaches * COACH_PRICE;
    const typeLabel = type === 'athlete' ? 'Спортсмен' : type === 'parent' ? 'Родитель' : 'Тренер / клуб';

    sheet.appendRow([
      new Date(), typeLabel, club, city, contactName, role, phone, social,
      athletes, coaches, '', level, food, comment,
      ATHLETE_PRICE, total, '', total, 'Новая', type === 'coach' ? 'Нет' : 'Да'
    ]);

    if (type === 'athlete' || type === 'parent') {
      saveAthlete(ss, data, type, club, city, level, food);
    }

    return jsonResponse({ok:true,total,athletes,coaches});
  } catch (error) {
    console.error(error);
    return jsonResponse({ok:false,error:String(error.message || error)});
  }
}

function saveAthlete(ss, data, type, club, city, level, food) {
  const sheet = ss.getSheetByName('Участники');
  if (!sheet) return;
  const contact = clean(data.phone) + (data.social ? ' / ' + clean(data.social) : '');
  sheet.appendRow([
    club, clean(data.athleteName), clean(data.birthDate), clean(data.age), city,
    clean(data.coach), level, contact,
    type === 'parent' ? clean(data.contact || data.parentName) : clean(data.parentName),
    food, '', '', 'Не оплачено', 'Не выдана', clean(data.comment)
  ]);
}

function positiveInt(value) {
  const n = parseInt(value, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}
function clean(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
