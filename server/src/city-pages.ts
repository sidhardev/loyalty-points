import type { SeoContent, SeoLang } from './seo-render';

// Hand-written city pages, published when the server starts (SeoService.publishHandwritten) — but only into a queued
// page that has no text yet, so a page the writer or the admin already made is never replaced, and a deleted one stays
// deleted. Same shape as the AI-written pages (seo-render.ts).

export const CITY_PAGES: { slug: string; lang: SeoLang; content: SeoContent }[] = [
  {
    slug: 'jaipur',
    lang: 'en',
    content: {
      title: 'Loyalty Card for Shops in Jaipur · Regularhood',
      description: 'A free digital stamp card for Jaipur shops: add a visit with the customer’s phone number, give a reward every few visits and bring regulars back.',
      eyebrow: 'Loyalty for shops in Jaipur',
      h1: 'Turn Jaipur’s walk-in customers into regulars',
      intro:
        'From the lanes of Johari Bazaar to the markets of Mansarovar and Vaishali Nagar, Jaipur has a shop on every corner. Regularhood gives your shop a simple stamp card on the customer’s phone number, so the people who already like you have a reason to come back to you and not to the shop next door.',
      problems: [
        { title: 'The same goods, next door', text: 'In markets like Bapu Bazaar or Raja Park, the same thing is sold in five shops in one lane. Without a reason to pick you, customers pick whoever is closest that day.' },
        { title: 'Tourist rush, local quiet', text: 'The winter season fills the Walled City with visitors, but they leave. The families who live nearby are the ones who keep a shop going through the hot summer months.' },
        { title: 'Festival buyers who vanish', text: 'Teej, Diwali and the wedding season bring big bills. Many of those customers are then not seen again until the next festival.' },
      ],
      steps: [
        { title: 'Type the number', text: 'At the counter, type the customer’s phone number and tap Add visit. Regulars show up after 4 digits; a new number becomes a customer on the spot.' },
        { title: 'The card goes on WhatsApp', text: 'One tap sends the customer their card on WhatsApp, in Hindi or English: their stamps and how many visits are left.' },
        { title: 'Give the reward', text: 'On the visit you chose, the app says Give the reward now. Tap Given and the card starts again.' },
      ],
      billShopName: 'Mansarovar Kirana Corner',
      billItems: [
        { name: 'Atta 5 kg', price: 250 },
        { name: 'Toor dal 1 kg', price: 160 },
        { name: 'Mustard oil 1L', price: 180 },
        { name: 'Papad pack', price: 60 },
      ],
      rewards: [
        { name: 'A free kite for the kids before Makar Sankranti', visits: 4 },
        { name: 'A free papad pack at a kirana store', visits: 5 },
        { name: 'A free head massage at a salon', visits: 6 },
        { name: 'Free 250 g gajak at a sweet shop in winter', visits: 8 },
      ],
      tips: [
        'Before Makar Sankranti, when all of Jaipur is up on the rooftops, set a small festive reward and tell your regulars on WhatsApp.',
        'Put the counter poster where people wait during the Teej and Diwali rush, so new faces join the card while they stand in line.',
        'Talk to customers the way you always do, in Hindi or Marwari, and send their card in Hindi: it feels like your shop, not like an app.',
        'When footfall drops in the summer heat, open the list of customers who haven’t come back and send them the ready “we miss you” message.',
        'If your shop is in a tourist market, build the card around the local families nearby: they are the ones who can come back every week.',
      ],
      faqs: [
        { q: 'Does Regularhood work for shops in Jaipur’s old city markets?', a: 'Yes. All you need is a phone, tablet or computer with internet at the counter. Customers don’t install anything: the shop types their phone number.' },
        { q: 'My customers speak Hindi. Is the card in Hindi?', a: 'Yes. The customer’s card on WhatsApp can be sent in Hindi or English, and the shop app works in both languages.' },
        { q: 'What if a customer doesn’t have a smartphone?', a: 'That’s fine. The card is on their phone number, so the shop counts every visit even if the customer uses a basic phone.' },
        { q: 'What reward should a shop in Jaipur give?', a: 'Pick something small your regulars like, such as a papad pack at a kirana store or a seasonal sweet in winter. You choose how many visits it takes, from 3 to 10.' },
        { q: 'How much does it cost?', a: 'Regularhood is free to start, and setting it up takes about a minute on the phone you already have.' },
      ],
    },
  },
  {
    slug: 'jaipur',
    lang: 'hi',
    content: {
      title: 'जयपुर की दुकानों के लिए लॉयल्टी कार्ड · Regularhood',
      description: 'जयपुर की दुकानों के लिए मुफ़्त डिजिटल स्टैम्प कार्ड: ग्राहक के फ़ोन नंबर पर विज़िट जोड़ें, हर कुछ विज़िट पर इनाम दें और पक्के ग्राहक बनाएँ।',
      eyebrow: 'जयपुर की दुकानों के लिए लॉयल्टी',
      h1: 'जयपुर के आते-जाते ग्राहकों को पक्का ग्राहक बनाइए',
      intro:
        'जौहरी बाज़ार की गलियों से लेकर मानसरोवर और वैशाली नगर के बाज़ारों तक, जयपुर में हर मोड़ पर एक दुकान है। Regularhood आपकी दुकान को ग्राहक के फ़ोन नंबर पर एक आसान स्टैम्प कार्ड देता है, ताकि जो लोग आपको पसंद करते हैं उनके पास बगल वाली दुकान की जगह आपके पास लौटने की वजह हो।',
      problems: [
        { title: 'वही सामान, बगल की दुकान पर', text: 'बापू बाज़ार या राजा पार्क जैसे बाज़ारों में एक ही गली की पाँच दुकानों पर वही सामान मिलता है। आपको चुनने की कोई वजह न हो तो ग्राहक उस दिन जो पास हो वहीं चला जाता है।' },
        { title: 'सैलानियों की भीड़, फिर सन्नाटा', text: 'सर्दियों में परकोटे में सैलानियों की भीड़ रहती है, पर वे लौट जाते हैं। गर्मी के महीनों में दुकान आसपास रहने वाले परिवारों से ही चलती है।' },
        { title: 'त्योहार के ग्राहक जो फिर नहीं दिखते', text: 'तीज, दिवाली और शादियों के सीज़न में बड़े बिल बनते हैं। फिर उनमें से कई ग्राहक अगले त्योहार तक नज़र नहीं आते।' },
      ],
      steps: [
        { title: 'नंबर टाइप करें', text: 'काउंटर पर ग्राहक का फ़ोन नंबर टाइप करें और विज़िट जोड़ें दबाएँ। पुराने ग्राहक 4 अंक लिखते ही दिख जाते हैं; नया नंबर उसी समय ग्राहक बन जाता है।' },
        { title: 'कार्ड WhatsApp पर जाता है', text: 'एक टैप में ग्राहक को उसका कार्ड WhatsApp पर हिंदी या अंग्रेज़ी में चला जाता है: कितने स्टैम्प हुए और कितनी विज़िट बाकी हैं।' },
        { title: 'इनाम दें', text: 'जो विज़िट आपने तय की, उस पर ऐप बताता है कि अब इनाम दें। दिया दबाइए और कार्ड फिर से शुरू हो जाता है।' },
      ],
      billShopName: 'मानसरोवर किराना कॉर्नर',
      billItems: [
        { name: 'आटा 5 किलो', price: 250 },
        { name: 'तुअर दाल 1 किलो', price: 160 },
        { name: 'सरसों तेल 1 ली.', price: 180 },
        { name: 'पापड़ पैकेट', price: 60 },
      ],
      rewards: [
        { name: 'मकर संक्रांति से पहले बच्चों के लिए एक मुफ़्त पतंग', visits: 4 },
        { name: 'किराना स्टोर पर एक मुफ़्त पापड़ पैकेट', visits: 5 },
        { name: 'सैलून में मुफ़्त हेड मसाज', visits: 6 },
        { name: 'सर्दियों में मिठाई की दुकान पर 250 ग्राम गजक मुफ़्त', visits: 8 },
      ],
      tips: [
        'मकर संक्रांति से पहले, जब पूरा जयपुर छतों पर होता है, एक छोटा त्योहारी इनाम रखें और अपने पक्के ग्राहकों को WhatsApp पर बताएँ।',
        'तीज और दिवाली की भीड़ में काउंटर पोस्टर वहाँ लगाएँ जहाँ लोग इंतज़ार करते हैं, ताकि लाइन में खड़े नए ग्राहक भी कार्ड से जुड़ जाएँ।',
        'ग्राहकों से वैसे ही बात करें जैसे हमेशा करते हैं, हिंदी या मारवाड़ी में, और उनका कार्ड हिंदी में भेजें: यह आपकी दुकान जैसा लगता है, किसी ऐप जैसा नहीं।',
        'गर्मी में जब ग्राहक कम आएँ, तो उन ग्राहकों की सूची खोलें जो काफ़ी समय से नहीं आए, और तैयार “आपकी याद आई” मैसेज भेज दें।',
        'अगर आपकी दुकान सैलानियों वाले बाज़ार में है, तो कार्ड आसपास के परिवारों के लिए रखें: हर हफ़्ते लौटकर वही आ सकते हैं।',
      ],
      faqs: [
        { q: 'क्या Regularhood जयपुर के पुराने शहर के बाज़ारों की दुकानों में चलता है?', a: 'हाँ। काउंटर पर इंटरनेट वाला फ़ोन, टैबलेट या कंप्यूटर काफ़ी है। ग्राहकों को कुछ इंस्टॉल नहीं करना पड़ता: दुकान बस उनका फ़ोन नंबर टाइप करती है।' },
        { q: 'मेरे ग्राहक हिंदी बोलते हैं। क्या कार्ड हिंदी में है?', a: 'हाँ। ग्राहक का कार्ड WhatsApp पर हिंदी या अंग्रेज़ी में भेजा जा सकता है, और दुकान का ऐप भी दोनों भाषाओं में चलता है।' },
        { q: 'अगर ग्राहक के पास स्मार्टफ़ोन न हो तो?', a: 'कोई बात नहीं। कार्ड उनके फ़ोन नंबर पर है, इसलिए साधारण फ़ोन वाले ग्राहक की भी हर विज़िट गिनी जाती है।' },
        { q: 'जयपुर की दुकान कौन-सा इनाम दे?', a: 'कोई छोटी चीज़ चुनें जो आपके ग्राहकों को पसंद हो, जैसे किराना स्टोर पर पापड़ का पैकेट या सर्दियों में मौसमी मिठाई। कितनी विज़िट पर इनाम मिले, यह आप 3 से 10 के बीच तय करते हैं।' },
        { q: 'इसका खर्च कितना है?', a: 'Regularhood शुरू करना मुफ़्त है, और आपके अपने फ़ोन पर सेटअप करीब एक मिनट में हो जाता है।' },
      ],
    },
  },
  {
    slug: 'indore',
    lang: 'en',
    content: {
      title: 'Loyalty Rewards for Shops in Indore · Regularhood',
      description: 'A free stamp card for Indore shops on the customer’s phone number: one tap per visit, a reward every few visits, and the card on WhatsApp.',
      eyebrow: 'Loyalty for shops in Indore',
      h1: 'Give Indore’s shoppers a reason to come back to you',
      intro:
        'Indore loves to shop and loves to eat, from Rajwada and MG Road to Vijay Nagar and Palasia. With so much choice, even happy customers drift to the next counter. Regularhood is a simple stamp card on the customer’s phone number that rewards them for coming back to your shop.',
      problems: [
        { title: 'A new favourite every week', text: 'Indore’s food lovers try the newest namkeen shop or snack counter as soon as it opens. If nothing ties them to you, last month’s regular becomes this month’s stranger.' },
        { title: 'Busy markets, many choices', text: 'Around Rajwada or Sapna Sangeeta, customers pass a dozen shops selling what you sell. The one they remember is the one that gave them a reason to return.' },
        { title: 'Festival peaks, then silence', text: 'Navratri, Diwali and Rang Panchami bring full counters. After the festival, many of those customers are not heard from again.' },
      ],
      steps: [
        { title: 'Add the visit', text: 'Type the customer’s phone number at the counter and tap Add visit. Regulars’ numbers come up after 4 digits; new numbers are added on the spot.' },
        { title: 'Send the card', text: 'One tap sends their card on WhatsApp in Hindi or English, showing their stamps and how many visits are left.' },
        { title: 'Reward the regular', text: 'When they reach your number of visits, the app says Give the reward now. Tap Given and a fresh card begins.' },
      ],
      billShopName: 'Palasia Namkeen Bhandar',
      billItems: [
        { name: 'Ratlami sev', price: 90 },
        { name: 'Khatta meetha', price: 80 },
        { name: 'Jalebi 250 g', price: 60 },
        { name: 'Poha 1 kg', price: 70 },
      ],
      rewards: [
        { name: 'Free 100 g sev at a namkeen shop', visits: 4 },
        { name: 'A free plate of jalebi at a snack counter', visits: 5 },
        { name: 'A free hair wash at a salon', visits: 6 },
        { name: 'Free 250 g namkeen of the customer’s choice', visits: 8 },
      ],
      tips: [
        'Indore’s customers know their namkeen and their snacks: a small taste of your best item makes a better reward than a discount.',
        'Before Navratri and Diwali, send regulars their card on WhatsApp so they remember how close they are to a reward when they shop for the festival.',
        'Keep the rule easy to say out loud, like every 5 visits a free gift, so your staff can explain it in one line during the evening rush.',
        'After Rang Panchami and the wedding season, open the list of customers who haven’t come back and send them the ready “we miss you” message.',
      ],
      faqs: [
        { q: 'Is Regularhood good for namkeen and snack shops in Indore?', a: 'Yes. Shops where people come often and spend a little each time are where a stamp card works best. Every visit is one tap at the counter.' },
        { q: 'Do my customers need to download an app?', a: 'No. There is no app, QR code or sign-up for customers. The shop types their phone number and their card can be sent on WhatsApp.' },
        { q: 'Can I use it in Hindi?', a: 'Yes. The shop app and the customer’s WhatsApp card both work in Hindi and English.' },
        { q: 'Can a customer get two stamps in one day?', a: 'No. A phone number counts once a day, and any visit or reward added by mistake can be undone.' },
        { q: 'What does it cost a shop in Indore?', a: 'Regularhood is free to start. Setting up takes about a minute on any phone, tablet or computer with internet.' },
      ],
    },
  },
  {
    slug: 'indore',
    lang: 'hi',
    content: {
      title: 'इंदौर की दुकानों के लिए लॉयल्टी इनाम · Regularhood',
      description: 'इंदौर की दुकानों के लिए ग्राहक के फ़ोन नंबर पर मुफ़्त स्टैम्प कार्ड: हर विज़िट पर एक टैप, कुछ विज़िट पर इनाम, और कार्ड WhatsApp पर।',
      eyebrow: 'इंदौर की दुकानों के लिए लॉयल्टी',
      h1: 'इंदौर के ग्राहकों को आपके पास लौटने की वजह दीजिए',
      intro:
        'इंदौर को खरीदारी भी पसंद है और खाना भी, राजवाड़ा और एमजी रोड से लेकर विजय नगर और पलासिया तक। इतने विकल्पों में खुश ग्राहक भी अगले काउंटर पर चले जाते हैं। Regularhood ग्राहक के फ़ोन नंबर पर एक आसान स्टैम्प कार्ड है, जो आपकी दुकान पर लौटने पर इनाम देता है।',
      problems: [
        { title: 'हर हफ़्ते नई पसंद', text: 'इंदौर के खाने के शौकीन हर नई नमकीन की दुकान या नाश्ते का काउंटर खुलते ही आज़माते हैं। अगर उन्हें आपसे कुछ न जोड़े, तो पिछले महीने का पक्का ग्राहक इस महीने अनजान हो जाता है।' },
        { title: 'भीड़ भरे बाज़ार, ढेरों विकल्प', text: 'राजवाड़ा या सपना संगीता के आसपास ग्राहक आपके जैसा सामान बेचने वाली दर्जनों दुकानों के सामने से गुज़रते हैं। याद वही रहती है जिसने लौटने की वजह दी।' },
        { title: 'त्योहार पर भीड़, फिर सन्नाटा', text: 'नवरात्रि, दिवाली और रंगपंचमी पर काउंटर भरे रहते हैं। त्योहार के बाद उनमें से कई ग्राहकों की फिर कोई खबर नहीं मिलती।' },
      ],
      steps: [
        { title: 'विज़िट जोड़ें', text: 'काउंटर पर ग्राहक का फ़ोन नंबर टाइप करें और विज़िट जोड़ें दबाएँ। पुराने ग्राहकों के नंबर 4 अंक लिखते ही आ जाते हैं; नए नंबर उसी समय जुड़ जाते हैं।' },
        { title: 'कार्ड भेजें', text: 'एक टैप में उनका कार्ड WhatsApp पर हिंदी या अंग्रेज़ी में चला जाता है, जिसमें स्टैम्प और बाकी विज़िट दिखती हैं।' },
        { title: 'पक्के ग्राहक को इनाम', text: 'जब वे आपकी तय विज़िट पूरी कर लें, ऐप बताता है कि अब इनाम दें। दिया दबाइए और नया कार्ड शुरू हो जाता है।' },
      ],
      billShopName: 'पलासिया नमकीन भंडार',
      billItems: [
        { name: 'रतलामी सेव', price: 90 },
        { name: 'खट्टा मीठा', price: 80 },
        { name: 'जलेबी 250 ग्राम', price: 60 },
        { name: 'पोहा 1 किलो', price: 70 },
      ],
      rewards: [
        { name: 'नमकीन की दुकान पर 100 ग्राम सेव मुफ़्त', visits: 4 },
        { name: 'नाश्ते के काउंटर पर एक प्लेट जलेबी मुफ़्त', visits: 5 },
        { name: 'सैलून में मुफ़्त हेयर वॉश', visits: 6 },
        { name: 'ग्राहक की पसंद की 250 ग्राम नमकीन मुफ़्त', visits: 8 },
      ],
      tips: [
        'इंदौर के ग्राहक अपनी नमकीन और नाश्ते को अच्छी तरह पहचानते हैं: छूट से बेहतर इनाम है आपकी सबसे अच्छी चीज़ का थोड़ा-सा स्वाद।',
        'नवरात्रि और दिवाली से पहले पक्के ग्राहकों को WhatsApp पर उनका कार्ड भेजें, ताकि त्योहार की खरीदारी में उन्हें याद रहे कि इनाम कितना पास है।',
        'नियम ऐसा रखें जो एक लाइन में बोला जा सके, जैसे हर 5 विज़िट पर एक मुफ़्त तोहफ़ा, ताकि शाम की भीड़ में स्टाफ़ आसानी से समझा सके।',
        'रंगपंचमी और शादियों के सीज़न के बाद उन ग्राहकों की सूची खोलें जो लौटकर नहीं आए, और तैयार “आपकी याद आई” मैसेज भेज दें।',
      ],
      faqs: [
        { q: 'क्या Regularhood इंदौर की नमकीन और नाश्ते की दुकानों के लिए अच्छा है?', a: 'हाँ। जहाँ लोग बार-बार आते हैं और हर बार थोड़ा खर्च करते हैं, वहाँ स्टैम्प कार्ड सबसे अच्छा काम करता है। हर विज़िट काउंटर पर बस एक टैप है।' },
        { q: 'क्या मेरे ग्राहकों को ऐप डाउनलोड करना होगा?', a: 'नहीं। ग्राहकों के लिए कोई ऐप, क्यूआर कोड या साइन-अप नहीं है। दुकान उनका फ़ोन नंबर टाइप करती है और कार्ड WhatsApp पर भेजा जा सकता है।' },
        { q: 'क्या मैं इसे हिंदी में चला सकता हूँ?', a: 'हाँ। दुकान का ऐप और ग्राहक का WhatsApp कार्ड, दोनों हिंदी और अंग्रेज़ी में चलते हैं।' },
        { q: 'क्या एक ग्राहक को एक दिन में दो स्टैम्प मिल सकते हैं?', a: 'नहीं। एक फ़ोन नंबर दिन में एक बार गिना जाता है, और गलती से जुड़ी विज़िट या इनाम वापस लिया जा सकता है।' },
        { q: 'इंदौर की दुकान के लिए इसका खर्च कितना है?', a: 'Regularhood शुरू करना मुफ़्त है। इंटरनेट वाले किसी भी फ़ोन, टैबलेट या कंप्यूटर पर सेटअप करीब एक मिनट में हो जाता है।' },
      ],
    },
  },
  {
    slug: 'lucknow',
    lang: 'en',
    content: {
      title: 'Loyalty Card for Lucknow Shops · Regularhood',
      description: 'A free digital stamp card for shops in Lucknow: count visits on the customer’s phone number, give a reward every few visits, send the card on WhatsApp.',
      eyebrow: 'Loyalty for shops in Lucknow',
      h1: 'Keep Lucknow’s regulars coming back to your counter',
      intro:
        'Lucknow shops run on relationships, from the old lanes of Chowk and Aminabad to Hazratganj, Aliganj and Gomti Nagar. Regularhood turns that relationship into a simple stamp card on the customer’s phone number, so a regular always knows their next visit to you counts.',
      problems: [
        { title: 'New malls, new habits', text: 'As new markets and big stores open across Gomti Nagar and beyond, even loyal families try them out. A neighbourhood shop needs a reason to stay their first stop.' },
        { title: 'Many shops, one lane', text: 'In Aminabad or Bhootnath Market, the same sweets, clothes and groceries are sold side by side. Customers stay with the shop that remembers them.' },
        { title: 'Big festival bills, then a gap', text: 'Eid, Diwali and the wedding season bring large orders. Without a nudge, many of those customers don’t return until the next occasion.' },
      ],
      steps: [
        { title: 'Count the visit', text: 'Type the customer’s phone number and tap Add visit. Regulars appear after 4 digits, and a new number becomes a customer right away.' },
        { title: 'Card on WhatsApp', text: 'With one tap the customer gets their card on WhatsApp in Hindi or English, with their stamps and visits left.' },
        { title: 'Hand over the reward', text: 'On the visit you set, the app says Give the reward now. Tap Given and the card starts over.' },
      ],
      billShopName: 'Aliganj Sweets & Bakery',
      billItems: [
        { name: 'Khasta (2 pc)', price: 40 },
        { name: 'Rasmalai 2 pc', price: 80 },
        { name: 'Milk cake 250g', price: 120 },
        { name: 'Rusk pack', price: 50 },
      ],
      rewards: [
        { name: 'A free khasta at a sweet shop', visits: 4 },
        { name: 'A free head massage at a salon', visits: 5 },
        { name: 'Two free pieces of sweets of the customer’s choice', visits: 6 },
        { name: 'Free stitching of one kurta at a tailor', visits: 10 },
      ],
      tips: [
        'Lucknow’s customers notice good manners: greet regulars by name when their number comes up, and tell them how many visits are left.',
        'Before Eid and Diwali, send your regulars their card on WhatsApp so they plan their festival shopping around their next reward.',
        'For chikankari and clothing shops, where visits are less frequent, set a lower number of visits so the reward still feels close.',
        'Once a month, open the list of customers who haven’t come back and send the ready message; a polite word brings many of them back.',
      ],
      faqs: [
        { q: 'Does Regularhood work for sweet shops and bakeries in Lucknow?', a: 'Yes. Sweet shops, bakeries and other shops with frequent small bills are a good fit: each visit is one tap at the counter.' },
        { q: 'Is it available in Hindi?', a: 'Yes. Both the shop app and the customer’s WhatsApp card work in Hindi and English.' },
        { q: 'Do customers need a smartphone or an app?', a: 'No. The card is on their phone number, so customers with any phone can collect stamps, and nobody installs anything.' },
        { q: 'What if I add a visit by mistake?', a: 'Any visit or reward can be undone. A phone number also counts only once a day, so a stamp can’t be added twice by accident.' },
        { q: 'How much does it cost?', a: 'Regularhood is free to start, and you can set it up in about a minute.' },
      ],
    },
  },
  {
    slug: 'lucknow',
    lang: 'hi',
    content: {
      title: 'लखनऊ की दुकानों के लिए लॉयल्टी कार्ड · Regularhood',
      description: 'लखनऊ की दुकानों के लिए मुफ़्त डिजिटल स्टैम्प कार्ड: ग्राहक के फ़ोन नंबर पर विज़िट गिनें, कुछ विज़िट पर इनाम दें, कार्ड WhatsApp पर भेजें।',
      eyebrow: 'लखनऊ की दुकानों के लिए लॉयल्टी',
      h1: 'लखनऊ के पक्के ग्राहकों को अपने काउंटर पर लौटाते रहिए',
      intro:
        'लखनऊ की दुकानें रिश्तों से चलती हैं, चौक और अमीनाबाद की पुरानी गलियों से लेकर हज़रतगंज, अलीगंज और गोमती नगर तक। Regularhood इसी रिश्ते को ग्राहक के फ़ोन नंबर पर एक आसान स्टैम्प कार्ड बना देता है, ताकि पक्के ग्राहक को पता रहे कि आपके पास उसकी अगली विज़िट गिनी जाएगी।',
      problems: [
        { title: 'नए मॉल, नई आदतें', text: 'गोमती नगर और आसपास नए बाज़ार और बड़े स्टोर खुलते हैं, तो पुराने परिवार भी उन्हें आज़माते हैं। मोहल्ले की दुकान को पहली पसंद बने रहने की वजह चाहिए।' },
        { title: 'एक गली, कई दुकानें', text: 'अमीनाबाद या भूतनाथ मार्केट में वही मिठाई, कपड़े और राशन अगल-बगल बिकते हैं। ग्राहक उसी दुकान पर टिकता है जो उसे याद रखे।' },
        { title: 'त्योहार के बड़े बिल, फिर लंबा अंतर', text: 'ईद, दिवाली और शादियों के सीज़न में बड़े ऑर्डर आते हैं। याद न दिलाया जाए तो कई ग्राहक अगले मौके तक नहीं लौटते।' },
      ],
      steps: [
        { title: 'विज़िट गिनें', text: 'ग्राहक का फ़ोन नंबर टाइप करें और विज़िट जोड़ें दबाएँ। पुराने ग्राहक 4 अंक लिखते ही दिख जाते हैं, और नया नंबर तुरंत ग्राहक बन जाता है।' },
        { title: 'कार्ड WhatsApp पर', text: 'एक टैप में ग्राहक को उसका कार्ड WhatsApp पर हिंदी या अंग्रेज़ी में मिल जाता है, स्टैम्प और बाकी विज़िट के साथ।' },
        { title: 'इनाम दीजिए', text: 'जो विज़िट आपने तय की, उस पर ऐप बताता है कि अब इनाम दें। दिया दबाइए और कार्ड फिर से शुरू हो जाता है।' },
      ],
      billShopName: 'अलीगंज स्वीट्स एंड बेकरी',
      billItems: [
        { name: 'खस्ता (2 पीस)', price: 40 },
        { name: 'रसमलाई 2 पीस', price: 80 },
        { name: 'मिल्क केक 250 ग्राम', price: 120 },
        { name: 'रस्क पैकेट', price: 50 },
      ],
      rewards: [
        { name: 'मिठाई की दुकान पर एक खस्ता मुफ़्त', visits: 4 },
        { name: 'सैलून में मुफ़्त हेड मसाज', visits: 5 },
        { name: 'ग्राहक की पसंद की दो पीस मिठाई मुफ़्त', visits: 6 },
        { name: 'दर्ज़ी के यहाँ एक कुर्ते की सिलाई मुफ़्त', visits: 10 },
      ],
      tips: [
        'लखनऊ के ग्राहक तहज़ीब पर ध्यान देते हैं: जब पक्के ग्राहक का नंबर आए तो उन्हें नाम से बुलाएँ और बताएँ कि इनाम में कितनी विज़िट बाकी हैं।',
        'ईद और दिवाली से पहले पक्के ग्राहकों को WhatsApp पर उनका कार्ड भेजें, ताकि त्योहार की खरीदारी में उन्हें अगला इनाम याद रहे।',
        'चिकनकारी और कपड़ों की दुकानों पर ग्राहक कम बार आते हैं, इसलिए विज़िट की संख्या कम रखें ताकि इनाम पास लगे।',
        'महीने में एक बार उन ग्राहकों की सूची खोलें जो लौटकर नहीं आए, और तैयार मैसेज भेजें; एक अदब भरी बात से कई लौट आते हैं।',
      ],
      faqs: [
        { q: 'क्या Regularhood लखनऊ की मिठाई की दुकानों और बेकरी में चलता है?', a: 'हाँ। मिठाई की दुकान, बेकरी और ऐसी दुकानें जहाँ छोटे-छोटे बिल बार-बार बनते हैं, उनके लिए यह बढ़िया है: हर विज़िट काउंटर पर बस एक टैप है।' },
        { q: 'क्या यह हिंदी में है?', a: 'हाँ। दुकान का ऐप और ग्राहक का WhatsApp कार्ड, दोनों हिंदी और अंग्रेज़ी में चलते हैं।' },
        { q: 'क्या ग्राहकों को स्मार्टफ़ोन या ऐप चाहिए?', a: 'नहीं। कार्ड उनके फ़ोन नंबर पर है, इसलिए किसी भी फ़ोन वाला ग्राहक स्टैम्प जमा कर सकता है, और किसी को कुछ इंस्टॉल नहीं करना पड़ता।' },
        { q: 'अगर गलती से विज़िट जुड़ जाए तो?', a: 'कोई भी विज़िट या इनाम वापस लिया जा सकता है। एक फ़ोन नंबर दिन में एक ही बार गिना जाता है, इसलिए गलती से दो स्टैम्प नहीं लगते।' },
        { q: 'इसका खर्च कितना है?', a: 'Regularhood शुरू करना मुफ़्त है, और आप इसे करीब एक मिनट में सेट कर सकते हैं।' },
      ],
    },
  },
];
