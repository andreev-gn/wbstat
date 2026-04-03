/** Подписи категорий из сырых данных → русские (WB-категории в отчётах часто на EN). */
const CATEGORY_RU: Record<string, string> = {
  Kitchen: "Кухня",
  Health: "Здоровье",
  Sport: "Спорт",
  Home: "Дом",
  Одежда: "Одежда",
};

export function categoryLabelRu(name: string) {
  return CATEGORY_RU[name] ?? name;
}
