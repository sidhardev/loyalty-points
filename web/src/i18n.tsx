import { useEffect, useState, type ReactNode } from 'react';

// English / Hindi / Malayalam for the customer's card and the shop's own screens (switched with LangToggle, remembered per phone).
// Texts are looked up by their English wording; {name}-style placeholders are filled in after translating.

export type Lang = 'en' | 'hi' | 'ml';

const HI: Record<string, string> = {
  // member card and wallet
  'Add your card to your home screen': 'अपना कार्ड होम स्क्रीन पर लगाएँ',
  History: 'हिस्ट्री',
  "This link doesn't work": 'यह लिंक काम नहीं कर रहा',

  // stamp card
  '{shop} · My card': '{shop} · मेरा कार्ड',
  'Every {n} visits → {reward}': 'हर {n} विज़िट पर → {reward}',
  'Your {reward} is ready! 🎁': 'आपका {reward} तैयार है! 🎁',
  '1 more visit for {reward}': 'बस 1 और विज़िट, फिर {reward}',
  '{n} more visits for {reward}': 'बस {n} और विज़िट, फिर {reward}',
  'Get it on your next visit — just tell your phone number.': 'अगली बार आने पर लें — बस अपना फ़ोन नंबर बताएँ।',
  'Visit {x} of {n}': 'विज़िट {x} / {n}',
  'Just tell your phone number at the counter': 'काउंटर पर बस अपना फ़ोन नंबर बताएँ',
  'One visit a day counts. No app, no sign-up.': 'दिन में एक विज़िट गिनी जाती है। कोई ऐप नहीं, कोई साइन-अप नहीं।',
  'The shop sends your card on WhatsApp. No app, no sign-up.': 'दुकान आपका कार्ड WhatsApp पर भेजेगी। कोई ऐप नहीं, कोई साइन-अप नहीं।',
  'There is nothing to scan or log in to any more. The shop adds your visit and sends your card on WhatsApp.':
    'अब कुछ स्कैन या लॉग इन नहीं करना है। दुकान आपकी विज़िट जोड़ेगी और कार्ड WhatsApp पर भेजेगी।',
  'See your visits in one tap.': 'एक टैप में अपनी विज़िट देखें।',
  'Ask the shop to send your card again on WhatsApp.': 'दुकान से कहें कि आपका कार्ड फिर से WhatsApp पर भेजें।',
  'This QR code is not valid': 'यह QR कोड सही नहीं है',
  Visit: 'विज़िट',
  'Got {reward}': '{reward} मिला',
  'No visits yet.': 'अभी कोई विज़िट नहीं।',

  // the shop's screens
  'Add visit': 'विज़िट जोड़ें',
  Customers: 'ग्राहक',
  Settings: 'सेटिंग्स',
  'Install app': 'ऐप इंस्टॉल करें',
  'Your loyalty card': 'आपका लॉयल्टी कार्ड',
  'One rule for every customer. You can change it later in Settings.': 'हर ग्राहक के लिए एक नियम। बाद में सेटिंग्स में बदल सकते हैं।',
  Every: 'हर',
  'visits, the customer gets': 'विज़िट पर ग्राहक को मिलेगा',
  'Free chai': 'मुफ़्त चाय',
  Start: 'शुरू करें',
  Save: 'सेव करें',
  'Saving…': 'सेव हो रहा है…',
  Saved: 'सेव हो गया',
  'Every {n} visits →': 'हर {n} विज़िट पर →',
  'Customer’s phone number': 'ग्राहक का फ़ोन नंबर',
  '🎁 reward due': '🎁 इनाम बाकी',
  Clear: 'मिटाएँ',
  'Adding…': 'जुड़ रहा है…',
  Today: 'आज',
  visit: 'विज़िट',
  visits: 'विज़िट',
  'reward given': 'इनाम दिया',
  'rewards given': 'इनाम दिए',
  'Give {reward} now': 'अभी {reward} दें',
  'Visit already counted today.': 'आज की विज़िट पहले ही जुड़ चुकी है।',
  'This is visit {n}.': 'यह विज़िट {n} है।',
  'Their card is full.': 'कार्ड पूरा हो गया।',
  Given: 'दे दिया',
  'Not now — give it next time': 'अभी नहीं — अगली बार देंगे',
  'Wrong number? Undo': 'गलत नंबर? वापस लें',
  'Reward given 🎉': 'इनाम दे दिया 🎉',
  'Their card starts again.': 'कार्ड फिर से शुरू।',
  'Already counted today': 'आज पहले ही जुड़ चुका है',
  'One visit a day.': 'दिन में एक विज़िट।',
  '{n} more for {reward}.': 'बस {n} और, फिर {reward}।',
  'New customer!': 'नया ग्राहक!',
  'Send card on WhatsApp': 'WhatsApp पर कार्ड भेजें',
  'Next customer': 'अगला ग्राहक',
  'Visit removed': 'विज़िट हटा दी',

  // customers
  All: 'सभी',
  'Reward waiting': 'इनाम बाकी',
  'Not seen {n} days': '{n} दिन से नहीं आए',
  customer: 'ग्राहक',
  customers: 'ग्राहक',
  shown: 'दिख रहे',
  'Everyone who visited': 'जो भी आए',
  'Search phone number': 'फ़ोन नंबर खोजें',
  'Tap Remind to open WhatsApp with a ready message.': '“याद दिलाएँ” दबाएँ, WhatsApp तैयार मैसेज के साथ खुलेगा।',
  Sent: 'भेज दिया',
  Remind: 'याद दिलाएँ',
  Reward: 'इनाम',
  'No number matches': 'कोई नंबर नहीं मिला',
  'Everyone came back recently 🎉': 'सब हाल ही में आए हैं 🎉',
  'No rewards waiting': 'कोई इनाम बाकी नहीं',
  'No customers yet': 'अभी कोई ग्राहक नहीं',
  'Add a visit with a phone number — the customer shows up here.': 'फ़ोन नंबर से विज़िट जोड़ें — ग्राहक यहाँ दिखेगा।',
  'Add a visit': 'विज़िट जोड़ें',
  'no visits yet': 'अभी कोई विज़िट नहीं',
  'came today': 'आज आए',
  'came yesterday': 'कल आए',
  'came {n} days ago': '{n} दिन पहले आए',
  'Number changed': 'नंबर बदल गया',
  'Change number': 'नंबर बदलें',
  'Phone number': 'फ़ोन नंबर',
  '{reward} given 🎉': '{reward} दे दिया 🎉',
  'Undo this visit?': 'यह विज़िट वापस लें?',
  'Undo this reward?': 'यह इनाम वापस लें?',
  '{when} will be taken off their card.': '{when} वाली एंट्री कार्ड से हट जाएगी।',
  Undo: 'वापस लें',
  Undone: 'वापस ले लिया',
  undone: 'वापस लिया',
  'Delete {phone}?': '{phone} हटाएँ?',
  'Their stamps and history will be deleted. This can’t be undone.': 'इनकी सारी विज़िट और हिस्ट्री मिट जाएगी। यह वापस नहीं होगा।',
  Delete: 'हटाएँ',
  'Customer deleted': 'ग्राहक हटा दिया',
  'Give {reward}': '{reward} दें',
  'All visits': 'कुल विज़िट',
  Rewards: 'इनाम',
  'Last visit': 'आखिरी विज़िट',
  '{n}d ago': '{n} दिन पहले',
  'Send card': 'कार्ड भेजें',
  'See their card': 'उनका कार्ड देखें',

  // settings
  'Settings saved': 'सेटिंग्स सेव हो गईं',
  'Your card': 'आपका कार्ड',
  "Changing the number keeps everyone's visits. Customers who already have enough get the reward on their next visit.":
    'संख्या बदलने पर सबकी विज़िट बनी रहती हैं। जिनकी विज़िट पूरी हो चुकी हैं, उन्हें अगली बार इनाम मिलेगा।',
  Shop: 'दुकान',
  'Shop name': 'दुकान का नाम',
  'Your WhatsApp number': 'आपका WhatsApp नंबर',
  "Only for Regularhood support. Customers don't see it.": 'सिर्फ़ Regularhood सपोर्ट के लिए। ग्राहकों को नहीं दिखता।',
  'WhatsApp message to customers': 'ग्राहकों को WhatsApp मैसेज',
  'Saved on this phone right away.': 'इस फ़ोन पर तुरंत सेव हो जाता है।',
  Reminders: 'याद दिलाना',
  'Days without a visit before a customer counts as “not seen”': 'कितने दिन न आने पर ग्राहक “नहीं आए” में दिखे',
  'Save settings': 'सेटिंग्स सेव करें',
  'Counter poster': 'काउंटर पोस्टर',
  'Put it where people pay, so customers know about your card and tell you their number.': 'इसे बिल काउंटर पर लगाएँ, ताकि ग्राहक कार्ड के बारे में जानें और अपना नंबर बताएँ।',
  Green: 'हरा',
  'Light (saves ink)': 'हल्का (स्याही बचाए)',
  'Hindi lines': 'हिंदी लाइनें',
  'Print (A4)': 'प्रिंट (A4)',
  'Download PNG': 'PNG डाउनलोड करें',
  'Your data': 'आपका डेटा',
  'Activity log': 'गतिविधि लॉग',
  'Rewards given, undos, deleted customers and changes': 'दिए गए इनाम, वापस ली गई एंट्री, हटाए ग्राहक और बदलाव',
  'Download a spreadsheet (opens in Excel or Google Sheets). Keep a copy as a backup.': 'स्प्रेडशीट डाउनलोड करें (Excel या Google Sheets में खुलती है)। बैकअप के लिए एक कॉपी रखें।',
  'Preparing…': 'तैयार हो रहा है…',
  'Visit history': 'विज़िट हिस्ट्री',
  Downloaded: 'डाउनलोड हो गया',
  Account: 'अकाउंट',
  'App language': 'ऐप की भाषा',
  'Dark mode': 'डार्क मोड',
  'Turn on': 'चालू करें',
  'Turn off': 'बंद करें',
  'Log out?': 'लॉग आउट करें?',
  'Log out': 'लॉग आउट',

  // plan (Free or Founding Shop)
  'Your plan': 'आपका प्लान',
  'Customer limit and Founding Shop': 'ग्राहकों की लिमिट और फ़ाउंडिंग शॉप',
  Free: 'फ़्री',
  'Early shop': 'शुरुआती दुकान',
  'Founding Shop #{n}': 'फ़ाउंडिंग शॉप #{n}',
  'For life': 'हमेशा के लिए',
  'Until {date}': '{date} तक',
  '{n} customers · no limit': '{n} ग्राहक · कोई लिमिट नहीं',
  '{n} of {limit} customers on the Free plan': 'फ़्री प्लान पर {limit} में से {n} ग्राहक',
  'Your yearly plan has ended. Renew to add new customers again.': 'आपका सालाना प्लान खत्म हो गया है। नए ग्राहक जोड़ने के लिए रिन्यू करें।',
  'Become a Founding Shop': 'फ़ाउंडिंग शॉप बनें',
  'All places taken': 'सारी जगहें भर गईं',
  '{left} of {total} places left': '{total} में से {left} जगह बाकी',
  'Unlimited customers': 'जितने चाहें ग्राहक',
  'Best value': 'सबसे फ़ायदेमंद',
  'Welcome, Founding Shop #{n}!': 'स्वागत है, फ़ाउंडिंग शॉप #{n}!',
  'Payment received. Your plan will switch on in a few minutes.': 'पेमेंट मिल गया। कुछ मिनट में आपका प्लान चालू हो जाएगा।',
  'See Founding Shop': 'फ़ाउंडिंग शॉप देखें',
  '{n} of {limit} customers: new numbers can’t be added on the Free plan. Become a Founding Shop →':
    '{limit} में से {n} ग्राहक: फ़्री प्लान पर नए नंबर नहीं जुड़ सकते। फ़ाउंडिंग शॉप बनें →',
  '{n} of {limit} customers on the Free plan. See Founding Shop →': 'फ़्री प्लान पर {limit} में से {n} ग्राहक। फ़ाउंडिंग शॉप देखें →',
  'The Free plan’s customer limit is reached. Become a Founding Shop to add more.': 'फ़्री प्लान की ग्राहक लिमिट पूरी हो गई। और जोड़ने के लिए फ़ाउंडिंग शॉप बनें।',
  'Founding Shop is not on sale right now': 'फ़ाउंडिंग शॉप अभी उपलब्ध नहीं है',
  'Not on sale right now': 'अभी उपलब्ध नहीं',
  Limited: 'सीमित',
  'All Founding Shop places are taken': 'फ़ाउंडिंग शॉप की सारी जगहें भर गई हैं',
  'Payments are not set up yet. Please try again later.': 'पेमेंट अभी चालू नहीं है। थोड़ी देर बाद फिर कोशिश करें।',
  'Current plan': 'अभी का प्लान',
  left: 'बाकी',
  'You joined before plans existed, so you keep unlimited customers. Founding Shop adds automatic WhatsApp and Google reviews.':
    'आप प्लान आने से पहले जुड़े थे, इसलिए आपके ग्राहकों की कोई लिमिट नहीं। फ़ाउंडिंग शॉप में WhatsApp अपने आप और Google रिव्यू भी मिलते हैं।',
  'Set up automatic WhatsApp and reviews': 'WhatsApp और रिव्यू सेट करें',
  'Renew or go lifetime': 'रिन्यू करें या लाइफ़टाइम लें',
  'For shops that want regulars to come back without chasing them.': 'उन दुकानों के लिए जो चाहती हैं कि ग्राहक बिना पीछे पड़े लौटते रहें।',
  'No customer limit. Every regular gets a card.': 'ग्राहकों की कोई लिमिट नहीं। हर रेगुलर को कार्ड।',
  'Their card after every visit and “reward ready”, sent for you. No tapping at the counter.':
    'हर विज़िट के बाद कार्ड और “इनाम तैयार”, आपकी जगह हम भेजते हैं। काउंटर पर कुछ नहीं दबाना।',
  '“We miss you” by itself': '“आपकी याद आ रही है” अपने आप',
  'Customers who stop coming get a reminder with their stamps, once.': 'जो ग्राहक आना बंद कर दें, उन्हें उनके स्टैम्प के साथ एक बार याद दिलाया जाता है।',
  'More Google reviews': 'ज़्यादा Google रिव्यू',
  'After a reward, customers get your review link. More reviews, higher on Maps.': 'इनाम के बाद ग्राहक को आपका रिव्यू लिंक जाता है। ज़्यादा रिव्यू, Maps पर ऊपर।',
  'Founding price, locked': 'फ़ाउंडिंग कीमत, लॉक',
  'Every feature we add later, without paying more.': 'आगे आने वाले सारे फ़ीचर, बिना ज़्यादा पैसे दिए।',
  'Choose how to pay': 'पेमेंट का तरीका चुनें',
  Lifetime: 'लाइफ़टाइम',
  Yearly: 'सालाना',
  'Pay once, use for good. Same as {y} years of yearly.': 'एक बार दें, हमेशा चलाएँ। सालाना के {y} साल के बराबर।',
  'Renew each year at the same price. Nothing charged automatically.': 'हर साल उसी कीमत पर रिन्यू करें। अपने आप कुछ नहीं कटता।',
  once: 'एक बार',
  '/ year': '/ साल',
  'Opening payment…': 'पेमेंट खुल रहा है…',
  'Pay {price} with UPI': 'UPI से {price} दें',
  'UPI, cards, net banking via Razorpay': 'Razorpay से UPI, कार्ड, नेट बैंकिंग',
  'Full refund within 7 days': '7 दिन में पूरा रिफ़ंड',
  Policy: 'पॉलिसी',
  'No auto-debit': 'कोई ऑटो-डेबिट नहीं',
  'Free vs Founding Shop': 'फ़्री बनाम फ़ाउंडिंग शॉप',
  Founding: 'फ़ाउंडिंग',
  Unlimited: 'अनलिमिटेड',
  'Stamp card, poster, status image': 'स्टैम्प कार्ड, पोस्टर, स्टेटस इमेज',
  'Send card on WhatsApp (one tap)': 'WhatsApp पर कार्ड भेजें (एक टैप)',
  'Card and “reward ready” sent automatically': 'कार्ड और “इनाम तैयार” अपने आप',
  '“We miss you” sent automatically': '“आपकी याद आ रही है” अपने आप',
  'Google review requests': 'Google रिव्यू की रिक्वेस्ट',
  Yes: 'हाँ',
  No: 'नहीं',

  // automatic WhatsApp (Settings) and Google reviews
  'Automatic WhatsApp': 'WhatsApp अपने आप',
  'Founding Shop': 'फ़ाउंडिंग शॉप',
  'We message your customers for you, from Regularhood’s WhatsApp number. You don’t tap anything.':
    'Regularhood के WhatsApp नंबर से हम आपके ग्राहकों को मैसेज भेजते हैं। आपको कुछ नहीं दबाना।',
  'Card after every visit': 'हर विज़िट के बाद कार्ड',
  'Their stamps and a link to their card, once a day.': 'उनके स्टैम्प और कार्ड का लिंक, दिन में एक बार।',
  'Reward ready': 'इनाम तैयार',
  'On the visit that fills the card.': 'जिस विज़िट पर कार्ड पूरा हो।',
  'We miss you': 'आपकी याद आ रही है',
  'Once, when a customer stops coming for your “not seen” days.': 'एक बार, जब ग्राहक आपके “नहीं आए” वाले दिनों तक न आए।',
  'Google review request': 'Google रिव्यू की रिक्वेस्ट',
  'After a reward is given. Needs your review link below.': 'इनाम देने के बाद। नीचे अपना रिव्यू लिंक डालें।',
  Card: 'कार्ड',
  'Review request': 'रिव्यू रिक्वेस्ट',
  'Message language': 'मैसेज की भाषा',
  'Your settings are saved. Messages start as soon as Regularhood’s WhatsApp number is approved by Meta — we’ll tell you.':
    'आपकी सेटिंग सेव है। Meta से Regularhood का WhatsApp नंबर मंज़ूर होते ही मैसेज शुरू हो जाएँगे — हम आपको बताएँगे।',
  'Your Google review link': 'आपका Google रिव्यू लिंक',
  'Find it in Google Maps → your shop → “Ask for reviews” (or Google Business Profile → Get more reviews).':
    'Google Maps → आपकी दुकान → “Ask for reviews” में मिलेगा (या Google Business Profile → Get more reviews)।',
  '{n} of {quota} messages this month': 'इस महीने {quota} में से {n} मैसेज',
  'Starts again on the 1st. When it runs out, the counter shows the manual WhatsApp button again.':
    'हर महीने की 1 तारीख को फिर से शुरू। खत्म हो जाए तो काउंटर पर फिर से WhatsApp बटन दिखेगा।',
  'not sent': 'नहीं गया',
  read: 'पढ़ लिया',
  delivered: 'पहुँच गया',
  sent: 'भेजा',
  'Review link saved': 'रिव्यू लिंक सेव हो गया',
  'Review link removed': 'रिव्यू लिंक हटा दिया',
  'Paste the review link from your Google Business Profile': 'अपनी Google Business Profile से रिव्यू लिंक पेस्ट करें',
  'Use your Google review link (it starts with https://g.page/ or https://search.google.com/)':
    'अपना Google रिव्यू लिंक डालें (यह https://g.page/ या https://search.google.com/ से शुरू होता है)',
  'Automatic WhatsApp and Google reviews are part of Founding Shop': 'WhatsApp अपने आप और Google रिव्यू फ़ाउंडिंग शॉप में मिलते हैं',
  'Card sent on WhatsApp automatically': 'कार्ड WhatsApp पर अपने आप चला गया',
  '“Reward ready” sent on WhatsApp': '“इनाम तैयार” WhatsApp पर भेज दिया',
  'Google review request sent on WhatsApp': 'Google रिव्यू की रिक्वेस्ट WhatsApp पर भेज दी',
  'Ask for a Google review': 'Google रिव्यू माँगें',
  'Liked {shop}? Rate it on Google': '{shop} पसंद आया? Google पर रिव्यू दें',
  Cancel: 'रद्द करें',

  // activity log
  'Every reward, undo and change — by your shop or by Regularhood support.': 'हर इनाम, वापस ली गई एंट्री और बदलाव — आपकी दुकान या Regularhood सपोर्ट द्वारा।',
  'Needs a look': 'ध्यान दें',
  Customer: 'ग्राहक',
  Support: 'सपोर्ट',
  'Nothing here yet': 'अभी यहाँ कुछ नहीं',
  'Rewards given, undos, deleted customers and setting changes show up here.': 'दिए गए इनाम, वापस ली गई एंट्री, हटाए ग्राहक और सेटिंग के बदलाव यहाँ दिखेंगे।',

  // share
  'Share your shop': 'अपनी दुकान शेयर करें',
  'Put it on your WhatsApp status or Instagram so customers know about your card. Other shop owners can get Regularhood from your link.':
    'इसे WhatsApp स्टेटस या Instagram पर लगाएँ, ताकि ग्राहक आपके कार्ड के बारे में जानें। दूसरे दुकानदार आपके लिंक से Regularhood ले सकते हैं।',
  'Share image': 'इमेज शेयर करें',
  Download: 'डाउनलोड',
  'Send on WhatsApp': 'WhatsApp पर भेजें',
  'To customers': 'ग्राहकों को',
  'To other shop owners': 'दूसरे दुकानदारों को',
  'Your share link': 'आपका शेयर लिंक',
  'Bring shops, get rewards': 'दुकानें लाएँ, इनाम पाएँ',

  // referral page (/r/<code>)
  '{shop} invited you': '{shop} ने आपको बुलाया है',
  'A loyalty card for your shop, like {shop} has': '{shop} जैसा लॉयल्टी कार्ड, अब आपकी दुकान के लिए',
  'A loyalty card for your shop': 'आपकी दुकान के लिए लॉयल्टी कार्ड',
  'Type the customer’s phone number, tap “Add visit”': 'ग्राहक का फ़ोन नंबर लिखें, “विज़िट जोड़ें” दबाएँ',
  'On the last visit, the app says “Give the reward”': 'आख़िरी विज़िट पर ऐप बताएगा “इनाम दें”',
  'Customers keep coming back. Free to start.': 'ग्राहक बार-बार आते हैं। शुरू करना मुफ़्त है।',
  'Add 20 visits and we send you a free counter standee with your shop name.': '20 विज़िट जोड़ें और हम आपको आपकी दुकान के नाम वाला काउंटर स्टैंडी मुफ़्त भेजेंगे।',
  'You already have a shop account': 'आपका दुकान अकाउंट पहले से है',
  'Open my shop': 'मेरी दुकान खोलें',
  'Start your card': 'अपना कार्ड शुरू करें',
  'Free, and ready in under a minute.': 'मुफ़्त, और एक मिनट में तैयार।',
  'WhatsApp number': 'WhatsApp नंबर',
  optional: 'ज़रूरी नहीं',
  Email: 'ईमेल',
  'By creating an account you agree to the': 'अकाउंट बनाकर आप इनसे सहमत हैं:',
  Terms: 'शर्तें',
  and: 'और',
  'Privacy policy': 'प्राइवेसी पॉलिसी',
  Password: 'पासवर्ड',
  'At least 8 characters': 'कम से कम 8 अक्षर',
  'Please wait…': 'रुकिए…',
  'Create my shop account': 'मेरा दुकान अकाउंट बनाएँ',
  'Already have an account?': 'पहले से अकाउंट है?',
  'Log in': 'लॉग इन',
  'See how Regularhood works': 'देखें Regularhood कैसे काम करता है',
  'Send your link to other shop owners': 'दूसरे दुकानदारों को अपना लिंक भेजें',
  'A counter standee': 'काउंटर स्टैंडी',
  'with your shop name and rule, for the first shop you bring': 'आपकी दुकान के नाम और नियम के साथ, पहली दुकान लाने पर',
  '₹{amount} on UPI': 'UPI पर ₹{amount}',
  'for every {n} shops you bring': 'हर {n} दुकानें लाने पर',
  '{n} earned': '{n} बार मिला',
  '{n} more shops for the next ₹{amount}': 'अगले ₹{amount} के लिए {n} और दुकानें',
  'Sent ✓': 'भेज दिया ✓',
  'On its way 🎉': 'जल्द आ रहा है 🎉',
  'A shop counts once it adds {visits} visits on {days} different days.': 'दुकान तब गिनी जाती है जब वह {days} अलग-अलग दिनों में {visits} विज़िट जोड़ ले।',
  'We message you on WhatsApp to send your reward.': 'इनाम भेजने के लिए हम आपको WhatsApp करेंगे।',
  '{n} shops joined': '{n} दुकानें जुड़ीं',
  '{n} active': '{n} एक्टिव',
  '{n} not yet': '{n} अभी नहीं',
  'Active ✓': 'एक्टिव ✓',
  'Not yet': 'अभी नहीं',
  '{x} of {n} days': '{x} / {n} दिन',
  '{x} of {n} visits': '{x} / {n} विज़िट',
  'Shops that sign up from your link or your image show up here.': 'आपके लिंक या इमेज से जुड़ने वाली दुकानें यहाँ दिखेंगी।',
  'You joined from another shop’s link: you get a counter standee too once you add {visits} visits.': 'आप किसी दूसरी दुकान के लिंक से जुड़े हैं: {visits} विज़िट जोड़ने पर आपको भी काउंटर स्टैंडी मिलेगा।',
  'Tell customers about your card': 'ग्राहकों को अपने कार्ड के बारे में बताएँ',
  'A ready image for your WhatsApp status and Instagram, in Hindi or English.': 'WhatsApp स्टेटस और Instagram के लिए तैयार इमेज, हिंदी या English में।',
  Share: 'शेयर',

  // messages from the server
  'Enter the 10-digit phone number': '10 अंकों का फ़ोन नंबर लिखें',
  'Another customer already has this phone number': 'यह नंबर पहले से किसी और ग्राहक का है',
  'The reward for this visit was already given — undo the reward first': 'इस विज़िट का इनाम दिया जा चुका है — पहले इनाम वापस लें',
  'Write what the customer gets, e.g. Free chai': 'लिखें कि ग्राहक को क्या मिलेगा, जैसे मुफ़्त चाय',

  // footer
  'Rewards by Regularhood': 'Regularhood के इनाम',
  'Run a shop? Get it free': 'दुकान है? मुफ़्त में पाएँ',

  // install
  'Install the app': 'ऐप इंस्टॉल करें',
  'Tap the {icon} Share button in the browser bar.': 'ब्राउज़र बार में {icon} शेयर बटन दबाएँ।',
  'Scroll down and tap Add to Home Screen.': 'नीचे जाकर “Add to Home Screen” दबाएँ।',
  'Tap Add.': '“Add” दबाएँ।',
  'Tap the {icon} menu at the top right of the browser.': 'ब्राउज़र में ऊपर दाईं ओर {icon} मेन्यू दबाएँ।',
  'Tap Install app or Add to Home screen.': '“Install app” या “Add to Home screen” दबाएँ।',
  'Tap Install.': '“Install” दबाएँ।',
  'Click the {icon} install icon at the right end of the address bar.': 'एड्रेस बार के दाएँ सिरे पर {icon} इंस्टॉल आइकन दबाएँ।',
  'Or open the browser menu and choose Install.': 'या ब्राउज़र मेन्यू खोलकर “Install” चुनें।',
  'It then opens from your home screen like any other app.': 'फिर यह बाकी ऐप्स की तरह होम स्क्रीन से खुलेगा।',
  'Got it': 'समझ गए',
  Install: 'इंस्टॉल',
  'Not now': 'अभी नहीं',
};

// Malayalam for the customer's card pages and the shop's own screens (for shops in Kerala).
// Any text missing here falls back to English.
const ML: Record<string, string> = {
  // member card and wallet
  'Add your card to your home screen': 'നിങ്ങളുടെ കാർഡ് ഹോം സ്ക്രീനിൽ ചേർക്കൂ',
  History: 'ചരിത്രം',
  "This link doesn't work": 'ഈ ലിങ്ക് പ്രവർത്തിക്കുന്നില്ല',

  // stamp card
  '{shop} · My card': '{shop} · എന്റെ കാർഡ്',
  'Every {n} visits → {reward}': 'ഓരോ {n} സന്ദർശനത്തിനും → {reward}',
  'Your {reward} is ready! 🎁': 'നിങ്ങളുടെ {reward} തയ്യാർ! 🎁',
  '1 more visit for {reward}': '{reward} കിട്ടാൻ ഇനി 1 സന്ദർശനം മാത്രം',
  '{n} more visits for {reward}': '{reward} കിട്ടാൻ ഇനി {n} സന്ദർശനം മാത്രം',
  'Get it on your next visit — just tell your phone number.': 'അടുത്ത തവണ വരുമ്പോൾ വാങ്ങൂ — ഫോൺ നമ്പർ പറഞ്ഞാൽ മതി.',
  'Visit {x} of {n}': 'സന്ദർശനം {x} / {n}',
  'Just tell your phone number at the counter': 'കൗണ്ടറിൽ ഫോൺ നമ്പർ പറഞ്ഞാൽ മതി',
  'One visit a day counts. No app, no sign-up.': 'ദിവസം ഒരു സന്ദർശനം കണക്കാക്കും. ആപ്പ് വേണ്ട, സൈൻ-അപ്പ് വേണ്ട.',
  'The shop sends your card on WhatsApp. No app, no sign-up.': 'കട നിങ്ങളുടെ കാർഡ് WhatsApp-ൽ അയയ്ക്കും. ആപ്പ് വേണ്ട, സൈൻ-അപ്പ് വേണ്ട.',
  'There is nothing to scan or log in to any more. The shop adds your visit and sends your card on WhatsApp.':
    'ഇനി ഒന്നും സ്കാൻ ചെയ്യുകയോ ലോഗിൻ ചെയ്യുകയോ വേണ്ട. കട നിങ്ങളുടെ സന്ദർശനം ചേർത്ത് കാർഡ് WhatsApp-ൽ അയയ്ക്കും.',
  'See your visits in one tap.': 'ഒറ്റ ടാപ്പിൽ നിങ്ങളുടെ സന്ദർശനങ്ങൾ കാണൂ.',
  'Ask the shop to send your card again on WhatsApp.': 'നിങ്ങളുടെ കാർഡ് വീണ്ടും WhatsApp-ൽ അയയ്ക്കാൻ കടയോട് പറയൂ.',
  'This QR code is not valid': 'ഈ QR കോഡ് ശരിയല്ല',
  Visit: 'സന്ദർശനം',
  'Got {reward}': '{reward} കിട്ടി',
  'No visits yet.': 'ഇതുവരെ സന്ദർശനങ്ങളില്ല.',
  'Liked {shop}? Rate it on Google': '{shop} ഇഷ്ടപ്പെട്ടോ? Google-ൽ റിവ്യൂ ചെയ്യൂ',

  // the shop's screens
  'Add visit': 'സന്ദർശനം ചേർക്കൂ',
  Customers: 'കസ്റ്റമർമാർ',
  Settings: 'സെറ്റിങ്സ്',
  'Install app': 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യൂ',
  'Your loyalty card': 'നിങ്ങളുടെ ലോയൽറ്റി കാർഡ്',
  'One rule for every customer. You can change it later in Settings.': 'എല്ലാ കസ്റ്റമർക്കും ഒരേ നിയമം. പിന്നീട് സെറ്റിങ്സിൽ മാറ്റാം.',
  Every: 'ഓരോ',
  'visits, the customer gets': 'സന്ദർശനത്തിനും കസ്റ്റമർക്ക് കിട്ടുന്നത്',
  'Free chai': 'ഫ്രീ കോഫി',
  Start: 'തുടങ്ങൂ',
  Save: 'സേവ് ചെയ്യൂ',
  'Saving…': 'സേവ് ചെയ്യുന്നു…',
  Saved: 'സേവ് ചെയ്തു',
  'Every {n} visits →': 'ഓരോ {n} സന്ദർശനത്തിനും →',
  'Customer’s phone number': 'കസ്റ്റമറുടെ ഫോൺ നമ്പർ',
  '🎁 reward due': '🎁 സമ്മാനം ബാക്കി',
  Clear: 'മായ്ക്കൂ',
  'Adding…': 'ചേർക്കുന്നു…',
  Today: 'ഇന്ന്',
  visit: 'സന്ദർശനം',
  visits: 'സന്ദർശനം',
  'reward given': 'സമ്മാനം നൽകി',
  'rewards given': 'സമ്മാനം നൽകി',
  'Give {reward} now': 'ഇപ്പോൾ {reward} നൽകൂ',
  'Visit already counted today.': 'ഇന്നത്തെ സന്ദർശനം നേരത്തേ ചേർത്തു.',
  'This is visit {n}.': 'ഇത് {n}-ാമത്തെ സന്ദർശനം.',
  'Their card is full.': 'കാർഡ് നിറഞ്ഞു.',
  Given: 'നൽകി',
  'Not now — give it next time': 'ഇപ്പോൾ വേണ്ട — അടുത്ത തവണ നൽകാം',
  'Wrong number? Undo': 'നമ്പർ തെറ്റിയോ? തിരിച്ചെടുക്കൂ',
  'Reward given 🎉': 'സമ്മാനം നൽകി 🎉',
  'Their card starts again.': 'കാർഡ് വീണ്ടും ആദ്യം മുതൽ.',
  'Already counted today': 'ഇന്ന് നേരത്തേ ചേർത്തു',
  'One visit a day.': 'ദിവസം ഒരു സന്ദർശനം.',
  '{n} more for {reward}.': 'ഇനി {n} കൂടി, പിന്നെ {reward}.',
  'New customer!': 'പുതിയ കസ്റ്റമർ!',
  'Send card on WhatsApp': 'WhatsApp-ൽ കാർഡ് അയയ്ക്കൂ',
  'Next customer': 'അടുത്ത കസ്റ്റമർ',
  'Visit removed': 'സന്ദർശനം നീക്കി',

  // customers
  All: 'എല്ലാം',
  'Reward waiting': 'സമ്മാനം ബാക്കി',
  'Not seen {n} days': '{n} ദിവസമായി വന്നിട്ടില്ല',
  customer: 'കസ്റ്റമർ',
  customers: 'കസ്റ്റമർ',
  shown: 'കാണിക്കുന്നു',
  'Everyone who visited': 'വന്ന എല്ലാവരും',
  'Search phone number': 'ഫോൺ നമ്പർ തിരയൂ',
  'Tap Remind to open WhatsApp with a ready message.': '“ഓർമ്മിപ്പിക്കൂ” ടാപ്പ് ചെയ്താൽ തയ്യാറായ മെസേജുമായി WhatsApp തുറക്കും.',
  Sent: 'അയച്ചു',
  Remind: 'ഓർമ്മിപ്പിക്കൂ',
  Reward: 'സമ്മാനം',
  'No number matches': 'ഈ നമ്പർ കണ്ടില്ല',
  'Everyone came back recently 🎉': 'എല്ലാവരും ഈയിടെ വന്നിട്ടുണ്ട് 🎉',
  'No rewards waiting': 'സമ്മാനങ്ങളൊന്നും ബാക്കിയില്ല',
  'No customers yet': 'ഇതുവരെ കസ്റ്റമർമാരില്ല',
  'Add a visit with a phone number — the customer shows up here.': 'ഫോൺ നമ്പർ നൽകി സന്ദർശനം ചേർക്കൂ — കസ്റ്റമർ ഇവിടെ കാണും.',
  'Add a visit': 'സന്ദർശനം ചേർക്കൂ',
  'no visits yet': 'ഇതുവരെ സന്ദർശനമില്ല',
  'came today': 'ഇന്ന് വന്നു',
  'came yesterday': 'ഇന്നലെ വന്നു',
  'came {n} days ago': '{n} ദിവസം മുമ്പ് വന്നു',
  'Number changed': 'നമ്പർ മാറ്റി',
  'Change number': 'നമ്പർ മാറ്റൂ',
  'Phone number': 'ഫോൺ നമ്പർ',
  '{reward} given 🎉': '{reward} നൽകി 🎉',
  'Undo this visit?': 'ഈ സന്ദർശനം തിരിച്ചെടുക്കണോ?',
  'Undo this reward?': 'ഈ സമ്മാനം തിരിച്ചെടുക്കണോ?',
  '{when} will be taken off their card.': '{when}-ലെ എൻട്രി കാർഡിൽ നിന്ന് നീക്കും.',
  Undo: 'തിരിച്ചെടുക്കൂ',
  Undone: 'തിരിച്ചെടുത്തു',
  undone: 'തിരിച്ചെടുത്തു',
  'Delete {phone}?': '{phone} നീക്കം ചെയ്യണോ?',
  'Their stamps and history will be deleted. This can’t be undone.': 'ഇവരുടെ എല്ലാ സന്ദർശനങ്ങളും ചരിത്രവും മായും. ഇത് തിരിച്ചെടുക്കാൻ പറ്റില്ല.',
  Delete: 'നീക്കം ചെയ്യൂ',
  'Customer deleted': 'കസ്റ്റമറെ നീക്കം ചെയ്തു',
  'Give {reward}': '{reward} നൽകൂ',
  'All visits': 'ആകെ സന്ദർശനം',
  Rewards: 'സമ്മാനങ്ങൾ',
  'Last visit': 'അവസാന സന്ദർശനം',
  '{n}d ago': '{n} ദിവസം മുമ്പ്',
  'Send card': 'കാർഡ് അയയ്ക്കൂ',
  'See their card': 'ഇവരുടെ കാർഡ് കാണൂ',

  // settings
  'Settings saved': 'സെറ്റിങ്സ് സേവ് ചെയ്തു',
  'Your card': 'നിങ്ങളുടെ കാർഡ്',
  "Changing the number keeps everyone's visits. Customers who already have enough get the reward on their next visit.":
    'എണ്ണം മാറ്റിയാലും എല്ലാവരുടെയും സന്ദർശനങ്ങൾ നിലനിൽക്കും. ആവശ്യത്തിന് സന്ദർശനം ഉള്ളവർക്ക് അടുത്ത തവണ സമ്മാനം കിട്ടും.',
  Shop: 'കട',
  'Shop name': 'കടയുടെ പേര്',
  'Your WhatsApp number': 'നിങ്ങളുടെ WhatsApp നമ്പർ',
  "Only for Regularhood support. Customers don't see it.": 'Regularhood സപ്പോർട്ടിന് മാത്രം. കസ്റ്റമർമാർക്ക് കാണാനാവില്ല.',
  'WhatsApp message to customers': 'കസ്റ്റമർമാർക്കുള്ള WhatsApp മെസേജ്',
  'Saved on this phone right away.': 'ഈ ഫോണിൽ ഉടനെ സേവ് ആകും.',
  Reminders: 'ഓർമ്മപ്പെടുത്തൽ',
  'Days without a visit before a customer counts as “not seen”': 'എത്ര ദിവസം വരാതിരുന്നാൽ കസ്റ്റമർ “വന്നിട്ടില്ല” എന്നതിൽ കാണണം',
  'Save settings': 'സെറ്റിങ്സ് സേവ് ചെയ്യൂ',
  'Counter poster': 'കൗണ്ടർ പോസ്റ്റർ',
  'Put it where people pay, so customers know about your card and tell you their number.': 'പണം കൊടുക്കുന്നിടത്ത് ഒട്ടിക്കൂ, അപ്പോൾ കസ്റ്റമർമാർ കാർഡിനെ കുറിച്ച് അറിയുകയും നമ്പർ പറയുകയും ചെയ്യും.',
  Green: 'പച്ച',
  'Light (saves ink)': 'ലൈറ്റ് (മഷി ലാഭിക്കും)',
  'Hindi lines': 'ഹിന്ദി വരികൾ',
  'Print (A4)': 'പ്രിന്റ് (A4)',
  'Download PNG': 'PNG ഡൗൺലോഡ് ചെയ്യൂ',
  'Your data': 'നിങ്ങളുടെ ഡാറ്റ',
  'Activity log': 'ആക്റ്റിവിറ്റി ലോഗ്',
  'Rewards given, undos, deleted customers and changes': 'നൽകിയ സമ്മാനങ്ങൾ, തിരിച്ചെടുത്തവ, നീക്കിയ കസ്റ്റമർമാർ, മാറ്റങ്ങൾ',
  'Download a spreadsheet (opens in Excel or Google Sheets). Keep a copy as a backup.': 'സ്പ്രെഡ്ഷീറ്റ് ഡൗൺലോഡ് ചെയ്യൂ (Excel-ലോ Google Sheets-ലോ തുറക്കും). ബാക്കപ്പായി ഒരു കോപ്പി സൂക്ഷിക്കൂ.',
  'Preparing…': 'തയ്യാറാക്കുന്നു…',
  'Visit history': 'സന്ദർശന ചരിത്രം',
  Downloaded: 'ഡൗൺലോഡ് ചെയ്തു',
  Account: 'അക്കൗണ്ട്',
  'App language': 'ആപ്പിന്റെ ഭാഷ',
  'Dark mode': 'ഡാർക്ക് മോഡ്',
  'Turn on': 'ഓൺ ചെയ്യൂ',
  'Turn off': 'ഓഫ് ചെയ്യൂ',
  'Log out?': 'ലോഗ് ഔട്ട് ചെയ്യണോ?',
  'Log out': 'ലോഗ് ഔട്ട്',

  // plan (Free or Founding Shop)
  'Your plan': 'നിങ്ങളുടെ പ്ലാൻ',
  'Customer limit and Founding Shop': 'കസ്റ്റമർ ലിമിറ്റും ഫൗണ്ടിങ് ഷോപ്പും',
  Free: 'ഫ്രീ',
  'Early shop': 'ആദ്യകാല കട',
  'Founding Shop #{n}': 'ഫൗണ്ടിങ് ഷോപ്പ് #{n}',
  'For life': 'എന്നേക്കും',
  'Until {date}': '{date} വരെ',
  '{n} customers · no limit': '{n} കസ്റ്റമർ · ലിമിറ്റ് ഇല്ല',
  '{n} of {limit} customers on the Free plan': 'ഫ്രീ പ്ലാനിൽ {limit}-ൽ {n} കസ്റ്റമർ',
  'Your yearly plan has ended. Renew to add new customers again.': 'നിങ്ങളുടെ വാർഷിക പ്ലാൻ കഴിഞ്ഞു. പുതിയ കസ്റ്റമർമാരെ ചേർക്കാൻ പുതുക്കൂ.',
  'Become a Founding Shop': 'ഫൗണ്ടിങ് ഷോപ്പ് ആകൂ',
  'All places taken': 'എല്ലാ സ്ഥാനങ്ങളും തീർന്നു',
  '{left} of {total} places left': '{total}-ൽ {left} സ്ഥാനം ബാക്കി',
  'Unlimited customers': 'എത്ര കസ്റ്റമർമാരെ വേണമെങ്കിലും',
  'Best value': 'ഏറ്റവും ലാഭം',
  'Welcome, Founding Shop #{n}!': 'സ്വാഗതം, ഫൗണ്ടിങ് ഷോപ്പ് #{n}!',
  'Payment received. Your plan will switch on in a few minutes.': 'പേയ്മെന്റ് കിട്ടി. കുറച്ച് മിനിറ്റിനുള്ളിൽ പ്ലാൻ ഓണാകും.',
  'See Founding Shop': 'ഫൗണ്ടിങ് ഷോപ്പ് കാണൂ',
  '{n} of {limit} customers: new numbers can’t be added on the Free plan. Become a Founding Shop →':
    '{limit}-ൽ {n} കസ്റ്റമർ: ഫ്രീ പ്ലാനിൽ പുതിയ നമ്പറുകൾ ചേർക്കാനാവില്ല. ഫൗണ്ടിങ് ഷോപ്പ് ആകൂ →',
  '{n} of {limit} customers on the Free plan. See Founding Shop →': 'ഫ്രീ പ്ലാനിൽ {limit}-ൽ {n} കസ്റ്റമർ. ഫൗണ്ടിങ് ഷോപ്പ് കാണൂ →',
  'The Free plan’s customer limit is reached. Become a Founding Shop to add more.': 'ഫ്രീ പ്ലാനിലെ കസ്റ്റമർ ലിമിറ്റ് കഴിഞ്ഞു. കൂടുതൽ ചേർക്കാൻ ഫൗണ്ടിങ് ഷോപ്പ് ആകൂ.',
  'Founding Shop is not on sale right now': 'ഫൗണ്ടിങ് ഷോപ്പ് ഇപ്പോൾ ലഭ്യമല്ല',
  'Not on sale right now': 'ഇപ്പോൾ ലഭ്യമല്ല',
  Limited: 'പരിമിതം',
  'All Founding Shop places are taken': 'ഫൗണ്ടിങ് ഷോപ്പിന്റെ എല്ലാ സ്ഥാനങ്ങളും തീർന്നു',
  'Payments are not set up yet. Please try again later.': 'പേയ്മെന്റ് ഇതുവരെ തയ്യാറായിട്ടില്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കൂ.',
  'Current plan': 'ഇപ്പോഴത്തെ പ്ലാൻ',
  left: 'ബാക്കി',
  'You joined before plans existed, so you keep unlimited customers. Founding Shop adds automatic WhatsApp and Google reviews.':
    'പ്ലാനുകൾ വരുന്നതിന് മുമ്പ് ചേർന്നതുകൊണ്ട് നിങ്ങൾക്ക് കസ്റ്റമർ ലിമിറ്റ് ഇല്ല. ഫൗണ്ടിങ് ഷോപ്പിൽ ഓട്ടോമാറ്റിക് WhatsApp-ഉം Google റിവ്യൂകളും കൂടി കിട്ടും.',
  'Set up automatic WhatsApp and reviews': 'ഓട്ടോമാറ്റിക് WhatsApp-ഉം റിവ്യൂകളും സെറ്റ് ചെയ്യൂ',
  'Renew or go lifetime': 'പുതുക്കൂ അല്ലെങ്കിൽ ലൈഫ്ടൈം എടുക്കൂ',
  'For shops that want regulars to come back without chasing them.': 'പിന്നാലെ നടക്കാതെ തന്നെ സ്ഥിരം കസ്റ്റമർമാർ തിരിച്ചുവരണം എന്ന് ആഗ്രഹിക്കുന്ന കടകൾക്ക്.',
  'No customer limit. Every regular gets a card.': 'കസ്റ്റമർ ലിമിറ്റ് ഇല്ല. ഓരോ സ്ഥിരം കസ്റ്റമർക്കും കാർഡ്.',
  'Their card after every visit and “reward ready”, sent for you. No tapping at the counter.':
    'ഓരോ സന്ദർശനത്തിനും ശേഷം കാർഡും “സമ്മാനം തയ്യാർ” മെസേജും ഞങ്ങൾ അയയ്ക്കും. കൗണ്ടറിൽ ഒന്നും ടാപ്പ് ചെയ്യേണ്ട.',
  '“We miss you” by itself': '“നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു” തനിയെ',
  'Customers who stop coming get a reminder with their stamps, once.': 'വരാതായ കസ്റ്റമർമാർക്ക് അവരുടെ സ്റ്റാമ്പുകളോടെ ഒരു തവണ ഓർമ്മപ്പെടുത്തൽ.',
  'More Google reviews': 'കൂടുതൽ Google റിവ്യൂകൾ',
  'After a reward, customers get your review link. More reviews, higher on Maps.': 'സമ്മാനം കിട്ടിയ ശേഷം കസ്റ്റമർക്ക് നിങ്ങളുടെ റിവ്യൂ ലിങ്ക് പോകും. കൂടുതൽ റിവ്യൂ, Maps-ൽ മുകളിൽ.',
  'Founding price, locked': 'ഫൗണ്ടിങ് വില, ലോക്ക്',
  'Every feature we add later, without paying more.': 'പിന്നീട് വരുന്ന എല്ലാ ഫീച്ചറുകളും, കൂടുതൽ പണം നൽകാതെ.',
  'Choose how to pay': 'പണം അടയ്ക്കുന്ന രീതി തിരഞ്ഞെടുക്കൂ',
  Lifetime: 'ലൈഫ്ടൈം',
  Yearly: 'വാർഷികം',
  'Pay once, use for good. Same as {y} years of yearly.': 'ഒരിക്കൽ അടയ്ക്കൂ, എന്നും ഉപയോഗിക്കൂ. {y} വർഷത്തെ വാർഷിക തുകയ്ക്ക് തുല്യം.',
  'Renew each year at the same price. Nothing charged automatically.': 'എല്ലാ വർഷവും ഇതേ വിലയ്ക്ക് പുതുക്കൂ. തനിയെ ഒന്നും പിടിക്കില്ല.',
  once: 'ഒരു തവണ',
  '/ year': '/ വർഷം',
  'Opening payment…': 'പേയ്മെന്റ് തുറക്കുന്നു…',
  'Pay {price} with UPI': 'UPI വഴി {price} അടയ്ക്കൂ',
  'UPI, cards, net banking via Razorpay': 'Razorpay വഴി UPI, കാർഡ്, നെറ്റ് ബാങ്കിങ്',
  'Full refund within 7 days': '7 ദിവസത്തിനുള്ളിൽ മുഴുവൻ റീഫണ്ട്',
  Policy: 'പോളിസി',
  'No auto-debit': 'ഓട്ടോ-ഡെബിറ്റ് ഇല്ല',
  'Free vs Founding Shop': 'ഫ്രീ vs ഫൗണ്ടിങ് ഷോപ്പ്',
  Founding: 'ഫൗണ്ടിങ്',
  Unlimited: 'അൺലിമിറ്റഡ്',
  'Stamp card, poster, status image': 'സ്റ്റാമ്പ് കാർഡ്, പോസ്റ്റർ, സ്റ്റാറ്റസ് ചിത്രം',
  'Send card on WhatsApp (one tap)': 'WhatsApp-ൽ കാർഡ് അയയ്ക്കൽ (ഒറ്റ ടാപ്പ്)',
  'Card and “reward ready” sent automatically': 'കാർഡും “സമ്മാനം തയ്യാർ” മെസേജും തനിയെ',
  '“We miss you” sent automatically': '“നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു” തനിയെ',
  'Google review requests': 'Google റിവ്യൂ അഭ്യർത്ഥന',
  Yes: 'ഉണ്ട്',
  No: 'ഇല്ല',

  // automatic WhatsApp (Settings) and Google reviews
  'Automatic WhatsApp': 'ഓട്ടോമാറ്റിക് WhatsApp',
  'Founding Shop': 'ഫൗണ്ടിങ് ഷോപ്പ്',
  'We message your customers for you, from Regularhood’s WhatsApp number. You don’t tap anything.':
    'Regularhood-ന്റെ WhatsApp നമ്പറിൽ നിന്ന് നിങ്ങളുടെ കസ്റ്റമർമാർക്ക് ഞങ്ങൾ മെസേജ് അയയ്ക്കും. നിങ്ങൾ ഒന്നും ടാപ്പ് ചെയ്യേണ്ട.',
  'Card after every visit': 'ഓരോ സന്ദർശനത്തിനും ശേഷം കാർഡ്',
  'Their stamps and a link to their card, once a day.': 'അവരുടെ സ്റ്റാമ്പുകളും കാർഡിന്റെ ലിങ്കും, ദിവസം ഒരു തവണ.',
  'Reward ready': 'സമ്മാനം തയ്യാർ',
  'On the visit that fills the card.': 'കാർഡ് നിറയുന്ന സന്ദർശനത്തിൽ.',
  'We miss you': 'നിങ്ങളെ മിസ്സ് ചെയ്യുന്നു',
  'Once, when a customer stops coming for your “not seen” days.': 'ഒരു തവണ, നിങ്ങൾ വെച്ച “വന്നിട്ടില്ല” ദിവസങ്ങളോളം കസ്റ്റമർ വരാതിരുന്നാൽ.',
  'Google review request': 'Google റിവ്യൂ അഭ്യർത്ഥന',
  'After a reward is given. Needs your review link below.': 'സമ്മാനം നൽകിയ ശേഷം. താഴെ നിങ്ങളുടെ റിവ്യൂ ലിങ്ക് ചേർക്കണം.',
  Card: 'കാർഡ്',
  'Review request': 'റിവ്യൂ അഭ്യർത്ഥന',
  'Message language': 'മെസേജിന്റെ ഭാഷ',
  'Your settings are saved. Messages start as soon as Regularhood’s WhatsApp number is approved by Meta — we’ll tell you.':
    'നിങ്ങളുടെ സെറ്റിങ്സ് സേവ് ചെയ്തു. Regularhood-ന്റെ WhatsApp നമ്പറിന് Meta അനുമതി കിട്ടിയാലുടൻ മെസേജുകൾ തുടങ്ങും — ഞങ്ങൾ അറിയിക്കാം.',
  'Your Google review link': 'നിങ്ങളുടെ Google റിവ്യൂ ലിങ്ക്',
  'Find it in Google Maps → your shop → “Ask for reviews” (or Google Business Profile → Get more reviews).':
    'Google Maps → നിങ്ങളുടെ കട → “Ask for reviews” എന്നതിൽ കിട്ടും (അല്ലെങ്കിൽ Google Business Profile → Get more reviews).',
  '{n} of {quota} messages this month': 'ഈ മാസം {quota}-ൽ {n} മെസേജ്',
  'Starts again on the 1st. When it runs out, the counter shows the manual WhatsApp button again.':
    'എല്ലാ മാസവും 1-ന് വീണ്ടും തുടങ്ങും. തീർന്നാൽ കൗണ്ടറിൽ വീണ്ടും WhatsApp ബട്ടൺ കാണിക്കും.',
  'not sent': 'പോയില്ല',
  read: 'വായിച്ചു',
  delivered: 'എത്തി',
  sent: 'അയച്ചു',
  'Review link saved': 'റിവ്യൂ ലിങ്ക് സേവ് ചെയ്തു',
  'Review link removed': 'റിവ്യൂ ലിങ്ക് നീക്കി',
  'Paste the review link from your Google Business Profile': 'നിങ്ങളുടെ Google Business Profile-ൽ നിന്ന് റിവ്യൂ ലിങ്ക് പേസ്റ്റ് ചെയ്യൂ',
  'Use your Google review link (it starts with https://g.page/ or https://search.google.com/)':
    'നിങ്ങളുടെ Google റിവ്യൂ ലിങ്ക് നൽകൂ (ഇത് https://g.page/ അല്ലെങ്കിൽ https://search.google.com/ എന്ന് തുടങ്ങും)',
  'Automatic WhatsApp and Google reviews are part of Founding Shop': 'ഓട്ടോമാറ്റിക് WhatsApp-ഉം Google റിവ്യൂകളും ഫൗണ്ടിങ് ഷോപ്പിൽ കിട്ടും',
  'Card sent on WhatsApp automatically': 'കാർഡ് WhatsApp-ൽ തനിയെ അയച്ചു',
  '“Reward ready” sent on WhatsApp': '“സമ്മാനം തയ്യാർ” WhatsApp-ൽ അയച്ചു',
  'Google review request sent on WhatsApp': 'Google റിവ്യൂ അഭ്യർത്ഥന WhatsApp-ൽ അയച്ചു',
  'Ask for a Google review': 'Google റിവ്യൂ ചോദിക്കൂ',
  Cancel: 'റദ്ദാക്കൂ',

  // activity log
  'Every reward, undo and change — by your shop or by Regularhood support.': 'എല്ലാ സമ്മാനവും തിരിച്ചെടുത്തവയും മാറ്റങ്ങളും — നിങ്ങളുടെ കടയോ Regularhood സപ്പോർട്ടോ ചെയ്തത്.',
  'Needs a look': 'ശ്രദ്ധിക്കൂ',
  Customer: 'കസ്റ്റമർ',
  Support: 'സപ്പോർട്ട്',
  'Nothing here yet': 'ഇവിടെ ഇതുവരെ ഒന്നുമില്ല',
  'Rewards given, undos, deleted customers and setting changes show up here.': 'നൽകിയ സമ്മാനങ്ങൾ, തിരിച്ചെടുത്തവ, നീക്കിയ കസ്റ്റമർമാർ, സെറ്റിങ്സ് മാറ്റങ്ങൾ എന്നിവ ഇവിടെ കാണും.',

  // share
  'Share your shop': 'നിങ്ങളുടെ കട ഷെയർ ചെയ്യൂ',
  'Put it on your WhatsApp status or Instagram so customers know about your card. Other shop owners can get Regularhood from your link.':
    'WhatsApp സ്റ്റാറ്റസിലോ Instagram-ലോ ഇടൂ, കസ്റ്റമർമാർ കാർഡിനെ കുറിച്ച് അറിയട്ടെ. മറ്റ് കടക്കാർക്ക് നിങ്ങളുടെ ലിങ്കിൽ നിന്ന് Regularhood എടുക്കാം.',
  'Share image': 'ചിത്രം ഷെയർ ചെയ്യൂ',
  Download: 'ഡൗൺലോഡ്',
  'Send on WhatsApp': 'WhatsApp-ൽ അയയ്ക്കൂ',
  'To customers': 'കസ്റ്റമർമാർക്ക്',
  'To other shop owners': 'മറ്റ് കടക്കാർക്ക്',
  'Your share link': 'നിങ്ങളുടെ ഷെയർ ലിങ്ക്',
  'Bring shops, get rewards': 'കടകളെ കൊണ്ടുവരൂ, സമ്മാനം നേടൂ',

  // referral page (/r/<code>)
  '{shop} invited you': '{shop} നിങ്ങളെ ക്ഷണിച്ചു',
  'A loyalty card for your shop, like {shop} has': '{shop}-ന് ഉള്ളതുപോലെ ഒരു ലോയൽറ്റി കാർഡ്, നിങ്ങളുടെ കടയ്ക്കും',
  'A loyalty card for your shop': 'നിങ്ങളുടെ കടയ്ക്ക് ഒരു ലോയൽറ്റി കാർഡ്',
  'Type the customer’s phone number, tap “Add visit”': 'കസ്റ്റമറുടെ ഫോൺ നമ്പർ ടൈപ്പ് ചെയ്ത് “സന്ദർശനം ചേർക്കൂ” ടാപ്പ് ചെയ്യൂ',
  'On the last visit, the app says “Give the reward”': 'അവസാന സന്ദർശനത്തിൽ ആപ്പ് പറയും “സമ്മാനം നൽകൂ”',
  'Customers keep coming back. Free to start.': 'കസ്റ്റമർമാർ വീണ്ടും വീണ്ടും വരും. തുടങ്ങാൻ സൗജന്യം.',
  'Add 20 visits and we send you a free counter standee with your shop name.': '20 സന്ദർശനം ചേർത്താൽ നിങ്ങളുടെ കടയുടെ പേരുള്ള കൗണ്ടർ സ്റ്റാൻഡി ഞങ്ങൾ സൗജന്യമായി അയയ്ക്കും.',
  'You already have a shop account': 'നിങ്ങൾക്ക് ഇതിനകം കട അക്കൗണ്ട് ഉണ്ട്',
  'Open my shop': 'എന്റെ കട തുറക്കൂ',
  'Start your card': 'നിങ്ങളുടെ കാർഡ് തുടങ്ങൂ',
  'Free, and ready in under a minute.': 'സൗജന്യം, ഒരു മിനിറ്റിനുള്ളിൽ തയ്യാർ.',
  'WhatsApp number': 'WhatsApp നമ്പർ',
  optional: 'നിർബന്ധമില്ല',
  Email: 'ഇമെയിൽ',
  'By creating an account you agree to the': 'അക്കൗണ്ട് ഉണ്ടാക്കുന്നതോടെ നിങ്ങൾ ഇവ അംഗീകരിക്കുന്നു:',
  Terms: 'നിബന്ധനകൾ',
  and: 'കൂടാതെ',
  'Privacy policy': 'സ്വകാര്യതാ നയം',
  Password: 'പാസ്‌വേഡ്',
  'At least 8 characters': 'കുറഞ്ഞത് 8 അക്ഷരം',
  'Please wait…': 'ഒന്ന് കാത്തിരിക്കൂ…',
  'Create my shop account': 'എന്റെ കട അക്കൗണ്ട് ഉണ്ടാക്കൂ',
  'Already have an account?': 'അക്കൗണ്ട് ഉണ്ടോ?',
  'Log in': 'ലോഗിൻ',
  'See how Regularhood works': 'Regularhood എങ്ങനെ പ്രവർത്തിക്കുന്നു എന്ന് കാണൂ',
  'Send your link to other shop owners': 'നിങ്ങളുടെ ലിങ്ക് മറ്റ് കടക്കാർക്ക് അയയ്ക്കൂ',
  'A counter standee': 'ഒരു കൗണ്ടർ സ്റ്റാൻഡി',
  'with your shop name and rule, for the first shop you bring': 'നിങ്ങളുടെ കടയുടെ പേരും നിയമവും ഉള്ളത്, ആദ്യത്തെ കടയെ കൊണ്ടുവരുമ്പോൾ',
  '₹{amount} on UPI': 'UPI-യിൽ ₹{amount}',
  'for every {n} shops you bring': 'നിങ്ങൾ കൊണ്ടുവരുന്ന ഓരോ {n} കടയ്ക്കും',
  '{n} earned': '{n} തവണ കിട്ടി',
  '{n} more shops for the next ₹{amount}': 'അടുത്ത ₹{amount}-ന് ഇനി {n} കട കൂടി',
  'Sent ✓': 'അയച്ചു ✓',
  'On its way 🎉': 'ഉടൻ എത്തും 🎉',
  'A shop counts once it adds {visits} visits on {days} different days.': '{days} വ്യത്യസ്ത ദിവസങ്ങളിലായി {visits} സന്ദർശനം ചേർത്താൽ ഒരു കട കണക്കാക്കും.',
  'We message you on WhatsApp to send your reward.': 'സമ്മാനം അയയ്ക്കാൻ ഞങ്ങൾ നിങ്ങൾക്ക് WhatsApp ചെയ്യും.',
  '{n} shops joined': '{n} കടകൾ ചേർന്നു',
  '{n} active': '{n} ആക്ടീവ്',
  '{n} not yet': '{n} ഇനിയും ഇല്ല',
  'Active ✓': 'ആക്ടീവ് ✓',
  'Not yet': 'ഇനിയും ഇല്ല',
  '{x} of {n} days': '{x} / {n} ദിവസം',
  '{x} of {n} visits': '{x} / {n} സന്ദർശനം',
  'Shops that sign up from your link or your image show up here.': 'നിങ്ങളുടെ ലിങ്കിൽ നിന്നോ ചിത്രത്തിൽ നിന്നോ ചേരുന്ന കടകൾ ഇവിടെ കാണും.',
  'You joined from another shop’s link: you get a counter standee too once you add {visits} visits.': 'നിങ്ങൾ മറ്റൊരു കടയുടെ ലിങ്കിൽ നിന്നാണ് ചേർന്നത്: {visits} സന്ദർശനം ചേർത്താൽ നിങ്ങൾക്കും കൗണ്ടർ സ്റ്റാൻഡി കിട്ടും.',
  'Tell customers about your card': 'നിങ്ങളുടെ കാർഡിനെ കുറിച്ച് കസ്റ്റമർമാരോട് പറയൂ',
  'A ready image for your WhatsApp status and Instagram, in Hindi or English.': 'WhatsApp സ്റ്റാറ്റസിനും Instagram-നും തയ്യാറായ ചിത്രം, ഹിന്ദിയിലോ English-ലോ.',
  Share: 'ഷെയർ',

  // messages from the server
  'Enter the 10-digit phone number': '10 അക്ക ഫോൺ നമ്പർ നൽകൂ',
  'Another customer already has this phone number': 'ഈ നമ്പർ ഇതിനകം മറ്റൊരു കസ്റ്റമറുടേതാണ്',
  'The reward for this visit was already given — undo the reward first': 'ഈ സന്ദർശനത്തിന്റെ സമ്മാനം നേരത്തേ നൽകി — ആദ്യം സമ്മാനം തിരിച്ചെടുക്കൂ',
  'Write what the customer gets, e.g. Free chai': 'കസ്റ്റമർക്ക് എന്ത് കിട്ടും എന്ന് എഴുതൂ, ഉദാ: ഫ്രീ കോഫി',

  // footer
  'Rewards by Regularhood': 'Regularhood വഴി സമ്മാനങ്ങൾ',
  'Run a shop? Get it free': 'കടയുണ്ടോ? സൗജന്യമായി നേടൂ',

  // install
  'Install the app': 'ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യൂ',
  'Tap the {icon} Share button in the browser bar.': 'ബ്രൗസർ ബാറിലെ {icon} Share ബട്ടൺ ടാപ്പ് ചെയ്യൂ.',
  'Scroll down and tap Add to Home Screen.': 'താഴേക്ക് സ്ക്രോൾ ചെയ്ത് “Add to Home Screen” ടാപ്പ് ചെയ്യൂ.',
  'Tap Add.': '“Add” ടാപ്പ് ചെയ്യൂ.',
  'Tap the {icon} menu at the top right of the browser.': 'ബ്രൗസറിന്റെ മുകളിൽ വലതുവശത്തുള്ള {icon} മെനു ടാപ്പ് ചെയ്യൂ.',
  'Tap Install app or Add to Home screen.': '“Install app” അല്ലെങ്കിൽ “Add to Home screen” ടാപ്പ് ചെയ്യൂ.',
  'Tap Install.': '“Install” ടാപ്പ് ചെയ്യൂ.',
  'Click the {icon} install icon at the right end of the address bar.': 'അഡ്രസ് ബാറിന്റെ വലത്തേ അറ്റത്തുള്ള {icon} ഇൻസ്റ്റാൾ ഐക്കൺ ക്ലിക്ക് ചെയ്യൂ.',
  'Or open the browser menu and choose Install.': 'അല്ലെങ്കിൽ ബ്രൗസർ മെനു തുറന്ന് “Install” തിരഞ്ഞെടുക്കൂ.',
  'It then opens from your home screen like any other app.': 'പിന്നെ മറ്റേതൊരു ആപ്പിനെയും പോലെ ഹോം സ്ക്രീനിൽ നിന്ന് തുറക്കാം.',
  'Got it': 'ശരി',
  Install: 'ഇൻസ്റ്റാൾ',
  'Not now': 'ഇപ്പോൾ വേണ്ട',
};

const DICT: Record<Lang, Record<string, string> | null> = { en: null, hi: HI, ml: ML };

const KEY = 'lp_lang';
const CHANGED = 'lp-lang-changed';

const isLang = (l: string | null): l is Lang => l === 'en' || l === 'hi' || l === 'ml';

function initial(): Lang {
  try {
    // A card link from a Malayalam message carries ?lang=ml. Not saved, so a shared link doesn't change the phone's choice.
    const fromLink = new URLSearchParams(location.search).get('lang');
    if (isLang(fromLink)) return fromLink;
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Fall back to the phone's language.
  }
  return navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en';
}

let current: Lang = initial();
let enabled = false; // turned on by pages that can switch language (not the admin panel)

/** Called when a customer page or the shop app is shown. */
export function enableTranslation() {
  enabled = true;
  document.documentElement.lang = current;
}

export function setLang(lang: Lang) {
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Kept for this visit only.
  }
  dispatchEvent(new Event(CHANGED));
}

/** Translates with the current language. Pages re-render on a change through useLang(). */
export function t(text: string, vars: Record<string, string | number> = {}) {
  const template = (enabled && DICT[current]?.[text]) || text;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function useLang() {
  const [lang, set] = useState(current);
  useEffect(() => {
    const update = () => set(current);
    addEventListener(CHANGED, update);
    return () => removeEventListener(CHANGED, update);
  }, []);
  return lang;
}

/** Text with one {icon} placeholder, rendered with the icon in place. */
export function withIcon(text: string, icon: ReactNode) {
  const [before, after = ''] = text.split('{icon}');
  return (
    <>
      {before}
      {icon}
      {after}
    </>
  );
}

/** EN / हिं / മ switch shown on customer pages and in the shop app. */
export function LangToggle() {
  const lang = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>
        EN
      </button>
      <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')} aria-pressed={lang === 'hi'} lang="hi">
        हिं
      </button>
      <button className={lang === 'ml' ? 'active' : ''} onClick={() => setLang('ml')} aria-pressed={lang === 'ml'} lang="ml">
        മ
      </button>
    </div>
  );
}
