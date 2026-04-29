# Bog'cha CRM: Loyiha Yakuni va Imkoniyatlari

Dastur to'liq ishga tushirildi va "Production" (jonli muhit) ga chiqarish uchun tayyorlandi. Quyida ushbu MVP loyihasining qanday imkoniyatlarga ega ekanligi haqida qisqacha xulosa bilan tanishishingiz mumkin.

## 🌟 Umumiy Imkoniyatlar (Barcha Rollar Uchun)
- **Firebase Authentication:** Xavfsiz tizimga kirish (Login).
- **Rolga asoslangan tizim:** Foydalanuvchining lavozimiga qarab sahifalar cheklangan (Owner, Admin, Teacher, Student).
- **Shaxsiy Profil:** Har bir xodim yoki o'quvchi o'z profilini tahrirlashi, rasm yuklashi, telefon raqami va manzilini saqlashi, shuningdek xavfsizlik uchun o'z parolini o'zgartirishi mumkin.

## 📊 Rahbariyat (Owner & Admin) Paneli
- **Dashboard (Asosiy ekran):** Bog'chaning umumiy holatini, jami o'quvchilar, faol guruhlar va shu oydagi tushumni ko'rsatadigan statistika oynasi. Endilikda `Recharts` yordamida so'nggi 6 oylik daromad dinamikasi vizual tarzda aks ettiriladi.
- **Xodimlar Boshqaruvi (System Users):** Faqat Admin va Rahbar tomonidan yangi Admin, O'qituvchi(Ustoz) hisoblarini yaratish va o'chirish.
- **Guruhlar (Groups):** Bog'chadagi barcha guruhlarni yaratish, o'qituvchilarni biriktirish, yosh toifasi va oylik to'lov summasini belgilash.
- **O'quvchilar (Students):** Barcha o'quvchilarni qo'shish va ro'yxatdan o'tkazish. O'quvchi qo'shilganda tizim unga avtomatik **ID va Parol** beradi. (Endi ro'yxatni Excel formatida yuklab olish mumkin).
- **To'lovlar (Payments):** Barcha o'quvchilarning oylik to'lovlarini nazorat qilish, kim qarz ekanligini ko'rish. To'lovlar ro'yxatini to'liqligicha **Excel (CSV) fayl sifatida** eksport qilish.
- **Davomat (Attendance):** Istalgan guruhning kunlik davomatini kuzatish.

## 👩‍🏫 O'qituvchi (Ustoz) Paneli
- **Cheklangan Dashboard:** O'qituvchi faqatgina **o'z guruhlari**, **o'z o'quvchilari** sonini ko'radi. Boshqa guruh ma'lumotlariga kira olmaydi.
- **Maosh Hisob-kitobi:** O'qituvchiga har bir guruhi uchun belgilangan to'lovning **20%** miqdorida maosh avtomatik tarzda hisoblanib turadi.
- **Cheklangan O'quvchilar:** O'qituvchi faqatgina o'ziga biriktirilgan guruh o'quvchilarini ko'ra oladi va faqat o'zining guruhiga o'quvchi qo'sha oladi.
- **Shaxsiy Davomat:** Davomat sahifasida u faqat o'z guruhlari uchungina davomat belgilay oladi.

## 🎒 O'quvchi (Student) Paneli
- **Oson Kirish:** Ota-onalar (yoki o'quvchi) o'qituvchi bergan ID va maxsus parol orqali o'z paneliga kiradi.
- **Shaxsiy Holat:** O'zlarining joriy oyda necha kun darsga kelgan-kelmaganligini grafik ko'rinishda ko'radi.
- **To'lovlar Tarixi:** Qaysi oy uchun pul to'lagani, qarz yoki to'liq to'laganini onlayn kuzatib turadi.

## ⚙️ Xavfsizlik va SEO
- **Firestore Rules:** Ma'lumotlar bazasining xavfsizligi to'liq himoyalangan. Ya'ni hech kim o'ziga tegishli bo'lmagan rolni yoki boshqa rahbarning ma'lumotlarini o'zgartira olmaydi.
- **SEO & Meta Tags:** Sayt endi Google qidiruv tizimida "Bog'cha CRM | Bolalar bog'chasi boshqaruv tizimi" sifatida to'g'ri ko'rinishi uchun barcha kerakli SEO kodlari kiritildi.

> [!TIP]
> **Keyingi qadamlar:**
> Tizim to'liq tayyor bo'ldi. Uni Vercel, Netlify yoki o'zingizning xosting serveringizga xotirjam yuklab "Production" da mijozlarga taqdim etishingiz mumkin!
# bogchacrm
