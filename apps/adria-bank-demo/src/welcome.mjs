import { supportedLanguages } from './i18n.mjs';
import { STORE_KEY } from './core.mjs';

const EN = {
  languageLabel: 'Language', eyebrow: 'LOCAL · SYNTHETIC DATA · DEMO', title: 'Practice banking.<br><em>Never real money.</em>',
  lead: 'Adria Bank is an interactive desktop sandbox for rehearsing banking and digital-asset procedures. Choose the staff workspace or customer portal.',
  badgeLocal: 'Data stays on this device', badgeFake: 'Accounts and payments are fictional', badgeNoLogin: 'No real login or connectivity',
  desktopSim: 'DESKTOP SIMULATOR', statusLocal: 'LOCAL DEMO', practiceBalance: 'SYNTHETIC SCENARIO', fictionalValue: 'Illustrative data · not a real balance',
  dailyReference: 'Daily reference · not an offer', offlineAssets: 'Fictional offline assets', chooseEnvironment: 'CHOOSE YOUR ENVIRONMENT', entryTitle: 'Where would you like to go?', noPassword: 'Demo entry · no password',
  staffLabel: 'EMPLOYEES', staffTitle: 'Operations desktop', staffDescription: 'Customers, accounts, payments, risk, cash desks and maker/checker practice.',
  customerLabel: 'CUSTOMERS', customerTitle: 'Customer portal', customerDescription: 'Personal and business demo profiles, cards, savings and self-service rehearsals.',
  personaNotice: 'These are not login accounts. A selection only opens local demo data; profile switching is not authentication or access control.',
  capPayments: 'Payments & conversion', capPaymentsSub: 'Send, receive, cancel and review the local ledger — rehearsal only.',
  capCrypto: 'Digital assets', capCryptoSub: 'Wallet workflows and local review — no blockchain or custody.',
  capChecks: 'Format checks', capChecksSub: 'Length and checksum are not proof that an account or card exists.',
  capCases: 'Risk & support', capCasesSub: 'KYC/AML and complaints as training workflows.',
  footerText: 'Internal testing only · no real bank or exchange connectivity.', readGuide: 'Read demo and safety notes'
};

const COPY = {
  en: EN,
  hr: {
    languageLabel:'Jezik', eyebrow:'LOKALNO · SINTETIČKI PODACI · DEMO', title:'Vježbajte bankarstvo.<br><em>Bez stvarnog novca.</em>', lead:'Adria Bank interaktivni je desktop sandbox za uvježbavanje bankarskih postupaka i digitalne imovine. Odaberite radno okruženje zaposlenika ili portal klijenata.', badgeLocal:'Podaci ostaju na uređaju', badgeFake:'Računi i plaćanja su izmišljeni', badgeNoLogin:'Bez stvarne prijave ili povezivanja', desktopSim:'DESKTOP SIMULATOR', statusLocal:'LOKALNI DEMO', practiceBalance:'SINTETIČKI SCENARIJ', fictionalValue:'Ilustrativni podaci · nije stvarno stanje', dailyReference:'Dnevna referenca · nije ponuda', offlineAssets:'Izmišljena offline imovina', chooseEnvironment:'ODABERITE OKRUŽENJE', entryTitle:'Kamo želite ući?', noPassword:'Demo ulaz · bez lozinke', staffLabel:'ZAPOSLENICI', staffTitle:'Operativni desktop', staffDescription:'Klijenti, računi, plaćanja, rizici, blagajne i vježba dvostruke kontrole.', customerLabel:'KLIJENTI', customerTitle:'Korisnički portal', customerDescription:'Osobni i poslovni demo profili, kartice, štednja i samoposlužne vježbe.', personaNotice:'Ovo nisu računi za prijavu. Odabir otvara samo lokalne demo podatke; promjena profila nije autentikacija ni kontrola pristupa.', capPayments:'Plaćanja i konverzije', capPaymentsSub:'Slanje, primitak, otkazivanje i pregled knjige — samo vježba.', capCrypto:'Digitalna imovina', capCryptoSub:'Novčanici i lokalna provjera — bez blockchaina i skrbništva.', capChecks:'Provjere formata', capChecksSub:'Duljina i kontrolna suma ne dokazuju postojanje računa ili kartice.', capCases:'Rizik i podrška', capCasesSub:'KYC/AML i pritužbe kao vježbovni postupci.', footerText:'Samo interno testiranje · nema stvarne bankovne ili burzovne povezanosti.', readGuide:'Demo i sigurnosne napomene'
  },
  de: {
    languageLabel:'Sprache', eyebrow:'LOKAL · SYNTHETISCHE DATEN · DEMO', title:'Banking üben.<br><em>Kein echtes Geld.</em>', lead:'Adria Bank ist eine interaktive Desktop-Sandbox zum Üben von Bank- und Digital-Asset-Verfahren. Wählen Sie den Mitarbeiterbereich oder das Kundenportal.', badgeLocal:'Daten bleiben auf diesem Gerät', badgeFake:'Konten und Zahlungen sind fiktiv', badgeNoLogin:'Keine echte Anmeldung oder Verbindung', desktopSim:'DESKTOP-SIMULATOR', statusLocal:'LOKALE DEMO', practiceBalance:'SYNTHETISCHES SZENARIO', fictionalValue:'Beispieldaten · kein echtes Guthaben', dailyReference:'Tagesreferenz · kein Angebot', offlineAssets:'Fiktive Offline-Assets', chooseEnvironment:'UMGEBUNG WÄHLEN', entryTitle:'Wohin möchten Sie?', noPassword:'Demo-Zugang · kein Passwort', staffLabel:'MITARBEITENDE', staffTitle:'Operations-Desktop', staffDescription:'Kunden, Konten, Zahlungen, Risiken, Kasse und Vier-Augen-Prinzip üben.', customerLabel:'KUNDEN', customerTitle:'Kundenportal', customerDescription:'Fiktive Privat- und Geschäftskundenprofile, Karten, Sparen und Selbstbedienung.', personaNotice:'Dies sind keine Anmeldekonten. Die Auswahl öffnet nur lokale Demodaten; ein Profilwechsel ist keine Authentifizierung oder Zugriffskontrolle.', capPayments:'Zahlungen & Umrechnung', capPaymentsSub:'Senden, empfangen, stornieren und lokales Hauptbuch prüfen — nur Übung.', capCrypto:'Digitale Vermögenswerte', capCryptoSub:'Wallet-Abläufe und lokale Prüfung — keine Blockchain oder Verwahrung.', capChecks:'Formatprüfungen', capChecksSub:'Länge und Prüfsumme beweisen nicht, dass ein Konto oder eine Karte existiert.', capCases:'Risiko & Support', capCasesSub:'KYC/AML und Beschwerden als Trainingsabläufe.', footerText:'Nur interne Tests · keine echte Bank- oder Börsenverbindung.', readGuide:'Demo- und Sicherheitshinweise'
  },
  fr: {
    languageLabel:'Langue', eyebrow:'LOCAL · DONNÉES SYNTHÉTIQUES · DÉMO', title:'Entraînez-vous à la banque.<br><em>Sans argent réel.</em>', lead:'Adria Bank est un bac à sable de bureau interactif pour répéter des procédures bancaires et d’actifs numériques. Choisissez l’espace du personnel ou le portail client.', badgeLocal:'Les données restent sur cet appareil', badgeFake:'Comptes et paiements fictifs', badgeNoLogin:'Aucune vraie connexion ni liaison', desktopSim:'SIMULATEUR DE BUREAU', statusLocal:'DÉMO LOCALE', practiceBalance:'SCÉNARIO SYNTHÉTIQUE', fictionalValue:'Données illustratives · pas un vrai solde', dailyReference:'Référence quotidienne · pas une offre', offlineAssets:'Actifs hors ligne fictifs', chooseEnvironment:'CHOISISSEZ VOTRE ENVIRONNEMENT', entryTitle:'Où souhaitez-vous aller ?', noPassword:'Accès démo · sans mot de passe', staffLabel:'PERSONNEL', staffTitle:'Bureau des opérations', staffDescription:'Clients, comptes, paiements, risques, caisse et contrôle à deux personnes.', customerLabel:'CLIENTS', customerTitle:'Portail client', customerDescription:'Profils fictifs particuliers et entreprises, cartes, épargne et libre-service.', personaNotice:'Il ne s’agit pas de comptes de connexion. Le choix ouvre uniquement des données locales fictives ; changer de profil n’est pas une authentification ni un contrôle d’accès.', capPayments:'Paiements et conversion', capPaymentsSub:'Envoyer, recevoir, annuler et consulter le grand livre local — exercice uniquement.', capCrypto:'Actifs numériques', capCryptoSub:'Parcours de portefeuille et contrôle local — sans blockchain ni conservation.', capChecks:'Contrôles de format', capChecksSub:'La longueur et la somme de contrôle ne prouvent pas l’existence d’un compte ou d’une carte.', capCases:'Risque et assistance', capCasesSub:'KYC/AML et réclamations comme exercices.', footerText:'Tests internes uniquement · aucune connexion réelle à une banque ou bourse.', readGuide:'Notes de démo et de sécurité'
  },
  es: {
    languageLabel:'Idioma', eyebrow:'LOCAL · DATOS SINTÉTICOS · DEMO', title:'Practique banca.<br><em>Sin dinero real.</em>', lead:'Adria Bank es un entorno de escritorio interactivo para ensayar procedimientos bancarios y de activos digitales. Elija el espacio del personal o el portal de clientes.', badgeLocal:'Los datos permanecen en este dispositivo', badgeFake:'Cuentas y pagos ficticios', badgeNoLogin:'Sin inicio de sesión ni conexión reales', desktopSim:'SIMULADOR DE ESCRITORIO', statusLocal:'DEMO LOCAL', practiceBalance:'ESCENARIO SINTÉTICO', fictionalValue:'Datos ilustrativos · no es un saldo real', dailyReference:'Referencia diaria · no es una oferta', offlineAssets:'Activos ficticios sin conexión', chooseEnvironment:'ELIJA SU ENTORNO', entryTitle:'¿Adónde desea ir?', noPassword:'Acceso demo · sin contraseña', staffLabel:'EMPLEADOS', staffTitle:'Escritorio de operaciones', staffDescription:'Clientes, cuentas, pagos, riesgos, caja y prácticas de doble control.', customerLabel:'CLIENTES', customerTitle:'Portal de clientes', customerDescription:'Perfiles personales y empresariales ficticios, tarjetas, ahorro y autoservicio.', personaNotice:'No son cuentas de acceso. La selección solo abre datos demo locales; cambiar de perfil no es autenticación ni control de acceso.', capPayments:'Pagos y conversión', capPaymentsSub:'Enviar, recibir, cancelar y revisar el libro local — solo práctica.', capCrypto:'Activos digitales', capCryptoSub:'Carteras y revisión local — sin cadena de bloques ni custodia.', capChecks:'Comprobaciones de formato', capChecksSub:'La longitud y el dígito de control no prueban que exista una cuenta o tarjeta.', capCases:'Riesgo y soporte', capCasesSub:'KYC/AML y reclamaciones como flujos de formación.', footerText:'Solo pruebas internas · sin conexión real a bancos o bolsas.', readGuide:'Notas de demo y seguridad'
  },
  ar: {
    languageLabel:'اللغة', eyebrow:'محلي · بيانات اصطناعية · عرض تجريبي', title:'تدرّب على الخدمات المصرفية.<br><em>دون أموال حقيقية.</em>', lead:'أدريا بنك بيئة مكتبية تفاعلية للتدرب على إجراءات مصرفية وإجراءات الأصول الرقمية. اختر مساحة الموظفين أو بوابة العملاء.', badgeLocal:'تبقى البيانات على هذا الجهاز', badgeFake:'الحسابات والمدفوعات خيالية', badgeNoLogin:'لا تسجيل دخول أو اتصال حقيقي', desktopSim:'محاكي سطح المكتب', statusLocal:'عرض محلي', practiceBalance:'سيناريو اصطناعي', fictionalValue:'بيانات توضيحية · ليست رصيداً حقيقياً', dailyReference:'مرجع يومي · ليس عرضاً', offlineAssets:'أصول خيالية دون اتصال', chooseEnvironment:'اختر البيئة', entryTitle:'إلى أين تريد الانتقال؟', noPassword:'دخول تجريبي · دون كلمة مرور', staffLabel:'الموظفون', staffTitle:'مكتب العمليات', staffDescription:'العملاء والحسابات والمدفوعات والمخاطر والصندوق ومراجعة الموظف والمراجع.', customerLabel:'العملاء', customerTitle:'بوابة العملاء', customerDescription:'ملفات شخصية وتجارية خيالية، وبطاقات وادخار وخدمات ذاتية تجريبية.', personaNotice:'هذه ليست حسابات تسجيل دخول. يفتح الاختيار بيانات محلية تجريبية فقط؛ وتبديل الملف الشخصي ليس مصادقة أو ضبطاً للصلاحيات.', capPayments:'المدفوعات والتحويل', capPaymentsSub:'إرسال واستلام وإلغاء ومراجعة دفتر محلي — للتدريب فقط.', capCrypto:'الأصول الرقمية', capCryptoSub:'إجراءات محفظة ومراجعة محلية — بلا سلسلة كتل أو حفظ أصول.', capChecks:'فحوص التنسيق', capChecksSub:'الطول ورقم التحقق لا يثبتان وجود حساب أو بطاقة.', capCases:'المخاطر والدعم', capCasesSub:'إجراءات KYC/AML والشكاوى للتدريب.', footerText:'للاختبار الداخلي فقط · لا اتصال حقيقي ببنك أو بورصة.', readGuide:'تعليمات العرض والسلامة'
  },
  sw: {
    languageLabel:'Lugha', eyebrow:'NDANI YA KIFAA · DATA BANDIA · DEMO', title:'Jifunze huduma za benki.<br><em>Bila pesa halisi.</em>', lead:'Adria Bank ni eneo la mazoezi la kompyuta kwa taratibu za benki na mali za kidijitali. Chagua eneo la wafanyakazi au lango la wateja.', badgeLocal:'Data hubaki kwenye kifaa hiki', badgeFake:'Akaunti na malipo ni ya kubuni', badgeNoLogin:'Hakuna kuingia au muunganisho halisi', desktopSim:'KIIGIZO CHA KOMPYUTA', statusLocal:'DEMO YA NDANI', practiceBalance:'TUKIO BANDIA', fictionalValue:'Data ya mfano · si salio halisi', dailyReference:'Rejea ya kila siku · si ofa', offlineAssets:'Mali bandia zisizo mtandaoni', chooseEnvironment:'CHAGUA ENEO', entryTitle:'Ungependa kwenda wapi?', noPassword:'Demo · hakuna nenosiri', staffLabel:'WAFANYAKAZI', staffTitle:'Eneo la shughuli', staffDescription:'Wateja, akaunti, malipo, hatari, fedha taslimu na ukaguzi wa watu wawili.', customerLabel:'WATEJA', customerTitle:'Lango la mteja', customerDescription:'Wasifu bandia wa mtu binafsi na biashara, kadi, akiba na huduma binafsi.', personaNotice:'Hizi si akaunti za kuingia. Chaguo hufungua data ya demo ya ndani tu; kubadili wasifu si uthibitishaji wala udhibiti wa ufikiaji.', capPayments:'Malipo na ubadilishaji', capPaymentsSub:'Tuma, pokea, ghairi na kagua leja ya ndani — mazoezi pekee.', capCrypto:'Mali za kidijitali', capCryptoSub:'Mtiririko wa pochi na ukaguzi wa ndani — hakuna blockchain wala uhifadhi.', capChecks:'Ukaguzi wa muundo', capChecksSub:'Urefu na tarakimu ya ukaguzi havithibitishi akaunti au kadi halisi.', capCases:'Hatari na msaada', capCasesSub:'KYC/AML na malalamiko kama mazoezi.', footerText:'Majaribio ya ndani pekee · hakuna muunganisho halisi wa benki au soko.', readGuide:'Soma maelezo ya demo na usalama'
  },
  ja: {
    languageLabel:'言語', eyebrow:'ローカル · 合成データ · デモ', title:'銀行業務を練習。<br><em>実際のお金は使いません。</em>', lead:'Adria Bank は、銀行業務とデジタル資産の手順を練習するデスクトップ・サンドボックスです。スタッフ用または顧客用ポータルを選んでください。', badgeLocal:'データはこの端末内に保存', badgeFake:'口座と支払いは架空', badgeNoLogin:'実際のログイン・接続なし', desktopSim:'デスクトップ・シミュレーター', statusLocal:'ローカル・デモ', practiceBalance:'合成シナリオ', fictionalValue:'参考データ · 実際の残高ではありません', dailyReference:'日次参考値 · 取引提示ではありません', offlineAssets:'架空のオフライン資産', chooseEnvironment:'環境を選択', entryTitle:'どちらを開きますか？', noPassword:'デモ入口 · パスワード不要', staffLabel:'スタッフ', staffTitle:'オペレーション・デスクトップ', staffDescription:'顧客、口座、支払い、リスク、現金窓口、二者承認の練習。', customerLabel:'顧客', customerTitle:'顧客ポータル', customerDescription:'個人・法人の架空プロフィール、カード、貯蓄、セルフサービス練習。', personaNotice:'ログイン口座ではありません。選択するとローカルのデモデータのみを開きます。プロフィール切替は認証やアクセス制御ではありません。', capPayments:'支払い・通貨換算', capPaymentsSub:'送金、受取、取消、ローカル台帳の確認 — 練習専用。', capCrypto:'デジタル資産', capCryptoSub:'ウォレット手順とローカル確認 — ブロックチェーンや保管なし。', capChecks:'形式チェック', capChecksSub:'桁数とチェックサムは口座・カードの実在を証明しません。', capCases:'リスク・サポート', capCasesSub:'KYC/AMLと苦情対応の練習手順。', footerText:'内部テスト専用 · 実際の銀行・取引所接続はありません。', readGuide:'デモと安全上の注意'
  },
  zh: {
    languageLabel:'语言', eyebrow:'本地 · 合成数据 · 演示', title:'练习银行业务。<br><em>不涉及真实资金。</em>', lead:'Adria Bank 是用于演练银行和数字资产流程的交互式桌面沙盒。请选择员工工作区或客户门户。', badgeLocal:'数据保留在此设备', badgeFake:'账户和付款均为虚构', badgeNoLogin:'没有真实登录或连接', desktopSim:'桌面模拟器', statusLocal:'本地演示', practiceBalance:'合成场景', fictionalValue:'说明性数据 · 并非真实余额', dailyReference:'每日参考值 · 非交易报价', offlineAssets:'虚构离线资产', chooseEnvironment:'选择环境', entryTitle:'您要进入哪里？', noPassword:'演示入口 · 无需密码', staffLabel:'员工', staffTitle:'运营工作台', staffDescription:'客户、账户、付款、风险、现金柜台和双人复核演练。', customerLabel:'客户', customerTitle:'客户门户', customerDescription:'虚构个人与企业资料、卡片、储蓄和自助流程演练。', personaNotice:'这些不是登录账户。选择仅打开本地演示数据；切换资料不代表身份验证或访问控制。', capPayments:'付款与兑换', capPaymentsSub:'发送、接收、取消并查看本地账簿 — 仅供演练。', capCrypto:'数字资产', capCryptoSub:'钱包流程和本地复核 — 无区块链或托管。', capChecks:'格式校验', capChecksSub:'长度和校验位不能证明账户或卡片真实存在。', capCases:'风险与支持', capCasesSub:'KYC/AML 与投诉处理演练流程。', footerText:'仅供内部测试 · 不连接真实银行或交易所。', readGuide:'查看演示与安全说明'
  }
};

export const welcomeTranslations = COPY;

const languageSelect = document.querySelector('#welcomeLanguage');
const entryLinks = [...document.querySelectorAll('[data-entry]')];
const byCode = new Map(supportedLanguages.map(item => [item.code, item]));

function readStoredLanguage() {
  const requested = new URLSearchParams(location.search).get('lang');
  if (byCode.has(requested)) return requested;
  try {
    const state = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (byCode.has(state?.settings?.language)) return state.settings.language;
  } catch { /* malformed local settings are ignored on the welcome screen */ }
  return 'hr';
}

languageSelect.innerHTML = supportedLanguages.map(item => `<option value="${item.code}">${item.code.toUpperCase()} · ${item.label.replace(/^[A-Z]{2}\s+/, '')}</option>`).join('');

function applyLanguage(code) {
  const language = byCode.has(code) ? code : 'hr';
  const messages = COPY[language] || EN;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  languageSelect.value = language;
  document.querySelectorAll('[data-welcome-key]').forEach(element => {
    const key = element.dataset.welcomeKey;
    const value = messages[key] || EN[key] || key;
    if (key === 'title') element.innerHTML = value;
    else element.textContent = value;
  });
  for (const link of entryLinks) {
    const target = link.dataset.entry === 'staff' ? './index.html' : './client.html';
    link.href = `${target}?lang=${encodeURIComponent(language)}`;
  }
  const selectLabel = document.querySelector('.welcome-language-label');
  if (selectLabel) selectLabel.setAttribute('aria-label', messages.languageLabel || EN.languageLabel);
}

languageSelect.addEventListener('change', () => applyLanguage(languageSelect.value));
applyLanguage(readStoredLanguage());
