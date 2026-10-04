/**
 * Demo dataset for the hackathon presentation.
 * 10 test users (5 skilled workers, 3 casual workers, 2 clients) plus:
 *  - Cristian: auto-banned by the 5/5 report trigger during seeding,
 *  - Gelu: 4/5 reports, so one more report in the live demo triggers the auto-ban,
 *  - an admin account for the moderation panel.
 * All people, phone numbers and e-mails are fictional (example.com, +40 000 …).
 */

export type SeedUser = {
  key: string;
  email: string;
  fullName: string;
  city: string;
  roleMode: "worker" | "client";
  group: "client" | "skilled" | "casual" | "moderation";
  bio: string;
  phone: string;
  isPremium?: boolean;
  isVerified?: boolean;
  isAdmin?: boolean;
  licenseInfo?: string;
  hourlyRate?: number;
  monthsAgo: number;
  tags: { slug: string; years: number }[];
  portfolio: { title: string; description: string }[];
};

export const seedUsers: SeedUser[] = [
  {
    key: "andreea",
    email: "andreea.popescu@example.com",
    fullName: "Andreea Popescu",
    city: "Cluj-Napoca",
    roleMode: "client",
    group: "client",
    bio: "Lucrez în marketing și renovez apartamentul în care m-am mutat. Caut oameni serioși și punctuali.",
    phone: "+40 000 000 101",
    isPremium: true,
    monthsAgo: 14,
    tags: [],
    portfolio: [],
  },
  {
    key: "mihai",
    email: "mihai.ionescu@example.com",
    fullName: "Mihai Ionescu",
    city: "București",
    roleMode: "client",
    group: "client",
    bio: "Am un cabinet stomatologic în București și o mamă care are nevoie de puțin ajutor acasă.",
    phone: "+40 000 000 102",
    monthsAgo: 9,
    tags: [],
    portfolio: [],
  },
  {
    key: "ion",
    email: "ion.marinescu@example.com",
    fullName: "Ion Marinescu",
    city: "Cluj-Napoca",
    roleMode: "worker",
    group: "skilled",
    bio: "Electrician autorizat ANRE, 14 ani de experiență. Tablouri electrice, prize, iluminat LED, verificări de instalație. Lucrez curat și emit declarație de conformitate după fiecare lucrare.",
    phone: "+40 000 000 103",
    isPremium: true,
    isVerified: true,
    licenseInfo: "Autorizație ANRE gradul II B (date demo)",
    hourlyRate: 120,
    monthsAgo: 22,
    tags: [{ slug: "electrician", years: 14 }],
    portfolio: [
      { title: "Tablou electric, apartament 3 camere", description: "Înlocuire completă: 18 circuite, disjunctoare și protecție diferențială." },
      { title: "Iluminat LED în bucătărie", description: "Benzi LED sub corpuri și spoturi încastrate, comandate separat." },
    ],
  },
  {
    key: "radu",
    email: "radu.stan@example.com",
    fullName: "Radu Stan",
    city: "București",
    roleMode: "worker",
    group: "skilled",
    bio: "Instalator sanitar și termic. Desfundări, baterii, centrale termice, calorifere. Intervenții rapide în toate sectoarele Bucureștiului.",
    phone: "+40 000 000 104",
    isVerified: true,
    hourlyRate: 100,
    monthsAgo: 18,
    tags: [{ slug: "instalator", years: 9 }],
    portfolio: [
      { title: "Baie completă, Drumul Taberei", description: "Instalație nouă de apă și scurgere, cadă înlocuită cu duș walk-in." },
    ],
  },
  {
    key: "vlad",
    email: "vlad.munteanu@example.com",
    fullName: "Vlad Munteanu",
    city: "Cluj-Napoca",
    roleMode: "worker",
    group: "skilled",
    bio: "Tâmplar: mobilier la comandă din lemn masiv și PAL. Montez și mobilă IKEA complexă (PAX, METOD), cu reglaje fine.",
    phone: "+40 000 000 105",
    isVerified: true,
    hourlyRate: 90,
    monthsAgo: 16,
    tags: [
      { slug: "tamplar", years: 11 },
      { slug: "montaj-mobila-ikea", years: 6 },
    ],
    portfolio: [
      { title: "Bibliotecă din stejar masiv", description: "3 × 2,6 m, rafturi reglabile, finisaj cu ulei natural." },
      { title: "Bucătărie METOD montată", description: "4,2 m de corpuri, blat tăiat pe loc, electrocasnice încastrate." },
    ],
  },
  {
    key: "ioana",
    email: "ioana.dumitru@example.com",
    fullName: "Ioana Dumitru",
    city: "București",
    roleMode: "worker",
    group: "skilled",
    bio: "Programatoare full-stack: Next.js, React, TypeScript, PostgreSQL. Construiesc site-uri rapide pentru afaceri mici și aplicații de programări online.",
    phone: "+40 000 000 106",
    isVerified: true,
    hourlyRate: 150,
    monthsAgo: 11,
    tags: [{ slug: "programator", years: 7 }],
    portfolio: [
      { title: "Platformă de programări pentru o clinică", description: "Next.js, Supabase, notificări SMS, 2.000 de programări pe lună." },
    ],
  },
  {
    key: "elena",
    email: "elena.georgescu@example.com",
    fullName: "Elena Georgescu",
    city: "Cluj-Napoca",
    roleMode: "worker",
    group: "skilled",
    bio: "Designer de brand și UI. Logo-uri, identitate vizuală, meniuri și ambalaje pentru cafenele și restaurante.",
    phone: "+40 000 000 107",
    hourlyRate: 130,
    monthsAgo: 13,
    tags: [
      { slug: "designer", years: 8 },
      { slug: "fotograf", years: 3 },
    ],
    portfolio: [
      { title: "Identitate pentru o cafenea din Cluj", description: "Logo, paletă caldă, meniu și pahare personalizate." },
      { title: "Rebranding pentru o brutărie", description: "Ambalaje, etichete și site de prezentare." },
    ],
  },
  {
    key: "maria",
    email: "maria.constantin@example.com",
    fullName: "Maria Constantin",
    city: "București",
    roleMode: "worker",
    group: "casual",
    bio: "Fac curățenie generală și după renovare, călcat și ajutor în gospodărie pentru persoane vârstnice. Am referințe de la familiile cu care lucrez.",
    phone: "+40 000 000 108",
    hourlyRate: 45,
    monthsAgo: 10,
    tags: [
      { slug: "curatenie", years: 5 },
      { slug: "ajutor-gospodaresc", years: 4 },
      { slug: "calcat", years: 5 },
    ],
    portfolio: [],
  },
  {
    key: "andrei",
    email: "andrei.pop@example.com",
    fullName: "Andrei Pop",
    city: "Cluj-Napoca",
    roleMode: "worker",
    group: "casual",
    bio: "Student la Politehnică. Montez mobilă IKEA rapid și ajut la mutări în weekend. Am bormașină și trusă completă de scule.",
    phone: "+40 000 000 109",
    hourlyRate: 50,
    monthsAgo: 6,
    tags: [
      { slug: "montaj-mobila-ikea", years: 3 },
      { slug: "mutari", years: 2 },
      { slug: "montaj-tv-rafturi", years: 2 },
    ],
    portfolio: [],
  },
  {
    key: "sorina",
    email: "sorina.matei@example.com",
    fullName: "Sorina Matei",
    city: "Cluj-Napoca",
    roleMode: "worker",
    group: "casual",
    bio: "Iubesc animalele! Plimb câini, fac pet sitting și grădinărit. Locuiesc în Zorilor.",
    phone: "+40 000 000 110",
    hourlyRate: 35,
    monthsAgo: 7,
    tags: [
      { slug: "plimbat-caini", years: 4 },
      { slug: "pet-sitting", years: 3 },
      { slug: "gradinarit", years: 2 },
    ],
    portfolio: [],
  },
  {
    key: "cristian",
    email: "cristian.vasile@example.com",
    fullName: "Cristian Vasile",
    city: "București",
    roleMode: "worker",
    group: "moderation",
    bio: "Meșter la toate. Prețuri mici, plata în avans.",
    phone: "+40 000 000 111",
    hourlyRate: 40,
    monthsAgo: 3,
    tags: [
      { slug: "electrician", years: 1 },
      { slug: "instalator", years: 1 },
    ],
    portfolio: [],
  },
  {
    key: "gelu",
    email: "gelu.tudose@example.com",
    fullName: "Gelu Tudose",
    city: "Cluj-Napoca",
    roleMode: "worker",
    group: "moderation",
    bio: "Fac orice lucrare, inclusiv electrice, rapid și ieftin. Plata cash.",
    phone: "+40 000 000 112",
    hourlyRate: 30,
    monthsAgo: 2,
    tags: [
      { slug: "mutari", years: 1 },
      { slug: "montaj-tv-rafturi", years: 1 },
    ],
    portfolio: [],
  },
  {
    key: "admin",
    email: "admin@example.com",
    fullName: "Admin Demo",
    city: "București",
    roleMode: "client",
    group: "moderation",
    bio: "Echipa de moderare.",
    phone: "+40 000 000 100",
    isAdmin: true,
    monthsAgo: 24,
    tags: [],
    portfolio: [],
  },
];

export type SeedBid = { worker: string; price: number; hours: number; message: string; hoursAgo: number };

export type SeedJob = {
  key: string;
  client: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  tags: string[];
  city: string;
  location: string;
  isRemote?: boolean;
  urgency: "urgent" | "week" | "flexible";
  hoursAgo: number;
  bids: SeedBid[];
  /** Assigned job: accepted bid by this worker. */
  assignedTo?: string;
  messages?: { from: string; body: string; hoursAgo: number }[];
};

export const seedOpenJobs: SeedJob[] = [
  {
    key: "tablou",
    client: "andreea",
    title: "Înlocuire tablou electric și montaj 4 prize noi",
    description:
      "Apartament de 2 camere în Mănăștur, bloc din 1985. Vreau înlocuirea tabloului electric vechi (siguranțe cu filet) cu unul nou, cu disjunctoare și protecție diferențială, plus 4 prize noi în sufragerie. Am nevoie de declarație de conformitate la final.",
    budget: 1500,
    category: "instalatii-constructii",
    tags: ["electrician"],
    city: "Cluj-Napoca",
    location: "Cluj-Napoca · Mănăștur",
    urgency: "week",
    hoursAgo: 3,
    bids: [
      {
        worker: "ion",
        price: 1450,
        hours: 8,
        message:
          "Bună ziua! Sunt electrician autorizat ANRE. Înlocuiesc tabloul cu unul cu disjunctoare și diferențial de 30 mA, montez cele 4 prize și vă dau declarația de conformitate. Materialele le pot cumpăra eu, pe bon.",
        hoursAgo: 2,
      },
      {
        worker: "gelu",
        price: 700,
        hours: 4,
        message: "Fac repede și ieftin, fără acte. Plata cash, jumătate în avans.",
        hoursAgo: 1.5,
      },
      {
        worker: "cristian",
        price: 600,
        hours: 6,
        message: "Pot începe azi dacă îmi trimiteți 50% avans.",
        hoursAgo: 2.5,
      },
    ],
  },
  {
    key: "curatenie",
    client: "mihai",
    title: "Curățenie generală apartament 3 camere după renovare",
    description:
      "Apartament de 78 mp în Titan, tocmai renovat: praf de la glet, urme de vopsea pe geamuri și pe gresie. Am nevoie de curățenie completă, inclusiv geamuri și bucătărie. Produsele le pot cumpăra eu dacă e nevoie.",
    budget: 650,
    category: "casa-curatenie",
    tags: ["curatenie"],
    city: "București",
    location: "București · Titan",
    urgency: "urgent",
    hoursAgo: 5,
    bids: [
      {
        worker: "maria",
        price: 600,
        hours: 6,
        message: "Bună ziua, am experiență cu curățenia după renovare. Vin cu aspirator industrial și produse profesionale.",
        hoursAgo: 4,
      },
    ],
  },
  {
    key: "ikea",
    client: "andreea",
    title: "Montaj dulap PAX cu 2 uși și pat MALM (IKEA)",
    description:
      "Am cumpărat de la IKEA un dulap PAX de 100×236 cm cu 2 uși glisante și un pat MALM de 160×200. Cutiile sunt în apartament, la etajul 4, cu lift. Dulapul trebuie prins în perete.",
    budget: 450,
    category: "montaj-mutari",
    tags: ["montaj-mobila-ikea"],
    city: "Cluj-Napoca",
    location: "Cluj-Napoca · Gheorgheni",
    urgency: "week",
    hoursAgo: 26,
    bids: [
      {
        worker: "andrei",
        price: 380,
        hours: 4,
        message: "Salut! Am montat zeci de PAX-uri, inclusiv cu uși glisante. Prind dulapul în perete cu dibluri potrivite pentru BCA sau beton.",
        hoursAgo: 20,
      },
      {
        worker: "vlad",
        price: 500,
        hours: 3,
        message: "Montez PAX și MALM, cu reglaj fin la uși. Lucrez cu sculele mele și las totul curat.",
        hoursAgo: 18,
      },
    ],
  },
  {
    key: "caine",
    client: "andreea",
    title: "Plimbat câinele (labrador) de luni până vineri, 30 de minute",
    description:
      "Am un labrador de 3 ani, foarte prietenos, dar trage de lesă. Caut pe cineva care să-l plimbe zilnic între 12:00 și 14:00, de luni până vineri, în zona Zorilor. Plata se face pe săptămână.",
    budget: 350,
    category: "gradina-animale",
    tags: ["plimbat-caini"],
    city: "Cluj-Napoca",
    location: "Cluj-Napoca · Zorilor",
    urgency: "flexible",
    hoursAgo: 50,
    bids: [
      {
        worker: "sorina",
        price: 300,
        hours: 3,
        message: "Bună! Locuiesc în Zorilor și pot plimba labradorul zilnic la 12:30. Am experiență cu câini care trag de lesă.",
        hoursAgo: 40,
      },
    ],
  },
  {
    key: "mama",
    client: "mihai",
    title: "Ajutor gospodăresc pentru mama mea, de 2 ori pe săptămână",
    description:
      "Mama are 78 de ani și locuiește singură în Drumul Taberei. Caut o persoană de încredere care să vină marțea și vinerea câte 3 ore: curățenie ușoară, cumpărături, gătit ceva simplu și puțină companie.",
    budget: 800,
    category: "casa-curatenie",
    tags: ["ajutor-gospodaresc", "curatenie"],
    city: "București",
    location: "București · Drumul Taberei",
    urgency: "flexible",
    hoursAgo: 6,
    bids: [],
  },
  {
    key: "site",
    client: "mihai",
    title: "Site de prezentare pentru cabinet stomatologic (Next.js)",
    description:
      "Am nevoie de un site rapid, cu 5 pagini (acasă, servicii, echipă, prețuri, contact), programări online și optimizare SEO locală. Am deja textele și pozele. Prefer Next.js și găzduire pe Vercel.",
    budget: 4000,
    category: "it-creativ",
    tags: ["programator"],
    city: "București",
    location: "Online",
    isRemote: true,
    urgency: "flexible",
    hoursAgo: 30,
    bids: [
      {
        worker: "ioana",
        price: 3800,
        hours: 60,
        message: "Bună ziua! Fac site-uri Next.js cu programări online și vă pot arăta un proiect similar pentru o clinică. Livrare în 3 săptămâni.",
        hoursAgo: 25,
      },
    ],
  },
  {
    key: "logo",
    client: "andreea",
    title: "Logo și identitate vizuală pentru o cafenea de specialitate",
    description:
      "Deschidem o cafenea de specialitate în centrul Clujului. Avem nevoie de logo, paletă de culori, fonturi, meniu și design pentru pahare. Ne plac stilurile minimaliste și calde.",
    budget: 1800,
    category: "it-creativ",
    tags: ["designer"],
    city: "Cluj-Napoca",
    location: "Online",
    isRemote: true,
    urgency: "week",
    hoursAgo: 48,
    bids: [
      {
        worker: "elena",
        price: 1700,
        hours: 30,
        message: "Am lucrat identitatea vizuală pentru trei cafenele din Cluj. Propun 3 direcții de logo, apoi o rafinăm pe cea aleasă.",
        hoursAgo: 44,
      },
    ],
  },
  {
    key: "chiuveta",
    client: "mihai",
    title: "Desfundat scurgere și înlocuit baterie la chiuvetă",
    description:
      "Chiuveta din bucătărie se scurge foarte greu, iar bateria picură. Am cumpărat deja o baterie nouă. Bloc în Militari, etajul 2. Ideal mâine dimineață.",
    budget: 350,
    category: "instalatii-constructii",
    tags: ["instalator"],
    city: "București",
    location: "București · Militari",
    urgency: "urgent",
    hoursAgo: 2,
    bids: [
      {
        worker: "radu",
        price: 320,
        hours: 2,
        message: "Pot veni mâine la 8:30. Desfund cu sârmă profesională și montez bateria nouă.",
        hoursAgo: 1,
      },
    ],
  },
];

export const seedAssignedJob: SeedJob = {
  key: "gradina",
  client: "andreea",
  title: "Tuns gardul viu și curățat curtea casei",
  description:
    "Casă cu curte de 300 mp în Borhanci. Gardul viu (tuia, 25 m) trebuie tuns, iar curtea curățată de frunze. Am unelte, dar nu am timp.",
  budget: 300,
  category: "gradina-animale",
  tags: ["gradinarit"],
  city: "Cluj-Napoca",
  location: "Cluj-Napoca · Borhanci",
  urgency: "week",
  hoursAgo: 72,
  bids: [
    {
      worker: "sorina",
      price: 300,
      hours: 5,
      message: "Pot veni sâmbătă dimineață. Am foarfecă electrică pentru gard viu.",
      hoursAgo: 70,
    },
  ],
  assignedTo: "sorina",
  messages: [
    { from: "andreea", body: "Bună, Sorina! Poți veni sâmbătă la 10?", hoursAgo: 60 },
    { from: "sorina", body: "Bună! Da, sâmbătă la 10 e perfect. Aduc și saci pentru frunze.", hoursAgo: 59 },
  ],
};

export type SeedCompleted = {
  client: string;
  worker: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  tags: string[];
  city: string;
  daysAgo: number;
  clientReview: { rating: number; comment: string };
  workerReview?: { rating: number; comment: string };
};

export const seedCompletedJobs: SeedCompleted[] = [
  {
    client: "andreea",
    worker: "ion",
    title: "Montaj corpuri de iluminat în living",
    description: "Montaj a 3 lustre și a unui aplic în living, cu verificarea circuitului existent.",
    budget: 400,
    category: "instalatii-constructii",
    tags: ["electrician"],
    city: "Cluj-Napoca",
    daysAgo: 20,
    clientReview: { rating: 5, comment: "Foarte profesionist, a venit la timp și a lăsat totul curat." },
    workerReview: { rating: 5, comment: "Clientă foarte organizată, plată imediată." },
  },
  {
    client: "andreea",
    worker: "ion",
    title: "Verificare instalație electrică înainte de renovare",
    description: "Verificarea completă a instalației electrice a apartamentului înainte de renovare.",
    budget: 300,
    category: "instalatii-constructii",
    tags: ["electrician"],
    city: "Cluj-Napoca",
    daysAgo: 10,
    clientReview: { rating: 5, comment: "Mi-a explicat pe înțeles tot ce a verificat și ce trebuie schimbat." },
  },
  {
    client: "mihai",
    worker: "radu",
    title: "Înlocuire calorifer în dormitor",
    description: "Demontarea caloriferului vechi din fontă și montarea unui calorifer nou din oțel.",
    budget: 700,
    category: "instalatii-constructii",
    tags: ["instalator"],
    city: "București",
    daysAgo: 30,
    clientReview: { rating: 4, comment: "Treabă bună. A întârziat puțin, dar a anunțat din timp." },
    workerReview: { rating: 5, comment: "Client corect, totul clar de la început." },
  },
  {
    client: "andreea",
    worker: "vlad",
    title: "Bibliotecă din lemn masiv la comandă",
    description: "Bibliotecă din stejar pe tot peretele din sufragerie, cu rafturi reglabile.",
    budget: 2500,
    category: "instalatii-constructii",
    tags: ["tamplar"],
    city: "Cluj-Napoca",
    daysAgo: 45,
    clientReview: { rating: 5, comment: "Lucrare impecabilă, finisaje foarte frumoase." },
  },
  {
    client: "mihai",
    worker: "ioana",
    title: "Aplicație de programări pentru cabinet",
    description: "Aplicație web pentru programări online, cu confirmare pe e-mail și panou pentru recepție.",
    budget: 6000,
    category: "it-creativ",
    tags: ["programator"],
    city: "București",
    daysAgo: 60,
    clientReview: { rating: 5, comment: "Comunicare excelentă, a livrat înainte de termen." },
    workerReview: { rating: 5, comment: "Cerințe clare și feedback rapid." },
  },
  {
    client: "andreea",
    worker: "elena",
    title: "Meniu și afișe pentru un eveniment",
    description: "Design pentru meniul și afișele unui eveniment de lansare.",
    budget: 900,
    category: "it-creativ",
    tags: ["designer"],
    city: "Cluj-Napoca",
    daysAgo: 25,
    clientReview: { rating: 4, comment: "Design frumos. Au fost nevoie de două runde de modificări." },
  },
  {
    client: "mihai",
    worker: "maria",
    title: "Curățenie birou după mutare",
    description: "Curățenie generală într-un birou de 60 mp după mutarea mobilierului.",
    budget: 450,
    category: "casa-curatenie",
    tags: ["curatenie"],
    city: "București",
    daysAgo: 15,
    clientReview: { rating: 5, comment: "Foarte atentă la detalii, o recomand." },
    workerReview: { rating: 5, comment: "Client politicos, acces facil." },
  },
  {
    client: "mihai",
    worker: "maria",
    title: "Călcat rufe, un coș mare",
    description: "Călcat cămăși și lenjerie, ridicat și adus înapoi.",
    budget: 120,
    category: "casa-curatenie",
    tags: ["calcat"],
    city: "București",
    daysAgo: 5,
    clientReview: { rating: 4, comment: "Bine făcut și la timp." },
  },
  {
    client: "andreea",
    worker: "andrei",
    title: "Montaj comodă și birou IKEA",
    description: "Montaj comodă MALM cu 6 sertare și birou MICKE.",
    budget: 250,
    category: "montaj-mutari",
    tags: ["montaj-mobila-ikea"],
    city: "Cluj-Napoca",
    daysAgo: 12,
    clientReview: { rating: 5, comment: "Rapid și foarte îngrijit, a strâns și cartoanele." },
    workerReview: { rating: 5, comment: "Totul pregătit, comunicare excelentă." },
  },
  {
    client: "andreea",
    worker: "sorina",
    title: "Pet sitting un weekend",
    description: "Îngrijirea cățelului de vineri seara până duminică seara.",
    budget: 200,
    category: "gradina-animale",
    tags: ["pet-sitting"],
    city: "Cluj-Napoca",
    daysAgo: 8,
    clientReview: { rating: 5, comment: "Cățelul a fost fericit, am primit poze în fiecare zi." },
  },
  {
    client: "mihai",
    worker: "cristian",
    title: "Montaj priză în bucătărie",
    description: "Montarea unei prize noi lângă blatul din bucătărie.",
    budget: 150,
    category: "instalatii-constructii",
    tags: ["electrician"],
    city: "București",
    daysAgo: 40,
    clientReview: { rating: 1, comment: "A cerut avans și a lăsat lucrarea neterminată." },
  },
];

export type SeedReport = {
  reporter: string;
  target: string;
  reason: "spam" | "fraud" | "inappropriate" | "fake_profile" | "no_show" | "unlicensed" | "other";
  details: string;
  hoursAgo: number;
};

export const seedReports: SeedReport[] = [
  { reporter: "andreea", target: "cristian", reason: "fraud", details: "Cere avans și apoi nu mai răspunde.", hoursAgo: 120 },
  { reporter: "mihai", target: "cristian", reason: "no_show", details: "A lăsat lucrarea neterminată după ce a primit avansul.", hoursAgo: 100 },
  { reporter: "ion", target: "cristian", reason: "unlicensed", details: "Se prezintă ca electrician fără autorizație ANRE.", hoursAgo: 80 },
  { reporter: "maria", target: "cristian", reason: "spam", details: "Trimite același mesaj la toate joburile.", hoursAgo: 60 },
  { reporter: "andrei", target: "cristian", reason: "fake_profile", details: "Profil cu date care nu se potrivesc.", hoursAgo: 40 },
  { reporter: "mihai", target: "gelu", reason: "fraud", details: "Cere plata în avans, cash.", hoursAgo: 30 },
  { reporter: "radu", target: "gelu", reason: "unlicensed", details: "Oferă lucrări electrice fără autorizație.", hoursAgo: 20 },
  { reporter: "vlad", target: "gelu", reason: "spam", details: "Mesaje identice la zeci de joburi.", hoursAgo: 12 },
  { reporter: "elena", target: "gelu", reason: "inappropriate", details: "Ton nepoliticos în mesaje.", hoursAgo: 6 },
];
