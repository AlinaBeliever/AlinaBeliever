# Сайт AlinaBeliever (alinabeliever.com) — правила для Claude Code

## Як влаштовано
- `src/` — файли сайту (`index.html`, `tailwind.css`, фото, фавіконки).
- `data/prices.json`, `data/gallery.json` — ціни й портфоліо. Власниця редагує їх через Pages CMS (`.pages.yml`).
- `build.js` підставляє ціни й галерею в `src/index.html` і пише результат у `dist/`.
- Публікація: push у гілку `main` на GitHub → Netlify сам запускає `node build.js` і публікує `dist/` (див. `netlify.toml`).

## Перед роботою
Виконай `git pull`: зміни з Pages CMS комітяться прямо на GitHub.

## Tailwind CSS
- Після будь-яких змін у HTML-класах перезбирай tailwind.css командою
  `./tailwindcss -c tailwind.config.js -i tailwind.input.css -o src/tailwind.css --minify`
- Якщо програми `./tailwindcss` немає, завантаж її (v3.4.17, macOS arm64) і зроби виконуваною:
  `curl -sLo tailwindcss https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-macos-arm64 && chmod +x tailwindcss`
  Вона в `.gitignore`.
- `<link rel="stylesheet" href="tailwind.css">` стоїть у кінці `<head>` навмисно, щоб утиліти
  перекривали власні стилі. Не переносити вище.

## Галерея й ціни
- Блок портфоліо в `src/index.html` між `<!--BUILD:GALLERY_ITEMS_START-->` і `_END` перезаписується
  з `data/gallery.json` під час збірки. Роботи додавати/міняти в `data/gallery.json`, не в HTML.
- Скріншоти для галереї стискати до JPEG шириною 1600px і класти в `src/images/gallery/opt/`:
  `sips -s format jpeg -s formatOptions 78 --resampleWidth 1600 ВХІД.png --out src/images/gallery/opt/НАЗВА.jpg`
- Мітки `<!--BUILD:...-->` і `/*BUILD:...*/` не видаляти й не перейменовувати.

## Публікація
- Нічого не пушити й не деплоїти без прямого прохання.
- Перед push переконайся, що inline-скрипти без синтаксичних помилок (`build.js` інакше впаде,
  і Netlify залишить попередню версію).
- Push через GitHub CLI (вхід уже виконано):
  `git -c credential.helper= -c "credential.helper=!$HOME/Desktop/Website/.tools/gh auth git-credential" push origin main`
- Після деплою перевір живий сайт: стилі, фото, консоль, форму і reCAPTCHA.
