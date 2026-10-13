# Państwa Miasta Online

To jest pełny projekt gry multiplayer: gracze łączą się z jednego adresu internetowego, tworzą pokój i dołączają do niego kodem.

## Co działa
- pokoje z sześcioliterowym kodem,
- do 12 graczy w pokoju,
- wspólna poczekalnia i synchronizacja przez Socket.IO,
- wybór domyślnych i własnych kategorii,
- losowanie litery, limit czasu i wysyłanie odpowiedzi,
- automatyczne wyniki i punktacja za odpowiedź zaczynającą się na wylosowaną literę,
- gospodarz może kończyć rundę i uruchamiać kolejną.

Punktacja jest celowo prosta: 10 pkt za niepustą odpowiedź zaczynającą się na właściwą literę. Program nie sprawdza, czy słowo faktycznie istnieje ani czy pasuje do kategorii.

## Uruchomienie na komputerze
Wymagany Node.js 18 lub nowszy.
1. Rozpakuj ZIP.
2. Otwórz terminal w folderze projektu.
3. Wpisz `npm install`.
4. Wpisz `npm start`.
5. Otwórz `http://localhost:3000`.

## Publikacja w internecie (np. Render)
1. Załóż konto na GitHub i utwórz nowe repozytorium.
2. Wgraj do repozytorium zawartość tego folderu (bez folderu nadrzędnego, jeśli platforma tego wymaga).
3. Na Render utwórz nową usługę typu **Web Service** i połącz ją z repozytorium.
4. Ustaw:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Runtime: Node
5. Wdróż usługę. Platforma pokaże publiczny adres `https://...`.
6. Wyślij ten adres znajomym. Każdy otwiera stronę, a do pokoju dołącza sześcioliterowym kodem.

Ważne: plik ZIP sam nie publikuje strony. Do uzyskania publicznego adresu potrzebne jest konto hostingowe i wdrożenie projektu. Darmowe plany hostingu mogą mieć ograniczenia lub usypiać usługę po okresie bezczynności.

## Uwaga
Pokoje są przechowywane w pamięci serwera. Jeśli usługa się zrestartuje, aktywne pokoje znikną. Do prywatnych gier ze znajomymi to wystarczy na początek. Nie jest to jeszcze zabezpieczona produkcyjna platforma.
