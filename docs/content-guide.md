# Story and spelling guide

This guide is for story writers, translators and native-speaker reviewers. You do not need to be a developer to use it.

Kasa Genesis reads stories aloud to children aged about 4 to 10. The voice is a computer model, and it reads **exactly what is written**. If a word is spelled with "e" where it needs "ɛ", the voice says the wrong word, and a child hears it wrong. So careful spelling is the most useful thing you can give the project.

Languages: **Twi** and **Ewe** first. **Ga** comes later; its section below is a starting point that still needs a Ga reviewer.

Contents:

1. [How to add a story](#1-how-to-add-a-story)
2. [Spelling: Twi](#2-spelling-twi)
3. [Spelling: Ewe](#3-spelling-ewe)
4. [Spelling: Ga (later)](#4-spelling-ga-later)
5. [Typing the special letters](#5-typing-the-special-letters)
6. [Writing so the voice sounds good](#6-writing-so-the-voice-sounds-good)
7. [Rights: what you may submit](#7-rights-what-you-may-submit)
8. [Reviewer checklist for native speakers](#8-reviewer-checklist-for-native-speakers)

---

## 1. How to add a story

### Option A: fill in a form (no git needed)

1. Open the repository on GitHub and go to **Issues → New issue → Submit a story**.
2. Fill in the fields: the title, the language, the story text, who wrote it, where it came from and its license.
3. Submit. A maintainer turns it into a story file, and a native speaker reviews it.

You need a free GitHub account. If you do not have one, send the same information to a maintainer and they will file it for you.

### Option B: open a pull request (for people who use git)

Each story is one file in the `stories/` folder, named after its id, for example `stories/ananse-and-the-pot.json`:

```json
{
  "id": "ananse-and-the-pot",
  "title": "Ananse ne Nyansa Kukuo",
  "language": "aka",
  "text": "Tete no, na Kwaku Ananse pɛ sɛ ɔnya nyansa nyinaa.\n\n...",
  "author": "Ama Mensah",
  "source": "Written for Kasa Genesis, 2026",
  "license": "CC-BY-4.0",
  "translation": "Long ago, Kwaku Ananse wanted to have all the wisdom...",
  "level": "beginner"
}
```

(The Twi above only shows the shape of a file. It is not a reviewed story.)

### The story fields

| Field | Required | What to put |
| --- | --- | --- |
| `id` | yes | Short name in lowercase English letters, numbers and hyphens. It must match the file name. Example: `ananse-and-the-pot`. |
| `title` | yes | The title in the story's language, with correct spelling. |
| `language` | yes | `aka` for Twi (Akan) or `ewe` for Ewe. Ga will be `gaa` once it is supported. |
| `text` | yes | The story. Put a blank line between paragraphs (written `\n\n` inside the JSON file). |
| `author` | yes (soon) | Who wrote or retold the story. Use "Traditional" for a folktale with no known author, plus the name of the person who retold it. |
| `source` | yes (soon) | Where the text came from: "Written for Kasa Genesis", a book title and page, or a web link. |
| `license` | yes (soon) | `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC0-1.0`, or `public-domain`. See [Rights](#7-rights-what-you-may-submit). |
| `translation` | no | An English translation. It helps reviewers and parents. It is never read aloud. |
| `level` | no | `beginner`, `intermediate` or `advanced`, for how hard the language is for a child. |

Today the app checks `id`, `title`, `language` and `text`. The `author`, `source` and `license` fields become required with issue #9, so please fill them in now.

Rules for the file:

- Save it as **UTF-8**. Most editors do this already. Do not save it from Word; copy plain text into a code editor or the GitHub web editor instead.
- Use the real letters (ɛ, ɔ, ŋ, ƒ, ʋ, ɖ, ɣ), not look-alikes from other alphabets. Section 5 explains how to type them.
- Run `make test` before you open the pull request. A test fails if a story is missing a field, uses an unknown language code, or contains characters the app would have to fix.

---

## 2. Spelling: Twi

Write in the standard Akan orthography (Asante or Akuapem Twi). Stay with one dialect inside a story.

### Letters

Twi uses these letters: **a b d e ɛ f g h i k l m n o ɔ p r s t u w y**.

The two letters people most often get wrong are:

| Letter | Capital | Sound (roughly) | Example |
| --- | --- | --- | --- |
| ɛ | Ɛ | "e" in English "bed" | sɛn (how), yɛ (is / do) |
| ɔ | Ɔ | "aw" in English "law" | ɔdɔ (love), ɔno (he, she) |

Common letter pairs are written as two letters, such as **ky, gy, hy, tw, dw, hw, ny, nw**: *kyerɛ* (show), *gyae* (stop), *twerɛ* (write), *nyansa* (wisdom).

Tone is not marked in everyday Twi writing, so do not add accents.

### Common mistakes

| Wrong | Right | Why it matters |
| --- | --- | --- |
| `se` | `sɛ` | "e" and "ɛ" are different vowels, so the voice says a different word. |
| `odo` | `ɔdɔ` | Same problem with "o" and "ɔ". |
| `sε` (Greek ε) | `sɛ` (Latin ɛ) | They look the same but are different characters. The app fixes this one automatically, but the letter in your text should still be the Latin one. |
| `Wo ho te sen?` | `Wo ho te sɛn?` | A missing ɛ in a common word is the most frequent error. |
| Mixing Asante and Akuapem forms | Pick one | The voice and reviewers expect one dialect per story. |

---

## 3. Spelling: Ewe

Write in the standard Ewe orthography.

### Letters

Ewe uses: **a b d ɖ dz e ɛ f ƒ g gb ɣ h x i k kp l m n ny ŋ o ɔ p r s t ts u v ʋ w y z**.

The special letters, each with its capital:

| Letter | Capital | Sound (roughly) | Example |
| --- | --- | --- | --- |
| ɖ | Ɖ | a "d" made with the tongue curled back | ɖevi (child) |
| ƒ | Ƒ | "f" made with both lips | ƒe (year) |
| ʋ | Ʋ | "v" made with both lips | Eʋe (Ewe) |
| ɣ | Ɣ | a soft, throaty "g" | ɣe (sun) |
| ŋ | Ŋ | "ng" in English "sing" | ŋkeke (day) |
| ɛ | Ɛ | "e" in "bed" | |
| ɔ | Ɔ | "aw" in "law" | Woezɔ (welcome) |

**gb** and **kp** are single sounds written with two letters: *Akpe* (thank you).

### Tone and nasal marks

Ewe writing marks tone only where it changes meaning, for example **è** (you) and **é** (he, she). Keep those marks. A tilde marks a nasal vowel, as in **fɔ̃** in the greeting *Ɖe èfɔ̃ nyuie a?* Do not add marks that a normal Ewe text would leave out.

### Common mistakes

| Wrong | Right | Why it matters |
| --- | --- | --- |
| `devi` | `ɖevi` | "d" and "ɖ" are different sounds. |
| `fe` | `ƒe` | "f" and "ƒ" are different sounds. |
| `Eve` | `Eʋe` | "v" and "ʋ" are different sounds. |
| `nkeke`, `ngkeke` | `ŋkeke` | ŋ is one letter. |
| `γe` (Greek gamma) | `ɣe` (Latin gamma) | Look-alike from the Greek alphabet. The app does not fix this one yet, so the voice may skip the letter. |
| `υ` (Greek upsilon) | `ʋ` | Look-alike. The app fixes it, but please type the right one. |
| Dropping è / é | Keep them | They change who the sentence is about. |

---

## 4. Spelling: Ga (later)

Ga is planned after Twi and Ewe, and the app cannot read it yet. You can still write Ga stories now, and they will be ready when the voice is.

This section is a draft and **must be checked by a Ga speaker** before anyone relies on it.

- Ga uses the Latin alphabet with **ɛ, ɔ and ŋ**, plus letter pairs such as **gb, kp, ny, ts** and **ŋm**.
- As in Twi, the most common mistake is writing "e" for "ɛ" and "o" for "ɔ".
- Tone is not usually marked.

If you are a Ga speaker and can improve this section, please open an issue or a pull request.

---

## 5. Typing the special letters

### On a phone

- **Android and iPhone:** install **Gboard** and add the **Twi (Akan)** or **Ewe** keyboard under *Settings → Languages*. Then hold down a letter to get its variants, for example hold **e** for **ɛ** and **o** for **ɔ**.
- Check once that the keyboard types the Latin letter, not a Greek look-alike: type **ɛ** into the story form and look at the preview. Some older keyboards insert Greek ε (the app fixes that one) or γ (which it does not).
- Avoid WhatsApp-style "smart" text: it can add curly quotes and invisible characters. The app cleans these, but plain text is safest.

### On a laptop

- **Windows, macOS and Linux:** install **Keyman** (keyman.com, free) and search for a Twi, Akan, Ewe or Ghana keyboard. It lets you type the letters directly.
- **Without installing anything:** copy the letter from the table below.

### Copy table

| Letter | Capital | Unicode name | Code |
| --- | --- | --- | --- |
| ɛ | Ɛ | Latin open E | U+025B / U+0190 |
| ɔ | Ɔ | Latin open O | U+0254 / U+0186 |
| ŋ | Ŋ | Latin eng | U+014B / U+014A |
| ɖ | Ɖ | Latin African D | U+0256 / U+0189 |
| ƒ | Ƒ | Latin F with hook | U+0192 / U+0191 |
| ʋ | Ʋ | Latin V with hook | U+028B / U+01B2 |
| ɣ | Ɣ | Latin gamma | U+0263 / U+0194 |

---

## 6. Writing so the voice sounds good

The voice reads text one sentence at a time. These habits make it sound natural.

- **Write numbers as words.** The voice cannot read digits yet. Write *mmienu* (Twi, two) or *eve* (Ewe, two), not "2". The same goes for dates, times, money and "%".
- **Spell out abbreviations.** Write the full words instead of "Mr." or "etc.".
- **Keep sentences short.** One idea per sentence suits young listeners and gives the voice natural pauses.
- **Use standard punctuation.** End sentences with **. ? !** and use commas for short pauses. Do not use emoji, hashtags, "!!!" or "...." for effect.
- **Put a blank line between paragraphs.** Long stories are read and played in pieces.
- **Avoid English in the middle of a sentence** unless the story needs it, such as a character who speaks English. The voice is trained on Twi and Ewe, so English words come out with the wrong sounds.
- **Keep dialogue clear.** Put speech in straight quotes and say who is speaking: *Ananse kaa sɛ, "..."*.
- **Write for children.** Simple words, a clear story, and nothing frightening or unkind that a parent would not want read aloud.

---

## 7. Rights: what you may submit

Only submit a story if one of these is true:

1. **You wrote it** (or retold a traditional folktale in your own words) and you agree to release it under an open license. We suggest **CC-BY-4.0**, which lets anyone reuse it if they credit you.
2. **It is in the public domain**, for example a very old published text whose copyright has ended. Say why you believe that.
3. **It is already openly licensed**, such as CC-BY or CC-BY-SA, or CC0. Copy the license exactly.

Do **not** submit stories copied from books, school readers, websites or apps unless they meet one of those conditions. Kasa Genesis may be used commercially, so "non-commercial" (NC) and "no derivatives" (ND) licenses are not accepted.

Record the rights in the story:

- `author`: the writer, or "Traditional, retold by <name>".
- `source`: where the text came from (a book with title, year and page, a link, or "Written for Kasa Genesis").
- `license`: one of `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC0-1.0`, `public-domain`.

If you are not sure, ask in the issue before you submit. A story with unclear rights cannot be published.

---

## 8. Reviewer checklist for native speakers

Every story is checked by at least one native speaker before it is published. Copy this list into your review.

```
Language: Twi / Ewe / Ga    Dialect: ________    Reviewer: ________

Spelling
[ ] Every ɛ, ɔ (and for Ewe: ɖ, ƒ, ʋ, ɣ, ŋ) is present where it should be.
[ ] No look-alike letters from other alphabets (paste a doubtful word into a search engine to check).
[ ] Ewe: tone and nasal marks that change meaning (è, é, ̃) are present.
[ ] One dialect throughout; spelling is consistent from start to end.

Meaning
[ ] The text reads naturally to a native speaker; it is not a word-for-word translation.
[ ] The English translation (if any) matches the story.
[ ] The title is spelled correctly and fits the story.

Suitable for children aged 4 to 10
[ ] No violence, fear, insults or adult themes beyond what a parent would accept at bedtime.
[ ] Words and sentence length suit the level given.

Voice
[ ] Numbers, dates and abbreviations are written as words.
[ ] I listened to the generated audio of the whole story.
[ ] Words the voice said wrongly (list them): ________

Rights
[ ] author, source and license are filled in and look plausible.
```

A word the voice gets wrong even though it is spelled correctly is useful information, not a spelling error. List it in the review so the model team can improve the voice.
