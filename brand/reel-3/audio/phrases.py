"""The voiceover's phrases, used by make-voice.py and split-voice.py."""

# Phrases per scene, in the order of SCENES in src/Reel.tsx; scenes time their animations to each phrase.
# Hindi in Devanagari, English words as they are said.
LINES = [
    ['दस नए customer आए...', 'वापस आए, सिर्फ़ तीन!', 'बाकी सात? भूल गए।'],
    ['Paper वाला stamp card?', 'खो जाता है।', 'घर पे रह जाता है।'],
    ['इसलिए...', 'Regularhood!', 'हर local दुकान का loyalty card.'],
    ['Customer बस अपना phone number बताए।'],
    ['आप दबाओ, Add visit.', 'एक tap, एक stamp!'],
    ['उनका card, सीधा WhatsApp पे।', 'ना app, ना QR, ना password.'],
    ['पाँचवीं visit पे, app खुद बोलेगा,', 'reward दो!', 'Free gift, और card फिर से शुरू।'],
    ['Café हो, salon हो, या kirana...', 'जहाँ लोग बार-बार आते हैं, वहाँ चलता है।'],
    ['Free है, एक minute में setup.', 'आज ही शुरू करो, regularhood dot in.'],
]

# Lengths in seconds of these phrases read by hi-IN-MadhurNeural at +18% (make-voice.py), used by split-voice.py
# to find the phrases in another take.
EXPECTED = [
    [1.274, 1.515, 2.078],
    [1.273, 0.74, 1.164],
    [0.504, 0.745, 1.773],
    [2.197],
    [1.345, 1.179],
    [1.852, 2.083],
    [2.104, 0.667, 1.893],
    [2.131, 2.58],
    [1.685, 2.35],
]
