"""The voiceover's phrases, used by make-voice.py, make-voice-elevenlabs.py and split-voice.py."""

# Phrases per scene, in the order of SCENES in src/Reel.tsx; scenes time their animations to each phrase.
# Hindi in Devanagari, English words as they are said. Spoken to the shop owner, so it fits every kind of shop.
LINES = [
    ['Café हो, salon हो, या kirana...', 'रोज़ नए customer आते हैं।', 'पर वापस कितने आते हैं?'],
    ['उन्हें regular बनाने का आसान तरीका...', 'Regularhood!'],
    ['Setup, सिर्फ़ एक minute का।', 'दुकान का नाम, और reward... बस!'],
    ['Customer आए, तो उसका number डालो,'],
    ['और Add visit दबाओ।', 'एक tap, एक stamp!'],
    ['Stamp card सीधा customer के WhatsApp पे।', 'ना app, ना QR, ना password.'],
    ['पाँचवीं visit पे, app खुद बताएगा,', 'reward दो!'],
    ['कोई customer आना बंद कर दे?', 'एक tap में, उसे WhatsApp पे याद दिलाओ।'],
    ['Counter के लिए poster भी, free.'],
    ['पहले पचास customers, बिल्कुल free.', 'आज ही शुरू करो, regularhood dot in.'],
]

# Lengths in seconds of these phrases read by hi-IN-MadhurNeural (make-voice.py), used by split-voice.py to find
# the phrases in another take.
EXPECTED = [
    [2.127, 1.651, 1.397],
    [2.135, 0.745],
    [1.611, 2.826],
    [2.063],
    [1.229, 1.179],
    [2.433, 2.083],
    [2.197, 0.667],
    [1.717, 2.492],
    [1.865],
    [2.11, 2.35],
]
