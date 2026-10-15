# Teacher Tactics: Seating Plan

Lekka gra logiczna o przesadzaniu uczniów. React + TypeScript + Vite, CSS i SVG. Bez backendu, silnika gier i bibliotek zarządzania stanem.

[Zagraj na GitHub Pages](https://baritoshi.github.io/teacher-tactics/) · [Repozytorium](https://github.com/Baritoshi/teacher-tactics)

## Uruchomienie

Wymagane Node.js 22.12+ oraz pnpm 11.25.0 (można zainstalować przez `npm install -g pnpm@11.25.0`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz adres wypisany przez Vite (zwykle http://127.0.0.1:5173).

```sh
pnpm test       # testy reguł i przejść stanu
pnpm build      # TypeScript + produkcyjny katalog dist/
pnpm preview    # lokalny podgląd produkcyjny
```

## Zasady MVP

Normal Lesson: 4 × 4, 16 uczniów, sześć typów. Kliknij ucznia, potem drugiego, by zamienić ich miejscami za jeden ruch. Ponowne kliknięcie wybranego ucznia anuluje zaznaczenie bez kosztu. Hint kosztuje jeden ruch i wskazuje najsilniejszą problematyczną parę. Analysis i Legend są bezpłatne. Reset / Try Again losuje nową klasę i zeruje ruchy.

`totalNoise = baseNoise + seatModifiers + pairEffects`. Sąsiedztwo tylko pionowe i poziome, każda para raz. Pierwszy rząd: −2 na ucznia, lewa kolumna: +1. Joker/Joker +4, ToughGuy/ToughGuy +5, Troublemaker/Joker +6, Geek/Geek +3, Nerd/Quiet −2. Modyfikatory narożnego miejsca sumują się.

Wygrana przy hałasie ≤45, porażka przy >60 (dokładnie 60 nadal pozwala grać). Po zakończeniu ruchy i podpowiedzi są zablokowane. Ocena zależy od liczby ruchów, wliczając podpowiedzi. Losowanie odrzuca układy już zakończone, maksymalnie 2000 prób. Influence i morale są wyświetlane, ale celowo nie wpływają jeszcze na wynik. Stan gry jest w pamięci, bez localStorage na tym etapie.

## Computer Room

W selektorze **Scenario** u góry wybierz Normal Lesson albo Computer Room. Zmiana scenariusza tworzy nowy losowy układ i zeruje ruchy, zaznaczenie, dialog oraz wynik. Reset i Try Again zachowują wybrany scenariusz i jego layout.

Computer Room korzysta z tej samej listy 16 uczniów, ale z innej sali: **8 komputerów po 2 miejsca**, ustawionych w U otwarte ku nauczycielowi (2 stanowiska po lewej, 2 po prawej, 4 na dole). Każdy uczeń ma osobny klikalny Seat. Wszyscy siedzą twarzą do monitora: Left / Right / Down. Normal Lesson zachowuje grid 4 × 4 i orientację Up.

Geek otrzymuje +1 hałasu bazowego (2 → 3), Troublemaker +1 (6 → 7), a Geek/Geek jako sąsiedzi daje +5 zamiast +3. Dwa Geeki przy jednym komputerze otrzymują **dodatkowe +2**, zatem jedna para może dawać +7. Target = 48, lose = 62 (porażka przy >62), hintCost = 1. Oceny i pozostałe relacje pozostają standardowe.

Sąsiedztwo jest jawnym grafem layoutu: miejsca idą kolejno po obwodzie U, uwzględniając partnera przy komputerze i sąsiada przy kolejnym stanowisku. Nie ma rozmów przez środek sali ani połączenia między górnymi końcami U. Wartości modyfikatorów miejsc pozostają −2 z przodu i +1 przy oknach: w U oznaczone są cztery miejsca przy dwóch górnych komputerach oraz cztery miejsca przy lewej ścianie. Przy pełnej klasie ich suma nadal wynosi −4.

Balans zmieniaj w `COMPUTER_ROOM` w `src/game/levels.ts`: `baseNoiseModifiers`, `relationships`, `workstationRelationships`, `targetNoise`, `loseNoise`, `hintCost`, `ratings`. Modyfikatory są stosowane przy odczycie, bez zmiany źródłowego rosteru. `NoiseBreakdown` zwraca `baseNoise`, `seatModifiers`, `pairEffects` (wyłącznie sąsiedztwo), `workstationEffects` i `totalNoise` będący ich sumą. Normal Lesson ma `workstationEffects = 0` i nie pokazuje tej pozycji w Analysis.

Każda para w `pairs` ma osobno `neighbourNoise` i `workstationNoise` oraz ich sumę `noise`. Linia SVG jest jedna dla pary: przerywana dla zwykłej relacji, ciągła przy dodatkowym efekcie komputera, z łączną wartością (np. +7) i opisem składników. Ringi i Hint wykorzystują te same dane. Kalkulator usuwa duplikaty i odwrócone krawędzie grafu.

## Dane layoutu i grafika

`LevelDefinition.classroomLayout` wskazuje dane z `src/game/layouts.ts`. `SeatDefinition` zawiera id, procentowe x/y/width/height, orientation, opcjonalny workstationId i flagi modyfikatorów miejsca. `ComputerWorkstation` zawiera id, position, orientation, seatA i seatB. Losowanie korzysta z listy identyfikatorów miejsc, więc nie wymaga ciągłej numeracji ani zapełnienia wszystkich miejsc.

Wspólny `Classroom.tsx` renderuje pozycje i graf z danych. Nie ma osobnego stanu ani kalkulatora dla Computer Room. Późniejsze assety komputerów podmienimy w `src/components/ComputerWorkstation.tsx` i odpowiadających mu stylach w `src/styles/game.css`; współrzędne, miejsca i reguły pozostaną niezależne od grafiki.

Konfiguracja pozwala później zdefiniować Substitute Lesson i Lesson Observation przez własne relacje, progi, koszt podpowiedzi i oceny. Te scenariusze nie są jeszcze zaimplementowane.

## Struktura plików

```text
.github/workflows/deploy.yml  # test, build, GitHub Pages
src/
  components/
    Classroom.tsx            # sala i linie SVG
    ComputerWorkstation.tsx  # placeholder biurka, monitora i klawiatury
    Seat.tsx                 # klikane miejsce
    Student.tsx              # znacznik ucznia
    HUD.tsx                  # wynik i przyciski
    DialogPanel.tsx           # informacje, hint, analiza, legenda
    EndScreen.tsx            # wygrana / porażka
  game/
    types.ts                 # Student, LevelDefinition, GameState
    students.ts              # typy, kolory i roster
    relationships.ts         # symetryczne reguły par
    noiseCalculator.ts       # czysta funkcja i breakdown
    levels.ts                # progi, hintCost, modyfikatory i oceny
    layouts.ts               # grid, U, miejsca, orientacje i graf sąsiedztwa
    gameUtils.ts             # losowanie, zamiana, status, hint
    game.test.ts             # testy logiki
    computerRoom.test.tsx     # reguły i wspólna prezentacja scenariuszy
    layouts.test.tsx          # geometria, workstation effects, swap i puste miejsca
  styles/game.css
  App.tsx                    # połączenie komponentów i React state
  main.tsx
```

## Deployment na GitHub Pages

1. Wyślij repozytorium do GitHuba (główna gałąź: `main`).
2. W repozytorium wybierz **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push na `main` uruchamia `.github/workflows/deploy.yml`. Można też wybrać **Actions → Deploy to GitHub Pages → Run workflow**.
4. Workflow instaluje zależności według lockfile, uruchamia testy i build, a następnie publikuje `dist/`. Adres witryny jest w podsumowaniu wdrożenia.

Vite używa `base: './'`, więc zasoby działają również pod ścieżką `/teacher-tactics/`. Osobny skrypt deploy nie jest potrzebny. Fonty Google są opcjonalne; bez sieci używane są fonty systemowe.

## Rozszerzanie

`LevelDefinition` obejmuje classroomLayout, roster, reguły relacji sąsiedzkich i stanowiskowych, opcjonalne modyfikatory hałasu bazowego, opis, progi hałasu, koszt podpowiedzi i ocenianie. Nowy kształt sali można zdefiniować przez dane miejsc, stanowisk i grafu bez zmiany `Classroom.tsx`. Zamiana obsługuje już puste miejsca, ale dostępne scenariusze Normal Lesson i Computer Room używają pełnej klasy. Nowe mechaniki, np. rozmowa przez puste miejsce, wymagają osobnego rozszerzenia zasad i testów.

Następne kroki: (1) zapis najlepszych wyników w localStorage, (2) testy balansu i dopracowanie oprawy, (3) Half Absent z pustymi miejscami, dopiero po ustabilizowaniu Normal Lesson.
