/**
 * Определяет подкатегорию одежды по названию карточки (WB не отдаёт подкатегорию в сырых CSV).
 * Ищем известный тип изделия в строке (длинные совпадения раньше коротких).
 */

const KEYWORDS = [
  "Лонгслив",
  "Комбинезон",
  "Толстовка",
  "Свитшот",
  "Кардиган",
  "Леггинсы",
  "Джоггеры",
  "Блузка",
  "Джемпер",
  "Джинсы",
  "Футболка",
  "Пуховик",
  "Брюки",
  "Платье",
  "Пальто",
  "Куртка",
  "Рубашка",
  "Свитер",
  "Худи",
  "Юбка",
  "Шорты",
  "Штаны",
  "Пиджак",
  "Жакет",
  "Жилетка",
  "Жилет",
  "Кофта",
  "Туника",
  "Ветровка",
  "Плащ",
  "Носки",
  "Костюм",
  "Пижама",
].sort((a, b) => b.length - a.length);

/** @param {string} title */
export function inferSubcategory(title) {
  const t = String(title || "").trim();
  if (!t) return "Без названия";

  const lower = t.toLowerCase();
  for (const kw of KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return kw;
  }

  const first = t.split(/\s+/)[0];
  if (first && first.length > 2) return first.charAt(0).toUpperCase() + first.slice(1);
  return "Прочее";
}
