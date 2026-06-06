// Вымышленные данные салона (учебный проект).
// Позже заменяются реальными запросами к FastAPI (/api/services, /api/masters).

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  durationMinutes: number;
};

export type Master = {
  id: string;
  name: string;
  specialization: string;
  bio: string;
  rating: number;
  photoUrl: string;
};

export type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  service: string;
};

export const salon = {
  name: "Lumière",
  tagline: "Эстетическая косметология и красота",
  slogan: "Безупречная красота начинается с заботы о себе",
  phone: "+7 (495) 123-45-67",
  phoneHref: "tel:+74951234567",
  email: "hello@lumiere-salon.ru",
  address: "Москва, ул. Пречистенка, 12, БЦ «Аврора», 2 этаж",
  hours: "Ежедневно с 9:00 до 21:00",
  discount: "Скидка 20% на первое посещение",
};

// Цены приведены к реальному прайсу сети «Город красоты» (gorod-krasoti.com/czeny).
export const services: Service[] = [
  {
    id: "facial-ultrasonic",
    name: "Ультразвуковая чистка лица",
    category: "Уход за лицом",
    description: "Бережное очищение ультразвуком, тонизирование и увлажняющая маска по типу кожи.",
    price: 2550,
    durationMinutes: 60,
  },
  {
    id: "facial-peel",
    name: "Химический пилинг",
    category: "Уход за лицом",
    description: "Обновление и выравнивание тона кожи срединным пилингом нового поколения.",
    price: 2500,
    durationMinutes: 60,
  },
  {
    id: "facial-mask",
    name: "Уходовая SPA-маска для лица",
    category: "Уход за лицом",
    description: "Питательный уход с массажем по массажным линиям и финишной сывороткой.",
    price: 950,
    durationMinutes: 40,
  },
  {
    id: "hw-carbon",
    name: "Карбоновый пилинг",
    category: "Аппаратная косметология",
    description: "Лазерное обновление кожи: сужает поры, выравнивает тон и матирует.",
    price: 3100,
    durationMinutes: 45,
  },
  {
    id: "hw-rf",
    name: "RF-лифтинг лица",
    category: "Аппаратная косметология",
    description: "Радиочастотный лифтинг для подтяжки овала и упругости кожи.",
    price: 2200,
    durationMinutes: 50,
  },
  {
    id: "hw-ipl",
    name: "IPL-фотоомоложение",
    category: "Аппаратная косметология",
    description: "Световое омоложение: убирает пигментацию и сосудистые звёздочки.",
    price: 1900,
    durationMinutes: 40,
  },
  {
    id: "massage-body",
    name: "Общий массаж тела",
    category: "Массаж",
    description: "Расслабляющий массаж всего тела с аромамаслами ручной работы.",
    price: 2950,
    durationMinutes: 90,
  },
  {
    id: "massage-back",
    name: "Массаж спины",
    category: "Массаж",
    description: "Снимает напряжение и зажимы в шейно-воротниковой зоне и спине.",
    price: 1800,
    durationMinutes: 40,
  },
  {
    id: "massage-anticellulite",
    name: "Антицеллюлитный массаж",
    category: "Массаж",
    description: "Интенсивная проработка проблемных зон для упругости кожи и гладкого рельефа.",
    price: 2700,
    durationMinutes: 60,
  },
  {
    id: "nails-manicure",
    name: "Маникюр с гель-лаком",
    category: "Ногтевой сервис",
    description: "Аппаратный маникюр, уход за кутикулой и стойкое гель-покрытие.",
    price: 1900,
    durationMinutes: 90,
  },
  {
    id: "nails-pedicure",
    name: "СПА-педикюр с покрытием",
    category: "Ногтевой сервис",
    description: "Ванночка, пилинг, питательный уход и стойкое покрытие для безупречных стоп.",
    price: 2400,
    durationMinutes: 100,
  },
  {
    id: "nails-extension",
    name: "Наращивание ногтей",
    category: "Ногтевой сервис",
    description: "Моделирование и наращивание ногтей любой длины с прочным дизайнерским покрытием.",
    price: 2800,
    durationMinutes: 120,
  },
  {
    id: "hair-cut-women",
    name: "Женская стрижка и укладка",
    category: "Волосы и причёски",
    description: "Стрижка с учётом структуры волос и формы лица, финишная укладка феном.",
    price: 1900,
    durationMinutes: 75,
  },
  {
    id: "hair-cut-men",
    name: "Мужская стрижка",
    category: "Волосы и причёски",
    description: "Модельная стрижка, моделирование контуров и укладка под стиль клиента.",
    price: 1200,
    durationMinutes: 45,
  },
  {
    id: "hair-color",
    name: "Окрашивание волос",
    category: "Волосы и причёски",
    description: "Однотонное окрашивание стойким красителем с уходовым составом и укладкой.",
    price: 3900,
    durationMinutes: 150,
  },
  {
    id: "hair-styling",
    name: "Вечерняя укладка",
    category: "Волосы и причёски",
    description: "Праздничная укладка или локоны для особого случая с долговременной фиксацией.",
    price: 1800,
    durationMinutes: 60,
  },
  {
    id: "hair-treatment",
    name: "Ламинирование волос",
    category: "Волосы и причёски",
    description: "Глубокое восстановление и блеск: разглаживает, питает и облегчает укладку.",
    price: 2900,
    durationMinutes: 90,
  },
  {
    id: "brows-correction",
    name: "Коррекция и окрашивание бровей",
    category: "Брови и ресницы",
    description: "Моделирование формы по типу лица и стойкое окрашивание краской или хной.",
    price: 900,
    durationMinutes: 40,
  },
  {
    id: "brows-lamination",
    name: "Ламинирование бровей",
    category: "Брови и ресницы",
    description: "Фиксация формы, питание и ухоженный вид бровей на несколько недель.",
    price: 2000,
    durationMinutes: 60,
  },
  {
    id: "lashes-lamination",
    name: "Ламинирование ресниц",
    category: "Брови и ресницы",
    description: "Изгиб, объём и стойкий уход без наращивания — естественный взгляд.",
    price: 2300,
    durationMinutes: 70,
  },
  {
    id: "lashes-extension",
    name: "Наращивание ресниц",
    category: "Брови и ресницы",
    description: "Классическое или объёмное наращивание для выразительного взгляда.",
    price: 2600,
    durationMinutes: 120,
  },
  {
    id: "depil-underarms",
    name: "Депиляция подмышек",
    category: "Депиляция",
    description: "Бережное удаление волос воском или сахарной пастой с гладким результатом.",
    price: 700,
    durationMinutes: 30,
  },
  {
    id: "depil-bikini",
    name: "Депиляция зоны бикини",
    category: "Депиляция",
    description: "Деликатная депиляция с уходовыми составами и финишным успокаивающим кремом.",
    price: 1600,
    durationMinutes: 45,
  },
  {
    id: "depil-legs",
    name: "Депиляция ног полностью",
    category: "Депиляция",
    description: "Гладкая кожа ног надолго — воск или шугаринг по всей длине.",
    price: 2200,
    durationMinutes: 60,
  },
  {
    id: "depil-full",
    name: "Комплексная депиляция тела",
    category: "Депиляция",
    description: "Полный комплекс зон со скидкой за пакет: ноги, руки, бикини и подмышки.",
    price: 3800,
    durationMinutes: 100,
  },
];

export const masters: Master[] = [
  {
    id: "m-anna",
    name: "Анна Северова",
    specialization: "Косметолог-эстетист",
    bio: "12 лет в эстетической косметологии, эксперт по уходовым программам и пилингам.",
    rating: 4.9,
    photoUrl: "/masters/3.png",
  },
  {
    id: "m-irina",
    name: "Ирина Власова",
    specialization: "Массажист",
    bio: "Сертифицированный мастер скульптурного и релакс-массажа, автор авторских техник.",
    rating: 5.0,
    photoUrl: "/masters/2.png",
  },
  {
    id: "m-katya",
    name: "Екатерина Лиман",
    specialization: "Мастер ногтевого сервиса",
    bio: "Финалист конкурсов nail-art, создаёт идеальную форму и стойкое покрытие.",
    rating: 4.8,
    photoUrl: "/masters/5.jpg",
  },
  {
    id: "m-marina",
    name: "Марина Дольская",
    specialization: "Специалист аппаратной косметологии",
    bio: "Работает на аппаратах RF, IPL и карбоновом лазере, эксперт по anti-age программам.",
    rating: 4.9,
    photoUrl: "/masters/6.png",
  },
  {
    id: "m-sofia",
    name: "София Зеленова",
    specialization: "Стилист-парикмахер",
    bio: "Стилист-колорист, мастер сложных окрашиваний и причёсок для любого случая.",
    rating: 4.9,
    photoUrl: "/masters/1.png",
  },
  {
    id: "m-polina",
    name: "Полина Зорина",
    specialization: "Бровист-лашмейкер",
    bio: "Создаёт идеальную форму бровей и выразительный взгляд: ламинирование и наращивание ресниц.",
    rating: 4.8,
    photoUrl: "/masters/4.jpg",
  },
  {
    id: "m-alina",
    name: "Алина Морозова",
    specialization: "Мастер депиляции",
    bio: "Деликатная депиляция воском и шугарингом с гладким и долгим результатом.",
    rating: 4.9,
    photoUrl: "/masters/7.jpg",
  },
];

export const reviews: Review[] = [
  {
    id: "r1",
    name: "Ольга К.",
    rating: 5,
    service: "Ультразвуковая чистка лица",
    text: "Кожа сияет уже на следующий день. Анна — настоящий профессионал, очень внимательная.",
  },
  {
    id: "r2",
    name: "Дарья М.",
    rating: 5,
    service: "RF-лифтинг лица",
    text: "Овал лица заметно подтянулся после курса. Атмосфера в салоне — отдельное удовольствие.",
  },
  {
    id: "r3",
    name: "Светлана П.",
    rating: 5,
    service: "СПА-педикюр с покрытием",
    text: "Лучший педикюр в городе. Стерильность, забота и идеальный результат. Рекомендую всем!",
  },
  {
    id: "r4",
    name: "Наталья В.",
    rating: 4,
    service: "Химический пилинг",
    text: "Пятна постакне стали заметно светлее. Подобрали программу именно под мою кожу.",
  },
  {
    id: "r5",
    name: "Алина Т.",
    rating: 5,
    service: "Карбоновый пилинг",
    text: "Кожа после процедуры как фарфоровая, поры заметно сузились. Марина — волшебница!",
  },
  {
    id: "r6",
    name: "Юлия С.",
    rating: 5,
    service: "Маникюр с гель-лаком",
    text: "Покрытие носится больше трёх недель без сколов. Аккуратно, быстро и очень уютно.",
  },
  {
    id: "r7",
    name: "Вероника Л.",
    rating: 5,
    service: "Общий массаж тела",
    text: "Ушла как новенькая. Ирина чувствует тело и снимает напряжение, о котором не подозревала.",
  },
  {
    id: "r8",
    name: "Майя Р.",
    rating: 4,
    service: "Массаж спины",
    text: "После сидячей работы спина не беспокоит уже неделю. Руки мастера творят чудеса.",
  },
];

export const navLinks = [
  { label: "Услуги", href: "#services" },
  { label: "Мастера", href: "#masters" },
  { label: "Отзывы", href: "#reviews" },
  { label: "Контакты", href: "#contacts" },
];

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}
