import asyncio
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parents[1] / "public" / "voice"
OUT.mkdir(parents=True, exist_ok=True)

VOICES = {
    "tr": "tr-TR-EmelNeural",
    "en": "en-US-JennyNeural",
    "fr": "fr-FR-DeniseNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ja": "ja-JP-NanamiNeural",
}

LINES = {
    "tr": {
        "enter": "StandX'e hoş geldiniz. Hoş geldiniz, bir sorunuz var mı?",
        "listen": "Buyrun, sizi dinliyorum",
    },
    "en": {
        "enter": "Welcome to StandX. Welcome, do you have a question?",
        "listen": "Come in, I'm listening",
    },
    "fr": {
        "enter": "Bienvenue sur StandX. Bienvenue, avez-vous une question ?",
        "listen": "Je t'en prie, je t'écoute",
    },
    "zh": {
        "enter": "欢迎来到 StandX。欢迎，您有问题吗？",
        "listen": "请讲，我在听",
    },
    "ja": {
        "enter": "StandX へようこそ。ようこそ、ご質問はありますか？",
        "listen": "どうぞ、伺っています",
    },
}


async def one(lang, kind, text, voice):
    path = OUT / f"{lang}-{kind}.mp3"
    await edge_tts.Communicate(text, voice).save(str(path))
    print(path.name, path.stat().st_size)


async def main():
    jobs = [
        one(lang, kind, text, VOICES[lang])
        for lang, lines in LINES.items()
        for kind, text in lines.items()
    ]
    await asyncio.gather(*jobs)


if __name__ == "__main__":
    asyncio.run(main())
